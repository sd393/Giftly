#!/usr/bin/env python3
"""One-off: filter mega-brands and mass retailers from the raw brand list.

Reads throne-batch-23-raw-brands.txt, drops anything matching MEGA_OUT,
writes throne-batch-23-filtered.txt and throne-batch-23-dropped.txt.

Anything we're unsure about stays in the filtered list; Haiku's in_scope
check is the second gate.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent

MEGA_OUT = {
    # marketplaces / megastores
    "amazon", "amazon us", "ebay", "target", "kroger", "ikea", "petco",
    "tj maxx", "marshalls", "dsw", "finishline", "world market", "best buy",
    "neiman marcus", "nordstrom", "free people", "urban outfitters", "pacsun",
    "abercrombie & fitch", "asos", "shein us", "sur la table", "powells",
    "books a million", "better world books", "thrift books", "sweetwater",
    "b&h photo video", "dick's sporting goods", "scheels sporting goods",
    "decathlon", "snag tights us", "boxlunch", "hot topic",
    # mega-brands / luxury houses / publicly traded giants
    "apple", "disney", "razer", "dior", "prada", "vivienne westwood",
    "swarovski", "chanel", "ugg", "lululemon", "versace", "zara",
    "agent provocateur", "lush", "gymshark", "smoko", "build-a-bear",
    "reformation", "fashion nova", "morphe", "lovehoney us", "skims",
    "olaplex", "meccha japan", "cider", "edie parker", "nana jacqueline",
    "ann summers", "lounge underwear", "redbubble", "revolve", "romwe",
    "sanrio", "tokidoki", "yandy", "yesstyle", "prettylittlething us",
    "wolfordshops", "peacock alley", "aritzia", "playboy", "pokemon center",
    "vat19", "displate", "for love & lemons", "goods republic", "squishable",
    "ohuhu", "free people", "hamilton park",
    # gaming / collectibles / cosplay retailers
    "riot games", "makeship", "blackmilk clothing", "youtooz",
    "square enix games", "fangamer", "crunchyroll", "good smile",
    "ezcosplay", "mic costumes", "costumes", "vampirefreaks", "blackcraft cult",
    "demonia cult", "mewaii", "fredericks", "ddlg playground", "uwowo cosplay",
    "vgnysoft games", "gamer supps", "gear bioware", "hustler hollywood",
    "the gilded teafling", "okidokicosplay", "anymucosplay", "dyce games",
    "jinxed gaming", "nerd or die", "numskull designs", "cryptozoic entertainment",
    "shop zoki", "devilinspired", "thistle and spire", "lingeriediva",
    "modakawa", "displate", "stickietech", "cider", "house of cb",
    "tunda thighs", "dead by daylight", "iheartraves", "hyperx",
    "usa gundam store", "fleur du mal", "monique morin",
    "the yetee", "syndrome", "pleaser shoes", "beach bunny swimwear",
    "mountain house", "supply", "thousand shores", "zoeao technology",
    "bordelle", "honey birdette", "psd underwear", "snarky tea",
    "kawaii babe", "white fox boutique", "white fox boutique au",
    "bombshell sportswear", "little rooms", "poppy playtime", "heatonist",
    "american mcgee", "vanessa mooney", "ban.do", "in common with",
    "anova culinary", "corsair",  # public/very-large
    "gymshark", "lululemon",
    # already mass-flagged retailers
    "isomoart", "dose", "spadet",
}


def normalize_brand(raw: str) -> str:
    b = raw.strip()
    b = re.sub(r"^[Bb]y\s+", "", b)
    out = []
    for t in b.split():
        letters = [c for c in t if c.isalpha()]
        if letters and all(c.isupper() for c in letters) and len(letters) > 1:
            out.append(t.title())
        else:
            out.append(t)
    return " ".join(out)


def key(s: str) -> str:
    return normalize_brand(s).strip().lower()


def main() -> None:
    raw_path = ROOT / "throne-batch-23-raw-brands.txt"
    raw = [l.strip() for l in raw_path.read_text().splitlines() if l.strip()]

    seen = set()
    unique = []
    for b in raw:
        k = key(b)
        if k in seen:
            continue
        seen.add(k)
        unique.append(b)

    keep = [b for b in unique if key(b) not in MEGA_OUT]
    drop = [b for b in unique if key(b) in MEGA_OUT]

    (ROOT / "throne-batch-23-filtered.txt").write_text("\n".join(keep) + "\n")
    (ROOT / "throne-batch-23-dropped.txt").write_text("\n".join(drop) + "\n")

    print(f"raw={len(raw)} unique={len(unique)} keep={len(keep)} drop={len(drop)}")


if __name__ == "__main__":
    main()
