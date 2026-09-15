/**
 * test_responsive_ui.mjs — Multi-viewport responsive diagnostics.
 * Tests 375px, 390px, 768px, 1280px for horizontal overflow, element overlaps, and touch targets.
 */
import { spawn } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const PORT = 9223;
const TARGET_URL = "http://localhost:3000";

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
  console.log("Starting responsive diagnostic runner...");
  const browserProc = spawn(
    BROWSER_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + resolve("./.edge-responsive-test-profile"),
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await sleep(1500);

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

    const viewports = [
      { name: "mobile-375", width: 375, height: 667, isMobile: true },
      { name: "mobile-390", width: 390, height: 844, isMobile: true },
      { name: "tablet-768", width: 768, height: 1024, isMobile: false },
      { name: "desktop-1280", width: 1280, height: 800, isMobile: false },
    ];

    const results = {};

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.isMobile,
      });

      await sleep(1000);

      // Check horizontal overflow
      const overflowInfo = await evaluate(pageWs, `(() => {
        const docWidth = document.documentElement.offsetWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasHorizontalScroll = scrollWidth > winWidth;
        
        // Find elements that overflow the viewport horizontally
        const overflowingElements = [];
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > winWidth + 2) {
            overflowingElements.push({
              tag: el.tagName,
              className: el.className ? String(el.className).slice(0, 80) : '',
              id: el.id || '',
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              winWidth: winWidth
            });
          }
        });

        // Check small touch targets (< 32x32)
        const smallTouchTargets = [];
        document.querySelectorAll('button, a, input, select').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
            smallTouchTargets.push({
              tag: el.tagName,
              text: el.innerText ? el.innerText.trim().slice(0, 30) : (el.getAttribute('aria-label') || ''),
              className: el.className ? String(el.className).slice(0, 60) : '',
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        });

        return {
          winWidth,
          scrollWidth,
          hasHorizontalScroll,
          overflowCount: overflowingElements.length,
          overflowingElements: overflowingElements.slice(0, 10),
          smallTouchTargetCount: smallTouchTargets.length,
          smallTouchTargets: smallTouchTargets.slice(0, 10)
        };
      })()`);

      console.log(`  - Horizontal Scroll: ${overflowInfo?.hasHorizontalScroll ? 'YES (OVERFLOW DETECTED!)' : 'None (Clean)'}`);
      console.log(`  - Window width: ${overflowInfo?.winWidth}px, Scroll width: ${overflowInfo?.scrollWidth}px`);
      if (overflowInfo?.overflowCount > 0) {
        console.log(`  - Overflowing elements (${overflowInfo.overflowCount}):`);
        overflowInfo.overflowingElements.forEach(e => {
          console.log(`    * <${e.tag}> right=${e.right}px (viewport=${e.winWidth}px) class: ${e.className}`);
        });
      }
      if (overflowInfo?.smallTouchTargetCount > 0) {
        console.log(`  - Small touch targets: ${overflowInfo.smallTouchTargetCount}`);
      }

      // Take Screenshot
      const screenshot = await sendCommand(pageWs, "Page.captureScreenshot", {
        format: "png",
      });
      const artifactDir = "C:/Users/prani/.gemini/antigravity/brain/a454bee4-cb77-41aa-829e-1e59cbc2fb0f";
      const shotPath = `${artifactDir}/viewport_${vp.name}.png`;
      writeFileSync(shotPath, Buffer.from(screenshot.data, "base64"));
      console.log(`  - Saved screenshot to ${shotPath}`);

      results[vp.name] = overflowInfo;
    }

    // Now test opening Camera Modal on mobile 375
    console.log("\nTesting Camera Modal open on mobile 375...");
    await sendCommand(pageWs, "Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(500);

    const cameraModalCheck = await evaluate(pageWs, `(() => {
      // Find camera button in ingestion bar
      const cameraBtn = Array.from(document.querySelectorAll('button')).find(b => b.title === 'Scan from WebCam' || b.innerText.includes('Camera'));
      if (!cameraBtn) return { error: 'Camera button not found' };
      cameraBtn.click();
      return { clicked: true };
    })()`);
    console.log("  - Camera button click:", cameraModalCheck);
    await sleep(800);

    const modalState = await evaluate(pageWs, `(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return { found: false };
      const rect = modal.getBoundingClientRect();
      const content = modal.querySelector('.glass-panel');
      const contentRect = content ? content.getBoundingClientRect() : null;
      return {
        found: true,
        modalRect: { width: Math.round(rect.width), height: Math.round(rect.height) },
        contentRect: contentRect ? { width: Math.round(contentRect.width), height: Math.round(contentRect.height), bottom: Math.round(contentRect.bottom) } : null,
        winHeight: window.innerHeight,
        winWidth: window.innerWidth,
      };
    })()`);
    console.log("  - Modal state on mobile:", modalState);

    const modalShot = await sendCommand(pageWs, "Page.captureScreenshot", { format: "png" });
    writeFileSync(
      "C:/Users/prani/.gemini/antigravity/brain/a454bee4-cb77-41aa-829e-1e59cbc2fb0f/modal_mobile_375.png",
      Buffer.from(modalShot.data, "base64")
    );
    console.log("  - Saved mobile camera modal screenshot.");

    pageWs.close();
    ws.close();
    browserProc.kill();
  } catch (err) {
    console.error("Test error:", err);
    browserProc.kill();
  }
}

main();
