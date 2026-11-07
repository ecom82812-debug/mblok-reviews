#!/usr/bin/env python3
"""Turns approved reviews read by fetch.mjs into the static JSON files the site loads."""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def load(path):
    out = []
    for r in json.loads(pathlib.Path(path).read_text("utf-8")):
        r["rating"] = r.get("rating") or 0
        r["productId"] = str(r.get("productId") or "")
        r["photos"] = r.get("photos") or []
        out.append(r)
    out.sort(key=lambda r: r.get("createdAt") or "", reverse=True)
    return out


def write(path, data):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def stats(reviews):
    dist = [sum(1 for r in reviews if round(r["rating"]) == n) for n in (5, 4, 3, 2, 1)]
    return {"total": len(reviews), "sum": sum(r["rating"] for r in reviews), "dist": dist,
            "five": dist[0], "photos": sum(len(r["photos"]) for r in reviews),
            "withPhotos": sum(1 for r in reviews if r["photos"]),
            "products": len({r["productId"] for r in reviews if r["productId"]})}


def home_items(reviews):
    good = [r for r in reviews[:30] if r["rating"] == 5 and r["photos"]
            and 25 <= len(r.get("text") or "") <= 220]
    return [{"name": r.get("name") or "Покупець", "text": r["text"], "photo": r["photos"][0],
             "date": r.get("createdAt"), "url": r.get("productUrl") or ""} for r in good[:3]]


def main():
    reviews = load(sys.argv[1])
    if not reviews:
        sys.exit("empty result, keeping current files")
    per = {}
    for r in reviews:
        per.setdefault(r["productId"], []).append(r)
    s = stats(reviews)
    write("summary.json", {"stats": s, "p": {pid: [round(sum(x["rating"] for x in rs) / len(rs), 2), len(rs)]
                                             for pid, rs in per.items() if pid}})
    write("home.json", {"total": s["total"], "five": s["five"], "sum": s["sum"], "items": home_items(reviews)})
    write("all.json", reviews)
    for pid, rs in per.items():
        if pid:
            write(f"p/{pid}.json", rs)
    for stale in (ROOT / "p").glob("*.json"):
        if stale.stem not in per:
            stale.unlink()
    print(f"exported {len(reviews)} reviews")


if __name__ == "__main__":
    sys.exit(main())
