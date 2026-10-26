import re, json, sys, html as H
def txt(s): return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
def parse(sub, h):
    r = {'sub': sub}
    m = re.search(r'<title>(.*?)</title>', h, re.S); r['title'] = txt(m.group(1)) if m else ''
    m = re.search(r'itemprop="addressLocality"[^>]*>(.*?)</span>', h, re.S); r['city'] = txt(m.group(1)) if m else ''
    m = re.search(r'itemprop="streetAddress"[^>]*>(.*?)</span>', h, re.S); r['street'] = txt(m.group(1)) if m else ''
    r['phones'] = sorted(set(re.findall(r'tel:(\+?\d{10,12})', h)))
    r['wa'] = sorted(set(re.findall(r'(?:wa\.me/|api\.whatsapp\.com/send\?phone=)(\d{10,12})', h)))
    r['whatsapp_word'] = len(re.findall(r'whats ?app|ватсап|вотсап', h, re.I))
    r['vk'] = sorted(set(re.findall(r'vk\.com/(club\d+|public\d+|[a-z0-9_.]+)', h)))[:6]
    r['tg'] = sorted(set(re.findall(r't\.me/([A-Za-z0-9_]+)', h)))[:4]
    ext = set(re.findall(r'href=["\'](https?://[^"\'/]+)', h))
    r['ext'] = sorted(d for d in ext if not re.search(r'orgs\.biz|vk\.com|vk\.me|userapi|yandex|google|schema\.org|t\.me|wa\.me|whatsapp|instagram|ok\.ru|mc\.yandex|vkuser', d))[:8]
    prods = []
    for blk in re.findall(r'itemtype="http://schema.org/Product">(.*?)class=\'read-more\'', h, re.S):
        n = re.search(r'itemprop="name">(.*?)</span>', blk, re.S)
        p = re.search(r'itemprop="price" content="([\d.]+)"', blk)
        im = re.search(r"<img src='([^']+)'", blk)
        d = re.search(r'itemprop="description">(.*?)</div>', blk, re.S)
        if n: prods.append({'name': txt(n.group(1)), 'price': float(p.group(1)) if p else 0, 'img': H.unescape(im.group(1)) if im else '', 'desc': txt(d.group(1))[:160] if d else ''})
    r['products'] = prods
    m = re.search(r'<meta name="description" content="(.*?)"', h, re.S); r['about'] = txt(m.group(1))[:300] if m else ''
    return r
if __name__ == '__main__':
    out = []
    for f in sys.argv[1:]:
        try: out.append(parse(f.split('/')[-1][:-5], open(f, encoding='utf-8', errors='ignore').read()))
        except Exception as e: print('ERR', f, e, file=sys.stderr)
    print(json.dumps(out, ensure_ascii=False))
