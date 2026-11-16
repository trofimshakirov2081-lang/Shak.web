# Свой энергичный трек 128 BPM без чужой музыки: python3 -I music.py out.wav длительность [время_дропа] [сид]
import sys, numpy as np, wave
SR = 44100
out, DUR = sys.argv[1], float(sys.argv[2])
DROP = float(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] != "-" else None
rng = np.random.default_rng(int(sys.argv[4]) if len(sys.argv) > 4 else 7)
BPM = 128; B = 60 / BPM; L = int(DUR * SR)
mix = np.zeros((L, 2))

def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= L or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    e = min(L, i + len(x)); x = x[: e - i] * g
    mix[i:e, 0] += x * (1 - pan) ; mix[i:e, 1] += x * (1 + pan)

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)
def lp(x, cut):  # однополюсный фильтр
    a = np.exp(-2 * np.pi * cut / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def saw(f, n, det=(0,)):
    t = np.arange(n) / SR
    return sum(2 * ((t * f * (1 + d)) % 1) - 1 for d in det) / len(det)

kick = (lambda n: np.sin(2 * np.pi * np.cumsum(np.geomspace(160, 45, n)) / SR) * env(n, 0.001, 0.18))(int(0.35 * SR))
noise = lambda n: rng.standard_normal(n)
clap = np.convolve(noise(int(0.2 * SR)) * env(int(0.2 * SR), 0.001, 0.06), [1, -1], "same") * 0.5
hat = np.diff(noise(int(0.06 * SR) + 1)) * env(int(0.06 * SR), 0.001, 0.015) * 0.35
ohat = np.diff(noise(int(0.25 * SR) + 1)) * env(int(0.25 * SR), 0.001, 0.08) * 0.25

# Am - F - C - G, корни для баса и аккорды
PROG = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
bar = 4 * B
nbars = int(DUR / bar) + 1
intro = 2 * bar if DROP is None else max(2 * bar, DROP - 4 * bar)
drop = intro if DROP is None else DROP
chord_cache = {}
for b in range(nbars):
    t0 = b * bar; root, ch = PROG[b % 4]
    energy = 0.55 if t0 < drop else 1.0                 # до дропа тише и без бочки на каждой доле
    building = DROP is not None and drop - 2 * bar <= t0 < drop
    for k in range(4):
        tb = t0 + k * B
        if t0 >= drop or (t0 >= intro and k % 2 == 0): put(kick, tb, 0.9 * energy)
        if k % 2 == 1 and t0 >= intro: put(clap, tb, 0.45 * energy, 0.1)
        for s in range(4 if t0 >= drop else 2):
            put(hat, tb + s * B / (4 if t0 >= drop else 2), 0.5 * energy, -0.3 + 0.2 * s)
        put(ohat, tb + B / 2, 0.5 * energy, 0.3)
        # бас восьмыми с качанием от бочки
        for e in range(2):
            n = int(B / 2 * SR); f = mf(root - 12)
            x = lp(saw(f, n, (0, 0.004)), 900 if t0 >= drop else 500) * env(n, 0.004, 0.18)
            put(x, tb + e * B / 2, 0.5 * energy)
    # аккорды: пад с «дыханием» от бочки
    key = (root, t0 >= drop)
    if key not in chord_cache:
        n = int(bar * SR)
        pad = sum(saw(mf(m), n, (-0.006, 0, 0.007)) for m in ch) / 3
        pad = lp(pad, 2600 if t0 >= drop else 1200)
        pump = np.tile(np.minimum(1, (np.arange(int(B * SR)) / SR) / (B * 0.6)) ** 1.5, 5)[:n]
        chord_cache[key] = pad * (0.35 + 0.65 * pump) * np.minimum(1, np.arange(n) / (0.01 * SR))
    put(chord_cache[key], t0, 0.22 * energy, 0.0)
    # арпеджио шестнадцатыми после дропа
    if t0 >= drop or building:
        for s in range(16):
            m = ch[[0, 1, 2, 1, 0, 2, 1, 2][s % 8]] + (12 if s % 4 == 3 else 0)
            n = int(B / 4 * SR); x = lp(saw(mf(m), n, (0, 0.003)), 4200) * env(n, 0.002, 0.07)
            put(x, t0 + s * B / 4, 0.13, 0.4 if s % 2 else -0.4)
    if building:  # подъём перед дропом: шум растёт, дробь по малому
        n = int(bar * SR); r = noise(n) * np.linspace(0, 1, n) ** 2
        put(np.diff(np.append(r, 0)) * 0.12, t0, 1.0)
        for s in range(16 if t0 >= drop - bar else 8):
            put(clap * 0.6, t0 + s * bar / (16 if t0 >= drop - bar else 8), 0.35 + 0.4 * s / 16)
if DROP is not None:  # удар на дропе
    n = int(1.5 * SR); boom = np.sin(2 * np.pi * np.cumsum(np.geomspace(120, 30, n)) / SR) * env(n, 0.001, 0.6)
    put(boom, DROP, 0.9); put(noise(int(0.8 * SR)) * env(int(0.8 * SR), 0.001, 0.25) * 0.15, DROP, 1.0)

# простая реверберация и сведение
ir = noise(int(1.2 * SR)) * np.exp(-np.arange(int(1.2 * SR)) / SR / 0.35) * 0.02
for c in range(2): mix[:, c] += np.convolve(mix[:, c], ir)[:L] * 0.25
fade = int(1.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
mix = np.tanh(mix * 1.3); mix /= np.abs(mix).max() / 0.89
w = wave.open(out, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes()); w.close()
print("ok", out, DUR)
