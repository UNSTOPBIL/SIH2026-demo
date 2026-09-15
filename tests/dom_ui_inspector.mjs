import { spawn } from "node:child_process";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const PORT = 9226;
const BASE_URL = "http://localhost:3000";
const OUT_DIR = "C:/Users/prani/.gemini/antigravity/brain/a454bee4-cb77-41aa-829e-1e59cbc2fb0f/ui_audit";

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

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

async function capture(pageWs, filename, clip = null) {
  const params = { format: "png" };
  if (clip) params.clip = clip;
  const shot = await sendCommand(pageWs, "Page.captureScreenshot", params);
  writeFileSync(`${OUT_DIR}/${filename}`, Buffer.from(shot.data, "base64"));
  console.log(`[Screenshot] Saved ${filename}`);
}

async function checkDomGlitches(pageWs, pageName) {
  return await evaluate(pageWs, `(() => {
    const docWidth = document.documentElement.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const docScrollWidth = document.documentElement.scrollWidth;
    const hasHorizontalOverflow = docScrollWidth > docWidth || bodyScrollWidth > docWidth;

    const overflowingElements = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
      if (style.position === 'fixed' || style.position === 'absolute') {
        if (rect.right > docWidth + 50) {
          if (style.overflow !== 'hidden' && rect.width > docWidth) {
            overflowingElements.push({
              tag: el.tagName,
              className: (el.className || '').toString().slice(0, 80),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              docWidth
            });
          }
        }
        return;
      }
      if (rect.right > docWidth + 2) {
        overflowingElements.push({
          tag: el.tagName,
          className: (el.className || '').toString().slice(0, 80),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          docWidth
        });
      }
    });

    const brokenImages = [];
    document.querySelectorAll('img').forEach(img => {
      if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:image/svg')) {
        brokenImages.push({ src: img.src.slice(0, 100), alt: img.alt });
      }
    });

    const emptyButtons = [];
    document.querySelectorAll('button, a[href]').forEach(el => {
      const rect = el.getBoundingClientRect();
      const text = el.innerText || el.getAttribute('aria-label') || el.getAttribute('title');
      const hasSvg = el.querySelector('svg') !== null;
      if (rect.width > 0 && rect.height > 0 && !text && !hasSvg) {
        emptyButtons.push({ tag: el.tagName, className: (el.className || '').toString().slice(0, 50) });
      }
    });

    return {
      docWidth,
      docScrollWidth,
      bodyScrollWidth,
      hasHorizontalOverflow,
      overflowingCount: overflowingElements.length,
      sampleOverflow: overflowingElements.slice(0, 5),
      brokenImages,
      emptyButtons
    };
  })()`);
}

async function setTheme(pageWs, theme) {
  await evaluate(pageWs, `(() => {
    if ('${theme}' === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sih_theme', '${theme}');
  })()`);
  await sleep(400);
}

async function setViewport(pageWs, width, height, mobile = false) {
  await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile,
  });
  await sleep(400);
}

async function main() {
  console.log("=== Launching Edge DOM UI Visual Validator ===");
  const browserProc = spawn(
    BROWSER_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + resolve("./.edge-dom-audit-profile"),
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(2000);

  const consoleLogs = [];
  const uncaughtErrors = [];

  try {
    const versionRes = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    const versionData = await versionRes.json();
    const ws = new WebSocket(versionData.webSocketDebuggerUrl);
    await new Promise((res) => (ws.onopen = res));

    const newTab = await sendCommand(ws, "Target.createTarget", { url: "about:blank" });
    const pageWsUrl = `ws://127.0.0.1:${PORT}/devtools/page/${newTab.targetId}`;
    const pageWs = new WebSocket(pageWsUrl);
    await new Promise((res) => (pageWs.onopen = res));

    pageWs.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.method === "Runtime.consoleAPICalled") {
        const text = data.params.args.map(a => a.value || a.description || "").join(" ");
        consoleLogs.push({ type: data.params.type, text: text.slice(0, 200) });
      } else if (data.method === "Runtime.exceptionThrown") {
        uncaughtErrors.push(data.params.exceptionDetails);
      }
    });

    await sendCommand(pageWs, "Page.enable");
    await sendCommand(pageWs, "DOM.enable");
    await sendCommand(pageWs, "Runtime.enable");

    // -------------------------------------------------------------
    // ROUTE 1: Home Page (/)
    // -------------------------------------------------------------
    console.log("\n--- AUDITING ROUTE: / (Scanner Page) ---");
    await sendCommand(pageWs, "Page.navigate", { url: `${BASE_URL}/` });
    await sleep(3000);

    // Desktop Light
    await setViewport(pageWs, 1280, 850, false);
    await setTheme(pageWs, "light");
    let domCheck = await checkDomGlitches(pageWs, "home-desktop-light");
    console.log("Home (Desktop Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "01_home_desktop_light.png");

    // Desktop Dark
    await setTheme(pageWs, "dark");
    domCheck = await checkDomGlitches(pageWs, "home-desktop-dark");
    console.log("Home (Desktop Dark) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "02_home_desktop_dark.png");

    // Mobile Light & Dark
    await setViewport(pageWs, 390, 844, true);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "home-mobile-light");
    console.log("Home (Mobile Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "03_home_mobile_light.png");

    await setTheme(pageWs, "dark");
    await capture(pageWs, "04_home_mobile_dark.png");

    // Tablet Light
    await setViewport(pageWs, 768, 1024, false);
    await setTheme(pageWs, "light");
    await capture(pageWs, "05_home_tablet_light.png");

    // Click Violation Preset and test Scanned State
    console.log("Loading Violation Specimen...");
    await setViewport(pageWs, 1280, 850, false);
    await evaluate(pageWs, `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.includes('Corn Puffs'));
      if (btn) btn.click();
    })()`);
    await sleep(4000);

    // Desktop Scanned State (Light & Dark)
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "home-scanned-light");
    console.log("Home Scanned (Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "06_home_scanned_desktop_light.png");

    await setTheme(pageWs, "dark");
    await capture(pageWs, "07_home_scanned_desktop_dark.png");

    // Mobile Scanned State
    await setViewport(pageWs, 390, 844, true);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "home-scanned-mobile");
    console.log("Home Scanned (Mobile Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "08_home_scanned_mobile_light.png");

    // Test TestGalleryModal
    console.log("Testing Test Gallery Modal...");
    await setViewport(pageWs, 1280, 850, false);
    await evaluate(pageWs, `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const galleryBtn = btns.find(b => b.textContent && b.textContent.includes('Test Suite'));
      if (galleryBtn) galleryBtn.click();
    })()`);
    await sleep(800);
    domCheck = await checkDomGlitches(pageWs, "modal-test-gallery");
    console.log("Test Gallery Modal DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "09_modal_test_gallery_desktop_light.png");

    // Close Modal
    await evaluate(pageWs, `(() => {
      const closeBtn = document.querySelector('button[aria-label="Close modal"]') || document.querySelector('button svg.lucide-x')?.parentElement;
      if (closeBtn) closeBtn.click();
      else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    })()`);
    await sleep(500);

    // -------------------------------------------------------------
    // ROUTE 2: /dashboard (Enforcement Dashboard)
    // -------------------------------------------------------------
    console.log("\n--- AUDITING ROUTE: /dashboard ---");
    await sendCommand(pageWs, "Page.navigate", { url: `${BASE_URL}/dashboard` });
    await sleep(2500);

    // Desktop Light
    await setViewport(pageWs, 1280, 950, false);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "dashboard-desktop-light");
    console.log("Dashboard (Desktop Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "10_dashboard_desktop_light.png");

    // Desktop Scrolled
    await evaluate(pageWs, `window.scrollBy(0, 500)`);
    await sleep(400);
    await capture(pageWs, "11_dashboard_desktop_scrolled_light.png");
    await evaluate(pageWs, `window.scrollTo(0, 0)`);

    // Desktop Dark
    await setTheme(pageWs, "dark");
    domCheck = await checkDomGlitches(pageWs, "dashboard-desktop-dark");
    console.log("Dashboard (Desktop Dark) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "12_dashboard_desktop_dark.png");

    // Tablet Light
    await setViewport(pageWs, 768, 1024, false);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "dashboard-tablet-light");
    console.log("Dashboard (Tablet Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "13_dashboard_tablet_light.png");

    // Mobile Light & Dark
    await setViewport(pageWs, 390, 844, true);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "dashboard-mobile-light");
    console.log("Dashboard (Mobile Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "14_dashboard_mobile_light.png");

    await setTheme(pageWs, "dark");
    await capture(pageWs, "15_dashboard_mobile_dark.png");

    // -------------------------------------------------------------
    // ROUTE 3: /history (Inspection Repository)
    // -------------------------------------------------------------
    console.log("\n--- AUDITING ROUTE: /history ---");
    await sendCommand(pageWs, "Page.navigate", { url: `${BASE_URL}/history` });
    await sleep(2500);

    // Desktop Light - Scans Tab
    await setViewport(pageWs, 1280, 950, false);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "history-desktop-light");
    console.log("History (Desktop Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "16_history_scans_desktop_light.png");

    // Expand first scan item to test details accordion
    await evaluate(pageWs, `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const auditBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Audit');
      if (auditBtn) auditBtn.click();
    })()`);
    await sleep(1000);
    await capture(pageWs, "17_history_scans_expanded_light.png");

    // Desktop Dark - Scans Tab
    await setTheme(pageWs, "dark");
    domCheck = await checkDomGlitches(pageWs, "history-desktop-dark");
    console.log("History (Desktop Dark) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "18_history_scans_desktop_dark.png");

    // Switch to Products Tab
    console.log("Switching to Product Catalog tab...");
    await evaluate(pageWs, `(() => {
      const tabBtns = Array.from(document.querySelectorAll('button'));
      const prodTab = tabBtns.find(b => b.textContent && b.textContent.includes('Product Compliance Catalog'));
      if (prodTab) prodTab.click();
    })()`);
    await sleep(600);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "history-products-light");
    console.log("History Products Tab (Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "19_history_products_desktop_light.png");

    // Mobile Light - History
    await setViewport(pageWs, 390, 844, true);
    await setTheme(pageWs, "light");
    domCheck = await checkDomGlitches(pageWs, "history-mobile-light");
    console.log("History (Mobile Light) DOM check:", JSON.stringify(domCheck));
    await capture(pageWs, "20_history_mobile_light.png");

    console.log("\n=== DOM AUDIT COMPLETE ===");
    console.log(`Console Logs captured: ${consoleLogs.length}`);
    const errLogs = consoleLogs.filter(l => l.type === 'error');
    console.log(`Console Errors: ${errLogs.length}`, JSON.stringify(errLogs));
    console.log(`Uncaught Errors: ${uncaughtErrors.length}`, JSON.stringify(uncaughtErrors));

    pageWs.close();
    ws.close();
    browserProc.kill();
  } catch (err) {
    console.error("DOM Audit Runner error:", err);
    browserProc.kill();
  }
}

main();
