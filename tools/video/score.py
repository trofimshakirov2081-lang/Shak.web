# Музыка + звуковые эффекты для рекламных роликов, всё своё (можно использовать коммерчески).
# python3 -I score.py out.wav длительность события.json [bpm] [сид]
# события: [[время, "тип", (параметр)]], типы: whoosh, swish, click, tick, pop, chime, impact, riser(длина), shimmer
import sys, json, wave
import numpy as np
SR = 44100
out, DUR = sys.argv[1], float(sys.argv[2])
EV = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else []
BPM = float(sys.argv[4]) if len(sys.argv) > 4 else 104
rng = np.random.default_rng(int(sys.argv[5]) if len(sys.argv) > 5 else 4)
L = int(DUR * SR); music = np.zeros((L, 2)); fx = np.zeros((L, 2)); B = 60 / BPM
f = lambda m: 440 * 2 ** ((m - 69) / 12)
t_ = lambda n: np.arange(n) / SR

def put(buf, x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= L or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    e = min(L, i + len(x)); x = x[: e - i] * g
    buf[i:e, 0] += x * (1 - pan); buf[i:e, 1] += x * (1 + pan)

def onepole(x, a):
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y

def noise(n): return rng.standard_normal(n)

# ---------- музыка ----------
def kick(): n = int(.35 * SR); t = t_(n); fr = 50 + 70 * np.exp(-t * 35); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)
def hat(): n = int(.06 * SR); x = noise(n); x = x - onepole(x, .5); return x * np.exp(-t_(n) * 70) * .5
def shaker(): n = int(.09 * SR); x = noise(n); x = x - onepole(x, .35); env = np.sin(np.pi * np.minimum(1, t_(n) / .09)); return x * env * .25
def bass(m, d): n = int(d * SR); t = t_(n); fr = f(m); x = np.sin(2 * np.pi * fr * t) + .3 * np.sin(2 * np.pi * 2 * fr * t); return x * np.minimum(1, t / .01) * np.exp(-t * 1.2) * np.minimum(1, (d - t) / .05)
def pluck(m, d=.45):
    n = int(d * SR); t = t_(n); fr = f(m)
    x = sum((.55 ** k) * np.sin(2 * np.pi * fr * (k + 1) * t) * np.exp(-t * (6 + 5 * k)) for k in range(5))
    return x * np.minimum(1, t / .003)
def pad(ms, d):
    n = int(d * SR); t = t_(n); x = np.zeros(n)
    for m in ms:
        for det in (-.1, 0, .09): fr = f(m) * 2 ** (det / 12); x += np.sin(2 * np.pi * fr * t) + .2 * np.sin(2 * np.pi * 2 * fr * t + 1)
    return x * np.minimum(1, t / .8) * np.minimum(1, (d - t) / .8) / (3 * len(ms))

# Fm9 - Db - Ab - Eb, тёплые и «дорогие» аккорды
CH = [(41, [65, 68, 72, 75]), (37, [65, 68, 73, 77]), (44, [68, 72, 75, 79]), (39, [67, 70, 74, 79])]
bar = 4 * B; nb = int(DUR / bar) + 1
for k in range(nb):
    t0 = k * bar; root, ch = CH[k % 4]
    put(music, pad(ch, bar + .6), t0, .16)
    for s in range(8):  # бас восьмыми с пропусками
        if s in (0, 3, 4, 6): put(music, bass(root, B * .45), t0 + s * B / 2, .32)
    for s in range(4): put(music, kick(), t0 + s * B, .55 if k > 0 else .3)
    for s in range(8): put(music, hat(), t0 + s * B / 2 + B / 4, .22, .3 * (1 if s % 2 else -1))
    for s in range(16):
        if rng.random() < .4: put(music, shaker(), t0 + s * B / 4, .25, -.2)
    arp = [ch[0] + 12, ch[2], ch[1] + 12, ch[3]]
    for s in range(8):
        if s % 2 == 0 or rng.random() < .3: put(music, pluck(arp[s % 4]), t0 + s * B / 2, .18, .35 if s % 2 else -.25)
music[:, 0] = onepole(music[:, 0], .55); music[:, 1] = onepole(music[:, 1], .55)

# ---------- эффекты ----------
def whoosh(d=.55, up=True):
    n = int(d * SR); t = t_(n); x = noise(n); env = np.sin(np.pi * t / d) ** 2
    sweep = (.04 + .5 * (t / d if up else 1 - t / d)); y = np.empty(n); s = 0.0
    for i in range(n): s += sweep[i] * (x[i] - s); y[i] = s
    return y * env * 1.6
def swish(): return whoosh(.32, True) * .8
def click(): n = int(.03 * SR); t = t_(n); return (np.sin(2 * np.pi * 2400 * t) * .6 + noise(n) * .25) * np.exp(-t * 220)
def tick(): n = int(.02 * SR); t = t_(n); return np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) * .5
def pop(): n = int(.14 * SR); t = t_(n); fr = 300 + 900 * np.exp(-t * 40); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 26)
def chime():
    n = int(1.6 * SR); t = t_(n)
    return sum(a * np.sin(2 * np.pi * fr * t) * np.exp(-t * dcy) for fr, a, dcy in ((1046.5, .5, 3), (1568, .35, 4), (2093, .2, 5), (2637, .12, 6))) * np.minimum(1, t / .004)
def impact():
    n = int(1.4 * SR); t = t_(n); fr = 38 + 60 * np.exp(-t * 8); body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 3.2)
    air = onepole(noise(n), .08) * np.exp(-t * 6) * .6
    return (body + air) * 1.1
def riser(d):
    n = int(d * SR); t = t_(n); x = noise(n); y = np.empty(n); s = 0.0; a = .02 + .6 * (t / d) ** 2
    for i in range(n): s += a[i] * (x[i] - s); y[i] = s
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / d) ** 2) / SR) * .15
    return (y + tone) * (t / d) ** 2 * 1.3
def shimmer(): n = int(.9 * SR); t = t_(n); return sum(np.sin(2 * np.pi * (2200 + 380 * k) * t + k) * np.exp(-t * (5 + k)) for k in range(5)) * .12 * np.minimum(1, t / .01)

FX = {'whoosh': lambda p: whoosh(p or .55), 'swish': lambda p: swish(), 'click': lambda p: click(), 'tick': lambda p: tick(), 'pop': lambda p: pop(),
      'chime': lambda p: chime(), 'impact': lambda p: impact(), 'riser': lambda p: riser(p or 1.0), 'shimmer': lambda p: shimmer()}
GAIN = {'whoosh': .55, 'swish': .45, 'click': .6, 'tick': .35, 'pop': .55, 'chime': .5, 'impact': .9, 'riser': .5, 'shimmer': .6}
for e in EV:
    tm, kind = e[0], e[1]; par = e[2] if len(e) > 2 else None
    start = tm - (par if kind == 'riser' else 0)  # нарастание заканчивается ровно к событию
    put(fx, FX[kind](par), start, GAIN[kind], (rng.random() - .5) * .3)
    if kind == 'impact':  # музыка чуть «приседает» под удар
        i = int(tm * SR); d = int(.5 * SR); e2 = min(L, i + d)
        if i < L: music[i:e2] *= np.linspace(.45, 1, e2 - i)[:, None]

mix = music * .55 + fx
rev = np.zeros_like(mix)
for d, g in ((.029, .22), (.047, .18), (.083, .13), (.131, .09), (.197, .06)):
    s = int(d * SR); rev[s:] += mix[:-s] * g
mix = mix + rev
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(.05 * SR)] *= np.linspace(0, 1, int(.05 * SR))[:, None]
mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.4) / np.tanh(1.4) * .86
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out, DUR, 'событий', len(EV))
