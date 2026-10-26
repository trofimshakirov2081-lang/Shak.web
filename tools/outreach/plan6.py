# План пачки №6: кто, какая тема, какие позиции и тексты. python3 -I plan6.py -> plan.json
import json, re, hashlib
def h(s): return int(hashlib.md5(s.encode()).hexdigest(), 16)
rows = dict(json.load(open("rows.json")))

# sub: (slug, тема, вид, название, город, имя владельца, номера товаров из ВК или None)
T = {
 # Загородный отдых и гостиницы
 "4sezona-bazaa": ("chetyre-sezona", "tropa", "houses", "Четыре сезона", "Мурадымово", "", [3, 4]),
 "sfera-na-dache": ("sfera-na-dache", "tropa", "houses", "Сфера на даче", "Ленинградская область", "", [2, 3, 0, 1]),
 "semiozerye-community": ("semiozerye", "tropa", "houses", "Семиозерье", "Токсово", "", [0, 1, 2]),
 "country-resort": ("country-resort", "tropa", "hotel", "Кантри Резорт", "Подмосковье", "", None),
 "asia-hotel": ("asia-abakan", "tropa", "hotel", "Отель «Азия»", "Абакан", "", None),
 "superhostel": ("superhostel", "tropa", "hotel", "СуперХостел", "Санкт-Петербург", "", [0, 1, 2]),
 "club71295521": ("protos-anapa", "tropa", "hotel", "Отель «Протос»", "Витязево", "", None),
 "krd-ogonek": ("ogonek-krd", "tropa", "hotel", "Гостиница «Огонёк»", "Краснодар", "", None),
 "himikov10": ("solnechnaya-volzhsky", "tropa", "hotel", "Гостиница «Солнечная»", "Волжский", "", [4, 3, 1, 0]),
 "club119027538": ("albergo-perm", "tropa", "hotel", "ALBERGO", "Пермь", "", None),
 "club216611576": ("baccara-chel", "tropa", "hotel", "Мини-отель «Баккара»", "Челябинск", "", [1, 0, 3, 4]),
 "lipovoe": ("lipovoe", "tropa", "houses", "Липовое", "Тюмень", "", [0, 2, 3]),
 "hotelhours": ("hotel-chasy", "tropa", "hotel", "Отель «Часы»", "Москва", "", None),
 "silverspringshotel": ("serebryanye-rodniki", "tropa", "houses", "Серебряные родники", "Чемал", "", None),
 "orangeblaga": ("oranzhevoe-leto", "tropa", "houses", "Оранжевое лето", "Благовещенская", "", None),
 "sea-b-resort": ("sea-breeze-anapa", "tropa", "hotel", "Sea Breeze Resort", "Анапа", "", [3, 2, 1, 0]),
 "club227791964": ("dom-arhitektora", "tropa", "hotel", "Дом Архитектора", "Кисловодск", "", None),
 "zamokkuchugura": ("krepost-kuchugur", "tropa", "hotel", "Крепость Кучугур", "Кучугуры", "", [0, 1, 2]),
 # Бани
 "grelka-krsk": ("grelka-banya", "par", "bath", "GRELKA", "Красноярск", "", [3, 2, 1]),
 "banyakazannefrit": ("nefrit-kazan", "par", "bath", "Нефрит", "Казань", "", None),
 "urman-kazan": ("urman-kazan", "par", "bath", "Урман", "Казань", "", [3, 2, 1]),
 "zaparilis": ("zaparilis", "par", "bath", "Запарились", "Челябинск", "", None),
 "banyapushka": ("pushka-tula", "par", "bath", "Пушка", "Тульская область", "", None),
 "club225195858": ("banya-karelia", "par", "bath", "Баня в Карелии", "Терваярви", "", None),
 "efbani": ("efimovskie-bani", "par", "bath", "Ефимовские бани", "Дзержинск", "", None),
 "bankarus59": ("russkaya-banka-perm", "par", "bath", "Русская банька", "Пермь", "", None),
 "spaolgino": ("spa-olgino", "par", "bath", "SPA в Ольгино", "Москва", "", [0, 1, 2]),
 "vbanetolkodevochki": ("zhenskaya-banya", "par", "bath", "Мягкая женская баня", "Нижний Новгород", "", None),
 # Прокат и активный отдых
 "go-sup-anapa-prokat": ("sup-anapa", "volna", "sup", "Go SUP Анапа", "Анапа", "Алексей", [3, 2, 1, 0]),
 "supdubna": ("sup-dubna", "volna", "sup", "САП Дубна", "Дубна", "", None),
 "gorodnyatravel": ("gorodnya-kayak", "volna", "kayak", "GorodnyaTravel", "Городня", "", None),
 "tonuskite": ("tonus-kite", "volna", "kite", "Tonus Kite", "Анапа", "Антон", [0, 2, 3, 1]),
 "maestro--aero": ("maestro-aero", "volna", "balloon", "Маэстро", "Владимир", "", [4, 3, 6, 0]),
 "aviantrf": ("aviant-spb", "volna", "boat", "Aviant", "Санкт-Петербург", "", [2, 3, 0, 1]),
 "progulki39": ("na-volne-baltiysk", "volna", "boat", "На Волне", "Балтийск", "", None),
 "icekart": ("zimniy-karting", "volna", "kart", "Зимний картинг", "Ликино-Дулёво", "", None),
 # Спорт, танцы
 "club228504699": ("karakosoff", "start", "coach", "KARAKOSOFF", "Москва", "Дмитрий", None),
 "studio-platforma": ("platforma-dance", "start", "dance", "Платформа", "Санкт-Петербург", "", None),
 "w-academy": ("winners-academy", "start", "martial", "Winners Academy", "Долгопрудный", "", None),
 "school-ski-life": ("ski-life", "start", "ski", "SKI-LIFE", "Санкт-Петербург", "", [4, 3, 0, 1]),
 "club225144233": ("mir-gimnastiki", "start", "gym", "Мир гимнастики", "Самара", "", None),
 "voshodyachaya-zvezda": ("voshodyaschaya-zvezda", "start", "skate", "Восходящая звезда", "Симферополь", "", None),
 "skatenn52": ("skate-nn", "start", "skate", "SKATE NN", "Нижний Новгород", "", None),
 "icekids": ("proice-kids", "start", "skate", "PROice Kids", "Санкт-Петербург", "", None),
 "ksk-rosinant": ("rosinant", "start", "horse", "КСК «Росинант»", "Рязань", "", [3, 1, 2, 0]),
 "vdvizzhenii": ("v-dvizhenii", "start", "dance", "В движении", "Югра", "", None),
 "apriori-dance-club": ("apriori-dance", "start", "dance", "АПРИОРИ", "Москва", "", None),
 "rakassna": ("rakassna", "start", "dance", "Ракассна", "Нижний Новгород", "", None),
 # Детейлинг и автосервис
 "onedesign63": ("one-design", "glyanec", "detail", "One Design", "Самара", "", None),
 "freelancedetailing": ("freelance-detailing", "glyanec", "detail", "Фриланс Детейлинг", "Санкт-Петербург", "", [0, 1, 2]),
 "avtospapiter": ("avtospa-piter", "glyanec", "detail", "АвтоСпа", "Санкт-Петербург", "", [0, 5, 2, 1]),
 "venom-performance": ("venom-performance", "glyanec", "tuning", "Venom Performance", "Москва", "", None),
 "vels52": ("vels-dzerzhinsk", "glyanec", "tires", "Велс", "Дзержинск", "", None),
 # Мебель, бани и дома
 "stulerchan": ("stuler-chan", "stolyar", "chan", "STULER", "Чебоксары", "", None),
 "dachamobi": ("bani-bochki-izhevsk", "stolyar", "baths", "Мобильные бани", "Ижевск", "", None),
 "goodbaths44": ("bani-44", "stolyar", "baths", "Бани 44", "Кострома", "", None),
 "max-bany": ("maxbani", "stolyar", "baths", "МаксБани", "Санкт-Петербург", "", None),
 "srub66": ("srub66", "stolyar", "baths", "Срубы и бани", "Екатеринбург", "", None),
 "kraskrepostru": ("kraskrepost", "stolyar", "houseb", "КрасКрепость", "Красноярск", "", None),
 "krona67": ("krona-smolensk", "stolyar", "houseb", "Крона", "Смоленск", "", None),
 "domavsl": ("vsl-doma", "stolyar", "houseb", "ВСЛ", "Москва", "", None),
 "starkwood-ru": ("starkwood", "stolyar", "houseb", "Starkwood", "Москва", "", None),
 "rudskru": ("dsk-spb", "stolyar", "houseb", "DSK", "Санкт-Петербург", "", None),
 "tvoidommosk": ("tvoy-dom", "stolyar", "houseb", "Твой дом", "Москва", "", None),
 "club161500754": ("novgorodskaya-izba", "stolyar", "houseb", "Новгородская Изба", "Пестово", "", None),
 "v-tveri-mebel-na-zakaz": ("profmastermebel", "stolyar", "furniture", "ПрофМастерМебель", "Тверь", "", None),
 "perfekto-mebel": ("perfekto", "stolyar", "furniture", "PERFEKTO", "Барнаул", "", None),
 "mebelasti71": ("asti-tula", "stolyar", "furniture", "ASTI", "Тула", "", None),
 "premier--mebel": ("premier-mebel", "stolyar", "furniture", "Премьер Мебель", "Елабуга", "", None),
 "83falcon": ("falcon-fasady", "stolyar", "furniture", "ФАЛЬКОН", "Челябинск", "", None),
 "simbirskmebel": ("simbirsk-mebel", "stolyar", "furniture", "Симбирская мебельная компания", "Ульяновск", "", None),
 "eskiz-mebelnyy-salon": ("eskiz-vladimir", "stolyar", "furniture", "Эскиз", "Владимир", "", None),
 "alisamebel": ("kirov-mebel", "stolyar", "furniture", "Киров Мебель", "Киров", "", None),
 # Туры и экскурсии
 "alyatravel-abkhazia": ("alya-travel", "marshrut", "tour", "АляTravel", "Абхазия", "Аля", None),
 "severodvinskguide": ("gid-severodvinsk", "marshrut", "tour", "Гид по Северодвинску", "Северодвинск", "Татьяна", None),
 "bsl--travel--club": ("bsl-travel", "marshrut", "tour", "БСЛ Тревел", "Москва", "Евгения", [2, 3, 1, 4]),
 "yetifreeride": ("yeti-freeride", "marshrut", "tour", "Йети Фрирайд", "Шерегеш", "Вера", None),
 "carours": ("turtime-altai", "marshrut", "tour", "ТурТайм", "Новосибирск", "Анна", [0, 1, 2, 3]),
 "irkutsk-excursions": ("gid-irkutsk", "marshrut", "tour", "Походим по Иркутску", "Иркутск", "Антонина", None),
 "yakubson-guide": ("yakubson", "marshrut", "tour", "Проводник в неизвестное", "Самара", "Пётр", [0, 1, 2, 3]),
 "tururalmountains": ("ekspedicii-urala", "marshrut", "tour", "Экспедиции Урала", "Екатеринбург", "Дмитрий", None),
 "dagestandreams": ("dagestan-dreams", "marshrut", "tour", "Dagestan Dreams", "Дагестан", "Назим", None),
 "dagestan-trips": ("dagstones", "marshrut", "tour", "DagStones Tour", "Дагестан", "", None),
 "ekskursiyaessentuki": ("kmv-ekskursii", "marshrut", "tour", "Экскурсии КМВ", "Ессентуки", "", [0, 6, 1, 3]),
 "v-svobody": ("veter-svobody", "marshrut", "tour", "Ветер Свободы", "Москва", "", None),
 "baikalvariant": ("baikal-asia", "marshrut", "tour", "Байкал Азия Туристик", "Иркутск", "", None),
 "club212862638": ("shoria", "marshrut", "tour", "Турклуб Шория", "Томск", "", None),
 "kunashir-travel": ("kunashir-travel", "marshrut", "tour", "Kunashir Travel", "Кунашир", "", [0, 1, 3, 6]),
 "duhaltay": ("dusha-altaya", "marshrut", "tour", "Душа Алтая", "Алтай", "", [0, 1, 2, 5]),
 "club223655694": ("agava-tour", "marshrut", "tour", "Агава Тур", "Москва", "", None),
}
# Позиции для тех, у кого нет подходящих товаров, но вид бизнеса ясен из описания
ITEMS = {
 "banya-karelia": [("Пар для двух женщин", "Бережное парение", 8000), ("Пар для пар", "Индивидуальная программа", 20000), ("Групповая баня по-чёрному", "До 8 человек", 6500)],
 "gorodnya-kayak": [("Сплав выходного дня", "2 дня, Тверца, с инструктором", 6500), ("Каяк на день", "Весло, жилет, гермомешок", 1500), ("Прогулка по Волге", "3 часа, для новичков", 2500)],
 "alya-travel": [("Долина 7 озёр", "Целый день, джип и гид", 4000), ("Восточная Абхазия", "Целый день, водопады и пещеры", 4000), ("Рица и Гегский водопад", "Классика, 1 день", 3500)],
 "gid-severodvinsk": [("Обзорная по Северодвинску", "2 часа, пешком", 1500), ("Ягры и Белое море", "3 часа, берег и маяк", 2500), ("Корабельная история", "2 часа, верфи и музеи", 1800)],
 "yeti-freeride": [("Фрирайд на ратраке", "1 день, гиды и обед", 16000), ("Тур выходного дня", "2 дня, база в лесу", 32000), ("Обучение пухляку", "Для уверенных райдеров", 9000)],
 "gid-irkutsk": [("Обзорная по центру", "2 часа, пешком", 1000), ("130-й квартал вечером", "1,5 часа, огни города", 900), ("Деревянный Иркутск", "2 часа, резные дома", 1200)],
 "ekspedicii-urala": [("Заброска пеших групп", "На вездеходе или снегоходе", 15000), ("Сопровождение снегоходов", "Гид и маршрут", 12000), ("Плато Маньпупунёр", "Экспедиция, 7 дней", 95000)],
 "dagestan-dreams": [("Нетипичный Дагестан", "4 дня, горы и аулы", 45000), ("Сулакский каньон", "1 день из Махачкалы", 4500), ("Гуниб и Салтинский водопад", "1 день", 5000)],
 "dagstones": [("Сулакский каньон", "Катер и смотровые", 4500), ("Аул-призрак Гамсутль", "Целый день, джип", 5500), ("Дербент", "Древний город и крепость", 3500)],
 "veter-svobody": [("Восхождение на Эльбрус", "8 дней, с гидами", 98000), ("Поход по Карелии", "6 дней, байдарки", 32000), ("Хибины выходного дня", "3 дня", 21000)],
 "baikal-asia": [("Рыбалка на Малом море", "2 дня, лодка и уха", 36000), ("Иркутские окна", "Городской тур, 3 часа", 1800), ("Ольхон", "3 дня, мыс Хобой", 28000)],
 "shoria": [("Зимние Поднебесные", "4 дня, снегоступы", 34000), ("Шерегеш без лыж", "2 дня, гора Зелёная", 18000), ("Летняя Шория", "5 дней, водопады", 39000)],
 "agava-tour": [("Камчатка: вулканы", "8 дней, вертолёт по желанию", 189000), ("Сахалин и маяки", "6 дней", 99000), ("Курилы: Итуруп", "7 дней", 149000)],
 "karakosoff": [("Разовая тренировка", "Знакомство и тест", 2000), ("Месяц с тренером", "План и разборы", 8000), ("Лыжероллеры", "Техника с нуля", 2500), ("Подготовка к старту", "8 недель к цели", 20000)],
 "platforma-dance": [("High Heels", "Пробное занятие", 500), ("Акробатика", "Пробное занятие", 500), ("Танцы 18+", "Разовое занятие", 900), ("Первый абонемент", "8 занятий", 2720)],
 "winners-academy": [("Дзюдо, дети 4-6 лет", "Игровая форма", 4500), ("Самбо, 7-12 лет", "Техника и соревнования", 5000), ("Взрослые", "Самбо с нуля", 5500)],
 "zimniy-karting": [("Заезд 10 минут", "Карт на шипах", 1500), ("Заезд для двоих", "Два карта, 10 минут", 2800), ("Детский карт", "6-12 лет, 7 минут", 900), ("Гонка компанией", "До 8 человек, 30 минут", 9000)],
}
CITY_IN = {"Москва": "Москве", "Санкт-Петербург": "Петербурге", "Казань": "Казани", "Анапа": "Анапе", "Красноярск": "Красноярске", "Челябинск": "Челябинске", "Пермь": "Перми",
           "Самара": "Самаре", "Иркутск": "Иркутске", "Тула": "Туле", "Тверь": "Твери", "Барнаул": "Барнауле", "Киров": "Кирове", "Владимир": "Владимире", "Краснодар": "Краснодаре",
           "Абакан": "Абакане", "Дзержинск": "Дзержинске", "Нижний Новгород": "Нижнем Новгороде", "Кисловодск": "Кисловодске", "Ульяновск": "Ульяновске", "Смоленск": "Смоленске",
           "Ижевск": "Ижевске", "Кострома": "Костроме", "Екатеринбург": "Екатеринбурге", "Чебоксары": "Чебоксарах", "Тюмень": "Тюмени", "Дубна": "Дубне", "Симферополь": "Симферополе",
           "Рязань": "Рязани", "Новосибирск": "Новосибирске", "Волжский": "Волжском", "Елабуга": "Елабуге", "Ессентуки": "Ессентуках", "Томск": "Томске", "Долгопрудный": "Долгопрудном",
           "Балтийск": "Балтийске", "Северодвинск": "Северодвинске", "Пестово": "Пестове"}
def cin(c): return "в " + CITY_IN[c] if c in CITY_IN else ""
def pick(k, a): return a[k % len(a)]

def texts(theme, kind, name, city, who, k):
    w = cin(city)
    if theme == "tropa":
        hotel = kind == "hotel"
        title = pick(k, ["Номер на ваши даты за минуту", "Остановиться с комфортом", "Уютные номера и честные цены"] if hotel else ["Выходные, после которых не хочется обратно", "Отдых за городом без лишних звонков", "Тишина, лес и тёплый дом"])
        text = f"Выберите даты и {'номер' if hotel else 'домик'}: сайт сразу посчитает цену, а заявка придёт администратору в WhatsApp."
        about = (f"{name} {w}: чистые номера, понятные цены и бронь без звонков." if hotel else f"{name}: место, где можно выдохнуть. Домики, баня и природа рядом, а бронь занимает минуту.").replace("  ", " ")
        ex = {"houseLabel": "Номер" if hotel else "Домик", "weekend": 0 if hotel else 15, "ticketNote": "Бронь подтвердим в течение часа." if hotel else "Оплата при заезде, бронь подтвердим в течение часа."}
        sec = {"catalogTitle": "Номера" if hotel else "Домики", "catalogText": "Цена за ночь." if hotel else "Цена за ночь для всего домика, в пятницу и субботу чуть выше.", "aboutTitle": "О нас"}
        tag = "Гостиница" if hotel else "Загородный отдых"
    elif theme == "par":
        title = pick(k, ["Настоящий пар без очереди", "Баня на дровах для вашей компании", "Парная, купель и тишина"])
        text = "Выберите зал, день и время: сайт посчитает цену и отправит бронь в WhatsApp."
        about = f"{name}: баня, в которую хочется возвращаться. Топим заранее, встречаем и всё объясняем."
        ex, sec, tag = {}, {"catalogTitle": "Залы и цены", "catalogText": "Цена за час, минимум 2 часа.", "aboutTitle": "О бане"}, "Баня"
    elif theme == "volna":
        T2 = {"sup": ("Берите доску, остальное у нас", "Сапы и прогулки"), "kayak": ("Река, каяк и никакой спешки", "Сплавы на каяках"), "kite": ("Встать на доску за один сезон", "Кайт-школа"),
              "balloon": ("Город с высоты воздушного шара", "Полёты на шаре"), "boat": ("Вода, ветер и свой капитан", "Прогулки на воде"), "kart": ("Скорость на льду", "Картинг")}[kind]
        title, tag = T2
        text = "Выберите, что берёте, дату и время. Сайт посчитает цену, бронь придёт нам в WhatsApp."
        about = f"{name}: всё готово к вашему приезду, инструктаж короткий и понятный." + (f" Встречает {who}." if who else "")
        ex = {"dayFactor": 4} if kind in ("sup", "kayak") else {"dayFactor": 1, "hourLabel": "Цена", "dayLabel": "Компанией", "steps": [["Бронируете здесь", "Выберите и отправьте заявку."], ["Подтверждаем", "Созваниваемся и уточняем детали."], ["Встречаемся", "Всё готово к вашему приезду."]]}
        if kind not in ("sup", "kayak"): ex["dayFactor"] = 1
        sec = {"catalogTitle": {"sup": "Что можно взять", "kayak": "Что можно взять", "kite": "Обучение", "balloon": "Полёты", "boat": "Прогулки", "kart": "Заезды"}[kind], "catalogText": "Цены за час, на весь день дешевле." if kind in ("sup", "kayak") else "Цены указаны за услугу.", "aboutTitle": "О нас"}
    elif theme == "start":
        T3 = {"coach": "Тренировки, после которых видно результат", "dance": "Первое занятие уже в эту неделю", "martial": "Сильные дети и уверенные взрослые", "ski": "На склон уверенно с первого сезона",
              "gym": "Гибкость и смелость с трёх лет", "skate": "На лёд с первого занятия", "horse": "Верховая езда для всех"}
        title = T3[kind]; tag = {"coach": "Персональный тренер", "dance": "Школа танцев", "martial": "Спортивный клуб", "ski": "Горнолыжная школа", "gym": "Школа гимнастики", "skate": "Фигурное катание", "horse": "Конный клуб"}[kind]
        text = "Выберите группу в расписании и запишитесь на пробное занятие, заявка придёт в WhatsApp."
        about = (f"Меня зовут {who}, я тренер." if who else f"{name}:") + " Понятная программа, внимание к каждому и результат, который видно."
        ex, sec = {"trialTitle": "Пробное занятие"}, {"catalogTitle": "Абонементы и цены", "catalogText": "Первое занятие можно попробовать.", "aboutTitle": "О нас" if not who else "Обо мне"}
    elif theme == "glyanec":
        title = {"detail": pick(k, ["Машина, как из салона", "Блеск, который держится годами"]), "tuning": "Ваша машина, только лучше", "tires": "Колёса без очереди"}[kind]
        tag = {"detail": "Детейлинг", "tuning": "Тюнинг и сервис", "tires": "Шинный центр"}[kind]
        text = "Выберите класс машины и услуги: цена посчитается сразу, а запись уйдёт нам в WhatsApp."
        about = f"{name}: работаем аккуратно, показываем результат до и после."
        ex, sec = {}, {"catalogTitle": "Услуги и цены", "catalogText": "Цены для седана, для других классов переключите выше.", "aboutTitle": "О нас"}
    elif theme == "stolyar":
        house = kind in ("baths", "houseb", "chan")
        title = {"furniture": pick(k, ["Мебель по размеру вашего дома", "Кухня, сделанная под вас"]), "baths": "Своя баня под ключ", "houseb": "Дом, который строят под вас", "chan": "Свой чан на участке"}[kind]
        tag = {"furniture": "Мебель на заказ", "baths": "Бани под ключ", "houseb": "Строительство домов", "chan": "Банные чаны"}[kind]
        text = "Соберите проект на сайте: размер, материал и примерная цена сразу. Заявка придёт нам в WhatsApp."
        about = f"{name}: своё производство и свои мастера. Делаем сами от замера до сдачи."
        ex = {"drawing": "house"} if house else {}
        if kind == "chan": ex = {"drawing": "house", "unit": "чел.", "min": 2, "max": 10, "def": 6, "materials": [["Сталь", 1, "linear-gradient(135deg,#9AA3AB,#5E666E)"], ["Нержавейка", 1.4, "linear-gradient(135deg,#D9DEE2,#9FA8AF)"], ["Медь", 2, "linear-gradient(135deg,#D9925E,#9C5A2E)"]], "calcTitle": "Соберите свой чан", "dimW": "Ø 2 000 мм"}
        sec = {"catalogTitle": "Что строим" if house else "Что делаем", "catalogText": "Цены «от», точную скажем после замера.", "aboutTitle": "О нас"}
    else:
        title = pick(k, ["Маршруты, которые сами не найдёте", "Путешествие, которое запомнится", "Покажем то, чего нет в путеводителях"])
        tag = "Туры и экскурсии"
        text = "Выберите маршрут, дату и сколько вас: цена посчитается сразу, бронь придёт в WhatsApp."
        about = (f"Меня зовут {who}, я сам веду группы и знаю эти места." if who in ("Дмитрий", "Пётр", "Назим") else (f"Меня зовут {who}, я сама веду группы и знаю эти места." if who else f"{name}: небольшие группы, опытные гиды и всё организовано.")) + " Без спешки и толп."
        ex, sec = {"startPoint": f"Старт: {city}"}, {"catalogTitle": "Маршруты", "catalogText": "Цена за человека.", "aboutTitle": "О нас"}
    return title, text, about, ex, sec, tag

plan = []
for sub, (slug, theme, kind, name, city, who, prods) in T.items():
    k = h(slug)
    title, text, about, ex, sec, tag = texts(theme, kind, name, city, who, k)
    p = {"sub": sub, "slug": slug, "theme": theme, "kind": kind,
         "name": name, "city": city, "who": who, "to": rows[sub], "tagline": tag, "title": title, "text": text, "about": about, "extra": ex, "sections": sec, "prods": prods}
    if slug in ITEMS: p["items"] = ITEMS[slug]
    plan.append(p)
json.dump(plan, open("plan.json", "w"), ensure_ascii=False, indent=1)
print(len(plan), sum(1 for p in plan if p["to"].startswith("tg")), "tg")
