# Музыка, которая ведёт ролик: секции по сценам + звук из действий на экране. Всё своё, можно коммерчески.
# python3 -I score2.py out.wav план.json
# план: {"dur": 17.8, "bpm": 104, "sections": [[t0, t1, "tension"|"groove"|"resolve"]], "events": [[t, "тип", параметр]]}
# события: impact, drop(длина тишины перед моментом), revcym(длина), whoosh(длина), swish, click, note(MIDI), success, chime, pop, shimmer
import sys, json, wave
import numpy as np
SR = 44100
out, plan = sys.argv[1], json.load(open(sys.argv[2]))
DUR, BPM = plan['dur'], plan.get('bpm', 104); B = 60 / BPM; L = int(DUR * SR)
rng = np.random.default_rng(plan.get('seed', 7))
music = np.zeros((L, 2)); fx = np.zeros((L, 2)); duck = np.ones(L)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
T = lambda n: np.arange(n) / SR

def put(buf, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= L or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    e = min(L, i + len(x)); x = x[: e - i] * g
    if x.ndim == 1: buf[i:e, 0] += x * (1 - pan); buf[i:e, 1] += x * (1 + pan)
    else: buf[i:e] += x

def lp(x, a):  # фильтр с меняющимся во времени коэффициентом (a может быть массивом)
    a = np.broadcast_to(a, x.shape); y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a[i] * (x[i] - s); y[i] = s
    return y
noise = lambda n: rng.standard_normal(n)

# --- инструменты ---
def kick(g=1.0): n = int(.4 * SR); t = T(n); fr = 46 + 90 * np.exp(-t * 32); return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 8)) * g
def snap(): n = int(.18 * SR); t = T(n); x = noise(n); x = x - lp(x, .25); return (x * np.exp(-t * 28) + .3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40)) * .7
def hat(open_=False): n = int((.22 if open_ else .05) * SR); x = noise(n); x = x - lp(x, .6); return x * np.exp(-T(n) * (14 if open_ else 80)) * .45
def tickk(): n = int(.025 * SR); t = T(n); return (np.sin(2 * np.pi * 5200 * t) + .4 * noise(n)) * np.exp(-t * 260) * .35
def sub(m, d): n = int(d * SR); t = T(n); return np.sin(2 * np.pi * f(m) * t) * np.minimum(1, t / .02) * np.exp(-t * 2.2)
def bass(m, d): n = int(d * SR); t = T(n); fr = f(m); x = np.tanh(1.8 * (np.sin(2 * np.pi * fr * t) + .35 * np.sin(2 * np.pi * 2 * fr * t))); return x * np.minimum(1, t / .006) * np.exp(-t * 3) * .7
def pluck(m, d=.5, bright=1.0):
    n = int(d * SR); t = T(n); fr = f(m)
    return sum((.5 ** k) * np.sin(2 * np.pi * fr * (k + 1) * t) * np.exp(-t * (5 + 6 * k / bright)) for k in range(6)) * np.minimum(1, t / .002)
def pad(ms, d, warm=1.0):
    n = int(d * SR); t = T(n); x = np.zeros(n)
    for m in ms:
        for det in (-.12, 0, .1): fr = f(m) * 2 ** (det / 12); x += np.sin(2 * np.pi * fr * t) + .25 * warm * np.sin(2 * np.pi * 2 * fr * t + .7)
    return x * np.minimum(1, t / .6) * np.minimum(1, np.maximum(0, d - t) / .6) / (3 * len(ms))
def piano(m, d=2.5, v=.5):
    n = int(d * SR); t = T(n); fr = f(m)
    return sum((.6 ** k) * np.sin(2 * np.pi * fr * (k + 1) * t * (1 + .0005 * k)) * np.exp(-t * (1.4 + 1.2 * k)) for k in range(7)) * np.minimum(1, t / .004) * v

# Тональность фа минор: Fm9 - Dbmaj7 - Abmaj7 - Eb6
CH = [(41, [56, 60, 63, 67]), (37, [56, 60, 61, 65]), (44, [55, 60, 63, 68]), (39, [55, 58, 63, 67])]
SCALE = [53, 56, 58, 60, 63, 65, 68, 70, 72, 75]  # пентатоника для «нот из клавиш»
bar = 4 * B

def section(t0, t1, mode):
    k0 = int(t0 / bar); t = k0 * bar
    while t < t1:
        root, ch = CH[int(t / bar) % 4]
        if mode == 'tension':
            prog = min(1, (t - t0) / max(.1, t1 - t0))
            put(music, pad([c - 12 for c in ch[:3]], bar + .5, .3), t, .10)
            for s in range(4):
                bt = t + s * B
                if t0 <= bt < t1:
                    put(music, sub(root, .5), bt, .55)                          # пульс, как сердце
                    if s in (1, 3): put(music, sub(root, .3), bt + B * .5, .3)
            for s in range(16):
                bt = t + s * B / 4
                if t0 <= bt < t1 and (s % 2 == 0 or prog > .5): put(music, tickk(), bt, .5 + .6 * prog, .4 * (1 if s % 2 else -1))
        elif mode == 'groove':
            put(music, pad(ch, bar + .5), t, .14)
            for s in range(4):
                bt = t + s * B
                if t0 <= bt < t1: put(music, kick(), bt, .62); duck[int(bt * SR):int((bt + .18) * SR)] = np.linspace(.35, 1, len(duck[int(bt * SR):int((bt + .18) * SR)]))
                if t0 <= bt < t1 and s in (1, 3): put(music, snap(), bt, .45, .1)
                if t0 <= bt + B / 2 < t1: put(music, hat(s == 3), bt + B / 2, .5, .35)
            for s in (0, 3, 6, 7):
                bt = t + s * B / 2
                if t0 <= bt < t1: put(music, bass(root, B * .42), bt, .55)
            arp = [ch[0] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12, ch[2] + 12, ch[0] + 24]
            for s in range(8):
                bt = t + s * B / 2
                if t0 <= bt < t1 and (s % 3 != 2): put(music, pluck(arp[s % len(arp)], .4), bt, .2, .4 * (1 if s % 2 else -1))
        elif mode == 'resolve':
            if t0 <= t < t1 or t < t0 < t + bar:
                st = max(t, t0)
                put(music, pad([c + 12 for c in ch] + [ch[0]], bar + 1.2, 1.2), st, .2)
                for m in ch: put(music, piano(m, 3, .22), st, 1.0, (m - 62) / 30)
                put(music, sub(root, 1.6), st, .5)
            for s in range(4):
                bt = t + s * B
                if t0 + bar * .5 <= bt < t1: put(music, kick(.7), bt, .4); put(music, hat(), bt + B / 2, .35, .3)
        t += bar

for s in plan['sections']: section(*s)
music *= duck[:, None]

# --- эффекты ---
def whoosh(d=.55):
    n = int(d * SR); t = T(n); env = np.sin(np.pi * t / d) ** 2
    return lp(noise(n), .03 + .45 * t / d) * env * 1.8
def swish(): return whoosh(.3) * .9
def click(): n = int(.035 * SR); t = T(n); return (np.sin(2 * np.pi * 1900 * t) * .7 + noise(n) * .3) * np.exp(-t * 200)
def pop(): n = int(.16 * SR); t = T(n); fr = 260 + 1100 * np.exp(-t * 38); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 24)
def impact():
    n = int(1.8 * SR); t = T(n); fr = 34 + 70 * np.exp(-t * 7)
    body = np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 2.6)); air = lp(noise(n), .06) * np.exp(-t * 5) * .5
    return body + air
def revcym(d):
    n = int(d * SR); x = noise(n); x = x - lp(x, .45); env = (T(n) / d) ** 2.5; return x * env * .9
def success():  # восходящее арпеджио в тональности, «готово»
    out = np.zeros(int(1.2 * SR))
    for i, m in enumerate([65, 68, 72, 77]):
        p = pluck(m, .9, 1.6) * .55; s = int(i * .075 * SR); out[s:s + len(p)] += p[: len(out) - s]
    return out
def chime(): n = int(1.8 * SR); t = T(n); return sum(a * np.sin(2 * np.pi * f(m) * t) * np.exp(-t * d) for m, a, d in ((84, .5, 2.6), (91, .3, 3.4), (96, .18, 4.5))) * np.minimum(1, t / .004)
def shimmer(): n = int(1.0 * SR); t = T(n); return sum(np.sin(2 * np.pi * f(m) * t + k) * np.exp(-t * (4 + k)) for k, m in enumerate([89, 92, 96, 101])) * .14 * np.minimum(1, t / .01)

GAIN = {'impact': .75, 'whoosh': .5, 'swish': .4, 'click': .5, 'pop': .45, 'revcym': .5, 'success': .8, 'chime': .45, 'shimmer': .6, 'note': .5}
for e in plan['events']:
    tm, kind = e[0], e[1]; p = e[2] if len(e) > 2 else None
    if kind == 'drop':  # короткая тишина перед ударом
        i0, i1 = int((tm - p) * SR), int(tm * SR); music[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** .3 * 0 + 0.04; continue
    x = {'impact': impact, 'whoosh': lambda: whoosh(p or .55), 'swish': swish, 'click': click, 'pop': pop, 'revcym': lambda: revcym(p or 1.0),
         'success': success, 'chime': chime, 'shimmer': shimmer, 'note': lambda: pluck(int(p), .7, 1.8)}[kind]()
    start = tm - (p if kind == 'revcym' else 0)
    put(fx, x, start, GAIN[kind], (rng.random() - .5) * .25)
    if kind == 'impact': i = int(tm * SR); e2 = min(L, i + int(.6 * SR)); music[i:e2] *= np.linspace(.4, 1, e2 - i)[:, None]

mix = music * .6 + fx
# комната и лёгкая ширина стерео
rev = np.zeros_like(mix)
for d, g, side in ((.023, .2, 1), (.041, .17, -1), (.067, .13, 1), (.109, .1, -1), (.173, .07, 1), (.251, .05, -1)):
    s = int(d * SR); rev[s:, 0] += mix[:-s, 0 if side > 0 else 1] * g; rev[s:, 1] += mix[:-s, 1 if side > 0 else 0] * g
mix = mix + rev
# выравнивание громкости окнами по 0,5 с (без «провалов» и резких скачков)
win = int(.5 * SR); rms = np.array([np.sqrt((mix[i:i + win] ** 2).mean() + 1e-9) for i in range(0, L, win)])
target = np.median(rms); g = np.clip(target / rms, .6, 1.8); g = np.repeat(g, win)[:L]; g = lp(g, .0004)
mix *= g[:, None]
mix = np.tanh(mix / max(1e-9, np.abs(mix).max()) * 1.6) / np.tanh(1.6) * .9
fade = int(1.0 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', out, DUR)
