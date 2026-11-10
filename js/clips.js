const hand = `<svg class="clip-hand" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true"><rect width="8" height="8" fill="#1e2a2a"/><rect x="1" y="1" width="5" height="5" fill="#fff8e6"/><rect x="3" y="3" width="2" height="2" fill="#e23b2f"/></svg>`;

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
