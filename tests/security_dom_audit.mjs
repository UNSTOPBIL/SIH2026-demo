import { spawn } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const PORT = 9227;
const BASE_URL = "http://localhost:3000";

let msgId = 1;
function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === id) {
        ws.removeEventListener("message", handler);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression) {
  const result = await sendCommand(ws, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDomSecurityAudit() {
  console.log("==================================================");
  console.log("🛡️  STARTING DOM SECURITY & VULNERABILITY AUDIT");
  console.log("==================================================");

  const browserProc = spawn(BROWSER_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-background-networking",
    "--window-size=1440,900",
  ]);

  await sleep(2000);

  let versionInfo;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      versionInfo = await res.json();
      break;
    } catch {
      await sleep(500);
    }
  }

  if (!versionInfo) {
    console.error("Failed to connect to headless browser CDP");
    browserProc.kill();
    process.exit(1);
  }

  const browserWs = new WebSocket(versionInfo.webSocketDebuggerUrl);
  await new Promise((r) => (browserWs.onopen = r));

  const target = await sendCommand(browserWs, "Target.createTarget", { url: "about:blank" });
  const pageWsUrl = `ws://127.0.0.1:${PORT}/devtools/page/${target.targetId}`;
  const pageWs = new WebSocket(pageWsUrl);
  await new Promise((r) => (pageWs.onopen = r));

  await sendCommand(pageWs, "Page.enable");
  await sendCommand(pageWs, "Runtime.enable");
  await sendCommand(pageWs, "DOM.enable");

  const dialogEvents = [];
  pageWs.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.method === "Page.javascriptDialogOpening") {
      dialogEvents.push(msg.params);
      sendCommand(pageWs, "Page.handleJavaScriptDialog", { accept: true });
    }
  });

  const auditResults = {
    headers: { passed: true, details: [] },
    xss: { passed: true, details: [] },
    tabnabbing: { passed: true, details: [] },
    clickjacking: { passed: true, details: [] },
    inputValidation: { passed: true, details: [] },
  };

  // 1. Audit HTTP Security Headers
  console.log("\n[TEST 1] Verifying HTTP Security Headers...");
  try {
    const res = await fetch(BASE_URL);
    const headers = Object.fromEntries(res.headers.entries());

    const requiredHeaders = [
      { name: "x-frame-options", expected: "DENY" },
      { name: "x-content-type-options", expected: "nosniff" },
      { name: "referrer-policy", expected: "strict-origin-when-cross-origin" },
      { name: "x-xss-protection", expected: "1; mode=block" },
    ];

    for (const req of requiredHeaders) {
      const val = headers[req.name];
      if (val && val.toLowerCase() === req.expected.toLowerCase()) {
        console.log(`  ✓ ${req.name}: ${val} (PASS)`);
        auditResults.headers.details.push({ header: req.name, status: "PASS", value: val });
      } else {
        console.error(`  ✗ ${req.name}: found '${val}', expected '${req.expected}' (FAIL)`);
        auditResults.headers.passed = false;
        auditResults.headers.details.push({ header: req.name, status: "FAIL", found: val });
      }
    }
  } catch (err) {
    auditResults.headers.passed = false;
    console.error("  ✗ Error checking headers:", err.message);
  }

  // 2. Audit Pages for Reverse Tabnabbing
  console.log("\n[TEST 2] Auditing External Links for Reverse Tabnabbing (rel='noopener noreferrer')...");
  const pagesToAudit = ["/", "/dashboard", "/history"];
  for (const pagePath of pagesToAudit) {
    await sendCommand(pageWs, "Page.navigate", { url: `${BASE_URL}${pagePath}` });
    await sleep(1500);

    const linksAudit = await evaluate(pageWs, `(() => {
      const links = document.querySelectorAll('a[target="_blank"]');
      const issues = [];
      links.forEach(a => {
        const rel = (a.getAttribute('rel') || '').toLowerCase();
        const hasNoOpener = rel.includes('noopener');
        const hasNoReferrer = rel.includes('noreferrer');
        if (!hasNoOpener || !hasNoReferrer) {
          issues.push({
            href: a.href,
            text: a.innerText.trim() || a.getAttribute('title') || 'Link',
            rel: rel
          });
        }
      });
      return { totalBlankLinks: links.length, issues };
    })()`);

    if (linksAudit.issues.length === 0) {
      console.log(`  ✓ Page ${pagePath}: ${linksAudit.totalBlankLinks} external links checked, all secure with rel="noopener noreferrer" (PASS)`);
    } else {
      console.error(`  ✗ Page ${pagePath}: Found insecure external links without rel="noopener noreferrer":`, linksAudit.issues);
      auditResults.tabnabbing.passed = false;
      auditResults.tabnabbing.details.push({ page: pagePath, issues: linksAudit.issues });
    }
  }

  // 3. Test Query Parameter & DOM XSS Injection
  console.log("\n[TEST 3] Testing Reflected & DOM XSS Injection in URLs and Input Controls...");
  const xssPayloads = [
    '<script>alert("XSS_ALERT_TEST")</script>',
    '"><img src=x onerror=alert("IMG_XSS")>',
    'javascript:alert("URI_XSS")',
  ];

  for (const payload of xssPayloads) {
    const encodedPayload = encodeURIComponent(payload);
    const testUrl = `${BASE_URL}/dashboard?search=${encodedPayload}&category=${encodedPayload}`;
    await sendCommand(pageWs, "Page.navigate", { url: testUrl });
    await sleep(1000);

    // Check if script element or onerror attribute was injected into DOM
    const xssCheck = await evaluate(pageWs, `(() => {
      const injectedScripts = Array.from(document.querySelectorAll('script')).filter(s => s.innerText.includes('XSS_ALERT_TEST') || s.src.includes('XSS'));
      const injectedImgs = Array.from(document.querySelectorAll('img[onerror*="IMG_XSS"]'));
      const textMatches = document.body.innerText.includes('<script>');
      return {
        scriptsCount: injectedScripts.length,
        imgsCount: injectedImgs.length,
        textEscaped: textMatches
      };
    })()`);

    if (xssCheck.scriptsCount > 0 || xssCheck.imgsCount > 0 || dialogEvents.length > 0) {
      console.error(`  ✗ XSS VULNERABILITY DETECTED for payload: ${payload}`);
      auditResults.xss.passed = false;
      auditResults.xss.details.push({ payload, check: xssCheck, dialogs: dialogEvents });
    } else {
      console.log(`  ✓ Payload safely sanitized/neutralized: ${payload.slice(0, 30)}... (PASS)`);
    }
  }

  // 4. Test Live Input Field Injections (DOM Reactive State)
  console.log("\n[TEST 4] Testing Search Input Injection on /history...");
  await sendCommand(pageWs, "Page.navigate", { url: `${BASE_URL}/history` });
  await sleep(1500);

  const inputXssCheck = await evaluate(pageWs, `(() => {
    const input = document.querySelector('input[type="text"]');
    if (!input) return { inputFound: false };
    input.value = '<script>alert("INPUT_XSS")</script>';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      inputFound: true,
      currentValue: input.value,
      hasInjectedNode: document.querySelectorAll('script[data-injected]').length > 0
    };
  })()`);

  if (inputXssCheck.inputFound && dialogEvents.length === 0) {
    console.log(`  ✓ Live DOM input injection sanitized safely. Dialog trigger count: ${dialogEvents.length} (PASS)`);
  } else {
    console.error(`  ✗ Live DOM input injection caused unexpected execution or failure:`, inputXssCheck);
    auditResults.xss.passed = false;
  }

  // 5. Test Clickjacking / Framing Resistance
  console.log("\n[TEST 5] Testing Clickjacking Resistance (X-Frame-Options: DENY)...");
  if (auditResults.headers.passed) {
    console.log("  ✓ X-Frame-Options is set to DENY. Any attempted <iframe> embedding is blocked at the browser network layer (PASS)");
  }

  // 6. Inspect Dangerous DOM Sinks across runtime
  console.log("\n[TEST 6] Auditing Window Sinks and Global Storage...");
  const sinksCheck = await evaluate(pageWs, `(() => {
    const storageKeys = Object.keys(localStorage);
    return {
      storageKeys,
      hasSensitiveKeys: storageKeys.some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('password'))
    };
  })()`);

  if (!sinksCheck.hasSensitiveKeys) {
    console.log(`  ✓ LocalStorage clean. Keys found: [${sinksCheck.storageKeys.join(', ')}]. No credentials stored (PASS)`);
  } else {
    console.warn(`  ⚠️ Sensitive keys detected in LocalStorage:`, sinksCheck.storageKeys);
  }

  console.log("\n==================================================");
  console.log("📋 DOM SECURITY AUDIT SUMMARY");
  console.log("==================================================");
  console.log(`Headers Compliance:       ${auditResults.headers.passed ? "✅ SECURE" : "❌ FAILED"}`);
  console.log(`XSS / DOM Injection:      ${auditResults.xss.passed ? "✅ IMMUNE" : "❌ VULNERABLE"}`);
  console.log(`Reverse Tabnabbing:       ${auditResults.tabnabbing.passed ? "✅ SECURE" : "❌ VULNERABLE"}`);
  console.log(`Clickjacking Protection:  ${auditResults.headers.passed ? "✅ IMMUNE (DENY)" : "❌ VULNERABLE"}`);
  console.log(`Storage Security:         ${!sinksCheck.hasSensitiveKeys ? "✅ CLEAN" : "⚠️ WARNING"}`);
  console.log("==================================================\n");

  browserProc.kill();

  const allPassed = auditResults.headers.passed && auditResults.xss.passed && auditResults.tabnabbing.passed;
  process.exit(allPassed ? 0 : 1);
}

runDomSecurityAudit().catch((err) => {
  console.error("Security audit crashed:", err);
  process.exit(1);
});
