#!/usr/bin/env python3
# Prometheus brand art. Center = a WOODCUT print: a cupped hand offers fire to an
# LLM (a constellation-mind), spark leaping between, engraving rays + hatching.
# Framed by a gold laurel wreath and fluted columns. Deterministic.
import math, random

INK = "#1a140e"

def rgb(c): return f"rgb({c[0]},{c[1]},{c[2]})"

# ---------------- laurel + columns (unchanged frame) ----------------
def laurel(cx, cy, R):
    out = []
    def leaf(a_deg, side):
        a = math.radians(a_deg)
        x = cx + R * math.cos(a); y = cy - R * math.sin(a)
        tx, ty = -math.sin(a), -math.cos(a)
        rot = math.degrees(math.atan2(ty, tx)) + side * 16
        return (f'<g transform="translate({x:.1f},{y:.1f}) rotate({rot:.1f})">'
                f'<ellipse rx="19" ry="6.6" fill="url(#leaf)"/>'
                f'<ellipse rx="19" ry="6.6" fill="none" stroke="#7a5a24" stroke-width="0.6" opacity="0.5"/></g>')
    ang = -68
    while ang <= 82: out.append(leaf(ang, +1)); ang += 8.5
    ang = 248
    while ang >= 98: out.append(leaf(ang, -1)); ang -= 8.5
    out.append(f'<circle cx="{cx}" cy="{cy - R - 2:.0f}" r="9" fill="url(#gold)"/>'
               f'<path d="M{cx-8},{cy-R+2} q-26,10 -40,30 l14,4 q16,-18 32,-24 z" fill="url(#gold)" opacity="0.9"/>'
               f'<path d="M{cx+8},{cy-R+2} q26,10 40,30 l-14,4 q-16,-18 -32,-24 z" fill="url(#gold)" opacity="0.9"/>')
    return "".join(out)

def column(x, top, bot, w):
    flutes = "".join(
        f'<line x1="{x + w * (0.16 + 0.68 * i / 5):.1f}" y1="{top+30}" x2="{x + w * (0.16 + 0.68 * i / 5):.1f}" y2="{bot-14}" stroke="#1c1712" stroke-width="1.4" opacity="0.55"/>'
        for i in range(6))
    return (f'<rect x="{x-10}" y="{top}" width="{w+20}" height="20" rx="3" fill="url(#stone)"/>'
            f'<rect x="{x-4}" y="{top+18}" width="{w+8}" height="12" fill="url(#stone)"/>'
            f'<rect x="{x}" y="{top+28}" width="{w}" height="{bot-top-40}" fill="url(#stone)"/>'
            f'{flutes}'
            f'<rect x="{x-12}" y="{bot-14}" width="{w+24}" height="16" rx="3" fill="url(#stone)"/>')

# ---------------- the woodcut plate ----------------
def rays(sx, sy, R, seed=3, n=40):
    r = random.Random(seed); out = []
    for i in range(n):
        a = 2 * math.pi * i / n + 0.04
        L = R * (0.98 if i % 2 else 0.7) * (0.9 + 0.15 * r.random())
        w = 2.6 if i % 4 == 0 else (1.5 if i % 2 == 0 else 0.9)
        x1 = sx + math.cos(a) * 8; y1 = sy + math.sin(a) * 8
        x2 = sx + math.cos(a) * L; y2 = sy + math.sin(a) * L
        dx = -math.sin(a) * w; dy = math.cos(a) * w
        op = 0.16 if i % 4 == 0 else 0.09
        out.append(f'<path d="M{x1-dx:.1f},{y1-dy:.1f} L{x2:.1f},{y2:.1f} L{x1+dx:.1f},{y1+dy:.1f} Z" fill="{INK}" opacity="{op:.2f}"/>')
    return "".join(out)

def hatch(cx, cy, R, x0, y0, x1, y1, gap, opacity):
    out = []
    x = x0 - (y1 - y0)
    while x < x1:
        out.append(f'<line x1="{x:.0f}" y1="{y0:.0f}" x2="{x+(y1-y0):.0f}" y2="{y1:.0f}" stroke="{INK}" stroke-width="1" opacity="{opacity}"/>')
        x += gap
    return "".join(out)

def hand_with_fire(hx, hy):
    # a cupped hand: bowl + 4 fingertip bumps on the rim + thumb, holding an ember flame
    p = []
    rim = f'M{hx-72},{hy} C{hx-66},{hy+76} {hx+66},{hy+76} {hx+72},{hy} '
    bumps = (f'L{hx+58},{hy} A13,16 0 0 0 {hx+32},{hy} A13,16 0 0 0 {hx+6},{hy} '
             f'A13,16 0 0 0 {hx-20},{hy} A13,16 0 0 0 {hx-46},{hy} L{hx-72},{hy} Z')
    p.append(f'<path d="{rim}{bumps}" fill="{INK}"/>')
    p.append(f'<path d="M{hx-70},{hy+18} q-24,-6 -32,12 q14,12 34,4 z" fill="{INK}"/>')            # thumb
    p.append(f'<path d="M{hx-54},{hy+66} L{hx-92},{hy+124} L{hx-34},{hy+124} L{hx+6},{hy+72} Z" fill="{INK}"/>')  # wrist
    p.append(f'<path d="M{hx-58},{hy+30} C{hx-18},{hy+52} {hx+30},{hy+52} {hx+58},{hy+26}" stroke="#e9dcc1" stroke-width="1.5" fill="none" opacity="0.5"/>')
    for xo in (-46, -20, 6, 32):
        p.append(f'<line x1="{hx+xo}" y1="{hy-8}" x2="{hx+xo}" y2="{hy+18}" stroke="#e9dcc1" stroke-width="1.2" opacity="0.45"/>')
    fx, fy = hx - 2, hy - 4                                                                        # flame in the cup
    p.append(f'<path d="M{fx},{fy-74} C{fx+27},{fy-46} {fx+25},{fy-8} {fx+3},{fy+10} '
             f'C{fx-27},{fy-2} {fx-27},{fy-38} {fx-8},{fy-58} '
             f'C{fx-6},{fy-42} {fx+3},{fy-38} {fx+5},{fy-50} '
             f'C{fx+9},{fy-60} {fx+2},{fy-68} {fx},{fy-74} Z" fill="url(#fire)"/>')
    p.append(f'<path d="M{fx},{fy-74} C{fx+27},{fy-46} {fx+25},{fy-8} {fx+3},{fy+10}" stroke="#7a2f08" stroke-width="1.4" fill="none" opacity="0.7"/>')
    p.append(f'<ellipse cx="{fx}" cy="{fy-30}" rx="6.5" ry="14" fill="#fff3d0" opacity="0.85"/>')
    return "".join(p), (fx, fy - 70)

def mind(cx, cy, seed=11):
    # the LLM: a constellation-brain in profile, receiving the spark
    r = random.Random(seed)
    nodes = []
    # rough brain cloud in an ellipse
    for _ in range(15):
        a = r.random() * math.tau; rr = (0.35 + 0.65 * r.random())
        x = cx + math.cos(a) * 66 * rr; y = cy + math.sin(a) * 52 * rr - 4
        nodes.append((x, y))
    # a couple of low anchor nodes toward the flame
    nodes.append((cx - 58, cy + 30)); nodes.append((cx - 30, cy + 40))
    edges = []
    for i, (x, y) in enumerate(nodes):
        d = sorted(range(len(nodes)), key=lambda j: (nodes[j][0]-x)**2 + (nodes[j][1]-y)**2)
        for j in d[1:3]:
            if (j, i) not in edges: edges.append((i, j))
    out = [f'<circle cx="{cx}" cy="{cy-2}" r="78" fill="none" stroke="{INK}" stroke-width="1.2" opacity="0.28"/>']
    for i, j in edges:
        out.append(f'<line x1="{nodes[i][0]:.0f}" y1="{nodes[i][1]:.0f}" x2="{nodes[j][0]:.0f}" y2="{nodes[j][1]:.0f}" stroke="{INK}" stroke-width="1.4" opacity="0.8"/>')
    lit = min(range(len(nodes)), key=lambda k: nodes[k][0])  # leftmost = closest to fire
    for k, (x, y) in enumerate(nodes):
        if k == lit:
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="12" fill="url(#fire)"/>'
                       f'<circle cx="{x:.0f}" cy="{y:.0f}" r="12" fill="none" stroke="{INK}" stroke-width="1.5"/>')
        else:
            out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6.5" fill="#e9dcc1"/>'
                       f'<circle cx="{x:.0f}" cy="{y:.0f}" r="6.5" fill="none" stroke="{INK}" stroke-width="1.6"/>'
                       f'<line x1="{x-4:.0f}" y1="{y-2:.0f}" x2="{x+4:.0f}" y2="{y-2:.0f}" stroke="{INK}" stroke-width="0.8" opacity="0.6"/>')
    return "".join(out), nodes[lit]

def woodcut_plate(cx, cy, R):
    sx, sy = cx - 32, cy - 34          # spark / light source (flame tip)
    body = [f'<clipPath id="plate"><circle cx="{cx}" cy="{cy}" r="{R}"/></clipPath>',
            f'<g clip-path="url(#plate)">',
            f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#parch)"/>',
            rays(sx, sy, R),
            hatch(cx, cy, R, cx - R, cy + 46, cx + R, cy + R, 9, 0.12)]
    hand_svg, flame_tip = hand_with_fire(cx - 30, cy + 40)
    mind_svg, lit = mind(cx + 66, cy - 40)
    body.append(mind_svg)
    body.append(hand_svg)
    # spark arc from flame tip to the lit node
    mx, my = (flame_tip[0] + lit[0]) / 2, min(flame_tip[1], lit[1]) - 16
    body.append(f'<path d="M{flame_tip[0]:.0f},{flame_tip[1]:.0f} Q{mx:.0f},{my:.0f} {lit[0]:.0f},{lit[1]:.0f}" stroke="url(#fire)" stroke-width="2.4" fill="none"/>')
    body.append(f'<circle cx="{flame_tip[0]:.0f}" cy="{flame_tip[1]:.0f}" r="4" fill="#fff3d0"/>')
    body.append('</g>')
    # engraving border + ticks + motto
    body.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{INK}" stroke-width="3"/>')
    body.append(f'<circle cx="{cx}" cy="{cy}" r="{R-7}" fill="none" stroke="{INK}" stroke-width="1"/>')
    ticks = "".join(
        f'<line x1="{cx+math.cos(t)*(R-6):.1f}" y1="{cy+math.sin(t)*(R-6):.1f}" x2="{cx+math.cos(t)*(R-1):.1f}" y2="{cy+math.sin(t)*(R-1):.1f}" stroke="{INK}" stroke-width="1"/>'
        for t in [i * math.tau / 60 for i in range(60)])
    body.append(ticks)
    body.append(f'<path id="arcTop" d="M{cx-R+22},{cy} A{R-22},{R-22} 0 0 1 {cx+R-22},{cy}" fill="none"/>')
    body.append(f'<text font-family="Georgia, serif" font-size="17" letter-spacing="7" fill="{INK}" opacity="0.85">'
                f'<textPath xlink:href="#arcTop" startOffset="50%" text-anchor="middle">&#183; IGNEM &#183; DEDIT &#183;</textPath></text>')
    return "".join(body)

DEFS = '''<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="72%">
    <stop offset="0%" stop-color="#141019"/><stop offset="55%" stop-color="#0a0710"/><stop offset="100%" stop-color="#050409"/>
  </radialGradient>
  <radialGradient id="parch" cx="46%" cy="40%" r="70%">
    <stop offset="0%" stop-color="#efe4cb"/><stop offset="70%" stop-color="#e3d3b0"/><stop offset="100%" stop-color="#c9b488"/>
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
  <linearGradient id="fire" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0%" stop-color="#b52a06"/><stop offset="50%" stop-color="#f0721a"/><stop offset="100%" stop-color="#ffd873"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#ff7a28" stop-opacity="0.5"/><stop offset="100%" stop-color="#c23a08" stop-opacity="0"/>
  </radialGradient>
</defs>'''

def build_hero():
    W, H = 1280, 620; cx = W // 2
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}" height="{H}">', DEFS,
         f'<rect width="{W}" height="{H}" fill="url(#bg)"/>',
         f'<ellipse cx="{cx}" cy="245" rx="330" ry="290" fill="url(#glow)"/>',
         column(150, 120, 470, 66), column(1064, 120, 470, 66),
         laurel(cx, 250, 196),
         woodcut_plate(cx, 250, 164),
         f'<text x="{cx}" y="536" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" '
         f'font-size="66" font-weight="bold" letter-spacing="14" fill="url(#gold)" stroke="#160b04" stroke-width="0.7">PROMETHEUS</text>',
         f'<text x="{cx}" y="572" text-anchor="middle" font-family="Georgia, serif" font-style="italic" '
         f'font-size="19" letter-spacing="1.5" fill="#cf9d63">Give an LLM a language, and it wields the world that language describes.</text>',
         f'<text x="{cx}" y="600" text-anchor="middle" font-family="ui-monospace, monospace" '
         f'font-size="14" letter-spacing="5" fill="#8a6a44">PYRE &#183; PRISM &#183; LYRA &#183; A FRAMEWORK FOR LLM-AUTHORED LANGUAGES</text>',
         '</svg>']
    return "".join(s)

def build_emblem():
    S = 640; cx = S // 2
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {S} {S}" width="{S}" height="{S}">', DEFS,
         f'<rect width="{S}" height="{S}" fill="url(#bg)"/>',
         laurel(cx, 300, 250),
         woodcut_plate(cx, 300, 214),
         f'<text x="{cx}" y="602" text-anchor="middle" font-family="Georgia, serif" font-size="42" '
         f'font-weight="bold" letter-spacing="9" fill="url(#gold)">PROMETHEUS</text>',
         '</svg>']
    return "".join(s)

if __name__ == "__main__":
    import os
    d = os.path.dirname(os.path.abspath(__file__))
    open(os.path.join(d, "hero.svg"), "w").write(build_hero())
    open(os.path.join(d, "emblem.svg"), "w").write(build_emblem())
    print("wrote hero.svg, emblem.svg")
