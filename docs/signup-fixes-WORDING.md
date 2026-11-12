# Sign-in fixes — for Legal

These are the user-facing strings changed in this pull request. Apostrophes on the page are curly, matching the rest of the sign-in screen. The 13+ rule and the “I am 13 or over” checkbox are unchanged.

Nothing here has been merged.

---

## Keep me logged in

The hint under the checkbox, on sign-in, Create account, and the post-results prompt:

> Untick this on a shared device. You’ll be signed out when you close this tab.

The checkbox label is still **Keep me logged in**. It still starts ticked.

---

## Check your inbox — create account

Shown after Create account when Supabase does not return a session. The same screen is shown when the address is already registered. The page does not say that an account exists.

Heading:

> Check your inbox

Body, for ada@example.com:

> If this is a new email address, we’ve sent a verification link to ada@example.com. Click it to finish creating your account. Already have an account? Sign in instead.

Spam line:

> Check your spam or junk folder if it doesn’t arrive.

Button: **Resend email**

While waiting: **Resend email in 60s**

After a successful resend: **Verification email sent again.**

Button: **Sign in**

Link: **Use a different email**

The old line “An account with that email already exists. Sign in instead.” is removed. A failed create-account that is not this case still says:

> We couldn’t create the account. Try again. You can still play as a guest.

---

## Check your inbox — sign-in link

Shown after **Email me a link instead**, and after the results-card prompt sends a link. The prompt opens this same screen on the sign-in page. It no longer uses “Check your email for the sign-in link.” or “Check your inbox for the link”.

Heading:

> Check your inbox

Body, for ada@example.com:

> We’ve sent a sign-in link to ada@example.com.

Next line:

> Click the link in that email to sign in. Check your spam or junk folder if it doesn’t arrive.

**Resend email** sends the sign-in link again. **Sign in** and **Use a different email** are the same buttons as above.

---

## Removed

> An account with that email already exists. Sign in instead.

> We’ve sent a verification email to {email}.

> Click the link in that email to verify your address. Check your spam or junk folder if it doesn’t arrive.

> Back to sign in

> Untick this on a shared device. You’ll be signed out when the browser closes.

> Check your email for the sign-in link.

> Check your inbox for the link
