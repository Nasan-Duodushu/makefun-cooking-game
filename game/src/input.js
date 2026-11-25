// Ember & Thyme — mouse and keyboard input.
// Clicks are resolved against the same layout the renderer draws, so what
// you see is what you can click.
import { FIELD, INGREDIENTS } from "./config.js";
import { LAYOUT, plateX, binX, pickIngredient, clickPlate, serveFirstReady, sendToStove } from "./world.js";

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function handleClick(world, logicalX, logicalY) {
  if (world.screen !== "play") return false;

  // Ingredient bins along the counter.
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (
      inRect(logicalX, logicalY, {
        x: binX(i),
        y: LAYOUT.counter.y,
        w: LAYOUT.bin.w,
        h: LAYOUT.bin.h,
      })
    ) {
      return pickIngredient(world, INGREDIENTS[i].id);
    }
  }

  // Plates: the plate's own click rules live in world.clickPlate.
  for (let i = 0; i < world.plates.length; i += 1) {
    if (
      inRect(logicalX, logicalY, {
        x: plateX(i),
        y: LAYOUT.plates.y,
        w: LAYOUT.plates.w,
        h: LAYOUT.plates.h,
      })
    ) {
      return clickPlate(world, i);
    }
  }

  // The hearth itself is a shortcut: click it to send the leftmost
  // assembled plate to the stove.
  if (inRect(logicalX, logicalY, LAYOUT.stove)) {
    const i = world.plates.findIndex((p) => p.state === "assembled");
    if (i !== -1) return sendToStove(world, i);
  }
  return false;
}

export function handleKey(world, key) {
  const lower = key.toLowerCase();
  if (world.screen === "title" || world.screen === "over") {
    if (key === "Enter") return "start";
    return null;
  }
  if (world.screen === "paused") {
    if (lower === "p" || key === "Escape") return "resume";
    return null;
  }
  // Playing.
  if (lower === "p" || key === "Escape") return "pause";
  if (lower === "m") return "mute";
  if (key === " ") {
    serveFirstReady(world);
    return "served";
  }
  const ing = INGREDIENTS.find((g) => g.key === key);
  if (ing) {
    pickIngredient(world, ing.id);
    return "picked";
  }
  return null;
}

export function toLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * FIELD.width,
    y: ((clientY - rect.top) / rect.height) * FIELD.height,
  };
}
