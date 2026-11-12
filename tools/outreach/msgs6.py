# Тексты сообщений для пачки №6: Telegram и почта. python3 -I msgs6.py -> msgs6.json
import json, hashlib, datetime
def h(s): return int(hashlib.md5(s.encode()).hexdigest(), 16)
BASE = "https://eloquent-souffle-c99561.netlify.app/demos/"
plan = json.load(open("plan.json"))

HOOK = {
 "tropa": ["где гость сам выбирает даты и {obj}, а сайт сразу считает стоимость", "с бронью прямо на сайте, где даты, {obj} и цена видны за пару секунд"],
 "par": ["где можно выбрать зал, день и время, а бронь сразу уходит вам в WhatsApp", "с бронью по часам, где к залу можно добавить веник или чан"],
 "volna": ["где {obj} бронируют на нужную дату и время", "с онлайн-бронью, где клиент выбирает, что берёт, и сразу видит цену"],
 "start": ["с расписанием по дням и записью на пробное занятие", "где родители и взрослые сами выбирают группу и записываются на пробное"],
 "glyanec": ["где цена считается от класса машины, а на первом экране шторка «до и после»", "с калькулятором услуг под класс машины и онлайн-записью"],
 "stolyar": ["с калькулятором: клиент двигает размер и материал и сразу видит примерную цену", "где клиент сам собирает проект на чертеже и видит цену"],
 "marshrut": ["где маршрут, дату и число людей выбирают прямо на сайте", "с онлайн-бронью, где маршрут, дата и цена видны сразу"]}
OBJ = {"tropa": {"hotel": "номер", "*": "домик"}, "volna": {"balloon": "полёты", "boat": "прогулки", "kite": "занятия", "kart": "заезды", "*": "прогулки и снаряжение"}}
GREET = ["Добрый день", "Здравствуйте"]
ADMIN = ["Цены, фото и тексты вы меняете сами в админке.", "Цены, фото и описания меняются в админке без программиста."]

def text(p, mail):
    k = h(p["slug"]); th = p["theme"]
    obj = OBJ.get(th, {}).get(p["kind"], OBJ.get(th, {}).get("*", ""))
    hook = HOOK[th][k % 2].format(obj=obj)
    who = p["who"]
    g = (f"Здравствуйте, {who}!" if who else GREET[k % 2] + "!")
    url = BASE + p["slug"] + "/"
    import re
    m = re.search(r"«[^»]+»", p["name"])
    q = m.group(0) if m else "«" + p["name"] + "»"
    body = (f"{g} Меня зовут Трофим, я делаю сайты под ключ для малого бизнеса.\n\n"
            f"Собрал пример сайта для {q}, {hook}:\n{url}\n\n" +
            ("" if "WhatsApp" in hook else f"Заявки приходят вам в WhatsApp{', без комиссий агрегаторов' if th == 'tropa' else ''}. ") + f"{ADMIN[(k >> 3) % 2]} " +
            f"Это только пример, сайт сделаю любой, под ваши задачи и ТЗ.\n\n"
            f"Будет ли интересно?" + ("" if who else " Если сайтом занимается руководитель, перешлите ему, пожалуйста."))
    if mail:
        body += ("\n\nЕсли ссылка не откроется, включите VPN: пример пока лежит на зарубежном хостинге.\n\n"
                 "Трофим, shak.web\nTelegram: @SHAKIROVtrofim\nТелефон: +7 912 223 2081 (удобнее писать, звонок могу пропустить)")
    return body

out = []
# Telegram: 28 сообщений во вторник и среду с 10:00 до 17:00 по Москве, с неровными промежутками
tg = [p for p in plan if p["to"].startswith("tg:")]
slots = []
for day in (27, 28):
    t = datetime.datetime(2026, 10, day, 7, 4, tzinfo=datetime.timezone.utc)
    for n in range(14):
        slots.append(t); t += datetime.timedelta(minutes=27 + (n * 7) % 13)
for p, t in zip(tg, slots):
    out.append({"slug": p["slug"], "name": p["name"], "channel": "tg", "to": p["to"][3:], "text": text(p, False), "ts": int(t.timestamp()), "when": (t + datetime.timedelta(hours=3)).strftime("%d.%m %H:%M")})
for p in plan:
    if p["to"].startswith("em:"):
        out.append({"slug": p["slug"], "name": p["name"], "channel": "email", "to": p["to"][3:], "subject": f"Пример сайта для «{p['name']}»", "text": text(p, True)})
json.dump(out, open("msgs6.json", "w"), ensure_ascii=False, indent=1)
print(len(out), sum(1 for m in out if m["channel"] == "tg"), "tg")
print(out[0]["text"]); print("-----"); print([m for m in out if m["channel"] == "email"][0]["text"])
