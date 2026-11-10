import { GAMES, DIFFICULTIES } from "./catalog.js";
import { loadStats, todayString, shiftDate, formatShort, puzzleNumber, isValidDate, compareDates } from "./core.js";

export function renderArchive(root, jump) {
  const today = todayString();
  if (jump) jump.max = today;
  const stats = Object.fromEntries(GAMES.map((game) => [game.id, loadStats(game.id)]));

function shelf(date) {
  const section = document.createElement("section");
  section.className = `shelf${date === today ? " is-today" : ""}`;
  section.id = `day-${date}`;
  const head = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = `${formatShort(date)}  #${puzzleNumber(date)}`;
  head.append(title);
  if (date === today) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "TODAY";
    head.append(badge);
  }
  const carts = document.createElement("div");
  carts.className = "carts";
  for (const game of GAMES) {
    const link = document.createElement("a");
    link.className = `cart ${game.cart}`;
    link.href = `${game.href}?date=${date}`;
    const label = document.createElement("span");
    label.className = "label";
    const name = document.createElement("span");
    name.textContent = game.name;
    const marks = document.createElement("span");
    marks.className = "marks";
    const day = stats[game.id].wins[date] || {};
    marks.innerHTML = DIFFICULTIES.map((diff) => `<i class="${day[diff]?.won ? "on" : ""}">${diff[0].toUpperCase()}</i>`).join("");
    label.append(name, marks);
    link.append(label);
    carts.append(link);
  }
  section.append(head, carts);
  return section;
}

const shown = new Set();
function add(date) {
  if (shown.has(date) || !isValidDate(date) || compareDates(date, today) > 0) return;
  shown.add(date);
  root.append(shelf(date));
}

for (let i = 0; i < 28; i++) add(shiftDate(today, -i));

jump?.addEventListener("change", () => {
  const date = jump.value;
  if (!isValidDate(date) || compareDates(date, today) > 0) return;
  if (!shown.has(date)) {
    root.prepend(shelf(date));
    shown.add(date);
  }
  document.querySelector(`#day-${CSS.escape(date)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
