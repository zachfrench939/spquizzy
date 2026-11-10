import { GAMES, DIFFICULTIES } from "./catalog.js";
import { loadStats, loadRun, todayString, formatLong, puzzleNumber } from "./core.js";
import { bowlSvg, wombatSvg, iconSvg } from "./art.js";

const today = todayString();
const eyebrow = document.querySelector("#today");
if (eyebrow) eyebrow.textContent = `${formatLong(today)}  ·  Puzzle #${puzzleNumber(today)}`;

const bowl = document.querySelector("[data-art='bowl']");
const wombat = document.querySelector("[data-art='wombat']");
const mini = document.querySelector("[data-art='wombat-mini']");
if (bowl) bowl.innerHTML = bowlSvg();
if (wombat) wombat.innerHTML = wombatSvg("Wombat mascot");
if (mini) mini.innerHTML = wombatSvg("");

for (const game of GAMES) {
  const slot = document.querySelector(`[data-icon="${game.id}"]`);
  if (slot) slot.innerHTML = iconSvg(game.id);
  const meta = document.querySelector(`[data-status="${game.id}"]`);
  if (!meta) continue;
  const stats = loadStats(game.id);
  const day = stats.wins[today] || {};
  const solved = DIFFICULTIES.filter((diff) => day[diff]?.won);
  let text = "Ready today";
  if (solved.length === 3) text = "All clear";
  else if (solved.length) text = `Solved ${solved.map((diff) => diff[0].toUpperCase()).join(" ")}`;
  else if (DIFFICULTIES.some((diff) => {
    const run = loadRun(game.id, diff, today);
    return run && !run.won && run.moves > 0;
  })) text = "In progress";
  meta.querySelector(".ready").textContent = text;
  meta.querySelector(".streak").textContent = `Streak ${stats.streak || 0}`;
}
