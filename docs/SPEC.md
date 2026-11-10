# Spiquizzy — The Daily Drop

**Final build spec.** From the Spiquizzy critic, 10 November 2026 (Europe/London).

**Live site:** https://spiquizzy.com (repo `zachfrench939/spquizzy`, static on GitHub Pages today).

**Do not implement this on the live site until this spec is sent to you.** Do not message other bots. Do not spend money. Do not sign up to anything. Do not use Higgsfield. Do not wire payments without Zach’s approval.

This is a full redesign of the site around **one daily game**. Build from this spec, the working prototype and the screenshots, not from memory of the six-game site.

**Working prototype:** `/workspace/spiquizzy-critic/daily-drop/prototype/index.html`

Open as a file, or add `?shot=home|play|drop|results|league|howto|leave|404` to freeze a state.

**Screenshots (visual target), Playwright at 390×844 (iPhone UA, touch, 2×) and 1440×900:**

| File | What it shows |
| --- | --- |
| `shots/mobile-home.png` | Mobile home. Play well above the fold. Bank + 10 today. Ad reserved below Play. |
| `shots/mobile-play.png` | Mid Q3, 7 coins pending, neatly placed, “Finish all 10 to bank your coins”. |
| `shots/mobile-drop.png` | Trapdoors open, coins falling, **4 SAFE**, pending still 7. |
| `shots/mobile-results.png` | Full clear, share trail, **Banked 4**, league snippet, Share, ad underneath. |
| `shots/mobile-league.png` | Weekly Fusilli League with a clear **EXAMPLE DATA** banner. |
| `shots/desktop-home.png` | Desktop home, centred column, header nav. |
| `shots/mobile-home-short.png` | 375×667 check: Play still above the fold. |
| `shots/mobile-play-short.png` | 375×667 play: Lock in and Undo still on screen. |
| `shots/mobile-howto.png` | How-to, panel 1 of 3. |
| `shots/mobile-leave.png` | Leave confirm: “Leave now and you’ll bank 0 coins.” |

**Question pack (14 days × 10, fact-checked):** prompts and options in `data/questions.public.json`. The correct index stays in the database.

**Assets:** `assets/` — official red-square logo, fusilli coin (coin 3) and bank stack (coin 6) as SVG plus 32 / 64 / 128 PNG, wombat idle / thinking / cheering / sad, theme-9 fonts (Archivo Black, Syne, Space Grotesk). The original coin sheet Zach picked is `assets/coin-reference.jpg`.

---

## 0. Decisions (locked)

Zach handed the critic the product decisions. These are the defaults. Do not reopen them in the build.

### 0.1 The name

The site stays **Spiquizzy**, spelled exactly that way.

The game is called **The Daily Drop**.

Page title: `The Daily Drop — Spiquizzy`. Share header: `Spiquizzy #N`. People will say “Have you done today’s Spiquizzy?” the way they say Wordle. “The Daily Drop” is the first-visit subtitle and the SEO hook (daily habit + the trapdoor moment).

Why not the other options: “Meatball Drop” was retired when the token became a fusilli coin. “Fusilli Drop” is cute but harder to say. “Coin Drop” collides with arcade machines. One brand to market, one share line.

### 0.2 The token

In-game draggable token: **coin 3**, the yellow fusilli coin with a ridged rim (`assets/coin-fusilli.svg`, plus `coin-fusilli-32.png` and `coin-fusilli-64.png`). Use the 64px (or 128px) PNG on a 44×44 hit area, `image-rendering: auto` — it is a flat illustration, not pixel art.

Bank / balance icon: **coin 6**, the stack of fusilli coins (`assets/bank-stack.svg`, `bank-stack-32.png`, `bank-stack-64.png`).

Zach picked 3 for play and 6 for the balance. Neo-brutalist: thick black outline, hard shadow, cheese yellow. Do not use meatballs.

### 0.3 The look

Theme 9, neo-brutalist, which Zach picked: thick 3px black outlines, hard offset shadows, cheese / tomato / cream / ink, Archivo Black for the wordmark and buttons, Syne 800 for titles, Space Grotesk for body. Cheese is a fill, never small text. See §5.

### 0.4 The banking rule (new, and strict)

**Coins are only banked if the player finishes all 10 questions.** Leaving partway, or running out of coins before Q10, banks **0** for the day.

Make this unmistakable in three places:

1. **How-to, panel 3:** “Finish all 10 questions to bank what’s left. If you leave early, or you run out of coins, you bank 0 for the day.”
2. **A persistent line on the play screen:** a cheese sticker reading **Finish all 10 to bank your coins**, always visible during the official run.
3. **A confirm prompt on leave:** “Leave now and you’ll bank 0 coins. You can’t replay today’s official drop.” Primary button: **Keep playing**. Destructive: **Leave**.

During the run, remaining coins are labelled **Pending**, not Bank. The saved bank does not change until a successful Q10. After Q10, pending becomes **Banked** with a short pop animation, and only then is the amount added to the bank (server-side).

Refresh or a closed tab **resumes** the run. Only an explicit Leave (confirmed) forfeits the day. If the UK day rolls over with an unfinished run, that day banks 0.

### 0.5 Ads on home

The old brand rule was “no ads on the home page.” Engagement research (and Zach’s brief to use the best ad placement) allows **one reserved display unit below Play**. We take that, with a short-screen constraint:

- Play must stay **above the fold at 375×667 and 390×844**. On short phones the home ad sits **below the fold**. That is still “below Play”.
- Reserved CSS height, labelled “Advertisement”, no network until Zach says so.
- Nothing on the play board, ever. Results ad only after Share.

Justification: this funds the free game without covering the CTA, without shifting the layout (CLS), and without putting ads 150px from drag targets. UK cookie consent still needs equally prominent Accept and Reject. See §9.

---

## 1. Brand rules (do not drift)

- The name is **Spiquizzy**, spelled exactly that way. The domain stays spiquizzy.com.
- The official logo is the flat yellow ravioli puzzle piece on a red rounded square. It is a mark only, never pixelated (`image-rendering: auto`). Use `assets/logo-red.png`.
- Palette (locked tokens):

  | Token | Hex | Use |
  | --- | --- | --- |
  | Ink | `#111111` | Body text, outlines, shadows, primary button fill |
  | Navy | `#12203A` | Alternative text on cream or cheese; not required on chrome |
  | Cream | `#FFF8E7` | Page background |
  | Cheese | `#FBBF36` | Fills, header bar, pending chip, CTA type on ink, stickers |
  | Tomato | `#E63326` | Hard shadow on primary buttons, danger / drop accent. Not body text |
  | Mint | `#7DE0C3` | Answer tile C fill only |
  | Pink | `#FFB4D6` | Answer tile D fill only |
  | White | `#FFFFFF` | Answer tile A, cards |
  | Safe wash | `#D8F5C8` | Correct door after lock-in |
  | Hatch | `#140E0C` | Open trapdoor pit |
  | Muted | `#3A3A3A` | Secondary text on cream (10.74:1) |

- Contrast (WCAG 2.2, calculated):

  | Pair | Ratio | Normal text (4.5:1) | UI (3:1) |
  | --- | --- | --- | --- |
  | Ink on cream | 17.83:1 | Pass | Pass |
  | Navy on cream | 15.33:1 | Pass | Pass |
  | Ink on cheese | 11.34:1 | Pass | Pass |
  | Cheese on ink | 11.34:1 | Pass | Pass |
  | Ink on mint | 11.98:1 | Pass | Pass |
  | Ink on pink | 11.47:1 | Pass | Pass |
  | Ink on white | 18.88:1 | Pass | Pass |
  | Muted `#3A3A3A` on cream | 10.74:1 | Pass | Pass |
  | Tomato on cream | 4.08:1 | **Fail** | Pass |
  | White on tomato | 4.32:1 | **Fail** | Pass |
  | Ink on tomato | 4.38:1 | **Fail** | Pass |

  Practical rules: body and question text are ink (or navy) on cream. Cheese is a fill, never small text. Tomato is not body text; if it is used on a button, use large type and a black outline, or prefer ink fill + cheese type (the theme-9 CTA). Safe / dropped are **never colour alone** — always a ✓ Safe or ↓ Dropped label.

- Fonts: **Archivo Black** for the wordmark, stickers’ display uses, and primary buttons (16px minimum on buttons, 20px on Play / Lock in / Share). **Syne 800** for titles and big figures (home title 36px mobile / 52px desktop; question 22px mobile / 26px desktop; result title 40px). **Space Grotesk 700** for body and answer names (16–17px). Do not use Press Start 2P on this redesign.
- UK English, `lang="en-GB"`. Full month names: “Wednesday 11 November 2026”.
- Mascot: the brown wombat. Idle on home, cheering on a successful bank, thinking or sad on a bust / leave. Not on the play board during a question.
- No textures, rivets, photoreal food, or linen. Hard 3px ink borders, hard shadows, plenty of cream.

---

## 2. The game, in one screenful

Each calendar day (midnight **Europe/London**) every player gets the same 10 questions, in the same order.

1. You start the day with **10 fusilli coins**. These are the day’s stake. They are **pending**, not yet in the bank. The header and home show “10 coins today + bank of X”.
2. Each question is general knowledge with **four answers**, labelled A–D, on a 2×2 of trapdoors (white, cheese, mint, pink).
3. You must place **every remaining coin**. At least one answer must stay empty, so you cannot cover the board. Lock in stays disabled until both are true.
4. On lock in, the wrong answers’ trapdoors open and those coins fall. Only coins on the right answer go through to the next question, back into the tray, still pending.
5. There are exactly **10 questions**. The HUD says “Question N of 10”.
6. If you ever hit 0 coins, the official run ends immediately and you **bank 0** for the day.
7. If you confirm Leave mid-run, the official run ends and you **bank 0**. You cannot replay that day’s official drop.
8. If you finish question 10 with coins still pending, those coins are **banked**. Pending animates into the bank stack. That amount is added to the player’s bank on the server.
9. If you finish question 10 with 0 coins left (wiped on the last question), you completed the drop but **bank 0**.
10. Leaderboards rank **coins banked in the period** (this week / month / year, or all-time). A day that banks 0 contributes 0 to the period. Weekly leagues are the default.

You cannot hold coins back in the tray. Undo reverses the last placement, not a lock-in.

Score for sharing is the coin trail plus coins banked, not a points formula. Example, full clear:

```
Spiquizzy #1
🪙 10 → 8 → 8 → 6 → 6 → 5
→ 5 → 4 → 4 → 4 → 4
banked 4
spiquizzy.com
```

A bust on question 6:

```
Spiquizzy #1
🪙 10 → 7 → 7 → 4 → 1 💀 Q6
banked 0
spiquizzy.com
```

---

## 3. Build order

### Phase 1 — MVP (build this)

Ship a complete, fair, shareable daily drop.

- Sitemap and 301s from the six-game site.
- Home, 3-panel how-to, play (drag + fallbacks), drop animation, results / share, bank, weekly league (plus monthly / yearly / all-time tabs), profile / basic stats, sign-in, settings, privacy / cookies, 404, premium **page** (copy and layout only).
- Guest play with local pending / bank, and a prompt to sign in to keep the bank and appear on public boards.
- Supabase (or equivalent) accounts, server-side answer checking, banking and leaderboards. The browser never receives the answer key.
- 14 days of questions, remapped so drop no. 1 is launch day, plus a content pipeline for the days after. The browser copy has no answer key.
- Ad **placeholders** in the reserved slots, plus a UK CMP shell (Accept and Reject equally prominent). No live ad network until Zach says so.
- SEO: title, description, OG share image (reuse the official-logo OG until a new one is made — do not spend money or use Higgsfield), JSON-LD, sitemap, `lang="en-GB"`.
- Analytics events for D1 / D7 retention (see §13).
- Accessibility and the test checklist in §15.

### Phase 2 — flag clearly, do not block launch

- Streaks: any finished official run (including a bust or a 0-banked finish) counts as playing that day. One **free** streak freeze for every player. A way to repair a broken streak. Premium may add **extra** freezes. Never make the only freeze, or the only repair, a paid item. One optional late reminder, not a barrage. If a streak breaks, still show bank, league and stats so a zero streak is not the player’s only identity.
- Friends / private leagues.
- Archive of past official days (premium) and a clearly labelled practice drop that does not touch the bank or public boards.
- Optional rewarded ads, opt-in only, for extras (practice, an extra freeze) — never to restore the official bank after a bust. Follow AdSense rewarded-ad policy.
- Cosmetics (coin / tray / avatar skins).
- Payment for Spiquizzy Plus — **not without Zach’s approval**, even in phase 2.

---

## 4. Sitemap and what to delete

Recommended surface:

| Path | Screen |
| --- | --- |
| `/` | Home, and the way into today’s drop |
| `/play` | Today’s drop (or keep play on `/` Wordle-style; either is fine, no path per question) |
| `/how-to-play` | Crawlable version of the 3 panels |
| `/leagues` | Weekly default, plus monthly / yearly / all-time |
| `/bank` | Bank balance and short history |
| `/profile` | Stats |
| `/sign-in` | Keep-your-bank |
| `/plus` | Premium pitch. No checkout until approved |
| `/settings` | Sound, reduce motion, privacy link |
| `/privacy` | Privacy and cookies |
| `/404` | Not found |

**Remove, do not hide:** the six games and all of their boards, art sheets, tutorials and routes — Sauce Pipes, Slip, Twirl, Even Bowls, Ravioli, Pasta Pips. That includes `/sauce-pipes/` and the other per-game URLs, `catalog.js`, Easy / Medium / Hard, Hint, Reset, D-pads, coaching notes, and the “Today’s six games” card grid. Timers as a primary HUD, and “Faster than X% of players” as the main result line. Photoreal bowls, riveted trays, linen, leftover six-game iconography.

**301** every old game path, and the old home catalog, to `/`. Do not leave a “classic” mode. Update `sitemap.xml`, robots, Open Graph, JSON-LD and the page title to **The Daily Drop — Spiquizzy**. Keep the official favicon and logo files.

---

## 5. Screens

Copy the prototype. Measurements below are for a 390-wide mobile screen unless noted.

### 5.1 Home

Visual target: `shots/mobile-home.png`, `shots/desktop-home.png`, `shots/mobile-home-short.png`.

- Sticky / inset **cheese header**, 3px ink border, 5px 5px 0 `#111` shadow. Official logo + **SPIQUIZZY** in Archivo Black 20px. Mobile: 44×44 Leagues and Settings icons. Desktop (≥900px): text links How to play, Leagues, Bank, Sign in — do not also show the icons.
- Idle wombat, then a white ink-bordered plate of the 10 fusilli coins.
- Kicker: “Today’s daily quiz”. Cheese sticker: **DROP NO. N**. Title **The Daily Drop** in Syne 800. Date with a full month name.
- One pitch, Space Grotesk 700, 17px: “Start with 10 coins. Put them on the answers you trust. Only the coins on the right answer go through. Finish all 10 questions to bank what’s left.”
- Endowment line, with the stack icon: **10 coins today + bank of X**.
- Primary **Play** button: ink fill, cheese type, 3px ink border, 6px 6px 0 tomato shadow, 58px tall, Archivo Black 20px, max-width 320px, centred. No infinite bob or pulse.
- Text link: “How to play”.
- **Reserved advertisement** under that block (see §9). On 375×667 the ad is below the fold; Play is not.
- Footer line: “Free to play · Same 10 questions for everyone · Resets at midnight UK time”.

After the player has finished today, Play becomes **See results**. A drop in progress resumes on Play. First visit opens the how-to (remember in `localStorage` / the account).

Desktop is a centred column, max-width about 560px, under a wider header (max-width about 1080px). Do not stretch Play to the column width.

### 5.2 How to play (3 panels)

A first-visit bottom sheet on mobile, a centred modal on desktop. Same sheet from “How to play” and from the `?` on the play header. Backdrop click dismisses. Remember so it does not pop every time.

Title in Archivo Black 16px+: **HOW TO PLAY**. Three panels, Next / Back, dots, **Got it** on panel 3.

1. Each day you get 10 coins. Drag them onto the answers you trust. You must place every coin, and leave at least one answer empty. (Art: 10 coins in a row.)
2. Lock in. Trapdoors under the wrong answers open and those coins fall. Only coins on the right answer go through to the next question. (Art: ✓ Safe and ↓ Dropped stickers.)
3. **Finish all 10 questions to bank what’s left.** If you leave early, or you run out of coins, you bank **0** for the day. Pending coins are not yours until the last question is done. (Art: bank stack + “Banked only after Q10”.)

The whole sheet should be readable in about 30 seconds. Do not add video or a carousel of the old six games.

### 5.3 Play

Visual target: `shots/mobile-play.png`, `shots/mobile-play-short.png`.

- Cheese header: Back (home, with the leave confirm if a run is in progress), logo + “The Daily Drop” on one line, `?`.
- Sticker: **Question N of 10**.
- Two chips: **Bank X** with the stack icon (the already-saved bank, does not change mid-run) and **Pending N** with the single fusilli coin, cheese fill. Pending is the coins still in play.
- Persistent cheese sticker: **Finish all 10 to bank your coins**.
- The question in Syne 800, 22px mobile / 26px desktop, ink on cream, 2–3 lines max. Do not also repeat “Question N” as a kicker.
- A **2×2 of trapdoors**. Tile fills: A white, B cheese, C mint, D pink. Ink letter badge, answer in 16px Space Grotesk 700, coins packed in a tight centred group at the bottom of the door. Empty doors stay empty and calm. Minimum door height about 150px on a 390-wide screen; the board `flex: 1`s so Lock in stays on screen at 375×667.
- The **tray** under the doors holds unplaced coins at the start of each question. Hide the tray once it is empty.
- **Lock in**: full-width theme-9 button, 58px (52px on short screens), disabled until every coin is placed and at least one door is empty. A one-line hint only when the player still has something to do. When the button is ready, the hint is silent.
- **Undo** is the only other button. It steps back one placement. No Reset, no Hint, no difficulty, no Wick, no ad, no coaching paragraph.

No timer in the header. Speed is not the score.

### 5.4 Leave confirm

Visual target: `shots/mobile-leave.png`.

Shown when the player uses Back, the wordmark, or any other “leave this run” control during an unfinished official run. Not shown on refresh (the run resumes).

Title: **Leave today’s drop?** Body: **Leave now and you’ll bank 0 coins. You can’t replay today’s official drop.** **Keep playing** is the primary ink / cheese button. **Leave** is a white ink-bordered button. Confirming Leave ends the official run, banks 0, and goes to results in the “left early” state.

### 5.5 The drop animation

Visual target: `shots/mobile-drop.png`.

On Lock in:

1. Lock and undo disable immediately, then hide so they do not sit under falling coins.
2. The correct door gets the safe wash, a **✓ Safe** ink pill, and its coins stay put in a tidy pack.
3. Wrong doors get a **↓ Dropped** pill. The lid is a cream slat that swings open (`transform-origin: top`, `rotateX` about 78°, ~350ms). Under the lid is a dark, striped hatch with a hole, not a flat black box. Hide the letter, answer and plate as the lid opens.
4. Coins on wrong doors are lifted into a `position: fixed` layer at their current screen box, then fall with a short gravity animation (translateY + a little rotation, ~800ms, then fade). They must not be clipped by `overflow: hidden` on the door.
5. A centred Archivo Black banner, rotated slightly, cheese on ink border: **N SAFE**, or **DROPPED!** on an ink / cheese pill if the bank of pending coins hits zero.

Honour `prefers-reduced-motion` and a Settings toggle: skip the fall, instant open or a simple fade, then the banner.

After about 1.1 seconds (400ms if motion is reduced), either go to the next question (surviving coins reset into the tray, pending updates to the new count) or to results. Do not ask the player to dismiss a modal to continue. Pending does not become Banked on a mid-run survive — only after Q10.

### 5.6 Results and share

Visual target: `shots/mobile-results.png`.

- Cheering wombat on a successful bank; thinking or sad on a bust, a wipe on Q10, or a leave.
- Title: **Banked!** / **Dropped!** / **0 banked** (left early) / **All 10, none left** (finished, 0 survived Q10).
- One line of plain language. On a bust, remind them: “Finish all 10 to bank your coins — so this day banks 0.”
- Share card, white, ink border, hard shadow:
  - `Spiquizzy #N`
  - The coin trail, spoiler-free, wrapped on two lines if needed, then `banked N` or `banked 0`.
  - A large **Banked N** line with the stack icon and a short pop animation when (and only when) coins were just banked.
- A weekly-league snippet: “This week in Fusilli League: you’re 8th with 18 coins.” plus a link. If the player is a guest, the snippet is a prompt to sign in to join the league.
- Countdown to the next drop: “Next drop in 2 hours 42 minutes”, midnight Europe/London, live-updated.
- Primary **Share** button. Use the Web Share API where it exists, otherwise copy to the clipboard and change the label to “Copied”. Share text as in §2. No answers. WhatsApp and iMessage matter more than X for a UK audience.
- **Ad placeholder under Share, the league snippet and the countdown — never over the result, never on Play.** Label the slot “Advertisement”. No network until Zach says so.

Optional, after the ad: a quiet text link to Plus (“Skip ads with Spiquizzy Plus”) that does not cover Share.

### 5.7 Bank

The saved total, the stack icon, a short history of coins banked per day (0 on bust / leave days). Copy: “Coins move from pending to your bank only after you finish all 10 questions.” Guest prompt: sign in to keep the bank across devices.

### 5.8 Leaderboards

Visual target: `shots/mobile-league.png`.

- Default tab: **Weekly**. Also Monthly, Yearly, All-time.
- Weekly: small group, about 30, matched by recent activity (coins banked in recent weeks, then similar time zone if you have it). Five pasta tiers: **Penne → Farfalle → Fusilli → Tagliatelle → Ravioli**. Top 10 promote, bottom 10 drop down, middle stay. Reset **Monday 00:00 Europe/London**. Score is **coins banked this week**, not lifetime bank.
- Monthly / yearly use the same idea on a longer period. All-time is lifetime bank, visible, but not the first thing a new player sees. Show the player’s rank and a short slice of nearby names, not only the top 10.
- Opt-out of public boards in Settings. Account required to appear on public boards.
- Until live data exists, any mocked table in a prototype or staging build must wear a banner like **Example data — not live scores**, as the current prototype does.

Friends / private leagues are phase 2.

### 5.9 Profile / stats

Played (official days finished), coins banked (lifetime), best day banked, current weekly league and rank. Streak tiles can be present but empty or hidden until phase 2. No “Faster than X%”.

### 5.10 Sign-in

Pitch: “Sign in to keep your bank, join weekly leagues, and play on any device. You can still play today’s drop as a guest.” Email magic link (or one social provider) is enough. Merge a guest bank into the new account if the account has no bank yet; if both exist, keep the server bank and tell the player. Do not appear on public boards as a guest.

### 5.11 Premium page

See §10. Layout and copy only in phase 1. The primary button may read “Payment not wired up yet” and stay disabled.

### 5.12 Settings

- Sound, off by default. Soft ticks on place, a short thud on a drop, a little cheer on a bank. No music bed.
- Reduce motion, in addition to honouring the system setting.
- Colour-blind marks, on and not optional — Safe / Dropped labels always show.
- Privacy / cookies link, Plus link, a confirmed “Clear local data” for guests.

### 5.13 Privacy / cookies

UK PECR / UK GDPR: non-essential cookies need freely given consent. **Reject is as easy and as prominent as Accept.** Contextual / non-personalised fallback if they reject. No dark-pattern banner, no cookie wall that blocks Play. Spell out what is stored for a signed-in bank and for a guest.

### 5.14 404

`lang="en-GB"`. Official logo, not pixelated, not a broken “PIQUIZZY” wordmark. **Page not found.** “That page isn’t on Spiquizzy.” Cheese-type Play-style button: “Back to today’s drop.”

---

## 6. Input

Copy the pointer logic in `prototype/index.html`. The contract is:

- `pointerdown` on a coin, `setPointerCapture`, a fixed floater sprite that follows the pointer, `pointerup` hit-tests the doors and the tray.
- Snap onto the door (or back to the tray) under the pointer. If the pointer is over nothing, the coin returns to where it started.
- `touch-action: none` on the play stage and on each coin. While dragging, `html.is-dragging` locks overflow so **the page does not scroll**. Non-passive `touchmove` `preventDefault` while a drag is live.
- Hit areas are **44px or larger**. Coins may overlap slightly so four still fit in one row on a door.
- Coins can be dragged from the tray onto a door, and from one door to another.
- **Tap fallback:** tap a coin, then tap a door. **+/- fallback:** tap a door to select it, then use a single 44×44 minus / plus pair *under* the 2×2, labelled “Answer B”. Do not stamp +/- onto every door. Hide the adjust row until a door is selected, and hide it during the reveal.

Keyboard can follow later (arrows move a focused coin, Enter locks in when allowed). Do not block launch on it.

---

## 7. Question data and content pipeline

The site ships `data/questions.public.json` only. Each question has `id`, `q`, and `answers` (file order, the same for everyone that day). It must not include `correct`, `source`, or any other field that marks the right option. The correct index and the citation stay in `dd_questions`.

```json
{
  "startCoins": 10,
  "packDays": 14,
  "days": [
    {
      "questions": [
        {
          "id": "d01q01",
          "q": "What is the capital of Australia?",
          "answers": ["Sydney", "Melbourne", "Canberra", "Perth"]
        }
      ]
    }
  ]
}
```

- `answers` is always length 4. The correct index is a 0-based index into that array, stored only in the database.
- `source` is for the editor and a later corrections log. Do not put it in a file the site serves, and do not show it on the play screen.
- `category` and `difficulty` are metadata. Do not stamp them on the play screen.

**Editorial rules**

- One unambiguously correct answer. No “which is NOT”, no “all of the above”, no trick wording, no current events that will rot (who is Prime Minister, latest population counts, contested records such as longest river).
- UK English (“association football”, “crotchet”, “demisemiquaver”, “pence”, “colour”).
- Short answers, ideally under ~24 characters.
- Difficulty ramps every day: questions 1–3 easy, 4–7 medium, 8–10 hard.
- Mix geography, science, arts, sport, history, food, music, maths, UK. This is a general-knowledge drop, not a pasta quiz — one pasta item in 14 days is plenty of flavour.
- Fact-check every item and keep the citation in `source`. If a question is later found to be wrong, publish a correction; do not silently rewrite a day people have already shared.

**The 14-day pack.** Dated 11–24 November 2026 as a content pack only. **Remap drop no. 1 to the real launch day.** 140 questions, all unique, all cited, loaded into `dd_questions`. Do not publish the answer key in the site tree.

**Pipeline after day 14.** Keep a private editor file or a Supabase table (`questions`, not readable by `anon`). Aim to have at least 14 days ahead at all times. A short weekly review: one editor, one fact-check pass, then lock the day. Once a day is locked and has been played, do not edit answers in place.

---

## 8. Backend (recommended: Supabase)

The live site is static on GitHub Pages. The drop, the bank and the leagues cannot stay honest as a static app. Recommended stack: **Supabase (Postgres + Auth + Edge Functions)**, with the existing static front end talking to it. A UK region if one is available at setup time; otherwise the closest EU region. Europe/London is a timezone in the data, not necessarily the cluster.

Do not invent a custom backend if Supabase can do this. Do not put the answer key, a writable bank, or a client-reported score in the page.

### 8.1 Tables (suggested)

- `profiles` — `id` (auth uid), `display_name`, `created_at`, `opted_out_of_boards`, `is_plus` (always false until payments exist).
- `banks` — `user_id` (pk), `balance`, `updated_at`. Only the scoring function writes this.
- `daily_runs` — `id`, `user_id` (nullable for a later merge of guests is optional; prefer “account required to persist”), `date` (Europe/London calendar date), `drop_number`, `status` (`in_progress` | `completed` | `busted` | `forfeited`), `pending`, `banked`, `trail` (int array), `question_index`, `finished_at`. Unique `(user_id, date)`.
- `stakes` — or a jsonb column on the run of per-question distributions, stored **after** the server accepts a lock-in, never before.
- `questions` — `id`, `date`, `position`, `q`, `answers`, `correct`, `source`, `difficulty`. **No `anon` or `authenticated` read of `correct` or `source`.** A view `questions_public` exposes id, date, position, q, answers only.
- `leagues` — `id`, `period` (`week` | `month` | `year`), `period_start`, `tier` (penne…ravioli), `group_index`.
- `league_members` — `league_id`, `user_id`, `coins_in_period`, `rank`. Period score is a **sum of `daily_runs.banked`** for official completed days in the period, maintained by the scoring function or a view.

Row-level security: a user can read their own profile, bank and runs; can read public league rows if they have not opted out; can never read `questions.correct`. Service role only inside Edge Functions.

### 8.2 Edge function: `lock-in`

POST the run id, the question index, and the distribution of pending coins across the four answers (and the empty door). The function:

1. Authenticates (or issues a signed guest session if you support guest runs on the server — otherwise guest is local-only until sign-in).
2. Loads the run, checks the date is today in Europe/London, status is `in_progress`, and this is the expected question index.
3. Validates the coins sum to `pending`, every coin is placed, and at least one answer is empty.
4. Looks up `correct` on the server. Computes kept vs dropped.
5. Writes the stake and the new pending. If pending is 0, marks `busted`, `banked = 0`, closes the run. If this was question 10 and pending > 0, sets `banked = pending`, increments `banks.balance`, marks `completed`. If this was question 10 and pending is 0, marks `completed`, `banked = 0`.
6. Returns `{ correctIndex, kept, pending, banked, status, trail }`. Never returns the key for unplayed questions.

A second function `forfeit-run` handles a confirmed Leave: status `forfeited`, `banked = 0`.

A daily (or weekly) function assigns unsigned-up players into weekly groups at the Monday reset, by recent activity.

### 8.3 Guest mode

Guests can play today’s official drop on-device. Pending, trail and a local bank live in `localStorage`. They do not appear on public boards. After a banked finish (and after a bust, more quietly), prompt: “Sign in to keep your bank and join this week’s league.” On sign-in, upload the local run if the server has no run for that date; never let a guest replay a day the server already closed.

### 8.4 Anti-cheat (minimum)

- One official run per account per Europe/London day.
- Never trust a client-reported score, timer, or bank.
- Rate-limit lock-in. Flag impossible banks and remove them from public boards.
- Be conservative with fingerprinting under UK GDPR. Prefer authenticated accounts and server-side rules.

---

## 9. Ad map

All slots reserved in CSS (`min-height`) so they cannot shift Play, the board or Lock in. Label “Advertisement”. Mobile ad density clearly under 30% of main content height. Good CLS is p75 under 0.1.

| Page | Do | Do not |
| --- | --- | --- |
| **Home** | One reserved display unit **below** Play / How to play. On 375×667 it may sit below the fold. Recommended reserved size: 300×250 (or 336×280). Cookie banner must not cover Play. | Sticky footers over 30% of the viewport. Ads beside or above Play. Pop-ups or prestitials before the first play. Auto-play sound. |
| **Play, mid-question** | **No ads** in, on, or within 150px of the board, tray, doors or Lock in. Zero ads on this view. | Anchor ads under the tray. Ads that look like answer cards. Anything that can receive a dropped coin. |
| **Drop animation** | No new ad. Let the moment land. | Mid-animation overlay. |
| **Between questions** | Skip on v1. | Auto-advance into an interstitial. |
| **Results** | First the recap, Banked line, Share, league snippet, countdown. Then one reserved 300×250. Optional later: rewarded unit for practice / a freeze, with Yes and No. | Prestitial before results. Postitial with a countdown. Ad on top of Share. Incentivised clicks on ordinary display ads. |
| **Leagues / profile / bank** | Standard in-content units, reserved height, density under the cap. A tasteful Plus prompt near locked archive rows (phase 2). | Ads mixed into the rank list so an ad looks like a player. |

No prestitials, no countdown postitials, no large sticky ads, no auto-refresh, no “please click our ads”. Live networks and rewarded ads wait for Zach. Placeholders are enough for phase 1.

**UK consent.** A CMP with equally prominent Accept and Reject. Budget for a large consent drop (Mail Online’s equally prominent reject test cut consent from 93% to 50%, with a claimed 41% ad-revenue hit). Contextual / non-personalised demand for non-consent. A clean “go ad-free with Plus” is the product framing, not a hostile cookie wall.

---

## 10. Premium (Spiquizzy Plus)

The official daily 10-question drop stays **free forever**.

Pitch, in the Puzzmo band: **£3.99 a month or £39.99 a year** (about 16% off annual). Localise in pounds on a UK checkout, when there is one.

What Plus includes, when it ships: ad-free play; full archive of past official days; practice drops that do not touch the bank or boards; extra streak freezes (phase 2); coin / tray cosmetics; advanced stats.

Upsell moments, never as a wall on today’s questions: after a good result, beside a results ad (“Skip ads with Plus”), on locked archive rows, and at streak risk in phase 2 (not the only way to save a streak). A 30-day reminder before annual renewal, when payments exist.

**Do not wire Stripe, Apple, Google, or any other payment provider, and do not take a test payment, without Zach’s approval.** Phase 1 ships the page and the copy only.

---

## 11. SEO and marketing hooks

- Title: `The Daily Drop — Spiquizzy`. Description: the one-line pitch, including “Finish all 10 questions to bank what’s left.”
- Canonical `https://spiquizzy.com/`. `lang="en-GB"`.
- Open Graph / Twitter card: official logo, wombat, 10 coins, “The Daily Drop”. Until a new image is made, reuse the existing official-logo OG rather than a six-game collage. Do not spend money or use Higgsfield.
- JSON-LD `WebApplication` / `Quiz`. Update `sitemap.xml` and resubmit in Google Search Console (the domain property is already verified). Bing Webmaster Tools is still outstanding.
- Share card is spoiler-free on purpose and should not be replaced by a spammy link preview. The player’s trail is the marketing.
- Daily number (`#1`, `#2`, …) starts on launch day.

**Analytics events** (log from day one, so D1 / D7 can be read without guesswork):

`page_view`, `howto_complete`, `play_start`, `question_lock` (with question index and kept count — never the answer text), `run_busted`, `run_forfeited`, `run_completed` (with `banked`), `share`, `sign_up`, `sign_in`, `league_view`, `ad_impression` (slot only), `plus_view`, `plus_click`. Derive D1 and D7 from `play_start` / `run_completed` by distinct user or device.

---

## 12. Performance and accessibility acceptance

- `lang="en-GB"`.
- 44×44 minimum targets on header icons, coins, Lock in, Undo, steppers, Play, Share, Keep playing / Leave.
- Contrast as in §1. Focus rings: 3px cheese, 2px offset (3:1 against the adjacent background).
- Colour is never the only signal: ✓ Safe and ↓ Dropped stay on.
- `prefers-reduced-motion` skips the trapdoor swing and the fall.
- Doors and questions stay readable if a system font is substituted. Display type (Archivo Black, Syne) is never used below a readable size (16px for Archivo on chrome, 22px for Syne questions).
- Core Web Vitals: CLS p75 under 0.1 (reserved ad slots, no late font jumps if you can preload the three faces). Play and Lock in must not move after first paint.
- The official logo is never pixelated.

---

## 13. Test checklist

Run at **390×844**, **375×667** and **1440×900**. Use an iPhone user agent and touch for the two mobile sizes.

- [ ] Home: Play is fully above the fold at 375×667 and 390×844. The home ad is reserved and, on the short phone, may sit below the fold.
- [ ] Home: 10 fusilli coins, official logo sharp, “Spiquizzy” spelled correctly, full month name, endowment line shows 10 today + bank of X.
- [ ] How-to: 3 panels, panel 3 states the banking rule, Got it dismisses and does not pop again.
- [ ] Play: drag a coin onto a door, snap, no page scroll while dragging, 44px targets. Drag from door to door. Tray hides when empty.
- [ ] Tap-then-tap and +/- fallback both work. Lock in stays disabled if a coin is in the tray, or if all four doors have coins.
- [ ] Drop: wrong lids open, coins fall unclipped, ✓ Safe / ↓ Dropped are visible, banner shows N SAFE or DROPPED!. Pending updates only after the animation, and does not change the Bank chip mid-run.
- [ ] Survive Q1–Q9: pending carries, bank is unchanged, “Finish all 10 to bank your coins” still shows.
- [ ] Finish Q10 with coins left: pending pops into Banked, server (or the prototype’s local stand-in) adds that amount, share trail ends `banked N`.
- [ ] Bust before Q10: run ends, banked 0, share trail has a skull and `banked 0`.
- [ ] Wipe on Q10: finished, banked 0, no skull (or a clear “all 10, none left”), not a forfeit.
- [ ] Back mid-run opens the leave confirm. Keep playing stays. Leave forfeits, banks 0, cannot replay today.
- [ ] Refresh mid-run resumes, and does not forfeit.
- [ ] After a closed official run, Play is gone and “See results” (or the results screen) is the only official path for that date.
- [ ] Share copies a spoiler-free trail, UK date or drop number, no answers.
- [ ] League: weekly is the default, example / live data is obvious, You is highlighted, promote / demote zones are marked with more than colour, tabs switch.
- [ ] Guest can finish a drop; sign-in prompt appears; guest does not appear on the public board.
- [ ] 404: official logo, English (UK), a button back to today’s drop.
- [ ] Reduce motion and the system `prefers-reduced-motion` both skip the fall.
- [ ] No ads on the play view. Results ad is below Share. Cookie Reject is as prominent as Accept.
- [ ] Plus page exists and does not collect payment.
- [ ] Answer key is not in the client bundle for the production build.

---

## 14. Prototype notes

The prototype is a single-page stand-in for every screen in §5. It uses a local 10-question day (drop 1) and an example saved bank of 42. It does not call a server. Copy the drag contract, the leave confirm, the pending / bank chips and the drop animation. Do not rewrite input as tap-then-tap.

Frozen states use `?shot=`. `?shot=drop` pauses the fall mid-air for the screenshot; in live play the same CSS animation runs forward, then the next question or results appear. `?shot=league` uses clearly labelled example data. `?shot=leave` opens the confirm on a mid-run board.

---

## 15. What not to do

- Do not keep a six-game catalog, a classic mode, or Easy / Medium / Hard.
- Do not bank coins mid-run, on a bust, or on a leave.
- Do not let the client award a bank balance or see tomorrow’s answers.
- Do not put ads on the board, over Play, or over Share.
- Do not use cheese or tomato as body text, or red vs green alone for right and wrong.
- Do not pixelate the official logo, or bring back Press Start 2P at small sizes.
- Do not wire payments, spend money, post publicly, or use Higgsfield.
- Do not ship the live site from this folder until this spec has been sent and you are asked to build it.

Once this spec is with you, build phase 1 against the prototype and the screenshots. Remap drop no. 1 to launch day. Hold payments and live ads for Zach.

---

## 16. Timer and quick stakes (added to phase 1)

These two rules are part of phase 1. They override the earlier “no timer” line in §5.3.

### 16.1 Twenty-second question timer

Every question lasts **20 seconds**, so a player cannot look the answer up.

- Show a thick neo-brutalist bar across the top of the board. It starts full and shrinks toward empty.
- For the last **5 seconds** the fill turns tomato `#E63326`.
- If sound is on, play a light tick once per second. Sound stays off by default.
- When the bar hits zero, lock in immediately. Coins already on answers are judged. Coins still in the tray are **lost**. The empty-door rule is not re-checked on a timeout, because the player may not have finished placing.
- If the tray still holds every coin, the question drops them all and the run banks 0.
- Pause the timer while the trapdoors and the fall play. Start a fresh 20 seconds on the next question.
- A refresh resumes the same deadline. It does not grant another 20 seconds.
- Honour reduced motion: the bar still shrinks, with no tick animation beyond the width change.

**Server.** Record `question_served_at` when that question is served. Do not reset it if the client asks again for the same index. A lock-in is valid when it arrives within 20 seconds plus about **2 seconds** of network grace (22 seconds). A later submission is clamped: the client’s distribution is ignored and every coin still pending on that question is lost. Manual lock-in inside the window still requires every coin placed and at least one empty answer. A timeout inside the window judges only the coins on answers.

### 16.2 All in and Add rest

Each answer card has two buttons along its bottom. Each target is at least **44px** tall.

- **All in** moves every coin onto that answer, including coins already on other answers. The other three answers stay empty, so the empty-answer rule holds.
- **Add rest** moves only the coins still in the tray onto that answer. Hide it when the tray is empty.
- **Undo** reverses either action in one step, and still reverses a single drag.
- Both are unavailable once the question is locked, and during the drop.
