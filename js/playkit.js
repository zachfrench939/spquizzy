import { gameById, GAMES, DIFFICULTIES } from "./catalog.js";
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
import { wombatSvg, pastaBurstHtml } from "./art.js";
import { submitAndRank, rankMessage } from "./scores.js";

function nounLabel(noun, n) {
  const word = n === 1 ? noun : noun === "try" ? "tries" : noun === "domino" ? "dominoes" : `${noun}s`;
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
  let undoStack = [];
  let paused = false;
  let onReset = () => {};
  let onDiff = () => {};
  let onUndo = () => {};
  let resetArmed = false;

  const stat = document.querySelector("#stat-line");
  const timerEl = document.querySelector("#timer");
  const shareBtn = document.querySelector("#share");
  const live = document.querySelector("#live");
  const noteEl = document.querySelector("#note");
  const solvedFlag = document.querySelector("#solved-flag");

  function paintHud() {
    if (stat) stat.textContent = `${nounLabel(game.noun, moves)} ${moves}`;
    if (timerEl) timerEl.textContent = formatTime(seconds);
    const undoBtn = document.querySelector("#undo");
    if (undoBtn) undoBtn.disabled = won || undoStack.length < 2;
  }

  function shake() {
    const board = document.querySelector("#board");
    if (!board) return;
    board.classList.remove("is-shake");
    void board.offsetWidth;
    board.classList.add("is-shake");
  }

  function persist() {
    if (!snapshot) return;
    if (moves === 0 && !won) return;
    saveRun(gameId, diff, date, { state: snapshot, moves, seconds, won, par });
  }

  function startTimer() {
    if (running || won || paused) return;
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
    const record = recordWin(gameId, date, diff, { moves, par, seconds }, today);
    if (shareBtn) shareBtn.disabled = false;
    document.querySelector("#board").classList.add("is-solved");
    if (solvedFlag) solvedFlag.hidden = false;
    const compared = moves < par ? "Better than the goal." : moves === par ? "Right on the goal." : "A little over the goal.";
    const streak = archive ? "An older puzzle." : `Streak ${record.streak}. Best ${record.bestStreak}.`;
    document.querySelector("#win-title").textContent = game.win;
    const timeLine = document.querySelector("#win-time");
    if (timeLine) timeLine.textContent = formatTime(seconds);
    document.querySelector("#win-detail").textContent = `${streak} ${compared}`;
    const statList = document.querySelector("#win-stats");
    if (statList) {
      statList.innerHTML = `<li>${moves} ${nounLabel(game.noun, moves).toLowerCase()}</li><li>${formatTime(seconds)}</li><li>Streak ${archive ? 0 : record.streak || 0}</li>`;
    }
    const nextLink = document.querySelector("#win-next");
    if (nextLink) {
      const index = GAMES.findIndex((item) => item.id === gameId);
      const next = GAMES[(index + 1) % GAMES.length];
      nextLink.href = next.href;
      nextLink.textContent = `Next: ${next.name}`;
    }
    const rankLine = document.querySelector("#rank-line");
    if (rankLine) {
      rankLine.textContent = "Checking today's times…";
      submitAndRank({
        slug: game.slug,
        difficulty: diff,
        date,
        seconds,
        moves,
      }).then((rank) => {
        if (!rankLine.isConnected) return;
        const text = rankMessage(rank);
        rankLine.hidden = !text;
        if (text) rankLine.textContent = text;
      });
    }
    const burst = document.querySelector("#win-burst");
    if (burst) burst.innerHTML = pastaBurstHtml();
    document.querySelector("#win").showModal();
    if (live) live.textContent = `${game.win} ${formatTime(seconds)}`;
  }

  function begin(saved) {
    const resume = saved && saved.state;
    if (resume && saved.won) {
      moves = saved.moves || 0;
      seconds = saved.seconds || 0;
      won = true;
      if (shareBtn) shareBtn.disabled = false;
      document.querySelector("#board").classList.add("is-solved");
      if (solvedFlag) solvedFlag.hidden = false;
    } else if (resume) {
      moves = saved.moves || 0;
      seconds = saved.seconds || 0;
      won = false;
      if (shareBtn) shareBtn.disabled = true;
      document.querySelector("#board").classList.remove("is-solved");
      if (solvedFlag) solvedFlag.hidden = true;
      if (moves > 0) startTimer();
    } else {
      moves = 0;
      seconds = 0;
      won = false;
      if (shareBtn) shareBtn.disabled = true;
      document.querySelector("#board").classList.remove("is-solved");
      if (solvedFlag) solvedFlag.hidden = true;
    }
    paintHud();
    document.querySelectorAll("[data-diff]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.diff === diff ? "true" : "false");
    });
    const when = document.querySelector("#when");
    if (when) when.textContent = `${formatShort(date)}, puzzle ${puzzleNumber(date)}`;
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
  for (const id of ["how", "win", "settings"]) {
    document.querySelector(`#${id}`)?.addEventListener("click", (event) => {
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
    paused = false;
    clearRun(gameId, diff, date);
    snapshot = null;
    undoStack = [];
    onReset();
  });

  document.querySelector("#undo")?.addEventListener("click", () => {
    if (undoStack.length < 2 || won) {
      shake();
      return;
    }
    undoStack.pop();
    moves = Math.max(0, moves - 1);
    snapshot = structuredClone(undoStack[undoStack.length - 1]);
    if (moves === 0) {
      stopTimer();
      clearRun(gameId, diff, date);
    } else persist();
    onUndo(snapshot);
    paintHud();
  });

  const pauseBtn = document.querySelector("#pause");
  function setPaused(next) {
    if (won) return;
    paused = next;
    if (paused) stopTimer();
    else if (moves > 0) startTimer();
    document.querySelector(".play")?.classList.toggle("is-paused", paused);
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", paused ? "true" : "false");
      pauseBtn.textContent = paused ? "Resume" : "Pause";
    }
  }
  pauseBtn?.addEventListener("click", () => setPaused(!paused));
  document.querySelector("#resume")?.addEventListener("click", () => setPaused(false));
  document.querySelector("#hint")?.addEventListener("click", () => document.querySelector("#how")?.showModal());
  document.querySelector("#settings-open")?.addEventListener("click", () => document.querySelector("#settings")?.showModal());
  document.querySelector("#settings-close")?.addEventListener("click", () => document.querySelector("#settings")?.close());

  document.querySelectorAll("[data-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.diff === diff) return;
      stopTimer();
      persist();
      diff = btn.dataset.diff;
      snapshot = null;
      undoStack = [];
      document.querySelector("#settings")?.close();
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
      if (!undoStack.length) undoStack = [structuredClone(data)];
      if (moves > 0 || won) persist();
    },
    addMove() {
      if (won) return;
      undoStack.push(structuredClone(snapshot));
      moves += 1;
      startTimer();
      paintHud();
      persist();
    },
    shake,
    win,
    toast,
    note(text) { if (noteEl) noteEl.textContent = text || ""; },
    announce(text) { if (live) live.textContent = text; },
    onReset(fn) { onReset = fn; },
    onDiff(fn) { onDiff = fn; },
    onUndo(fn) { onUndo = fn; },
  };
}
