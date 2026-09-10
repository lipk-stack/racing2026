#!/usr/bin/env python3
"""
Modelling-reference fetcher.

Pulls freely-licensed photographs of each car in the roster from Wikimedia Commons so the body
profiles can be authored against the real thing rather than from memory. Photographs are
modelling reference only: they stay out of `dist/` and out of git (see .gitignore), and every
file downloaded is recorded in `reference/manifest.json` with its author and licence so the
credit CC BY-SA asks for can actually be given.

    python3 tools/blender/fetch_refs.py                 # every car with a search term
    python3 tools/blender/fetch_refs.py toyotasupra     # just one

Commons asks API clients to identify themselves and to go easy on request rates, so this runs
one request at a time with a floor on the gap between them and honours 429 with exponential
backoff. Results are cached, so a re-run costs nothing.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF_DIR = os.path.join(ROOT, "reference")
CACHE = os.path.join(REF_DIR, ".api-cache")
API = "https://commons.wikimedia.org/w/api.php"
UA = "NightlineRacer-modelling-reference/1.0 (https://github.com/lipk-stack/racing2026)"

# Commons search terms per car. The generation code matters more than the marketing name: a
# search for "Nissan Z" returns half a century of unrelated cars, "Nissan Z RZ34" does not.
TERMS = {
    "toyotasupra": ["Toyota GR Supra A90", "Toyota Supra J29", "Toyota GR Supra 2020", "Toyota Supra A90 red"],
    "nissanz": ["Nissan Z RZ34", "Nissan Fairlady Z RZ34"],
    "fordmustang": ["Ford Mustang S650", "Ford Mustang Dark Horse"],
    "porschecayman": ["Porsche 718 Cayman GT4 RS", "Porsche 982 Cayman GT4"],
    "bmwM4csl": ["BMW M4 CSL", "BMW G82 M4"],
    "nissangtr": ["Nissan GT-R Nismo R35", "Nissan GT-R R35"],
    "audir8": ["Audi R8 V10 4S", "Audi R8 Type 4S"],
    "lamborghinihuracan": ["Lamborghini Huracan STO", "Lamborghini Huracan Evo", "Lamborghini Huracan 2021", "Lamborghini Huracan green"],
    "mercedesamggt": ["Mercedes-AMG GT Black Series", "Mercedes-AMG GT R C190"],
    "mclaren765lt": ["McLaren 765LT", "McLaren 720S"],
    "ferrari296": ["Ferrari 296 GTB", "Ferrari 296"],
    "porsche911turbo": ["Porsche 992 Turbo S", "Porsche 911 992 Turbo", "Porsche 911 992 2021", "Porsche 992 Carrera side"],
}

MIN_GAP = 1.5  # seconds between API calls, per the Commons etiquette guidelines
_last_call = [0.0]


def _throttle():
    gap = time.time() - _last_call[0]
    if gap < MIN_GAP:
        time.sleep(MIN_GAP - gap)
    _last_call[0] = time.time()


def api(params, attempts=5):
    """One Commons API call, cached on disk, backing off politely when told to."""
    params = dict(params, action="query", format="json")
    key = re.sub(r"[^A-Za-z0-9]+", "_", urllib.parse.urlencode(sorted(params.items())))[:180]
    cached = os.path.join(CACHE, key + ".json")
    if os.path.exists(cached):
        with open(cached) as handle:
            return json.load(handle)

    url = API + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(attempts):
        _throttle()
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode())
            os.makedirs(CACHE, exist_ok=True)
            with open(cached, "w") as handle:
                json.dump(payload, handle)
            return payload
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == attempts - 1:
                print("    api error: %s" % error)
                return {}
            time.sleep(4 * (attempt + 1))
        except Exception as error:  # noqa: BLE001 - network flakiness is not worth a taxonomy
            if attempt == attempts - 1:
                print("    api error: %s" % error)
                return {}
            time.sleep(2 * (attempt + 1))
    return {}


def plain(value):
    """Commons metadata arrives as HTML fragments; the manifest wants readable text."""
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def search(term, limit=30):
    payload = api({
        "generator": "search", "gsrnamespace": "6", "gsrsearch": term, "gsrlimit": str(limit),
        "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": "1600",
    })
    out = []
    for page in ((payload.get("query") or {}).get("pages") or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        licence = plain((meta.get("LicenseShortName") or {}).get("value", ""))
        # Public-domain and CC files only; anything else is not ours to keep a copy of.
        if not re.search(r"CC|Public domain|PD", licence, re.I):
            continue
        width, height = info.get("width") or 0, info.get("height") or 0
        if width < 1200:
            continue
        out.append({
            "title": page["title"][5:],
            "width": width, "height": height,
            "aspect": round(width / height, 3) if height else 0,
            "licence": licence,
            "author": plain((meta.get("Artist") or {}).get("value", "")) [:120],
            "credit": plain((meta.get("Credit") or {}).get("value", ""))[:120],
            "descriptionurl": info.get("descriptionurl"),
            "thumb": info.get("thumburl"),
        })
    return out


def download(entry, directory):
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", entry["title"])[:90]
    path = os.path.join(directory, name if name.lower().endswith((".jpg", ".jpeg", ".png")) else name + ".jpg")
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return path
    url = entry["thumb"] or ("https://commons.wikimedia.org/wiki/Special:FilePath/"
                             + urllib.parse.quote(entry["title"]) + "?width=1600")
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            _throttle()
            with urllib.request.urlopen(request, timeout=90) as response:
                data = response.read()
            with open(path, "wb") as handle:
                handle.write(data)
            return path
        except Exception as error:  # noqa: BLE001
            if attempt == 2:
                print("    download failed: %s (%s)" % (entry["title"][:60], error))
                return None
            time.sleep(3 * (attempt + 1))
    return None


def main(argv):
    wanted = argv or sorted(TERMS)
    unknown = [car for car in wanted if car not in TERMS]
    if unknown:
        sys.exit("No search terms for: %s" % ", ".join(unknown))

    manifest_path = os.path.join(REF_DIR, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path) as handle:
            manifest = json.load(handle)

    for car in wanted:
        directory = os.path.join(REF_DIR, car)
        os.makedirs(directory, exist_ok=True)
        seen, entries = set(), []
        for term in TERMS[car]:
            for entry in search(term):
                if entry["title"] in seen:
                    continue
                seen.add(entry["title"])
                entries.append(entry)

        # A car photographed side-on is the single most valuable frame for a body profile, and it
        # is always the widest: rank by aspect ratio so elevations sort above three-quarter hero
        # shots and detail crops.
        entries.sort(key=lambda item: -item["aspect"])
        keep = entries[:18]
        records = []
        for entry in keep:
            path = download(entry, directory)
            if not path:
                continue
            records.append({
                "file": os.path.relpath(path, ROOT),
                "title": entry["title"],
                "author": entry["author"],
                "licence": entry["licence"],
                "source": entry["descriptionurl"],
                "aspect": entry["aspect"],
            })
        manifest[car] = records
        print("%-22s %2d kept of %2d candidates" % (car, len(records), len(entries)))

    os.makedirs(REF_DIR, exist_ok=True)
    with open(manifest_path, "w") as handle:
        json.dump(manifest, handle, indent=2, sort_keys=True)
    total = sum(len(v) for v in manifest.values())
    print("\nmanifest: %s (%d files, attribution recorded)" % (
        os.path.relpath(manifest_path, ROOT), total))


if __name__ == "__main__":
    main(sys.argv[1:])
