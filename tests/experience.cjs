/* E2E sem alterar estados internos. PLAYWRIGHT_MODULE pode apontar para uma instalação existente. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const errors = [];
const base = process.env.TEST_URL || "http://127.0.0.1:4173";
async function scene(page, name, timeout = 35000) {
  await page.waitForFunction(
    (name) => window.gardenExperience?.state === name,
    name,
    { timeout },
  );
}
async function run() {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("ERR_CERT") &&
      !m.text().includes("ERR_NAME")
    )
      errors.push(m.text());
  });
  await page.goto(base);
  await scene(page, "SMALL_GARDEN");
  await page.waitForTimeout(1900);
  await page.screenshot({ path: "artifacts/01-small-mobile.png" });
  await page.locator('[data-flower="f0"]').tap({ force: true });
  await page.locator('[data-flower="f2"]').tap({ force: true });
  await page.locator('[data-flower="f1"]').tap({ force: true });
  await page.waitForTimeout(5350);
  // Três tentativas rápidas: a tulipa se move e continua alcançável por toque.
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-flower="f3"]').tap({ force: true });
    await page.waitForTimeout(110);
  }
  await page.waitForFunction(() => gardenExperience.stats.tulipAttempts === 3);
  await scene(page, "REGROWTH");
  console.log("PASS: exploration gate, rose, rapid tulip taps");
  await page.waitForTimeout(3700);
  await page.screenshot({ path: "artifacts/02-regrowth.png" });
  await scene(page, "BOUQUET");
  await page.waitForTimeout(4800);
  await page.screenshot({ path: "artifacts/03-bouquet.png" });
  await scene(page, "CAMERA_COVER", 12000);
  const coverStarted = Date.now();
  const captureCover = async (progress, path) => {
    const remaining = 4200 * progress - (Date.now() - coverStarted);
    if (remaining > 0) await page.waitForTimeout(remaining);
    await page.screenshot({ path });
  };
  await captureCover(0.35, "artifacts/camera-cover-35.png");
  await captureCover(0.65, "artifacts/camera-cover-65.png");
  const coverPerformance = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        let maxGap = 0;
        let previous = 0;
        const start = performance.now();
        const sample = (now) => {
          frames++;
          if (previous) maxGap = Math.max(maxGap, now - previous);
          previous = now;
          if (now - start < 1000) requestAnimationFrame(sample);
          else
            resolve({
              fps: Math.round((frames * 1000) / (now - start)),
              maxFrameGap: Math.round(maxGap),
            });
        };
        requestAnimationFrame(sample);
      }),
  );
  console.log("CAMERA_COVER performance:", JSON.stringify(coverPerformance));
  await captureCover(0.9, "artifacts/camera-cover-90.png");
  await scene(page, "LIGHT_PULL", 25000);
  await page.waitForFunction(
    () => !document.getElementById("cord").classList.contains("entering"),
    null,
    { timeout: 3000 },
  );
  await page.screenshot({ path: "artifacts/04-darkness.png" });
  await page.setViewportSize({ width: 320, height: 740 });
  const cordHandleBounds = () =>
    page.locator("#cord-handle").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
    });
  let handleBounds = await cordHandleBounds();
  assert(
    handleBounds.x >= 0 && handleBounds.right <= 320 && handleBounds.bottom <= 740,
    "A corda deve permanecer dentro da viewport de 320px",
  );
  let cordBox = await page.locator("#cord").boundingBox();
  await page.mouse.move(cordBox.x + 30, cordBox.y + 195);
  await page.mouse.down();
  await page.mouse.move(cordBox.x + 30, cordBox.y + 231, { steps: 4 });
  assert.match(await page.locator("#cord-line").getAttribute("d"), / 219$/);
  assert(
    await page.locator("#cord-line").evaluate((node) => parseFloat(node.style.strokeWidth) > 1.5),
    "A tensão visual deve crescer durante a puxada",
  );
  await page.mouse.up();
  await page.waitForTimeout(680);
  assert.equal(await page.evaluate(() => gardenExperience.state), "LIGHT_PULL");
  assert.match(await page.locator("#cord-line").getAttribute("d"), / 183$/);
  assert.equal(await page.locator("#cord-line").evaluate((node) => node.style.strokeWidth), "1.5px");
  await page.setViewportSize({ width: 844, height: 390 });
  handleBounds = await cordHandleBounds();
  assert(
    handleBounds.x >= 0 && handleBounds.right <= 844 && handleBounds.bottom <= 390,
    "A corda deve permanecer dentro da viewport em landscape",
  );
  cordBox = await page.locator("#cord").boundingBox();
  await page.mouse.move(cordBox.x + 30, cordBox.y + 195);
  await page.mouse.down();
  await page.mouse.move(cordBox.x + 30, cordBox.y + 225, { steps: 3 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => gardenExperience.state), "LIGHT_PULL");
  await page.setViewportSize({ width: 390, height: 844 });
  // Eventos reais do protocolo de toque, incluindo uma puxada insuficiente.
  const cdp = await context.newCDPSession(page);
  const box = await page.locator("#cord").boundingBox();
  const x = box.x + 30,
    y = box.y + 195;
  const touch = async (type, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints:
        type === "touchEnd"
          ? []
          : [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
  await touch("touchStart", y);
  await touch("touchMove", y + 25);
  await touch("touchEnd", y + 25);
  assert.equal(await page.evaluate(() => gardenExperience.state), "LIGHT_PULL");
  await touch("touchStart", y);
  for (const d of [12, 28, 46, 64, 86]) {
    await touch("touchMove", y + d);
  }
  await touch("touchEnd", y + 90);
  await scene(page, "BIG_GARDEN");
  assert.equal(await page.evaluate(() => gardenExperience.stats.cordFired), true);
  await touch("touchStart", y);
  await touch("touchMove", y + 90);
  await touch("touchEnd", y + 90);
  assert.equal(await page.evaluate(() => gardenExperience.state), "BIG_GARDEN");
  assert.equal(await page.evaluate(() => gardenExperience.stats.cordFired), true);
  await page.waitForTimeout(220);
  await page.screenshot({ path: "artifacts/big-garden-light.png" });
  await scene(page, "EXPLORATION");
  console.log("PASS: full growth sequence and real touchscreen cord drag");
  await page.screenshot({ path: "artifacts/05-field-mobile.png" });
  for (const width of [320, 430, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 740 });
    await page.waitForTimeout(250);
    const bounds = await page.locator(".flower-target").evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    assert(
      bounds.every(
        (b) =>
          b.x + b.w > 0 &&
          b.x < width &&
          b.y >= 0 &&
          b.y < (width === 844 ? 390 : 740),
      ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: `artifacts/field-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // Todos os alvos são botões reais, alcançáveis sem acessar o estado do renderer.
  const ids = await page
    .locator(".flower-target")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.flower));
  for (const id of ids) {
    await page.locator(`[data-flower="${id}"]`).tap({ force: true });
    await page.waitForTimeout(70);
  }
  await page.waitForFunction(() => gardenExperience.stats.secrets === 3);
  await page.waitForFunction(
    () =>
      document.getElementById("caption").textContent === "eu faria o mesmo.",
    null,
    { timeout: 20000 },
  );
  assert.equal(
    await page.locator("#end").isVisible(),
    false,
    "A fala final deve terminar antes do botão aparecer",
  );
  await page.locator("#end").waitFor({ state: "visible", timeout: 10000 });
  assert((await page.evaluate(() => gardenExperience.stats.particles)) <= 44);
  await page.locator("#sound").tap({ force: true });
  assert.equal(
    await page.locator("#sound").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#sound").tap({ force: true });
  await page.locator("#end").tap({ force: true });
  await page
    .locator(".file-link")
    .waitFor({ state: "visible", timeout: 15000 });
  await page.locator(".file-link").tap({ force: true });
  await scene(page, "APOLOGY_FILE");
  assert.equal(await page.locator("#file-title").textContent(), "para_ela.txt");
  assert.equal(
    await page.locator("#final-message").textContent(),
    await page.evaluate(() => GARDEN_CONFIG.apologyText),
  );
  assert.equal(await page.locator("#end").isVisible(), false);
  assert.equal(await page.locator("#file-close").textContent(), "[ fechar arquivo ]");
  await page.setViewportSize({ width: 320, height: 740 });
  let apologyBounds = await page.locator("#file").boundingBox();
  assert(apologyBounds.x >= 0 && apologyBounds.x + apologyBounds.width <= 320);
  const apologyScroll = await page.locator("#file-scroll").evaluate((node) => ({
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }));
  assert(apologyScroll.scrollHeight > apologyScroll.clientHeight, "O pedido deve rolar em 320px");
  await page.locator("#file-scroll").evaluate((node) => (node.scrollTop = node.scrollHeight));
  assert((await page.locator("#file-scroll").evaluate((node) => node.scrollTop)) > 0);
  await page.setViewportSize({ width: 430, height: 844 });
  apologyBounds = await page.locator("#file").boundingBox();
  assert(apologyBounds.x >= 0 && apologyBounds.x + apologyBounds.width <= 430);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#file-scroll").evaluate((node) => (node.scrollTop = 0));
  await page.screenshot({ path: "artifacts/08-apology-mobile.png" });
  await page.locator("#file-close").dblclick({ force: true });
  await scene(page, "FAKE_SHUTDOWN");
  await page.waitForFunction(() =>
    document.getElementById("terminal-lines").textContent.includes("session finished."),
  );
  assert.equal(await page.locator("#terminal-lines > div").count(), 6);
  assert.equal(await page.locator("#file").isVisible(), false);
  await page.screenshot({ path: "artifacts/09-shutdown-terminal.png" });
  await scene(page, "CRT_SHUTDOWN");
  await page.waitForTimeout(340);
  const crtScaleY = await page.locator("#screen-layer").evaluate((node) =>
    new DOMMatrix(getComputedStyle(node).transform).d,
  );
  assert(crtScaleY > 0 && crtScaleY < 1, "O CRT deve comprimir a cena verticalmente");
  await page.screenshot({ path: "artifacts/10-crt-mid.png" });
  await scene(page, "BLACK_SCREEN");
  assert.equal(await page.locator("#screen-layer").isVisible(), false);
  assert.equal(await page.locator("#terminal").isVisible(), false);
  assert.equal(await page.locator("#epilogue button:visible").count(), 0);
  await scene(page, "HESITATION");
  await page.waitForFunction(() => document.getElementById("hesitation").textContent === "...");
  await page.screenshot({ path: "artifacts/11-hesitation-dots.png" });
  await page.waitForFunction(() => document.getElementById("hesitation").textContent === "..");
  await page.waitForFunction(() => document.getElementById("hesitation").textContent === ".");
  await page.waitForFunction(() => document.getElementById("hesitation").textContent === "");
  await scene(page, "LILY_GROWTH");
  await page.waitForTimeout(360);
  await page.screenshot({ path: "artifacts/12-lily-sprout.png" });
  await page.waitForTimeout(4090);
  await page.screenshot({ path: "artifacts/13-lily-fully-open.png" });
  await scene(page, "HIDDEN_FOLDER", 10000);
  await page.screenshot({ path: "artifacts/14-lily-roots-folder.png" });
  assert.equal(await page.locator("#hidden-folder").isVisible(), true);
  assert.equal(await page.locator("#folder-contents").isVisible(), false);
  await page.locator("#hidden-folder").dblclick({ force: true });
  await scene(page, "FOLDER_OPENING");
  await scene(page, "HIDDEN_FOLDER", 5000);
  assert.equal(await page.evaluate(() => gardenExperience.stats.folderReleased), true);
  assert.equal(await page.locator("#folder-contents button").count(), 1);
  await page.screenshot({ path: "artifacts/15-folder-released.png" });
  await page.locator("#hidden-folder").click({ force: true });
  assert.equal(await page.locator("#folder-contents").isVisible(), false);
  await page.locator("#hidden-folder").click({ force: true });
  assert.equal(await page.locator("#folder-contents").isVisible(), true);
  await page.locator("#hidden-folder").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#folder-contents").isVisible(), false);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#folder-contents").isVisible(), true);
  await page.locator("#folder-contents").getByRole("button", { name: "ainda_tem_uma_coisa.txt" }).tap({ force: true });
  await scene(page, "DECLARATION_FILE");
  assert.equal(await page.locator("#declaration-file-title").textContent(), "ainda_tem_uma_coisa.txt");
  assert.equal(
    await page.locator("#declaration-message").textContent(),
    await page.evaluate(() => GARDEN_CONFIG.declarationText),
  );
  const visibleFinalButtons = await page.locator("#epilogue button:visible").allTextContents();
  assert(!visibleFinalButtons.some((text) => /\b(sim|não|nao)\b/i.test(text)));
  await page.setViewportSize({ width: 320, height: 740 });
  let declarationBounds = await page.locator("#declaration-file").boundingBox();
  assert(declarationBounds.x >= 0 && declarationBounds.x + declarationBounds.width <= 320);
  const declarationScroll = await page.locator("#declaration-scroll").evaluate((node) => ({
    scrollHeight: node.scrollHeight,
    clientHeight: node.clientHeight,
  }));
  assert(declarationScroll.scrollHeight > declarationScroll.clientHeight, "A declaração deve rolar em 320px");
  await page.locator("#declaration-scroll").evaluate((node) => (node.scrollTop = node.scrollHeight));
  assert((await page.locator("#declaration-scroll").evaluate((node) => node.scrollTop)) > 0);
  await page.setViewportSize({ width: 430, height: 844 });
  declarationBounds = await page.locator("#declaration-file").boundingBox();
  assert(declarationBounds.x >= 0 && declarationBounds.x + declarationBounds.width <= 430);
  await page.setViewportSize({ width: 844, height: 390 });
  declarationBounds = await page.locator("#declaration-file").boundingBox();
  assert(declarationBounds.y >= 0 && declarationBounds.y + declarationBounds.height <= 390);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#declaration-scroll").evaluate((node) => (node.scrollTop = 0));
  await page.screenshot({ path: "artifacts/16-declaration-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "artifacts/17-declaration-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#declaration-close").tap({ force: true });
  await scene(page, "FINAL_END");
  assert.equal(await page.locator("#declaration-file").isVisible(), false);
  assert.equal(await page.locator("#hidden-folder").isVisible(), false);
  console.log(
    "PASS: apology, terminal shutdown, CRT, hesitation, lily, hidden folder and declaration",
  );
  await page.reload();
  await scene(page, "SMALL_GARDEN");
  assert.equal(
    await page.evaluate(() => gardenExperience.stats.tulipAttempts),
    0,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  await page.locator('[data-flower="f0"]').click({ force: true });
  await page.screenshot({ path: "artifacts/07-desktop-reduced.png" });
  await page.locator('[data-flower="f2"]').click({ force: true });
  await page.locator('[data-flower="f1"]').click({ force: true });
  await page.waitForTimeout(5300);
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-flower="f3"]').click({ force: true });
    await page.waitForTimeout(110);
  }
  await scene(page, "REGROWTH");
  await page.waitForTimeout(3700);
  await scene(page, "BOUQUET");
  await scene(page, "CAMERA_COVER", 15000);
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => gardenExperience.state), "CAMERA_COVER");
  await page.screenshot({ path: "artifacts/reduced-camera-cover.png" });
  await scene(page, "LIGHT_PULL", 12000);
  assert.equal(
    await page.locator("#cord").evaluate((node) => getComputedStyle(node).animationDuration),
    "0.85s",
  );
  await page.waitForFunction(
    () => !document.getElementById("cord").classList.contains("entering"),
    null,
    { timeout: 3000 },
  );
  await page.locator("#cord").focus();
  await page.keyboard.press("Enter");
  await scene(page, "BIG_GARDEN");
  await scene(page, "EXPLORATION", 10000);
  await page.screenshot({ path: "artifacts/reduced-light-on.png" });
  for (const id of ["f171", "f176", "f181"]) {
    await page.locator(`[data-flower="${id}"]`).click({ force: true });
    await page.waitForTimeout(90);
  }
  await page.waitForFunction(() => gardenExperience.stats.secrets === 3);
  await page.locator("#end").waitFor({ state: "visible", timeout: 20000 });
  await page.locator("#end").click({ force: true });
  await page.locator(".file-link").waitFor({ state: "visible", timeout: 15000 });
  await page.locator(".file-link").click({ force: true });
  await scene(page, "APOLOGY_FILE");
  await page.locator("#file-close").click({ force: true });
  await scene(page, "FAKE_SHUTDOWN");
  await page.waitForFunction(() =>
    document.getElementById("terminal-lines").textContent.includes("session finished."),
  );
  await scene(page, "CRT_SHUTDOWN");
  await scene(page, "BLACK_SCREEN");
  await scene(page, "HESITATION");
  await page.waitForFunction(() => document.getElementById("hesitation").textContent === "");
  await scene(page, "LILY_GROWTH");
  await scene(page, "HIDDEN_FOLDER", 5000);
  await page.locator("#hidden-folder").focus();
  await page.keyboard.press("Enter");
  await scene(page, "FOLDER_OPENING");
  await scene(page, "HIDDEN_FOLDER", 5000);
  assert.equal(await page.evaluate(() => gardenExperience.stats.folderReleased), true);
  await page.locator("#open-declaration").focus();
  await page.keyboard.press("Enter");
  await scene(page, "DECLARATION_FILE");
  assert.equal(
    await page.locator("#declaration-message").textContent(),
    await page.evaluate(() => GARDEN_CONFIG.declarationText),
  );
  console.log(
    "PASS: refresh, reduced-motion epilogue and keyboard folder access",
  );
  console.log("BROWSER ERRORS:", JSON.stringify(errors));
  assert.equal(errors.length, 0);
  await browser.close();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
