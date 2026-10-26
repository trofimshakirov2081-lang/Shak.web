# Пачка №6: демо для новых ниш (отдых, бани, прокат, спорт, детейлинг, мастерские, туры).
# python3 -I batch6.py plan.json  -> конфиги в demos/_configs/<slug>.json и msgs6.json
import json, os, sys, re, hashlib, subprocess, glob
from PIL import Image
SP = "/tmp/claude-0/-home-user-Shak-web/d7ce3a09-9713-5c61-b774-955695466eed/scratchpad"
ROOT = "/home/user/Shak.web/demos/_configs"
BASE = "https://eloquent-souffle-c99561.netlify.app/demos/"
PLAN = json.load(open(sys.argv[1]))
LEADS = {}
for f in glob.glob(SP + "/n2/leads_*.json"): LEADS.update(json.load(open(f)))
POOLS = json.load(open(SP + "/n2/pools.json"))

def h(s): return int(hashlib.md5(s.encode()).hexdigest(), 16)
def save_img(src, out, size=(1400, 1400)):
    if src.startswith("http"):
        if not (os.path.exists(out) and os.path.getsize(out) > 3000):
            subprocess.run(["curl", "-sL", "-m", "40", src, "-o", out])
        src = out
    try:
        im = Image.open(src).convert("RGB")
        if im.width < 300: return False
        im.thumbnail(size); im.save(out, "JPEG", quality=82); return True
    except Exception:
        try: os.remove(out)
        except Exception: pass
        return False

# Варианты палитры внутри каждой темы: [main, accent, bg, text], доп. переменные, шрифты
PAL = {
 "tropa": [(["#24352B", "#D9692E", "#F2EFE6", "#1B241E"], {"lake": "#9DB7B5", "paper": "#FBF9F4"}, ["Literata", "Onest"]),
           (["#1E3A4C", "#E0A458", "#EEF1F0", "#14232D"], {"lake": "#A9C4CF", "paper": "#FAFBFA"}, ["Literata", "Onest"]),
           (["#4A3B2A", "#C8553D", "#F4EEE4", "#2A2018"], {"lake": "#D8C3A5", "paper": "#FCF8F2"}, ["Literata", "Onest"])],
 "par": [(["#C8773A", "#7C8B4F", "#1A1614", "#EDE7DF"], {"coal": "#241E1B", "wood": "#33291F"}, ["Dela Gothic One", "Manrope"]),
         (["#D9A35A", "#6FA3A8", "#15191A", "#E8ECEA"], {"coal": "#1F2526", "wood": "#2A3233"}, ["Dela Gothic One", "Manrope"]),
         (["#D46A4C", "#9BA66B", "#1E1717", "#F0E6E0"], {"coal": "#2A2020", "wood": "#382A27"}, ["Dela Gothic One", "Manrope"])],
 "volna": [(["#0A3D62", "#FF6B35", "#F4E9D8", "#0B2234"], {"lagoon": "#2EC4B6", "foam": "#FFFAF2"}, ["Montserrat Alternates", "Commissioner"]),
           (["#0F5257", "#FFB000", "#EAF4F1", "#0C2B2D"], {"lagoon": "#7FD1C7", "foam": "#FBFEFD"}, ["Montserrat Alternates", "Commissioner"]),
           (["#23395B", "#F25F5C", "#F7F3E9", "#141F33"], {"lagoon": "#70C1B3", "foam": "#FFFDF8"}, ["Montserrat Alternates", "Commissioner"])],
 "start": [(["#D7442E", "#2F6B4F", "#F7F5F0", "#15171A"], {"lane": "#E6E0D4"}, ["Sofia Sans Extra Condensed", "Sofia Sans"]),
           (["#2353C9", "#F2B705", "#F3F4F7", "#121826"], {"lane": "#E1E5EE"}, ["Sofia Sans Extra Condensed", "Sofia Sans"]),
           (["#1F7A4D", "#E94F37", "#F4F6F1", "#14201A"], {"lane": "#E2E8DF"}, ["Sofia Sans Extra Condensed", "Sofia Sans"])],
 "glyanec": [(["#E4572E", "#7FB7D9", "#1C1F24", "#E9ECEF"], {"graphite": "#2A2F36"}, ["Inter Tight", "Inter"]),
             (["#C9A227", "#9FB4C7", "#16181C", "#ECECEA"], {"graphite": "#24272D"}, ["Inter Tight", "Inter"]),
             (["#3FA7D6", "#F2C14E", "#1A1D21", "#EEF1F4"], {"graphite": "#272C33"}, ["Inter Tight", "Inter"])],
 "stolyar": [(["#3D5A80", "#B98A5A", "#F2F0EA", "#23262B"], {"sheet": "#FBFAF7"}, ["Spectral", "IBM Plex Sans"]),
             (["#2F5D50", "#C08552", "#EFEDE6", "#1F2622"], {"sheet": "#FAFAF6"}, ["Spectral", "IBM Plex Sans"]),
             (["#7A3E2B", "#D9B38C", "#F3EFE8", "#2A1E19"], {"sheet": "#FCFAF6"}, ["Spectral", "IBM Plex Sans"])],
 "marshrut": [(["#1D3557", "#E76F51", "#F1EDE4", "#14213D"], {"forest": "#2A6F4E", "card": "#FBF9F4"}, ["Piazzolla", "Rubik"]),
              (["#2A6F4E", "#E9A23B", "#EEF0E8", "#17251E"], {"forest": "#1D5A7A", "card": "#FAFBF7"}, ["Piazzolla", "Rubik"]),
              (["#4B2E6F", "#F4A261", "#F3EEE7", "#1E1530"], {"forest": "#2A6F4E", "card": "#FCFAF7"}, ["Piazzolla", "Rubik"])]}
NICHE = {"tropa": "otdyh", "par": "banya", "volna": "prokat", "start": "sport", "glyanec": "detailing", "stolyar": "masterskaya", "marshrut": "tury"}

# Позиции по умолчанию для видов бизнеса: (название, описание, цена, ключ фото в пуле)
DEF = {
 "houses": [("Домик у воды", "До 4 гостей, своя терраса", 6500), ("Семейный коттедж", "До 8 гостей, кухня и мангал", 12000), ("Домик для двоих", "Большое окно и завтрак", 5500)],
 "hotel": [("Стандарт", "2 гостя, завтрак включён", 3500), ("Комфорт", "2-3 гостя, большая кровать", 4500), ("Семейный номер", "До 4 гостей, две комнаты", 6500), ("Люкс", "Гостиная и вид из окна", 8500)],
 "house1": [("Дом целиком", "До 10 гостей, баня и мангал", 15000), ("Дом в будни", "Пн-чт, до 10 гостей", 11000), ("Баня с купелью", "Добавить к брони", 3000)],
 "bath": [("Русская баня на дровах", "До 8 человек, купель", 2000), ("Финская сауна", "До 6 человек", 1700), ("Большой зал", "До 15 человек, бассейн и караоке", 3500)],
 "sup": [("Сап-доска", "Весло, жилет, гермомешок", 600), ("Сап для двоих", "Большая доска до 160 кг", 900), ("Прогулка с инструктором", "2 часа, группа до 8", 1500), ("Фотосессия на сапах", "Час, 30 фото в обработке", 3000)],
 "kayak": [("Каяк одноместный", "Весло и жилет", 500), ("Каяк двухместный", "Для пары или с ребёнком", 800), ("Сплав с инструктором", "Полдня, всё снаряжение", 2500), ("Гермомешок и насос", "Для своего снаряжения", 150)],
 "quad": [("Квадроцикл", "С инструктором, по лесу", 3500), ("Квадроцикл для двоих", "Водитель и пассажир", 4500), ("Детский квадроцикл", "6-12 лет, по площадке", 1500), ("Экипировка", "Шлем, перчатки, дождевик", 300)],
 "kite": [("Пробный урок", "2 часа, всё снаряжение", 6000), ("Курс с нуля", "10 часов до самостоятельного катания", 45000), ("Аренда кайта", "Для тех, кто уже катается", 2500), ("Гидрофойл", "Урок с инструктором", 7000)],
 "boat": [("Прогулка на яхте", "До 6 человек, с капитаном", 6000), ("Закат на воде", "2 часа, плед и чай", 9000), ("Рыбалка с лодки", "Полдня, снасти включены", 12000), ("Аренда с сапами", "Заброска в залив", 15000)],
 "swim": [("Дети 4-6 лет", "Учимся не бояться воды", 4500), ("Дети 7-12 лет", "Все стили плавания", 5000), ("Взрослые с нуля", "Группа до 6 человек", 5500), ("Персональное занятие", "45 минут с тренером", 2000)],
 "gym": [("Малыши 3-5 лет", "Гибкость и координация", 4000), ("Дети 6-9 лет", "Акробатика и растяжка", 4500), ("Спортивная группа", "Подготовка к соревнованиям", 6000), ("Взрослые", "Гибкость с нуля", 4500)],
 "skate": [("Дети с 3 лет", "Первые шаги на льду", 5000), ("Начальная подготовка", "6-10 лет", 6000), ("Взрослые с нуля", "Вечерние группы", 5500), ("Индивидуально", "Занятие с тренером", 2500)],
 "ski": [("Разовая тренировка", "С тренером", 2000), ("Группа для взрослых", "2 раза в неделю", 4500), ("Детская группа", "8-14 лет", 4000), ("Персонально", "Техника и план", 2500)],
 "hockey": [("Дети 4-6 лет", "Катание и основы", 6000), ("Дети 7-12 лет", "Техника и игра", 7000), ("Взрослые любители", "Вечерний лёд", 6500), ("Индивидуально", "Броски и катание", 3000)],
 "coach": [("Разовая тренировка", "Знакомство и план", 2000), ("Месяц с тренером", "План, разбор и связь", 6000), ("Подготовка к старту", "8 недель к цели", 15000), ("Разбор техники", "Видео и рекомендации", 2500)],
 "billiard": [("Обучение с нуля", "8 занятий с тренером", 8000), ("Разовое занятие", "Час с тренером", 1500), ("Бронь стола", "Русский или пул, час", 600), ("Детская группа", "10-15 лет", 4000)],
 "detail": [("Полировка кузова", "Двухэтапная", 14000), ("Керамика", "2 слоя, гарантия год", 28000), ("Химчистка салона", "Полная, с потолком", 9000), ("Защитная плёнка", "Зоны риска", 35000), ("Детейлинг-мойка", "Ручная, двухфазная", 2500)],
 "tuning": [("Шумоизоляция", "Двери и арки", 18000), ("Автозвук", "Под ключ, с настройкой", 25000), ("Свет и линзы", "Замена и регулировка", 12000), ("Оклейка плёнкой", "Цвет или защита", 60000)],
 "tires": [("Шиномонтаж", "4 колеса, R13-R17", 2400), ("Балансировка", "4 колеса", 1200), ("Хранение шин", "Сезон", 3000), ("Правка дисков", "Литые и штампы", 1500)],
 "furniture": [("Кухня", "Под потолок, фурнитура Blum", 28000), ("Шкаф-купе", "Зеркало или ЛДСП", 19000), ("Гардеробная", "Открытые системы", 16000), ("Прихожая", "С банкеткой и зеркалом", 15000)],
 "baths": [("Баня из бруса", "Под ключ, с печью", 32000), ("Баня-бочка", "Готовая, с доставкой", 18000), ("Дом из бруса", "Коробка под крышу", 28000), ("Беседка", "С мангальной зоной", 15000)],
 "houseb": [("Дом из бруса", "Коробка под крышу", 28000), ("Дом под ключ", "С инженерией и отделкой", 55000), ("Баня", "Под ключ, с печью", 32000), ("Каркасный дом", "Тёплый контур", 24000)],
 "tour": [("Тур выходного дня", "2 дня, транспорт и гид", 15000), ("Однодневная экскурсия", "Целый день, обед включён", 4500), ("Авторский тур", "5 дней, малая группа", 45000)],
 "dance": [("Пробное занятие", "Любое направление", 500), ("Абонемент на месяц", "8 занятий", 4000), ("Детская группа", "С 5 лет", 3500), ("Индивидуально", "Постановка танца", 2000)],
 "martial": [("Дети 4-6 лет", "Игровая форма", 4500), ("Дети 7-12 лет", "Техника и соревнования", 5000), ("Взрослые", "С нуля", 5500)],
 "horse": [("Обучение верховой езде", "Занятие с тренером", 1500), ("Конная прогулка", "Час по лесу", 2500), ("Фотосессия с лошадью", "Час, фото в обработке", 3500), ("Детский клуб", "Уход и езда", 6000)],
 "balloon": [("Групповой полёт", "Час в небе, взрослые", 9000), ("Полёт для двоих", "Индивидуально", 27000), ("Предложение руки и сердца", "Полёт с сюрпризом", 35000)],
 "kart": [("Заезд 10 минут", "Карт на шипах", 1500), ("Заезд для двоих", "10 минут", 2800), ("Детский карт", "6-12 лет", 900)],
 "chan": [("Банный чан", "На 4-6 человек, печь внутри", 9000), ("Чан с гидромассажем", "На 6-8 человек", 12000), ("Купель", "Для холодной воды", 6000)],
}
POOLKEY = {"houses": "otdyh", "hotel": "hotel", "house1": "otdyh", "bath": "banya", "sup": "sup", "kayak": "kayak", "quad": "quad", "kite": "kite", "boat": "boat",
           "swim": "swim", "gym": "gym", "skate": "skate", "ski": "ski", "hockey": "skate", "coach": "run", "billiard": "billiard", "detail": "detailing", "tuning": "detailing", "tires": "detailing",
           "furniture": "furniture", "baths": "houses", "houseb": "houses", "chan": "banya", "tour": "tury", "dance": "dance", "martial": "martial", "horse": "horse", "balloon": "balloon", "kart": "quad"}

def from_pool(key, k):
    L = POOLS.get(key) or POOLS.get("otdyh")
    return L[k % len(L)]

def build(p):
    slug, theme, kind = p["slug"], p["theme"], p["kind"]
    g = LEADS[p["sub"]]
    fdir = f"{ROOT}/files/{slug}"; os.makedirs(fdir, exist_ok=True)
    k = h(slug)
    items, own = [], 0
    if p.get("prods"):
        prods = g["products"]
        for n, ix in enumerate(p["prods"]):
            if ix >= len(prods): continue
            pr = prods[ix]; out = f"{fdir}/item-{len(items) + 1}.jpg"
            nm = re.sub(r"\s+", " ", pr["name"]).strip().strip('"«»')
            nm = nm[:44].rsplit(" ", 1)[0] if len(nm) > 46 else nm
            ok = bool(pr["img"]) and save_img(pr["img"], out, (1000, 1000))
            if ok: own += 1
            elif theme != "start": ok = save_img(from_pool(POOLKEY[kind], k + n * 3), out, (1000, 1000))
            d = re.sub(r"\s+", " ", pr.get("desc") or "").strip()
            d = (d[:58].rsplit(" ", 1)[0] + "…") if len(d) > 60 else d
            items.append({"name": nm, "price": int(pr["price"]), "desc": d, "photo": f"files/{slug}/item-{len(items) + 1}.jpg" if ok else "", "tag": ""})
    if not items:
        for n, (nm, d, pr) in enumerate(p.get("items") or DEF[kind]):
            out = f"{fdir}/item-{n + 1}.jpg"
            ok = theme != "start" and save_img(from_pool(POOLKEY[kind], k + n * 3), out, (1000, 1000))
            items.append({"name": nm, "price": pr, "desc": d, "photo": f"files/{slug}/item-{n + 1}.jpg" if ok else "", "tag": ""})
    if items: items[0]["tag"] = p.get("hit", "Хит")
    hero = f"files/{slug}/hero.jpg"
    if own >= 2 and not p.get("hero"): p["hero"] = f"{fdir}/item-{p.get('hero_item', 1)}.jpg"
    if not save_img(p.get("hero") or from_pool(POOLKEY[kind] + "_hero" if POOLKEY[kind] + "_hero" in POOLS else POOLKEY[kind], k // 7), f"{ROOT}/{hero}"): hero = ""
    pal, vars_, fonts = PAL[theme][k % len(PAL[theme])]
    phone = (g["phones"] + [""])[0]; d = "".join(ch for ch in phone if ch.isdigit())
    if d.startswith("8") and len(d) == 11: d = "7" + d[1:]
    pretty = f"+7 {d[1:4]} {d[4:7]}-{d[7:9]}-{d[9:]}" if len(d) == 11 else phone
    extra = dict(p.get("extra", {})); extra["vars"] = vars_
    cfg = {"slug": slug, "name": p["name"], "niche": NICHE[theme], "city": p["city"], "custom": theme, "tagline": p["tagline"],
           "colors": {"main": pal[0], "accent": pal[1], "bg": pal[2], "text": pal[3]}, "fonts": {"head": fonts[0], "body": fonts[1]},
           "hero": {"title": p["title"], "text": p["text"], "cta": p.get("cta", ""), "photo": hero},
           "sections": p.get("sections", {}), "about": p["about"], "items": items,
           "contacts": {"phone": pretty, "whatsapp": d, "address": p.get("addr", ""), "hours": p.get("hours", "")}, "extra": extra,
           "credits": ("Фото со страницы бизнеса, " if own else "") + "остальные фото: свободные стоки, для примера",
           "source": f"https://{p['sub']}.orgs.biz/", "contact_lead": p["to"]}
    if p.get("features"): cfg["features"] = [{"icon": i, "title": t, "text": x} for i, t, x in p["features"]]
    if p.get("currency"): cfg["currency"] = p["currency"]
    cfg["sections"] = {k2: v for k2, v in cfg["sections"].items() if v}
    if not cfg["hero"]["cta"]: del cfg["hero"]["cta"]
    json.dump(cfg, open(f"{ROOT}/{slug}.json", "w"), ensure_ascii=False, indent=2)
    print("✔", slug, theme, kind, len(items), "поз.", "своих фото", own, pretty, p["to"], flush=True)

only = sys.argv[2:]
for p in PLAN:
    if only and p["slug"] not in only: continue
    build(p)
