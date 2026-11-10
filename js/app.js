import { CONTACT_EMAIL, PRIMARY_GAME } from "./config.js";
import { GAMES, DIFFICULTIES, gameById } from "./catalog.js";
import { HELP } from "./help.js";
import { loadStats, loadRun, clearRun, todayString, formatLong, formatShort, formatTime, plural, isValidDate, compareDates, diffKey, getStorage, puzzleNumber } from "./core.js";
import { track } from "./analytics.js";
import { shareResult } from "./share.js";
import { iconSvg, wombatSvg, pastaBurstHtml, trophySvg } from "./art.js";
import { clipHtml, restartClip } from "./clips.js";
import { submitAndRank, rankMessage } from "./scores.js";
import { renderArchive } from "./archive.js";

const LOADERS = {
  sauce: () => import("./play/sauce.js"),
  slip: () => import("./play/slip.js"),
  twirl: () => import("./play/twirl.js"),
  bowls: () => import("./play/bowls.js"),
  ravioli: () => import("./play/ravioli.js"),
  pips: () => import("./play/pips.js"),
};

function currentFile() {
  const last = location.pathname.split("/").filter(Boolean).pop() || "index.html";
  return last.includes(".") ? last : "index.html";
}

function gameHref(game) {
  return game.href;
}

function statusFor(gameId, today) {
  const stats = loadStats(gameId);
  const day = stats.wins[today] || {};
  const solved = DIFFICULTIES.filter((diff) => day[diff]?.won);
  if (solved.length) return "Solved";
  const busy = DIFFICULTIES.some((diff) => {
    const run = loadRun(gameId, diff, today);
    return run && !run.won && run.moves > 0;
  });
  return busy ? "Playing" : "Ready";
}

function adSlot(slot) {
  return `<div class="ad-slot" data-ad-slot="${slot}" aria-label="Advertisement"><span>Advertisement</span></div>`;
}

function navGames(today, activeId) {
  return GAMES.map((game) => {
    const active = game.id === activeId ? " is-active" : "";
    return `<a class="nav-game${active}" href="${gameHref(game)}">
      <span class="nav-icon">${iconSvg(game.id)}</span>
      <span class="nav-copy"><strong>${game.name}</strong><em>${game.blurb}</em><small>${statusFor(game.id, today)}</small></span>
    </a>`;
  }).join("");
}

function howLinks() {
  const pages = [
    ["sauce-pipes", "Sauce Pipes rules"],
    ["pasta-pips", "Pasta Pips rules"],
    ["ravioli", "Ravioli rules"],
    ["slip", "Slip rules"],
    ["twirl", "Twirl rules"],
    ["even-bowls", "Even Bowls rules"],
  ];
  return pages.map(([slug, label]) => `<a href="/how-to-play/${slug}/">${label}</a>`).join("");
}

function shell({ activeId, page }) {
  const today = todayString();
  const file = currentFile();
  const games = navGames(today, activeId);
  const link = (href, label) => `<a href="${href}"${file === href ? ' aria-current="page"' : ""}>${label}</a>`;
  return `
    <header class="topbar">
      <button type="button" class="menu-btn" id="menu-open" aria-label="Open menu" aria-expanded="false">Menu</button>
      <a class="brand" href="/"><img class="logo-mark" src="/logo-mark.svg" alt="">SPIQUIZZY</a>
      <span class="top-spacer" aria-hidden="true"></span>
    </header>
    <div class="frame">
      <aside class="sidebar">
        <p class="side-kicker">${formatLong(today)}</p>
        <nav class="side-games" aria-label="Games">${games}</nav>
        <nav class="side-links" aria-label="More">
          ${link("/games/", "All games")}
          ${link("/archive/", "Archive")}
          ${link("/about/", "About")}
          ${link("/privacy/", "Privacy")}
          ${link("/cookies/", "Cookies")}
          ${link("/terms/", "Terms")}
          ${howLinks()}
        </nav>
        ${activeId ? adSlot("game_desktop_sidebar") : ""}
      </aside>
      <div class="backdrop" id="backdrop" hidden></div>
      <aside class="drawer" id="drawer" inert aria-hidden="true" aria-label="Menu">
        <div class="drawer-head">
          <strong>Spiquizzy</strong>
          <button type="button" id="menu-close" aria-label="Close menu">Close</button>
        </div>
        <nav class="side-games">${games}</nav>
        <nav class="side-links">
          ${link("/games/", "All games")}
          ${link("/archive/", "Archive")}
          ${link("/about/", "About")}
          ${link("/privacy/", "Privacy")}
          ${link("/cookies/", "Cookies")}
          ${link("/terms/", "Terms")}
          ${howLinks()}
        </nav>
      </aside>
      <main class="stage" id="stage"></main>
    </div>`;
}

function bindDrawer() {
  const drawer = document.querySelector("#drawer");
  const backdrop = document.querySelector("#backdrop");
  const open = document.querySelector("#menu-open");
  const close = document.querySelector("#menu-close");
  const set = (on) => {
    drawer.classList.toggle("is-open", on);
    drawer.inert = !on;
    drawer.setAttribute("aria-hidden", on ? "false" : "true");
    backdrop.hidden = !on;
    open.setAttribute("aria-expanded", on ? "true" : "false");
  };
  open.addEventListener("click", () => set(true));
  close.addEventListener("click", () => set(false));
  backdrop.addEventListener("click", () => set(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") set(false);
  });
}

function mountChrome(activeId, { home = false } = {}) {
  document.body.classList.toggle("is-home", home);
  document.body.classList.toggle("is-play", !home && Boolean(activeId));
  const app = document.querySelector("#app");
  app.innerHTML = shell({ activeId });
  bindDrawer();
}

const iconBtn = (label, extra = "") =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

function sheetClose(id) {
  return `<button type="button" id="${id}" class="sheet-x" aria-label="Close">${iconBtn("Close")}</button>`;
}

function resultsSheet(game, run) {
  const next = nextGame(game);
  const word = plural(game.noun, run?.moves || 0);
  const streak = loadStats(game.id).streak || 0;
  return `
    <dialog id="win" class="sheet">
      ${sheetClose("win-close")}
      <div class="mascot mascot-sm">${wombatSvg("win")}</div>
      <div class="pasta-burst" id="win-burst" aria-hidden="true">${pastaBurstHtml()}</div>
      <h2 id="win-title">SOLVED!</h2>
      <p id="win-time" class="win-time">${formatTime(run?.seconds || 0)}</p>
      <p class="trophy-row"><span class="trophy">${trophySvg()}</span><span id="rank-line" class="rank-line">Checking today's times…</span></p>
      <ul class="done-stats" id="win-stats">
        <li>${run?.moves || 0} ${word}</li>
        ${streak > 0 ? `<li>Streak ${streak}</li>` : ""}
      </ul>
      ${adSlot("results_rectangle")}
      <p id="win-detail">${game.cheer}</p>
      <div class="sheet-actions">
        <button type="button" id="share" class="btn btn-basil">Share</button>
        <button type="button" id="win-share" class="sr-only">Share</button>
        <a id="win-next" class="btn btn-tomato" href="${next.href}">Next: ${next.name}</a>
      </div>
    </dialog>`;
}

function helpSheet(game) {
  return `
    <dialog id="how" class="sheet">
      ${sheetClose("how-close")}
      <div class="how-head">
        <div class="mascot mascot-sm">${wombatSvg("think")}</div>
        <div>
          <p class="kicker">${game.kicker}</p>
          <h2>How to play</h2>
        </div>
      </div>
      <p class="goal">${game.goal}</p>
      <div class="how-clip">${clipHtml(game.id)}</div>
      <div class="how-list">${HELP[game.id] || ""}</div>
      <p class="how-more"><a href="/how-to-play/${game.slug}/">Full rules for ${game.name}</a></p>
    </dialog>`;
}

function diffButtons(pressed) {
  return DIFFICULTIES.map((name) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `<button type="button" data-diff="${name}" aria-pressed="${name === pressed ? "true" : "false"}">${label}</button>`;
  }).join("");
}

function gameStage(game, diff) {
  return `
    <article class="play">
      <header class="play-bar">
        <a class="icon-btn" href="/" aria-label="Back to games"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <h1 class="play-title">${game.name}</h1>
        <button type="button" id="how-open" class="icon-btn" aria-label="How to play">?</button>
        <button type="button" id="settings-open" class="icon-btn" aria-label="Settings"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      </header>
      <p id="when" class="when"></p>
      <div class="hud">
        <p id="stat-line">Ready</p>
        <p id="timer">0:00</p>
        <button type="button" id="pause" class="pill" aria-pressed="false">Pause</button>
      </div>
      <p id="solved-flag" class="solved-flag" hidden>Solved</p>
      <p id="archive-note" class="archive-note" hidden></p>
      <p class="rule-bar" id="rule">${game.goal}</p>
      <div class="note-row"><p id="note" class="note"></p><div class="react" id="react" hidden></div></div>
      <div class="board-slot"><div id="board" class="board"></div></div>
      <div class="pause-screen"><p>Paused</p><button type="button" id="resume" class="btn btn-tomato">Resume</button></div>
      <div class="action-bar">
        <button type="button" id="undo" class="pill pill-undo" disabled>Undo</button>
        <button type="button" id="reset" class="pill pill-reset">Reset</button>
        <button type="button" id="hint" class="pill pill-hint">Hint</button>
      </div>
      ${adSlot("game_below_banner")}
    </article>
    <p id="live" class="sr-only" aria-live="polite"></p>
    ${helpSheet(game)}
    <dialog id="settings" class="sheet">
      ${sheetClose("settings-close")}
      <h2>Settings</h2>
      <p class="goal">Difficulty changes today's board.</p>
      <div class="diffs" role="group" aria-label="Difficulty">${diffButtons(diff)}</div>
    </dialog>
    ${resultsSheet(game, { moves: 0, seconds: 0 })}
    <div id="toast" class="toast" hidden></div>`;
}

function puzzleDate() {
  const params = new URLSearchParams(location.search);
  const today = todayString();
  const requested = params.get("date");
  if (isValidDate(requested) && compareDates(requested, today) <= 0) return requested;
  return today;
}

function initialDiff(gameId) {
  const requested = new URLSearchParams(location.search).get("diff");
  if (DIFFICULTIES.includes(requested)) return requested;
  const stored = getStorage().getItem(diffKey(gameId));
  return DIFFICULTIES.includes(stored) ? stored : "easy";
}

function countdownText() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const minutes = Math.max(1, Math.round((next - now) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `A new puzzle in ${rest} minutes.`;
  return `A new puzzle in ${hours} hours ${rest} minutes.`;
}

function nextGame(game) {
  const index = GAMES.findIndex((item) => item.id === game.id);
  return GAMES[(index + 1) % GAMES.length];
}

function doneStage(game, run, diff) {
  const choices = DIFFICULTIES.map((name) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `<button type="button" data-diff="${name}" aria-pressed="${name === diff ? "true" : "false"}">${label}</button>`;
  }).join("");
  const next = nextGame(game);
  const word = plural(game.noun, run.moves || 0);
  return `
    <section class="done">
      <div class="mascot mascot-win">${wombatSvg("win")}</div>
      <div class="pasta-burst" aria-hidden="true">${pastaBurstHtml()}</div>
      <p class="done-kicker">${game.cheer}</p>
      <h1 class="game-name">You solved today's puzzle</h1>
      <p class="goal">${game.name}. ${game.goal}</p>
      <ul class="done-stats">
        <li>${run.moves} ${word}</li>
        <li>${formatTime(run.seconds || 0)}</li>
      </ul>
      <p id="rank-line" class="rank-line">Checking today's times…</p>
      <p class="countdown">${countdownText()}</p>
      <div class="diffs" role="group" aria-label="Difficulty">${choices}</div>
      <a class="btn btn-tomato" href="${next.href}">Next game: ${next.name}</a>
      <button type="button" class="tool" id="play-again">Play this one again</button>
    </section>`;
}

function introStage(game, { diff, cta, date }) {
  return `
    <section class="splash ${game.cart}">
      <a class="icon-btn splash-back" href="/" aria-label="Back to games"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <div class="splash-body">
        <div class="splash-icon">${iconSvg(game.id)}</div>
        <h1 class="game-name">${game.name}</h1>
        <p class="goal">${game.goal}</p>
        <div class="diffs" role="group" aria-label="Difficulty">${diffButtons(diff)}</div>
        <button type="button" class="btn btn-play" id="start-game">${cta}</button>
        <p class="byline">${formatShort(date)} · Puzzle ${puzzleNumber(date)}</p>
        <div class="clip-wrap">
          <button type="button" id="clip-replay" class="help-btn" aria-label="Replay how to play">?</button>
          ${clipHtml(game.id)}
        </div>
      </div>
    </section>`;
}

function paintRank(game, diff, run) {
  const line = document.querySelector("#rank-line");
  if (!line) return;
  submitAndRank({
    slug: game.slug,
    difficulty: diff,
    date: puzzleDate(),
    seconds: run.seconds || 0,
    moves: run.moves || 0,
  }).then((rank) => {
    if (!line.isConnected) return;
    const text = rankMessage(rank, run.seconds);
    if (!text) {
      line.hidden = true;
      return;
    }
    line.textContent = text;
  });
}

export function openHome() {
  const today = todayString();
  const main = gameById(PRIMARY_GAME);
  document.title = "Spiquizzy · Daily pasta puzzles";
  mountChrome(null, { home: true });
  const cards = GAMES.filter((game) => game.id !== main.id).map((game) => {
    const stats = loadStats(game.id);
    const streak = stats.streak || 0;
    const streakBit = streak > 0 ? `<span>Streak ${streak}</span>` : "";
    return `<a class="hub-card ${game.cart}" href="${game.href}">
      <span class="hub-icon">${iconSvg(game.id)}</span>
      <span class="hub-copy"><strong>${game.name}</strong><em>${game.blurb}</em></span>
      <span class="hub-meta"><span>${statusFor(game.id, today)}</span>${streakBit}</span>
    </a>`;
  }).join("");
  document.querySelector("#stage").innerHTML = `
    <section class="home-hub">
      <header class="hero-hub">
        <div class="mascot mascot-hero">${wombatSvg("ready")}</div>
        <h1 class="hero-line">Today's pasta puzzles</h1>
        <p class="hero-when">${formatLong(today)}, puzzle ${puzzleNumber(today)}</p>
      </header>
      <a class="feature-card" href="${main.href}">
        <div class="feature-icon">${iconSvg(main.id)}</div>
        <div>
          <p class="kicker">Today's main game</p>
          <h1 class="game-name">${main.name}</h1>
          <p class="goal">${main.blurb}</p>
        </div>
        <span class="btn btn-play">Play</span>
      </a>
      <h2 class="hub-title">All games</h2>
      <div class="hub-grid">${cards}</div>
      <nav class="hub-links" aria-label="More">
        <a href="/archive/">Archive</a>
        <a href="/about/">About</a>
      </nav>
    </section>`;
}

export async function openGame(gameId) {
  const game = gameById(gameId) || gameById(PRIMARY_GAME);
  document.title = `${game.name} · Spiquizzy`;
  mountChrome(game.id);
  let diff = initialDiff(game.id);
  const stage = document.querySelector("#stage");

  function showEntry() {
    const run = loadRun(game.id, diff, puzzleDate());
    if (run?.won) {
      stage.innerHTML = `${introStage(game, { diff, cta: "Play again", date: puzzleDate() })}${resultsSheet(game, run)}<div id="toast" class="toast" hidden></div>`;
      const dialog = document.querySelector("#win");
      dialog?.showModal();
      document.querySelector("#win-close")?.addEventListener("click", () => dialog.close());
      document.querySelector("#start-game")?.addEventListener("click", () => {
        clearRun(game.id, diff, puzzleDate());
        location.reload();
      });
      stage.querySelectorAll("[data-diff]").forEach((button) => {
        button.addEventListener("click", () => {
          diff = button.dataset.diff;
          showEntry();
        });
      });
      document.querySelector("#play-again")?.addEventListener("click", () => {
        clearRun(game.id, diff, puzzleDate());
        location.reload();
      });
      document.querySelector("#share")?.addEventListener("click", async () => {
        const status = await shareResult({
          title: game.name,
          date: puzzleDate(),
          diff,
          noun: game.noun,
          moves: run.moves,
          par: run.par,
          seconds: run.seconds,
          rank: document.querySelector("#rank-line")?.textContent || "",
        });
        const toast = document.querySelector("#toast");
        if (toast && status !== "cancel") {
          toast.hidden = false;
          toast.textContent = status === "failed" ? "Could not copy" : status === "shared" ? "Shared" : "Copied results";
        }
      });
      paintRank(game, diff, run);
      return;
    }
    const cta = run && run.moves > 0 ? "Continue" : "Play";
    stage.innerHTML = introStage(game, { diff, cta, date: puzzleDate() });
    stage.querySelectorAll("[data-diff]").forEach((button) => {
      button.addEventListener("click", () => {
        diff = button.dataset.diff;
        showEntry();
      });
    });
    document.querySelector("#clip-replay")?.addEventListener("click", () => {
      restartClip(stage);
    });
    document.querySelector("#start-game").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      const url = new URL(location.href);
      url.searchParams.set("diff", diff);
      history.replaceState(null, "", url);
      getStorage().setItem(diffKey(game.id), diff);
      stage.innerHTML = gameStage(game, diff);
      const mod = await LOADERS[game.id]();
      if (typeof mod.mount === "function") mod.mount();
      track("play");
      document.querySelector("#how-open")?.addEventListener("click", () => {
        restartClip(document.querySelector("#how"));
      });
      const how = document.querySelector("#how");
      const seenKey = `spquizzy.how.v1:${game.id}`;
      if (how && !getStorage().getItem(seenKey)) {
        restartClip(how);
        how.showModal();
        how.addEventListener("close", () => getStorage().setItem(seenKey, "1"), { once: true });
      }
    });
  }

  showEntry();
}

export function openDirectory() {
  document.title = "All games · Spiquizzy";
  mountChrome(null);
  const today = todayString();
  document.querySelector("#stage").innerHTML = `
    <header class="page-intro">
      <h1 class="game-name">All games</h1>
      <p class="lede">Six plates, same every day. Pick whichever you are hungry for.</p>
    </header>
    <section class="game-grid">
      ${GAMES.map((game) => `<article class="game-card">
        <div class="card-top">
          <div class="icon-slot">${iconSvg(game.id)}</div>
          <div>
            <h2>${game.name}</h2>
            <p class="goal">${game.goal}</p>
          </div>
        </div>
        <p class="card-meta"><span>${statusFor(game.id, today)}</span>${(loadStats(game.id).streak || 0) > 0 ? `<span class="streak">Streak ${loadStats(game.id).streak}</span>` : ""}</p>
        <a class="btn btn-play" href="${game.href}">Play</a>
      </article>`).join("")}
    </section>`;
}

export function openArchive() {
  document.title = "Archive of free daily puzzles | Spiquizzy";
  const copy = document.querySelector("#static-copy");
  const html = copy?.innerHTML || `<h1 class="game-name">Archive</h1><p class="lede">Past plates, still warm. Easy, Medium and Hard light up when that difficulty is cleared on this device.</p>`;
  mountChrome(null);
  document.querySelector("#stage").innerHTML = `
    <article class="page-intro">${html}</article>
    <form class="jump"><label for="jump">Jump to a date</label><input id="jump" type="text" inputmode="numeric" placeholder="dd/mm/yyyy" autocomplete="off" spellcheck="false"></form>
    <div id="shelves"></div>`;
  renderArchive(document.querySelector("#shelves"), document.querySelector("#jump"));
}

export function openAbout() {
  document.title = "About Spiquizzy, free daily puzzle games";
  const copy = document.querySelector("#static-copy");
  const html = copy?.innerHTML || `<h1 class="game-name">About</h1><p class="lede">Spiquizzy is six daily pasta puzzles and one wombat who takes sauce seriously.</p>`;
  mountChrome(null);
  document.querySelector("#stage").innerHTML = `<article class="page-intro about">${html}</article>`;
  document.querySelectorAll("[data-contact]").forEach((el) => {
    el.textContent = CONTACT_EMAIL;
    if (el.tagName === "A") el.href = `mailto:${CONTACT_EMAIL}`;
  });
}
