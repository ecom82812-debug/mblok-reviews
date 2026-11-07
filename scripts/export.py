#!/usr/bin/env python3
"""Exports approved mBlok reviews from Firestore to static JSON, without contact fields."""
import json, os, pathlib, sys, time, urllib.error, urllib.request

API = "https://firestore.googleapis.com/v1/projects/shop-reviews-3aedd/databases/(default)/documents"
FIELDS = ["name", "text", "rating", "photos", "createdAt", "verified", "reply",
          "productId", "productName", "productUrl"]
APPROVED = {"fieldFilter": {"field": {"fieldPath": "status"}, "op": "EQUAL",
                            "value": {"stringValue": "approved"}}}
ROOT = pathlib.Path(__file__).resolve().parent.parent


def post(method, body):
    req = urllib.request.Request(f"{API}:{method}", json.dumps(body).encode(),
                                 {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def count():
    q = {"structuredAggregationQuery": {"structuredQuery": {
        "from": [{"collectionId": "reviews"}], "where": APPROVED},
        "aggregations": [{"alias": "n", "count": {}}]}}
    return int(post("runAggregationQuery", q)[0]["result"]["aggregateFields"]["n"]["integerValue"])


def value(v):
    if "stringValue" in v: return v["stringValue"]
    if "integerValue" in v: return int(v["integerValue"])
    if "doubleValue" in v: return v["doubleValue"]
    if "booleanValue" in v: return v["booleanValue"]
    if "timestampValue" in v: return v["timestampValue"]
    if "arrayValue" in v: return [value(x) for x in v["arrayValue"].get("values", [])]
    return None


def fetch():
    q = {"structuredQuery": {"select": {"fields": [{"fieldPath": f} for f in FIELDS]},
                             "from": [{"collectionId": "reviews"}], "where": APPROVED}}
    out = []
    for row in post("runQuery", q):
        doc = row.get("document")
        if not doc:
            continue
        r = {k: value(v) for k, v in doc["fields"].items() if k in FIELDS}
        r["id"] = doc["name"].rsplit("/", 1)[-1]
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
    summary_path = ROOT / "summary.json"
    known = None
    if summary_path.exists():
        known = json.loads(summary_path.read_text("utf-8")).get("stats", {}).get("total")
    now = time.gmtime()
    forced = os.environ.get("FULL") == "1" or (now.tm_hour % 3 == 0 and now.tm_min < 30)
    try:
        if not forced and known == count():
            print("no change")
            return
        reviews = fetch()
    except (urllib.error.URLError, OSError, KeyError, ValueError) as e:
        print(f"read failed, keeping current files: {e}")
        return
    if not reviews:
        print("empty result, keeping current files")
        return
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
    print(f"exported {len(reviews)} reviews")


if __name__ == "__main__":
    sys.exit(main())
