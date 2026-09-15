/**
 * test_light_mode_verification.mjs
 * Comprehensive diagnostic & visual verification runner for Light Mode with Violation preset.
 */
import { spawn } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const PORT = 9225;
const TARGET_URL = "http://localhost:3000";
const OUT_DIR = "C:/Users/prani/.gemini/antigravity/brain/a454bee4-cb77-41aa-829e-1e59cbc2fb0f";

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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== Starting Violation Light Mode Verification Runner ===");
  const browserProc = spawn(
    BROWSER_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + resolve("./.edge-light-mode-profile-2"),
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(1800);

  try {
    const versionRes = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    const versionData = await versionRes.json();
    const ws = new WebSocket(versionData.webSocketDebuggerUrl);
    await new Promise((res) => (ws.onopen = res));

    const newTab = await sendCommand(ws, "Target.createTarget", { url: TARGET_URL });
    const pageWsUrl = `ws://127.0.0.1:${PORT}/devtools/page/${newTab.targetId}`;
    const pageWs = new WebSocket(pageWsUrl);
    await new Promise((res) => (pageWs.onopen = res));

    await sendCommand(pageWs, "Page.enable");
    await sendCommand(pageWs, "DOM.enable");
    await sendCommand(pageWs, "Runtime.enable");

    await sleep(2500);

    console.log("1. Ensuring Light Mode is active...");
    await evaluate(pageWs, `(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('sih_theme', 'light');
    })()`);
    await sleep(500);

    console.log("2. Clicking 'Corn Puffs Snack' (Violation) preset button...");
    const clickResult = await evaluate(pageWs, `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cornPuffsBtn = buttons.find(b => b.textContent && b.textContent.includes('Corn Puffs'));
      if (cornPuffsBtn) {
        cornPuffsBtn.click();
        return { clicked: true, text: cornPuffsBtn.textContent.trim() };
      }
      return { clicked: false, error: 'Corn Puffs button not found' };
    })()`);
    console.log("   Click result:", clickResult);

    // Wait for OCR & Legal Audit analysis pipeline to finish
    await sleep(4000);

    // Desktop Violation screenshot
    console.log("3. Capturing Desktop Violation View (1280x850)...");
    await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 1280, height: 850, deviceScaleFactor: 2, mobile: false,
    });
    await sleep(500);
    const desktopViolShot = await sendCommand(pageWs, "Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT_DIR}/light_mode_desktop_violation.png`, Buffer.from(desktopViolShot.data, "base64"));
    console.log("   Saved light_mode_desktop_violation.png");

    // Scroll down to see the rule cards on desktop
    console.log("4. Capturing Desktop Scrolled Cards View (1280x850)...");
    await evaluate(pageWs, `window.scrollBy(0, 450)`);
    await sleep(500);
    const desktopScrollShot = await sendCommand(pageWs, "Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT_DIR}/light_mode_desktop_violation_scrolled.png`, Buffer.from(desktopScrollShot.data, "base64"));
    console.log("   Saved light_mode_desktop_violation_scrolled.png");

    // Tablet Violation screenshot
    console.log("5. Capturing Tablet Violation View (768x1024)...");
    await evaluate(pageWs, `window.scrollTo(0, 0)`);
    await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 768, height: 1024, deviceScaleFactor: 2, mobile: false,
    });
    await sleep(600);
    const tabletViolShot = await sendCommand(pageWs, "Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT_DIR}/light_mode_tablet_violation.png`, Buffer.from(tabletViolShot.data, "base64"));
    console.log("   Saved light_mode_tablet_violation.png");

    // Mobile Violation screenshot
    console.log("6. Capturing Mobile Violation View (390x844)...");
    await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    });
    await sleep(600);
    const mobileViolShot = await sendCommand(pageWs, "Page.captureScreenshot", { format: "png" });
    writeFileSync(`${OUT_DIR}/light_mode_mobile_violation.png`, Buffer.from(mobileViolShot.data, "base64"));
    console.log("   Saved light_mode_mobile_violation.png");

    console.log("=== All violation verifications completed successfully ===");

    pageWs.close();
    ws.close();
    browserProc.kill();
  } catch (err) {
    console.error("Runner failed:", err);
    browserProc.kill();
  }
}

main();
