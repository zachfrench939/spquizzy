import { LAUNCH_DATE } from "../config.js";
import { captureHashSession, clearSession, forfeitRun, gradeQuestion, lockIn, oauthUrl, readSession, sendMagicLink, serveGuest, serveQuestion, weeklyLeague } from "./api.js";
import {
  START_COINS, LONG_PRESS_MS, addAmount, addRest, allIn, canManualLock, chipState,
  clearDoor, clonePots, freshPots, minusStep, QUESTION_MS, stackCount, timeoutPots,
  totalInPlay, trayTokens,
} from "./rules.js";

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
const GUEST_KEY = "spquizzy.drop.guest";

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
let armed = null;
let drag = null;
let minusPress = null;
let dropTimers = [];
let floater = null;
let timerId = 0;
let audioCtx = null;
let howtoStep = 0;
let offline = false;

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
const GUEST_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let guestMemo = null;
function guestId() {
  if (guestMemo) return guestMemo;
  try {
    const existing = localStorage.getItem(GUEST_KEY);
    if (existing && GUEST_UUID.test(existing)) {
      guestMemo = existing;
      return existing;
    }
    guestMemo = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, guestMemo);
    return guestMemo;
  } catch {
    guestMemo = crypto.randomUUID();
    return guestMemo;
  }
}

function todayRun() {
  const today = londonToday();
  const stored = loadRun();
  if (stored && stored.date !== today && stored.status === "in_progress") {
    rememberDay(stored.date, 0, "forfeited");
    localStorage.removeItem(RUN_KEY);
    return null;
  }
  if (stored && stored.date === today && stored.pots && Number.isInteger(stored.pots.tray)) return stored;
  if (stored && stored.date === today) localStorage.removeItem(RUN_KEY);
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
  document.querySelector("#lock").addEventListener("click", onLockClick);
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
  const stake = el("div", "hero-stake");
  const stack = el("div", "hero-stack");
  for (let i = 0; i < 5; i += 1) stack.append(coinImg(32));
  const figure = el("strong", null, "100");
  const words = el("span", null, "coins today");
  stake.append(stack, figure, words);
  art.append(wombat, stake);
  const badge = el("span", "sticker cheese");
  badge.id = "drop-badge";
  const title = el("h1", null, "The Daily Drop");
  const date = el("p", "date-line");
  date.id = "home-date";
  const pitch = el("p", "pitch", "Start with 100 coins. Put them on the answers you trust. Only the coins on the right answer go through. Finish all 10 questions to bank what’s left.");
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
  brand.setAttribute("aria-label", "The Daily Drop");
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO;
  logo.alt = "The Daily Drop";
  logo.width = 36;
  logo.height = 36;
  brand.append(logo);
  const coins = el("button", "play-coins");
  coins.type = "button";
  coins.id = "play-coins";
  coins.setAttribute("aria-expanded", "false");
  coins.setAttribute("aria-controls", "bank-pop");
  coins.innerHTML = `<img src="${COIN}" width="30" height="30" alt=""><strong id="pending-count">100</strong><span class="pending-float" id="pending-float"></span><div class="bank-pop" id="bank-pop" hidden><div class="row"><img src="${BANK}" alt=""> Bank <strong id="bank-count">0</strong></div><p>Banked when you finish all 10</p></div>`;
  bar.append(back, brand, coins);
  const stage = el("div", "play-stage");
  stage.id = "play-stage";
  const chrome = el("div", "play-chrome");
  const progress = el("div", "q-progress");
  progress.id = "q-progress";
  progress.setAttribute("role", "img");
  const timer = el("div", "q-timer");
  timer.id = "timer-bar";
  timer.setAttribute("role", "timer");
  timer.innerHTML = `<span class="q-timer-fill" id="timer-fill"></span>`;
  chrome.append(progress, timer);
  const bankHint = el("p", "bank-hint", "Finish all 10 to bank them.");
  bankHint.id = "bank-hint";
  const offlineNote = el("p", "offline-note", "Offline, not ranked");
  offlineNote.id = "offline-note";
  offlineNote.hidden = true;
  const question = el("h2");
  question.id = "q-text";
  const board = el("div", "board");
  board.id = "doors";
  board.setAttribute("aria-label", "Answers");
  const tray = el("div", "tray");
  tray.id = "tray";
  tray.setAttribute("aria-label", "Unplaced coins");
  const fact = el("p", "fun-fact");
  fact.id = "fun-fact";
  fact.hidden = true;
  const hint = el("p", "hint");
  hint.id = "lock-hint";
  const actions = el("div", "play-actions");
  const amounts = el("div", "amount-bar");
  amounts.setAttribute("role", "group");
  amounts.setAttribute("aria-label", "Add coins to the selected answer");
  for (const [amount, label] of [[1, "+1"], [10, "+10"], [50, "+50"]]) {
    const button = el("button", null, label);
    button.type = "button";
    button.dataset.add = String(amount);
    amounts.append(button);
  }
  const all = el("button", null, "All");
  all.type = "button";
  all.dataset.all = "1";
  const rest = el("button", null, "Rest");
  rest.type = "button";
  rest.dataset.rest = "1";
  amounts.append(all, rest);
  const lock = el("button", "btn-lock", "Lock in");
  lock.type = "button";
  lock.id = "lock";
  lock.disabled = true;
  const undoBtn = el("button", "btn-ghost", "Undo");
  undoBtn.type = "button";
  undoBtn.id = "undo";
  undoBtn.disabled = true;
  actions.append(amounts, lock, undoBtn);
  stage.append(chrome, bankHint, offlineNote, question, board, tray, fact, hint, actions);
  view.append(bar, stage);
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
  view.innerHTML = `<h1>Your bank</h1><p class="endow" style="justify-content:flex-start"><img src="${BANK}" width="48" height="48" alt=""> <strong id="bank-total">0</strong> coins</p><p>Coins move into your bank only after you finish all 10 questions. Leave early, or run out, and that day banks 0.</p><ul class="history" id="bank-history"></ul><p><a class="btn-ghost" href="/sign-in/">Sign in to keep your bank</a></p>`;
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
    <div class="panel" data-panel="0"><p>Each day you get <strong>100 coins</strong> and <strong>20 seconds</strong> on every question. Tap an answer, then use +1, +10, +50, All or Rest. You can also drag tens from the tray. You must place every coin, and leave at least one answer empty. − takes 10 back; hold it to clear the card. When time runs out, coins still in the tray are lost and the rest lock in.</p><div class="panel-art" id="howto-art"></div></div>
    <div class="panel" data-panel="1" hidden><p><strong>Lock in.</strong> Trapdoors under the wrong answers open and those coins fall. The right answer gets a tick and +N Safe. Each wrong answer that had coins shows −N.</p><div class="panel-art"><span class="sticker ink">+N Safe</span><span class="sticker" style="background:#111;color:#FFF8E7">−N</span></div></div>
    <div class="panel" data-panel="2" hidden><p><strong>Finish all 10 questions to bank what’s left.</strong> If you leave early, or you run out of coins, you bank <strong>0</strong> for the day. Coins in play are not yours until the last question is done.</p><div class="panel-art"><img src="${BANK}" width="48" height="48" alt=""><strong>Banked only after Q10</strong></div></div>
    <div class="dots" id="howto-dots"><span class="on"></span><span></span><span></span></div>
    <div class="sheet-nav"><button class="btn-ghost" type="button" id="howto-prev" hidden>Back</button><button class="btn-keep" type="button" id="howto-next">Next</button></div>
  </div>`;
  return back;
}

function leaveModal() {
  const back = el("div", "modal-back");
  back.id = "leave-modal";
  back.hidden = true;
  back.innerHTML = `<div class="modal" role="dialog" aria-labelledby="leave-title"><h2 id="leave-title">Leave today’s drop?</h2><p>Leave now and you’ll bank 0 coins. Finish all 10 to bank what’s left. You can’t replay today’s official drop.</p><div class="modal-actions"><button class="btn-keep" type="button" id="leave-stay">Keep playing</button><button class="btn-danger" type="button" id="leave-go">Leave</button></div></div>`;
  return back;
}

function consentBar() {
  const bar = el("aside", "consent");
  bar.id = "consent";
  bar.innerHTML = `<p>We use cookies only for ads, never for the game. <a href="/cookies/">Cookie policy</a></p><div class="pair"><button type="button" id="consent-no">Reject</button><button type="button" id="consent-yes">Accept</button></div>`;
  return bar;
}

function paintHowArt() {
  const art = document.querySelector("#howto-art");
  const stack = el("div", "hero-stack");
  for (let i = 0; i < 5; i += 1) stack.append(coinImg(28));
  art.append(stack, el("strong", null, "100"));
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
  let index = dropNumber(londonToday()) - 1;
  if (SHOT && (!pack || index < 0 || index >= pack.days.length)) index = 0;
  if (!pack || index < 0 || index >= pack.days.length) return null;
  return pack.days[index].questions[run.q];
}

function paintHome() {
  const today = londonToday();
  const number = dropNumber(today);
  const days = pack?.days?.length || pack?.packDays || 0;
  document.querySelector("#drop-badge").textContent = number >= 1 && number <= days ? `Drop no. ${number}` : "Daily drop";
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
  endow.replaceChildren(stack, document.createTextNode(` 100 coins today + bank of ${bank.balance}`));
}

function startOrResume() {
  const today = londonToday();
  const number = dropNumber(today);
  const days = pack?.days?.length || pack?.packDays || 0;
  if (!pack || number < 1 || number > days) {
    show("home");
    return;
  }
  if (!run || run.date !== today) {
    run = {
      date: today,
      dropNumber: number,
      status: "in_progress",
      q: 0,
      pots: freshPots(pack?.startCoins || START_COINS),
      selected: 0,
      history: [pack?.startCoins || START_COINS],
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
  clearDrop();
  if (run.selected == null) run.selected = 0;
  document.querySelector("#q-text").textContent = item.q;
  document.querySelector("#bank-hint").hidden = run.q !== 0;
  showFunFact("");
  document.querySelector("#offline-note").hidden = !offline || Boolean(SHOT);
  paintProgress();
  paintBankPop();
  const doors = document.querySelector("#doors");
  doors.replaceChildren();
  item.answers.forEach((answer, index) => doors.append(makeDoor(answer, index)));
  if (!run.servedAt) run.servedAt = Date.now();
  saveRun();
  renderStake();
  const left = Math.max(0, QUESTION_MS - (Date.now() - run.servedAt));
  if (SHOT === "play" || SHOT === "falling" || SHOT === "next" || SHOT === "drop") startTimer(11000, true);
  else if (left <= 0) onTimeout();
  else startTimer(left, false);
  if (session && !SHOT) {
    serveQuestion(run.q, session).then((payload) => {
      offline = false;
      document.querySelector("#offline-note").hidden = true;
      if (payload?.servedAt) {
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
  } else if (!SHOT) {
    serveGuest(guestId(), run.q).then(() => {
      offline = false;
      document.querySelector("#offline-note").hidden = true;
    }).catch(() => {
      offline = true;
      document.querySelector("#offline-note").hidden = false;
    });
  }
}

function paintProgress() {
  const row = document.querySelector("#q-progress");
  row.replaceChildren();
  row.setAttribute("aria-label", `Question ${run.q + 1} of 10`);
  for (let i = 0; i < 10; i += 1) {
    const seg = el("span", "seg");
    if (i < run.q) seg.classList.add("is-done");
    else if (i === run.q) seg.classList.add("is-now");
    row.append(seg);
  }
}

function paintBankPop() {
  const live = totalInPlay(run.pots);
  const count = document.querySelector("#pending-count");
  count.textContent = String(live);
  document.querySelector("#bank-count").textContent = String(bank.balance);
  document.querySelector("#play-coins").setAttribute("aria-label", `${live} coins in play. Bank ${bank.balance}. Show bank.`);
}

function makeDoor(answer, index) {
  const door = el("div", `door t${index}`);
  door.dataset.i = String(index);
  const shake = el("div", "door-shake");
  const pit = el("div", "pit");
  pit.setAttribute("aria-hidden", "true");
  pit.append(el("div", "hole"));
  const top = el("div", "flap flap-top");
  top.append(el("div", "flap-face"), el("div", "flap-back"));
  const bottom = el("div", "flap flap-bottom");
  bottom.append(el("div", "flap-face"), el("div", "flap-back"));
  const name = el("div", "name", answer);
  const letter = el("span", "letter", LETTERS[index]);
  const lost = el("span", "lost-tag");
  const stake = el("div", "stake-n", "0");
  const coins = el("div", "coins");
  const tab = el("span", "sel-tab", "Selected");
  const minus = el("button", "btn-minus", "−");
  minus.type = "button";
  minus.dataset.i = String(index);
  minus.setAttribute("aria-label", "Take 10 off. Hold to clear.");
  minus.addEventListener("pointerdown", onMinusDown);
  minus.addEventListener("pointerup", onMinusUp);
  minus.addEventListener("pointercancel", onMinusUp);
  minus.addEventListener("pointerleave", onMinusLeave);
  const dim = el("div", "dim");
  const badge = el("span", "check-badge");
  badge.setAttribute("aria-hidden", "true");
  badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.2 5.4 10.2 11.5 3.6" stroke="#FFF8E7" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
  const stamp = el("span", "safe-stamp");
  shake.append(pit, top, bottom, name, letter, lost, stake, coins, tab, minus, badge, stamp, dim);
  door.append(shake);
  return door;
}

function renderStake() {
  if (!run?.pots) return;
  const pots = run.pots;
  paintBankPop();
  document.querySelectorAll(".door").forEach((door) => {
    const index = Number(door.dataset.i);
    const amount = pots.doors[index] || 0;
    const stake = door.querySelector(".stake-n");
    stake.textContent = String(amount);
    stake.classList.toggle("is-zero", amount === 0);
    const plate = door.querySelector(".coins");
    plate.replaceChildren();
    const drawn = stackCount(amount);
    for (let i = 0; i < drawn; i += 1) {
      const coin = el("div", "coin");
      coin.append(coinImg(26));
      plate.append(coin);
    }
    door.classList.toggle("is-picked", run.phase !== "reveal" && index === run.selected);
    const minus = door.querySelector(".btn-minus");
    minus.disabled = amount === 0 || run.phase === "reveal";
    const lost = door.querySelector(".lost-tag");
    lost.textContent = amount ? `−${amount}` : "";
  });
  const tray = document.querySelector("#tray");
  tray.replaceChildren();
  trayTokens(pots.tray).forEach((amount, index) => {
    const token = el("button", "tray-token");
    token.type = "button";
    token.dataset.amt = String(amount);
    token.dataset.token = String(index);
    token.setAttribute("aria-label", `${amount} coins`);
    token.append(coinImg(32));
    token.append(el("span", "badge", String(amount)));
    if (armed && armed.token === index) token.classList.add("is-armed");
    tray.append(token);
  });
  tray.classList.toggle("is-empty", pots.tray === 0);
  const chips = chipState(pots, run.selected ?? 0);
  document.querySelectorAll(".amount-bar button").forEach((button) => {
    if (button.dataset.add) button.disabled = !chips[Number(button.dataset.add)] || run.phase === "reveal";
    else if (button.dataset.all != null) button.disabled = !chips.all || run.phase === "reveal";
    else button.disabled = !chips.rest || run.phase === "reveal";
  });
  const lock = document.querySelector("#lock");
  const hint = document.querySelector("#lock-hint");
  if (run.phase === "reveal") {
    if (run.revealReady) {
      lock.textContent = nextLabel();
      lock.disabled = false;
    }
    return;
  }
  lock.textContent = "Lock in";
  const ok = canManualLock(pots);
  lock.disabled = !ok;
  document.querySelector("#undo").disabled = !run.undo.length;
  if (!ok && pots.tray > 0) hint.textContent = "Place every coin, and leave one answer empty.";
  else if (!ok && pots.doors.every((count) => count > 0)) hint.textContent = "Leave at least one answer empty.";
  else hint.textContent = "";
}

function nextLabel() {
  if (!run.reveal) return "Next question";
  if (run.q >= 9 || !run.reveal.keptAmount) return "See results";
  return "Next question";
}

function samePots(a, b) {
  return a.tray === b.tray && a.doors.every((count, index) => count === b.doors[index]);
}

function applyPots(next, select) {
  if (!run || run.phase === "reveal") return;
  const changed = !samePots(run.pots, next);
  if (!changed && (select == null || select === run.selected)) return;
  if (changed) run.undo.push({ pots: clonePots(run.pots), selected: run.selected });
  run.pots = clonePots(next);
  if (select != null) run.selected = select;
  armed = null;
  saveRun();
  renderStake();
}

function undo() {
  if (!run || run.phase === "reveal") return;
  const last = run.undo.pop();
  if (!last?.pots) return;
  run.pots = clonePots(last.pots);
  run.selected = last.selected ?? 0;
  armed = null;
  saveRun();
  renderStake();
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
    bar.classList.toggle("is-low", remain <= 5000);
    const seconds = Math.ceil(remain / 1000);
    bar.setAttribute("aria-label", `${seconds} seconds left of 20`);
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
  run.timeoutFrom = totalInPlay(run.pots);
  run.pots = timeoutPots(run.pots);
  lockQuestion(true, run.timeoutFrom > 0 && totalInPlay(run.pots) === 0);
}

function onLockClick() {
  if (!run) return;
  if (run.phase === "reveal") {
    if (run.revealReady) finishReveal(false);
    return;
  }
  if (canManualLock(run.pots)) lockQuestion(false);
}

function clearDrop() {
  dropTimers.forEach((id) => window.clearTimeout(id));
  dropTimers = [];
  const view = document.querySelector("#view-play");
  if (view) view.className = "";
}

function later(ms, fn) {
  dropTimers.push(window.setTimeout(fn, ms));
}

async function lockQuestion(timeout, emptyBust = false) {
  if (!run || run.phase === "reveal") return;
  stopTimer();
  run.phase = "reveal";
  run.revealReady = false;
  const dist = run.pots.doors.slice();
  const before = timeout ? (run.timeoutFrom ?? totalInPlay(run.pots)) : totalInPlay(run.pots);
  let correct = 0;
  let server = null;
  try {
    if (SHOT === "falling" || SHOT === "next" || SHOT === "drop") {
      correct = 2;
    } else if (session) {
      server = await lockIn(run.q, dist, timeout, session);
      correct = server.correctIndex;
      offline = false;
    } else {
      const guest = guestId();
      await serveGuest(guest, run.q);
      server = await gradeQuestion(dropNumber(londonToday()) - 1, run.q, dist, timeout, guest);
      correct = server.correctIndex;
      offline = false;
    }
  } catch {
    offline = true;
    run.phase = "question";
    const note = document.querySelector("#offline-note");
    if (note) {
      note.hidden = false;
      note.textContent = "Offline, not ranked. This question can’t be checked until the server answers.";
    }
    renderStake();
    if (!timeout) {
      const left = Math.max(0, QUESTION_MS - (Date.now() - (run.servedAt || Date.now())));
      if (left > 0) startTimer(left, false);
    }
    return;
  }
  const keptAmount = dist[correct] || 0;
  const lostAmount = before - keptAmount;
  const wiped = emptyBust || keptAmount === 0;
  const funFact = typeof server?.funFact === "string" ? server.funFact.trim() : "";
  run.reveal = { correct, keptAmount, lostAmount, wiped, timeout, before, funFact };
  saveRun();
  beginDrop(correct, keptAmount, lostAmount);
}

function showFunFact(text) {
  const node = document.querySelector("#fun-fact");
  if (!node) return;
  const fact = typeof text === "string" ? text.trim() : "";
  node.hidden = !fact;
  node.textContent = fact;
}

function beginDrop(correct, keptAmount, lostAmount) {
  const view = document.querySelector("#view-play");
  document.querySelectorAll(".door").forEach((door) => {
    const index = Number(door.dataset.i);
    door.classList.remove("is-picked");
    if (index === correct) {
      door.classList.add("is-correct");
      door.querySelector(".safe-stamp").textContent = `+${keptAmount} Safe`;
    } else door.classList.add("is-wrong");
  });
  document.querySelector("#undo").disabled = true;
  renderStake();
  document.querySelector("#pending-count").textContent = String(run.reveal.before);
  const float = document.querySelector("#pending-float");
  if (float) float.textContent = lostAmount ? `−${lostAmount}` : "";
  const finish = () => {
    document.querySelector("#pending-count").textContent = String(keptAmount);
    document.querySelector("#play-coins")?.setAttribute("aria-label", `${keptAmount} coins in play. Bank ${bank.balance}. Show bank.`);
    view.classList.add("is-next", "is-done");
    view.classList.remove("is-pressing");
    run.revealReady = true;
    const lock = document.querySelector("#lock");
    lock.textContent = nextLabel();
    lock.disabled = false;
    showFunFact(run.reveal?.funFact);
  };
  if ((reduced() && !SHOT) || SHOT === "next") {
    view.classList.add("is-safe-reveal", "is-stamping", "is-tagged", "is-pending-tick", "is-next", "is-done", "was-open");
    document.querySelectorAll(".door.is-wrong .coin").forEach((coin) => { coin.style.opacity = "0"; });
    finish();
    return;
  }
  view.classList.add("is-pressing");
  const timing = { press: 80, suspense: 300, flap: 280, coinStart: 120, safeAt: 700, stampAt: 980, closeAt: 1120, tagAt: 1320, pendingAt: 1500, doneAt: 1750 };
  view.style.setProperty("--flap-ms", `${timing.flap}ms`);
  later(timing.press, () => view.classList.add("is-suspense"));
  const dropAt = timing.press + timing.suspense;
  later(dropAt, () => {
    view.classList.add("is-dropping", "is-hatches-open", "was-open");
  });
  later(dropAt + timing.coinStart, () => fallStacks());
  later(timing.safeAt, () => view.classList.add("is-safe-reveal"));
  later(timing.stampAt, () => view.classList.add("is-stamping"));
  later(timing.closeAt, () => {
    view.classList.add("is-closing");
    view.classList.remove("is-hatches-open");
  });
  later(timing.tagAt, () => view.classList.add("is-tagged"));
  later(timing.pendingAt, () => {
    view.classList.add("is-pending-tick");
    document.querySelector("#pending-count").textContent = String(keptAmount);
  });
  later(timing.doneAt, finish);
  if (SHOT === "falling" || SHOT === "drop") {
    dropTimers.forEach((id) => window.clearTimeout(id));
    dropTimers = [];
    view.classList.add("is-pressing", "is-suspense", "is-dropping", "is-hatches-open", "was-open", "is-flap-mid");
    fallStacks();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll(".door.is-wrong .coin").forEach((coin) => {
          coin.getAnimations().forEach((anim) => {
            anim.currentTime = 360;
            anim.pause();
          });
        });
      });
    });
  }
}

function fallStacks() {
  document.querySelectorAll(".door.is-wrong").forEach((door) => {
    const hole = door.querySelector(".hole");
    if (!hole) return;
    const holeBox = hole.getBoundingClientRect();
    door.querySelectorAll(".coin").forEach((coin, index) => {
      const box = coin.getBoundingClientRect();
      const dx = (holeBox.left + holeBox.width / 2) - (box.left + box.width / 2);
      const dy = (holeBox.top + holeBox.height / 2) - (box.top + box.height / 2);
      const spin = index % 2 ? 18 : -16;
      coin.animate([
        { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.06}px, -3px) rotate(${spin / 4}deg) scale(1)`, opacity: 1, offset: 0.14 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.22)`, opacity: 1, offset: 0.86 },
        { transform: `translate(${dx}px, ${dy + 4}px) rotate(${spin}deg) scale(0.08)`, opacity: 0 },
      ], { duration: 610, delay: index * 50, fill: "forwards" });
    });
  });
}

function finishReveal() {
  clearDrop();
  const reveal = run.reveal || { keptAmount: 0 };
  const kept = reveal.keptAmount || 0;
  run.history.push(kept);
  run.undo = [];
  run.phase = "question";
  run.revealReady = false;
  run.servedAt = null;
  run.selected = 0;
  armed = null;
  if (!kept) {
    closeRun(run.q >= 9 ? "completed" : "busted", 0);
    return;
  }
  run.pots = freshPots(kept);
  if (run.q >= 9) {
    closeRun("completed", kept);
    return;
  }
  run.q += 1;
  run.servedAt = Date.now();
  saveRun();
  show("play");
  renderQuestion();
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
  line.append(el("span", "running", `Bank ${bank.balance}`));
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

function paintLeagueRows(rows) {
  const list = document.querySelector("#rank-list");
  list.replaceChildren();
  rows.forEach((row) => {
    const pos = row.rank ?? row[0];
    const name = row.name ?? row[1];
    const score = row.coins ?? row[2];
    const item = document.createElement("li");
    if (pos <= 10) item.classList.add("zone-up");
    if (pos >= 21) item.classList.add("zone-down");
    if (row.you || name === "You") item.classList.add("is-you");
    item.append(el("span", "pos", String(pos)), el("span", null, name), el("span", null, String(score)));
    list.append(item);
  });
}

async function paintLeague(which) {
  const banner = document.querySelector("#view-league .example-banner");
  document.querySelector("#league-meta").textContent = `${which === "Weekly" ? "Fusilli League" : which} · coins banked this period`;
  if (which === "Weekly" && !SHOT) {
    try {
      const rows = await weeklyLeague(session);
      if (Array.isArray(rows) && rows.length) {
        if (banner) banner.hidden = true;
        paintLeagueRows(rows);
        return;
      }
    } catch {
      /* tables are not applied yet */
    }
  }
  if (banner) banner.hidden = false;
  paintLeagueRows(EXAMPLE.map(([rank, name, coins]) => ({ rank, name, coins, you: name === "You" })));
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

function onMinusDown(event) {
  if (!run || run.phase === "reveal") return;
  event.stopPropagation();
  event.preventDefault();
  const door = Number(event.currentTarget.dataset.i);
  event.currentTarget.setPointerCapture?.(event.pointerId);
  const timer = window.setTimeout(() => {
    if (minusPress) minusPress.fired = true;
    applyPots(clearDoor(run.pots, door));
  }, LONG_PRESS_MS);
  minusPress = { door, timer, fired: false };
}

function onMinusUp(event) {
  if (!minusPress || Number(event.currentTarget.dataset.i) !== minusPress.door) return;
  window.clearTimeout(minusPress.timer);
  const fired = minusPress.fired;
  const door = minusPress.door;
  minusPress = null;
  if (!fired) applyPots(minusStep(run.pots, door));
}

function onMinusLeave(event) {
  if (!minusPress || Number(event.currentTarget.dataset.i) !== minusPress.door) return;
  if (event.buttons) return;
  window.clearTimeout(minusPress.timer);
  minusPress = null;
}

function onClick(event) {
  const coinBtn = event.target.closest("#play-coins");
  if (coinBtn && !document.querySelector("#view-play").hidden) {
    const pop = document.querySelector("#bank-pop");
    const open = pop.hidden;
    pop.hidden = !open;
    pop.classList.toggle("is-open", open);
    coinBtn.setAttribute("aria-expanded", open ? "true" : "false");
    return;
  }
  const pop = document.querySelector("#bank-pop");
  if (pop && !pop.hidden) {
    pop.hidden = true;
    pop.classList.remove("is-open");
    document.querySelector("#play-coins")?.setAttribute("aria-expanded", "false");
  }
  const chip = event.target.closest(".amount-bar button");
  if (chip && run && run.phase !== "reveal" && !chip.disabled) {
    const door = run.selected ?? 0;
    let next = run.pots;
    if (chip.dataset.add) next = addAmount(run.pots, door, Number(chip.dataset.add));
    else if (chip.dataset.all != null) next = allIn(run.pots, door);
    else next = addRest(run.pots, door);
    applyPots(next);
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
    document.documentElement.classList.remove("has-consent");
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
  if (door && run && run.phase !== "reveal" && !event.target.closest(".btn-minus")) {
    const index = Number(door.dataset.i);
    if (armed && run.pots.tray >= armed.amount) {
      applyPots(addAmount(run.pots, index, armed.amount), index);
    } else {
      run.selected = index;
      armed = null;
      renderStake();
    }
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
  const token = event.target.closest(".tray-token");
  if (!token) return;
  event.preventDefault();
  token.setPointerCapture?.(event.pointerId);
  drag = {
    amount: Number(token.dataset.amt),
    x: event.clientX,
    y: event.clientY,
    moved: false,
    pointerId: event.pointerId,
    token,
  };
  token.classList.add("is-ghost");
  document.documentElement.classList.add("is-dragging");
  floater = el("div", "floater");
  floater.append(coinImg(36), el("span", "badge", token.dataset.amt));
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
  const door = stack.find((node) => node.classList?.contains("door"));
  if (door) return { type: "door", i: Number(door.dataset.i), el: door };
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
  current.token?.classList.remove("is-ghost");
  if (!current.moved) {
    const token = Number(current.token?.dataset.token);
    armed = armed && armed.token === token ? null : { amount: current.amount, token };
    renderStake();
    return;
  }
  const hit = hitAt(event.clientX, event.clientY);
  if (hit?.type === "door") applyPots(addAmount(run.pots, hit.i, current.amount), hit.i);
  else renderStake();
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
    pots: { tray: 0, doors: [10, 20, 70, 0] },
    selected: 0,
    history: [100, 100, 100],
    undo: [{ pots: freshPots(), selected: 0 }],
    banked: 0,
    servedAt: Date.now() - 9000,
    phase: "question",
  };
  if (SHOT === "howto") { show("home"); openHow(0); return; }
  if (SHOT === "league") { show("league"); return; }
  if (SHOT === "results") {
    run.status = "completed";
    run.banked = 20;
    run.q = 9;
    run.history = [100, 70, 70, 40, 40, 30, 30, 20, 20, 20, 20];
    bank.balance = 62;
    showResults();
    return;
  }
  if (SHOT === "404") { show("missing"); return; }
  show("play");
  renderQuestion();
  if (SHOT === "leave") document.querySelector("#leave-modal").hidden = false;
  if (SHOT === "falling" || SHOT === "next" || SHOT === "drop") {
    window.setTimeout(() => lockQuestion(false), 60);
  }
}

async function boot() {
  saveSettings();
  const consent = localStorage.getItem(CONSENT_KEY);
  const showConsent = consent !== "accept" && consent !== "reject";
  document.querySelector("#consent").hidden = !showConsent;
  document.documentElement.classList.toggle("has-consent", showConsent);
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
