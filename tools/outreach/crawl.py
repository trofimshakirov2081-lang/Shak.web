import re, subprocess, json, sys, os, time, random
sys.path.insert(0, '../tools'); from parse import parse
N = {"otdyh": ["turbazy-i-bazy-otdyha", "mesto-otdyha", "dom-otdyha", "gostinicy-i-oteli"],
     "banya": ["banya-sauna"],
     "prokat": ["vodnyy-sport", "letnie-vidy-sporta", "aktivnyy-otdyh", "vodnyy-transport"],
     "sport": ["sportivnye-sekcii-shkoly-i-kluby", "zimnie-vidy-sporta"],
     "detailing": ["avtomoyki-i-avtohimchistki", "uslugi-avtovladelcam", "uslugi-dlya-avtovladelcev"],
     "masterskaya": ["predmety-mebeli", "mebel-dlya-doma", "zhilishchnoe-i-dachnoe-stroitelstvo"],
     "tury": ["tury-ekskursii", "ekologicheskiy-turizm"],
     "otdyh2": ["sanatoriy-dom-otdyha", "park-otdyha", "detskiy-otdyh", "ohota-i-rybalka"],
     "partner": ["internet-reklama", "foto-i-videosemka", "fotograf"],
     "sport2": ["tancevalnaya-shkola", "tvorcheskie-shkoly-i-studii", "avtomotoshkoly"]}
def get(u):
    for _ in range(3):
        r = subprocess.run(["curl", "-s", "-m", "30", "-A", "Mozilla/5.0", u], capture_output=True, text=True, errors="ignore")
        if r.stdout: return r.stdout
        time.sleep(2)
    return ""
os.makedirs("pg", exist_ok=True)
ONLY=sys.argv[1]; OF=f"leads_{ONLY}.json"
out = json.load(open(OF)) if os.path.exists(OF) else {}
for niche, rubs in N.items():
    if niche != ONLY: continue
    subs = []
    for rb in rubs:
        for pg in range(int(os.environ.get("P0","0")), int(os.environ.get("P1","4"))):
            h = get(f"https://orgs.biz/razdel/{rb}" + (f"?page={pg}" if pg else ""))
            for m in re.finditer(r'href="https://([a-z0-9_-]+)\.orgs\.biz" class="site-title"', h):
                if m.group(1) not in subs: subs.append(m.group(1))
            time.sleep(0.4)
    random.Random(7).shuffle(subs)
    got = sum(1 for v in out.values() if v["niche"] == niche); tried = 0
    for s in subs:
        if got >= int(os.environ.get("CAP","40")) or tried >= 1500: break
        if s in out: continue
        f = f"pg/{s}.html"
        if os.path.exists(f): h = open(f, errors="ignore").read()
        else:
            h = get(f"https://{s}.orgs.biz/"); tried += 1; time.sleep(0.3)
            open(f, "w").write(h)
        if not h: continue
        em = [e.lower().strip(".") for e in re.findall(r"[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]*[a-zA-Z]", h)]
        em = [e for e in dict.fromkeys(em) if not re.search(r"orgs\.biz|sentry|example|\.(png|jpg|gif|webp)$|wixpress|vk\.com", e)]
        r = parse(s, h)
        if not (em or r["tg"]): continue
        r.update(niche=niche, emails=em); out[s] = r; got += 1
        json.dump(out, open(OF, "w"), ensure_ascii=False, indent=0)
    print(niche, len(subs), "tried", tried, "leads", got, flush=True)
