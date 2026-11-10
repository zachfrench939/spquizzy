import { ADSENSE_CLIENT, PRIMARY_GAME } from "./config.js";
import { GAMES, DIFFICULTIES, gameById } from "./catalog.js";
import { HELP } from "./help.js";
import { loadStats, loadRun, clearRun, todayString, formatLong, formatTime, plural, isValidDate, compareDates, diffKey, getStorage } from "./core.js";
import { iconSvg } from "./art.js";
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

function adSlot(slot, className = "") {
  return `<aside class="ad-slot ${className}" data-slot="${slot}" data-ad-client="${ADSENSE_CLIENT}" aria-label="Advertisement"><span>Ad</span></aside>`;
}

function navGames(today, activeId) {
  return GAMES.map((game) => {
    const active = game.id === activeId ? " is-active" : "";
    return `<a class="nav-game${active}" href="${gameHref(game)}">
      <span class="nav-icon">${iconSvg(game.id)}</span>
      <span class="nav-copy"><strong>${game.name}</strong><small>${statusFor(game.id, today)}</small></span>
    </a>`;
  }).join("");
}

function shell({ activeId, page }) {
  const today = todayString();
  const file = currentFile();
  const games = navGames(today, activeId);
  const link = (href, label) => `<a href="${href}"${file === href ? ' aria-current="page"' : ""}>${label}</a>`;
  return `
    <header class="topbar">
      <button type="button" class="menu-btn" id="menu-open" aria-label="Open menu" aria-expanded="false">Menu</button>
      <a class="brand" href="index.html">SPIQUIZZY</a>
      <span class="top-spacer" aria-hidden="true"></span>
    </header>
    <div class="frame">
      <aside class="sidebar">
        <p class="side-kicker">${formatLong(today)}</p>
        <nav class="side-games" aria-label="Games">${games}</nav>
        <nav class="side-links" aria-label="More">
          ${link("games.html", "All games")}
          ${link("archive.html", "Archive")}
          ${link("about.html", "About")}
        </nav>
        <div id="side-ad"></div>
      </aside>
      <div class="backdrop" id="backdrop" hidden></div>
      <aside class="drawer" id="drawer" aria-hidden="true" aria-label="Menu">
        <div class="drawer-head">
          <strong>Spiquizzy</strong>
          <button type="button" id="menu-close" aria-label="Close menu">Close</button>
        </div>
        <nav class="side-games">${games}</nav>
        <nav class="side-links">
          ${link("games.html", "All games")}
          ${link("archive.html", "Archive")}
          ${link("about.html", "About")}
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

function mountChrome(activeId) {
  const app = document.querySelector("#app");
  app.innerHTML = shell({ activeId });
  bindDrawer();
}

function gameStage(game) {
  return `
    <article class="play">
      <div class="play-head">
        <div>
          <p id="when" class="when"></p>
          <h1 class="game-name">${game.name}</h1>
          <p class="goal">${game.goal}</p>
        </div>
        <button type="button" id="how-open" class="help-btn" aria-label="How to play">?</button>
      </div>
      <div class="diffs" role="group" aria-label="Difficulty">
        <button type="button" data-diff="easy">Easy</button>
        <button type="button" data-diff="medium">Medium</button>
        <button type="button" data-diff="hard">Hard</button>
      </div>
      <div class="hud">
        <p id="stat-line">Ready</p>
        <p id="timer">0:00</p>
      </div>
      <p id="solved-flag" class="solved-flag" hidden>Solved</p>
      <p id="archive-note" class="archive-note" hidden></p>
      <p id="note" class="note"></p>
      <div id="board" class="board"></div>
      ${adSlot("below-board", "ad-below")}
      <div class="tool-row">
        <button type="button" id="reset" class="tool">Reset</button>
        <button type="button" id="share" class="tool" disabled>Share</button>
      </div>
    </article>
    <p id="live" class="sr-only" aria-live="polite"></p>
    <dialog id="how">
      <h2>How to play</h2>
      <p class="goal">${game.goal}</p>
      <div class="how-list">${HELP[game.id] || ""}</div>
      <div class="actions"><button type="button" id="how-close" class="btn btn-tomato">Got it</button></div>
    </dialog>
    <dialog id="win">
      <div class="burst" id="win-burst" aria-hidden="true"></div>
      <h2 id="win-title">Plated</h2>
      <p id="win-detail"></p>
      ${adSlot("result", "ad-result")}
      <div class="actions">
        <button type="button" id="win-share" class="btn btn-basil">Share</button>
        <button type="button" id="win-close" class="btn">Close</button>
      </div>
    </dialog>
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
      <div class="intro-icon">${iconSvg(game.id)}</div>
      <p class="done-kicker">Solved</p>
      <h1 class="game-name">You solved today's puzzle</h1>
      <p class="goal">${game.name}. ${game.goal}</p>
      <ul class="done-stats">
        <li>${run.moves} ${word}</li>
        <li>Goal ${run.par}</li>
        <li>${formatTime(run.seconds || 0)}</li>
      </ul>
      <p class="countdown">${countdownText()}</p>
      <div class="diffs" role="group" aria-label="Difficulty">${choices}</div>
      <a class="btn btn-tomato" href="${next.href}">Next game: ${next.name}</a>
      <button type="button" class="tool" id="play-again">Play this one again</button>
    </section>`;
}

function introStage(game, { landing, diff, cta }) {
  const choices = DIFFICULTIES.map((name) => {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return `<button type="button" data-diff="${name}" aria-pressed="${name === diff ? "true" : "false"}">${label}</button>`;
  }).join("");
  return `
    <section class="intro">
      <div class="intro-icon">${iconSvg(game.id)}</div>
      <h1 class="game-name">${game.name}</h1>
      <p class="goal">${game.goal}</p>
      <div class="diffs" role="group" aria-label="Difficulty">${choices}</div>
      <button type="button" class="btn btn-tomato" id="start-game">${cta}</button>
      ${landing ? "" : adSlot("intro", "ad-intro")}
    </section>`;
}

export async function openGame(gameId) {
  const game = gameById(gameId) || gameById(PRIMARY_GAME);
  const landing = currentFile() === "index.html";
  document.title = landing ? "Spiquizzy · Daily pasta puzzles" : `${game.name} · Spiquizzy`;
  mountChrome(game.id);
  let diff = initialDiff(game.id);
  const stage = document.querySelector("#stage");

  function showEntry() {
    const run = loadRun(game.id, diff, puzzleDate());
    if (run?.won) {
      stage.innerHTML = doneStage(game, run, diff);
      stage.querySelectorAll("[data-diff]").forEach((button) => {
        button.addEventListener("click", () => {
          diff = button.dataset.diff;
          showEntry();
        });
      });
      document.querySelector("#play-again").addEventListener("click", () => {
        clearRun(game.id, diff, puzzleDate());
        location.reload();
      });
      return;
    }
    const cta = run && run.moves > 0 ? "Continue" : "Play now";
    stage.innerHTML = introStage(game, { landing, diff, cta });
    stage.querySelectorAll("[data-diff]").forEach((button) => {
      button.addEventListener("click", () => {
        diff = button.dataset.diff;
        showEntry();
      });
    });
    document.querySelector("#start-game").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      const url = new URL(location.href);
      url.searchParams.set("diff", diff);
      history.replaceState(null, "", url);
      getStorage().setItem(diffKey(game.id), diff);
      stage.innerHTML = gameStage(game);
      const side = document.querySelector("#side-ad");
      if (side) side.innerHTML = adSlot("sidebar", "ad-side");
      const mod = await LOADERS[game.id]();
      if (typeof mod.mount === "function") mod.mount();
      const how = document.querySelector("#how");
      const seenKey = `spquizzy.how.v1:${game.id}`;
      if (how && !getStorage().getItem(seenKey)) {
        how.showModal();
        how.addEventListener("close", () => getStorage().setItem(seenKey, "1"), { once: true });
      }
      document.querySelector("#win")?.addEventListener("close", () => {
        const finished = loadRun(game.id, diff, puzzleDate());
        if (finished?.won) showEntry();
      });
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
        <p class="card-meta"><span>${statusFor(game.id, today)}</span><span class="streak">Streak ${loadStats(game.id).streak || 0}</span></p>
        <a class="btn btn-tomato" href="${game.href}">Play</a>
      </article>`).join("")}
    </section>`;
}

export function openArchive() {
  document.title = "Archive · Spiquizzy";
  mountChrome(null);
  document.querySelector("#stage").innerHTML = `
    <header class="page-intro">
      <h1 class="game-name">Archive</h1>
      <p class="lede">Past plates, still warm. E, M, and H light up when that difficulty is cleared on this device.</p>
    </header>
    <form class="jump"><label for="jump">Jump to a date</label><input id="jump" type="date"></form>
    <div id="shelves"></div>`;
  renderArchive(document.querySelector("#shelves"), document.querySelector("#jump"));
}

export function openAbout() {
  document.title = "About · Spiquizzy";
  mountChrome(null);
  document.querySelector("#stage").innerHTML = `
    <article class="page-intro about">
      <h1 class="game-name">About</h1>
      <p class="lede">Spiquizzy is six daily pasta puzzles and one wombat who takes sauce seriously.</p>
      <p>Everyone on the same local date gets the same board. Easy, medium, and hard are three sizes of that day. Streaks and half-finished games stay on this device. There is no account.</p>
      <p>The puzzle at the front door is set in <code>js/config.js</code> as <code>PRIMARY_GAME</code>. It is Sauce Pipes unless that line says otherwise.</p>
      <p><a class="btn" href="index.html">Today's puzzle</a></p>
    </article>`;
}
