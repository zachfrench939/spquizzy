# Round 8 wording — for Legal

Draft for review. Do not treat this as cleared to publish. The pages on this branch use the text below. Nothing here has been merged to `main`.

Operator name on the pages: **Spiquizzy**. Contact: **contact@spiquizzy.com**. No personal name and no home address.

---

## /privacy/

**Privacy**

Last updated 11 November 2026.

This page is the privacy notice for The Daily Drop. It says what information we use, why the law allows it, and what you can ask us to do.

### In short

Spiquizzy runs this free quiz at spiquizzy.com. You can play as a guest on this device. An account is only for people aged 13 or over. We keep a guest id and the questions we served. If you sign in, we keep your email, your coin bank and your runs. A username and the coins you bank can show on the public board. We count a page view only if you press Accept. Email contact@spiquizzy.com to see your data, fix it, or ask us to delete it. You can also complain to the ICO at ico.org.uk.

### Who to contact

Spiquizzy runs The Daily Drop. Email contact@spiquizzy.com. The operator name on this page is Spiquizzy. We do not publish a person’s name or a home address. A parent or a lawyer still has to confirm the legal name of the data controller. Until that is settled, use this email.

### Age

You must be 13 or over to create an account. Under 13s can play as a guest on this device. Guest play does not need an account.

### Guest play

Until you sign in, today’s run, your coin bank and your settings stay on this device. The guest bank stays in this browser. We do not receive that bank.

We do keep a guest id. The browser stores it as `spquizzy.drop.guest`. When you play as a guest we send that id with the question we served. We store the guest id, the day’s pack, the question number, and the time. We use this to show the question and to mark that it was served. How a guest placed their coins stays on the device.

Why we’re allowed: legitimate interests (UK GDPR Article 6(1)(f)). We need the id to run the quiz you opened. You can object by email. If we have to stop using an id, guest play for that id may stop.

### Accounts

Signing in is optional. You can use an email link or Google.

Email: you type an address and we send a one-time sign-in link. We store an account id and that email.

Google: if you press Continue with Google, Google tells our sign-in service the email for that account. We use the email to open the account. We never show your real name, your email, or your Google photo to other players.

Why we’re allowed: you asked us to keep an account (UK GDPR Article 6(1)(b)).

### Your bank and your runs

If you are signed in, we store your coin bank and each official run: the UK date, the status, how many coins you banked, and the trail of coin counts. We also store how you placed the coins on each question of that run.

Why we’re allowed: you asked us to remember the account (UK GDPR Article 6(1)(b)).

### The leagues board

If you choose a username, that username and the coins you have banked are public on the leagues board. Other players can see them. The board can show a week, a month, a year, or all time.

We never show your email, your real name, or your Google photo.

Signed-in players can turn on “Hide me from the leagues board” in Settings. That takes the username and the banked coins off the board. You can also email us and ask to be hidden.

Why we’re allowed: you asked to be listed by choosing a username (consent, UK GDPR Article 6(1)(a)). You can take that back with the switch, or by email.

### Page views

We count a page view only if you press Accept. Reject, or leaving the choice unmade, means we do not send one. If your browser sends Do Not Track, we do not count the page view even after Accept. Accept and Reject are the same size, and neither one blocks Play. There is no advertising pixel.

After Accept, a page view can include the page path, the site you came from (the host name only), `utm_source`, `utm_medium` and `utm_campaign` when the link has them, a screen-size bucket (mobile, tablet or desktop), and the event name. A normal visit is “view”. That message does not include your account id, your email, or your guest id. The server may still see an IP address in its logs.

You can change the choice at any time in Settings. Reject stops further page views. It does not delete views already stored.

Why we’re allowed: your consent (UK GDPR Article 6(1)(a) and PECR). You can take it back in Settings.

### Who else handles data

- Supabase stores the quiz data and runs sign-in. The project is in London (eu-west-2).
- Resend sends the sign-in email from noreply@spiquizzy.com. That mail goes from Ireland (eu-west-1). We do not use it for news or ads.
- Google, only if you choose Continue with Google.
- GitHub Pages and Fastly deliver the website. They can see connection data, such as an IP address.

We do not sell your data.

### Outside the UK

Quiz records in Supabase stay in London, in the UK. Resend sends mail from Ireland. Google, GitHub Pages and Fastly may process a connection in the United States or another country. When data leaves the UK, the law needs a proper transfer step. That paperwork is not published on this page. Email us if you want to ask about it.

### How long we keep it

The database does not delete this data on a timer. We keep it until you ask us to delete it, or until you clear it on your own device.

- On this device, saved game data stays until you use Clear local data, or you clear the site in your browser.
- Your account, email, bank, runs and username stay until you ask us to delete them.
- Guest ids, and the questions we served, stay until you ask us to delete them. We can find your guest rows if the id is still on your device, or if you send it to us.
- Page views stay until you ask us to delete them. A page view is not tied to your account, so we may not be able to pick out yours.

This notice does not give a number of days or months. The database does not enforce one.

### Deleting an account

Email contact@spiquizzy.com from the email on the account and say that you want the account deleted. A person deletes it. The app has no button that deletes an account by itself. Clear local data only clears this device.

### Your rights

Email contact@spiquizzy.com and you can ask us to:

- show you the data we hold about you
- fix data that is wrong
- delete it
- limit how we use it
- give you a copy you can take with you
- stop a use we base on legitimate interests, including the guest id
- take back consent for page views, or take your username off the board

You can complain to the Information Commissioner’s Office (ICO) at ico.org.uk. You do not have to email us first.

### Cookies and terms

The game does not set a cookie. What we save on the device is on the cookie page. The rules of the game are in the terms. The page-view choice and the board switch are in Settings.

---

## /cookies/

**Cookies**

Last updated 11 November 2026.

The Daily Drop does not set a cookie, and it does not use an advertising cookie. Sign-in, if you use it, keeps a session token in localStorage on this device. The same facts are in the privacy notice.

Page views are optional. We send one only after you press Accept. Reject, or leaving the choice unmade, means we do not send one. You can change that choice in Settings. Accept and Reject stay the same size, and neither one blocks Play.

### Saved on this device

These keys live in localStorage. They stay until you clear them, or you clear the site in your browser.

- `spquizzy.consent` — your page-view choice, Accept or Reject. Essential, so we can remember it. It is not a tracker. Page views stay off until the value is Accept.
- `spquizzy.drop.run` — today’s official run, so a refresh can resume. Essential, on this device.
- `spquizzy.drop.bank` — a guest coin bank and day history. Essential for guest play. It stays on this device. We do not receive it.
- `spquizzy.drop.howto` — you have closed How to play. Essential preference.
- `spquizzy.drop.settings` — sound and reduce motion. Essential preference.
- `spquizzy.drop.session` — the sign-in token, if you signed in. Essential to stay signed in.
- `spquizzy.drop.guest` — a random guest id for this browser. Essential for guest play. We do receive this id when a guest plays, with the question we served.
- `spquizzy.drop.events` — the last 200 things the game did, on this device only. It is not sent as a page view.

### This tab only

These keys live in sessionStorage. The browser drops them when the tab closes.

- `spquizzy.drop.signin-prompt` — you already saw the sign-in prompt in this tab.
- `spquizzy.drop.username-later` — you pressed Not now on the username prompt in this tab.
- `spquizzy.drop.just-signed-out` — you just signed out, so we do not ask you to sign in again straight away.

### Page views

A page view is not stored as its own key on this device. After Accept we send the page path, the referring host, `utm_source`, `utm_medium`, `utm_campaign`, a screen-size bucket (mobile, tablet or desktop), and the event name. A normal visit is “view”. The message has no account id and no guest id. See Privacy for why, and for how long those rows are kept.

### Clear local data

Clear local data, in Settings, removes four keys on this device: `spquizzy.drop.run`, `spquizzy.drop.bank`, `spquizzy.drop.settings`, and `spquizzy.drop.session`. It does not change `spquizzy.consent`. Use the page-view buttons in Settings for that. It does not remove the guest id, the event log, the How to play flag, or the tab-only keys. It does not delete an account.

Links: Privacy notice · Terms

---

## Terms — new clauses, in page order

The existing free-play, Plus, and England-and-Wales paragraphs stay. The new clauses are Age, Coins, and The leagues board. Full page text:

**Terms of use**

Last updated 11 November 2026.

The Daily Drop is free to play. Coins are banked only when you finish all 10 questions. Leaving early or running out of coins banks 0 for that day.

### Age

You must be 13 or over to create an account. Under 13s can play as a guest on this device.

### Coins

Coins are a game score only. They have no cash value and no money’s-worth value. You cannot buy, sell, trade, transfer or withdraw them. There are no prizes of money or money’s worth. The weekly league is a ranking of coins banked. It is not a prize draw.

### Accounts

An account is optional. If you sign in, you keep one official run per UK day. Do not try to replay a closed day or to send a score the server did not award.

### The leagues board

If you choose a username, that username and the coins you have banked are public on the leagues board. Your email, your real name and your Google photo are never shown. Signed-in players can turn on “Hide me from the leagues board” in Settings.

Spiquizzy Plus is not on sale. The buttons on that page do not take payment.

These terms use the law of England and Wales. Questions: contact@spiquizzy.com. The privacy notice is at Privacy.

---

## 13+ checkbox and label

Shown on the email magic-link form, above Continue with Google, and on the post-results sign-in prompt. The checkbox is required and starts unticked. Guest play has no checkbox.

Rule, above the checkbox, with a Privacy notice link:

> You must be 13 or over to create an account. Under 13s can play as a guest on this device.

Checkbox label:

> I am 13 or over

If someone tries Google, or the form is submitted, without the tick:

> Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.

The email link is not sent, and Google sign-in does not start, until the box is ticked.

The home footer also links to Privacy. Settings links to the Privacy notice and the Cookie policy.

---

## Settings — page-view choice

Heading: **Page views**

Status line, one of:

- Page views: Accepted
- Page views: Rejected
- Page views: not chosen

Help line:

> We only count page views if you Accept. You can change that here.

Two buttons, same size, same weight, same white background, same ink border. Reject is on the left. Accept is on the right.

- Reject
- Accept

Reject writes `spquizzy.consent` = `reject` and stops later page views. Accept writes `accept`. Choosing either one does not send a page view by itself. The cookie strip is unchanged: equal Accept and Reject, and it does not block play.

---

## Settings — hide me from the leagues board

Signed out:

> Sign in to hide your username from the leagues board.

Signed in, the switch label:

> Hide me from the leagues board

Under the switch, one of:

- We couldn’t read this setting yet. Email contact@spiquizzy.com if you need to be hidden now.
- You’re hidden. The board won’t show your username or the coins you banked.
- Your username and the coins you bank are on the public board if you have a username.
- That didn’t save. Email contact@spiquizzy.com if you need to be hidden now.

The switch reads and writes `dd_profiles.opted_out_of_boards`. It cannot save until the new SQL migration is applied by hand. See open points.

Related lines once the flag is on:

- League foot: You’re hidden from the leagues board. You can show your username again in Settings.
- Your row on the board: You’re hidden from this board.
- Results: You’re hidden from the leagues board.

---

## Settings — Clear local data

Button: **Clear local data**

The paragraph, and the confirm dialog, both say:

> Clear local data removes, on this device only: today’s drop (spquizzy.drop.run), your guest bank (spquizzy.drop.bank), sound and motion settings (spquizzy.drop.settings), and the sign-in token (spquizzy.drop.session). It does not change your page-view choice, and it does not delete an account.

---

## OG, Twitter, and manifest

Homepage `og:description`, homepage `twitter:description`, and `site.webmanifest` `description`:

> 10 questions a day. Put them on the answers you trust.

The visible home pitch is unchanged: “Start with 100 coins. Put them on the answers you trust. Only the coins on the right answer go through. Finish all 10 questions to bank what’s left.”

---

## Open points for Legal

1. **Not cleared.** This wording is a draft. Do not merge it to `main`, and do not treat it as live, until Legal signs it off.
2. **Controller.** The pages name Spiquizzy and contact@spiquizzy.com only. No personal name and no home address. Who the legal controller is (the student, a parent, or someone else) is not decided here.
3. **Retention is “until you ask”, because nothing deletes on a timer.** `spiquizzy_pageviews`, `dd_guest_serves`, accounts, banks, and runs have no cleanup job in the applied migrations. A 12-month page-view delete was only a proposal in the baseline review. This notice does not invent a number of days or months. Do not add a period to the notice until a matching job is actually applied.
4. **Erasure may not find a row.** Guest serve rows can be found only if the person still has `spquizzy.drop.guest` or sends the id. Page views have no account id. IP addresses may sit in Supabase, GitHub Pages, or Fastly logs; those log periods are not confirmed.
5. **No response deadline** is promised for access or deletion emails. Deletion is a person reading contact@spiquizzy.com. There is no in-app delete, and this change does not delete any data.
6. **Guest id basis.** The notice uses legitimate interests (Article 6(1)(f)) for the guest id and served-question rows. There is no written legitimate-interests assessment, and the likely audience is under 18.
7. **Account basis.** The notice uses Article 6(1)(b) for the account, email, bank, runs, and stake rows. Legal should confirm that basis for under-18 accounts.
8. **Transfers.** Supabase is described as London (eu-west-2). Resend as Ireland (eu-west-1). Google, GitHub Pages, and Fastly as possibly the United States or elsewhere. No IDTA, addendum, or transfer assessment is published. Ireland is outside the UK.
9. **Google profile fields.** The notice says the real name, email, and Google photo are never shown. It does not say Google never sends a name or photo. Scopes were not checked in Google Cloud (baseline item S13, left alone). Supabase may still store them on the auth user.
10. **Older league function.** The live board calls `dd_leaderboard`, which returns username and coins and skips `opted_out_of_boards`. An older `dd_weekly_league` is still granted in the migrations, is not called by the app, and would show `display_name` if that column were filled. It was not revoked (baseline item S10, left alone).
11. **`spquizzy.drop.coach`** is named in the baseline review and is not written by the current code, so the cookie page does not list it.
12. **Clear local data** removes only the four keys named above. It leaves consent, the guest id, the event log, and the How to play flag. That is deliberate so consent stays on its own control.
13. **Board switch needs SQL before it can save.** Migration `supabase/migrations/20261111000700_dd_board_opt_out.sql` is in the repo and has not been applied. Until it is applied, Settings cannot read or write the flag through the app, and the notice’s promise of the switch will not work. `dd_leaderboard` already excludes opted-out players. The RLS policy `dd_profiles_update` already allows a user to update their own row, but `authenticated` has SELECT only, not UPDATE. The migration adds `dd_set_board_opt_out` so the client can set that one column without a table-wide update grant (which would also expose `is_plus`).
14. **Shared Supabase project** with another app is not described in the notice (baseline item S11). Zach still needs to decide whether the notice must mention it.
15. **ICO fee, a children’s DPIA, and who signs the vendor contracts** are unchanged solicitor flags from the baseline review. This round does not decide them.
