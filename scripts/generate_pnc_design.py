"""
Generate a sophisticated monochromatic-green graphic composition
using `pnc-bg.jpg` as the background layer and `pnc-logo.png` as the
primary brand identifier.

Output: pnc-design.png (1920x1080)
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG_PATH = os.path.join(ROOT, "pnc-bg.jpg")
LOGO_PATH = os.path.join(ROOT, "pnc-logo.png")
OUT_PATH = os.path.join(ROOT, "pnc-design.png")

# ---------------------------------------------------------------------------
# Canvas + brand palette (monochromatic green)
# ---------------------------------------------------------------------------
W, H = 1920, 1080

# Monochromatic green palette (deep -> light)
GREEN_BLACK   = (3, 18, 12)        # near-black green (shadow)
GREEN_DEEP    = (8, 38, 24)        # deep forest
GREEN_FOREST  = (15, 64, 38)       # forest
GREEN_MID     = (28, 102, 64)      # mid emerald
GREEN_BRAND   = (46, 139, 87)      # brand emerald (sea green)
GREEN_LIGHT   = (143, 196, 161)    # mint
GREEN_GLOW    = (190, 230, 200)    # pale glow
GREEN_LINE    = (210, 245, 220)    # near-white green for fine accents


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def linear_gradient(size, top_color, bottom_color, direction="vertical"):
    """Generate a smooth linear gradient image."""
    w, h = size
    grad = Image.new("RGB", size, top_color)
    px = grad.load()
    if direction == "vertical":
        for y in range(h):
            t = y / max(1, h - 1)
            c = lerp(top_color, bottom_color, t)
            for x in range(w):
                px[x, y] = c
    else:  # horizontal
        for x in range(w):
            t = x / max(1, w - 1)
            c = lerp(top_color, bottom_color, t)
            for y in range(h):
                px[x, y] = c
    return grad


def radial_mask(size, inner=0.0, outer=1.0, invert=False):
    """Create an L-mode radial mask (white in center -> black at edges)."""
    w, h = size
    mask = Image.new("L", size, 0)
    px = mask.load()
    cx, cy = w / 2, h / 2
    max_r = (cx ** 2 + cy ** 2) ** 0.5
    for y in range(h):
        for x in range(w):
            r = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_r
            if r <= inner:
                v = 255
            elif r >= outer:
                v = 0
            else:
                t = (r - inner) / (outer - inner)
                v = int(255 * (1 - t))
            px[x, y] = v
    if invert:
        mask = ImageOps.invert(mask)
    return mask


def duotone_green(img: Image.Image) -> Image.Image:
    """Map a photo to a monochromatic green duotone (shadow->highlight)."""
    gray = ImageOps.grayscale(img)
    # Slightly boost contrast for richer depth
    gray = ImageEnhance.Contrast(gray).enhance(1.15)
    # Build a 256-entry green ramp from GREEN_BLACK -> GREEN_LIGHT
    ramp = []
    stops = [
        (0.00, GREEN_BLACK),
        (0.35, GREEN_DEEP),
        (0.65, GREEN_FOREST),
        (0.85, GREEN_MID),
        (1.00, GREEN_LIGHT),
    ]
    for i in range(256):
        t = i / 255
        # find segment
        for j in range(len(stops) - 1):
            t0, c0 = stops[j]
            t1, c1 = stops[j + 1]
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0) if t1 > t0 else 0
                ramp.append(lerp(c0, c1, k))
                break
        else:
            ramp.append(stops[-1][1])
    # Apply ramp via channel lookup
    r_lut = [c[0] for c in ramp]
    g_lut = [c[1] for c in ramp]
    b_lut = [c[2] for c in ramp]
    out = Image.merge(
        "RGB",
        (gray.point(r_lut), gray.point(g_lut), gray.point(b_lut)),
    )
    return out


def soft_glow(layer_rgba: Image.Image, radius: int, color, opacity: int) -> Image.Image:
    """Build a colored soft glow from an RGBA layer's alpha."""
    alpha = layer_rgba.split()[-1]
    glow = Image.new("RGBA", layer_rgba.size, color + (0,))
    glow.putalpha(alpha.filter(ImageFilter.GaussianBlur(radius)))
    # Reduce overall opacity
    a = glow.split()[-1].point(lambda p: int(p * opacity / 255))
    glow.putalpha(a)
    return glow


# ---------------------------------------------------------------------------
# Build the composition
# ---------------------------------------------------------------------------
def main():
    # 1. Base canvas: deep green gradient (top->bottom for cinematic depth)
    base = linear_gradient((W, H), GREEN_DEEP, GREEN_BLACK, "vertical").convert("RGBA")

    # 2. Background photo -> duotone green, scaled to fill
    bg = Image.open(BG_PATH).convert("RGB")
    # Cover-fit the canvas
    src_ratio = bg.width / bg.height
    dst_ratio = W / H
    if src_ratio > dst_ratio:
        new_h = H
        new_w = int(H * src_ratio)
    else:
        new_w = W
        new_h = int(W / src_ratio)
    bg_resized = bg.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - W) // 2
    top = (new_h - H) // 2
    bg_cover = bg_resized.crop((left, top, left + W, top + H))

    # Slight blur for cinematic depth-of-field
    bg_cover = bg_cover.filter(ImageFilter.GaussianBlur(2.5))
    bg_duo = duotone_green(bg_cover).convert("RGBA")

    # Blend duotone background onto base gradient (let the gradient enrich shadows)
    bg_duo.putalpha(225)  # ~88% so gradient bleeds at edges
    base = Image.alpha_composite(base, bg_duo)

    # 3. Vignette: darken edges with a radial mask of GREEN_BLACK
    vignette_layer = Image.new("RGBA", (W, H), GREEN_BLACK + (255,))
    vmask = radial_mask((W, H), inner=0.15, outer=0.95, invert=True)
    # Soften
    vmask = vmask.filter(ImageFilter.GaussianBlur(80))
    # Scale mask intensity (max ~70% darken)
    vmask = vmask.point(lambda p: int(p * 0.70))
    vignette_layer.putalpha(vmask)
    base = Image.alpha_composite(base, vignette_layer)

    # 4. Subtle center light bloom (radial highlight behind logo)
    bloom = Image.new("RGBA", (W, H), GREEN_GLOW + (0,))
    bmask = radial_mask((W, H), inner=0.0, outer=0.55)
    bmask = bmask.filter(ImageFilter.GaussianBlur(120))
    bmask = bmask.point(lambda p: int(p * 0.28))  # very subtle
    bloom.putalpha(bmask)
    base = Image.alpha_composite(base, bloom)

    # 5. Decorative geometry: thin double frame + corner ornaments
    deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(deco)

    margin = 70
    inner_margin = 92
    # Outer thin frame
    d.rectangle(
        [margin, margin, W - margin, H - margin],
        outline=GREEN_LIGHT + (180,),
        width=2,
    )
    # Inner thinner frame (double-line motif)
    d.rectangle(
        [inner_margin, inner_margin, W - inner_margin, H - inner_margin],
        outline=GREEN_LINE + (90,),
        width=1,
    )

    # Corner ornaments (small angle brackets)
    corner_len = 60
    corner_pad = 50
    cw = 3
    corners = [
        (corner_pad, corner_pad, +1, +1),
        (W - corner_pad, corner_pad, -1, +1),
        (corner_pad, H - corner_pad, +1, -1),
        (W - corner_pad, H - corner_pad, -1, -1),
    ]
    for cx, cy, sx, sy in corners:
        d.line([(cx, cy), (cx + sx * corner_len, cy)], fill=GREEN_GLOW + (220,), width=cw)
        d.line([(cx, cy), (cx, cy + sy * corner_len)], fill=GREEN_GLOW + (220,), width=cw)

    # Top + bottom hairline accents inside the frame
    hair_y_top = inner_margin + 36
    hair_y_bot = H - inner_margin - 36
    d.line(
        [(inner_margin + 30, hair_y_top), (W - inner_margin - 30, hair_y_top)],
        fill=GREEN_LIGHT + (110,),
        width=1,
    )
    d.line(
        [(inner_margin + 30, hair_y_bot), (W - inner_margin - 30, hair_y_bot)],
        fill=GREEN_LIGHT + (110,),
        width=1,
    )

    # Center diamond accent above logo
    cx_center = W // 2
    diamond_y = 220
    ds = 7
    d.polygon(
        [
            (cx_center, diamond_y - ds),
            (cx_center + ds, diamond_y),
            (cx_center, diamond_y + ds),
            (cx_center - ds, diamond_y),
        ],
        fill=GREEN_GLOW + (230,),
    )
    # Flanking horizontal lines next to diamond
    line_gap = 22
    line_len = 220
    d.line(
        [
            (cx_center - ds - line_gap - line_len, diamond_y),
            (cx_center - ds - line_gap, diamond_y),
        ],
        fill=GREEN_LIGHT + (180,),
        width=2,
    )
    d.line(
        [
            (cx_center + ds + line_gap, diamond_y),
            (cx_center + ds + line_gap + line_len, diamond_y),
        ],
        fill=GREEN_LIGHT + (180,),
        width=2,
    )

    base = Image.alpha_composite(base, deco)

    # 6. Logo: prominent, centered, with multi-layer green glow
    logo = Image.open(LOGO_PATH).convert("RGBA")

    # Target logo height ~ 52% of canvas height
    target_h = int(H * 0.52)
    scale = target_h / logo.height
    target_w = int(logo.width * scale)
    logo_resized = logo.resize((target_w, target_h), Image.LANCZOS)

    # Position roughly centered, slightly above mid for tagline space
    lx = (W - target_w) // 2
    ly = (H - target_h) // 2 - 30

    # Build a stage that holds glow + logo so we can composite cleanly
    stage = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Outer broad halo (deep green)
    halo_outer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    halo_outer.paste(logo_resized, (lx, ly), logo_resized)
    halo_outer = soft_glow(halo_outer, radius=55, color=GREEN_BRAND, opacity=170)

    # Mid glow (mint)
    halo_mid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    halo_mid.paste(logo_resized, (lx, ly), logo_resized)
    halo_mid = soft_glow(halo_mid, radius=22, color=GREEN_LIGHT, opacity=190)

    # Tight rim (pale glow)
    halo_rim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    halo_rim.paste(logo_resized, (lx, ly), logo_resized)
    halo_rim = soft_glow(halo_rim, radius=6, color=GREEN_GLOW, opacity=220)

    stage = Image.alpha_composite(stage, halo_outer)
    stage = Image.alpha_composite(stage, halo_mid)
    stage = Image.alpha_composite(stage, halo_rim)

    # Place the actual logo on top, untouched, so it stays crisp & prominent
    stage.paste(logo_resized, (lx, ly), logo_resized)

    base = Image.alpha_composite(base, stage)

    # 7. Final subtle film grain via a high-frequency noise mask (very light)
    try:
        import random
        noise = Image.new("L", (W // 2, H // 2))
        nd = noise.load()
        random.seed(7)
        for y in range(noise.height):
            for x in range(noise.width):
                nd[x, y] = random.randint(0, 255)
        noise = noise.resize((W, H), Image.BILINEAR)
        noise_layer = Image.new("RGBA", (W, H), GREEN_LIGHT + (0,))
        # Very low opacity grain
        noise_alpha = noise.point(lambda p: int(abs(p - 128) * 0.10))
        noise_layer.putalpha(noise_alpha)
        base = Image.alpha_composite(base, noise_layer)
    except Exception:
        pass

    # 8. Save
    base.convert("RGB").save(OUT_PATH, "PNG", optimize=True)
    print(f"Saved: {OUT_PATH}  ({W}x{H})")


if __name__ == "__main__":
    main()
