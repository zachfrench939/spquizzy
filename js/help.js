function step(n, title, text, picture) {
  return `<li class="how-step"><span class="how-n">${n}</span><div><strong>${title}</strong><p>${text}</p>${picture}</div></li>`;
}

const pipe = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="1" y="1" width="26" height="26" rx="6" fill="#fff"/>
  <rect x="11" y="2" width="6" height="14" rx="3" fill="#e0a82e"/>
  <rect x="11" y="11" width="14" height="6" rx="3" fill="#e0a82e"/>
  <rect x="45" y="1" width="26" height="26" rx="6" fill="#fff"/>
  <rect x="55" y="2" width="6" height="14" rx="3" fill="#e23b2f"/>
  <rect x="55" y="11" width="14" height="6" rx="3" fill="#e23b2f"/>
</svg>`;

const slip = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 120 28" aria-hidden="true">
  <rect x="1" y="4" width="22" height="18" rx="4" fill="#f08a6a"/>
  <circle cx="40" cy="14" r="8" fill="#f0b429" stroke="#1e2a2a" stroke-width="2"/>
  <circle cx="37" cy="12" r="1.4" fill="#1e2a2a"/>
  <circle cx="43" cy="12" r="1.4" fill="#1e2a2a"/>
  <rect x="58" y="2" width="18" height="18" rx="4" fill="#fff" stroke="#e4ddd0"/>
  <path d="M63 15h8M67 11l4 4-4 4" fill="none" stroke="#1e2a2a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="90" y="4" width="22" height="20" rx="4" fill="#e5f6ea" stroke="#1e6b38" stroke-width="2"/>
  <path d="M96 14h10M102 10l4 4-4 4" fill="none" stroke="#1e6b38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const twirl = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 72 28" aria-hidden="true">
  <circle cx="10" cy="14" r="7" fill="#e23b2f" stroke="#1e2a2a" stroke-width="2"/>
  <rect x="16" y="11" width="40" height="6" fill="#e23b2f"/>
  <circle cx="62" cy="14" r="7" fill="#e23b2f" stroke="#1e2a2a" stroke-width="2"/>
</svg>`;

const bowls = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="6" y="1" width="14" height="12" rx="4" fill="#f6c945"/>
  <text x="13" y="10" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">4</text>
  <rect x="2" y="16" width="24" height="10" rx="5" fill="#fff"/>
  <rect x="40" y="16" width="24" height="10" rx="5" fill="#fff"/>
</svg>`;

const words = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="2" y="4" width="30" height="20" rx="6" fill="#f6c945"/>
  <rect x="40" y="4" width="30" height="20" rx="6" fill="#fff"/>
  <text x="17" y="18" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">SUN</text>
  <text x="55" y="18" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">FLOWER</text>
</svg>`;

const domino = `<svg class="how-fig" shape-rendering="crispEdges" viewBox="0 0 72 28" aria-hidden="true">
  <rect x="4" y="2" width="40" height="24" rx="6" fill="#f6c945"/>
  <circle cx="14" cy="14" r="2.4" fill="#1e2a2a"/>
  <circle cx="32" cy="9" r="2.4" fill="#1e2a2a"/>
  <circle cx="32" cy="19" r="2.4" fill="#1e2a2a"/>
  <rect x="50" y="2" width="18" height="24" rx="6" fill="#f7c1b0"/>
  <text x="59" y="17" text-anchor="middle" font-size="8" font-family="Nunito, sans-serif" font-weight="800" fill="#1e2a2a">8</text>
</svg>`;

export const HELP = {
  sauce: `<ol class="how-steps">
    ${step(1, "Tap a pipe", "One tap turns that pipe a quarter turn. Keep tapping to keep turning.", pipe)}
    ${step(2, "Follow the red", "Red sauce leaves the pot and fills every open pipe it can reach.", "")}
    ${step(3, "Reach the plate", "You win when the red sauce touches the plate.", "")}
  </ol>`,
  slip: `<ol class="how-steps">
    ${step(1, "Tap a block", "The meatball starts selected. Tap another block if you want to move that one.", slip)}
    ${step(2, "Tap an arrow", "Each tap slides the selected block one square, when that square is empty.", "")}
    ${step(3, "Reach the exit gate", "Slide the meatball onto the square by the green exit gate.", "")}
  </ol>`,
  twirl: `<ol class="how-steps">
    ${step(1, "Match the pictures", "Press a picture and drag to the same picture.", twirl)}
    ${step(2, "Stay on empty squares", "The line cannot cross another line or another picture.", "")}
    ${step(3, "Cover every square", "You win when every square is part of a line.", "")}
  </ol>`,
  bowls: `<ol class="how-steps">
    ${step(1, "Tap a number", "It lifts off the counter.", bowls)}
    ${step(2, "Tap a bowl", "The number drops in. The total under that bowl changes.", "")}
    ${step(3, "Make the totals match", "Use every number. Each bowl must show the same total.", "")}
  </ol>`,
  ravioli: `<ol class="how-steps">
    ${step(1, "Tap one half", "Then tap the half that finishes the word.", words)}
    ${step(2, "A real word stays", "Sun and flower make sunflower, and that pair locks.", "")}
    ${step(3, "A wrong pair shakes", "It does not lock. Try a different half.", "")}
  </ol>`,
  pips: `<ol class="how-steps">
    ${step(1, "Pick up a domino", "Tap it, then tap two squares that share a side.", domino)}
    ${step(2, "Read the label", "Add to 8 means the dots in that color add up to 8. All same means every dot in that color matches.", "")}
    ${step(3, "Fill the board", "A green edge means that color is right. A red edge means it is full but wrong.", "")}
  </ol>`,
};
