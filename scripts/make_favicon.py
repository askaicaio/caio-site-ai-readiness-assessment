"""
Generate rounded-corner favicons from the CAIO white-on-purple logo.

Outputs:
  public/favicon.png         (256x256 — primary, browsers downscale as needed)
  public/favicon-32.png      (32x32  — explicit small fallback)
  public/apple-touch-icon.png(180x180 — iOS home-screen)
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "CAIO-logo-white-on-purple.png"
OUT_DIR = ROOT / "public"

# Corner radius as a fraction of the icon's edge (iOS uses ~22%).
RADIUS_FRAC = 0.22

# Sizes to generate
TARGETS = [
    ("favicon.png", 256),
    ("favicon-32.png", 32),
    ("apple-touch-icon.png", 180),
]


def round_corners(im: Image.Image, radius: int) -> Image.Image:
    """Return a copy of `im` with rounded corners (transparent outside)."""
    im = im.convert("RGBA")
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius=radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def main() -> None:
    src = Image.open(SRC)
    print(f"Source: {SRC.name} {src.size} {src.mode}")

    for name, size in TARGETS:
        # High-quality downscale, then mask
        resized = src.resize((size, size), Image.LANCZOS)
        rounded = round_corners(resized, radius=int(size * RADIUS_FRAC))
        dest = OUT_DIR / name
        rounded.save(dest, format="PNG", optimize=True)
        print(f"Wrote {dest.relative_to(ROOT)} ({size}x{size}, {dest.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
