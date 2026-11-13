import { GOOGLE_SIGN_IN, LAUNCH_DATE } from "../config.js";
import { AUTH_COPY, MIN_PASSWORD_LENGTH, authErrorMessage, isUnconfirmed, passwordTooShort, resend, resendCooldownLeft, sessionFromAuth, signInWithPassword, signUp, signupScreenState } from "./auth.js";
import { chooseRemember, clearLocalAuth, readRemember } from "./auth-storage.js";
import { captureHashSession, clearSession, forfeitRun, gradeQuestion, leaderboard, lockIn, magicLinkErrorMessage, myProfile, oauthUrl, readSession, saveSession, sendMagicLink, serveGuest, serveQuestion, setBoardOptOut, setUsername } from "./api.js";
import { BANK_NUDGE_KEY, COPY } from "./copy.js";
import { navAction } from "./nav.js";
import { formatYouRank, usernameError } from "./names.js";
import { PRACTICE, gradePractice } from "./practice.js";
import { playStats } from "./stats.js";
import { shareTrail, shareTrailLabel } from "./trail.js";
import {
  START_COINS, LONG_PRESS_MS, addAmount, addRest, allIn, canManualLock, chipState,
  clearDoor, clonePots, freshPots, minusStep, QUESTION_MS, stackCount, timeoutFill, timeoutPots,
  totalInPlay, trayTokens,
} from "./rules.js";

const COIN = "/assets/drop/coin-fusilli-64.png";
const BANK = "/assets/drop/bank-stack-64.png";
const LOGO = "/assets/drop/logo-red.png";
const GOOGLE_MARK = `<svg class="g-logo" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const LETTERS = ["A", "B", "C", "D"];
const FILLS = ["white", "cheese", "mint", "pink"];
const RUN_KEY = "spquizzy.drop.run";
const BANK_KEY = "spquizzy.drop.bank";
const HOW_KEY = "spquizzy.drop.howto";
const SET_KEY = "spquizzy.drop.settings";
const CONSENT_KEY = "spquizzy.consent";
const COACH_KEY = "spquizzy.drop.coach";
const PROMPT_KEY = "spquizzy.drop.signin-prompt";
const SIGNED_OUT_KEY = "spquizzy.drop.just-signed-out";
const NAME_LATER_KEY = "spquizzy.drop.username-later";
const GUEST_KEY = "spquizzy.drop.guest";
const PENDING_EMAIL_KEY = "spquizzy.drop.pending-email";
const RESEND_AT_KEY = "spquizzy.drop.resend-at";
const PERIODS = { Weekly: "week", Monthly: "month", Yearly: "year", "All-time": "all" };
const AGE_NEED = "Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.";
const CLEAR_LOCAL_COPY = COPY.clearLocal;

function ageFields(prefix) {
  return `<p class="age-rule">You must be 13 or over to create an account. Under 13s can play as a guest on this device. <a href="/privacy/">Privacy notice</a></p><label class="age-check" for="${prefix}-age"><input id="${prefix}-age" data-age type="checkbox" required> <span>I am 13 or over</span></label>`;
}

function rememberFields(id) {
  return `<label class="age-check" for="${id}"><input id="${id}" data-remember type="checkbox" checked aria-describedby="${id}-hint"> <span>${AUTH_COPY.remember}</span></label><p class="remember-hint" id="${id}-hint">${AUTH_COPY.rememberHint}</p>`;
}

function consentWord(value) {
  if (value === "accept") return "Accepted";
  if (value === "reject") return "Rejected";
  return "not chosen";
}

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
  "/archive/": "archive",
  "/404.html": "missing",
};

const app = document.querySelector("#app");
const params = new URLSearchParams(location.search);
const SHOT = params.get("shot");
const ADS_PREVIEW = params.get("ads") === "preview";
let pack = null;
const capturedAuth = captureHashSession();
let session = capturedAuth?.access_token ? capturedAuth : readSession();
let signInNotice = capturedAuth?.message || "";
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
let profile = null;
let authMode = "signin";
let resendTimer = 0;
let resendBusy = false;
let officialHold = null;

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
  if (run && !run.practice) localStorage.setItem(RUN_KEY, JSON.stringify(run));
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
  if (ADS_PREVIEW) document.documentElement.classList.add("ads-preview");
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
  logo.alt = "Spiquizzy";
  brand.append(logo, el("span", "wordmark", "Spiquizzy"));
  const quiet = el("a", "header-signin", "Sign in");
  quiet.id = "header-signin";
  quiet.href = "/sign-in/";
  quiet.dataset.nav = "signin";
  const nav = el("nav", "header-actions");
  nav.setAttribute("aria-label", "Site");
  for (const [href, label] of [["/how-to-play/", "How to play"], ["/leagues/", "Leagues"], ["/bank/", "Bank"], ["/profile/", "Stats"], ["/sign-in/", "Sign in"], ["/settings/", "Settings"]]) {
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
  header.append(brand, quiet, nav);

  const main = el("main");
  main.append(homeView(), playView(), resultsView(), leagueView(), bankView(), profileView(), signinView(), plusView(), settingsView(), archiveView(), missingView());
  app.append(header, main, tabBar(), howtoSheet(), leaveModal(), signInPrompt(), usernameGate(), consentBar());
  document.addEventListener("keydown", trapDialog);
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
  const stake = el("div", "hero-stake");
  const stack = el("div", "hero-stack");
  for (let i = 0; i < 5; i += 1) stack.append(coinImg(32));
  const figure = el("strong", null, "100");
  const words = el("span", null, "coins today");
  stake.append(stack, figure, words);
  art.append(stake);
  const badge = el("span", "sticker cheese");
  badge.id = "drop-badge";
  const title = el("h1", null, "The Daily Drop");
  const date = el("p", "date-line");
  date.id = "home-date";
  const pitch = el("p", "pitch", COPY.pitch);
  const cta = el("div", "home-cta");
  const play = el("button", "btn-primary", "Play");
  play.type = "button";
  play.id = "play-btn";
  play.dataset.nav = "play";
  cta.append(play);
  const how = el("button", "btn-ghost howto-link", "How to play");
  how.type = "button";
  how.dataset.nav = "howto";
  const practice = el("button", "btn-ghost howto-link", COPY.practiceCta);
  practice.type = "button";
  practice.dataset.nav = "practice";
  const ad = el("aside", "ad-slot slot-home");
  ad.setAttribute("aria-label", "Advertisement");
  ad.append(el("span", "ad-label", "Advertisement"), el("span", null, "Ad"));
  const fine = el("footer", "fine");
  fine.append(document.createTextNode("Free to play · Same 10 questions for everyone · Resets at midnight UK time · "));
  const privacy = el("a", null, "Privacy");
  privacy.href = "/privacy/";
  fine.append(privacy);
  view.append(art, el("p", "kicker", "Today’s daily quiz"), badge, title, date, pitch, cta, how, practice, ad, fine);
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
  brand.setAttribute("aria-label", "Spiquizzy");
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO;
  logo.alt = "Spiquizzy";
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
  const timerRow = el("div", "q-timer-row");
  const timer = el("div", "q-timer");
  timer.id = "timer-bar";
  timer.setAttribute("role", "timer");
  timer.innerHTML = `<span class="q-timer-fill" id="timer-fill"></span>`;
  const seconds = el("span", "q-timer-secs", "25s");
  seconds.id = "timer-secs";
  timerRow.append(timer, seconds);
  chrome.append(progress, timerRow);
  const bankHint = el("p", "bank-hint", "Finish all 10 to bank them.");
  bankHint.id = "bank-hint";
  const offlineNote = el("p", "offline-note", "Offline, not ranked");
  offlineNote.id = "offline-note";
  offlineNote.hidden = true;
  const question = el("h2");
  question.id = "q-text";
  const coach = el("p", "coach", "Pick an answer, put coins on it, then Lock in.");
  coach.id = "coach";
  coach.hidden = true;
  const practiceBanner = el("p", "practice-banner", COPY.practiceBanner);
  practiceBanner.id = "practice-banner";
  practiceBanner.hidden = true;
  const board = el("div", "board");
  board.id = "doors";
  board.setAttribute("aria-label", "Answers");
  const tray = el("div", "tray");
  tray.id = "tray";
  tray.setAttribute("aria-label", "Unplaced coins");
  const fact = el("p", "fun-fact");
  fact.id = "fun-fact";
  const hint = el("p", "hint");
  hint.id = "lock-hint";
  const actions = el("div", "play-actions");
  const meta = el("div", "bar-meta");
  meta.innerHTML = `<div class="adding" id="adding" aria-live="polite"><span class="to">Adding to</span><span class="letter-chip" id="adding-letter">A</span><span class="name" id="adding-name"></span><span class="timeout-note" id="adding-note" hidden></span></div><p class="lock-reason" id="lock-reason" hidden></p>`;
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
  all.setAttribute("aria-label", COPY.allAria);
  const rest = el("button", null, "Rest");
  rest.type = "button";
  rest.dataset.rest = "1";
  rest.setAttribute("aria-label", COPY.restAria);
  amounts.append(all, rest);
  const chipHint = el("p", "chip-hint", COPY.chipHint);
  chipHint.id = "chip-hint";
  chipHint.hidden = true;
  const lockRow = el("div", "lock-row");
  const lock = el("button", "btn-lock", "Lock in");
  lock.type = "button";
  lock.id = "lock";
  lock.disabled = true;
  const undoBtn = el("button", "btn-undo-icon");
  undoBtn.type = "button";
  undoBtn.id = "undo";
  undoBtn.disabled = true;
  undoBtn.setAttribute("aria-label", "Undo");
  undoBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M8 8H3V3"/><path d="M3.6 8.2A9 9 0 1 1 3 12"/></svg>`;
  lockRow.append(lock, undoBtn);
  actions.append(meta, amounts, chipHint, lockRow);
  stage.append(chrome, bankHint, offlineNote, question, coach, practiceBanner, board, tray, fact, hint, actions);
  view.append(bar, stage);
  return view;
}

function resultsView() {
  const view = el("section");
  view.id = "view-results";
  view.hidden = true;
  const title = el("h1");
  title.id = "result-title";
  const sub = el("p");
  sub.id = "result-sub";
  const card = el("div", "share-card");
  const brand = el("div", "share-brand");
  const mark = document.createElement("img");
  mark.src = LOGO;
  mark.alt = "";
  mark.width = 36;
  mark.height = 36;
  const who = el("div", "who");
  who.id = "share-who";
  brand.append(mark, who);
  const trail = el("div", "share-trail");
  trail.id = "share-trail";
  const banked = el("div", "banked-line");
  banked.id = "banked-line";
  card.append(brand, trail, banked);
  const fact = el("p", "result-fact");
  fact.id = "result-fact";
  fact.hidden = true;
  const seeYou = el("p", "see-you", COPY.seeYou);
  seeYou.id = "see-you";
  seeYou.hidden = true;
  const snip = el("div", "league-snip");
  snip.id = "league-snip";
  const count = el("p", "countdown");
  count.id = "countdown";
  const share = el("button", "btn-share", "Share");
  share.type = "button";
  share.id = "share";
  const nudge = el("div", "bank-nudge");
  nudge.id = "bank-nudge";
  nudge.hidden = true;
  const nudgeText = el("p", null, COPY.nudge);
  const nudgeActions = el("div", "bank-nudge-actions");
  const nudgeYes = el("a", null, COPY.nudgeYes);
  nudgeYes.href = "/sign-in/";
  nudgeYes.id = "bank-nudge-yes";
  const nudgeNo = el("button", null, COPY.nudgeNo);
  nudgeNo.type = "button";
  nudgeNo.id = "bank-nudge-no";
  nudgeActions.append(nudgeYes, nudgeNo);
  nudge.append(nudgeText, nudgeActions);
  const practiceDone = el("a", "btn-primary", COPY.practiceBack);
  practiceDone.id = "practice-done";
  practiceDone.href = "/";
  practiceDone.hidden = true;
  const ad = el("aside", "ad-slot slot-results");
  ad.setAttribute("aria-label", "Advertisement");
  ad.append(el("span", "ad-label", "Advertisement"), el("span", null, "Ad"));
  view.append(title, sub, card, fact, seeYou, snip, count, share, nudge, practiceDone, ad);
  return view;
}

function leagueView() {
  const view = el("section", "page");
  view.id = "view-league";
  view.hidden = true;
  const heading = el("h1", null, "Weekly league");
  heading.id = "league-title";
  view.append(heading);
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
  const you = el("p", "you-rank");
  you.id = "you-rank";
  const guest = el("div", "league-guest");
  guest.id = "league-guest";
  guest.hidden = true;
  guest.innerHTML = `<p>Sign in to get on the board.</p><a class="btn-primary" href="/sign-in/">Sign in</a>`;
  const empty = el("p", "league-empty");
  empty.id = "league-empty";
  empty.hidden = true;
  empty.textContent = COPY.leagueEmpty;
  const list = el("ol", "rank-list");
  list.id = "rank-list";
  const ad = el("aside", "ad-slot slot-league");
  ad.setAttribute("aria-label", "Advertisement");
  ad.append(el("span", "ad-label", "Advertisement"), el("span", null, "Ad"));
  const foot = el("p");
  foot.id = "league-foot";
  view.append(tabs, meta, you, guest, empty, list, foot, ad);
  return view;
}

function bankView() {
  const view = el("section", "page");
  view.id = "view-bank";
  view.hidden = true;
  view.innerHTML = `<h1>Your bank</h1><p class="endow" style="justify-content:flex-start"><img src="${BANK}" width="48" height="48" alt=""> <strong id="bank-total">0</strong> coins</p><div class="stat-grid" id="bank-stats"></div><p>Coins move into your bank only after you finish all 10 questions. Leave early, or run out, and that day banks 0.</p><ul class="history" id="bank-history"></ul><p id="bank-guest"><a class="btn-ghost" href="/sign-in/">Sign in to keep your bank</a></p><p id="bank-signed" hidden>Signed in. This bank is kept on your account.</p><p><button class="btn-keep" type="button" id="sign-out-bank" hidden>Sign out</button></p>`;
  return view;
}

function profileView() {
  const view = el("section", "page");
  view.id = "view-profile";
  view.hidden = true;
  view.innerHTML = `<h1>Stats</h1><div class="stat-grid" id="stat-grid"></div><div class="spark" id="stat-spark" hidden></div><p id="stat-note"></p><p class="settings-links"><a href="/settings/">${COPY.settingsLink}</a></p>`;
  return view;
}

function signinView() {
  const view = el("section", "simple-center");
  view.id = "view-signin";
  view.hidden = true;
  const googleRow = GOOGLE_SIGN_IN ? "" : " hidden";
  view.innerHTML = `<img class="logo" src="${LOGO}" width="48" height="48" alt="Spiquizzy" style="margin:0 auto">
    <div id="signin-guest">
      <h1 id="signin-title" tabindex="-1">${AUTH_COPY.signInTitle}</h1>
      <p class="signin-pitch">Sign in to keep your bank, join weekly leagues, and play on any device. You can still play today’s drop as a guest.</p>
      <div class="auth-switch" role="tablist" aria-label="Email sign-in">
        <button type="button" id="auth-mode-in" role="tab" aria-selected="true" aria-controls="auth-form">Sign in</button>
        <button type="button" id="auth-mode-up" role="tab" aria-selected="false" aria-controls="auth-form">Create account</button>
      </div>
      <form class="signin-form" id="auth-form" novalidate>
        ${ageFields("auth")}
        <p id="auth-note"></p>
        <label for="auth-email">Email</label>
        <input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" required>
        <label for="auth-password">Password</label>
        <input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="${MIN_PASSWORD_LENGTH}" required>
        ${rememberFields("auth-remember")}
        <button class="btn-primary" type="submit" id="auth-submit">${AUTH_COPY.signInSubmit}</button>
        <button class="btn-ghost" type="button" id="auth-magic">${AUTH_COPY.magicInstead}</button>
      </form>
      <p id="google-row"${googleRow}><a class="btn-google" id="google-link" href="#">${GOOGLE_MARK}<span>Continue with Google</span></a></p>
    </div>
    <div id="signin-inbox" hidden>
      <h1 id="inbox-title" tabindex="-1" aria-describedby="inbox-sent">${AUTH_COPY.inboxHeading}</h1>
      <p id="inbox-sent"></p>
      <p id="inbox-hint">${AUTH_COPY.inboxHint}</p>
      <p id="inbox-status" role="status" aria-live="polite"></p>
      <button class="btn-primary" type="button" id="inbox-resend">${AUTH_COPY.resend}</button>
      <button class="btn-ghost" type="button" id="inbox-back">${AUTH_COPY.back}</button>
      <button class="btn-ghost" type="button" id="inbox-different">${AUTH_COPY.different}</button>
    </div>
    <div id="signin-signed" hidden><h1>You’re signed in.</h1><a class="btn-primary" href="/">Back to today’s drop</a><button class="btn-keep" type="button" id="sign-out-page">Sign out</button></div>`;
  return view;
}

function plusView() {
  const view = el("section", "page");
  view.id = "view-plus";
  view.hidden = true;
  view.innerHTML = `<h1>Spiquizzy Plus</h1><p>${COPY.plus}</p><p>The daily drop stays free.</p>`;
  return view;
}

function settingsView() {
  const view = el("section", "page");
  view.id = "view-settings";
  view.hidden = true;
  view.innerHTML = `<h1>Settings</h1>
    <form id="name-form" class="name-form">
      <label for="set-username">Username</label>
      <p class="name-real">${COPY.realName}</p>
      <input id="set-username" name="username" autocomplete="username" maxlength="16" spellcheck="false">
      <button class="btn-primary" type="submit" id="save-username" hidden>Save username</button>
      <p id="set-username-note"></p>
      <button class="btn-keep" type="button" id="sign-out" hidden>Sign out</button>
    </form>
    <div class="tog"><span>Sound</span><button class="switch" type="button" id="set-sound" aria-label="Sound"></button></div>
    <div class="tog"><span>Reduce motion</span><button class="switch" type="button" id="set-motion" aria-label="Reduce motion"></button></div>
    <div class="tog"><span>${COPY.labels}</span><button class="switch" type="button" aria-pressed="true" disabled aria-label="Labels"></button></div>
    <div class="consent-choice">
      <h2>Page views</h2>
      <p id="consent-status">Page views: not chosen</p>
      <p>We only count page views if you Accept. You can change that here.</p>
      <div class="pair" role="group" aria-label="Page-view choice">
        <button type="button" id="settings-reject">Reject</button>
        <button type="button" id="settings-accept">Accept</button>
      </div>
    </div>
    <p id="board-guest">Sign in to hide your username from the leagues board.</p>
    <div class="tog" id="board-row" hidden>
      <span id="board-label">Hide me from the leagues board</span>
      <button class="switch" type="button" id="set-board" aria-labelledby="board-label" aria-pressed="false"></button>
    </div>
    <p id="board-note" hidden></p>
    <p class="settings-links"><a href="/privacy/">Privacy notice</a></p>
    <p class="settings-links"><a href="/cookies/">Cookie policy</a></p>
    <p class="settings-links"><a href="/plus/">Spiquizzy Plus</a></p>
    <p class="clear-note" id="clear-note"></p>
    <p><button class="btn-danger" type="button" id="clear-local">Clear local data</button></p>`;
  view.querySelector("#clear-note").textContent = CLEAR_LOCAL_COPY;
  return view;
}

function archiveView() {
  const view = el("section", "page");
  view.id = "view-archive";
  view.hidden = true;
  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = LOGO;
  logo.width = 64;
  logo.height = 64;
  logo.alt = "Spiquizzy";
  const back = el("a", "btn-primary", COPY.practiceBack);
  back.href = "/";
  view.append(logo, el("h1", null, "Archive"), el("p", null, COPY.archive), el("p", null, COPY.archivePlus), back);
  return view;
}

function missingView() {
  const view = el("section", "simple-center");
  view.id = "view-missing";
  view.hidden = true;
  view.innerHTML = `<img class="logo" src="${LOGO}" width="64" height="64" alt="Spiquizzy" style="margin:0 auto"><h1>Page not found</h1><p style="font-weight:700">That page isn’t on Spiquizzy.</p><p><a class="btn-primary" href="/" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none">Back to today’s drop</a></p>`;
  return view;
}

function howtoSheet() {
  const back = el("div", "sheet-back");
  back.id = "howto";
  back.hidden = true;
  back.innerHTML = `<div class="sheet" role="dialog" aria-labelledby="howto-title">
    <h2 id="howto-title">How to play</h2>
    <div class="panel" data-panel="0"><p>${COPY.how1}</p>
      <div class="howto-scene">
        <div class="mini-board" aria-hidden="true">
          <div class="mini-door is-on t0"><span class="mini-sel">Selected</span><span class="mini-name">Monaco</span><b>40</b></div>
          <div class="mini-door t1"><span class="mini-name">San Marino</span><b>0</b></div>
          <div class="mini-door t2"><span class="mini-name">Liechtenstein</span><b>30</b></div>
          <div class="mini-door t3"><span class="mini-name">Vatican City</span><b>0</b></div>
        </div>
        <div class="mini-chips" aria-hidden="true"><span>+1</span><span>+10</span><span>+50</span><span>All</span><span>Rest</span></div>
        <p class="mini-note">${COPY.chipHint}</p>
      </div>
    </div>
    <div class="panel" data-panel="1" hidden><p>${COPY.how2}</p>
      <div class="howto-scene">
        <div class="mini-board is-reveal" aria-hidden="true">
          <div class="mini-door is-open t0"><span class="mini-flap"><span class="mini-name">Monaco</span></span><span class="mini-pit"></span></div>
          <div class="mini-door is-safe t1"><span class="mini-name">San Marino</span><b>40</b><span class="mini-stamp">+40 Safe</span></div>
          <div class="mini-door is-open t2"><span class="mini-flap"><span class="mini-name">Liechtenstein</span></span><span class="mini-pit"></span></div>
          <div class="mini-door is-open is-bare t3"><span class="mini-flap"><span class="mini-name">Vatican City</span></span><span class="mini-pit"></span></div>
        </div>
      </div>
    </div>
    <div class="panel" data-panel="2" hidden><p>${COPY.how3}</p>
      <div class="howto-scene howto-bank">
        <img src="${BANK}" width="64" height="64" alt="">
        <strong>Banked after all 10</strong>
        <button class="btn-ghost" type="button" data-nav="practice">${COPY.practiceTry}</button>
      </div>
    </div>
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

function signInPrompt() {
  const back = el("div", "prompt-back");
  back.id = "signin-prompt";
  back.hidden = true;
  back.innerHTML = `<div class="prompt-card" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
    <div class="prompt-scroll">
      <h2 id="prompt-title">Sign in to keep your progress</h2>
      <p>Save your bank, join weekly leagues, play on any device.</p>
      <form id="prompt-form">
        ${ageFields("prompt")}
        <p id="prompt-note"></p>
        <label for="prompt-email">Email</label>
        <input id="prompt-email" type="email" autocomplete="email" required>
        ${rememberFields("prompt-remember")}
        <button class="btn-primary" type="submit">Email me a link</button>
      </form>
      <p id="prompt-google"${GOOGLE_SIGN_IN ? "" : " hidden"}><a class="btn-google" id="prompt-google-link" href="#">${GOOGLE_MARK}<span>Continue with Google</span></a></p>
    </div>
    <button class="btn-ghost" type="button" id="prompt-later">Not right now</button>
  </div>`;
  return back;
}

function playingNow() {
  return Boolean(run && run.status === "in_progress" && !document.querySelector("#view-play")?.hidden);
}

function offerSignIn() {
  const route = ROUTES[location.pathname] || document.body.dataset.route || "home";
  if (SHOT || session?.access_token || playingNow() || route === "signin" || route === "plus") return false;
  try {
    if (sessionStorage.getItem(SIGNED_OUT_KEY)) {
      sessionStorage.removeItem(SIGNED_OUT_KEY);
      return false;
    }
    if (sessionStorage.getItem(PROMPT_KEY)) return false;
  } catch {
    return false;
  }
  const card = document.querySelector("#signin-prompt");
  if (!card) return false;
  card.hidden = false;
  try { sessionStorage.setItem(PROMPT_KEY, "1"); } catch { /* private mode */ }
  return true;
}

function closeSignPrompt() {
  const card = document.querySelector("#signin-prompt");
  if (!card || card.hidden) return;
  card.hidden = true;
}

function tabBar() {
  const nav = el("nav", "tabbar");
  nav.id = "tabbar";
  nav.setAttribute("aria-label", "App");
  const items = [
    ["play", "Play", `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M8 5v14l11-7z"/></svg>`],
    ["league", "Leagues", `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 20V10M12 20V4M20 20V14"/></svg>`],
    ["profile", "Stats", `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 3.5-4.5 7-4.5S17.5 16 19 19"/></svg>`],
  ];
  for (const [dest, label, icon] of items) {
    const link = el("a", "tab");
    link.href = dest === "play" ? "/play/" : dest === "league" ? "/leagues/" : "/profile/";
    link.dataset.nav = dest;
    link.innerHTML = `${icon}<span>${label}</span>`;
    nav.append(link);
  }
  return nav;
}

function usernameGate() {
  const back = el("div", "prompt-back");
  back.id = "username-gate";
  back.hidden = true;
  back.innerHTML = `<div class="prompt-card" role="dialog" aria-modal="true" aria-labelledby="user-title">
    <img src="${LOGO}" width="48" height="48" alt="Spiquizzy">
    <h2 id="user-title">Pick a username</h2>
    <p>This is your name on the global board. Letters, numbers and underscores.</p>
    <form id="user-form">
      <label for="user-name">Username</label>
      <p class="name-real">${COPY.realName}</p>
      <input id="user-name" name="username" autocomplete="username" maxlength="16" required spellcheck="false">
      <button class="btn-primary" type="submit">Save username</button>
    </form>
    <p id="user-note"></p>
    <button class="btn-ghost" type="button" id="user-later">Not now</button>
  </div>`;
  return back;
}

function openUsername() {
  const card = document.querySelector("#username-gate");
  if (!card) return;
  card.hidden = false;
}

function closeUsername() {
  const card = document.querySelector("#username-gate");
  if (!card || card.hidden) return;
  card.hidden = true;
}

function offerUsername() {
  if (SHOT || playingNow() || !session?.access_token || !profile || profile.username) return false;
  try {
    if (sessionStorage.getItem(NAME_LATER_KEY)) return false;
  } catch {
    return false;
  }
  openUsername();
  return true;
}

function signOut() {
  clearSession();
  session = null;
  profile = null;
  signInNotice = "";
  try { sessionStorage.setItem(SIGNED_OUT_KEY, "1"); } catch { /* private mode */ }
  location.reload();
}

function serverMessage(error) {
  const text = String(error?.message || "");
  try {
    const parsed = JSON.parse(text);
    if (parsed.message) return String(parsed.message);
  } catch { /* the body was plain text */ }
  if (text.includes("taken")) return "That username is taken.";
  if (text.includes("different username")) return "Pick a different username.";
  if (text.includes("3 to 16")) return "Use 3 to 16 characters: letters, numbers and underscores.";
  return "That didn’t save. Try again.";
}

async function saveUsername(raw, note, done) {
  const problem = usernameError(raw);
  if (problem) {
    note.textContent = problem;
    return;
  }
  if (!session?.access_token) {
    note.textContent = "Sign in to choose a username.";
    return;
  }
  try {
    profile = { ...(profile || {}), ...(await setUsername(raw.trim(), session)) };
    note.textContent = "Saved.";
    const field = document.querySelector("#set-username");
    if (field) field.value = profile.username || raw.trim();
    done?.();
  } catch (error) {
    note.textContent = serverMessage(error);
  }
}

function trapDialog(event) {
  const card = [...document.querySelectorAll("#username-gate, #signin-prompt")].find((node) => node && !node.hidden);
  if (!card) return;
  if (event.key === "Escape") {
    event.preventDefault();
    if (card.id === "username-gate") closeUsername();
    else closeSignPrompt();
    return;
  }
  if (event.key !== "Tab") return;
  const items = [...card.querySelectorAll("input, button, a")].filter((node) => !node.disabled && !node.closest("[hidden]"));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function consentBar() {
  const bar = el("aside", "consent");
  bar.id = "consent";
  bar.innerHTML = `<p>We only count page views if you Accept. <a href="/cookies/">Cookie policy</a></p><div class="pair"><button type="button" id="consent-no">Reject</button><button type="button" id="consent-yes">Accept</button></div>`;
  return bar;
}

function paintHowArt() {
  document.querySelectorAll("[data-panel='0'] .mini-door.is-on, [data-panel='0'] .mini-door.t2").forEach((door) => {
    if (door.querySelector("img")) return;
    const coins = el("span", "mini-coins");
    const count = door.classList.contains("is-on") ? 2 : 1;
    for (let i = 0; i < count; i += 1) coins.append(coinImg(18));
    door.append(coins);
  });
}

function show(name) {
  for (const id of ["home", "play", "results", "league", "bank", "profile", "signin", "plus", "settings", "archive", "missing"]) {
    const node = document.querySelector(`#view-${id}`);
    if (node) node.hidden = id !== name;
  }
  document.querySelector("#site-header").hidden = name === "play";
  paintTabs(name);
  const headerSign = document.querySelector("#header-signin");
  if (headerSign) headerSign.hidden = Boolean(session?.access_token);
  if (name === "home") paintHome();
  if (name === "league") paintLeague("Weekly");
  if (name === "bank") paintBank();
  if (name === "profile") paintProfile();
  if (name === "settings") paintSettings();
  if (name === "signin") paintSignin({ focusInbox: true });
  window.scrollTo(0, 0);
}

function paintTabs(name) {
  const current = name === "home" || name === "play" ? "play"
    : name === "league" ? "league"
    : name === "profile" ? "profile"
    : "";
  document.querySelectorAll("#tabbar .tab").forEach((tab) => {
    if (tab.dataset.nav === current) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  document.body.classList.toggle("is-playing", name === "play");
}

function currentQuestion() {
  if (run?.practice) return { q: PRACTICE.q, answers: PRACTICE.answers };
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
  const ended = run && !run.practice && run.date === today && run.status !== "in_progress";
  const button = document.querySelector("#play-btn");
  button.textContent = ended ? "See results" : (run && !run.practice && run.status === "in_progress" ? "Resume" : "Play");
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
      selected: null,
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
  document.querySelector("#view-play")?.classList.remove("has-timeout-note");
  document.querySelector("#q-text").textContent = item.q;
  const banner = document.querySelector("#practice-banner");
  if (banner) banner.hidden = !run.practice;
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
  if (SHOT === "play" || SHOT === "picked" || SHOT === "falling" || SHOT === "next" || SHOT === "drop") startTimer(11000, true);
  else if (left <= 0) onTimeout();
  else startTimer(left, false);
  if (run.practice || SHOT) {
    const note = document.querySelector("#offline-note");
    if (note && run.practice) note.hidden = true;
    return;
  }
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
    door.classList.toggle("is-picked", run.phase !== "reveal" && run.selected != null && index === run.selected);
    const minus = door.querySelector(".btn-minus");
    const hideMinus = amount === 0 || run.phase === "reveal";
    minus.hidden = hideMinus;
    minus.disabled = hideMinus;
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
  const picked = run.selected != null && run.phase !== "reveal";
  const chips = chipState(pots, run.selected ?? 0);
  document.querySelectorAll(".amount-bar button").forEach((button) => {
    if (button.dataset.add) button.disabled = !picked || !chips[Number(button.dataset.add)];
    else if (button.dataset.all != null) button.disabled = !picked || !chips.all;
    else button.disabled = !picked || !chips.rest;
  });
  const chipHint = document.querySelector("#chip-hint");
  if (chipHint) chipHint.hidden = !(run.q === 0 && run.phase !== "reveal");
  const lock = document.querySelector("#lock");
  paintAdding();
  paintCoach();
  paintLockReason();
  if (run.phase === "reveal") {
    if (run.revealReady) {
      lock.textContent = nextLabel();
      lock.disabled = false;
    }
    return;
  }
  lock.textContent = "Lock in";
  lock.disabled = !canManualLock(pots);
  document.querySelector("#undo").disabled = !run.undo.length;
}

function coachingNow() {
  if (!run || run.q !== 0 || run.phase === "reveal") return false;
  try { return localStorage.getItem(COACH_KEY) !== "1"; } catch { return false; }
}

function paintCoach() {
  const node = document.querySelector("#coach");
  const view = document.querySelector("#view-play");
  const on = coachingNow();
  if (node) node.hidden = !on;
  if (!view || !run) return;
  const ready = on && canManualLock(run.pots);
  view.classList.toggle("is-coach", on && !ready);
  view.classList.toggle("is-ready", ready);
}

function paintLockReason() {
  const node = document.querySelector("#lock-reason");
  if (!node || !run) return;
  if (run.phase === "reveal" || canManualLock(run.pots)) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  const pots = run.pots;
  const total = pots.tray + pots.doors.reduce((sum, count) => sum + count, 0);
  node.hidden = false;
  node.textContent = pots.tray > 0
    ? `Place all ${total} coins to lock in`
    : "Leave one answer empty to lock in";
}

function paintAdding() {
  const adding = document.querySelector("#adding");
  const bar = document.querySelector(".amount-bar");
  if (!adding || !run) return;
  const note = document.querySelector("#adding-note");
  const showNote = run.phase === "reveal" && run.timeoutNote;
  adding.classList.toggle("is-note", Boolean(showNote));
  if (note) {
    note.hidden = !showNote;
    note.textContent = showNote ? run.timeoutNote : "";
  }
  const chip = document.querySelector("#adding-letter");
  const label = document.querySelector("#adding-name");
  const to = adding.querySelector(".to");
  if (run.selected == null) {
    if (to) to.textContent = COPY.pickAnswer;
    if (chip) chip.hidden = true;
    if (label) label.textContent = "";
    if (bar) bar.setAttribute("aria-label", COPY.pickAnswer);
    return;
  }
  if (to) to.textContent = "Adding to";
  const index = run.selected;
  const letter = LETTERS[index] || "A";
  const name = currentQuestion()?.answers?.[index] || "";
  if (chip) {
    chip.hidden = false;
    chip.textContent = letter;
  }
  if (label) label.textContent = name;
  if (bar) bar.setAttribute("aria-label", `Add coins to ${letter}, ${name}`);
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
    const label = document.querySelector("#timer-secs");
    if (label) label.textContent = `${seconds}s`;
    bar.setAttribute("aria-label", `${seconds} seconds left of 25`);
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

function dropSound() {
  try {
    const ctx = audioCtx || (audioCtx = new AudioContext());
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  } catch {
    /* sound can be blocked */
  }
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
  stopTimer();
  const filled = timeoutFill(run.pots);
  run.timeoutFrom = totalInPlay(run.pots);
  run.timeoutNote = filled.note || "";
  const lockInFilled = () => {
    run.pots = filled.pots;
    const lostAll = run.timeoutFrom > 0 && totalInPlay(run.pots) === 0;
    lockQuestion(true, lostAll);
  };
  if (!filled.filled || reduced()) {
    lockInFilled();
    return;
  }
  slideLeftovers(filled.door, lockInFilled);
}

function slideLeftovers(door, done) {
  const card = document.querySelector(`.door[data-i="${door}"]`);
  const tokens = [...document.querySelectorAll(".tray-token")];
  if (!card || !tokens.length) {
    window.setTimeout(done, 300);
    return;
  }
  const target = card.getBoundingClientRect();
  tokens.forEach((token) => {
    const from = token.getBoundingClientRect();
    const dx = (target.left + target.width / 2) - (from.left + from.width / 2);
    const dy = (target.top + target.height / 2) - (from.top + from.height / 2);
    token.style.transition = "transform 300ms ease-in";
    token.style.transform = `translate(${dx}px, ${dy}px)`;
    token.style.zIndex = "40";
  });
  window.setTimeout(done, 300);
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
    if (run.practice) {
      correct = gradePractice(dist).correct;
    } else if (SHOT === "falling" || SHOT === "next" || SHOT === "drop" || SHOT === "timeout") {
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
  const funFact = run.practice
    ? PRACTICE.fact
    : (typeof server?.funFact === "string" ? server.funFact.trim() : "");
  run.reveal = { correct, keptAmount, lostAmount, wiped, timeout, before, funFact };
  saveRun();
  beginDrop(correct, keptAmount, lostAmount);
}

function showFunFact(text) {
  const node = document.querySelector("#fun-fact");
  if (!node) return;
  node.hidden = false;
  const clean = typeof text === "string" ? text.trim() : "";
  node.textContent = clean;
  if (run && clean) run.lastFact = clean;
}

function beginDrop(correct, keptAmount, lostAmount) {
  const view = document.querySelector("#view-play");
  if (run.q === 0 && !run.practice) {
    try { localStorage.setItem(COACH_KEY, "1"); } catch { /* private mode */ }
    view?.classList.remove("is-coach", "is-ready");
    const coach = document.querySelector("#coach");
    if (coach) coach.hidden = true;
  }
  document.querySelectorAll(".door").forEach((door) => {
    const index = Number(door.dataset.i);
    door.classList.remove("is-picked");
    if (index === correct) {
      door.classList.add("is-correct");
      const stamp = door.querySelector(".safe-stamp");
      if (keptAmount > 0) stamp.textContent = `+${keptAmount} Safe`;
      else {
        stamp.textContent = COPY.safeEmpty;
        stamp.classList.add("is-empty-pot");
      }
    } else {
      door.classList.add("is-wrong");
      if (!(run.pots.doors[index] > 0)) door.classList.add("is-bare");
    }
  });
  if (settings.sound && !reduced()) dropSound();
  document.querySelector("#undo").disabled = true;
  const bankHint = document.querySelector("#bank-hint");
  if (bankHint) bankHint.hidden = true;
  renderStake();
  if (run.timeoutNote) {
    document.querySelector("#view-play")?.classList.add("has-timeout-note");
    paintAdding();
  }
  document.querySelector("#pending-count").textContent = String(run.reveal.before);
  const float = document.querySelector("#pending-float");
  if (float) float.textContent = lostAmount ? `−${lostAmount}` : "";
  const finish = () => {
    document.querySelector("#pending-count").textContent = String(keptAmount);
    document.querySelector("#play-coins")?.setAttribute("aria-label", `${keptAmount} coins in play. Bank ${bank.balance}. Show bank.`);
    if (float) float.textContent = "";
    run.revealReady = true;
    const lock = document.querySelector("#lock");
    lock.textContent = nextLabel();
    lock.disabled = false;
    view.classList.add("is-next", "is-done");
    view.classList.remove("is-pressing", "is-suspense", "is-dropping", "is-pending-tick");
    showFunFact(run.reveal?.funFact);
  };
  if ((reduced() && !SHOT) || SHOT === "next") {
    view.classList.add("is-safe-reveal", "is-stamping", "is-tagged", "is-pending-tick", "is-next", "is-done", "was-open");
    document.querySelectorAll(".door.is-wrong .coin").forEach((coin) => { coin.style.opacity = "0"; });
    finish();
    return;
  }
  view.classList.add("is-pressing");
  const timing = { press: 80, suspense: 300, flap: 280, coinStart: 120, safeAt: 700, stampAt: 980, closeAt: 1120, tagAt: 1320, pendingAt: 1500, doneAt: 1980 };
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
  run.selected = null;
  armed = null;
  if (run.practice) {
    closeRun(kept ? "completed" : "busted", 0);
    return;
  }
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
  run.banked = run.practice ? 0 : banked;
  run.phase = "done";
  if (run.practice) {
    showResults();
    return;
  }
  rememberDay(run.date, status === "completed" ? banked : 0, status);
  saveRun();
  logEvent(status === "completed" ? "run_completed" : "run_busted", { banked });
  showResults();
}

function forfeit() {
  if (run?.practice) {
    endPractice();
    return;
  }
  run.status = "forfeited";
  run.banked = 0;
  run.phase = "done";
  rememberDay(run.date, 0, "forfeited");
  saveRun();
  logEvent("run_forfeited");
  if (session) forfeitRun(session).catch(() => {});
  showResults();
}

function nudgeSeenToday() {
  try { return localStorage.getItem(BANK_NUDGE_KEY) === londonToday(); } catch { return true; }
}

function markNudge() {
  try { localStorage.setItem(BANK_NUDGE_KEY, londonToday()); } catch { /* private mode */ }
}

function paintShareCard() {
  const cells = shareTrail(run);
  const graphic = document.querySelector("#share-trail");
  if (!graphic) return;
  graphic.replaceChildren();
  graphic.setAttribute("role", "img");
  graphic.setAttribute("aria-label", shareTrailLabel(cells));
  cells.forEach((cell) => {
    const node = el("span", `share-cell is-${cell.state}`);
    if (cell.state === "safe") {
      const fill = el("span", "share-fill");
      const height = Math.max(12, Math.round((cell.coins / (pack?.startCoins || START_COINS)) * 100));
      fill.style.height = `${Math.min(100, height)}%`;
      node.append(fill);
    } else if (cell.state === "dropped") {
      node.append(el("span", "share-fill"));
    }
    graphic.append(node);
  });
}

function showResults() {
  show("results");
  const practice = Boolean(run.practice);
  const cleared = !practice && run.status === "completed" && run.banked > 0;
  const wiped = !practice && run.status === "completed" && run.banked === 0;
  const left = !practice && run.status === "forfeited";
  const zero = !practice && !cleared;
  const title = document.querySelector("#result-title");
  const sub = document.querySelector("#result-sub");
  if (practice) {
    title.textContent = COPY.practiceTitle;
    sub.textContent = COPY.practiceSub;
  } else if (cleared) {
    title.textContent = "Banked!";
    sub.textContent = "You finished all 10 questions.";
  } else if (wiped) {
    title.textContent = "All 10, none left";
    sub.textContent = "You finished the drop, but no coins survived the last question.";
  } else if (left) {
    title.textContent = "Zero banked";
    sub.textContent = "You left early, so nothing was banked today.";
  } else {
    title.textContent = "Dropped!";
    sub.textContent = "Finish all 10 to bank your coins — so this day banks 0.";
  }
  document.querySelector("#share-who").textContent = practice ? "Practice" : `Spiquizzy #${run.dropNumber}`;
  paintShareCard();
  const line = document.querySelector("#banked-line");
  line.replaceChildren();
  line.classList.toggle("banked-anim", cleared);
  const icon = document.createElement("img");
  icon.src = BANK;
  icon.alt = "";
  icon.width = 36;
  icon.height = 36;
  if (practice) {
    line.append(icon, document.createTextNode(" Not added to your bank"));
  } else {
    line.append(icon, document.createTextNode(" Banked "), el("span", "count", String(run.banked || 0)));
    line.append(el("span", "running", `Bank ${bank.balance}`));
  }
  const fact = document.querySelector("#result-fact");
  const factText = (run.reveal?.funFact || run.lastFact || "").trim();
  if (fact) {
    fact.hidden = !factText;
    fact.textContent = factText;
  }
  const seeYou = document.querySelector("#see-you");
  if (seeYou) seeYou.hidden = practice || !zero;
  const snip = document.querySelector("#league-snip");
  snip.replaceChildren();
  if (practice) {
    snip.hidden = true;
  } else {
    snip.hidden = false;
    snip.textContent = !session
      ? COPY.leagueGuest
      : profile?.opted_out_of_boards === true
        ? "You’re hidden from the leagues board."
        : "Your rank is on the global board.";
  }
  const done = document.querySelector("#practice-done");
  if (done) done.hidden = !practice;
  const countdown = document.querySelector("#countdown");
  if (countdown) countdown.hidden = practice;
  if (!practice) tickCountdown();
  const nudge = document.querySelector("#bank-nudge");
  const guest = !practice && !session?.access_token;
  const shotNudge = SHOT === "nudge" || SHOT === "results" || SHOT === "bust";
  const showNudge = guest && (shotNudge || (!SHOT && !nudgeSeenToday()));
  if (nudge) {
    nudge.hidden = !showNudge;
    if (showNudge && !SHOT) markNudge();
  }
  const prompt = document.querySelector("#signin-prompt");
  if (prompt) prompt.hidden = true;
}

function shareText() {
  const cells = shareTrail(run);
  const marks = cells.map((cell) => (cell.state === "safe" ? "🟢" : cell.state === "dropped" ? "🟥" : "⬜")).join("");
  const mid = Math.ceil(run.history.length / 2);
  let body = `${marks}\n🪙 ${run.history.slice(0, mid).join(" → ")}`;
  if (run.history.length > mid) body += `\n→ ${run.history.slice(mid).join(" → ")}`;
  if (!run.practice && run.status === "busted") body += ` 💀 Q${run.q + 1}`;
  body += `\nbanked ${run.practice ? 0 : (run.banked || 0)}`;
  const title = run.practice ? "Spiquizzy practice" : `Spiquizzy #${run.dropNumber}`;
  return `${title}\n${body}\nspiquizzy.com`;
}

function startPractice() {
  if (!run?.practice) officialHold = run;
  run = {
    practice: true,
    date: londonToday(),
    dropNumber: 0,
    status: "in_progress",
    q: 0,
    pots: freshPots(pack?.startCoins || START_COINS),
    selected: null,
    history: [pack?.startCoins || START_COINS],
    undo: [],
    banked: 0,
    servedAt: Date.now(),
    phase: "question",
  };
  show("play");
  renderQuestion();
}

function endPractice() {
  run = officialHold && !officialHold.practice ? officialHold : null;
  officialHold = null;
  show("home");
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
  const people = Array.isArray(rows) ? rows : [];
  people.forEach((row) => {
    const item = document.createElement("li");
    if (row.you) item.classList.add("is-you");
    item.append(
      el("span", "pos", String(row.rank)),
      el("span", null, row.name),
      el("span", null, Number(row.coins).toLocaleString("en-GB")),
    );
    list.append(item);
  });
}

async function paintLeague(which) {
  const title = document.querySelector("#league-title");
  const you = document.querySelector("#you-rank");
  const guest = document.querySelector("#league-guest");
  if (title) title.textContent = which === "All-time" ? "All-time league" : `${which} league`;
  document.querySelector("#league-meta").textContent = "Global board · coins banked";
  const foot = document.querySelector("#league-foot");
  const needsName = Boolean(session?.access_token && profile && !profile.username);
  setLeagueFoot(foot, needsName);
  if (SHOT === "rank" || SHOT === "league") {
    if (you) you.hidden = true;
    if (guest) guest.hidden = true;
    paintLeagueRows([]);
    const empty = document.querySelector("#league-empty");
    if (empty) {
      empty.hidden = false;
      empty.textContent = COPY.leagueEmpty;
    }
    if (foot) foot.textContent = "";
    return;
  }
  let board = null;
  if (!SHOT) {
    try {
      board = await leaderboard(PERIODS[which] || "week", session);
    } catch {
      board = null;
    }
  }
  const rows = Array.isArray(board?.rows) ? board.rows : [];
  paintLeagueRows(rows);
  const empty = document.querySelector("#league-empty");
  if (empty) {
    empty.hidden = !(board && rows.length === 0);
    empty.textContent = session?.access_token ? COPY.leagueEmptySigned : COPY.leagueEmpty;
  }
  const missingName = Boolean(session?.access_token && (board?.you?.needsUsername || (profile && !profile.username)));
  setLeagueFoot(foot, missingName);
  if (!session?.access_token) {
    if (guest) guest.hidden = true;
    if (foot) foot.textContent = "";
    if (!board) {
      if (empty) empty.hidden = true;
      if (you) {
        you.hidden = false;
        you.classList.remove("is-link");
        you.replaceChildren(document.createTextNode(COPY.boardUnavailable));
      }
      return;
    }
    const noRows = rows.length === 0;
    if (empty) {
      empty.hidden = !noRows;
      empty.textContent = COPY.leagueEmpty;
    }
    if (you) {
      you.classList.remove("is-link");
      you.hidden = noRows;
      if (!noRows) you.replaceChildren(document.createTextNode(COPY.leagueGuest));
    }
    return;
  }
  if (you) you.hidden = false;
  if (guest) guest.hidden = true;
  if (profile?.opted_out_of_boards === true) {
    if (you) {
      you.classList.remove("is-link");
      you.replaceChildren(document.createTextNode("You’re hidden from this board."));
    }
    return;
  }
  if (missingName) {
    showPickUsername(you);
    return;
  }
  if (!board) {
    if (you) {
      you.classList.remove("is-link");
      you.replaceChildren(document.createTextNode("The board isn’t available right now."));
    }
    return;
  }
  if (you) {
    you.classList.remove("is-link");
    you.replaceChildren(document.createTextNode(formatYouRank(board.you, board.total)));
  }
}

function setLeagueFoot(foot, needsName) {
  if (!foot) return;
  if (!session?.access_token) foot.textContent = "Sign in to appear on the public board.";
  else if (profile?.opted_out_of_boards === true) foot.textContent = "You’re hidden from the leagues board. You can show your username again in Settings.";
  else if (needsName) foot.textContent = "Pick a username in Profile to appear on the public board.";
  else foot.textContent = "You’re on the global board. Coins banked in the period, ranked against everyone.";
}

function showPickUsername(you) {
  if (!you) return;
  you.classList.add("is-link");
  you.replaceChildren();
  const link = el("a", null, "Pick a username to join the board.");
  link.href = "/settings/#set-username";
  you.append(link);
}

function statGrid(stats, id) {
  const grid = el("div", "stat-grid");
  if (id) grid.id = id;
  for (const [value, label, hint] of [
    [stats.daysPlayed, COPY.daysPlayed, ""],
    [stats.streak, COPY.streak, COPY.streakHint],
    [stats.bestBanked, COPY.bestBanked, ""],
  ]) {
    const cell = el("p");
    cell.append(el("strong", null, String(value)), el("span", null, label));
    if (hint) cell.append(el("small", null, hint));
    grid.append(cell);
  }
  return grid;
}

function paintSpark(stats) {
  const spark = document.querySelector("#stat-spark");
  if (!spark) return;
  spark.replaceChildren();
  if (!stats.spark.length) {
    spark.hidden = true;
    return;
  }
  spark.hidden = false;
  const peak = Math.max(100, ...stats.spark.map((day) => day.banked));
  stats.spark.forEach((day) => {
    const bar = el("i");
    const height = day.banked <= 0 ? 8 : Math.max(8, Math.round((day.banked / peak) * 100));
    bar.style.height = `${height}%`;
    bar.title = `${day.date}: ${day.banked}`;
    spark.append(bar);
  });
}

function paintBank() {
  const signedIn = Boolean(session?.access_token);
  document.querySelector("#bank-guest").hidden = signedIn;
  document.querySelector("#bank-signed").hidden = !signedIn;
  document.querySelector("#sign-out-bank").hidden = !signedIn;
  document.querySelector("#bank-total").textContent = String(bank.balance);
  const slot = document.querySelector("#bank-stats");
  if (slot) slot.replaceWith(statGrid(playStats(bank.days, londonToday()), "bank-stats"));
  const list = document.querySelector("#bank-history");
  list.replaceChildren();
  bank.days.slice().reverse().forEach((day) => {
    list.append(el("li", null, ""));
    const item = list.lastChild;
    item.replaceChildren(el("span", null, formatLong(day.date)), el("span", null, `${day.banked} · ${day.status}`));
  });
}

function paintProfile() {
  const stats = playStats(bank.days, londonToday());
  const slot = document.querySelector("#stat-grid");
  if (slot) slot.replaceWith(statGrid(stats, "stat-grid"));
  paintSpark(stats);
  const note = document.querySelector("#stat-note");
  if (note) note.textContent = stats.daysPlayed ? COPY.statsFrom : COPY.statsEmpty;
}

function paintConsentChoice() {
  const status = document.querySelector("#consent-status");
  if (!status) return;
  let value = null;
  try { value = localStorage.getItem(CONSENT_KEY); } catch { /* private mode */ }
  status.textContent = `Page views: ${consentWord(value)}`;
  document.querySelector("#settings-accept")?.setAttribute("aria-pressed", value === "accept" ? "true" : "false");
  document.querySelector("#settings-reject")?.setAttribute("aria-pressed", value === "reject" ? "true" : "false");
}

function storeConsent(value) {
  localStorage.setItem(CONSENT_KEY, value);
  const bar = document.querySelector("#consent");
  if (bar) bar.hidden = true;
  document.documentElement.classList.remove("has-consent");
  paintConsentChoice();
}

function paintBoardOpt() {
  const signedIn = Boolean(session?.access_token);
  const row = document.querySelector("#board-row");
  const guest = document.querySelector("#board-guest");
  const button = document.querySelector("#set-board");
  const note = document.querySelector("#board-note");
  if (row) row.hidden = !signedIn;
  if (guest) guest.hidden = signedIn;
  if (!signedIn || !button) {
    if (note) {
      note.hidden = true;
      note.textContent = "";
    }
    return;
  }
  const known = typeof profile?.opted_out_of_boards === "boolean";
  const hidden = profile?.opted_out_of_boards === true;
  button.setAttribute("aria-pressed", hidden ? "true" : "false");
  if (!note) return;
  note.hidden = false;
  if (!known) note.textContent = "We couldn’t read this setting yet. Email contact@spiquizzy.com if you need to be hidden now.";
  else if (hidden) note.textContent = "You’re hidden. The board won’t show your username or the coins you banked.";
  else note.textContent = "Your username and the coins you bank are on the public board if you have a username.";
}

function paintSettings() {
  document.querySelector("#set-sound").setAttribute("aria-pressed", settings.sound ? "true" : "false");
  document.querySelector("#set-motion").setAttribute("aria-pressed", settings.motion ? "true" : "false");
  paintConsentChoice();
  paintBoardOpt();
  const input = document.querySelector("#set-username");
  const note = document.querySelector("#set-username-note");
  const signOutBtn = document.querySelector("#sign-out");
  const signedIn = Boolean(session?.access_token);
  if (signOutBtn) signOutBtn.hidden = !signedIn;
  if (!input || !note) return;
  const saveBtn = document.querySelector("#save-username");
  if (saveBtn) saveBtn.hidden = !signedIn;
  if (!signedIn) {
    input.disabled = true;
    input.value = "";
    note.textContent = "Sign in to choose a username.";
    return;
  }
  input.disabled = false;
  input.value = profile?.username || "";
  if (!note.textContent) note.textContent = profile?.username ? "" : "3 to 16 characters: letters, numbers and underscores.";
}

function paintGoogle() {
  if (!GOOGLE_SIGN_IN) return;
  const href = oauthUrl("google");
  document.querySelectorAll("a.btn-google").forEach((link) => {
    const box = link.closest("#signin-guest, #signin-prompt")?.querySelector("[data-age]");
    const open = Boolean(box?.checked);
    link.href = open ? href : "#";
  });
}

async function saveBoardOptOut(button) {
  if (!session?.access_token || !button) return;
  const next = button.getAttribute("aria-pressed") !== "true";
  const note = document.querySelector("#board-note");
  button.disabled = true;
  try {
    profile = { ...(profile || {}), ...(await setBoardOptOut(next, session)) };
    paintBoardOpt();
  } catch {
    if (note) {
      note.hidden = false;
      note.textContent = "That didn’t save. Email contact@spiquizzy.com if you need to be hidden now.";
    }
  } finally {
    button.disabled = false;
  }
}

function authRedirect() {
  return `${location.origin}/sign-in/`;
}

function readPendingEmail() {
  try { return sessionStorage.getItem(PENDING_EMAIL_KEY) || ""; } catch { return ""; }
}

function writePendingEmail(email) {
  try {
    if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch { /* private mode */ }
}

function readResendAt() {
  try { return Number(sessionStorage.getItem(RESEND_AT_KEY) || 0); } catch { return 0; }
}

function writeResendAt(at) {
  try {
    if (at) sessionStorage.setItem(RESEND_AT_KEY, String(at));
    else sessionStorage.removeItem(RESEND_AT_KEY);
  } catch { /* private mode */ }
}

function paintRemember() {
  const on = readRemember();
  document.querySelectorAll("[data-remember]").forEach((box) => { box.checked = on; });
}

function rememberChecked(root) {
  const box = root?.querySelector?.("[data-remember]");
  return box ? box.checked : true;
}

function setAuthMode(mode) {
  authMode = mode === "signup" ? "signup" : "signin";
  const signup = authMode === "signup";
  document.querySelector("#auth-mode-in")?.setAttribute("aria-selected", signup ? "false" : "true");
  document.querySelector("#auth-mode-up")?.setAttribute("aria-selected", signup ? "true" : "false");
  const title = document.querySelector("#signin-title");
  if (title) title.textContent = signup ? AUTH_COPY.signUpTitle : AUTH_COPY.signInTitle;
  const submit = document.querySelector("#auth-submit");
  if (submit) submit.textContent = signup ? AUTH_COPY.signUpSubmit : AUTH_COPY.signInSubmit;
  const password = document.querySelector("#auth-password");
  if (password) password.setAttribute("autocomplete", signup ? "new-password" : "current-password");
  const magic = document.querySelector("#auth-magic");
  if (magic) magic.hidden = signup;
  const note = document.querySelector("#auth-note");
  if (note) note.textContent = "";
}

function stopResendTimer() {
  if (resendTimer) window.clearInterval(resendTimer);
  resendTimer = 0;
}

function tickResend() {
  const button = document.querySelector("#inbox-resend");
  if (!button) return;
  const left = resendCooldownLeft(readResendAt());
  button.disabled = left > 0 || resendBusy;
  button.setAttribute("aria-busy", resendBusy ? "true" : "false");
  button.textContent = left > 0 ? AUTH_COPY.resendWait(left) : AUTH_COPY.resend;
  if (left > 0 && !resendTimer) resendTimer = window.setInterval(tickResend, 250);
  if (left <= 0 && !resendBusy) stopResendTimer();
}

function acceptSession(next) {
  saveSession(next);
  session = next;
  signInNotice = "";
  writePendingEmail("");
  const headerSign = document.querySelector("#header-signin");
  if (headerSign) headerSign.hidden = true;
  paintSignin();
}

function paintSignin({ focusInbox = false } = {}) {
  const signedIn = Boolean(session?.access_token);
  const guest = document.querySelector("#signin-guest");
  const signed = document.querySelector("#signin-signed");
  const inbox = document.querySelector("#signin-inbox");
  const pending = signedIn ? "" : readPendingEmail();
  if (signedIn) writePendingEmail("");
  if (guest) guest.hidden = signedIn || Boolean(pending);
  if (signed) signed.hidden = !signedIn;
  if (inbox) inbox.hidden = !pending;
  if (pending) {
    const sent = document.querySelector("#inbox-sent");
    if (sent) sent.textContent = AUTH_COPY.inboxSent(pending);
    const live = document.querySelector("#inbox-status");
    if (live && signInNotice && !live.textContent) live.textContent = signInNotice;
    tickResend();
    if (focusInbox) {
      const heading = document.querySelector("#inbox-title");
      requestAnimationFrame(() => heading?.focus());
    }
    return;
  }
  const note = document.querySelector("#auth-note");
  if (note && signInNotice) note.textContent = signInNotice;
  const row = document.querySelector("#google-row");
  if (row) row.hidden = !GOOGLE_SIGN_IN;
  paintGoogle();
}

function showInbox(email, { status = "", armCooldown = false } = {}) {
  writePendingEmail(email);
  if (armCooldown) writeResendAt(Date.now());
  const live = document.querySelector("#inbox-status");
  if (live) live.textContent = status;
  const sent = document.querySelector("#inbox-sent");
  if (sent) sent.textContent = "";
  paintSignin({ focusInbox: true });
}

function leaveInbox(mode) {
  writePendingEmail("");
  signInNotice = "";
  stopResendTimer();
  const live = document.querySelector("#inbox-status");
  if (live) live.textContent = "";
  const password = document.querySelector("#auth-password");
  if (password) password.value = "";
  if (mode === "signup") {
    const email = document.querySelector("#auth-email");
    if (email) email.value = "";
  }
  setAuthMode(mode);
  paintSignin();
  const focusTarget = mode === "signup"
    ? document.querySelector("#auth-email")
    : document.querySelector("#signin-title");
  focusTarget?.focus();
}

function focusUsernameField() {
  if (location.hash !== "#set-username") return;
  const input = document.querySelector("#set-username");
  if (!input || input.disabled) return;
  input.scrollIntoView({ block: "center" });
  input.focus();
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
    if (run.selected == null) return;
    const door = run.selected;
    let next = run.pots;
    if (chip.dataset.add) next = addAmount(run.pots, door, Number(chip.dataset.add));
    else if (chip.dataset.all != null) next = allIn(run.pots, door);
    else next = addRest(run.pots, door);
    applyPots(next);
    return;
  }
  if (event.target.id === "bank-nudge-no") {
    markNudge();
    const nudge = document.querySelector("#bank-nudge");
    if (nudge) nudge.hidden = true;
    return;
  }
  if (event.target.id === "prompt-later") {
    closeSignPrompt();
    return;
  }
  if (event.target.id === "user-later") {
    try { sessionStorage.setItem(NAME_LATER_KEY, "1"); } catch { /* private mode */ }
    closeUsername();
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
  const google = event.target.closest("a.btn-google");
  if (google) {
    const root = google.closest("#signin-guest, #signin-prompt");
    const box = root?.querySelector("[data-age]");
    if (!box?.checked) {
      event.preventDefault();
      const note = root?.querySelector("#auth-note, #prompt-note");
      if (note) note.textContent = AGE_NEED;
      box?.focus();
      return;
    }
    chooseRemember(rememberChecked(root));
    google.href = oauthUrl("google");
    return;
  }
  if (event.target.id === "consent-yes" || event.target.id === "consent-no") {
    storeConsent(event.target.id === "consent-yes" ? "accept" : "reject");
    return;
  }
  if (event.target.id === "settings-accept" || event.target.id === "settings-reject") {
    storeConsent(event.target.id === "settings-accept" ? "accept" : "reject");
    return;
  }
  if (event.target.id === "sign-out" || event.target.id === "sign-out-bank" || event.target.id === "sign-out-page") {
    signOut();
    return;
  }
  if (event.target.id === "clear-local") {
    if (confirm(CLEAR_LOCAL_COPY)) {
      localStorage.removeItem(RUN_KEY);
      localStorage.removeItem(BANK_KEY);
      localStorage.removeItem(SET_KEY);
      localStorage.removeItem(BANK_NUDGE_KEY);
      clearLocalAuth();
      location.href = "/";
    }
    return;
  }
  if (event.target.id === "set-board") {
    void saveBoardOptOut(event.target);
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
  const inPlay = Boolean(run && run.status === "in_progress" && !document.querySelector("#view-play").hidden);
  const action = navAction(dest, { inPlay });
  if (action.type === "howto") {
    event.preventDefault();
    openHow(0);
    return;
  }
  if (action.type === "practice") {
    event.preventDefault();
    const sheet = document.querySelector("#howto");
    if (sheet) sheet.hidden = true;
    startPractice();
    return;
  }
  if (run?.practice && action.type === "leave") {
    event.preventDefault();
    endPractice();
    return;
  }
  if (action.type === "leave") {
    event.preventDefault();
    document.querySelector("#leave-modal").hidden = false;
    return;
  }
  if (action.type === "go" && nav.tagName !== "A") {
    event.preventDefault();
    location.href = action.href;
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
  if (SHOT === "howto2") { show("home"); openHow(1); return; }
  if (SHOT === "howto3") { show("home"); openHow(2); return; }
  if (SHOT === "archive") { show("archive"); return; }
  if (SHOT === "plus") { show("plus"); return; }
  if (SHOT === "stats") { bank = loadBank(); show("profile"); return; }
  if (SHOT === "picked") {
    run.q = 0;
    run.selected = 0;
    run.pots = { tray: 30, doors: [40, 0, 30, 0] };
    run.history = [100];
    show("play");
    renderQuestion();
    return;
  }
  if (SHOT === "bust" || SHOT === "nudge") {
    run.status = "busted";
    run.banked = 0;
    run.q = 2;
    run.history = [100, 80, 40, 0];
    run.reveal = { funFact: "Camels store fat, not water, in their humps." };
    bank.balance = 0;
    bank.days = [];
    showResults();
    return;
  }
  if (SHOT === "username") { show("home"); openUsername(); return; }
  if (SHOT === "rank") { show("league"); return; }
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
  if (SHOT === "timeout") {
    run.pots = { tray: 15, doors: [10, 20, 5, 50] };
    renderQuestion();
    window.setTimeout(() => onTimeout(), 60);
  }
  if (SHOT === "falling" || SHOT === "next" || SHOT === "drop") {
    window.setTimeout(() => lockQuestion(false), 60);
  }
}

async function boot() {
  paintGoogle();
  paintRemember();
  saveSettings();
  const consent = localStorage.getItem(CONSENT_KEY);
  const showConsent = consent !== "accept" && consent !== "reject";
  document.querySelector("#consent").hidden = !showConsent;
  document.documentElement.classList.toggle("has-consent", showConsent);
  document.querySelectorAll("[data-age]").forEach((box) => {
    box.addEventListener("change", paintGoogle);
  });
  document.querySelector("#auth-mode-in")?.addEventListener("click", () => setAuthMode("signin"));
  document.querySelector("#auth-mode-up")?.addEventListener("click", () => setAuthMode("signup"));
  document.querySelector("#inbox-back")?.addEventListener("click", () => leaveInbox("signin"));
  document.querySelector("#inbox-different")?.addEventListener("click", () => leaveInbox("signup"));
  document.querySelector("#inbox-resend")?.addEventListener("click", async () => {
    const email = readPendingEmail();
    if (!email || resendBusy || resendCooldownLeft(readResendAt()) > 0) return;
    const live = document.querySelector("#inbox-status");
    resendBusy = true;
    tickResend();
    try {
      await resend({
        type: "signup",
        email,
        options: { emailRedirectTo: authRedirect() },
      });
      writeResendAt(Date.now());
      if (live) live.textContent = AUTH_COPY.resent;
    } catch (error) {
      if (live) live.textContent = authErrorMessage("resend", error);
    } finally {
      resendBusy = false;
      tickResend();
    }
  });
  document.querySelector("#auth-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.querySelector("#auth-age");
    const note = document.querySelector("#auth-note");
    if (!box?.checked) {
      if (note) note.textContent = AGE_NEED;
      box?.focus();
      return;
    }
    const email = document.querySelector("#auth-email").value.trim();
    const password = document.querySelector("#auth-password").value;
    if (!email.includes("@")) {
      if (note) note.textContent = AUTH_COPY.needEmail;
      document.querySelector("#auth-email")?.focus();
      return;
    }
    if (passwordTooShort(password)) {
      if (note) note.textContent = AUTH_COPY.weakPassword;
      document.querySelector("#auth-password")?.focus();
      return;
    }
    chooseRemember(rememberChecked(document.querySelector("#auth-form")));
    const submit = document.querySelector("#auth-submit");
    if (submit) submit.disabled = true;
    try {
      if (authMode === "signup") {
        const result = await signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirect() },
        });
        if (signupScreenState(result) === "signed-in") {
          acceptSession(sessionFromAuth(result));
          return;
        }
        showInbox(email, { armCooldown: true });
        return;
      }
      const result = await signInWithPassword({ email, password });
      const next = sessionFromAuth(result);
      if (!next) throw new Error("No session");
      acceptSession(next);
    } catch (error) {
      if (authMode === "signin" && isUnconfirmed(error)) {
        showInbox(email, { status: AUTH_COPY.unconfirmed });
        return;
      }
      if (note) note.textContent = authErrorMessage(authMode === "signup" ? "signup" : "signin", error);
    } finally {
      if (submit) submit.disabled = false;
    }
  });
  document.querySelector("#auth-magic")?.addEventListener("click", async () => {
    const box = document.querySelector("#auth-age");
    const note = document.querySelector("#auth-note");
    if (!box?.checked) {
      if (note) note.textContent = AGE_NEED;
      box?.focus();
      return;
    }
    const email = document.querySelector("#auth-email").value.trim();
    if (!email.includes("@")) {
      if (note) note.textContent = AUTH_COPY.needEmail;
      document.querySelector("#auth-email")?.focus();
      return;
    }
    chooseRemember(rememberChecked(document.querySelector("#auth-form")));
    const button = document.querySelector("#auth-magic");
    if (button) button.disabled = true;
    try {
      await sendMagicLink(email, authRedirect());
      if (note) note.textContent = "Check your email for the sign-in link.";
    } catch (error) {
      if (note) {
        note.textContent = error?.status
          ? error.message
          : magicLinkErrorMessage(error?.status, error?.message || "");
      }
    } finally {
      if (button) button.disabled = false;
    }
  });
  document.querySelector("#prompt-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const box = document.querySelector("#prompt-age");
    const note = document.querySelector("#prompt-note");
    if (!box?.checked) {
      if (note) note.textContent = AGE_NEED;
      box?.focus();
      return;
    }
    const email = document.querySelector("#prompt-email").value.trim();
    chooseRemember(rememberChecked(document.querySelector("#prompt-form")));
    try {
      await sendMagicLink(email);
      note.textContent = "Check your inbox for the link";
    } catch (error) {
      note.textContent = error?.status
        ? error.message
        : magicLinkErrorMessage(error?.status, error?.message || "");
    }
  });
  document.querySelector("#user-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.querySelector("#user-note");
    await saveUsername(document.querySelector("#user-name").value, note, () => closeUsername());
  });
  document.querySelector("#name-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.querySelector("#set-username-note");
    await saveUsername(document.querySelector("#set-username").value, note);
  });
  pack = await (await fetch("/data/questions.public.json")).json();
  if (session?.access_token && !SHOT) {
    try { profile = await myProfile(session); } catch { profile = null; }
  }
  if (SHOT) {
    applyShot();
    return;
  }
  run = todayRun();
  const route = ROUTES[location.pathname] || document.body.dataset.route || "home";
  if (route === "play") startOrResume();
  else if (route === "howto") show("home");
  else show(route === "missing" ? "missing" : route);
  const waiting = showConsent || playingNow();
  if (!waiting && offerUsername()) {
    /* username step waits for a signed-in player */
  } else if (!showConsent && route === "howto") openHow(0);
  document.querySelector("#play-btn").addEventListener("click", () => { location.href = "/play/"; });
  focusUsernameField();
}

shell();
boot();
