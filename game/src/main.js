// Ember & Thyme — entry point: fixed-step loop, screens, sound, shots.
// Play at http://localhost:8080 (node serve.ts) with ?seed=N for a fixed
// game, or ?shot=start|play|end&seed=1 for a staged screenshot scene.
import { FIELD, STEP, BEST_KEY } from "./config.js";
import { createWorld, step, startDay, takeEvents } from "./world.js";
import { render } from "./render.js";
import { handleClick, handleKey, toLogical } from "./input.js";
import { stageShot } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const params = new URLSearchParams(location.search);
const seed = Number(params.get("seed") ?? Date.now() % 100000) || 1;
const shot = params.get("shot");

const world = createWorld(seed);
world.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;

if (shot) stageShot(world, shot);

// --- tiny synthesised sounds (WebAudio, no audio files) --------------------
let audio = null;
function blip(freq, ms, kind = "sine", gain = 0.08) {
  if (world.muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = kind;
    osc.frequency.value = freq;
    amp.gain.value = gain;
    osc.connect(amp).connect(audio.destination);
    osc.start();
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
    osc.stop(audio.currentTime + ms / 1000);
  } catch {
    // Sound is garnish: a browser without audio still plays fine.
  }
}

const SOUNDS = {
  pickup: () => blip(520, 70, "sine"),
  add: () => blip(660, 70, "triangle"),
  dish: () => {
    blip(660, 80, "triangle");
    setTimeout(() => blip(880, 90, "triangle"), 80);
  },
  cookDone: () => blip(980, 160, "sine", 0.1),
  serve: () => {
    blip(784, 90, "triangle");
    setTimeout(() => blip(1046, 140, "triangle"), 90);
  },
  wrong: () => blip(160, 200, "sawtooth", 0.06),
  expire: () => blip(220, 180, "sawtooth", 0.05),
  start: () => blip(440, 120, "triangle", 0.09),
};

function announce(events) {
  for (const ev of events) {
    const play = SOUNDS[ev.type];
    if (play) play();
    if (ev.type === "serve") {
      statusEl.textContent = `Served ${ev.dish} for ${ev.points} points. Score ${world.score}.`;
    } else if (ev.type === "expire") {
      statusEl.textContent = `A ${ev.dish} order walked away.`;
    } else if (ev.type === "dayOver") {
      statusEl.textContent = `Day over. Final score ${ev.score}.`;
    } else if (ev.type === "cookDone") {
      statusEl.textContent = "A dish finished on the hearth and is ready to serve.";
    }
  }
  if (world.screen === "over" && world.score > world.best) {
    world.best = world.score;
    localStorage.setItem(BEST_KEY, String(world.best));
  }
}

// --- input ------------------------------------------------------------------
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  // Keep the logical field fitted: scale by the smaller axis ratio.
  const sx = canvas.width / FIELD.width;
  const sy = canvas.height / FIELD.height;
  const s = Math.min(sx, sy);
  const ox = (canvas.width - FIELD.width * s) / 2;
  const oy = (canvas.height - FIELD.height * s) / 2;
  ctx.setTransform(s, 0, 0, s, ox, oy);
}

canvas.addEventListener("click", (e) => {
  const p = toLogical(canvas, e.clientX, e.clientY);
  handleClick(world, p.x, p.y);
  announce(takeEvents(world));
});

window.addEventListener("keydown", (e) => {
  if (e.key === " ") e.preventDefault();
  const action = handleKey(world, e.key);
  if (action === "start") {
    startDay(world);
    announce(takeEvents(world));
  } else if (action === "pause") {
    world.screen = "paused";
  } else if (action === "resume") {
    world.screen = "play";
  } else if (action === "mute") {
    world.muted = !world.muted;
    statusEl.textContent = world.muted ? "Sound off." : "Sound on.";
  } else {
    announce(takeEvents(world));
  }
});

// --- loop -------------------------------------------------------------------
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    step(world, STEP);
    acc -= STEP;
  }
  const events = takeEvents(world);
  if (events.length > 0) announce(events);
  render(ctx, world);
  if (!shot) requestAnimationFrame(frame);
}

resize();
window.addEventListener("resize", resize);
render(ctx, world);
if (shot) {
  // Staged scene: one frame, then signal the screenshot harness.
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
