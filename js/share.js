import { buildShare, copyText, formatTime, puzzleNumber } from "./core.js";
import { track } from "./analytics.js";

function squares(moves, par) {
  const n = Math.max(1, Math.min(6, moves || 1));
  return { n, color: moves <= par ? "#2f8f4e" : "#f6c945" };
}

function cardBlob(fields) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const g = canvas.getContext("2d");
  g.fillStyle = "#101820";
  g.fillRect(0, 0, 1200, 630);
  g.fillStyle = "#f6c945";
  g.font = "700 28px Nunito, sans-serif";
  g.fillText("SPIQUIZZY", 72, 100);
  g.fillStyle = "#fff8ea";
  g.font = "800 64px Nunito, sans-serif";
  g.fillText(fields.title, 72, 200);
  g.font = "800 84px Nunito, sans-serif";
  g.fillText(formatTime(fields.seconds), 72, 320);
  const { n, color } = squares(fields.moves, fields.par);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(72 + i * 56, 370, 40, 40);
  g.fillStyle = "#f6ecd1";
  g.font = "600 28px Nunito, sans-serif";
  const label = fields.diff.charAt(0).toUpperCase() + fields.diff.slice(1);
  g.fillText(`Puzzle ${puzzleNumber(fields.date)} · ${label}`, 72, 490);
  const rank = String(fields.rank || "").replace(/\s+/g, " ").trim();
  if (rank && !/^checking/i.test(rank)) {
    g.font = "500 26px Nunito, sans-serif";
    g.fillText(rank.slice(0, 90), 72, 545);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function shareResult(fields) {
  track("share");
  const text = buildShare(fields);
  const blob = await cardBlob(fields);
  const file = new File([blob], "spiquizzy.png", { type: "image/png" });
  if (navigator.share) {
    const payload = { text, title: "Spiquizzy" };
    try {
      if (!navigator.canShare || navigator.canShare({ files: [file] })) payload.files = [file];
    } catch {
      /* this browser rejects file payloads */
    }
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancel";
    }
  }
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "image/png": blob,
        }),
      ]);
      return "copied";
    }
  } catch {
    /* fall back to text */
  }
  return (await copyText(text)) ? "copied" : "failed";
}
