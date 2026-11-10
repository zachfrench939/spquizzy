function step(n, title, text, picture) {
  return `<li class="how-step"><span class="how-n">${n}</span><div><strong>${title}</strong><p>${text}</p>${picture}</div></li>`;
}

const pipe = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="1" y="1" width="26" height="26" rx="3" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2"/>
  <rect x="10" y="0" width="8" height="16" fill="#e0a82e"/>
  <rect x="10" y="10" width="16" height="8" fill="#e0a82e"/>
  <rect x="45" y="1" width="26" height="26" rx="3" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2"/>
  <rect x="54" y="0" width="8" height="16" fill="#e23b2f"/>
  <rect x="54" y="10" width="18" height="8" fill="#e23b2f"/>
</svg>`;

const slip = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="1" y="4" width="22" height="18" rx="2" fill="#e23b2f" stroke="#1e2a2a" stroke-width="2"/>
  <circle cx="46" cy="14" r="8" fill="#f6c945" stroke="#1e2a2a" stroke-width="2"/>
  <path d="M62 8 L70 14 L62 20 Z" fill="#2f8f4e"/>
</svg>`;

const twirl = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <circle cx="10" cy="14" r="7" fill="#e23b2f" stroke="#1e2a2a" stroke-width="2"/>
  <rect x="16" y="11" width="40" height="6" fill="#e23b2f"/>
  <circle cx="62" cy="14" r="7" fill="#e23b2f" stroke="#1e2a2a" stroke-width="2"/>
</svg>`;

const bowls = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="4" y="2" width="16" height="14" rx="2" fill="#f6c945" stroke="#1e2a2a" stroke-width="2"/>
  <text x="12" y="13" text-anchor="middle" font-size="9" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">4</text>
  <path d="M2 18 h22 v4 a10 8 0 0 1 -22 0 z" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2"/>
  <path d="M40 18 h22 v4 a10 8 0 0 1 -22 0 z" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2"/>
</svg>`;

const words = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="2" y="4" width="30" height="20" rx="3" fill="#f6c945" stroke="#1e2a2a" stroke-width="2"/>
  <rect x="40" y="4" width="30" height="20" rx="3" fill="#fff8e6" stroke="#1e2a2a" stroke-width="2"/>
  <text x="17" y="18" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">SUN</text>
  <text x="55" y="18" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">FLOWER</text>
</svg>`;

const domino = `<svg class="how-fig" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="4" y="2" width="40" height="24" rx="3" fill="#f6c945" stroke="#1e2a2a" stroke-width="2"/>
  <circle cx="14" cy="14" r="2.5" fill="#1e2a2a"/>
  <circle cx="32" cy="9" r="2.5" fill="#1e2a2a"/>
  <circle cx="32" cy="19" r="2.5" fill="#1e2a2a"/>
  <rect x="50" y="2" width="18" height="24" rx="3" fill="#f7c1b0" stroke="#1e2a2a" stroke-width="2"/>
  <text x="59" y="17" text-anchor="middle" font-size="7" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">3</text>
</svg>`;

export const HELP = {
  sauce: `<ol class="how-steps">
    ${step(1, "Tap a pipe", "Each tap turns that pipe once.", pipe)}
    ${step(2, "Follow the red", "Red means the sauce is flowing out of the pot.", "")}
    ${step(3, "Reach the plate", "Keep turning until the red sauce touches the plate.", "")}
  </ol>`,
  slip: `<ol class="how-steps">
    ${step(1, "Drag a tray", "Drag it left, right, up, or down.", slip)}
    ${step(2, "It stops at the next tray", "One drag is one move, however far it slides.", "")}
    ${step(3, "Free the meatball", "Get the yellow ball onto the green arrow.", "")}
  </ol>`,
  twirl: `<ol class="how-steps">
    ${step(1, "Match the pictures", "Press one picture and drag to its twin.", twirl)}
    ${step(2, "Do not cross", "A path cannot go through another path.", "")}
    ${step(3, "Cover the board", "Every square needs to be part of a path.", "")}
  </ol>`,
  bowls: `<ol class="how-steps">
    ${step(1, "Tap a number", "Then tap a bowl to drop it in.", bowls)}
    ${step(2, "Watch the totals", "The number under each bowl is its sum.", "")}
    ${step(3, "Make them match", "Use every number. Every bowl needs the same total.", "")}
  </ol>`,
  ravioli: `<ol class="how-steps">
    ${step(1, "Tap one half", "Then tap the half that finishes the word.", words)}
    ${step(2, "A real word locks", "Sun and flower make sunflower.", "")}
    ${step(3, "A wrong pair shakes", "It does not lock. Try another half.", "")}
  </ol>`,
  pips: `<ol class="how-steps">
    ${step(1, "Pick up a domino", "Tap it, then tap two squares that touch.", domino)}
    ${step(2, "Read the color", "Add to 8 means the dots in that color add up to 8. All same means every dot matches.", "")}
    ${step(3, "Fill the board", "Green means that color is correct. Red means it is full but wrong.", "")}
  </ol>`,
};
