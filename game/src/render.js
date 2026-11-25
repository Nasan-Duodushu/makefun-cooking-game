// Ember & Thyme — canvas drawing. Flat vector art, no images: every dish,
// ingredient and timer is drawn from shapes so the game needs no assets.
import {
  FIELD,
  DAY_SECONDS,
  COOK_SECONDS,
  INGREDIENTS,
  INGREDIENT_BY_ID,
  DISH_BY_ID,
  PALETTE,
} from "./config.js";
import { LAYOUT, plateX, binX } from "./world.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = "left", weight = "") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

// One ingredient as a coloured disc with its initial — the same mark is used
// on bins, plates and tickets so the eye learns it once.
function ingredientDisc(ctx, id, x, y, r) {
  const ing = INGREDIENT_BY_ID[id];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = ing.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ing.dark;
  ctx.stroke();
  text(ctx, ing.name[0], x, y + 1, r, "#241a12", "center", "700");
}

function ticketCard(ctx, ticket, x, y) {
  const dish = DISH_BY_ID[ticket.dishId];
  const w = LAYOUT.ticket.w;
  const h = LAYOUT.ticket.h;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = PALETTE.board;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.plateRim;
  ctx.stroke();
  text(ctx, dish.name, x + 12, y + 16, 15, PALETTE.boardInk, "left", "700");
  dish.ingredients.forEach((id, i) => {
    ingredientDisc(ctx, id, x + 24 + i * 34, y + 44, 13);
  });
  if (dish.needsStove) {
    text(ctx, "🔥 stove", x + w - 12, y + 44, 12, "#a83a32", "right", "700");
  }
  // Patience bar: drains from green to red as the ticket ages.
  const frac = Math.max(0, ticket.patience / ticket.patienceMax);
  ctx.fillStyle = "#d8c9a3";
  roundRect(ctx, x + 12, y + h - 16, w - 24, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? "#6fae5a" : frac > 0.25 ? "#e0a458" : "#e2574c";
  if (frac > 0) {
    roundRect(ctx, x + 12, y + h - 16, (w - 24) * frac, 8, 4);
    ctx.fill();
  }
}

function plateSlot(ctx, world, i) {
  const x = plateX(i);
  const y = LAYOUT.plates.y;
  const w = LAYOUT.plates.w;
  const h = LAYOUT.plates.h;
  const plate = world.plates[i];

  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = "#6b4a2c";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#8a5a33";
  ctx.stroke();

  // The plate itself.
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2 + 8, 74, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.plate;
  ctx.fill();
  ctx.strokeStyle = PALETTE.plateRim;
  ctx.stroke();

  if (plate.state === "cooking") {
    text(ctx, "on the stove…", x + w / 2, y + h / 2 + 8, 14, "#8a5a33", "center", "700");
  } else if (plate.ingredients.length > 0) {
    plate.ingredients.forEach((id, k) => {
      ingredientDisc(ctx, id, x + w / 2 - (plate.ingredients.length - 1) * 20 + k * 40, y + h / 2 + 8, 15);
    });
  }

  if (plate.dishId) {
    const dish = DISH_BY_ID[plate.dishId];
    text(ctx, dish.name, x + w / 2, y + 16, 13, PALETTE.text, "center", "700");
  }
  if (plate.state === "ready") {
    text(ctx, "✓ ready — click to serve", x + w / 2, y + h - 14, 12, "#6fae5a", "center", "700");
  } else if (plate.state === "assembled") {
    text(ctx, "needs the stove — click", x + w / 2, y + h - 14, 12, PALETTE.bell, "center", "700");
  } else if (plate.ingredients.length > 0) {
    text(ctx, "click empty-handed to clear", x + w / 2, y + h - 14, 11, PALETTE.muted, "center");
  } else {
    text(ctx, `plate ${i + 1}`, x + w / 2, y + h - 14, 12, PALETTE.muted, "center");
  }
}

function stoveSlot(ctx, world) {
  const s = LAYOUT.stove;
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fillStyle = PALETTE.stove;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#7a5c3e";
  ctx.stroke();
  text(ctx, "HEARTH", s.x + s.w / 2, s.y + 16, 13, PALETTE.text, "center", "700");

  if (world.stove) {
    const frac = Math.min(1, world.stove.progress / COOK_SECONDS);
    // Fire glow grows as the dish cooks.
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + 58, 26 + 8 * frac, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(224, 120, 48, ${0.35 + 0.45 * frac})`;
    ctx.fill();
    text(ctx, "🔥", s.x + s.w / 2, s.y + 58, 26, "#fff", "center");
    ctx.fillStyle = "#2c1f14";
    roundRect(ctx, s.x + 20, s.y + s.h - 18, s.w - 40, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.stoveGlow;
    roundRect(ctx, s.x + 20, s.y + s.h - 18, (s.w - 40) * frac, 8, 4);
    ctx.fill();
  } else {
    text(ctx, "empty", s.x + s.w / 2, s.y + 58, 14, PALETTE.muted, "center");
    text(ctx, "send a stove dish here", s.x + s.w / 2, s.y + s.h - 14, 11, PALETTE.muted, "center");
  }
}

function counterBins(ctx, world) {
  const y = LAYOUT.counter.y;
  INGREDIENTS.forEach((ing, i) => {
    const x = binX(i);
    const w = LAYOUT.bin.w;
    const h = LAYOUT.bin.h;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = world.held === ing.id ? "#c98f3f" : PALETTE.counter;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.counterTop;
    ctx.stroke();
    ingredientDisc(ctx, ing.id, x + w / 2, y + 34, 20);
    text(ctx, ing.name, x + w / 2, y + 68, 14, PALETTE.text, "center", "700");
    text(ctx, `[${ing.key}]`, x + w / 2, y + 86, 11, PALETTE.muted, "center");
  });
  if (world.held) {
    const ing = INGREDIENT_BY_ID[world.held];
    text(
      ctx,
      `holding ${ing.name} — click a plate to add it`,
      FIELD.width / 2,
      y + LAYOUT.bin.h + 22,
      14,
      PALETTE.bell,
      "center",
      "700",
    );
  } else {
    text(
      ctx,
      "click a bin (or press 1–6) to pick up an ingredient",
      FIELD.width / 2,
      y + LAYOUT.bin.h + 22,
      14,
      PALETTE.muted,
      "center",
    );
  }
}

function hud(ctx, world) {
  const frac = Math.max(0, world.timeLeft / DAY_SECONDS);
  text(ctx, `⏱ ${Math.ceil(world.timeLeft)}s`, 16, 22, 16, PALETTE.text, "left", "700");
  ctx.fillStyle = "#2c1f14";
  roundRect(ctx, 110, 14, 220, 14, 7);
  ctx.fill();
  ctx.fillStyle = frac > 0.3 ? "#6fae5a" : "#e2574c";
  if (frac > 0) {
    roundRect(ctx, 110, 14, 220 * frac, 14, 7);
    ctx.fill();
  }
  text(ctx, `Score ${world.score}`, FIELD.width - 290, 22, 16, PALETTE.text, "left", "700");
  text(ctx, `🪙 ${world.coins}`, FIELD.width - 170, 22, 16, PALETTE.bell, "left", "700");
  text(ctx, `served ${world.served}`, FIELD.width - 16, 22, 13, PALETTE.muted, "right");
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = "rgba(24, 16, 10, 0.78)";
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, title, FIELD.width / 2, 190, 44, accent, "center", "800");
  lines.forEach((line, i) => {
    text(ctx, line, FIELD.width / 2, 250 + i * 30, 18, PALETTE.text, "center");
  });
}

export function render(ctx, world) {
  // Kitchen: dark wall, warm floor.
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.wallDark;
  ctx.fillRect(0, 0, FIELD.width, 40);
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 400, FIELD.width, FIELD.height - 400);

  hud(ctx, world);

  // Order board.
  const b = LAYOUT.board;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = "#2c1f14";
  ctx.fill();
  text(ctx, "ORDER BOARD", b.x + 14, b.y + 16, 12, PALETTE.muted, "left", "700");
  world.tickets.forEach((ticket, i) => {
    ticketCard(ctx, ticket, b.x + 14 + i * (LAYOUT.ticket.w + LAYOUT.ticket.gap), b.y + 30);
  });
  if (world.tickets.length === 0) {
    text(ctx, "no orders yet — the lunch rush is coming", b.x + 180, b.y + 66, 15, PALETTE.muted, "left");
  }

  world.plates.forEach((_, i) => plateSlot(ctx, world, i));
  stoveSlot(ctx, world);
  counterBins(ctx, world);

  if (world.screen === "title") {
    overlay(ctx, "Ember & Thyme", [
      "Run the hearth kitchen: build what the tickets ask for,",
      "cook the stove dishes, and serve before patience runs out.",
      "",
      "Click a bin (or press 1–6) to pick up · click a plate to add",
      "Click a ready plate to serve · P / Esc pauses · M mutes",
      "",
      "Press Enter to start the day — 120 seconds, good luck.",
    ], PALETTE.bell);
  } else if (world.screen === "paused") {
    overlay(ctx, "Paused", ["Press P or Esc to keep cooking."], PALETTE.text);
  } else if (world.screen === "over") {
    overlay(ctx, "Day done!", [
      `Score ${world.score} · ${world.served} dishes served · ${world.coins} coins`,
      world.best > 0 ? `Best score: ${world.best}` : "",
      "",
      "Press Enter to cook another day.",
    ], PALETTE.bell);
  }
}
