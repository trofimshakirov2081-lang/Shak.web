# Универсальная гонка столбцов: python3 -I race2.py data.json outdir
# data.json: keys, names, iso2, colors, labels (подпись времени на каждом шаге), values {key: [..]}, total [..],
# title, sub, src, total_label, unit (people|count|usd), fps_step (кадров на шаг), highlight, end (плашка в конце или null)
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFont
D = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(sys.argv[1])); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
W, H, TOP, FPS = 1080, 1920, 5, 30
BG = (14, 16, 24)
F = lambda f, s: ImageFont.truetype(D + "/" + f, s)
FB, FBIG, FT = F("Akt.ttf", 54), F("Akt.ttf", 190), F("Akt.ttf", 62)
FN, FS, FM = F("Finlandica.ttf", 40), F("Finlandica.ttf", 32), F("Finlandica.ttf", 46)
try: FN.set_variation_by_axes([700]); FS.set_variation_by_axes([500]); FM.set_variation_by_axes([600])
except Exception: pass
FLAGS = {}
for k, i in C["iso2"].items():
    p = f"{D}/flags/{i}.png"
    if os.path.exists(p): FLAGS[k] = Image.open(p).convert("RGBA")
PAL = ["#4C7DFF", "#FF4D4D", "#FF9F1C", "#F25C9A", "#FFD23F", "#7B61FF", "#2EC4B6", "#3DDC97", "#5BC0EB", "#9B5DE5", "#00BBF9", "#F15BB5",
       "#FEE440", "#00F5D4", "#FF8C42", "#8AC926", "#FF924C", "#1982C4", "#6A4C93", "#C5283D", "#E9724C", "#52B788", "#80ED99", "#48CAE4", "#E63946", "#06D6A0", "#FFB703", "#43AA8B", "#F9844A"]
COL = {k: C.get("colors", {}).get(k, PAL[i % len(PAL)]) for i, k in enumerate(C["keys"])}
hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
V = C["values"]; T = C.get("total"); LAB = C["labels"]; NS = len(LAB); FST = C["fps_step"]; unit = C["unit"]

def sp(x, a, b, c):  # число с пробелами между тысячами
    return f"{x:,.{a}f}".replace(",", " ").replace(".", ",")
def fmt(x):
    if unit == "usd":
        if x >= 1e12: return "$" + sp(x / 1e12, 1, 0, 0) + " трлн"
        if x >= 1e9: return "$" + sp(x / 1e9, 0, 0, 0) + " млрд"
        return "$" + sp(x / 1e6, 0, 0, 0) + " млн"
    if unit == "count":
        if x >= 1e9: return sp(x / 1e9, 2, 0, 0) + " млрд"
        if x >= 1e8: return sp(x / 1e6, 0, 0, 0) + " млн"
        if x >= 1e6: return sp(x / 1e6, 1, 0, 0) + " млн"
        if x >= 1e4: return sp(x / 1e3, 0, 0, 0) + " тыс."
        return sp(round(x, -1) if x >= 100 else round(x), 0, 0, 0)
    if x >= 1e9: return sp(x / 1e9, 2, 0, 0) + " млрд"
    if x >= 1e6: return (sp(x / 1e6, 1, 0, 0) if x < 1e8 else sp(x / 1e6, 0, 0, 0)) + " млн"
    return sp(x / 1e3, 0, 0, 0) + " тыс."
def gfmt(x):
    if unit == "count":
        if x >= 1e9: return f"{x / 1e9:g}".replace(".", ",") + " млрд"
        if x >= 1e6: return f"{x / 1e6:g}".replace(".", ",") + " млн"
        if x >= 1e3: return f"{x / 1e3:g}".replace(".", ",") + " тыс."
        return f"{x:g}"
    pre = "$" if unit == "usd" else ""
    if x >= 1e12: return pre + f"{x / 1e12:g}".replace(".", ",") + " трлн"
    if x >= 1e9: return pre + f"{x / 1e9:g}".replace(".", ",") + " млрд"
    if x >= 1e6: return pre + f"{x / 1e6:g}".replace(".", ",") + " млн"
    return pre + f"{x / 1e3:g}" + " тыс."
def val(k, s):  # s: дробный шаг
    i = min(int(s), NS - 2); f = min(1, s - i)
    return V[k][i] + (V[k][i + 1] - V[k][i]) * f
def tot(s):
    if not T: return None
    i = min(int(s), NS - 2); f = min(1, s - i); return T[i] + (T[i + 1] - T[i]) * f

X0, BAR_H, GAP, Y_TOP = 60, 190, 50, 380
N = (NS - 1) * FST + FPS * 4
rank = {}; scale = None
for n in range(N):
    s = min(n / FST, NS - 1)
    vals = sorted(((val(k, s), k) for k in C["keys"]), reverse=True)
    target = max(vals[0][0], 1) * 1.12
    scale = target if scale is None else scale + (target - scale) * 0.12
    for i, (v, k) in enumerate(vals): rank[k] = i if k not in rank else rank[k] + (i - rank[k]) * 0.18
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    d.text((W // 2, 115), C["title"], font=FT, fill=(240, 242, 248), anchor="mm")
    d.text((W // 2, 190), C["sub"], font=FS, fill=(150, 156, 175), anchor="mm")
    base = 10 ** math.floor(math.log10(scale / 4)); step = next(base * m for m in (1, 2, 2.5, 5, 10) if scale / (base * m) <= 5)
    maxw = W - X0 - 210; g = step
    while g < scale:
        x = X0 + maxw * g / scale
        d.line([(x, Y_TOP - 30), (x, Y_TOP + TOP * (BAR_H + GAP))], fill=(36, 40, 56), width=2)
        d.text((x, Y_TOP - 48), gfmt(g), font=FS, fill=(110, 116, 138), anchor="mm"); g += step
    for v, k in vals:
        r = rank[k]
        if r > TOP - 0.5 or v <= 0: continue
        y = Y_TOP + r * (BAR_H + GAP); w = max(6, maxw * v / scale)
        d.rounded_rectangle([X0, y, X0 + w, y + BAR_H], radius=16, fill=hexc(COL[k]))
        if k == C.get("highlight"): d.rounded_rectangle([X0 - 5, y - 5, X0 + w + 5, y + BAR_H + 5], radius=20, outline=(255, 255, 255), width=4)
        fl = FLAGS.get(k); name = C["names"][k]
        if fl is not None: fl = fl.copy(); fl.thumbnail((84, 56))
        fw = fl.width if fl is not None else 0
        if r > TOP - 0.75: continue
        if w > d.textlength(name, font=FN) + fw + 70:
            if fl is not None: im.paste(fl, (int(X0 + 18), int(y + (BAR_H - fl.height) / 2)), fl)
            d.text((X0 + 32 + fw, y + BAR_H / 2), name, font=FN, fill=(12, 14, 20), anchor="lm")
            d.text((X0 + w + 16, y + BAR_H / 2), fmt(v), font=FS, fill=(225, 228, 238), anchor="lm")
        else:
            if fl is not None: im.paste(fl, (int(X0 + w + 14), int(y + (BAR_H - fl.height) / 2)), fl)
            d.text((X0 + w + 28 + fw, y + BAR_H / 2 - 18), name, font=FN, fill=(240, 242, 248), anchor="lm")
            d.text((X0 + w + 28 + fw, y + BAR_H / 2 + 22), fmt(v), font=FS, fill=(170, 176, 196), anchor="lm")
    lab = LAB[min(int(round(s)) if C.get("round_label") else int(s), NS - 1)]
    big, small = (lab.split("|") + [""])[:2]
    d.text((W - 50, 1690), big, font=FBIG, fill=(78, 84, 110), anchor="rm")
    if small: d.text((W - 60, 1580), small, font=FM, fill=(110, 116, 140), anchor="rm")
    if T:
        d.text((X0, 1640), C["total_label"], font=FS, fill=(120, 126, 150), anchor="lm")
        d.text((X0, 1700), fmt(tot(s)), font=FB, fill=(225, 228, 238), anchor="lm")
    d.text((W // 2, H - 125), C["src"], font=FS, fill=(90, 96, 118), anchor="mm")
    if C.get("src2"): d.text((W // 2, H - 80), C["src2"], font=FS, fill=(90, 96, 118), anchor="mm")
    E = C.get("end"); k2 = (n - (NS - 1) * FST - FPS) / (FPS * 0.6)
    if E and k2 > 0:
        a = min(1, k2); ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); o = ImageDraw.Draw(ov); tc = lambda c: c + (int(255 * a),)
        o.rectangle([0, 0, W, H], fill=(8, 9, 14, int(170 * a)))
        o.rounded_rectangle([70, 700, W - 70, 1180], radius=36, fill=(24, 27, 40, int(250 * a)), outline=(76, 125, 255, int(255 * a)), width=4)
        o.text((W // 2, 800), E[0], font=FT, fill=tc((240, 242, 248)), anchor="mm")
        o.text((W // 2, 900), E[1], font=FN, fill=tc((200, 205, 222)), anchor="mm")
        o.text((W // 2, 960), E[2], font=FN, fill=tc((200, 205, 222)), anchor="mm")
        o.text((W // 2, 1080), E[3], font=FS, fill=tc((120, 160, 255)), anchor="mm")
        im = Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
    im.save(f"{OUT}/f{n:05d}.jpg", quality=90)
print("frames", N, "seconds", N / FPS)
