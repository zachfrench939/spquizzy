# Sign-up wording — for review

This is the copy on the sign-in screen, plus the privacy and cookie lines Legal cleared for it. Nothing here has been merged.

The checkbox **Keep me logged in** starts **ticked**. That matches the site today: a sign-in stays in `localStorage` until sign-out or until the token expires. Unticked is the new, shorter choice (this browser tab only).

Primary buttons are drawn in capitals by the existing button style. The words below are the text in the page. A screen reader hears these words, not the capitals.

---

## Create an account

Tab: **Create account**

Heading: **Create an account**

Submit: **Create account**

Email and password. The 13+ rule and the “I am 13 or over” checkbox stay as they are, and they stay required.

If Supabase returns a session straight away (email confirmation turned off), the page does what it does today: **You’re signed in.** and **Back to today’s drop**.

If the account still needs a confirmation link, the form is replaced by the screen below. The small note under the form is not used for this.

---

## Check your inbox

Heading:

> Check your inbox

The address is in the next line. For ada@example.com it reads:

> We’ve sent a verification email to ada@example.com.

Next line:

> Click the link in that email to verify your address. Check your spam or junk folder if it doesn’t arrive.

Button:

> Resend email

For 60 seconds after the account is created, and for 60 seconds after a successful resend, the button is disabled and reads:

> Resend email in 60s

The number counts down. That wait is not announced on every second.

After a successful resend, this status is announced (aria-live):

> Verification email sent again.

If the resend fails:

> We couldn’t resend the verification email. Wait a moment and try again.

If Supabase says too many emails:

> Too many emails just now. Wait a minute, then try Resend email.

Two actions under the button:

> Back to sign in

> Use a different email

**Back to sign in** returns to the sign-in form and keeps the address. **Use a different email** returns to Create account and clears the address. Both clear the password field.

Focus moves to the “Check your inbox” heading when this screen opens.

If someone tries to sign in before they have clicked the link, the same screen opens and the status reads:

> That email still needs verifying. Use Resend email if the link didn’t arrive.

---

## Keep me logged in

On the sign-in form, on Create account, and on the post-results “Email me a link” prompt.

Checkbox, ticked by default:

> Keep me logged in

Line under it:

> Untick this on a shared device. You’ll be signed out when the browser closes.

Ticked: the session stays in `localStorage` under `spquizzy.drop.session`, as it does today.

Unticked: that session is kept in `sessionStorage` instead, so it ends when the tab or the browser session closes. The choice itself is stored as `dd_remember` in `localStorage` (`1` ticked, `0` unticked) so the confirmation link and Google can follow it after the redirect.

Sign out removes `spquizzy.drop.session` from both stores and leaves `dd_remember`. Clear local data removes the session from both stores and also removes `dd_remember`.

Google (**Continue with Google**) reads the same checkbox and stores the choice before the redirect.

---

## Sign in

Tab: **Sign in**

Heading stays: **Keep your bank**

Submit: **Sign in**

Secondary button, sign-in tab only:

> Email me a link instead

That still sends the one-time link. The note for that path stays:

> Check your email for the sign-in link.

The post-results prompt is unchanged apart from the new checkbox. Its button is still **Email me a link**, and its note is still **Check your inbox for the link**.

---

## Other form messages

Empty email:

> Enter an email address.

Short password (fewer than 8 characters):

> Use at least 8 characters for the password.

Email and password do not match:

> That email or password doesn’t match. Try again.

Address already has an account:

> An account with that email already exists. Sign in instead.

Too many emails while creating an account or signing in:

> Too many emails just now. Wait a minute, then try again.

Create account failed for another reason:

> We couldn’t create the account. Try again. You can still play as a guest.

Sign in failed for another reason:

> We couldn’t sign you in. Try again. You can still play as a guest.

The 13+ message is unchanged:

> Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.

---

## Privacy notice — Accounts

Added on `/privacy/`. Apostrophes on the page are curly, matching the rest of that notice.

> You can create an account with your email address and a password, sign in with a one-time link sent to your email, or use Google. If you use a password, our sign-in provider Supabase stores only a scrambled (hashed) version of it, and we don’t store your password ourselves. We use your email address to send sign-in and verification emails. These are service emails, not marketing.

The older lines (one-time email link, and Google) stay underneath that paragraph.

## Cookie policy

On `/cookies/`. Apostrophes on the page are curly, matching the rest of that page.

`spquizzy.drop.session`:

> Keeps you signed in. If you tick Keep me logged in, it’s kept in your browser’s local storage until you sign out or the sign-in expires. If you untick it, it’s kept in session storage and deleted when you close the tab or browser. Strictly necessary, so no consent is needed.

`dd_remember`:

> Remembers whether you ticked Keep me logged in, so your choice still applies after you click an email link or sign in with Google. Stored in local storage until you use Clear local data. Strictly necessary, so no consent is needed.

Clear local data on that page, and the Settings confirm, also name `dd_remember` and say the session token is removed from local storage and from session storage.

## Settings — Clear local data

The confirm dialog says:

> Clear local data removes, on this device only: today’s drop (spquizzy.drop.run), your guest bank (spquizzy.drop.bank), sound and motion settings (spquizzy.drop.settings), the sign-in token (spquizzy.drop.session, in local storage and in session storage), and the Keep me logged in choice (dd_remember). It does not change your page-view choice, and it does not delete an account.

---

## What has to be true in Supabase

The confirmation link and the magic link both return to `https://spiquizzy.com/sign-in/` (and the same path on any preview origin). That URL has to be allowed in Authentication → URL configuration.

This screen appears when email confirmation is on and sign-up does not return a session. If confirmation is off, the person is signed in immediately and this screen is not shown.

The words inside the email itself are the Supabase confirmation template, not the lines above.

The page refuses a password shorter than 8 characters. Supabase’s own minimum is a project setting (Authentication → Providers → Email, minimum password length). This change does not set that. If the project is still on the default of 6, it should be raised to 8, or a request that skips this page can still store a shorter password.
