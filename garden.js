/* Renderização procedural. Coordenadas proporcionais preservam o enquadramento. */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
class GardenRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.flowers = [];
    this.particles = [];
    this.time = 0;
    this.last = 0;
    this.mode = "small";
    this.wind = 1;
    this.cover = 0;
    this.foregroundPlants = [];
    this.lighting = 1;
    this.lightFlash = 0;
    this.fade = 1;
    this.pointer = { x: 0, y: 0 };
    this.parallax = { x: 0, y: 0 };
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this.random = seeded(728);
    this.onFrame = null;
    this.active = true;
    this.resize = () => {
      this.w = innerWidth;
      this.h = innerHeight;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(this.w * this.dpr);
      canvas.height = Math.round(this.h * this.dpr);
      canvas.style.width = this.w + "px";
      canvas.style.height = this.h + "px";
      this.makeBackdrop();
      this.cacheDistant();
      this.draw();
    };
    addEventListener("resize", this.resize);
    this.reduced.addEventListener("change", () => this.draw());
    this.resize();
    document.addEventListener("visibilitychange", () => {
      this.last = 0;
      if (!document.hidden && this.active) this.requestFrame();
    });
    this.requestFrame();
  }
  requestFrame() {
    if (this.raf) return;
    this.raf = requestAnimationFrame((t) => {
      this.raf = null;
      this.frame(t);
    });
  }
  setActive(value) {
    this.active = value;
    this.last = 0;
    if (value) this.requestFrame();
    else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }
  frame(t) {
    if (document.hidden || !this.active) return;
    const dt = this.last ? Math.min((t - this.last) / 1000, 0.05) : 0;
    this.last = t;
    this.time += dt;
    this.parallax.x += (this.pointer.x - this.parallax.x) * 0.035;
    this.parallax.y += (this.pointer.y - this.parallax.y) * 0.035;
    this.update(dt);
    this.draw();
    this.onFrame?.();
    this.requestFrame();
  }
  flower(type, x, y, size, opts = {}) {
    const f = {
      id: "f" + this.flowers.length,
      type,
      x,
      y,
      size,
      color: type === "rose" ? "#b86468" : "#e1a38a",
      phase: this.random() * 6.28,
      bend: (this.random() - 0.5) * 0.2,
      growth: 1,
      bloom: 1,
      visible: 1,
      sink: 0,
      lean: 0,
      impulse: 0,
      closed: 0,
      gust: 0,
      born: null,
      interactive: false,
      hits: 0,
      ...opts,
    };
    this.flowers.push(f);
    return f;
  }
  small() {
    this.mode = "small";
    this.flowers = [];
    this.cover = 0;
    this.foregroundPlants = [];
    this.lighting = 1;
    this.lightFlash = 0;
    this.fade = 1;
    this.wind = 1;
    this.makeBackdrop();
    const spec = [
      ["daisy", 0.12, 0.87, 0.72, { color: "#e1d6ac", common: 0 }],
      ["rose", 0.32, 0.88, 1.04, {}],
      ["blue", 0.51, 0.89, 0.69, { color: "#8d9ea5", common: 1 }],
      ["tulip", 0.69, 0.88, 0.95, {}],
      ["daisy", 0.89, 0.88, 0.78, { color: "#cbaa79", common: 2 }],
    ];
    return spec.map(([type, x, y, s, o]) =>
      this.flower(type, x, y, s, { ...o, interactive: true }),
    );
  }
  field() {
    this.mode = "field";
    this.flowers = [];
    this.cover = 0;
    this.foregroundPlants = [];
    this.lighting = 1;
    this.lightFlash = 0;
    this.fade = 1;
    this.wind = 0.8;
    this.makeBackdrop();
    let rand = seeded(87);
    for (let i = 0; i < 170; i++) {
      const depth = Math.pow(rand(), 1.35);
      const layer = depth < 0.2 ? "far" : depth < 0.62 ? "distant" : "middle";
      this.flower(
        rand() > 0.43 ? "rose" : "tulip",
        rand() * 1.16 - 0.08,
        0.49 + depth * 0.42,
        0.026 + Math.pow(depth, 1.55) * 0.48,
        {
          color:
            layer === "far"
              ? i % 2 === 0
                ? "#c8c4a7"
                : "#c5a99a"
              : i % 4 === 0
                ? "#d9c4a1"
                : i % 3 === 0
                  ? "#e4a287"
                  : "#ae626c",
          depth,
          layer,
          background: true,
        },
      );
    }
    // Distribuição estratificada: todos os segredos são alcançáveis em telas de 320px.
    const slots = [
      [0.12, 0.64, 0.39],
      [0.38, 0.65, 0.42],
      [0.64, 0.64, 0.4],
      [0.87, 0.65, 0.43],
      [0.24, 0.73, 0.55],
      [0.5, 0.74, 0.6],
      [0.77, 0.74, 0.54],
      [0.08, 0.83, 0.72],
      [0.37, 0.85, 0.83],
      [0.65, 0.84, 0.74],
      [0.91, 0.84, 0.78],
      [0.18, 0.98, 1.08],
      [0.51, 1.01, 1.19],
      [0.83, 1, 1.14],
    ];
    const main = slots.map(([x, y, s], i) =>
      this.flower(i % 3 === 0 ? "rose" : "tulip", x, y, s, {
        interactive: true,
        color: i % 4 === 0 ? "#d4b692" : i % 3 === 0 ? "#b86371" : "#da9b87",
        secret: i === 1 ? 0 : i === 6 ? 1 : i === 11 ? 2 : null,
      }),
    );
    this.flowers.sort((a, b) => a.y - b.y);
    this.cacheDistant();
    return main;
  }
  cacheDistant() {
    this.distant = null;
    if (this.mode !== "field") return;
    const layer = document.createElement("canvas");
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const original = this.ctx;
    this.ctx = layer.getContext("2d");
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const f of this.flowers.filter((flower) => flower.background).sort((a, b) => a.y - b.y))
      this.drawFlower(f);
    this.ctx = original;
    this.distant = layer;
  }
  prepareCover() {
    this.foregroundPlants = [
      {
        x: 0.12,
        y: 1.06,
        length: 0.7,
        delay: 0.1,
        duration: 0.48,
        lean: -0.48,
        curve: -0.22,
        width: 3.5,
        type: "tulip",
        color: "#c27679",
        leaves: [{ t: 0.42, side: 1, scale: 0.19 }, { t: 0.72, side: -1, scale: 0.17 }],
      },
      {
        x: 0.9,
        y: 1.08,
        length: 0.72,
        delay: 0.24,
        duration: 0.48,
        lean: 0.46,
        curve: 0.2,
        width: 4,
        type: "rose",
        color: "#bd6d77",
        leaves: [{ t: 0.36, side: -1, scale: 0.2 }, { t: 0.69, side: 1, scale: 0.18 }],
      },
      {
        x: 0.29,
        y: 1.12,
        length: 0.86,
        delay: 0.46,
        duration: 0.42,
        lean: -0.3,
        curve: -0.13,
        width: 9,
        near: true,
        type: "rose",
        color: "#b15d70",
        leaves: [{ t: 0.3, side: 1, scale: 0.2 }, { t: 0.56, side: -1, scale: 0.22 }, { t: 0.8, side: 1, scale: 0.19 }],
      },
      {
        x: 0.72,
        y: 1.1,
        length: 0.82,
        delay: 0.62,
        duration: 0.34,
        lean: 0.34,
        curve: 0.16,
        width: 10,
        near: true,
        type: "tulip",
        color: "#d08b7f",
        leaves: [{ t: 0.33, side: -1, scale: 0.2 }, { t: 0.61, side: 1, scale: 0.21 }],
      },
    ];
  }
  grow(f, delay = 0, duration = 3.7) {
    f.sink = 0;
    f.visible = 1;
    f.growth = 0;
    f.bloom = 0;
    f.born = this.time + delay;
    f.duration = duration;
    f.retract = false;
  }
  sink(f) {
    f.retract = true;
    f.impulse = 1.1;
    this.dust(f.x * this.w, f.y * this.h, 10);
  }
  burst(f, n = 8) {
    const p = this.position(f);
    for (
      let i = 0;
      i < n && this.particles.length < GARDEN_CONFIG.interaction.maxPetals;
      i++
    )
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: (this.random() - 0.5) * 95,
        vy: -20 - this.random() * 70,
        life: 2 + this.random() * 2,
        age: 0,
        size: 3 + this.random() * 5,
        color: f.color,
        rotation: this.random() * 6,
      });
  }
  dust(x, y, n) {
    for (let i = 0; i < n && this.particles.length < 44; i++)
      this.particles.push({
        x,
        y,
        vx: (this.random() - 0.5) * 60,
        vy: -20 - this.random() * 30,
        life: 0.5 + this.random() * 0.8,
        age: 0,
        size: 1 + this.random() * 2,
        color: "#b5ab7a",
        rotation: 0,
      });
  }
  update(dt) {
    if (this.mode === "field" && this.lighting < 1) {
      this.lighting = clamp(this.lighting + dt / 1.2);
      this.lightFlash *= Math.exp(-dt / 0.075);
    }
    for (const f of this.flowers) {
      f.impulse *= Math.exp(-dt * 3);
      f.gust *= Math.exp(-dt * 1.8);
      f.lean += ((f.targetLean || 0) - f.lean) * Math.min(1, dt * 9);
      if (f.retract) {
        f.sink = clamp(f.sink + dt * 2.6);
        if (f.sink === 1) f.visible = 0;
      }
      if (f.born !== null) {
        const p = (this.time - f.born) / f.duration;
        f.growth = ease(p / 0.75);
        f.bloom = ease((p - 0.5) / 0.5);
        if (p >= 1) f.born = null;
      }
      if (f.closed > 0) f.closed = Math.max(0, f.closed - dt * 0.19);
    }
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 18 * dt;
      p.rotation += dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }
  unit() {
    return Math.min(this.h * 0.295, this.w * 0.45, 240);
  }
  position(f) {
    const length = this.unit() * f.size;
    const sway = this.reduced.matches
      ? 0
      : Math.sin(this.time * 0.75 + f.phase) * 0.027 * this.wind;
    const lean =
      f.bend +
      sway +
      f.lean +
      (this.reduced.matches ? 0 : Math.sin(this.time * 4 + f.phase) * f.gust * 0.12) +
      (this.reduced.matches
        ? 0
        : Math.sin(this.time * 13 + f.phase) * f.impulse * 0.15);
    const px = this.reduced.matches ? 0 : this.parallax.x * (0.5 + f.size * 5.5);
    const baseX = f.x * this.w + px,
      baseY = f.y * this.h;
    const g = f.growth * (1 - f.sink);
    return {
      x: baseX + Math.sin(lean) * length * g,
      y: baseY - Math.cos(lean) * length * g,
      baseX,
      baseY,
      length,
      lean,
      g,
    };
  }
  makeBackdrop() {
    if (!this.w) return;
    const b = document.createElement("canvas");
    b.width = Math.round(this.w * this.dpr);
    b.height = Math.round(this.h * this.dpr);
    const c = b.getContext("2d");
    c.scale(this.dpr, this.dpr);
    const w = this.w,
      h = this.h,
      big = this.mode === "field",
      horizon = big ? 0.47 : 0.63;
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, big ? "#263c3a" : "#132e2c");
    g.addColorStop(horizon * 0.7, big ? "#71897a" : "#456052");
    g.addColorStop(horizon, big ? "#b6b69a" : "#929e7b");
    g.addColorStop(horizon + 0.12, "#405a42");
    g.addColorStop(1, "#0d2420");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    let glow = c.createRadialGradient(
      w * 0.77,
      h * 0.32,
      0,
      w * 0.77,
      h * 0.32,
      w * 0.63,
    );
    glow.addColorStop(0, "#f3d49c3a");
    glow.addColorStop(1, "#eed7aa00");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ead7ac";
    c.globalAlpha = 0.55;
    c.beginPath();
    c.arc(w * 0.78, h * 0.33, big ? 23 : 17, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    const rand = seeded(59);
    for (let layer = 0; layer < 4; layer++) {
      c.fillStyle = ["#758873", "#657d66", "#47694f", "#2a4b3b"][layer];
      c.globalAlpha = 0.4 + layer * 0.13;
      c.beginPath();
      c.moveTo(0, h);
      for (let x = 0; x <= w + 15; x += 15) {
        c.lineTo(
          x,
          h * (horizon + 0.013 + layer * 0.046) +
            Math.sin((x / w) * 8 + layer) * h * 0.018 +
            rand() * 4,
        );
      }
      c.lineTo(w, h);
      c.fill();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 520; i++) {
      const x = rand() * w,
        y = h * (horizon + 0.11) + rand() * h * (1 - horizon - 0.11),
        depth = (y / h - horizon) / (1 - horizon),
        height = (3 + rand() * 18) * depth;
      c.strokeStyle = i % 3 ? "#66816444" : "#a1a47535";
      c.lineWidth = 0.5 + depth * 0.7;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x - 2,
        y - height * 0.5,
        x + (rand() - 0.5) * 13,
        y - height,
      );
      c.stroke();
    }
    // Une terre ovale et discrète ancre le petit jardin au sol.
    if (!big) {
      let earth = c.createRadialGradient(
        w * 0.5,
        h * 0.887,
        0,
        w * 0.5,
        h * 0.887,
        w * 0.55,
      );
      earth.addColorStop(0, "#1e2a1dcc");
      earth.addColorStop(1, "#18251c00");
      c.save();
      c.translate(w * 0.5, h * 0.887);
      c.scale(1, 0.17);
      c.fillStyle = earth;
      c.restore();
      c.fillStyle = "#172b2180";
      c.beginPath();
      c.ellipse(w * 0.5, h * 0.892, w * 0.49, h * 0.048, 0, 0, Math.PI * 2);
      c.fill();
    }
    this.backdrop = b;
  }
  leaf(c, x, y, size, side, open, foreground = false) {
    if (open <= 0) return;
    c.save();
    c.translate(x, y);
    c.scale(side * open, open);
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(
      size * 0.2,
      -size * 0.58,
      size * 0.8,
      -size * 0.64,
      size,
      -size * 0.63,
    );
    c.bezierCurveTo(size * 0.92, -size * 0.12, size * 0.42, size * 0.15, 0, 0);
    let g = c.createLinearGradient(0, 0, size, -size);
    g.addColorStop(0, foreground ? "#17382f" : "#315e43");
    g.addColorStop(1, foreground ? "#4c6b48" : "#91a66b");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = "#b7bf7844";
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(size * 0.5, -size * 0.3, size * 0.9, -size * 0.57);
    c.stroke();
    c.restore();
  }
  head(c, f, r, bloom) {
    const opening = clamp(bloom * (1 - f.closed));
    c.save();
    c.rotate(Math.sin(f.phase) * 0.17);
    if (f.type === "tulip") {
      for (let i = 0; i < 5; i++) {
        const side = (i - 2) / 2,
          spread = 0.22 + opening * 0.78;
        c.save();
        c.rotate(side * 0.38 * spread);
        c.beginPath();
        c.moveTo(0, r * 0.36);
        c.bezierCurveTo(
          -r * (0.28 + spread * 0.25),
          r * 0.12,
          -r * (0.45 + spread * 0.3),
          -r * 0.64,
          side * r * 0.25 - r * 0.23,
          -r * (0.9 + Math.abs(side) * 0.17),
        );
        c.quadraticCurveTo(
          side * r * 0.17,
          -r * (0.7 - opening * 0.11),
          r * 0.25 + side * r * 0.17,
          -r * (0.9 + Math.abs(side) * 0.17),
        );
        c.bezierCurveTo(
          r * (0.55 + spread * 0.2),
          -r * 0.55,
          r * 0.49,
          r * 0.15,
          0,
          r * 0.36,
        );
        const g = c.createLinearGradient(-r, -r, r, r * 0.3);
        g.addColorStop(0, "#edc6a5");
        g.addColorStop(0.4, f.color);
        g.addColorStop(1, "#814755");
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = "#f6d5b333";
        c.lineWidth = 0.65;
        c.stroke();
        c.restore();
      }
    } else if (f.type === "rose") {
      for (let ring = 0; ring < 3; ring++) {
        const count = ring === 2 ? 5 : 7;
        const radius = r * (1 - ring * 0.27) * (0.3 + opening * 0.7);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + ring * 0.68;
          c.save();
          c.rotate(a);
          c.beginPath();
          c.moveTo(-radius * 0.42, radius * 0.09);
          c.bezierCurveTo(
            -radius * 0.97,
            -radius * 0.1,
            -radius * 0.89,
            -radius * 0.96,
            -radius * 0.2,
            -radius * 0.9,
          );
          c.bezierCurveTo(
            radius * 0.38,
            -radius * 1.06,
            radius * 0.88,
            -radius * 0.53,
            radius * 0.46,
            -radius * 0.08,
          );
          c.quadraticCurveTo(0, radius * 0.31, -radius * 0.42, radius * 0.09);
          let g = c.createLinearGradient(0, -radius, 0, radius * 0.2);
          g.addColorStop(0, ring === 2 ? "#e6a18d" : "#d99890");
          g.addColorStop(0.35, f.color);
          g.addColorStop(1, "#683c4d");
          c.fillStyle = g;
          c.fill();
          c.strokeStyle = "#f6bdac24";
          c.lineWidth = 0.5;
          c.stroke();
          c.restore();
        }
      }
      c.fillStyle = "#723e50";
      c.beginPath();
      c.ellipse(0, 0, r * 0.12, r * 0.09, 0.5, 0, 7);
      c.fill();
    } else {
      for (let i = 0; i < 9; i++) {
        c.save();
        c.rotate((i * Math.PI * 2) / 9);
        c.fillStyle = f.color;
        c.beginPath();
        c.ellipse(0, -r * 0.56, r * 0.22, r * 0.57 * opening, 0, 0, 7);
        c.fill();
        c.restore();
      }
      c.fillStyle = "#bea76c";
      c.beginPath();
      c.arc(0, 0, r * 0.25, 0, 7);
      c.fill();
      c.fillStyle = "#564b31";
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.arc(
          Math.sin(i * 2) * r * 0.14,
          Math.cos(i * 2) * r * 0.14,
          r * 0.025,
          0,
          7,
        );
        c.fill();
      }
    }
    c.restore();
  }
  drawFlower(f, override) {
    if (f.visible <= 0 || f.growth <= 0) return;
    const c = this.ctx,
      p = this.position(f),
      r = Math.max(2, p.length * (f.type === "rose" ? 0.157 : 0.15));
    c.save();
    c.globalAlpha = f.visible * this.fade;
    if (f.background) c.globalAlpha *= 0.2 + f.depth * 0.58;
    c.translate(p.baseX, p.baseY);
    if (override) {
      c.translate(override.x, override.y);
      c.scale(override.scale, override.scale);
      c.rotate(override.rotate);
    }
    c.rotate(p.lean);
    const len = p.length * p.g;
    // Le chemin du caule est révélé en longueur, les feuilles et pétales suivent.
    c.strokeStyle = f.background ? "#56764e" : "#749563";
    c.lineWidth = Math.max(1, 2.8 * f.size);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(
      -p.length * 0.08,
      -len * 0.32,
      p.length * 0.05,
      -len * 0.78,
      0,
      -len,
    );
    c.stroke();
    if (!f.background || f.size > 0.23) {
      this.leaf(
        c,
        -p.length * 0.018,
        -len * 0.36,
        p.length * 0.3,
        -1,
        ease((p.g - 0.27) * 3),
      );
      this.leaf(c, 0, -len * 0.6, p.length * 0.25, 1, ease((p.g - 0.5) * 3));
    }
    c.translate(0, -len);
    if (f.bloom < 0.25) {
      c.fillStyle = "#779862";
      c.beginPath();
      c.ellipse(0, -r * 0.2, r * 0.23, r * 0.52, 0, 0, 7);
      c.fill();
    }
    if (f.bloom > 0) this.head(c, f, r, f.bloom);
    c.restore();
  }
  drawCoverPlant(plant, index) {
    const growth = ease((this.cover - plant.delay) / plant.duration);
    if (growth <= 0.005) return;
    const c = this.ctx,
      length = Math.max(this.h, this.w * 0.82) * plant.length * growth,
      baseX = plant.x * this.w,
      baseY = plant.y * this.h,
      sway = this.reduced.matches
        ? 0
        : Math.sin(this.time * 0.7 + index * 1.7) * 0.025,
      lean = plant.lean + sway,
      curve = plant.curve * length,
      tipX = baseX + Math.sin(lean) * length + curve * 0.22,
      tipY = baseY - Math.cos(lean) * length,
      control1 = { x: baseX + (tipX - baseX) * 0.2 + curve * 0.12, y: baseY - length * 0.31 },
      control2 = { x: baseX + (tipX - baseX) * 0.82 + curve * 0.08, y: baseY - length * 0.77 },
      point = (t) => {
        const u = 1 - t;
        return {
          x: u ** 3 * baseX + 3 * u ** 2 * t * control1.x + 3 * u * t ** 2 * control2.x + t ** 3 * tipX,
          y: u ** 3 * baseY + 3 * u ** 2 * t * control1.y + 3 * u * t ** 2 * control2.y + t ** 3 * tipY,
        };
      };
    c.save();
    c.lineCap = "round";
    c.lineWidth = plant.width * (0.42 + growth * 0.58);
    c.strokeStyle = plant.near ? "#41664a" : "#68865c";
    c.beginPath();
    c.moveTo(baseX, baseY);
    c.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, tipX, tipY);
    c.stroke();
    for (const leaf of plant.leaves) {
      const open = ease((growth - leaf.t * 0.48) / 0.28);
      if (!open) continue;
      const at = point(leaf.t);
      c.save();
      c.translate(at.x, at.y);
      c.rotate(lean * 0.58 + leaf.side * 0.48);
      this.leaf(c, 0, 0, Math.max(18, length * leaf.scale), leaf.side, open, true);
      c.restore();
    }
    if (growth > 0.49) {
      c.save();
      c.translate(tipX, tipY);
      c.rotate(lean);
      const radius = Math.max(5, length * (plant.near ? 0.145 : 0.12));
      if (growth < 0.66) {
        c.fillStyle = "#728e5a";
        c.beginPath();
        c.ellipse(0, -radius * 0.18, radius * 0.34, radius * 0.62, 0, 0, Math.PI * 2);
        c.fill();
      }
      const bloom = ease((growth - 0.53) / 0.42);
      if (bloom > 0) {
        this.head(c, { type: plant.type, color: plant.color, phase: index * 1.4, closed: 0 }, radius, bloom);
      }
      c.restore();
    }
    c.restore();
  }
  drawCoverOcclusion() {
    const c = this.ctx,
      reduced = this.reduced.matches,
      progress = reduced ? 1 : ease((this.cover - 0.88) / 0.12),
      alpha = reduced ? ease(this.cover) : 1;
    if (progress <= 0 || alpha <= 0) return;
    const extent = Math.max(this.w, this.h),
      centerX = this.w * 0.53,
      centerY = this.h * 0.52,
      length = extent * (0.08 + progress * 1.42),
      halfWidth = extent * (0.035 + progress * 0.64),
      colors = ["#9d5967", "#b76c73", "#824657", "#c27a79", "#713b50"];
    c.save();
    c.globalAlpha = alpha;
    for (let i = 0; i < 5; i++) {
      c.save();
      c.translate(centerX, centerY);
      c.rotate((i * Math.PI * 2) / 5 - 0.36 + progress * 0.08);
      const gradient = c.createLinearGradient(0, -halfWidth, length, 0);
      gradient.addColorStop(0, "#61384b");
      gradient.addColorStop(0.42, colors[i]);
      gradient.addColorStop(1, "#492b3c");
      c.fillStyle = gradient;
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(length * 0.12, -halfWidth * 0.72, length * 0.48, -halfWidth * 1.08, length * 0.78, -halfWidth * 0.62);
      c.quadraticCurveTo(length, 0, length * 0.78, halfWidth * 0.62);
      c.bezierCurveTo(length * 0.46, halfWidth * 1.06, length * 0.13, halfWidth * 0.7, 0, 0);
      c.fill();
      c.strokeStyle = "#f0b4a32b";
      c.lineWidth = Math.max(1, extent * 0.002);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(length * 0.4, 0, length * 0.9, 0);
      c.stroke();
      c.restore();
    }
    c.restore();
  }
  drawFieldForeground() {
    const c = this.ctx,
      plants = [
        { x: -0.04, lean: 0.26, size: 0.2, phase: 0.4 },
        { x: 0.08, lean: -0.22, size: 0.15, phase: 1.8 },
        { x: 0.96, lean: 0.24, size: 0.18, phase: 2.7 },
        { x: 1.04, lean: -0.28, size: 0.22, phase: 4.2 },
      ];
    for (const plant of plants) {
      const length = this.h * plant.size,
        baseX = plant.x * this.w,
        baseY = this.h + 22,
        lean = plant.lean + (this.reduced.matches ? 0 : Math.sin(this.time * 0.7 + plant.phase) * 0.025),
        tipX = baseX + Math.sin(lean) * length,
        tipY = baseY - Math.cos(lean) * length;
      c.save();
      c.lineCap = "round";
      c.strokeStyle = "#18392f";
      c.lineWidth = Math.max(3, this.w * 0.009);
      c.beginPath();
      c.moveTo(baseX, baseY);
      c.quadraticCurveTo(baseX + (tipX - baseX) * 0.28 - lean * length * 0.12, baseY - length * 0.55, tipX, tipY);
      c.stroke();
      for (const [t, side, scale] of [[0.34, -1, 0.62], [0.63, 1, 0.74], [0.84, -1, 0.58]]) {
        const x = baseX + (tipX - baseX) * t,
          y = baseY + (tipY - baseY) * t;
        c.save();
        c.translate(x, y);
        c.rotate(lean * 0.6 + side * 0.64);
        this.leaf(c, 0, 0, length * scale, side, 1, true);
        c.restore();
      }
      c.restore();
    }
  }
  draw() {
    if (!this.backdrop) return;
    const c = this.ctx,
      w = this.w,
      h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.drawImage(this.backdrop, 0, 0, w, h);
    if (this.distant) {
      c.globalAlpha = this.fade;
      const distantShift = this.mode === "field" && !this.reduced.matches ? this.parallax.x * 1.15 : 0;
      c.drawImage(this.distant, distantShift, 0, w, h);
      c.globalAlpha = 1;
    }
    if (this.mode === "field") {
      const haze = c.createLinearGradient(0, h * 0.44, 0, h * 0.68);
      haze.addColorStop(0, "#d8d2b000");
      haze.addColorStop(0.45, "#d8d2b018");
      haze.addColorStop(1, "#d8d2b000");
      c.fillStyle = haze;
      c.fillRect(0, h * 0.44, w, h * 0.24);
    }
    for (const f of this.flowers) if (!f.background) this.drawFlower(f);
    if (this.mode === "field") this.drawFieldForeground();
    if (!this.reduced.matches) {
      for (let i = 0; i < 18; i++) {
        const x = ((i * 137.1 + this.time * (2 + (i % 3))) % (w + 30)) - 15,
          y = h * (0.4 + (i % 7) * 0.074) + Math.sin(this.time * 0.25 + i) * 12;
        c.globalAlpha =
          (0.13 + Math.sin(this.time * 0.7 + i) * 0.1) * this.fade;
        c.fillStyle = "#ede0ad";
        c.beginPath();
        c.arc(x, y, i % 3 === 0 ? 1.4 : 0.7, 0, 7);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    for (const p of this.particles) {
      c.save();
      c.globalAlpha = (1 - p.age / p.life) * this.fade;
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.fillStyle = p.color;
      c.beginPath();
      c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, 7);
      c.fill();
      c.restore();
    }
    // Silhouettes au premier plan, hors champ, pour un point de vue frontal.
    c.strokeStyle = "#112f28";
    c.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      const x = (i / 19) * w,
        wind = this.reduced.matches
          ? 0
          : Math.sin(this.time * 0.65 + i) * 6 * this.wind;
      c.beginPath();
      c.moveTo(x, h + 5);
      c.quadraticCurveTo(x - 12, h - 24, x - 19 + wind, h - (25 + (i % 5) * 9));
      c.stroke();
    }
    if (this.cover > 0) {
      if (!this.reduced.matches)
        this.foregroundPlants.forEach((plant, index) => this.drawCoverPlant(plant, index));
      this.drawCoverOcclusion();
    }
    if (this.mode === "field" && this.lighting < 1) {
      const reveal = ease(this.lighting),
        spread = ease((this.lighting - 0.08) / 0.92),
        darkness = 0.96 * (1 - reveal),
        lightX = w * 0.76,
        lightY = h * 0.13,
        glowRadius = Math.max(w, h) * (0.08 + spread * 0.92),
        glowPower = 0.055 + reveal * 0.19 + this.lightFlash * 0.12;
      c.save();
      c.globalAlpha = darkness;
      c.fillStyle = "#050a08";
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "screen";
      const glow = c.createRadialGradient(lightX, lightY, 0, lightX, lightY, glowRadius);
      glow.addColorStop(0, `rgba(255, 220, 158, ${glowPower})`);
      glow.addColorStop(0.28, `rgba(231, 177, 103, ${glowPower * 0.62})`);
      glow.addColorStop(1, "rgba(224, 175, 112, 0)");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
      const bloomRadius = Math.max(w, h) * (0.018 + spread * 0.24),
        bloom = c.createRadialGradient(lightX, lightY, 0, lightX, lightY, bloomRadius);
      bloom.addColorStop(0, `rgba(255, 231, 182, ${0.035 + this.lightFlash * 0.045})`);
      bloom.addColorStop(1, "rgba(255, 231, 182, 0)");
      c.fillStyle = bloom;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "source-over";
      c.restore();
    }
    let vignette = c.createRadialGradient(
      w * 0.5,
      h * 0.45,
      h * 0.2,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.8,
    );
    vignette.addColorStop(0, "#06161300");
    vignette.addColorStop(1, "#06161399");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
  }
}
