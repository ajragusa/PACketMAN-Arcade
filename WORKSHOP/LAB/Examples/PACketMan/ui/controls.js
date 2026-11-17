const OFFSETS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};
const KEY_DIRECTIONS = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

function parseCell(value) {
  const coordinates = value?.split(",").map(Number);
  return coordinates?.length === 2 && coordinates.every(Number.isInteger) ? coordinates : null;
}

export function bindControls(root, handlers) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !root.contains(button)) return;
    if (button.dataset.move) {
      const coordinate = parseCell(root.querySelector('[data-cell][tabindex="0"]')?.dataset.cell);
      const offset = OFFSETS[button.dataset.move];
      if (coordinate && offset) handlers.move([coordinate[0] + offset[0], coordinate[1] + offset[1]]);
      return;
    }
    if (button.dataset.cell) {
      const coordinate = parseCell(button.dataset.cell);
      if (coordinate) handlers.move(coordinate);
      return;
    }
    if (button.dataset.choice) {
      handlers.choose(button.dataset.choice, button.dataset.value, button.dataset.reduceRisk === "true");
      return;
    }
    if (button.dataset.action) handlers.action(button.dataset.action);
  });

  root.addEventListener("keydown", (event) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey
        && (event.key === "Escape" || event.key.toLowerCase() === "p")) {
      event.preventDefault();
      if (!event.repeat) handlers.action("toggle-pause");
      return;
    }
    const cell = event.target.closest("[data-cell]");
    if (!cell) return;
    const coordinate = parseCell(cell.dataset.cell);
    if (!coordinate) return;
    const offset = OFFSETS[KEY_DIRECTIONS[event.key] ?? KEY_DIRECTIONS[event.key.toLowerCase()]];
    if (!offset) return;
    event.preventDefault();
    handlers.move([coordinate[0] + offset[0], coordinate[1] + offset[1]]);
  });
}

export function focusAfterRender(root, state) {
  let selector = '[data-cell][tabindex="0"]';
  if (state.view === "briefing") {
    selector = "h2[tabindex='-1']";
  } else if (state.view === "decision-prompt") {
    selector = "[data-choice]";
  } else if (state.view === "ghost-question") {
    selector = '[data-choice="ghost"]';
  } else if (state.view === "ghost-feedback" || state.view === "ghost-success") {
    selector = "#ghost-title";
  } else if (state.view === "paused") {
    selector = '[data-action="toggle-pause"]';
  } else if (state.view === "feedback" || state.view === "dropped-feedback"
      || state.view === "level-complete" || state.view === "summary") {
    selector = "h1[tabindex='-1'], h2[tabindex='-1']";
  }
  requestAnimationFrame(() => root.querySelector(selector)?.focus());
}
