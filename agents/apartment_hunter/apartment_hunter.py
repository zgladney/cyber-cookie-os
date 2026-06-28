#!/usr/bin/env python3
"""
CyberCookieOS — Housing Scout
Agent 002 | Real Estate Command
"""

import json
import os
import sys
from datetime import datetime

# Ensure Unicode output works on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Allow same-directory imports (settings, filters, ranking)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from settings import SETTINGS
from filters import apply_all_filters
from ranking import rank_apartments

# Resolve paths relative to project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")
APARTMENTS_FILE = os.path.join(DATA_DIR, "apartments.json")
RESULTS_FILE    = os.path.join(DATA_DIR, "apartment_results.json")

# ── URL VALIDATION ───────────────────────────────────────────────────────────
# Patterns that indicate a direct individual property listing page

_DIRECT_PATTERNS = [
    "/home/",                       # Trulia individual listing
    "/homedetails/",                # Zillow individual listing
    "/realestateandhomes-detail/",  # Realtor.com individual listing
    "/homes-detail/",               # Homes.com individual listing
    "/property/",
    "/listing/",
]

# Patterns that indicate search results, category pages, or aggregators
_SEARCH_PATTERNS = [
    "/for_rent/",
    "/rentals/",
    "/apartments/",
    "/rent-townhomes/",
    "/rent-houses/",
    "/condos-for-rent/",
    "/section8-owners/",
    "/homes-for-rent/",
    "/affordable-",
    "/affordable_",
    "/search/",
    "/find/",
    "/map/",
    "/willingboro-nj/",
    "/marlton-nj/",
    "/mount-laurel-nj/",
    "/mount-laurel-township-nj/",
    "/southampton-nj/",
    "/burlington-nj/",
    "/cherry-hill-nj/",
    "/willingboro_nj",
    "/mount_laurel",
    "/marlton_nj",
    "/southampton_nj",
]


def is_direct_listing_url(url):
    """Return True only if url points to an individual property page."""
    if not url:
        return False
    u = url.lower()
    for pattern in _SEARCH_PATTERNS:
        if pattern in u:
            return False
    for pattern in _DIRECT_PATTERNS:
        if pattern in u:
            return True
    return False  # Unknown structure — treat as unverified


def url_status(url, data_source=""):
    """
    Return a short status label for a listing URL.
    Priority: SAMPLE DATA > URL structure analysis.
    """
    src = data_source or ""
    if "SAMPLE" in src:
        return "SAMPLE DATA"
    if not url:
        return "UNVERIFIED — No URL Provided"
    u = url.lower()
    for pattern in _SEARCH_PATTERNS:
        if pattern in u:
            return "UNVERIFIED — Generic/Search Page"
    for pattern in _DIRECT_PATTERNS:
        if pattern in u:
            return "VERIFIED — Direct Listing URL"
    return "UNVERIFIED — URL Structure Unknown"


# ── REJECTION REASON ─────────────────────────────────────────────────────────

def rejection_reason(apt):
    """Return the first filter criterion that this listing fails."""
    s = SETTINGS
    if apt["rent"] > s["max_rent"]:
        return f"Over budget (${apt['rent']:,} > ${s['max_rent']:,}/mo)"
    if apt["bedrooms"] < s.get("bedrooms_min", 1):
        return f"Too few bedrooms ({apt['bedrooms']} BR, min {s.get('bedrooms_min')} required)"
    if s.get("pet_friendly_required") and not apt.get("pet_friendly"):
        return "Pets not allowed"
    if s.get("voucher_friendly_required") and not apt.get("voucher_accepted"):
        return "Vouchers not accepted"
    if s.get("family_friendly_required") and not apt.get("family_friendly"):
        return "Not family-friendly"
    if s.get("no_senior_housing") and apt.get("is_senior_housing"):
        return "Senior/age-restricted housing"
    allowed = s.get("allowed_property_types", [])
    if allowed and apt.get("property_type") not in allowed:
        return f"Property type '{apt['property_type']}' not allowed (allowed: {', '.join(allowed)})"
    cities = s.get("preferred_cities", [])
    if cities and apt.get("city") not in cities:
        return f"City '{apt['city']}' not in target list"
    return "Failed unknown filter"


# ── IO ───────────────────────────────────────────────────────────────────────

def load_apartments():
    if not os.path.exists(APARTMENTS_FILE):
        print("[!] apartments.json not found at:", APARTMENTS_FILE)
        return []
    with open(APARTMENTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_results(payload):
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Results saved to data/apartment_results.json")


# ── REPORT ───────────────────────────────────────────────────────────────────

def print_report(payload):
    ranked   = payload["ranked"]
    rejected = payload.get("rejected", [])
    sep      = "=" * 66

    print("\n" + sep)
    print("  CyberCookieOS // Housing Scout — Agent 002")
    print(sep)
    print(f"  Total Loaded    : {payload['total_listings']} listings")
    print(f"  Passed Filters  : {payload['total_matches']}")
    print(f"  Rejected        : {len(rejected)}")
    print(f"  Max Budget      : ${SETTINGS['max_rent']:,}/mo")
    print(f"  Target Cities   : {', '.join(SETTINGS['preferred_cities']) or 'All'}")
    print(f"  Allowed Types   : {', '.join(SETTINGS.get('allowed_property_types', []))}")
    print(sep)

    # ── Verified count summary ───────────────────────────────────────────────
    verified_count = sum(
        1 for a in ranked
        if url_status(a.get("listing_url"), a.get("data_source", "")).startswith("VERIFIED")
    )
    print(f"\n  Verified direct URLs : {verified_count} / {len(ranked)} passing listings")

    if not ranked:
        print("\n  No listings matched your current filters.")
        print("  Tip: Raise max_rent or add more cities in settings.py")
        print("\n" + sep)
        return

    # ── Best fit ─────────────────────────────────────────────────────────────
    # Prefer verified listing; fall back to whatever ranked highest
    best = next(
        (a for a in ranked
         if url_status(a.get("listing_url"), a.get("data_source", "")).startswith("VERIFIED")),
        ranked[0]
    )

    b_status = url_status(best.get("listing_url"), best.get("data_source", ""))
    print(f"\n  BEST VERIFIED FIT: {best['name']}" if b_status.startswith("VERIFIED")
          else f"\n  BEST MATCH (no verified URL): {best['name']}")
    print(f"     Score    : {best['score']}/100")
    print(f"     Type     : {best.get('property_type', 'unknown').upper()}")
    sqft_str = f"{best['sqft']} sqft" if best.get("sqft") else "sqft unknown"
    print(f"     Rent     : ${best['rent']:,}/mo  ({best['bedrooms']} BR | {sqft_str})")
    print(f"     City     : {best['city']} - {best['neighborhood']}")
    print(f"     Pets     : {'Yes' if best.get('pet_friendly') else 'No'}"
          f"   Voucher: {'Yes' if best.get('voucher_accepted') else 'No'}"
          f"   Family: {'Yes' if best.get('family_friendly') else 'No'}")
    print(f"     Status   : {b_status}")
    if best.get("listing_url"):
        print(f"     URL      : {best['listing_url']}")

    # ── All matches ──────────────────────────────────────────────────────────
    print(f"\n  {'─' * 62}")
    print(f"  ALL MATCHES — ranked best to worst")
    print(f"  {'─' * 62}\n")

    for i, apt in enumerate(ranked, 1):
        pet   = "[PET]" if apt.get("pet_friendly") else "     "
        vch   = "[VCH]" if apt.get("voucher_accepted") else "     "
        ptype = apt.get("property_type", "?")[:4].upper()
        bar   = "#" * (apt["score"] // 10) + "." * (10 - apt["score"] // 10)
        status = url_status(apt.get("listing_url"), apt.get("data_source", ""))

        print(f"  {i:2}. [{apt['score']:3}/100] {bar}  "
              f"${apt['rent']:,}/mo  {apt['bedrooms']}BR  [{ptype}]  "
              f"{pet}{vch}")
        print(f"       {apt['name']}  ({apt['city']})")
        print(f"       STATUS: {status}")
        if apt.get("listing_url"):
            print(f"       URL:    {apt['listing_url']}")
        print()

    # ── Rejected listings ────────────────────────────────────────────────────
    if rejected:
        print(f"  {'─' * 62}")
        print(f"  REJECTED LISTINGS")
        print(f"  {'─' * 62}\n")
        for apt in rejected:
            reason = rejection_reason(apt)
            ptype  = apt.get("property_type", "unknown")
            print(f"  - {apt['name']}  ({apt['city']})")
            print(f"    REJECTED: {reason}")
            print(f"    Type: {ptype}  |  Rent: ${apt['rent']:,}/mo  |  BR: {apt['bedrooms']}")
            print()

    print(sep)


# ── MAIN ─────────────────────────────────────────────────────────────────────

def run():
    print("\n[*] CyberCookieOS Housing Scout — Initializing Agent 002...")
    cities = ', '.join(SETTINGS.get('preferred_cities', []))
    print(f"[*] Budget    : ${SETTINGS['max_rent']:,}/mo max")
    print(f"[*] Types     : {', '.join(SETTINGS.get('allowed_property_types', []))}")
    print(f"[*] Cities    : {cities}")
    print(f"[*] Pet req   : {SETTINGS.get('pet_friendly_required', False)}"
          f"  |  Voucher req : {SETTINGS.get('voucher_friendly_required', False)}")

    apartments = load_apartments()
    if not apartments:
        print("[!] No data. Check data/apartments.json")
        return

    print(f"[*] Loaded {len(apartments)} listings from apartments.json")

    matches = apply_all_filters(apartments)
    print(f"[*] {len(matches)} listing(s) passed all filters.")

    # Compute rejected set (listings that did not pass filters)
    match_ids = {a["id"] for a in matches}
    rejected  = [a for a in apartments if a["id"] not in match_ids]

    ranked    = rank_apartments(matches)
    pet_count = sum(1 for a in ranked if a["pet_friendly"])

    # Annotate each ranked listing with its computed url_status
    for a in ranked:
        a["url_status"] = url_status(a.get("listing_url"), a.get("data_source", ""))

    # Best fit: prefer verified, then highest score
    best = next(
        (a for a in ranked if a["url_status"].startswith("VERIFIED")),
        ranked[0] if ranked else None
    )

    payload = {
        "generated"         : datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "agent"             : "Agent 002 - Housing Scout",
        "settings_snapshot" : SETTINGS,
        "total_listings"    : len(apartments),
        "total_matches"     : len(ranked),
        "pet_friendly_count": pet_count,
        "best_fit"          : best,
        "ranked"            : ranked,
        "rejected"          : rejected,
    }

    print_report(payload)
    save_results(payload)


if __name__ == "__main__":
    run()
