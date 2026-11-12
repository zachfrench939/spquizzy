# Sign-up wording — for review

This is the new copy on the sign-in screen. It is not on the privacy notice or the cookie policy yet. Those pages still describe the email magic link from the 11 November 2026 clearance. Nothing here has been merged.

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

Sign out, and Clear local data, remove `spquizzy.drop.session` from both stores.

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

Short password:

> Use at least 6 characters for the password.

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

## Not changed on the live legal pages

The privacy notice still says an email sign-in is a one-time link. That is still true for **Email me a link instead** and for the post-results prompt. Create account also asks for a password. Supabase stores the password hash. The page does not store the password.

The cookie policy lists `spquizzy.drop.session` as a local sign-in token. That key is still the session. When the box is unticked it is in `sessionStorage` instead of `localStorage`. `dd_remember` is a new local key for the tick. Neither change is on the cookie page yet.

---

## What has to be true in Supabase

The confirmation link and the magic link both return to `https://spiquizzy.com/sign-in/` (and the same path on any preview origin). That URL has to be allowed in Authentication → URL configuration.

This screen appears when email confirmation is on and sign-up does not return a session. If confirmation is off, the person is signed in immediately and this screen is not shown.

The words inside the email itself are the Supabase confirmation template, not the lines above.
