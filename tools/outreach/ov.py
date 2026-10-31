import json, sys, os, subprocess, urllib.parse
from PIL import Image, ImageDraw
Q = json.load(open(sys.argv[1]))
os.makedirs("img", exist_ok=True)
meta = json.load(open("meta.json")) if os.path.exists("meta.json") else {}
for niche, qs in Q.items():
    got = []
    for q in qs:
        u = "https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "page_size": 20, "license": "cc0,pdm,by,by-sa", "size": "large", "aspect_ratio": "wide,square,tall"})
        r = subprocess.run(["curl", "-s", "-m", "30", u], capture_output=True, text=True)
        try: res = json.loads(r.stdout)["results"]
        except Exception: print("bad", q); continue
        for it in res:
            if it["source"] in ("flickr",) and False: pass
            fid = it["id"][:8]; p = f"img/{niche}_{fid}.jpg"
            if not os.path.exists(p):
                d = subprocess.run(["curl", "-sfL", "-m", "25", it["url"]], capture_output=True)
                if d.returncode or len(d.stdout) < 20000: continue
                open(p, "wb").write(d.stdout)
            try:
                im = Image.open(p); w, h = im.size
                if w < 800: os.remove(p); continue
            except Exception:
                os.remove(p); continue
            meta[f"{niche}_{fid}"] = {"q": q, "license": it["license"], "creator": it.get("creator"), "landing": it["foreign_landing_url"], "src": it["source"]}
            got.append(p)
            if len([g for g in got if True]) >= 40: break
    json.dump(meta, open("meta.json", "w"), ensure_ascii=False, indent=0)
    W = 200; cols = 6; rows = (len(got) + cols - 1) // cols
    sh = Image.new("RGB", (cols * W, max(1, rows) * W), "white"); dr = ImageDraw.Draw(sh)
    for i, p in enumerate(got):
        im = Image.open(p).convert("RGB"); im.thumbnail((W - 4, W - 4)); x, y = (i % cols) * W, (i // cols) * W
        sh.paste(im, (x, y)); dr.rectangle([x, y, x + 30, y + 14], fill="black"); dr.text((x + 3, y + 1), str(i), fill="white")
    sh.save(f"sheet_{niche}.jpg", quality=75)
    json.dump(got, open(f"list_{niche}.json", "w"))
    print(niche, len(got), flush=True)
