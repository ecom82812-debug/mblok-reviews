#!/usr/bin/env python3
"""Asks Cloudinary once for the big size of every new review photo, so the first visitor does not wait for it."""
import concurrent.futures, json, pathlib, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DONE = ROOT / "warmed.txt"
SIZE = "c_limit,w_1200,q_auto,f_auto"
HEADERS = {"Accept": "image/webp,*/*", "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36"}


def warm(url):
    req = urllib.request.Request(url.replace("/upload/", f"/upload/{SIZE}/"), headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
        return url
    except OSError as e:
        print(f"failed: {url}: {e}")
        return None


def main():
    done = set(DONE.read_text("utf-8").split()) if DONE.exists() else set()
    rows = json.loads((ROOT / "all.json").read_text("utf-8"))
    todo = [p for r in rows for p in r["photos"] if p not in done and "/upload/" in p]
    with concurrent.futures.ThreadPoolExecutor(6) as pool:
        done.update(u for u in pool.map(warm, todo) if u)
    DONE.write_text("\n".join(sorted(done)) + "\n", encoding="utf-8")
    print(f"warmed {len(todo)} photos")


if __name__ == "__main__":
    main()
