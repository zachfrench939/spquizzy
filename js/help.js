export const TUTORIALS = {
  sauce: {
    goal: "Turn the pipes so the red sauce can run from the pot to the plate.",
    steps: [
      ["Turn a pipe.", "Tap a pipe. Each tap turns it a quarter turn."],
      ["Follow the red.", "Sauce only travels where openings meet. If a pipe does not face its neighbour, the path stops."],
      ["Reach the plate.", "You win when the sauce touches the plate."],
    ],
  },
  slip: {
    goal: "Slide the meatball, one square at a time, to the green exit.",
    steps: [
      ["Pick a block.", "The meatball starts selected. Tap another block if you want to move that one instead."],
      ["Tap an arrow.", "Each tap slides the selected block one square, and only into an empty square."],
      ["Reach the gate.", "Get the meatball onto the square beside the green exit. That is the only way out."],
    ],
  },
  twirl: {
    goal: "Join each matching pair with a line, and cover every square.",
    steps: [
      ["Drag to the match.", "Press a picture and drag, square by square, to the same picture."],
      ["Do not cross.", "A line cannot cross another line, and it cannot pass through a different picture."],
      ["Fill the grid.", "You win when every square is part of a line."],
    ],
  },
  bowls: {
    goal: "Split the numbers so every bowl adds up to the same total.",
    steps: [
      ["Tap a number.", "It lifts off the counter."],
      ["Drop it in a bowl.", "Tap a bowl to drop the number in. The total under that bowl updates."],
      ["Make the totals match.", "Use every number. Both bowls must show the same total."],
    ],
  },
  ravioli: {
    goal: "Tap two halves that join to make one real word.",
    steps: [
      ["Tap a half, then its pair.", "Pick one half, then the half that finishes the word."],
      ["A real word locks.", "SUN and FLOWER make SUNFLOWER, and that pair stays together."],
      ["A wrong pair shakes.", "If the halves are not one of the words, they shake and you can try again. Nothing is lost."],
    ],
  },
  pips: {
    goal: "Place every domino so each coloured area follows its label.",
    steps: [
      ["Place a domino.", "Drag a domino from the tray onto the board. It snaps to the nearest two squares that share a side. Tap a placed domino to turn it, or drag it off the board to put it back. With a keyboard, press a domino, then press two squares."],
      ["Read the label.", "“Add to 3” means the dots in that colour add up to 3. “All same” means every half in that colour shows the same number. “Over” and “Under” mean the total is above or below the number."],
      ["Green is right, red is wrong.", "A green edge means that area is complete and correct. A red edge means it is full but the label failed — drag that domino off and try again."],
    ],
  },
};

export function stepsHtml(id) {
  const steps = TUTORIALS[id]?.steps || [];
  return `<ol class="how-steps">${steps.map(([title, body], index) =>
    `<li class="how-step"><span class="how-n">${index + 1}</span><div><strong>${title}</strong><p>${body}</p></div></li>`
  ).join("")}</ol>`;
}
