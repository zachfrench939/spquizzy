#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
KEY="2b5d840d139bf9d63c5582a6ee832ddb"
HOST="spiquizzy.com"
python3 - "$ROOT/sitemap.xml" "$KEY" << 'PY'
import json, sys, urllib.request, re
sitemap, key = sys.argv[1], sys.argv[2]
xml = open(sitemap, encoding="utf-8").read()
urls = re.findall(r"<loc>(.*?)</loc>", xml)
body = json.dumps({
    "host": "spiquizzy.com",
    "key": key,
    "keyLocation": f"https://spiquizzy.com/{key}.txt",
    "urlList": urls,
}).encode()
req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=body,
    headers={"Content-Type": "application/json; charset=utf-8"},
    method="POST",
)
try:
    with urllib.request.urlopen(req, timeout=30) as res:
        print(res.status)
        print(res.read().decode()[:500])
except Exception as exc:
    if hasattr(exc, "code"):
        print(exc.code)
        print(exc.read().decode()[:500])
    raise
PY
