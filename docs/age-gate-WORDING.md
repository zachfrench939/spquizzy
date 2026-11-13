# 13+ gate — for Legal

Accounts are still only for people aged 13 or over. The tick stays on **Create account**. It is no longer on returning email and password sign-in. Google and a sign-in link ask after the account is open, if we do not already have a confirmation.

Apostrophes on the page are curly. Nothing here has been merged. The SQL is not applied to the live database.

---

## Create account

Still shown, and still required, only on Create account:

> You must be 13 or over to create an account. Under 13s can play as a guest on this device.

> I am 13 or over

If the box is not ticked:

> Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.

---

## Returning sign-in

Email and password sign-in does not show the tick.

---

## Gate after Google or a sign-in link

Shown before anything else when that sign-in has no `age_confirmed_at` yet.

Heading:

> Are you 13 or over?

> Accounts are for players aged 13 and over. Under 13s can play as a guest on this device.

> I am 13 or over

Button:

> Yes, I’m 13 or over

Button:

> No, sign me out

If saving the confirmation fails:

> That didn’t save. Try again, or sign out and play as a guest.

After **No, sign me out**:

> You were signed out. Accounts are for players aged 13 and over. You can still play as a guest.

---

## Magic-link copy

The sign-in link request sends `create_user: true`, so a new address does get an account. The inbox line stays:

> We’ve sent a sign-in link to {address}.

---

## Cookie banner

Unchanged from the sign-in fixes pull request:

> If you’re under 13, please ask a parent or carer before choosing Accept.
