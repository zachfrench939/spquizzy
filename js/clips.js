export function clipHtml() {
  return "";
}

export function restartClip(root) {
  const clip = root?.querySelector?.(".clip");
  if (!clip) return;
  clip.replaceWith(clip.cloneNode(true));
}
