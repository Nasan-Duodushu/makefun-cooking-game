// Ember & Thyme — tuning and content for the hearth kitchen.
// All sizes are logical canvas units; the renderer scales to the window.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = "ember-thyme-best";

export const DAY_SECONDS = 120;
export const MAX_TICKETS = 4;
export const TICKET_SPAWN_SECONDS = 8;
export const TICKET_PATIENCE_MIN = 25;
export const TICKET_PATIENCE_MAX = 35;
export const COOK_SECONDS = 6;
export const PLATES = 3;

export const SCORE_SERVE_BASE = 25;
export const SCORE_TIME_BONUS_MAX = 15;
export const SCORE_WRONG_SERVE = -5;

// The counter: six ingredient bins, keys 1-6, in counter order.
export const INGREDIENTS = [
  { id: "bread", name: "Bread", key: "1", color: "#e0a458", dark: "#b57e32" },
  { id: "tomato", name: "Tomato", key: "2", color: "#e2574c", dark: "#a83a32" },
  { id: "mushroom", name: "Mushroom", key: "3", color: "#d9c7a7", dark: "#a08b62" },
  { id: "cheese", name: "Cheese", key: "4", color: "#f2c14e", dark: "#c08f1e" },
  { id: "herb", name: "Herb", key: "5", color: "#6fae5a", dark: "#477a38" },
  { id: "berry", name: "Berry", key: "6", color: "#8e6cc0", dark: "#644695" },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

// The menu: each dish is a set of ingredients; stove dishes must visit the
// hearth after assembly before they can be served.
export const DISHES = [
  {
    id: "bruschetta",
    name: "Tomato Bruschetta",
    needsStove: false,
    ingredients: ["bread", "tomato", "herb"],
  },
  {
    id: "melt",
    name: "Mushroom Melt",
    needsStove: true,
    ingredients: ["bread", "mushroom", "cheese"],
  },
  {
    id: "tart",
    name: "Berry Tart",
    needsStove: false,
    ingredients: ["bread", "berry", "cheese"],
  },
  {
    id: "flatbread",
    name: "Garden Flatbread",
    needsStove: true,
    ingredients: ["bread", "tomato", "mushroom", "herb"],
  },
];

export const DISH_BY_ID = Object.fromEntries(
  DISHES.map((dish) => [dish.id, dish]),
);

// Warm hearth palette for the kitchen itself.
export const PALETTE = {
  wall: "#3a2a1c",
  wallDark: "#2c1f14",
  floor: "#4a3421",
  counter: "#8a5a33",
  counterTop: "#a9743f",
  board: "#f3e6c8",
  boardInk: "#3a2a1c",
  plate: "#f7f3e8",
  plateRim: "#c9b98a",
  stove: "#5a4632",
  stoveGlow: "#e07830",
  bell: "#f2c14e",
  text: "#f3e6c8",
  muted: "#c9a882",
};
