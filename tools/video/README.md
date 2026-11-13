# Ролики: графики-гонки и анимации

Лежит в репозитории, чтобы не терялось при чистке временной папки.

- `race2.py` гонка столбцов (1080x1920). `python3 -I race2.py cfg.json кадры/`. Рядом нужны `Akt.ttf`, `Finlandica.ttf` (Google Fonts) и `flags/<код>.png` (flagcdn.com/w160).
- `smooth.py` сглаживает годовые точки: `smooth_cfg('cfg.json', 'cfg_s.json', 42)` (42 кадра на год).
- `music.py` своя музыка без чужих треков: `python3 -I music.py out.wav длительность [время_дропа|-] [сид]`.
- `cfg_dr.json` пример: беспилотники по странам 2003-2026 (оценки).
- `cap.cjs` снимает HTML-анимацию по кадрам: `node cap.cjs page.html секунды кадры/`. В странице должна быть функция `window.seek(t)`.
- `test.html` тест из трёх вопросов, `earth.html` история Земли за 24 часа.
- 13.11: `cfg_social.json` соцсети 2004-2025 (гонка без флагов и без строки «всего»: `total: null`), `universe.html` Вселенная за 1 год (календарь Сагана), `test2.html` тест, часть 2 (расширенный тест Топлак 2014).
- Шрифты: raw.githubusercontent.com/google/fonts/main/ofl/akt/Akt%5Bwght%5D.ttf и ofl/finlandica/Finlandica%5Bwght%5D.ttf, сохранить как Akt.ttf и Finlandica.ttf.
- Сборка: `ffmpeg -framerate 30 -i кадры/f%05d.jpg -i m.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -shortest out.mp4`
