// Ember & Thyme — world state and rules.
// The world is plain data plus a step function: no DOM, no drawing here, so
// the rules can be tested on their own. All times are seconds.
import {
  FIELD,
  STEP,
  DAY_SECONDS,
  MAX_TICKETS,
  TICKET_SPAWN_SECONDS,
  TICKET_PATIENCE_MIN,
  TICKET_PATIENCE_MAX,
  COOK_SECONDS,
  PLATES,
  SCORE_SERVE_BASE,
  SCORE_TIME_BONUS_MAX,
  SCORE_WRONG_SERVE,
  INGREDIENTS,
  INGREDIENT_BY_ID,
  DISHES,
} from "./config.js";
import { createRandom } from "./random.js";

// Logical layout, shared by the renderer and the click handling.
export const LAYOUT = {
  board: { x: 16, y: 44, w: FIELD.width - 32, h: 96 },
  ticket: { w: 200, h: 84, gap: 12 },
  plates: { y: 190, h: 110, w: 190, gap: 24 },
  stove: { x: FIELD.width - 220, y: 190, w: 190, h: 110 },
  counter: { y: 430, h: 110 },
  bin: { w: 128, h: 96, gap: 18 },
  hud: { y: 8, h: 28 },
};

export function plateX(i) {
  return 16 + i * (LAYOUT.plates.w + LAYOUT.plates.gap);
}

export function binX(i) {
  const total =
    INGREDIENTS.length * LAYOUT.bin.w +
    (INGREDIENTS.length - 1) * LAYOUT.bin.gap;
  return (FIELD.width - total) / 2 + i * (LAYOUT.bin.w + LAYOUT.bin.gap);
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sorted = [...a].sort();
  return [...b].sort().every((v, i) => v === sorted[i]);
}

function dishFor(ingredients) {
  return DISHES.find((d) => sameSet(d.ingredients, ingredients)) ?? null;
}

export function createWorld(seed) {
  const rng = createRandom(seed);
  return {
    seed,
    rng,
    screen: "title",
    timeLeft: DAY_SECONDS,
    score: 0,
    coins: 0,
    served: 0,
    wasted: 0,
    held: null,
    muted: false,
    spawnIn: 2,
    ticketSeq: 0,
    tickets: [],
    plates: Array.from({ length: PLATES }, () => ({
      ingredients: [],
      dishId: null,
      state: "building", // building | assembled | cooking | ready
    })),
    stove: null, // { plate: number, progress: number }
    events: [],
    best: 0,
  };
}

function pushEvent(world, type, detail) {
  world.events.push({ type, ...detail });
}

function spawnTicket(world) {
  const dish = world.rng.pick(DISHES);
  const patience = world.rng.int(TICKET_PATIENCE_MIN, TICKET_PATIENCE_MAX);
  world.ticketSeq += 1;
  world.tickets.push({
    id: world.ticketSeq,
    dishId: dish.id,
    patience,
    patienceMax: patience,
  });
  pushEvent(world, "spawn", { dish: dish.name });
}

// --- player actions (only in the play screen) -----------------------------

export function pickIngredient(world, ingredientId) {
  if (world.screen !== "play" || !INGREDIENT_BY_ID[ingredientId]) return false;
  world.held = ingredientId;
  pushEvent(world, "pickup", { ingredient: ingredientId });
  return true;
}

export function clickPlate(world, i) {
  if (world.screen !== "play") return false;
  const plate = world.plates[i];
  if (!plate) return false;

  // A held ingredient goes onto the plate.
  if (world.held) {
    if (plate.state === "cooking" || plate.state === "ready") return false;
    if (plate.ingredients.includes(world.held)) {
      pushEvent(world, "dup", { ingredient: world.held });
      return false;
    }
    plate.ingredients.push(world.held);
    pushEvent(world, "add", { ingredient: world.held, plate: i });
    world.held = null;
    const dish = dishFor(plate.ingredients);
    if (dish) {
      plate.dishId = dish.id;
      plate.state = dish.needsStove ? "assembled" : "ready";
      pushEvent(world, "dish", { dish: dish.name, plate: i });
    }
    return true;
  }

  // Empty hand on a plate: serve it, send it to the stove, or clear it.
  if (plate.state === "ready") return servePlate(world, i);
  if (plate.state === "assembled") return sendToStove(world, i);
  if (plate.ingredients.length > 0) {
    plate.ingredients = [];
    plate.dishId = null;
    plate.state = "building";
    world.wasted += 1;
    pushEvent(world, "trash", { plate: i });
    return true;
  }
  return false;
}

export function sendToStove(world, i) {
  if (world.stove) {
    pushEvent(world, "stoveBusy", {});
    return false;
  }
  const plate = world.plates[i];
  if (!plate || plate.state !== "assembled") return false;
  world.stove = { plate: i, progress: 0 };
  plate.state = "cooking";
  pushEvent(world, "cookStart", { plate: i });
  return true;
}

export function servePlate(world, i) {
  const plate = world.plates[i];
  if (!plate || plate.state !== "ready" || !plate.dishId) return false;
  const ticketIndex = world.tickets.findIndex((t) => t.dishId === plate.dishId);
  if (ticketIndex === -1) {
    world.score += SCORE_WRONG_SERVE;
    world.wasted += 1;
    pushEvent(world, "wrong", { dish: plate.dishId });
    clearPlate(world, i);
    return true;
  }
  const ticket = world.tickets[ticketIndex];
  const timeBonus = Math.round(
    SCORE_TIME_BONUS_MAX * (ticket.patience / ticket.patienceMax),
  );
  world.score += SCORE_SERVE_BASE + timeBonus;
  world.coins += 3;
  world.served += 1;
  world.tickets.splice(ticketIndex, 1);
  pushEvent(world, "serve", {
    dish: plate.dishId,
    points: SCORE_SERVE_BASE + timeBonus,
  });
  clearPlate(world, i);
  return true;
}

export function serveFirstReady(world) {
  const i = world.plates.findIndex((p) => p.state === "ready");
  if (i === -1) return false;
  return servePlate(world, i);
}

function clearPlate(world, i) {
  world.plates[i] = { ingredients: [], dishId: null, state: "building" };
}

// --- simulation ------------------------------------------------------------

export function step(world, dt) {
  if (world.screen !== "play") return;
  world.timeLeft -= dt;

  // Tickets arrive on a timer while there is room on the board.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.tickets.length < MAX_TICKETS) {
    spawnTicket(world);
    world.spawnIn = TICKET_SPAWN_SECONDS;
  }

  // Patience runs out: the ticket walks away.
  for (let i = world.tickets.length - 1; i >= 0; i -= 1) {
    world.tickets[i].patience -= dt;
    if (world.tickets[i].patience <= 0) {
      pushEvent(world, "expire", { dish: world.tickets[i].dishId });
      world.tickets.splice(i, 1);
    }
  }

  // The stove finishes a dish.
  if (world.stove) {
    world.stove.progress += dt;
    if (world.stove.progress >= COOK_SECONDS) {
      const plate = world.plates[world.stove.plate];
      plate.state = "ready";
      pushEvent(world, "cookDone", { plate: world.stove.plate });
      world.stove = null;
    }
  }

  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    world.screen = "over";
    pushEvent(world, "dayOver", { score: world.score });
  }
}

export function startDay(world) {
  const fresh = createWorld(world.seed + 1);
  fresh.best = world.best;
  fresh.muted = world.muted;
  Object.assign(world, fresh, { screen: "play" });
  spawnTicket(world);
  spawnTicket(world);
  pushEvent(world, "start", {});
}

export function takeEvents(world) {
  const out = world.events;
  world.events = [];
  return out;
}

export { STEP };
