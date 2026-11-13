/** Where each data-nav value goes. Buttons have no href, so the click handler must use this. */

export const NAV_HREF = {
  home: "/",
  play: "/play/",
  league: "/leagues/",
  bank: "/bank/",
  profile: "/profile/",
  signin: "/sign-in/",
  plus: "/plus/",
  settings: "/settings/",
  archive: "/archive/",
  missing: "/404.html",
};

export function navAction(dest, { inPlay = false } = {}) {
  if (dest === "howto") return { type: "howto" };
  if (dest === "practice") return { type: "practice" };
  if ((dest === "home" || dest === "/") && inPlay) return { type: "leave" };
  const href = NAV_HREF[dest];
  if (href) return { type: "go", href };
  return { type: "none" };
}
