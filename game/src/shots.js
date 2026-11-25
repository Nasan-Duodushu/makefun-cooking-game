// Ember & Thyme — deterministic screenshot staging.
// ?shot=start|play|end builds a fixed scene from the seed, so the three
// required screenshots are reproducible and show the kitchen, the order
// board, a dish mid-assembly, the timer and a plate ready to serve.
import { DISH_BY_ID } from "./config.js";

export function stageShot(world, shot) {
  world.screen = "play";
  world.timeLeft = 74;
  world.score = 85;
  world.coins = 12;
  world.served = 3;
  world.tickets = [];
  world.plates = world.plates.map(() => ({
    ingredients: [],
    dishId: null,
    state: "building",
  }));
  world.stove = null;
  world.held = null;

  if (shot === "start") {
    world.screen = "title";
    world.timeLeft = 120;
    world.score = 0;
    world.coins = 0;
    world.served = 0;
    return;
  }

  // Two tickets on the board: one comfortable, one nearly out of patience.
  world.tickets = [
    { id: 1, dishId: "bruschetta", patience: 28, patienceMax: 32 },
    { id: 2, dishId: "melt", patience: 6, patienceMax: 30 },
  ];

  if (shot === "play") {
    // A bruschetta mid-assembly (bread + tomato, herb still to come) and a
    // mushroom melt ready to serve; the cook is holding a tomato.
    world.plates[0] = {
      ingredients: ["bread", "tomato"],
      dishId: null,
      state: "building",
    };
    world.plates[1] = {
      ingredients: ["bread", "mushroom", "cheese"],
      dishId: "melt",
      state: "ready",
    };
    world.held = "tomato";
    return;
  }

  if (shot === "end") {
    world.screen = "over";
    world.timeLeft = 0;
    world.score = 210;
    world.coins = 24;
    world.served = 8;
    world.best = 210;
    world.tickets = [];
    world.plates = world.plates.map(() => ({
      ingredients: [],
      dishId: null,
      state: "building",
    }));
    return;
  }
}

export { DISH_BY_ID };
