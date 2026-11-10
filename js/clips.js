const hand = `<svg class="clip-hand" viewBox="0 0 32 32" aria-hidden="true"><path d="M11 15c0-3 2-5 4-2l1 3V9c0-2 3-3 4-1v6l2-3c1-2 4-1 4 1l-1 9c-1 4-4 7-9 7h-1c-4 0-7-3-7-7z" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2" stroke-linejoin="round"/></svg>`;

const CLIPS = {
  sauce: `<div class="clip clip-sauce">
    <div class="clip-stage">
      <div class="demo-pot"></div>
      <div class="demo-pipe"></div>
      <div class="demo-sauce"></div>
      <div class="demo-plate"></div>
      ${hand}
    </div>
  </div>`,
  slip: `<div class="clip clip-slip">
    <div class="clip-stage">
      <div class="demo-tray"></div>
      <div class="demo-ball"></div>
      <div class="demo-gate"></div>
      ${hand}
    </div>
  </div>`,
  twirl: `<div class="clip clip-twirl">
    <div class="clip-stage">
      <i class="dot a"></i><i class="dot b"></i>
      <span class="demo-line"></span>
      ${hand}
    </div>
  </div>`,
  bowls: `<div class="clip clip-bowls">
    <div class="clip-stage">
      <div class="demo-num">4</div>
      <div class="demo-bowl left"><b>0</b></div>
      <div class="demo-bowl right"><b>4</b></div>
      ${hand}
    </div>
  </div>`,
  ravioli: `<div class="clip clip-ravioli">
    <div class="clip-stage">
      <div class="demo-half a">SUN</div>
      <div class="demo-half b">FLOWER</div>
      <div class="demo-word">SUNFLOWER</div>
      ${hand}
    </div>
  </div>`,
  pips: `<div class="clip clip-pips">
    <div class="clip-stage">
      <div class="demo-region">Add to 3</div>
      <div class="demo-domino"><i></i><i></i><i></i></div>
      ${hand}
    </div>
  </div>`,
};

export function clipHtml(id) {
  return CLIPS[id] || CLIPS.sauce;
}

export function restartClip(root) {
  const clip = root?.querySelector?.(".clip");
  if (!clip) return;
  clip.replaceWith(clip.cloneNode(true));
}
