#!/usr/bin/env python3
# Generates the Prometheus brand art: a Greco-Roman torch whose flame is a cloud
# of embers (the PYRE motif), framed by fluted columns and a laurel wreath.
# Deterministic. Outputs hero.svg (banner) and emblem.svg (square mark).
import math, random

EMBER = [(0.00, (26, 6, 8)), (0.32, (150, 26, 8)), (0.58, (240, 96, 14)),
         (0.80, (255, 158, 44), ), (1.00, (255, 240, 200))]

def ember(t):
    t = max(0.0, min(1.0, t))
    for i in range(1, len(EMBER)):
        a, c0 = EMBER[i - 1]; b, c1 = EMBER[i]
        if t <= b:
            k = (t - a) / ((b - a) or 1)
            return tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3))
    return EMBER[-1][1]

def rgb(c): return f"rgb({c[0]},{c[1]},{c[2]})"

def flame(cx, base_y, height, half, seed, n=150):
    """Return a list of <circle> ember strings forming a flame, back-to-front."""
    r = random.Random(seed)
    pts = []
    for _ in range(n):
        h = r.random() ** 0.75                      # bias toward the base
        y = base_y - h * height
        w = half * (1 - h) ** 0.62 * (0.55 + 0.75 * math.sin(h * math.pi)) + half * 0.15 * (1 - h)
        x = cx + (r.random() * 2 - 1) * w
        x += math.sin(h * 6.0 + seed) * 5 * (1 - h)  # gentle flicker lean
        rad = 5.6 * (1 - h) + 1.5
        col = ember(min(1.0, 0.12 + h))
        op = 0.55 + 0.45 * r.random()
        pts.append((rad, x, y, col, op))
    # sparks flying off the tip
    for _ in range(16):
        h = 1.0 + r.random() * 0.28
        y = base_y - h * height
        x = cx + (r.random() * 2 - 1) * half * 0.5 + math.sin(seed + h) * 10
        pts.append((r.random() * 1.6 + 0.8, x, y, ember(0.95), 0.4 + 0.4 * r.random()))
    pts.sort(key=lambda p: -p[0])                    # big embers behind
    return "".join(
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rad:.1f}" fill="{rgb(col)}" opacity="{op:.2f}"/>'
        for rad, x, y, col, op in pts)

def laurel(cx, cy, R):
    out = []
    def leaf(a_deg, side):
        a = math.radians(a_deg)
        x = cx + R * math.cos(a); y = cy - R * math.sin(a)
        # tangent (screen) angle for a leaf lying along the wreath, tilted outward
        tx, ty = -math.sin(a), -math.cos(a)
        rot = math.degrees(math.atan2(ty, tx)) + side * 16
        return (f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f})">'
                f'<ellipse rx="19" ry="6.6" fill="url(#leaf)"/>'
                f'<ellipse rx="19" ry="6.6" fill="none" stroke="#7a5a24" stroke-width="0.6" opacity="0.5"/></g>')
    # right side: bottom -> top ; left side mirrored
    ang = -68
    while ang <= 82:
        out.append(leaf(ang, +1)); ang += 8.5
    ang = 248
    while ang >= 98:
        out.append(leaf(ang, -1)); ang -= 8.5
    # ribbon knot at the bottom
    out.append(f'<circle cx="{cx}" cy="{cy - R - 2:.0f}" r="9" fill="url(#gold)"/>'
               f'<path d="M{cx-8},{cy-R+2} q-26,10 -40,30 l14,4 q16,-18 32,-24 z" fill="url(#gold)" opacity="0.9"/>'
               f'<path d="M{cx+8},{cy-R+2} q26,10 40,30 l-14,4 q-16,-18 -32,-24 z" fill="url(#gold)" opacity="0.9"/>')
    return "".join(out)

def column(x, top, bot, w):
    flutes = "".join(
        f'<line x1="{x + w * (0.16 + 0.68 * i / 5):.1f}" y1="{top+30}" x2="{x + w * (0.16 + 0.68 * i / 5):.1f}" y2="{bot-14}" stroke="#1c1712" stroke-width="1.4" opacity="0.55"/>'
        for i in range(6))
    return (f'<rect x="{x-10}" y="{top}" width="{w+20}" height="20" rx="3" fill="url(#stone)"/>'      # capital
            f'<rect x="{x-4}" y="{top+18}" width="{w+8}" height="12" fill="url(#stone)"/>'
            f'<rect x="{x}" y="{top+28}" width="{w}" height="{bot-top-40}" fill="url(#stone)"/>'        # shaft
            f'{flutes}'
            f'<rect x="{x-12}" y="{bot-14}" width="{w+24}" height="16" rx="3" fill="url(#stone)"/>')     # base

DEFS = '''<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="72%">
    <stop offset="0%" stop-color="#141019"/><stop offset="55%" stop-color="#0a0710"/><stop offset="100%" stop-color="#050409"/>
  </radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#ff7a28" stop-opacity="0.55"/><stop offset="45%" stop-color="#c23a08" stop-opacity="0.22"/><stop offset="100%" stop-color="#c23a08" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffe9b0"/><stop offset="48%" stop-color="#e9b45c"/><stop offset="100%" stop-color="#b07d2e"/>
  </linearGradient>
  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#d9ad57"/><stop offset="100%" stop-color="#9c7328"/>
  </linearGradient>
  <linearGradient id="stone" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#4b4034"/><stop offset="35%" stop-color="#2c251d"/><stop offset="100%" stop-color="#181410"/>
  </linearGradient>
  <linearGradient id="handle" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#8a6326"/><stop offset="50%" stop-color="#f0cd7e"/><stop offset="100%" stop-color="#6f4d1c"/>
  </linearGradient>
</defs>'''

def torch(cx, bowl_y):
    return (f'<polygon points="{cx-11},{bowl_y+8} {cx+11},{bowl_y+8} {cx+7},{bowl_y+150} {cx-7},{bowl_y+150}" fill="url(#handle)"/>'
            f'<ellipse cx="{cx}" cy="{bowl_y+150}" rx="9" ry="4" fill="#6f4d1c"/>'
            f'<ellipse cx="{cx}" cy="{bowl_y}" rx="46" ry="13" fill="url(#gold)"/>'
            f'<ellipse cx="{cx}" cy="{bowl_y-2}" rx="38" ry="8" fill="#3a2408"/>')

def build_hero():
    W, H = 1280, 620
    cx = W // 2
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">', DEFS]
    s.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')
    s.append(f'<ellipse cx="{cx}" cy="245" rx="340" ry="300" fill="url(#glow)"/>')
    s.append(column(150, 120, 470, 66))
    s.append(column(1064, 120, 470, 66))
    s.append(laurel(cx, 250, 196))
    s.append(torch(cx, 300))
    s.append(f'<ellipse cx="{cx}" cy="230" rx="120" ry="150" fill="url(#glow)" opacity="0.7"/>')
    s.append(flame(cx, 298, 180, 66, seed=7))
    # engraved title
    s.append(f'<text x="{cx}" y="536" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" '
             f'font-size="66" font-weight="bold" letter-spacing="14" fill="url(#gold)" '
             f'stroke="#160b04" stroke-width="0.7">PROMETHEUS</text>')
    s.append(f'<text x="{cx}" y="572" text-anchor="middle" font-family="Georgia, serif" font-style="italic" '
             f'font-size="19" letter-spacing="1.5" fill="#cf9d63">Give an LLM a language, and it wields the world that language describes.</text>')
    s.append(f'<text x="{cx}" y="600" text-anchor="middle" font-family="ui-monospace, monospace" '
             f'font-size="14" letter-spacing="5" fill="#8a6a44">PYRE &#183; PRISM &#183; A FRAMEWORK FOR LLM-AUTHORED LANGUAGES</text>')
    s.append('</svg>')
    return "".join(s)

def build_emblem():
    S = 640; cx = S // 2
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">', DEFS]
    s.append(f'<rect width="{S}" height="{S}" fill="url(#bg)"/>')
    s.append(f'<ellipse cx="{cx}" cy="300" rx="220" ry="240" fill="url(#glow)"/>')
    s.append(laurel(cx, 320, 210))
    s.append(torch(cx, 360))
    s.append(flame(cx, 358, 210, 74, seed=7, n=180))
    s.append(f'<text x="{cx}" y="600" text-anchor="middle" font-family="Georgia, serif" font-size="46" '
             f'font-weight="bold" letter-spacing="10" fill="url(#gold)">PROMETHEUS</text>')
    s.append('</svg>')
    return "".join(s)

if __name__ == "__main__":
    import os
    d = os.path.dirname(os.path.abspath(__file__))
    open(os.path.join(d, "hero.svg"), "w").write(build_hero())
    open(os.path.join(d, "emblem.svg"), "w").write(build_emblem())
    print("wrote hero.svg, emblem.svg")
