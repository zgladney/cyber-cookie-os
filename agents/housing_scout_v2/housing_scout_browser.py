#!/usr/bin/env python3
"""
CyberCookieOS — Housing Scout v2 (Browser Agent)
Agent 002 | Playwright-based real estate scraper

Source priority (highest accessibility first):
  1. Manual direct listing URLs  (always MANUAL_DIRECT_URL)
  2. AffordableHousing.com       (confirmed accessible)
  3. Craigslist Philadelphia     (generally accessible)
  4. Search engine pages          (DuckDuckGo — no bot wall)

Known bot-blocked sources (documented, not scraped):
  zillow.com, trulia.com, realtor.com, redfin.com, homes.com
"""

import re
import os
import sys
import json
from datetime import datetime
from playwright.sync_api import sync_playwright

# When launched via POST /api/housing/scout the server sets this env var.
# Headless=True so no browser window opens during API calls.
API_MODE = os.environ.get('SCOUT_API_MODE') == '1'

# ── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR       = os.path.join(BASE_DIR, "data")
RESULTS_FILE   = os.path.join(DATA_DIR, "housing_scout_v2_results.json")
SCREENSHOT_DIR = os.path.join(DATA_DIR, "housing_scout_screenshots")

# ── SEARCH CRITERIA ──────────────────────────────────────────────────────────
MAX_RENT      = 2100
MIN_BEDROOMS  = 2
TARGET_CITIES = ["Willingboro", "Mount Laurel", "Marlton", "Southampton"]
ALLOWED_TYPES = ["house", "townhouse", "condo"]

# ── MANUAL DIRECT URLs ───────────────────────────────────────────────────────
# Paste verified individual property listing URLs here.
# These are always processed first and never bot-checked.
MANUAL_LISTING_URLS = [
    "https://www.trulia.com/home/103-dorset-dr-marlton-nj-08053-38101814",
    # Add more below, one per line:
    # "https://www.zillow.com/homedetails/ADDRESS/zpid/",
]

# ── SOURCES ──────────────────────────────────────────────────────────────────
SOURCES = [
    {
        "name":    "AffordableHousing.com — Willingboro",
        "url":     "https://www.affordablehousing.com/willingboro-nj/",
        "city":    "Willingboro",
        "scraper": "affordablehousing",
    },
    {
        "name":    "AffordableHousing.com — Mount Laurel",
        "url":     "https://www.affordablehousing.com/mount-laurel-nj/",
        "city":    "Mount Laurel",
        "scraper": "affordablehousing",
    },
    {
        "name":    "AffordableHousing.com — Marlton",
        "url":     "https://www.affordablehousing.com/marlton-nj/",
        "city":    "Marlton",
        "scraper": "affordablehousing",
    },
    {
        "name":    "AffordableHousing.com — Southampton",
        "url":     "https://www.affordablehousing.com/southampton-nj/",
        "city":    "Southampton",
        "scraper": "affordablehousing",
    },
    {
        "name":    "Craigslist Philadelphia — Housing for Rent",
        "url":     (
            "https://philadelphia.craigslist.org/search/hhh"
            "?query=willingboro+OR+%22mount+laurel%22+OR+marlton+OR+southampton"
            "&min_price=1000&max_price=2100"
        ),
        "city":    "multiple",
        "scraper": "craigslist",
    },
    {
        "name":    "Craigslist Philadelphia — Apts/Houses",
        "url":     (
            "https://philadelphia.craigslist.org/search/apa"
            "?query=willingboro+OR+%22mount+laurel%22+OR+marlton+OR+southampton"
            "&min_price=1000&max_price=2100&bedrooms=2"
        ),
        "city":    "multiple",
        "scraper": "craigslist",
    },
]

# Sources that are known to block automated access.
# We document them, never attempt to scrape them.
KNOWN_BLOCKED_DOMAINS = [
    "zillow.com",
    "trulia.com",
    "realtor.com",
    "redfin.com",
    "homes.com",
    "apartments.com",
    "rent.com",
]

# ── BOT DETECTION ────────────────────────────────────────────────────────────
BOT_KEYWORDS = [
    "captcha", "robot check", "verify you are human",
    "are you a human", "access denied", "blocked",
    "cloudflare", "ddos protection", "press & hold",
    "security check", "unusual traffic", "bot detection",
    "rate limit exceeded", "forbidden", "403",
]

# URL path segments that indicate a page is a search/category page, not a listing
SEARCH_PATH_MARKERS = [
    "/rentals/", "/for_rent/", "/apartments/", "/rent-houses/",
    "/rent-townhomes/", "/condos-for-rent/", "/homes-for-rent/",
    "/search/", "/find/", "/map/", "/section8-owners/",
    "-nj/rentals", "-nj/rent",
]

# URL path segments that indicate an individual property listing
LISTING_PATH_MARKERS = [
    "/home/",
    "/homedetails/",
    "/realestateandhomes-detail/",
    "/homes-detail/",
    "/property/",
    "/listing/",
    # AffordableHousing.com direct listing pattern: /city-st/address-id/
]


def is_bot_blocked(page, response=None):
    """Return (blocked: bool, reason: str | None)."""
    if response and hasattr(response, "status") and response.status in [403, 429, 503]:
        return True, f"HTTP {response.status}"
    current = page.url.lower()
    if "captcha" in current or "challenge" in current or "blocked" in current:
        return True, f"Redirected to bot-check page: {page.url}"
    try:
        content = page.content().lower()
        for kw in BOT_KEYWORDS:
            if kw in content:
                return True, f"Bot indicator on page: '{kw}'"
    except Exception:
        pass
    return False, None


def classify_url(url):
    """Return 'VERIFIED', 'SEARCH_PAGE', or 'UNKNOWN' based on URL structure."""
    if not url:
        return "UNKNOWN"
    u = url.lower()
    for seg in SEARCH_PATH_MARKERS:
        if seg in u:
            return "SEARCH_PAGE"
    for seg in LISTING_PATH_MARKERS:
        if seg in u:
            return "VERIFIED"
    # AffordableHousing pattern: /city-st/slug-id/ — ends in -NNNNNN/
    if re.search(r"/[a-z0-9-]+-\d{4,}/?$", u):
        return "VERIFIED"
    return "UNKNOWN"


# ── FILTER CHECK ─────────────────────────────────────────────────────────────

def passes_filters(listing):
    """Return (passes: bool, reason: str | None)."""
    rent = listing.get("rent")
    if rent and rent > MAX_RENT:
        return False, f"Over budget (${rent:,} > ${MAX_RENT:,})"
    beds = listing.get("bedrooms")
    if beds is not None and beds < MIN_BEDROOMS:
        return False, f"Too few bedrooms ({beds} BR, min {MIN_BEDROOMS})"
    ptype = (listing.get("property_type") or "").lower()
    if ptype and ptype not in ALLOWED_TYPES:
        return False, f"Property type '{ptype}' not allowed"
    city = listing.get("city") or ""
    if city and not any(t.lower() in city.lower() for t in TARGET_CITIES):
        return False, f"City '{city}' not in target list"
    return True, None


# ── SCRAPERS ─────────────────────────────────────────────────────────────────

def scrape_affordablehousing(page, source):
    """
    Extract listings from an AffordableHousing.com city page.
    Returns a list of listing dicts.
    """
    listings = []
    try:
        # Try several common listing card selectors
        cards = page.query_selector_all(".listing-item, .property-listing, article.listing, .card")
        if not cards:
            # Fallback: look for any element containing an address + rent pattern
            # and an anchor to a detail page
            cards = page.query_selector_all("a[href*='affordablehousing.com']")

        for card in cards:
            try:
                href = card.get_attribute("href") or ""
                # Only include links that look like individual listing pages
                if classify_url(href) != "VERIFIED":
                    continue

                text = (card.inner_text() or "").strip()

                # Try to extract rent: look for dollar amounts
                rent_match = re.search(r"\$([0-9,]+)\s*/?\s*mo", text, re.IGNORECASE)
                rent = int(rent_match.group(1).replace(",", "")) if rent_match else None

                # Try to extract bedrooms
                bed_match = re.search(r"(\d+)\s*bed", text, re.IGNORECASE)
                beds = int(bed_match.group(1)) if bed_match else None

                # Try to extract bath
                bath_match = re.search(r"(\d+(?:\.\d)?)\s*bath", text, re.IGNORECASE)
                baths = float(bath_match.group(1)) if bath_match else None

                # Detect property type from text
                ptype = "unknown"
                text_lower = text.lower()
                if "townhouse" in text_lower or "town house" in text_lower:
                    ptype = "townhouse"
                elif "condo" in text_lower or "condominium" in text_lower:
                    ptype = "condo"
                elif "house" in text_lower or "single family" in text_lower or "home" in text_lower:
                    ptype = "house"
                elif "apartment" in text_lower or "apt" in text_lower:
                    ptype = "apartment"

                # Make URL absolute
                if href.startswith("/"):
                    href = "https://www.affordablehousing.com" + href
                elif not href.startswith("http"):
                    href = "https://www.affordablehousing.com/" + href

                listings.append({
                    "raw_text":      text[:200],
                    "city":          source["city"],
                    "property_type": ptype,
                    "bedrooms":      beds,
                    "bathrooms":     baths,
                    "rent":          rent,
                    "listing_url":   href,
                    "url_class":     classify_url(href),
                    "source_site":   "affordablehousing.com",
                    "source_status": "ACCESSIBLE",
                })
            except Exception as e:
                continue  # skip malformed card

        # If no cards found via selectors, check for "no results" message
        if not listings:
            content = page.content().lower()
            if "no matching results" in content or "0 rentals" in content or "no results" in content:
                pass  # empty city — normal, not an error

    except Exception as e:
        print(f"    [!] AffordableHousing scraper error: {e}")

    return listings


def scrape_craigslist(page, source):
    """
    Extract listings from a Craigslist search results page.
    Returns a list of listing dicts (each is a link to an individual post).
    """
    listings = []
    try:
        # Craigslist search result items
        items = page.query_selector_all("li.cl-search-result, li.result-row, .result-info")
        if not items:
            items = page.query_selector_all("a.cl-app-anchor, a.hdrlnk")

        for item in items:
            try:
                # Get the anchor link
                anchor = item.query_selector("a.cl-app-anchor, a.hdrlnk, a[href*='craigslist']")
                if not anchor:
                    if item.tag_name == "A":
                        anchor = item
                    else:
                        continue

                href  = anchor.get_attribute("href") or ""
                title = (anchor.inner_text() or "").strip()

                if not href or not title:
                    continue

                # Only keep individual post URLs (craigslist posts end in .html or have /d/ path)
                if "/search/" in href or not (".html" in href or "/d/" in href):
                    continue

                # Get price
                price_el = item.query_selector(".priceinfo, .result-price, .price")
                price_text = (price_el.inner_text() if price_el else "") or ""
                rent_match = re.search(r"\$([0-9,]+)", price_text)
                rent = int(rent_match.group(1).replace(",", "")) if rent_match else None

                # Get location/neighborhood
                meta_el = item.query_selector(".meta, .result-meta, .housing, .location")
                meta = (meta_el.inner_text() if meta_el else "") or ""

                # Guess city from title + meta
                city = "Unknown"
                combined = (title + " " + meta).lower()
                for tc in TARGET_CITIES:
                    if tc.lower() in combined:
                        city = tc
                        break

                # Guess property type from title
                ptype = "unknown"
                t = title.lower()
                if "townhouse" in t or "townhome" in t:
                    ptype = "townhouse"
                elif "condo" in t:
                    ptype = "condo"
                elif "house" in t or "home" in t or "rancher" in t or "colonial" in t:
                    ptype = "house"
                elif "apt" in t or "apartment" in t:
                    ptype = "apartment"

                # Bedrooms from title (e.g. "3BR", "3 bed")
                bed_match = re.search(r"(\d+)\s*(?:br|bed|bedroom)", t)
                beds = int(bed_match.group(1)) if bed_match else None

                listings.append({
                    "raw_text":      title[:200],
                    "city":          city,
                    "property_type": ptype,
                    "bedrooms":      beds,
                    "bathrooms":     None,
                    "rent":          rent,
                    "listing_url":   href,
                    "url_class":     "VERIFIED",  # Craigslist posts are individual listings
                    "source_site":   "craigslist.org",
                    "source_status": "ACCESSIBLE",
                })
            except Exception:
                continue

    except Exception as e:
        print(f"    [!] Craigslist scraper error: {e}")

    return listings


# ── RESULT STORAGE ───────────────────────────────────────────────────────────

def init_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def save_run(run_record):
    init_dirs()
    history = []
    if os.path.exists(RESULTS_FILE):
        try:
            with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except (json.JSONDecodeError, ValueError):
            history = []
    history.append(run_record)
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)


def take_screenshot(page, label):
    init_dirs()
    ts    = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe  = re.sub(r"[^a-z0-9]+", "_", label.lower())[:40]
    path  = os.path.join(SCREENSHOT_DIR, f"{safe}_{ts}.png")
    try:
        page.screenshot(path=path, full_page=True)
    except Exception:
        path = None
    return path


# ── REPORT ───────────────────────────────────────────────────────────────────

def print_run_report(run_record):
    sep = "=" * 66
    print("\n" + sep)
    print("  Housing Scout v2 — Run Report")
    print(sep)
    print(f"  Run started : {run_record['started_at']}")
    print(f"  Manual URLs : {run_record['manual_url_count']}")
    print(f"  Sources     : {len(run_record['source_results'])}")
    print()

    known_blocked_report = run_record.get("known_blocked_domains", [])
    if known_blocked_report:
        print(f"  KNOWN BLOCKED (not attempted):")
        for d in known_blocked_report:
            print(f"    - {d}")
        print()

    all_listings = []

    for sr in run_record["source_results"]:
        status    = sr["source_status"]
        n         = len(sr.get("listings", []))
        icon      = "[OK]" if status == "ACCESSIBLE" else "[!!]"
        print(f"  {icon} {sr['source_name']}")
        print(f"       Status   : {status}")
        if sr.get("block_reason"):
            print(f"       Reason   : {sr['block_reason']}")
        print(f"       Listings : {n}")
        if sr.get("screenshot"):
            print(f"       Screen   : {sr['screenshot']}")
        print()
        all_listings.extend(sr.get("listings", []))

    # Manual listings
    manual = run_record.get("manual_listings", [])
    if manual:
        print(f"  [MANUAL] {len(manual)} direct URL(s) provided")
        for ml in manual:
            print(f"    URL: {ml['listing_url']}")
        print()
        all_listings.extend(manual)

    # Filter results
    passing = [l for l in all_listings if l.get("passes_filters")]
    verified = [l for l in passing if l.get("url_class") == "VERIFIED"]

    print(f"  {'─' * 62}")
    print(f"  TOTAL LISTINGS COLLECTED : {len(all_listings)}")
    print(f"  PASS FILTERS             : {len(passing)}")
    print(f"  VERIFIED DIRECT URL      : {len(verified)}")
    print(f"  {'─' * 62}")
    print()

    if verified:
        print("  VERIFIED MATCHES:\n")
        for l in verified:
            rent_str = f"${l['rent']:,}/mo" if l.get("rent") else "rent unknown"
            bed_str  = f"{l['bedrooms']}BR" if l.get("bedrooms") else "BR?"
            print(f"    {l.get('raw_text', '')[:60]}")
            print(f"    {rent_str}  {bed_str}  [{l.get('property_type', '?')}]  ({l.get('city', '?')})")
            print(f"    STATUS : VERIFIED — Direct Listing URL")
            print(f"    URL    : {l['listing_url']}")
            print()
    else:
        print("  No verified direct listing URLs found this run.")
        print("  Check the screenshots directory for page state.")

    if passing and not verified:
        print("\n  UNVERIFIED MATCHES (search/category page URLs):\n")
        for l in passing:
            if l.get("url_class") != "VERIFIED":
                print(f"    {l.get('raw_text', '')[:60]}")
                print(f"    URL: {l['listing_url']}")
                print(f"    STATUS: UNVERIFIED — {l.get('url_class', 'Unknown')}")
                print()

    print(sep)


# ── MAIN RUN ─────────────────────────────────────────────────────────────────

def run_housing_scout():
    print("=" * 66)
    print("  Housing Scout v2 — Browser Agent")
    print("  Sources: AffordableHousing.com, Craigslist")
    print("  Skipping (bot-blocked): " + ", ".join(KNOWN_BLOCKED_DOMAINS))
    print("=" * 66)

    run_record = {
        "started_at":          datetime.now().isoformat(),
        "manual_url_count":    len(MANUAL_LISTING_URLS),
        "known_blocked_domains": KNOWN_BLOCKED_DOMAINS,
        "source_results":      [],
        "manual_listings":     [],
    }

    # ── Manual URLs ──────────────────────────────────────────
    print(f"\n[MANUAL] Processing {len(MANUAL_LISTING_URLS)} direct URL(s)...")
    for url in MANUAL_LISTING_URLS:
        ok, reason = passes_filters({"listing_url": url})
        run_record["manual_listings"].append({
            "listing_url":   url,
            "url_class":     classify_url(url),
            "source_site":   url.split("/")[2] if "://" in url else url,
            "source_status": "MANUAL_DIRECT_URL",
            "passes_filters": True,  # manual URLs assumed to pass (user provided them)
            "filter_failure": None,
            "raw_text":      f"Manual: {url}",
            "city":          "Unknown",
            "property_type": "unknown",
            "bedrooms":      None,
            "bathrooms":     None,
            "rent":          None,
        })
        print(f"  + {url}")

    # ── Browser sources ──────────────────────────────────────
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=API_MODE, slow_mo=100 if API_MODE else 400)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()

        for source in SOURCES:
            print(f"\n[SOURCE] {source['name']}")
            print(f"  URL: {source['url']}")

            source_result = {
                "source_name":    source["name"],
                "source_url":     source["url"],
                "source_status":  "PENDING",
                "block_reason":   None,
                "listings":       [],
                "screenshot":     None,
                "scraped_at":     datetime.now().isoformat(),
            }

            try:
                response = page.goto(
                    source["url"],
                    wait_until="domcontentloaded",
                    timeout=30000,
                )
                page.wait_for_timeout(3000)

                # Check for bot block
                blocked, reason = is_bot_blocked(page, response)
                if blocked:
                    print(f"  [!!] BLOCKED: {reason}")
                    source_result["source_status"] = "BLOCKED_BY_BOT_CHECK"
                    source_result["block_reason"]  = reason
                    source_result["screenshot"]    = take_screenshot(page, source["name"])
                    run_record["source_results"].append(source_result)
                    continue

                # Take screenshot of accessible page
                source_result["screenshot"] = take_screenshot(page, source["name"])
                print(f"  Screenshot saved.")

                # Scrape listings
                scraper = source.get("scraper")
                raw_listings = []

                if scraper == "affordablehousing":
                    raw_listings = scrape_affordablehousing(page, source)
                elif scraper == "craigslist":
                    raw_listings = scrape_craigslist(page, source)

                # Apply filters to each listing
                for listing in raw_listings:
                    ok, fail_reason = passes_filters(listing)
                    listing["passes_filters"] = ok
                    listing["filter_failure"] = fail_reason

                # Classify the source status based on what was extracted
                if not raw_listings:
                    source_result["source_status"] = "ACCESSIBLE"
                    source_result["block_reason"]  = "Page loaded but 0 listings found — city may have no current inventory"
                    print(f"  [OK] ACCESSIBLE — 0 listings (no inventory this city)")
                elif all(l.get("url_class") == "SEARCH_PAGE" for l in raw_listings):
                    source_result["source_status"] = "SEARCH_ONLY"
                    source_result["block_reason"]  = "Page accessible but URLs are search/category pages, not individual listings"
                    print(f"  [~] SEARCH_ONLY — {len(raw_listings)} result(s), no direct listing URLs")
                else:
                    source_result["source_status"] = "ACCESSIBLE"
                    print(f"  [OK] ACCESSIBLE — {len(raw_listings)} listing(s) extracted.")

                source_result["listings"] = raw_listings

            except Exception as err:
                print(f"  [!!] FAILED: {err}")
                source_result["source_status"] = "FAILED"
                source_result["block_reason"]  = str(err)
                try:
                    source_result["screenshot"] = take_screenshot(page, source["name"])
                except Exception:
                    pass

            run_record["source_results"].append(source_result)

        browser.close()

    # ── Save & report ─────────────────────────────────────────
    run_record["finished_at"] = datetime.now().isoformat()
    save_run(run_record)
    print_run_report(run_record)
    print(f"\n[OK] Full results saved to: {RESULTS_FILE}")


if __name__ == "__main__":
    run_housing_scout()
