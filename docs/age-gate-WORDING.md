# 13+ gate — for Legal

Accounts are still only for people aged 13 or over. The tick stays on **Create account**. It is no longer on returning email and password sign-in. Any sign-in that does not already have a confirmation is asked before anything else.

Apostrophes on the page are curly. Nothing here has been merged. The SQL is not applied to the live database.

---

## Create account

Still shown, and still required, only on Create account:

> You must be 13 or over to create an account. Under 13s can play as a guest on this device.

> I am 13 or over

If the box is not ticked:

> Tick the box to confirm you are 13 or over. Under 13s can play as a guest on this device.

Ticking the box sends `age_13_plus: true` in the sign-up user metadata. The first sign-in after the email is verified calls `dd_confirm_age`, which stores `age_confirmed_at`. A verified email-and-password account does not stay empty.

---

## Returning sign-in

Email and password sign-in does not show the tick. If that account’s `age_confirmed_at` is still empty, the gate below is shown. The same gate is used for Google and a sign-in link.

---

## Gate

Shown before anything else when the signed-in profile has `age_confirmed_at` and it is empty. There is no second tick. The Yes button is the confirmation. The two buttons are the same style, and neither is pre-selected.

Heading:

> Are you 13 or over?

> Accounts are for players aged 13 and over. Under 13s can play as a guest on this device.

Button:

> Yes, I’m 13 or over

Button:

> No, sign me out

If saving the confirmation fails:

> That didn’t save. Try again, or sign out and play as a guest.

After **No, sign me out**:

> You were signed out. Accounts are for players aged 13 and over. You can still play as a guest.

**No, sign me out** also calls `dd_delete_my_unconfirmed_account`. That deletes the signed-in account only when it was created after the release cutoff and `age_confirmed_at` is still empty. An older account is signed out and is not deleted.

---

## Privacy notice

Added on the privacy page:

> When you create an account, we record that you confirmed you’re 13 or over and when. If a new account isn’t confirmed within 24 hours, we delete it and everything linked to it.

Also on that page, under Deleting an account:

> If you are asked whether you are 13 or over and you choose “No, sign me out”, that new account is deleted straight away, along with everything linked to it.

---

## Magic-link copy

The sign-in link request sends `create_user: true`, so a new address does get an account. The inbox line stays:

> We’ve sent a sign-in link to {address}.

---

## Cookie banner

The shorter line from the sign-in fixes pull request:

> Under 13? Ask a parent or carer before you Accept.
