import { LAUNCH_DATE } from "../config.js";
import { captureHashSession, clearSession, forfeitRun, lockIn, oauthUrl, readSession, sendMagicLink, serveQuestion } from "./api.js";
import { addRest, allIn, canManualLock, QUESTION_MS, timeoutCoins } from "./rules.js";

const COIN = "/assets/drop/coin-fusilli-64.png";
const BANK = "/assets/drop/bank-stack-64.png";
const LOGO = "/assets/drop/logo-red.png";
const LETTERS = ["A", "B", "C", "D"];
const FILLS = ["white", "cheese", "mint", "pink"];
const RUN_KEY = "spquizzy.drop.run";
const BANK_KEY = "spquizzy.drop.bank";
const HOW_KEY = "spquizzy.drop.howto";
const SET_KEY = "spquizzy.drop.settings";
const CONSENT_KEY = "spquizzy.consent";

const ROUTES = {
  "/": "home",
  "/play/": "play",
  "/how-to-play/": "howto",
  "/leagues/": "league",
  "/bank/": "bank",
  "/profile/": "profile",
  "/sign-in/": "signin",
  "/plus/": "plus",
  "/settings/": "settings",
  "/404.html": "missing",
};

const EXAMPLE = [
  [1, "Alex P.", 28], [2, "Sam T.", 24], [3, "Jordan K.", 23], [4, "Riley M.", 22], [5, "Chris L.", 21],
  [6, "Pat O.", 20], [7, "Morgan S.", 19], [8, "You", 18], [9, "Jamie B.", 17], [10, "Taylor R.", 16],
  [11, "Avery N.", 15], [12, "Quinn H.", 14], [13, "Drew C.", 13], [14, "Casey F.", 12], [15, "Reese W.", 11],
  [16, "Skyler D.", 10], [17, "Cameron V.", 9], [18, "Harper J.", 8], [19, "Rowan E.", 7], [20, "Frankie Z.", 6],
  [21, "Elliot A.", 5], [22, "Noah P.", 5], [23, "Ivy S.", 4], [24, "Blake Y.", 3], [25, "Parker U.", 3],
  [26, "Shawn I.", 2], [27, "Leslie G.", 2], [28, "Dana X.", 1], [29, "Kerry Q.", 1], [30, "Guest 30", 0],
];

const app = document.querySelector("#app");
const params = new URLSearchParams(location.search);
const SHOT = params.get("shot");
let pack = null;
let session = captureHashSession() || readSession();
let settings = loadSettings();
let bank = loadBank();
let run = null;
let selectedId = null;
let selectedDoor = null;
let drag = null;
let floater = null;
let timerId = 0;
let audioCtx = null;
let howtoStep = 0;
let offline = true;

function londonToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatLong(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(dt);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(dt);
  return `${weekday} ${d} ${month} ${y}`;
}

function dropNumber(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const [Y, M, D] = LAUNCH_DATE.split("-").map(Number);
  const day = Date.UTC(y, m - 1, d);
  const launch = Date.UTC(Y, M - 1, D);
  return Math.round((day - launch) / 86400000) + 1;
}

function loadSettings() {
  try {
    return { sound: false, motion: false, ...JSON.parse(localStorage.getItem(SET_KEY) || "{}") };
  } catch {
    return { sound: false, motion: false };
  }
}
function saveSettings() {
  localStorage.setItem(SET_KEY, JSON.stringify(settings));
  document.body.classList.toggle("reduce-motion", settings.motion);
}
function loadBank() {
  try {
    return JSON.parse(localStorage.getItem(BANK_KEY) || "") || { balance: 0, days: [] };
  } catch {
    return { balance: 0, days: [] };
  }
}
function saveBank() {
  localStorage.setItem(BANK_KEY, JSON.stringify(bank));
}
function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(RUN_KEY) || "null");
  } catch {
    return null;
  }
}
function saveRun() {
  if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
}
function seenHow() {
  try { return localStorage.getItem(HOW_KEY) === "1" || Boolean(SHOT); } catch { return true; }
}

function todayRun() {
  const today = londonToday();
  const stored = loadRun();
  if (stored && stored.date !== today && stored.status === "in_progress") {
    rememberDay(stored.date, 0, "forfeited");
    localStorage.removeItem(RUN_KEY);
    return null;
  }
  if (stored && stored.date === today) return stored;
  return null;
}

function rememberDay(date, banked, status) {
  bank.days = bank.days.filter((day) => day.date !== date);
  bank.days.push({ date, banked, status });
  if (status === "completed" && banked > 0) bank.balance += banked;
  saveBank();
}

function coinImg(size) {
  const img = document.createElement("img");
  img.src = COIN;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.draggable = false;
  return img;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function reduced() {
  return settings.motion || matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shell() {
  app.replaceChildren();
  const header = el("header", "app-header");
  header.id = "site-header";
  const brand = el("a", "brand");
  brand.href = "/";
  brand.dataset.nav = "home";
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO;
  logo.width = 36;
  logo.height = 36;
  logo.alt = "";
  brand.append(logo, el("span", "wordmark", "Spiquizzy"));
  const nav = el("nav", "header-actions");
  nav.setAttribute("aria-label", "Site");
  for (const [href, label] of [["/how-to-play/", "How to play"], ["/leagues/", "Leagues"], ["/bank/", "Bank"], ["/sign-in/", "Sign in"]]) {
    const link = el("a", "nav-link", label);
    link.href = href;
    nav.append(link);
  }
  const leagues = el("button", "icon-btn mobile-only");
  leagues.type = "button";
  leagues.dataset.nav = "league";
  leagues.setAttribute("aria-label", "Leagues");
  leagues.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4"><path d="M4 20V10M12 20V4M20 20V14"/></svg>`;
  const gear = el("button", "icon-btn mobile-only");
  gear.type = "button";
  gear.dataset.nav = "settings";
  gear.setAttribute("aria-label", "Settings");
  gear.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>`;
  nav.append(leagues, gear);
  header.append(brand, nav);

  const main = el("main");
  main.append(homeView(), playView(), resultsView(), leagueView(), bankView(), profileView(), signinView(), plusView(), settingsView(), missingView());
  app.append(header, main, howtoSheet(), leaveModal(), consentBar());
  app.addEventListener("click", onClick);
  const stage = document.querySelector("#play-stage");
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  window.addEventListener("touchmove", (event) => {
    if (drag) event.preventDefault();
  }, { passive: false });
  document.querySelector("#undo").addEventListener("click", undo);
  document.querySelector("#lock").addEventListener("click", () => { if (canManualLock(run.coins)) lockQuestion(false); });
  document.querySelector("#share").addEventListener("click", share);
  paintHowArt();
}

function homeView() {
  const view = el("section");
  view.id = "view-home";
  const art = el("div", "hero-art");
  const wombat = document.createElement("img");
  wombat.className = "wombat";
  wombat.src = "/assets/drop/wombat-idle.png";
  wombat.alt = "The Spiquizzy wombat";
  wombat.width = 140;
  const plate = el("div", "hero-plate");
  plate.id = "hero-plate";
  for (let i = 0; i < 10; i += 1) plate.append(coinImg(26));
  art.append(wombat, plate);
  const badge = el("span", "sticker cheese");
  badge.id = "drop-badge";
  const title = el("h1", null, "The Daily Drop");
  const date = el("p", "date-line");
  date.id = "home-date";
  const pitch = el("p", "pitch", "Start with 10 coins. Put them on the answers you trust. Only the coins on the right answer go through. Finish all 10 questions to bank what’s left.");
  const endow = el("p", "endow");
  endow.id = "home-endow";
  const cta = el("div", "home-cta");
  const play = el("button", "btn-primary", "Play");
  play.type = "button";
  play.id = "play-btn";
  play.dataset.nav = "play";
  cta.append(play);
  const how = el("button", "btn-ghost howto-link", "How to play");
  how.type = "button";
  how.dataset.nav = "howto";
  const ad = el("aside", "ad-slot");
  ad.setAttribute("aria-label", "Advertisement");
  ad.append(el("span", "ad-label", "Advertisement"), el("span", null, "Reserved"));
  const fine = el("footer", "fine", "Free to play · Same 10 questions for everyone · Resets at midnight UK time");
  view.append(art, el("p", "kicker", "Today’s daily quiz"), badge, title, date, pitch, endow, cta, how, ad, fine);
  return view;
}

function playView() {
  const view = el("section");
  view.id = "view-play";
  view.hidden = true;
  const bar = el("header", "app-header");
  const back = el("button", "icon-btn");
  back.type = "button";
  back.id = "back-play";
  back.setAttribute("aria-label", "Back");
  back.dataset.nav = "home";
  back.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6"><path d="M15 5 8 12l7 7"/></svg>`;
  const brand = el("a", "brand");
  brand.href = "/";
  brand.dataset.nav = "home";
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO;
  logo.alt = "";
  logo.width = 32;
  logo.height = 32;
  brand.append(logo, el("span", "wordmark", "The Daily Drop"));
  const help = el("button", "icon-btn");
  help.type = "button";
  help.dataset.nav = "howto";
  help.setAttribute("aria-label", "How to play");
  help.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M12 10v7"/><circle cx="12" cy="7.5" r="0.9" fill="#111"/></svg>`;
  bar.append(back, brand, help);
  const stage = el("div", "play-stage");
  stage.id = "play-stage";
  const meta = el("div", "meta-row");
  meta.append(el("span", "sticker ink", "Question 1 of 10"));
  meta.firstChild.id = "q-meta";
  const chips = el("div", "bank-row");
  chips.innerHTML = `<span class="chip"><img src="${BANK}" alt=""> Bank <strong id="bank-count">0</strong></span><span class="chip pending"><img src="${COIN}" alt=""> Pending <strong id="pending-count">10</strong></span>`;
  const finish = el("p", "finish-line");
  finish.innerHTML = `<span>Finish all 10 to bank your coins</span>`;
  const offlineNote = el("p", "offline-note", "Offline, not ranked");
  offlineNote.id = "offline-note";
  offlineNote.hidden = true;
  const question = el("h2");
  question.id = "q-text";
  const timer = el("div", "timer-bar");
  timer.id = "timer-bar";
  timer.innerHTML = `<div class="fill" id="timer-fill"></div><span class="timer-readout" id="timer-readout">20 seconds</span>`;
  const board = el("div", "board");
  board.id = "doors";
  board.setAttribute("aria-label", "Answers");
  const tray = el("div", "tray");
  tray.id = "tray";
  tray.setAttribute("aria-label", "Unplaced coins");
  const adjust = el("div", "adjust");
  adjust.id = "adjust";
  const minus = el("button", "step", "−");
  minus.type = "button";
  minus.dataset.dir = "-1";
  minus.setAttribute("aria-label", "Remove a coin");
  const label = el("span", "adjust-label", "Answer A");
  label.id = "adjust-label";
  const plus = el("button", "step", "+");
  plus.type = "button";
  plus.dataset.dir = "1";
  plus.setAttribute("aria-label", "Add a coin");
  adjust.append(minus, label, plus);
  const hint = el("p", "hint");
  hint.id = "lock-hint";
  const actions = el("div", "play-actions");
  const lock = el("button", "btn-lock", "Lock in");
  lock.type = "button";
  lock.id = "lock";
  lock.disabled = true;
  const undoBtn = el("button", "btn-ghost", "Undo");
  undoBtn.type = "button";
  undoBtn.id = "undo";
  undoBtn.disabled = true;
  actions.append(lock, undoBtn);
  const banner = el("div", "status-banner", "4 SAFE");
  banner.id = "status-banner";
  banner.setAttribute("role", "status");
  stage.append(meta, chips, finish, offlineNote, question, timer, board, tray, adjust, hint, actions);
  view.append(bar, stage, banner);
  return view;
}

function resultsView() {
  const view = el("section");
  view.id = "view-results";
  view.hidden = true;
  const wombat = document.createElement("img");
  wombat.className = "wombat";
  wombat.id = "result-wombat";
  wombat.alt = "";
  wombat.width = 130;
  const title = el("h1");
  title.id = "result-title";
  const sub = el("p");
  sub.id = "result-sub";
  const card = el("div", "share-card");
  const who = el("div", "who");
  who.id = "share-who";
  const trail = el("div", "trail");
  trail.id = "share-grid";
  const banked = el("div", "banked-line");
  banked.id = "banked-line";
  card.append(who, trail, banked);
  const snip = el("div", "league-snip");
  snip.id = "league-snip";
  const count = el("p", "countdown");
  count.id = "countdown";
  const share = el("button", "btn-share", "Share");
  share.type = "button";
  share.id = "share";
  const ad = el("aside", "ad-slot");
  ad.setAttribute("aria-label", "Advertisement");
  ad.append(el("span", "ad-label", "Advertisement"), el("span", null, "Reserved"));
  const plus = el("a", "btn-ghost", "Skip ads with Spiquizzy Plus");
  plus.href = "/plus/";
  view.append(wombat, title, sub, card, snip, count, share, ad, plus);
  return view;
}

function leagueView() {
  const view = el("section", "page");
  view.id = "view-league";
  view.hidden = true;
  view.append(el("div", "example-banner", "Example data — not live scores"));
  view.append(el("h1", null, "Weekly league"));
  const tabs = el("div", "tabs");
  tabs.id = "league-tabs";
  for (const name of ["Weekly", "Monthly", "Yearly", "All-time"]) {
    const button = el("button", null, name);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", name === "Weekly" ? "true" : "false");
    tabs.append(button);
  }
  const meta = el("p", "league-meta");
  meta.id = "league-meta";
  const key = el("p", "zone-key");
  key.innerHTML = `<span><i class="up"></i> Top 10 promote</span><span><i class="down"></i> Bottom 10 drop down</span>`;
  const list = el("ol", "rank-list");
  list.id = "rank-list";
  view.append(tabs, meta, key, list, el("p", null, "Leagues reset at 00:00 Europe/London each Monday. Sign in to appear on the public board."));
  return view;
}

function bankView() {
  const view = el("section", "page");
  view.id = "view-bank";
  view.hidden = true;
  view.innerHTML = `<h1>Your bank</h1><p class="endow" style="justify-content:flex-start"><img src="${BANK}" width="48" height="48" alt=""> <strong id="bank-total">0</strong> coins</p><p>Coins move from pending to your bank only after you finish all 10 questions.</p><ul class="history" id="bank-history"></ul><p><a class="btn-ghost" href="/sign-in/">Sign in to keep your bank</a></p>`;
  return view;
}

function profileView() {
  const view = el("section", "page");
  view.id = "view-profile";
  view.hidden = true;
  view.innerHTML = `<h1>Stats</h1><p id="profile-copy"></p><p>Streaks are not part of this version. A zero day is not the only thing the page shows.</p>`;
  return view;
}

function signinView() {
  const view = el("section", "simple-center");
  view.id = "view-signin";
  view.hidden = true;
  view.innerHTML = `<img class="logo" src="${LOGO}" width="64" height="64" alt="Spiquizzy" style="margin:0 auto;border:2px solid #111"><h1>Keep your bank</h1><p style="font-weight:700;margin:0 0 16px">Sign in to keep your bank, join weekly leagues, and play on any device. You can still play today’s drop as a guest.</p><form class="signin-form" id="magic-form"><label for="magic-email">Email</label><input id="magic-email" type="email" autocomplete="email" required><button class="btn-primary" type="submit">Email me a link</button></form><p id="magic-note" style="font-weight:700;margin-top:12px"></p><p style="margin-top:12px"><a class="btn-ghost" id="google-link" href="#">Continue with Google</a></p>`;
  return view;
}

function plusView() {
  const view = el("section", "page");
  view.id = "view-plus";
  view.hidden = true;
  view.innerHTML = `<h1>Spiquizzy Plus</h1><p>The daily drop stays free forever. Plus is the way to skip ads and, later, to open the archive.</p><p class="price">£3.99 a month</p><button class="btn-primary" type="button" disabled>Coming soon</button><p class="price">£39.99 a year</p><button class="btn-primary" type="button" disabled>Coming soon</button><ul style="font-weight:700;line-height:1.6;margin:16px 0 0 18px"><li>Ad-free play</li><li>Archive of past official days</li><li>Practice drops that do not touch the bank</li></ul><p>Payment is not wired up.</p>`;
  return view;
}

function settingsView() {
  const view = el("section", "page");
  view.id = "view-settings";
  view.hidden = true;
  view.innerHTML = `<h1>Settings</h1>
    <div class="tog"><span>Sound</span><button class="switch" type="button" id="set-sound" aria-label="Sound"></button></div>
    <div class="tog"><span>Reduce motion</span><button class="switch" type="button" id="set-motion" aria-label="Reduce motion"></button></div>
    <div class="tog"><span>Safe and Dropped labels stay on</span><button class="switch" type="button" aria-pressed="true" disabled aria-label="Labels"></button></div>
    <p><a href="/privacy/">Privacy and cookies</a></p>
    <p><a href="/plus/">Spiquizzy Plus</a></p>
    <p><button class="btn-danger" type="button" id="clear-local">Clear local data</button></p>`;
  return view;
}

function missingView() {
  const view = el("section", "simple-center");
  view.id = "view-missing";
  view.hidden = true;
  view.innerHTML = `<img class="logo" src="${LOGO}" width="64" height="64" alt="Spiquizzy" style="margin:0 auto;border:2px solid #111"><h1>Page not found</h1><p style="font-weight:700">That page isn’t on Spiquizzy.</p><p><a class="btn-primary" href="/" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">Back to today’s drop</a></p>`;
  return view;
}

function howtoSheet() {
  const back = el("div", "sheet-back");
  back.id = "howto";
  back.hidden = true;
  back.innerHTML = `<div class="sheet" role="dialog" aria-labelledby="howto-title">
    <h2 id="howto-title">How to play</h2>
    <div class="panel" data-panel="0"><p>Each day you get <strong>10 coins</strong> and <strong>20 seconds</strong> on every question. Drag them onto the answers you trust, or use All in and Add rest. You must place every coin, and leave at least one answer empty. When time runs out, coins still in the tray are lost and the rest lock in.</p><div class="panel-art" id="howto-art"></div></div>
    <div class="panel" data-panel="1" hidden><p><strong>Lock in.</strong> Trapdoors under the wrong answers open and those coins fall. Only coins on the right answer go through.</p><div class="panel-art"><span class="sticker ink">✓ Safe</span><span class="sticker" style="background:#111;color:#FFF8E7">↓ Dropped</span></div></div>
    <div class="panel" data-panel="2" hidden><p><strong>Finish all 10 questions to bank what’s left.</strong> If you leave early, or you run out of coins, you bank <strong>0</strong> for the day. Pending coins are not yours until the last question is done.</p><div class="panel-art"><img src="${BANK}" width="48" height="48" alt=""><strong>Banked only after Q10</strong></div></div>
    <div class="dots" id="howto-dots"><span class="on"></span><span></span><span></span></div>
    <div class="sheet-nav"><button class="btn-ghost" type="button" id="howto-prev" hidden>Back</button><button class="btn-keep" type="button" id="howto-next">Next</button></div>
  </div>`;
  return back;
}

function leaveModal() {
  const back = el("div", "modal-back");
  back.id = "leave-modal";
  back.hidden = true;
  back.innerHTML = `<div class="modal" role="dialog" aria-labelledby="leave-title"><h2 id="leave-title">Leave today’s drop?</h2><p>Leave now and you’ll bank 0 coins. You can’t replay today’s official drop.</p><div class="modal-actions"><button class="btn-keep" type="button" id="leave-stay">Keep playing</button><button class="btn-danger" type="button" id="leave-go">Leave</button></div></div>`;
  return back;
}

function consentBar() {
  const bar = el("aside", "consent");
  bar.id = "consent";
  bar.innerHTML = `<p>We only use optional analytics after you agree. Reject is the same size as Accept. Play is never blocked.</p><div class="pair"><button class="reject" type="button" id="consent-no">Reject</button><button class="accept" type="button" id="consent-yes">Accept</button></div>`;
  return bar;
}

function paintHowArt() {
  const art = document.querySelector("#howto-art");
  for (let i = 0; i < 10; i += 1) art.append(coinImg(24));
}

function show(name) {
  for (const id of ["home", "play", "results", "league", "bank", "profile", "signin", "plus", "settings", "missing"]) {
    const node = document.querySelector(`#view-${id}`);
    if (node) node.hidden = id !== name;
  }
  document.querySelector("#site-header").hidden = name === "play";
  if (name === "home") paintHome();
  if (name === "league") paintLeague("Weekly");
  if (name === "bank") paintBank();
  if (name === "profile") paintProfile();
  if (name === "settings") paintSettings();
  if (name === "signin") paintSignin();
  window.scrollTo(0, 0);
}

function currentQuestion() {
  const index = dropNumber(londonToday()) - 1;
  if (!pack || index < 0 || index >= pack.days.length) return null;
  return pack.days[index].questions[run.q];
}

function paintHome() {
  const today = londonToday();
  const number = dropNumber(today);
  document.querySelector("#drop-badge").textContent = number >= 1 && number <= (pack?.packDays || 14) ? `Drop no. ${number}` : "Daily drop";
  document.querySelector("#home-date").textContent = formatLong(today);
  const ended = run && run.date === today && run.status !== "in_progress";
  const button = document.querySelector("#play-btn");
  button.textContent = ended ? "See results" : (run && run.status === "in_progress" ? "Resume" : "Play");
  const stack = document.createElement("img");
  stack.src = BANK;
  stack.alt = "";
  stack.width = 28;
  stack.height = 28;
  const endow = document.querySelector("#home-endow");
  endow.replaceChildren(stack, document.createTextNode(` 10 coins today + bank of ${bank.balance}`));
}

function startOrResume() {
  const today = londonToday();
  const number = dropNumber(today);
  if (!pack || number < 1 || number > pack.packDays) {
    show("home");
    return;
  }
  if (!run || run.date !== today) {
    run = {
      date: today,
      dropNumber: number,
      status: "in_progress",
      q: 0,
      coins: Array.from({ length: 10 }, (_, id) => ({ id, loc: "tray" })),
      history: [10],
      undo: [],
      banked: 0,
      servedAt: Date.now(),
      phase: "question",
    };
    saveRun();
    logEvent("play_start");
  }
  if (run.status !== "in_progress") {
    showResults();
    return;
  }
  if (run.phase === "reveal") {
    finishReveal(true);
    return;
  }
  show("play");
  renderQuestion();
}

function renderQuestion() {
  const item = currentQuestion();
  if (!item) return;
  document.body.classList.remove("is-reveal", "status-out");
  selectedDoor = null;
  document.querySelector("#q-meta").textContent = `Question ${run.q + 1} of 10`;
  document.querySelector("#q-text").textContent = item.q;
  document.querySelector("#bank-count").textContent = String(bank.balance);
  document.querySelector("#pending-count").textContent = String(run.coins.length);
  document.querySelector("#offline-note").hidden = !offline || Boolean(SHOT);
  const doors = document.querySelector("#doors");
  doors.replaceChildren();
  item.answers.forEach((answer, index) => {
    const door = el("div", `door t${index}`);
    door.dataset.i = String(index);
    door.tabIndex = 0;
    const hatch = el("div", "hatch");
    const flap = el("div", "flap");
    const letter = el("span", "letter", LETTERS[index]);
    const name = el("span", "name", answer);
    const plate = el("div", "plate");
    plate.dataset.plate = String(index);
    const quick = el("div", "quick");
    const all = el("button", null, "All in");
    all.type = "button";
    all.dataset.quick = "all";
    all.dataset.i = String(index);
    const rest = el("button", null, "Add rest");
    rest.type = "button";
    rest.dataset.quick = "rest";
    rest.dataset.i = String(index);
    quick.append(all, rest);
    flap.append(letter, name, plate, quick);
    door.append(hatch, flap, el("span", "tag safe", "✓ Safe"), el("span", "tag dropped", "↓ Dropped"));
    doors.append(door);
  });
  if (!run.servedAt) run.servedAt = Date.now();
  saveRun();
  renderCoins();
  const left = Math.max(0, QUESTION_MS - (Date.now() - run.servedAt));
  if (SHOT === "play") startTimer(14000, true);
  else if (SHOT === "urgent") startTimer(3000, true);
  else if (left <= 0) onTimeout();
  else startTimer(left, false);
  if (session) {
    serveQuestion(run.q, session).then((payload) => {
      offline = false;
      document.querySelector("#offline-note").hidden = true;
      if (payload?.servedAt && !SHOT) {
        const elapsed = Date.now() - new Date(payload.servedAt).getTime();
        run.servedAt = Date.now() - elapsed;
        saveRun();
        const remain = Math.max(0, QUESTION_MS - elapsed);
        if (remain <= 0) onTimeout();
        else startTimer(remain, false);
      }
    }).catch(() => {
      offline = true;
      document.querySelector("#offline-note").hidden = false;
    });
  }
}

function renderCoins() {
  document.querySelectorAll(".plate").forEach((plate) => plate.replaceChildren());
  const tray = document.querySelector("#tray");
  tray.replaceChildren();
  const groups = { tray: [] };
  [0, 1, 2, 3].forEach((index) => { groups[index] = []; });
  run.coins.forEach((coin) => groups[coin.loc].push(coin));
  groups.tray.forEach((coin) => tray.append(makeCoin(coin)));
  tray.classList.toggle("is-empty", groups.tray.length === 0);
  [0, 1, 2, 3].forEach((index) => {
    const plate = document.querySelector(`.plate[data-plate="${index}"]`);
    groups[index].forEach((coin) => plate.append(makeCoin(coin)));
    const rest = document.querySelector(`[data-quick="rest"][data-i="${index}"]`);
    if (rest) rest.hidden = groups.tray.length === 0;
  });
  document.querySelector("#pending-count").textContent = String(run.coins.length);
  const lock = document.querySelector("#lock");
  const hint = document.querySelector("#lock-hint");
  const ok = canManualLock(run.coins) && run.phase !== "reveal";
  lock.disabled = !ok;
  document.querySelector("#undo").disabled = !run.undo.length || run.phase === "reveal";
  if (!ok && run.coins.some((coin) => coin.loc === "tray")) hint.textContent = "Place every coin, and leave one answer empty.";
  else if (!ok && emptyDoors() === 0) hint.textContent = "Leave at least one answer empty.";
  else hint.textContent = "";
  const adjust = document.querySelector("#adjust");
  adjust.classList.toggle("is-on", selectedDoor != null && run.phase !== "reveal");
}

function emptyDoors() {
  return 4 - new Set(run.coins.filter((coin) => coin.loc !== "tray").map((coin) => coin.loc)).size;
}

function makeCoin(coin) {
  const node = el("div", "coin-token");
  node.dataset.id = String(coin.id);
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", "Fusilli coin");
  node.append(coinImg(32));
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectedId = coin.id;
    }
  });
  return node;
}

function moveMany(nextCoins) {
  const batch = [];
  nextCoins.forEach((next) => {
    const coin = run.coins.find((item) => item.id === next.id);
    if (coin && coin.loc !== next.loc) batch.push({ id: coin.id, from: coin.loc });
  });
  if (!batch.length) return;
  run.undo.push({ batch });
  run.coins = nextCoins;
  saveRun();
  renderCoins();
}

function undo() {
  const last = run.undo.pop();
  if (!last) return;
  const steps = last.batch || [last];
  steps.forEach((step) => {
    const coin = run.coins.find((item) => item.id === step.id);
    if (coin) coin.loc = step.from;
  });
  saveRun();
  renderCoins();
}

function startTimer(left, frozen) {
  stopTimer();
  const deadline = performance.now() + left;
  const paint = () => {
    const remain = frozen ? left : Math.max(0, deadline - performance.now());
    const bar = document.querySelector("#timer-bar");
    const fill = document.querySelector("#timer-fill");
    if (!bar || !fill) return;
    fill.style.width = `${(remain / QUESTION_MS) * 100}%`;
    bar.classList.toggle("is-urgent", remain <= 5000);
    document.querySelector("#timer-readout").textContent = `${Math.ceil(remain / 1000)} seconds`;
    if (!frozen && remain <= 0) {
      stopTimer();
      onTimeout();
    }
  };
  paint();
  if (frozen) return;
  let last = Math.ceil(left / 1000);
  timerId = window.setInterval(() => {
    const remain = Math.max(0, deadline - performance.now());
    const sec = Math.ceil(remain / 1000);
    if (sec !== last) {
      last = sec;
      if (settings.sound && sec > 0 && sec <= 20) tick();
    }
    paint();
  }, 100);
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = 0;
}

function tick() {
  try {
    const ctx = audioCtx || (audioCtx = new AudioContext());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* sound can be blocked */
  }
}

function onTimeout() {
  if (!run || run.phase === "reveal" || run.status !== "in_progress") return;
  run.coins = timeoutCoins(run.coins);
  if (!run.coins.length) {
    lockQuestion(true, true);
    return;
  }
  lockQuestion(true);
}

async function lockQuestion(timeout, emptyBust = false) {
  if (!run || run.phase === "reveal") return;
  stopTimer();
  run.phase = "reveal";
  const item = currentQuestion();
  const dist = [0, 1, 2, 3].map((index) => run.coins.filter((coin) => coin.loc === index).length);
  let correct = 0;
  let server = null;
  try {
    if (session && !SHOT) {
      server = await lockIn(run.q, dist, timeout, session);
      correct = server.correctIndex;
      offline = false;
    } else throw new Error("local");
  } catch {
    offline = true;
    const res = await fetch(`/data/checks/${item.id}.json`);
    correct = (await res.json()).correct;
  }
  const wiped = emptyBust || server?.pending === 0 && timeout && server?.timedOut && dist.every((count) => count === 0) || run.coins.length === 0 || run.coins.every((coin) => coin.loc !== correct);
  const kept = run.coins.filter((coin) => coin.loc === correct);
  run.reveal = { correct, kept: kept.map((coin) => coin.id), wiped: kept.length === 0, timeout };
  saveRun();
  document.querySelector("#lock").disabled = true;
  document.querySelector("#undo").disabled = true;
  document.querySelectorAll(".door").forEach((door) => {
    const index = Number(door.dataset.i);
    if (index === correct) door.classList.add("is-safe");
    else door.classList.add("is-wrong", "is-open");
  });
  const lost = run.coins.filter((coin) => coin.loc !== correct);
  lost.forEach((coin, index) => {
    const node = document.querySelector(`.coin-token[data-id="${coin.id}"]`);
    if (!node) return;
    const box = node.getBoundingClientRect();
    node.classList.add("is-falling", `mb-fall-${index % 3}`);
    node.style.position = "fixed";
    node.style.left = `${box.left}px`;
    node.style.top = `${box.top}px`;
    node.style.margin = "0";
    document.body.append(node);
  });
  document.body.classList.add("is-reveal");
  const banner = document.querySelector("#status-banner");
  if (!kept.length) {
    document.body.classList.add("status-out");
    banner.textContent = "DROPPED!";
  } else banner.textContent = `${kept.length} SAFE`;
  if (SHOT === "drop") return;
  window.setTimeout(() => finishReveal(false), reduced() ? 400 : 1100);
}

function finishReveal(skipPaint) {
  document.querySelectorAll(".coin-token.is-falling").forEach((node) => node.remove());
  const reveal = run.reveal || { kept: [], wiped: true };
  const kept = run.coins.filter((coin) => reveal.kept.includes(coin.id));
  run.history.push(kept.length);
  run.undo = [];
  run.phase = "question";
  run.servedAt = null;
  if (!kept.length) {
    closeRun(run.q >= 9 ? "completed" : "busted", 0);
    return;
  }
  run.coins = kept.map((coin, id) => ({ id, loc: "tray" }));
  if (run.q >= 9) {
    closeRun("completed", run.coins.length);
    return;
  }
  run.q += 1;
  run.servedAt = Date.now();
  saveRun();
  if (!skipPaint) {
    show("play");
    renderQuestion();
  }
}

function closeRun(status, banked) {
  run.status = status;
  run.banked = banked;
  run.phase = "done";
  rememberDay(run.date, status === "completed" ? banked : 0, status);
  saveRun();
  logEvent(status === "completed" ? "run_completed" : "run_busted", { banked });
  showResults();
}

function forfeit() {
  run.status = "forfeited";
  run.banked = 0;
  run.phase = "done";
  rememberDay(run.date, 0, "forfeited");
  saveRun();
  logEvent("run_forfeited");
  if (session) forfeitRun(session).catch(() => {});
  showResults();
}

function showResults() {
  show("results");
  const cleared = run.status === "completed" && run.banked > 0;
  const wiped = run.status === "completed" && run.banked === 0;
  const left = run.status === "forfeited";
  const wombat = document.querySelector("#result-wombat");
  const title = document.querySelector("#result-title");
  const sub = document.querySelector("#result-sub");
  wombat.src = cleared ? "/assets/drop/wombat-cheering.png" : (wiped ? "/assets/drop/wombat-thinking.png" : "/assets/drop/wombat-sad.png");
  wombat.alt = cleared ? "Cheering wombat" : "Wombat";
  if (cleared) {
    title.textContent = "Banked!";
    sub.textContent = "You finished all 10 questions.";
  } else if (wiped) {
    title.textContent = "All 10, none left";
    sub.textContent = "You finished the drop, but no coins survived the last question.";
  } else if (left) {
    title.textContent = "0 banked";
    sub.textContent = "You left early, so nothing was banked today.";
  } else {
    title.textContent = "Dropped!";
    sub.textContent = "Finish all 10 to bank your coins — so this day banks 0.";
  }
  document.querySelector("#share-who").textContent = `Spiquizzy #${run.dropNumber}`;
  const mid = Math.ceil(run.history.length / 2);
  let trail = `🪙 ${run.history.slice(0, mid).join(" → ")}`;
  if (run.history.length > mid) trail += `\n→ ${run.history.slice(mid).join(" → ")}`;
  if (!cleared && !wiped && !left) trail += ` 💀 Q${run.q + 1}`;
  trail += `\nbanked ${run.banked || 0}`;
  document.querySelector("#share-grid").textContent = trail;
  const line = document.querySelector("#banked-line");
  line.replaceChildren();
  const icon = document.createElement("img");
  icon.src = BANK;
  icon.alt = "";
  icon.width = 36;
  icon.height = 36;
  line.append(icon, document.createTextNode(` Banked ${run.banked || 0}`));
  if (cleared) line.classList.add("banked-anim");
  const snip = document.querySelector("#league-snip");
  snip.textContent = session
    ? "This week in Fusilli League: sign in is on, and live ranks appear once the league tables are applied."
    : "Sign in to keep this bank and join Fusilli League. Guest scores stay on this device.";
  const link = el("a", null, " See the league");
  link.href = "/leagues/";
  snip.append(link);
  tickCountdown();
}

function shareText() {
  const mid = Math.ceil(run.history.length / 2);
  let body = `🪙 ${run.history.slice(0, mid).join(" → ")}`;
  if (run.history.length > mid) body += `\n→ ${run.history.slice(mid).join(" → ")}`;
  if (run.status === "busted") body += ` 💀 Q${run.q + 1}`;
  body += `\nbanked ${run.banked || 0}`;
  return `Spiquizzy #${run.dropNumber}\n${body}\nspiquizzy.com`;
}

async function share() {
  const text = shareText();
  const button = document.querySelector("#share");
  try {
    if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    }
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch { /* ignore */ }
  }
  logEvent("share");
}

function tickCountdown() {
  const node = document.querySelector("#countdown");
  const paint = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    let secs = (23 - Number(parts.hour)) * 3600 + (59 - Number(parts.minute)) * 60 + (60 - Number(parts.second));
    if (secs < 0) secs = 0;
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    node.textContent = hours
      ? `Next drop in ${hours} hour${hours === 1 ? "" : "s"} ${mins} minute${mins === 1 ? "" : "s"}`
      : `Next drop in ${mins} minute${mins === 1 ? "" : "s"}`;
  };
  paint();
  if (!SHOT) window.setInterval(paint, 30000);
}

function paintLeague(which) {
  document.querySelector("#league-meta").textContent = `${which === "Weekly" ? "Fusilli League" : which} · coins banked · example until the server tables are applied`;
  const list = document.querySelector("#rank-list");
  list.replaceChildren();
  EXAMPLE.forEach(([pos, name, score]) => {
    const item = document.createElement("li");
    if (pos <= 10) item.classList.add("zone-up");
    if (pos >= 21) item.classList.add("zone-down");
    if (name === "You") item.classList.add("is-you");
    item.append(el("span", "pos", String(pos)), el("span", null, name), el("span", null, String(score)));
    list.append(item);
  });
}

function paintBank() {
  document.querySelector("#bank-total").textContent = String(bank.balance);
  const list = document.querySelector("#bank-history");
  list.replaceChildren();
  bank.days.slice().reverse().forEach((day) => {
    list.append(el("li", null, ""));
    const item = list.lastChild;
    item.replaceChildren(el("span", null, formatLong(day.date)), el("span", null, `${day.banked} · ${day.status}`));
  });
}

function paintProfile() {
  const played = bank.days.length;
  const best = bank.days.reduce((max, day) => Math.max(max, day.banked), 0);
  document.querySelector("#profile-copy").textContent = `Played ${played}. Bank ${bank.balance}. Best day ${best} banked. Weekly league rank appears when you are signed in and the tables exist.`;
}

function paintSettings() {
  document.querySelector("#set-sound").setAttribute("aria-pressed", settings.sound ? "true" : "false");
  document.querySelector("#set-motion").setAttribute("aria-pressed", settings.motion ? "true" : "false");
}

function paintSignin() {
  const note = document.querySelector("#magic-note");
  note.textContent = session ? "This browser has a sign-in session." : "";
  document.querySelector("#google-link").href = oauthUrl("google");
}

function openHow(step = 0) {
  howtoStep = step;
  document.querySelector("#howto").hidden = false;
  paintHow();
}
function paintHow() {
  document.querySelectorAll("#howto .panel").forEach((panel, index) => { panel.hidden = index !== howtoStep; });
  document.querySelectorAll("#howto-dots span").forEach((dot, index) => dot.classList.toggle("on", index === howtoStep));
  document.querySelector("#howto-prev").hidden = howtoStep === 0;
  document.querySelector("#howto-next").textContent = howtoStep === 2 ? "Got it" : "Next";
}

function onClick(event) {
  const quick = event.target.closest("[data-quick]");
  if (quick && run && run.phase !== "reveal") {
    const door = Number(quick.dataset.i);
    const next = quick.dataset.quick === "all" ? allIn(run.coins, door) : addRest(run.coins, door);
    const occupied = new Set(next.filter((coin) => coin.loc !== "tray").map((coin) => coin.loc));
    if (occupied.size >= 4) {
      document.querySelector("#lock-hint").textContent = "Leave at least one answer empty.";
      return;
    }
    moveMany(next);
    return;
  }
  const step = event.target.closest("#adjust .step");
  if (step && run && selectedDoor != null && run.phase !== "reveal") {
    const dir = Number(step.dataset.dir);
    if (dir === 1) {
      const coin = run.coins.find((item) => item.loc === "tray");
      if (coin) moveMany(run.coins.map((item) => item.id === coin.id ? { ...item, loc: selectedDoor } : item));
    } else {
      const coin = [...run.coins].reverse().find((item) => item.loc === selectedDoor);
      if (coin) moveMany(run.coins.map((item) => item.id === coin.id ? { ...item, loc: "tray" } : item));
    }
    return;
  }
  if (event.target.id === "howto-next") {
    if (howtoStep < 2) { howtoStep += 1; paintHow(); }
    else {
      localStorage.setItem(HOW_KEY, "1");
      document.querySelector("#howto").hidden = true;
      logEvent("howto_complete");
    }
    return;
  }
  if (event.target.id === "howto-prev" && howtoStep > 0) { howtoStep -= 1; paintHow(); return; }
  if (event.target.id === "howto") document.querySelector("#howto").hidden = true;
  if (event.target.id === "leave-stay" || event.target.id === "leave-modal") document.querySelector("#leave-modal").hidden = true;
  if (event.target.id === "leave-go") {
    document.querySelector("#leave-modal").hidden = true;
    forfeit();
    return;
  }
  if (event.target.id === "consent-yes" || event.target.id === "consent-no") {
    localStorage.setItem(CONSENT_KEY, event.target.id === "consent-yes" ? "accept" : "reject");
    document.querySelector("#consent").hidden = true;
    return;
  }
  if (event.target.id === "clear-local") {
    if (confirm("Clear this device’s drop, bank and settings?")) {
      localStorage.removeItem(RUN_KEY);
      localStorage.removeItem(BANK_KEY);
      localStorage.removeItem(SET_KEY);
      clearSession();
      location.href = "/";
    }
    return;
  }
  if (event.target.id === "set-sound" || event.target.id === "set-motion") {
    const on = event.target.getAttribute("aria-pressed") !== "true";
    event.target.setAttribute("aria-pressed", on ? "true" : "false");
    if (event.target.id === "set-sound") settings.sound = on;
    if (event.target.id === "set-motion") settings.motion = on;
    saveSettings();
    return;
  }
  const tab = event.target.closest("#league-tabs button");
  if (tab) {
    document.querySelectorAll("#league-tabs button").forEach((button) => button.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    paintLeague(tab.textContent);
    return;
  }
  const door = event.target.closest(".door");
  if (door && run && run.phase !== "reveal" && !event.target.closest("[data-quick]")) {
    const index = Number(door.dataset.i);
    if (selectedId != null) {
      moveMany(run.coins.map((coin) => coin.id === selectedId ? { ...coin, loc: index } : coin));
      selectedId = null;
    }
    selectedDoor = index;
    document.querySelectorAll(".door").forEach((node) => node.classList.toggle("is-selected", Number(node.dataset.i) === index));
    document.querySelector("#adjust-label").textContent = `Answer ${LETTERS[index]}`;
    document.querySelector("#adjust").classList.add("is-on");
    return;
  }
  const nav = event.target.closest("[data-nav], a[href^='/']");
  if (!nav) return;
  const href = nav.getAttribute("href") || "";
  const dest = nav.dataset.nav || ROUTES[href] || "";
  if ((dest === "home" || href === "/") && run && run.status === "in_progress" && !document.querySelector("#view-play").hidden) {
    event.preventDefault();
    document.querySelector("#leave-modal").hidden = false;
  }
}

function onDown(event) {
  if (!run || run.phase === "reveal") return;
  const coin = event.target.closest(".coin-token");
  if (!coin) return;
  event.preventDefault();
  coin.setPointerCapture?.(event.pointerId);
  const id = Number(coin.dataset.id);
  const found = run.coins.find((item) => item.id === id);
  drag = { id, from: found.loc, x: event.clientX, y: event.clientY, moved: false, pointerId: event.pointerId };
  coin.classList.add("is-ghost");
  document.documentElement.classList.add("is-dragging");
  floater = el("div", "floater");
  floater.append(coinImg(36));
  document.body.append(floater);
  placeFloater(event.clientX, event.clientY);
}
function placeFloater(x, y) {
  if (!floater) return;
  floater.style.left = `${x - 22}px`;
  floater.style.top = `${y - 22}px`;
}
function hitAt(x, y) {
  const stack = document.elementsFromPoint(x, y);
  const door = stack.find((node) => node.classList?.contains("door") && !node.classList.contains("is-open"));
  const tray = stack.find((node) => node.id === "tray");
  if (door) return { type: "door", i: Number(door.dataset.i), el: door };
  if (tray) return { type: "tray" };
  return null;
}
function onMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
  placeFloater(event.clientX, event.clientY);
  document.querySelectorAll(".door").forEach((door) => door.classList.remove("is-target"));
  const hit = hitAt(event.clientX, event.clientY);
  if (hit?.type === "door") hit.el.classList.add("is-target");
}
function onUp(event) {
  if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return;
  const current = drag;
  drag = null;
  document.querySelectorAll(".door").forEach((door) => door.classList.remove("is-target"));
  floater?.remove();
  floater = null;
  document.documentElement.classList.remove("is-dragging");
  document.querySelector(`.coin-token[data-id="${current.id}"]`)?.classList.remove("is-ghost");
  if (!current.moved) {
    selectedId = current.id;
    return;
  }
  const hit = hitAt(event.clientX, event.clientY);
  if (hit?.type === "door") moveMany(run.coins.map((coin) => coin.id === current.id ? { ...coin, loc: hit.i } : coin));
  else if (hit?.type === "tray") moveMany(run.coins.map((coin) => coin.id === current.id ? { ...coin, loc: "tray" } : coin));
  else renderCoins();
}

function logEvent(name, extra) {
  try {
    const events = JSON.parse(localStorage.getItem("spquizzy.drop.events") || "[]");
    events.push({ name, at: Date.now(), ...extra });
    localStorage.setItem("spquizzy.drop.events", JSON.stringify(events.slice(-200)));
  } catch { /* ignore */ }
}

function applyShot() {
  const today = londonToday();
  bank.balance = 42;
  if (SHOT === "home") { run = null; show("home"); return; }
  run = {
    date: today,
    dropNumber: dropNumber(today),
    status: "in_progress",
    q: 2,
    coins: [
      { id: 0, loc: 2 }, { id: 1, loc: 2 }, { id: 2, loc: 2 }, { id: 3, loc: 2 },
      { id: 4, loc: 1 }, { id: 5, loc: 1 }, { id: 6, loc: "tray" },
    ],
    history: [10, 8, 7],
    undo: [{ id: 0, from: "tray" }],
    banked: 0,
    servedAt: Date.now(),
    phase: "question",
  };
  if (SHOT === "howto") { show("home"); openHow(0); return; }
  if (SHOT === "league") { show("league"); return; }
  if (SHOT === "results") {
    run.status = "completed";
    run.banked = 4;
    run.q = 9;
    run.history = [10, 8, 8, 6, 6, 5, 5, 4, 4, 4, 4];
    showResults();
    return;
  }
  if (SHOT === "404") { show("missing"); return; }
  show("play");
  renderQuestion();
  if (SHOT === "leave") document.querySelector("#leave-modal").hidden = false;
  if (SHOT === "drop") {
    document.body.classList.add("shot-drop");
    window.setTimeout(() => lockQuestion(false), 50);
  }
}

async function boot() {
  saveSettings();
  const consent = localStorage.getItem(CONSENT_KEY);
  document.querySelector("#consent").hidden = consent === "accept" || consent === "reject";
  pack = await (await fetch("/data/questions.public.json")).json();
  document.querySelector("#magic-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#magic-email").value.trim();
    const note = document.querySelector("#magic-note");
    try {
      await sendMagicLink(email);
      note.textContent = "Check your email for the sign-in link.";
    } catch {
      note.textContent = "The sign-in service did not answer. You can keep playing as a guest.";
    }
  });
  if (SHOT) {
    applyShot();
    return;
  }
  run = todayRun();
  const route = ROUTES[location.pathname] || document.body.dataset.route || "home";
  if (route === "play") startOrResume();
  else if (route === "howto") { show("home"); openHow(0); }
  else show(route === "missing" ? "missing" : route);
  if (!seenHow() && route === "home") openHow(0);
  document.querySelector("#play-btn").addEventListener("click", () => { location.href = "/play/"; });
}

shell();
boot();
