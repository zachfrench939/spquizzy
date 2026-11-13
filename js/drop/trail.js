/** Ten cells, one per question. Safe, dropped, or not played. No invented questions. */

export function shareTrail(run) {
  const history = Array.isArray(run?.history) ? run.history : [];
  const cells = [];
  for (let i = 0; i < 10; i += 1) {
    const after = history[i + 1];
    if (after == null || after === "") {
      cells.push({ q: i + 1, state: "missed", coins: null });
    } else {
      const coins = Number(after) || 0;
      cells.push({ q: i + 1, state: coins > 0 ? "safe" : "dropped", coins });
    }
  }
  return cells;
}

export function shareTrailLabel(cells) {
  return cells.map((cell) => {
    if (cell.state === "safe") return `Question ${cell.q} safe, ${cell.coins} coins`;
    if (cell.state === "dropped") return `Question ${cell.q} dropped`;
    return `Question ${cell.q} not played`;
  }).join(". ");
}
