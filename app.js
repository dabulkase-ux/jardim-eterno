/* Máquina de cenas + relógio único. Cada transição cancela a linha do tempo anterior. */
(() => {
  "use strict";
  const C = GARDEN_CONFIG,
    $ = (id) => document.getElementById(id),
    renderer = new GardenRenderer($("garden")),
    audio = new GardenAudio(C.audio);
  class Timeline {
    constructor() {
      this.token = 0;
      this.jobs = [];
      this.time = 0;
      this.last = 0;
      this.tick = this.tick.bind(this);
      requestAnimationFrame(this.tick);
    }
    tick(t) {
      if (!document.hidden && this.last)
        this.time += Math.min(t - this.last, 80);
      this.last = t;
      this.jobs = this.jobs.filter((job) => {
        if (job.token !== this.token) {
          job.resolve(false);
          return false;
        }
        if (this.time >= job.at) {
          job.resolve(true);
          return false;
        }
        return true;
      });
      requestAnimationFrame(this.tick);
    }
    cancel() {
      this.token++;
      for (const j of this.jobs) j.resolve(false);
      this.jobs = [];
    }
    wait(ms) {
      return new Promise((resolve) =>
        this.jobs.push({ at: this.time + ms, token: this.token, resolve }),
      );
    }
  }
  const clock = new Timeline();
  let state = "",
    targets = [],
    commonTouched = new Set(),
    tulipAttempts = 0,
    specialGone = new Set(),
    busy = false,
    found = new Set(),
    narrated = new Set(),
    captionExpiry = 0,
    captionQueue = Promise.resolve(),
    pointerStart = null,
    cordFired = false,
    cordSettled = false,
    cordReturnFrame = 0,
    folderReleased = false,
    folderContentsOpen = false,
    folderReleaseBusy = false,
    exploreHits = 0;
  function show(el, value = true) {
    $(el).classList.toggle("hidden", !value);
  }
  function caption(text, ms = C.timing.phrase) {
    $("caption").textContent = text;
    $("caption").classList.add("visible");
    captionExpiry = clock.time + ms;
  }
  async function say(lines, hold = C.timing.phrase) {
    for (const line of lines) {
      caption(line, hold);
      if (!(await clock.wait(hold + 240))) return false;
    }
    return true;
  }
  function setScene(name) {
    clock.cancel();
    state = name;
    document.body.dataset.scene = name;
    $("experience").dataset.scene = name;
    captionExpiry = 0;
    $("caption").classList.remove("visible");
    clearTargets();
  }
  function clearTargets() {
    targets = [];
    $("targets").replaceChildren();
  }
  function bindFlowers(flowers) {
    clearTargets();
    for (const f of flowers) {
      if (!f.interactive || !f.visible) continue;
      const button = document.createElement("button");
      button.className = "flower-target";
      button.dataset.flower = f.id;
      button.setAttribute(
        "aria-label",
        `${f.type === "rose" ? "Rosa" : f.type === "tulip" ? "Tulipa" : f.type === "blue" ? "Flor azul" : "Margarida"} — tocar`,
      );
      button.addEventListener("click", (e) => {
        audio.unlock();
        let selected = f;
        if (e.detail > 0) {
          let nearest = Infinity;
          for (const target of targets) {
            if (!target.f.visible || target.f.retract) continue;
            const p = renderer.position(target.f),
              distance = Math.hypot(p.x - e.clientX, p.y - e.clientY);
            if (distance < nearest) {
              nearest = distance;
              selected = target.f;
            }
          }
        }
        touchFlower(selected, e);
      });
      $("targets").append(button);
      targets.push({ f, button });
    }
    updateTargets();
  }
  function updateTargets() {
    for (const { f, button } of targets) {
      const p = renderer.position(f);
      button.style.left = p.x + "px";
      button.style.top = p.y + "px";
      button.style.display = f.visible && f.sink < 0.35 ? "block" : "none";
    }
    if (captionExpiry && clock.time >= captionExpiry) {
      $("caption").classList.remove("visible");
      captionExpiry = 0;
    }
  }
  renderer.onFrame = updateTargets;
  function header(title, sub, chapter) {
    $("scene-title").textContent = title;
    $("scene-subtitle").textContent = sub;
    $("chapter").textContent = chapter;
    show("scene-header");
    $("scene-header").style.opacity = 1;
  }
  async function terminal(lines, boot = false) {
    $("terminal-lines").replaceChildren();
    show("terminal");
    $("terminal").style.opacity = 1;
    show("progress", boot);
    document.querySelector(".terminal-bottom").style.display = boot
      ? "flex"
      : "none";
    for (let i = 0; i < lines.length; i++) {
      const line = document.createElement("div");
      line.textContent = "> " + lines[i];
      if (lines[i].includes("warning")) line.className = "warning";
      $("terminal-lines").append(line);
      const percentage = Math.round(((i + 1) / lines.length) * 100);
      $("progress").firstElementChild.style.width = percentage + "%";
      $("percentage").textContent = percentage + "%";
      $("progress-label").textContent =
        percentage === 100 ? "environment ready" : "loading environment";
      const duration = boot
        ? lines[i] === "ah."
          ? C.timing.ah
          : lines[i] === "identifying..."
            ? 500
            : C.timing.bootLine * (0.6 + Math.random() * 0.8)
        : C.timing.endingLine;
      if (!(await clock.wait(duration))) return false;
    }
    return true;
  }
  async function boot() {
    setScene("BOOT");
    renderer.setActive(false);
    $("veil").style.opacity = 1;
    if (!(await terminal(C.boot, true))) return;
    $("terminal").style.opacity = 0;
    if (!(await clock.wait(650))) return;
    show("terminal", false);
    smallGarden();
  }
  function smallGarden() {
    setScene("SMALL_GARDEN");
    renderer.small();
    renderer.setActive(true);
    $("veil").style.opacity = 0;
    header(
      "Um pequeno jardim.",
      "feito de coisas que crescem devagar.",
      "ESTUDO BOTÂNICO / 001",
    );
    show("hint");
    bindFlowers(renderer.flowers);
  }
  async function touchFlower(f, event) {
    if (state === "SMALL_GARDEN") {
      if (busy || f.retract) return;
      show("hint", false);
      f.hits++;
      audio.note();
      if (f.type === "rose") {
        busy = true;
        renderer.sink(f);
        specialGone.add("rose");
        await say(C.rose, 1450);
        busy = false;
        checkExplored();
      } else if (f.type === "tulip") {
        tulipAttempts++;
        f.impulse = 0.4;
        const p = renderer.position(f);
        f.targetLean =
          (event.clientX && event.clientX > p.x ? -0.23 : 0.23) *
          (tulipAttempts % 2 ? 1 : -1);
        if (tulipAttempts >= 3) {
          busy = true;
          caption(C.tulip[0], 1850);
          if (!(await clock.wait(1000))) return;
          renderer.sink(f);
          specialGone.add("tulip");
          if (!(await clock.wait(1200))) return;
          busy = false;
          checkExplored();
        } else {
          caption(tulipAttempts === 1 ? "Opa." : "Quase.", 800);
        }
      } else {
        f.impulse = 0.8;
        renderer.burst(f, 3);
        commonTouched.add(f.common);
        caption(C.common[f.common][(f.hits - 1) % 2], 2000);
        checkExplored();
      }
    } else if (state === "EXPLORATION") {
      audio.note();
      f.hits++;
      exploreHits++;
      f.impulse = 1.4;
      const action = (f.hits + Number(f.id.slice(1))) % 6;
      if (action === 0) {
        f.closed = 0.96;
      } else if (action === 1) {
        renderer.burst(f, 9);
      } else if (action === 2) {
        f.targetLean = f.hits % 2 ? 0.32 : -0.32;
      } else if (action === 3 && renderer.flowers.length < 205) {
        const child = renderer.flower(
          f.type,
          clamp(f.x + (f.x > 0.5 ? -0.04 : 0.04), 0.05, 0.95),
          f.y + 0.014,
          f.size * 0.7,
          { color: f.color },
        );
        renderer.grow(child, 0, 2.3);
        renderer.flowers.sort((a, b) => a.y - b.y);
      } else if (action === 4) {
        renderer.burst(f, 4);
        f.closed = 0.5;
      } else {
        f.gust = 1.8;
        for (const neighbor of renderer.flowers) {
          if (neighbor === f || Math.abs(neighbor.x - f.x) > 0.2) continue;
          neighbor.gust = Math.max(neighbor.gust, 1.05);
        }
      }
      if (f.secret !== null && f.secret !== undefined && !found.has(f.secret)) {
        found.add(f.secret);
        $("notes-count").textContent = `${found.size} de 3 pequenos acasos`;
        // Segredos são enfileirados para cliques rápidos nunca apagarem uma descoberta.
        const secret = f.secret;
        captionQueue = captionQueue.then(async () => {
          if (state !== "EXPLORATION") return;
          busy = true;
          if (secret === 1) {
            renderer.wind = 6;
            for (const flower of renderer.flowers) flower.impulse = 0.8;
          }
          if (!(await say(C.secrets[secret], secret === 2 ? 2300 : 2200)))
            return;
          narrated.add(secret);
          busy = false;
          renderer.wind = 0.8;
          if (narrated.size === 3) {
            if (await clock.wait(1500)) show("end");
          }
        });
      } else if (!busy && (action === 1 || action === 3 || action === 4)) {
        caption(C.playground[(exploreHits - 1) % C.playground.length], 2100);
      }
    }
  }
  function checkExplored() {
    if (
      specialGone.size === 2 &&
      commonTouched.size >= C.interaction.commonBeforeRegrowth &&
      !busy
    ) {
      busy = true;
      clock.wait(2200).then((ok) => {
        if (ok && state === "SMALL_GARDEN") regrowth();
      });
    }
  }
  async function regrowth() {
    setScene("REGROWTH");
    show("hint", false);
    $("scene-header").style.opacity = 0;
    renderer.wind = 0.1;
    for (const f of renderer.flowers)
      if (f.common !== undefined) f.targetLean = 0.25;
    caption(C.regrowth[0], 2500);
    if (!(await clock.wait(1600))) return;
    const rose = renderer.flowers.find((f) => f.type === "rose"),
      tulip = renderer.flowers.find((f) => f.type === "tulip");
    renderer.dust(rose.x * renderer.w, rose.y * renderer.h, 12);
    renderer.grow(rose, 0, 4.2);
    renderer.grow(tulip, 0.65, 4.1);
    rose.targetLean = 0.16;
    tulip.targetLean = -0.2;
    if (!(await clock.wait(C.timing.regrowth))) return;
    bouquet();
  }
  async function bouquet() {
    setScene("BOUQUET");
    const stems = [
      ["rose", 0.4, 0.94, 1.24, -0.14],
      ["tulip", 0.55, 0.95, 1.3, 0.15],
      ["rose", 0.48, 0.97, 1.58, -0.02],
      ["tulip", 0.43, 0.96, 1.18, -0.3],
      ["rose", 0.59, 0.97, 1.22, 0.31],
      ["tulip", 0.53, 0.99, 1.57, 0.12],
      ["rose", 0.46, 0.98, 1.02, -0.23],
      ["tulip", 0.62, 0.98, 0.99, 0.29],
      ["rose", 0.36, 0.96, 0.92, -0.34],
    ];
    stems.forEach(([type, x, y, size, lean], i) => {
      const f = renderer.flower(type, x, y, size, {
        color:
          i % 3 === 0 ? "#d2a78f" : type === "rose" ? "#bb7380" : "#dca28a",
        bend: lean,
      });
      renderer.grow(f, i * 0.24, 3.6 + (i % 3) * 0.27);
    });
    renderer.flowers.sort((a, b) => a.y - b.y);
    if (!(await clock.wait(C.timing.bouquet))) return;
    cover();
  }
  async function cover() {
    setScene("CAMERA_COVER");
    renderer.prepareCover();
    const start = clock.time,
      duration = renderer.reduced.matches ? 1400 : C.timing.cover;
    while (clock.time - start < duration) {
      renderer.cover = (clock.time - start) / duration;
      if (!(await clock.wait(30))) return;
    }
    $("veil").style.opacity = 1;
    if (!(await clock.wait(1200))) return;
    darkness();
  }
  async function darkness() {
    setScene("DARKNESS");
    renderer.setActive(false);
    show("scene-header", false);
    if (!(await clock.wait(C.timing.darkPause))) return;
    if (!(await say(C.darkness, 1700))) return;
    if (!(await clock.wait(650))) return;
    setScene("LIGHT_PULL");
    cord.classList.remove("entering", "recoiling", "dragging");
    cordSettled = false;
    show("cord");
    void cord.offsetWidth;
    cord.classList.add("entering");
  }
  const cord = $("cord");
  function cordVisual(pull, x = 0) {
    const tension = clamp(pull / 110),
      sway = 1 - tension;
    $("cord-line").setAttribute(
      "d",
      `M30 0 Q${30 + x * 0.3 * sway} ${90 + pull * 0.42} ${30 + x * 0.2} ${183 + pull}`,
    );
    $("cord-line").style.strokeWidth = `${1.5 + tension * 0.55}px`;
    $("cord-line").style.stroke = `rgb(${147 + tension * 35}, ${153 + tension * 30}, ${140 + tension * 26})`;
    $("cord-handle").setAttribute("transform", `translate(${x * 0.2} ${pull})`);
  }
  function animateCordReturn(pull, x) {
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    const started = performance.now(),
      duration = renderer.reduced.matches ? 330 : 620;
    const frame = (now) => {
      const progress = clamp((now - started) / duration),
        returnScale = renderer.reduced.matches
          ? 1 - ease(progress)
          : Math.exp(-progress * 4.7) * Math.cos(progress * Math.PI * 3.2);
      cordVisual(pull * returnScale, x * returnScale);
      if (progress < 1) cordReturnFrame = requestAnimationFrame(frame);
      else {
        cordReturnFrame = 0;
        cordVisual(0);
      }
    };
    cordReturnFrame = requestAnimationFrame(frame);
  }
  cord.addEventListener("animationend", (event) => {
    if (event.target !== cord) return;
    if (event.animationName.startsWith("cord-drop")) {
      cord.classList.remove("entering");
      cordSettled = true;
    } else if (event.animationName.startsWith("cord-recoil")) {
      cord.classList.remove("recoiling");
      show("cord", false);
    }
  });
  cord.addEventListener("pointerdown", (e) => {
    if (state !== "LIGHT_PULL" || cordFired || !cordSettled) return;
    audio.unlock();
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    cordReturnFrame = 0;
    pointerStart = { y: e.clientY, x: e.clientX, id: e.pointerId, pull: 0, offsetX: 0 };
    cord.setPointerCapture(e.pointerId);
    cord.classList.add("dragging");
  });
  cord.addEventListener("pointermove", (e) => {
    if (!pointerStart || e.pointerId !== pointerStart.id) return;
    const pull = clamp(e.clientY - pointerStart.y, 0, 110);
    pointerStart.pull = pull;
    pointerStart.offsetX = clamp(e.clientX - pointerStart.x, -50, 50);
    cordVisual(pointerStart.pull, pointerStart.offsetX);
    if (pull >= C.interaction.cordThreshold) lightOn();
  });
  function releaseCord() {
    if (!pointerStart) return;
    const { pull, offsetX } = pointerStart;
    pointerStart = null;
    cord.classList.remove("dragging");
    if (!cordFired) animateCordReturn(pull, offsetX);
  }
  cord.addEventListener("pointerup", releaseCord);
  cord.addEventListener("pointercancel", releaseCord);
  cord.addEventListener("lostpointercapture", releaseCord);
  cord.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      state === "LIGHT_PULL" &&
      cordSettled
    ) {
      e.preventDefault();
      audio.unlock();
      lightOn();
    }
  });
  async function lightOn() {
    if (cordFired || state !== "LIGHT_PULL") return;
    cordFired = true;
    pointerStart = null;
    cordSettled = false;
    if (cordReturnFrame) cancelAnimationFrame(cordReturnFrame);
    cordReturnFrame = 0;
    cord.classList.remove("dragging", "entering");
    cordVisual(0);
    cord.classList.add("recoiling");
    audio.note("click");
    setScene("BIG_GARDEN");
    renderer.field();
    renderer.lighting = 0;
    renderer.lightFlash = 1;
    for (const flower of renderer.flowers) {
      if (!flower.background && flower.size > 0.5) {
        flower.impulse = 0.2;
        flower.gust = 0.48;
      }
    }
    renderer.setActive(true);
    $("veil").style.transitionDuration = "1.2s";
    $("veil").style.opacity = 0;
    header(
      "Era só o começo.",
      "algumas coisas não cabem num pequeno jardim.",
      "ESTUDO BOTÂNICO / 002",
    );
    $("scene-header").style.opacity = 0;
    if (!(await clock.wait(260))) return;
    $("scene-header").style.opacity = 1;
    show("field-notes");
    if (!(await say(C.light, 1600))) return;
    setScene("EXPLORATION");
    busy = false;
    bindFlowers(renderer.flowers.filter((f) => f.interactive));
  }
  async function ending() {
    if (state !== "EXPLORATION") return;
    setScene("ENDING");
    show("end", false);
    show("field-notes", false);
    $("scene-header").style.opacity = 0;
    const start = clock.time;
    while (clock.time - start < 2300) {
      const p = clamp((clock.time - start) / 2300);
      renderer.wind = 1 - p;
      renderer.fade = 1 - ease(p);
      if (!(await clock.wait(35))) return;
    }
    $("veil").style.transitionDuration = "1.5s";
    $("veil").style.opacity = 1;
    if (!(await clock.wait(1600))) return;
    renderer.setActive(false);
    if (!(await terminal(C.ending))) return;
    if (!(await clock.wait(850))) return;
    const link = document.createElement("button");
    link.className = "file-link";
    link.textContent = "para_ela.txt";
    link.addEventListener("click", () => {
      if (state !== "ENDING") return;
      setScene("APOLOGY_FILE");
      show("terminal", false);
      $("final-message").textContent = C.apologyText;
      $("file").classList.remove("closing");
      show("file");
      $("file-close").focus({ preventScroll: true });
    });
    $("terminal-lines").append(link);
    link.focus({ preventScroll: true });
  }
  async function closeApologyFile() {
    if (state !== "APOLOGY_FILE" || busy) return;
    busy = true;
    $("file").classList.add("closing");
    if (!(await clock.wait(C.timing.fileClose))) return;
    show("file", false);
    show("sound", false);
    $("file").classList.remove("closing");
    setScene("FAKE_SHUTDOWN");
    if (!(await terminal(C.shutdown))) return;
    if (!(await clock.wait(C.timing.shutdownPause))) return;
    setScene("CRT_SHUTDOWN");
    const screen = $("screen-layer"), crt = $("crt-effect");
    screen.classList.remove("crt-shutdown");
    show("crt-effect");
    crt.classList.remove("active");
    void screen.offsetWidth;
    screen.classList.add("crt-shutdown");
    crt.classList.add("active");
    if (!(await clock.wait(renderer.reduced.matches ? C.timing.crtReduced : C.timing.crt))) return;
    show("crt-effect", false);
    show("screen-layer", false);
    setScene("BLACK_SCREEN");
    $("experience").classList.add("epilogue-mode");
    show("epilogue");
    if (!(await clock.wait(C.timing.blackPause))) return;
    setScene("HESITATION");
    const hesitation = $("hesitation");
    hesitation.textContent = "";
    for (const dots of [".", "..", "..."]) {
      hesitation.textContent = dots;
      if (!(await clock.wait(C.timing.hesitationStep))) return;
    }
    if (!(await clock.wait(C.timing.hesitationPause))) return;
    for (const dots of ["..", ".", ""]) {
      hesitation.textContent = dots;
      if (!(await clock.wait(C.timing.hesitationStep))) return;
    }
    if (!(await clock.wait(380))) return;
    setScene("LILY_GROWTH");
    $("epilogue").classList.add("lily-growing");
    if (
      !(await clock.wait(
        renderer.reduced.matches
          ? C.timing.lilyGrowthReduced
          : C.timing.lilyGrowth,
      ))
    )
      return;
    setScene("HIDDEN_FOLDER");
    $("epilogue").classList.add("folder-ready");
    show("hidden-folder");
    folderReleased = false;
    folderContentsOpen = false;
    folderReleaseBusy = false;
  }
  async function releaseFolder() {
    if (state !== "HIDDEN_FOLDER" || folderReleased || folderReleaseBusy) return;
    folderReleaseBusy = true;
    setScene("FOLDER_OPENING");
    $("epilogue").classList.add("roots-releasing");
    if (
      !(await clock.wait(
        renderer.reduced.matches ? C.timing.rootRelease * 0.55 : C.timing.rootRelease,
      ))
    )
      return;
    $("epilogue").classList.add("folder-loose", "folder-open");
    if (!(await clock.wait(C.timing.folderSettle))) return;
    folderReleased = true;
    folderContentsOpen = true;
    $("hidden-folder").setAttribute("aria-expanded", "true");
    show("folder-contents");
    setScene("HIDDEN_FOLDER");
    folderReleaseBusy = false;
  }
  $("file-close").addEventListener("click", closeApologyFile);
  $("hidden-folder").addEventListener("click", () => {
    if (state !== "HIDDEN_FOLDER") return;
    if (!folderReleased) {
      releaseFolder();
      return;
    }
    folderContentsOpen = !folderContentsOpen;
    $("hidden-folder").setAttribute("aria-expanded", String(folderContentsOpen));
    $("epilogue").classList.toggle("folder-open", folderContentsOpen);
    show("folder-contents", folderContentsOpen);
  });
  $("open-declaration").addEventListener("click", () => {
    if (state !== "HIDDEN_FOLDER" || !folderReleased || !folderContentsOpen) return;
    folderContentsOpen = false;
    show("folder-contents", false);
    $("hidden-folder").setAttribute("aria-expanded", "false");
    $("epilogue").classList.remove("folder-open");
    setScene("DECLARATION_FILE");
    $("declaration-message").textContent = C.declarationText;
    $("declaration-file").classList.remove("closing");
    show("declaration-file");
    $("declaration-scroll").focus({ preventScroll: true });
  });
  $("declaration-close").addEventListener("click", async () => {
    if (state !== "DECLARATION_FILE") return;
    $("declaration-file").classList.add("closing");
    if (!(await clock.wait(C.timing.fileClose))) return;
    show("declaration-file", false);
    $("declaration-file").classList.remove("closing");
    show("hidden-folder", false);
    show("folder-contents", false);
    $("epilogue").classList.add("final-rest");
    setScene("FINAL_END");
  });
  $("end").addEventListener("click", ending);
  $("sound").addEventListener("click", () => {
    const on = audio.toggle();
    $("sound").setAttribute("aria-pressed", String(on));
    $("sound").setAttribute("aria-label", on ? "Desativar som" : "Ativar som");
    $("sound").querySelector("span").textContent = on
      ? "som ligado"
      : "som desligado";
    $("sound-waves").setAttribute(
      "d",
      on ? "M17 8q5 4 0 8m2-11q8 7 0 14" : "m17 9 5 6m0-6-5 6",
    );
  });
  addEventListener(
    "pointermove",
    (e) => {
      renderer.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      renderer.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  document.addEventListener("pointerdown", () => audio.unlock(), {
    once: true,
  });
  // Interface somente de leitura para inspeção e testes; não altera a narrativa.
  window.gardenExperience = {
    get state() {
      return state;
    },
    get stats() {
      return {
        tulipAttempts,
        commonTouched: commonTouched.size,
        specialGone: specialGone.size,
        secrets: found.size,
        flowers: renderer.flowers.length,
        particles: renderer.particles.length,
        cordFired,
        folderReleased,
      };
    },
  };
  boot();
})();
