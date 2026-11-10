import { gameById, DIFFICULTIES } from "./catalog.js";
import {
  makeRng,
  todayString,
  isValidDate,
  compareDates,
  formatLong,
  formatShort,
  puzzleNumber,
  formatTime,
  buildShare,
  loadRun,
  saveRun,
  clearRun,
  recordWin,
  copyText,
  diffKey,
  getStorage,
} from "./core.js";
import { wombatSvg } from "./art.js";

function nounLabel(noun, n) {
  const word = n === 1 ? noun : noun === "try" ? "tries" : `${noun}s`;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function createKit(gameId) {
  const game = gameById(gameId);
  const params = new URLSearchParams(location.search);
  const today = todayString();
  let date = params.get("date");
  if (!isValidDate(date) || compareDates(date, today) > 0) date = today;
  const archive = date !== today;
  const stored = getStorage().getItem(diffKey(gameId));
  const requested = params.get("diff");
  let diff = DIFFICULTIES.includes(requested) ? requested : DIFFICULTIES.includes(stored) ? stored : "easy";

  let moves = 0;
  let seconds = 0;
  let won = false;
  let par = 0;
  let running = false;
  let timer = null;
  let snapshot = null;
  let onReset = () => {};
  let onDiff = () => {};
  let resetArmed = false;

  const stat = document.querySelector("#stat-line");
  const timerEl = document.querySelector("#timer");
  const shareBtn = document.querySelector("#share");
  const live = document.querySelector("#live");
  const noteEl = document.querySelector("#note");
  const solvedFlag = document.querySelector("#solved-flag");

  function paintHud() {
    stat.textContent = `${nounLabel(game.noun, moves)} ${moves}  ·  Par ${par}`;
    timerEl.textContent = formatTime(seconds);
  }

  function persist() {
    if (!snapshot) return;
    if (moves === 0 && !won) return;
    saveRun(gameId, diff, date, { state: snapshot, moves, seconds, won, par });
  }

  function startTimer() {
    if (running || won) return;
    running = true;
    timer = setInterval(() => {
      seconds += 1;
      paintHud();
      persist();
    }, 1000);
  }

  function stopTimer() {
    running = false;
    clearInterval(timer);
  }

  function shareString() {
    return buildShare({
      title: game.name,
      date,
      diff,
      noun: game.noun,
      moves,
      par,
      seconds,
    });
  }

  async function doShare() {
    const ok = await copyText(shareString());
    toast(ok ? "Copied results" : "Could not copy");
  }

  function toast(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 1600);
  }

  function win() {
    if (won) return;
    won = true;
    stopTimer();
    persist();
    const stats = recordWin(gameId, date, diff, { moves, par, seconds }, today);
    shareBtn.disabled = false;
    document.querySelector("#board").classList.add("is-solved");
    if (solvedFlag) solvedFlag.hidden = false;
    const note = moves < par ? "Under par. The wombat is impressed." : moves === par ? "Right on par." : "Over par, and still plated.";
    const streak = archive
      ? "Archive clear. Streaks count on today's puzzle."
      : `Streak ${stats.streak}. Best ${stats.bestStreak}.`;
    document.querySelector("#win-title").textContent = game.win;
    document.querySelector("#win-detail").textContent = `${nounLabel(game.noun, moves)} ${moves} · Par ${par} · ${formatTime(seconds)}. ${note} ${streak}`;
    const burst = document.querySelector("#win-burst");
    if (burst) {
      const colors = ["#f6c945", "#e23b2f", "#2f8f4e", "#fff8ea", "#e07a4c"];
      burst.innerHTML = colors.map((color) => `<i style="background:${color}"></i>`).join("");
    }
    document.querySelector("#win").showModal();
    if (live) live.textContent = `${game.win} ${note}`;
  }

  function begin(saved) {
    const resume = saved && saved.state;
    if (resume && saved.won) {
      moves = saved.moves || 0;
      seconds = saved.seconds || 0;
      won = true;
      shareBtn.disabled = false;
      document.querySelector("#board").classList.add("is-solved");
      if (solvedFlag) solvedFlag.hidden = false;
    } else if (resume) {
      moves = saved.moves || 0;
      seconds = saved.seconds || 0;
      won = false;
      shareBtn.disabled = true;
      document.querySelector("#board").classList.remove("is-solved");
      if (solvedFlag) solvedFlag.hidden = true;
      if (moves > 0) startTimer();
    } else {
      moves = 0;
      seconds = 0;
      won = false;
      shareBtn.disabled = true;
      document.querySelector("#board").classList.remove("is-solved");
      if (solvedFlag) solvedFlag.hidden = true;
    }
    paintHud();
    document.querySelectorAll("[data-diff]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.diff === diff ? "true" : "false");
    });
    const when = document.querySelector("#when");
    if (when) when.textContent = `${formatShort(date)} · #${puzzleNumber(date)}`;
    const banner = document.querySelector("#archive-note");
    if (banner) {
      if (archive) {
        banner.hidden = false;
        banner.innerHTML = `Archive plate · ${formatLong(date)}. Streaks count on <a href="${location.pathname}">today's puzzle</a>.`;
      } else banner.hidden = true;
    }
    const url = new URL(location.href);
    url.searchParams.set("diff", diff);
    if (archive) url.searchParams.set("date", date);
    else url.searchParams.delete("date");
    history.replaceState(null, "", url);
    getStorage().setItem(diffKey(gameId), diff);
  }

  document.querySelector("#share").addEventListener("click", doShare);
  document.querySelector("#win-share").addEventListener("click", doShare);
  document.querySelector("#win-close").addEventListener("click", () => document.querySelector("#win").close());
  document.querySelector("#how-open").addEventListener("click", () => document.querySelector("#how").showModal());
  document.querySelector("#how-close").addEventListener("click", () => document.querySelector("#how").close());
  for (const id of ["how", "win"]) {
    document.querySelector(`#${id}`).addEventListener("click", (event) => {
      if (event.target.tagName === "DIALOG") event.target.close();
    });
  }

  document.querySelector("#reset").addEventListener("click", () => {
    const btn = document.querySelector("#reset");
    if (!resetArmed && moves > 0 && !won) {
      resetArmed = true;
      const previous = btn.textContent;
      btn.textContent = "Sure?";
      setTimeout(() => {
        resetArmed = false;
        btn.textContent = previous;
      }, 1600);
      return;
    }
    resetArmed = false;
    btn.textContent = "Reset";
    stopTimer();
    clearRun(gameId, diff, date);
    snapshot = null;
    onReset();
  });

  document.querySelectorAll("[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.diff === diff) return;
      stopTimer();
      persist();
      diff = btn.dataset.diff;
      snapshot = null;
      onDiff();
    });
  });

  const mini = document.querySelector("[data-art='wombat-mini']");
  if (mini) mini.innerHTML = wombatSvg("");

  return {
    game,
    get diff() { return diff; },
    get date() { return date; },
    get today() { return today; },
    get moves() { return moves; },
    get won() { return won; },
    get par() { return par; },
    setPar(value) { par = value; paintHud(); },
    rng() { return makeRng([gameId, diff, date]); },
    load: () => loadRun(gameId, diff, date),
    begin,
    remember(data) {
      snapshot = data;
      if (moves > 0 || won) persist();
    },
    addMove() {
      if (won) return;
      moves += 1;
      startTimer();
      paintHud();
      persist();
    },
    win,
    toast,
    note(text) { if (noteEl) noteEl.textContent = text || ""; },
    announce(text) { if (live) live.textContent = text; },
    onReset(fn) { onReset = fn; },
    onDiff(fn) { onDiff = fn; },
  };
}
