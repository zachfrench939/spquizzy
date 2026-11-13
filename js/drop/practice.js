/** One on-device practice question. No network and no bank. */

export const PRACTICE = {
  q: "Which of these has three sides?",
  answers: ["Square", "Triangle", "Circle", "Hexagon"],
  correct: 1,
  fact: "A triangle has three sides. Practice stays on this device and does not change today’s bank.",
};

export function gradePractice(doors) {
  const placed = Array.isArray(doors) ? doors : [];
  const kept = Number(placed[PRACTICE.correct]) || 0;
  return {
    correct: PRACTICE.correct,
    kept,
    wiped: kept <= 0,
    fact: PRACTICE.fact,
  };
}
