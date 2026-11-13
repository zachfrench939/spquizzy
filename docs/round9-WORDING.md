# Round 9 wording

Live copy for this branch. Apostrophes match the rest of the site.

Nothing here adds analytics, ads, a cookie, or a Supabase table.

## Storage

`spquizzy.drop.bank-nudge`

The UK date (Europe/London, `YYYY-MM-DD`) the post-game note was shown. The note appears at most once that day. It stays on this device and is not sent. Clear local data removes it. Practice does not write it.

No other new key. Practice is kept in memory for that visit only. Stats are computed from the existing guest bank (`spquizzy.drop.bank`), which already stores each finished day. They are never seeded.

## Home

Pitch:

> Put your coins on the answers you trust. Finish all 10 to bank what’s left.

The hero still shows 100 and “coins today”. The second “100 coins today + bank of 0” line is gone.

Button: Practice question

## Share image and meta

> 10 questions a day. Put your coins on the answers you trust.

> Put your coins on the answers you trust.

This is the line on the OG image, in the manifest, and in the home share tags.

## Post-game note

Shown under Share, after the result, and only for a guest. It does not cover the result. At most once per UK day.

> Want to keep your bank? Accounts are for players 13 and over.

> Sign in / Create account

> No thanks

The two controls are the same size.

## A day that banks 0

The share card, the last fun fact (only if the server sent one), Share, and the countdown still show. Added line:

> See you at midnight UK time.

Headings that were already there stay: “Dropped!”, “Zero banked”, and “All 10, none left”. “Banked!” and “You finished all 10 questions.” stay for a day that banks coins.

A correct answer with no coins on it says:

> Safe, no coins on it

## How to play

> Tap an answer and put your coins on the ones you trust. Leave at least one empty.

> Lock in. Wrong answers drop. Coins on the right answer stay.

> Finish all 10 to bank what’s left. Leave early or go to 0, and you bank 0 today.

Under the chips, on the first step and on question 1:

> All puts everything on this answer. Rest puts what’s left in the tray.

Button labels stay All and Rest. The accessible names are “All, everything onto this answer” and “Rest, what’s left in the tray”.

The illustration on step 3 says “Banked after all 10”. Got it, and the Q1 coach line, stay.

## Practice

One question, on this device only. It does not call the server, does not read or write the guest id, and does not change the bank or today’s official run.

> Practice question

> Try a practice question

> Practice. This does not touch today’s bank.

Question: “Which of these has three sides?” Answers: Square, Triangle, Circle, Hexagon.

After lock-in:

> A triangle has three sides. Practice stays on this device and does not change today’s bank.

Results:

> Practice complete

> This stayed on this device. Today’s bank is unchanged.

> Not added to your bank

> Back to today’s drop

## Archive

> The archive of past official days isn’t open yet.

> Spiquizzy Plus is coming soon.

No price and no buy button.

## Plus

> Spiquizzy Plus is coming soon.

> The daily drop stays free.

Prices, buy buttons, and any line about skipping ads are removed.

## Leagues

One line on a result, for a guest:

> Sign in to appear on this week’s board.

Empty board, guest:

> No scores on this board yet. Finish today’s drop and sign in to be first.

Empty board, already signed in:

> No scores on this board yet. Finish today’s drop to be first.

If the board cannot be loaded:

> The board isn’t available right now.

No example players and no made-up ranks.

## Stats

The tab is Stats and opens this view. Settings is a link on the view.

> Days played

> Streak

> Finished drops in a row

> Best banked

A finished drop is a day stored with status completed, including a day that banked 0. A bust or a leave counts as a day played and breaks the streak. If today is not finished yet and yesterday was, the streak still includes yesterday. The sparkline is the last ten stored days, and only those days.

When nothing is stored, the three numbers are 0 and the note is:

> Finish a drop and these update from the days stored on this device.

When there is at least one stored day:

> Counted from the days stored on this device.

The same three numbers are on Your bank.

## Play

Timer: the bar stays, and the number reads like `18s`.

With no card picked, the bar says:

> Pick an answer

No card is selected when a question opens. The first tap is the choice.

Settings, next to the username field, and on the username step:

> Don’t use your real name.

The sticker switch:

> Keep the Safe and Dropped stickers on screen after you lock in.

Clear local data:

> Clear local data removes today’s drop, your guest bank, and your sound and motion settings from this device. It also signs you out here, and clears the note about saving your bank. It does not change your page-view choice, and it does not delete an account.

## Left as they were

Q1 coach: “Pick an answer, put coins on it, then Lock in.”

Fun facts, the countdown, the leave modal, “Not right now” on the old prompt, the four-card board, the trapdoor, the Option 2b chips, and the official logo.
