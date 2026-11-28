/* Движок сцен: GSAP-таймлайн на паузе, кадр задаётся снаружи через window.seek(t).
   Так каждый кадр рисуется точно в свой момент, без рывков записи экрана. */
(function () {
  const updaters = [];
  window.TL = gsap.timeline({ paused: true });
  // последовательность кадров (живая запись интерфейса) внутри сцены
  window.seq = (img, frames, start, fps = 30) => {
    const cache = frames.map((src) => { const i = new Image(); i.src = src; return i; });
    updaters.push((t) => { const k = Math.max(0, Math.min(frames.length - 1, Math.floor((t - start) * fps))); if (img.dataset.k !== String(k)) { img.src = frames[k]; img.dataset.k = k; } });
    return cache;
  };
  window.onFrame = (fn) => updaters.push(fn);
  window.seek = (t) => { TL.seek(t, false); updaters.forEach((u) => u(t)); };
  // готовность: шрифты и все картинки декодированы
  window.ready = async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); return true; };
  // разбивка текста на буквы в масках для «выезда» снизу
  window.splitChars = (el) => { const t = el.textContent; el.textContent = ''; return [...t].map((ch) => { const m = document.createElement('span'); m.className = 'cm'; const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch === ' ' ? ' ' : ch; m.append(c); el.append(m); return c; }); };
})();
