# Своя спокойная музыка без чужих треков: мягкое пианино и подклад, 72 удара в минуту, без ударных.
# python3 -I calm.py out.wav длительность [сид]
import sys, wave
import numpy as np
SR = 44100
out, DUR = sys.argv[1], float(sys.argv[2])
rng = np.random.default_rng(int(sys.argv[3]) if len(sys.argv) > 3 else 3)
BPM = 72; B = 60 / BPM; L = int(DUR * SR)
mix = np.zeros((L, 2))
f = lambda m: 440 * 2 ** ((m - 69) / 12)  # нота MIDI в герцы

def put(x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= L: return
    e = min(L, i + len(x)); x = x[: e - i] * g
    mix[i:e, 0] += x * (1 - pan * .6); mix[i:e, 1] += x * (1 + pan * .6)

def lp(x, a):  # мягкий однополюсный фильтр
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y

def piano(m, dur=2.6, vel=0.5):
    n = int(dur * SR); t = np.arange(n) / SR; fr = f(m)
    x = sum((0.6 ** k) * np.sin(2 * np.pi * fr * (k + 1) * t * (1 + 0.0004 * k)) * np.exp(-t * (1.6 + 1.1 * k)) for k in range(6))
    att = np.minimum(1, t / 0.006)
    return x * att * vel

def pad(ms, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for m in ms:
        for d in (-0.08, 0.0, 0.07):  # чуть расстроенные голоса дают «воздух»
            fr = f(m) * 2 ** (d / 12)
            x += np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * 2 * fr * t)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    return x * env / (len(ms) * 3)

# Am - F - C - G, по два такта на аккорд
CH = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [52, 55, 60]), (55, [55, 59, 62])]
bar = 4 * B; t = 0.0; k = 0
while t < DUR:
    root, notes = CH[k % 4]
    put(pad([n + 12 for n in notes], 2 * bar + 0.5), t, 0.10, 0.0)
    put(piano(root - 12, 4.5, 0.32), t, 1.0, -0.2)                 # бас пианино
    arp = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 12]
    for beat in range(8):                                           # неторопливое арпеджио восьмыми через раз
        if beat % 2 == 0 or rng.random() < 0.35:
            m = arp[beat % 4] + (12 if beat in (3, 7) and rng.random() < 0.5 else 0)
            put(piano(m, 2.4, 0.18 + 0.06 * rng.random()), t + beat * B, 1.0, 0.25 if beat % 2 else -0.1)
    t += 2 * bar; k += 1

# лёгкая «комната»: несколько затухающих отражений
rev = np.zeros_like(mix)
for d, g in ((0.031, .28), (0.053, .22), (0.089, .16), (0.137, .11), (0.211, .07)):
    s = int(d * SR); rev[s:] += mix[:-s] * g
mix = mix + rev
mix[:, 0] = lp(mix[:, 0], 0.35); mix[:, 1] = lp(mix[:, 1], 0.35)
fade = int(1.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(.4 * SR)] *= np.linspace(0, 1, int(.4 * SR))[:, None]
mix /= max(1e-9, np.abs(mix).max()) / 0.8
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("ok", out, DUR)
