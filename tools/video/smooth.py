# Плавная кривая через годовые точки (монотонный кубический сплайн), значения на каждый кадр
import numpy as np, json, re, sys
def pchip(y, n_per):
    y = np.asarray(y, float); n = len(y); x = np.arange(n); h = 1.0
    d = np.diff(y); m = np.zeros(n)
    m[1:-1] = np.where(d[:-1] * d[1:] > 0, 2 / (1 / np.where(d[:-1] == 0, 1e-12, d[:-1]) + 1 / np.where(d[1:] == 0, 1e-12, d[1:])), 0)
    m[0], m[-1] = d[0], d[-1]
    xs = np.linspace(0, n - 1, (n - 1) * n_per + 1); i = np.minimum(xs.astype(int), n - 2); t = xs - i
    h00 = 2 * t**3 - 3 * t**2 + 1; h10 = t**3 - 2 * t**2 + t; h01 = -2 * t**3 + 3 * t**2; h11 = t**3 - t**2
    return np.maximum(0, h00 * y[i] + h10 * m[i] + h01 * y[i + 1] + h11 * m[i + 1])
def smooth_cfg(src, dst, n_per=30):
    C = json.load(open(src)); Y = C["labels"]
    C["values"] = {k: pchip(v, n_per).tolist() for k, v in C["values"].items()}
    C["total"] = pchip(C["total"], n_per).tolist()
    C["labels"] = [Y[min((i + n_per // 2) // n_per, len(Y) - 1)] for i in range((len(Y) - 1) * n_per + 1)]
    C["fps_step"] = 1; json.dump(C, open(dst, "w"), ensure_ascii=False)
if __name__ == "__main__": smooth_cfg(sys.argv[1], sys.argv[2])