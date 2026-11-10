#!/usr/bin/env python3
"""Key the magenta out of the sprite sheets and export transparent assets.

Source sheets live in sprites/ and use a solid magenta (or JPEG-shifted pink)
background. Pipes are rebuilt so each opening sits on the middle of a tile
edge and reaches that edge, which is what makes neighbouring tiles connect.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sprites"
OUT = ROOT / "assets"
TILE = 192


def border_key(rgb: np.ndarray) -> np.ndarray:
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0)
    # Median ignores the occasional sprite pixel that touches the edge.
    return np.median(border, axis=0)


def chroma_key(im: Image.Image, t0: float = 28, t1: float = 78) -> Image.Image:
    """Drop the sheet background and pull magenta spill off the fringe."""
    rgb = np.array(im.convert("RGB")).astype(np.float32)
    key = border_key(rgb)
    dist = np.abs(rgb - key).sum(axis=2)
    alpha = np.clip((dist - t0) / (t1 - t0), 0, 1)
    # Unmix the background so pink fringes do not stay on the edges.
    fg = (rgb - key * (1 - alpha)[..., None]) / np.maximum(alpha, 0.06)[..., None]
    fg = np.clip(fg, 0, 255)
    out = np.dstack([fg, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    alpha = np.array(im.split()[-1])
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def save(im: Image.Image, path: Path, size: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = im
    if size:
        img = im.copy()
        img.thumbnail((size, size), Image.Resampling.LANCZOS)
    img.save(path.with_suffix(".png"), "PNG", optimize=True)
    img.save(path.with_suffix(".webp"), "WEBP", quality=82, method=6)


def components(mask: np.ndarray, min_n: int = 400):
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    kept = []
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        cells = []
        minx = maxx = x
        miny = maxy = y
        while stack:
            cy, cx = stack.pop()
            cells.append((cy, cx))
            minx, maxx = min(minx, cx), max(maxx, cx)
            miny, maxy = min(miny, cy), max(maxy, cy)
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        bw, bh = maxx - minx + 1, maxy - miny + 1
        # The plate frame is one huge, sparse component. Skip it.
        if bw > w * 0.85 and bh > h * 0.85 and len(cells) < 0.4 * bw * bh:
            continue
        if len(cells) >= min_n:
            kept.append(cells)
    out = np.zeros_like(mask)
    for cells in kept:
        for y, x in cells:
            out[y, x] = True
    return out


def pipe_mask(rgba: Image.Image) -> np.ndarray:
    arr = np.array(rgba).astype(np.int16)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum = (r.astype(int) + g + b) / 3
    plate = (a > 140) & (lum < 118) & (b > r - 8) & (b > g - 18) & (r < 100)
    graphic = (a > 140) & ~plate
    return components(graphic, 400)


def blank_plate(rgba: Image.Image, mask: np.ndarray) -> Image.Image:
    """A metal tile with the pipe painted out, so new arms are the only pipes."""
    arr = np.array(rgba).copy()
    a = arr[:, :, 3]
    lum = arr[:, :, :3].mean(axis=2)
    plate_px = arr[(a > 200) & ~mask & (lum > 35) & (lum < 140)]
    color = np.median(plate_px, axis=0).astype(np.uint8) if len(plate_px) else np.array([45, 56, 72, 255], dtype=np.uint8)
    color[3] = 255
    ys, xs = np.where(mask)
    y0, y1 = max(0, int(ys.min()) - 10), min(arr.shape[0], int(ys.max()) + 11)
    x0, x1 = max(0, int(xs.min()) - 6), min(arr.shape[1], int(xs.max()) + 7)
    # Clone a clean plate row across the pipe so the grid is not a hole.
    src = max(0, y0 - 1)
    for y in range(y0, y1):
        arr[y, x0:x1] = arr[src, x0:x1]
    dark = (lum < 48) & (a > 80)
    arr[dark] = color
    arr[a < 180] = color
    return Image.fromarray(arr, "RGBA")


def erode(mask: np.ndarray, times: int = 1) -> np.ndarray:
    out = mask
    for _ in range(times):
        pad = np.pad(out, 1, constant_values=False)
        out = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:] & out
    return out


def isolate(rgba: Image.Image, mask: np.ndarray) -> Image.Image:
    mask = erode(mask, 1)
    arr = np.array(rgba).copy()
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    # Drop the white and pink halo left by JPEG fringe before it gets stretched.
    pink = (r > 170) & (b > 90) & (g < 110) & (r > g + 40)
    arr[(~mask) | pink, 3] = 0
    ys, xs = np.where(arr[:, :, 3] > 40)
    crop = arr[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    return Image.fromarray(crop, "RGBA")


def fill_to_edge(part: Image.Image) -> Image.Image:
    """Stretch the solid metal out to both ends so the pipe is not a floating stub."""
    arr = np.array(part)
    alpha = arr[:, :, 3]
    rows = np.where((alpha > 128).mean(axis=1) > 0.15)[0]
    if len(rows) == 0:
        return part
    y0, y1 = int(rows[0]), int(rows[-1]) + 1
    density = (alpha[y0:y1] > 128).mean(axis=0)
    solid = np.where(density > 0.4)[0]
    if len(solid) == 0:
        return part
    nearest = solid[np.abs(solid[None, :] - np.arange(arr.shape[1])[:, None]).argmin(axis=1)]
    band = arr[y0:y1, nearest]
    arr[y0:y1] = band
    return Image.fromarray(arr, "RGBA")


def build_arms(straight: Image.Image, size: int) -> dict[str, Image.Image]:
    """Place a copy of the real straight pipe on each side of a square tile."""
    w, h = straight.size
    thick = max(12, int(size * 0.50))
    length = size // 2 + 18
    left = straight.crop((0, 0, w // 2 + 6, h)).resize((length, thick), Image.Resampling.LANCZOS)
    right = straight.crop((max(0, w // 2 - 6), 0, w, h)).resize((length, thick), Image.Resampling.LANCZOS)
    # ROTATE_90 is counter-clockwise: the left flange ends up on the bottom.
    north = left.transpose(Image.Transpose.ROTATE_270)
    south = left.transpose(Image.Transpose.ROTATE_90)
    arms = {}
    for name, img, box in (
        ("W", left, (0, (size - thick) // 2)),
        ("E", right, (size - length, (size - thick) // 2)),
        ("N", north, ((size - thick) // 2, 0)),
        ("S", south, ((size - thick) // 2, size - length)),
    ):
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        layer.paste(img, box, img)
        arms[name] = layer
    return arms


def compose(plate: Image.Image | None, arms: dict[str, Image.Image], sides: str) -> Image.Image:
    out = plate.copy() if plate is not None else Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    for side in sides:
        out.alpha_composite(arms[side])
    return out


def fit_square(im: Image.Image, size: int, fill: tuple[int, int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), fill)
    scale = min(size / im.width, size / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def process_pipes() -> None:
    sheet = chroma_key(Image.open(SRC / "pipes-sheet.jpg"))
    # Empty row, then the same four shapes filled with sauce.
    boxes = {
        "straight": (64, 60, 276, 264),
        "corner": (334, 60, 544, 264),
        "tee": (602, 60, 814, 264),
        "cross": (872, 60, 1086, 264),
    }
    sauce_shift = 256
    empty = {name: sheet.crop(box) for name, box in boxes.items()}
    filled = {name: sheet.crop((box[0], box[1] + sauce_shift, box[2], box[3] + sauce_shift)) for name, box in boxes.items()}
    mask = pipe_mask(empty["straight"])
    plate = blank_plate(empty["straight"], mask).resize((TILE, TILE), Image.Resampling.LANCZOS)
    straight = isolate(empty["straight"], mask)
    sauce_mask = pipe_mask(filled["straight"])
    straight_sauce = isolate(filled["straight"], sauce_mask)
    arms = build_arms(straight, TILE)
    sauce_arms = build_arms(straight_sauce, TILE)
    # corner opens west and south, tee opens east/west/south, cross opens all four.
    shapes = {"straight": "EW", "corner": "WS", "tee": "EWS", "cross": "NEWS"}
    for name, sides in shapes.items():
        # Transparent pipes. The board tile stays put while the pipe rotates.
        save(compose(None, arms, sides), OUT / "pipes" / name)
        save(compose(None, sauce_arms, sides), OUT / "pipes" / f"{name}-sauce")
    save(plate, OUT / "pipes" / "board")

    pot = trim(sheet.crop((250, 570, 520, 810)), 2)
    plate_color = np.array(plate)[8, 8].tolist()
    save(fit_square(pot, TILE, tuple(plate_color)), OUT / "pipes" / "pot")
    spaghetti = trim(sheet.crop((590, 575, 900, 800)), 4)
    goal = plate.copy()
    sp = spaghetti.copy()
    sp.thumbnail((int(TILE * 0.94), int(TILE * 0.94)), Image.Resampling.LANCZOS)
    goal.paste(sp, ((TILE - sp.width) // 2, (TILE - sp.height) // 2), sp)
    save(goal, OUT / "pipes" / "goal")


def clip_pose(sheet_rgba: Image.Image, body, left: int, right: int) -> Image.Image:
    """Crop one wombat without taking a slice of the pose beside it."""
    x0, y0, x1, y1 = body[:4]
    x0 = max(left, x0 - 8)
    x1 = min(right, x1 + 8)
    y0 = max(0, y0 - 70)
    y1 = min(sheet_rgba.height, y1 + 12)
    return trim(sheet_rgba.crop((x0, y0, x1, y1)), 1)


def large_bodies(im: Image.Image, min_n: int = 4000):
    alpha = np.array(im.split()[-1]) > 20
    h, w = alpha.shape
    seen = np.zeros_like(alpha, dtype=bool)
    bodies = []
    ys, xs = np.where(alpha)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        stack = [(y, x)]
        seen[y, x] = True
        n = 0
        minx = maxx = x
        miny = maxy = y
        while stack:
            cy, cx = stack.pop()
            n += 1
            minx, maxx = min(minx, cx), max(maxx, cx)
            miny, maxy = min(miny, cy), max(maxy, cy)
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if n >= min_n:
            bodies.append((minx, miny, maxx + 1, maxy + 1, n))
    bodies.sort(key=lambda b: b[0])
    return bodies


def process_wombat() -> None:
    sheet = chroma_key(Image.open(SRC / "wombat-sheet.jpg"), t0=24, t1=70)
    bodies = large_bodies(sheet)
    names = ["idle", "thinking", "cheering", "sad"]
    if len(bodies) != 4:
        raise SystemExit(f"expected 4 wombats, found {len(bodies)}")
    for i, (name, body) in enumerate(zip(names, bodies)):
        left = 0 if i == 0 else (bodies[i - 1][2] + body[0]) // 2
        right = sheet.width if i == 3 else (body[2] + bodies[i + 1][0]) // 2
        pose = clip_pose(sheet, body, left, right)
        save(pose, OUT / "wombat" / name, size=420)


def process_icons() -> None:
    sheet = chroma_key(Image.open(SRC / "icons-sheet.jpg"), t0=26, t1=72)
    names = ["sauce", "slip", "twirl", "bowls", "ravioli", "pips"]
    boxes = [
        (62, 86, 370, 400),
        (422, 86, 730, 400),
        (780, 86, 1090, 400),
        (62, 450, 372, 766),
        (422, 450, 730, 764),
        (780, 450, 1090, 766),
    ]
    for name, box in zip(names, boxes):
        icon = trim(sheet.crop(box), 2)
        save(icon, OUT / "icons" / name, size=280)


def food_sprites() -> None:
    """Rich pieces for the games that do not have their own sheet."""
    s = 160
    meat = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(meat)
    d.ellipse((10, 14, 150, 150), fill=(122, 64, 36, 255))
    d.ellipse((28, 28, 118, 100), fill=(166, 96, 52, 255))
    d.ellipse((48, 48, 78, 78), fill=(255, 248, 234, 255))
    d.ellipse((96, 48, 126, 78), fill=(255, 248, 234, 255))
    d.ellipse((58, 58, 72, 74), fill=(30, 22, 18, 255))
    d.ellipse((106, 58, 120, 74), fill=(30, 22, 18, 255))
    d.ellipse((40, 88, 58, 100), fill=(224, 120, 110, 180))
    d.ellipse((108, 88, 126, 100), fill=(224, 120, 110, 180))
    d.pieslice((58, 86, 108, 126), 20, 160, fill=(90, 28, 28, 255))
    d.ellipse((70, 100, 96, 118), fill=(240, 140, 140, 255))
    save(meat, OUT / "food" / "meatball", size=160)

    las = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(las)
    d.rounded_rectangle((8, 18, 152, 142), 10, fill=(92, 42, 24, 255))
    bands = [(28, (244, 214, 140)), (48, (196, 48, 36)), (68, (244, 196, 110)), (88, (176, 40, 32)), (108, (236, 186, 96))]
    for y, color in bands:
        d.rectangle((16, y, 144, y + 16), fill=color + (255,))
        d.arc((16, y - 6, 144, y + 10), 200, 340, fill=(255, 236, 190, 255), width=3)
    for x, y in ((36, 40), (78, 62), (120, 44), (54, 96), (108, 112)):
        d.ellipse((x, y, x + 10, y + 8), fill=(46, 140, 64, 255))
    save(las, OUT / "food" / "lasagna", size=160)

    penne = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(penne)
    d.rounded_rectangle((18, 48, 142, 112), 28, fill=(232, 186, 96, 255))
    d.rounded_rectangle((28, 58, 132, 102), 22, fill=(255, 224, 150, 255))
    for x in range(36, 130, 14):
        d.arc((x, 52, x + 16, 108), 250, 290, fill=(176, 120, 48, 255), width=3)
    d.ellipse((22, 64, 48, 96), fill=(90, 50, 24, 255))
    d.ellipse((112, 64, 138, 96), fill=(90, 50, 24, 255))
    save(penne, OUT / "food" / "penne", size=160)

    rav = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(rav)
    d.rounded_rectangle((16, 16, 144, 144), 18, fill=(242, 196, 92, 255))
    d.rounded_rectangle((28, 28, 132, 132), 12, fill=(255, 220, 140, 255))
    for i in range(8, 150, 10):
        d.ellipse((i, 12, i + 8, 24), fill=(214, 150, 48, 255))
        d.ellipse((i, 136, i + 8, 148), fill=(214, 150, 48, 255))
        d.ellipse((12, i, 24, i + 8), fill=(214, 150, 48, 255))
        d.ellipse((136, i, 148, i + 8), fill=(214, 150, 48, 255))
    for x, y in ((48, 58), (96, 78), (70, 100)):
        d.ellipse((x, y, x + 12, y + 10), fill=(196, 48, 36, 255))
    save(rav, OUT / "food" / "ravioli", size=160)


def main() -> None:
    process_pipes()
    process_wombat()
    process_icons()
    food_sprites()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
