# ============================================================
# CyberCookieOS — Apartment Hunter Agent 002
# Ranking — Scores each apartment 0–100 based on fit
# ============================================================

from settings import SETTINGS


# Property type preference score (higher = better for family living)
PROPERTY_TYPE_SCORES = {
    "house":      30,
    "townhouse":  22,
    "condo":      14,
    "apartment":  8,
}


def score_apartment(apt):
    """
    Score an apartment from 0 to 100.

    Points breakdown:
      Budget headroom   : 0–30 pts  (more savings below max_rent = more points)
      Property type     : 0–30 pts  (house > townhouse > condo > apartment)
      Pet friendly      : 15 pts    (confirmed match on required criterion)
      Voucher accepted  : 15 pts    (confirmed match on required criterion)
      Extra bedrooms    : 0–10 pts  (bonus for 3BR or 4+BR above minimum)
    """
    score = 0

    # Budget headroom (0–30): how much under max_rent
    max_rent = SETTINGS["max_rent"]
    margin = max_rent - apt["rent"]
    if margin >= 0:
        score += min(30, int((margin / max_rent) * 60))

    # Property type preference (0–30)
    score += PROPERTY_TYPE_SCORES.get(apt.get("property_type", "apartment"), 8)

    # Pet friendly confirmed (15)
    if apt.get("pet_friendly"):
        score += 15

    # Voucher accepted confirmed (15)
    if apt.get("voucher_accepted"):
        score += 15

    # Extra bedrooms beyond minimum (0–10)
    min_br = SETTINGS.get("bedrooms_min", 2)
    extra_br = apt.get("bedrooms", min_br) - min_br
    if extra_br == 1:
        score += 6
    elif extra_br >= 2:
        score += 10

    return min(100, score)


def rank_apartments(apartments):
    """Score every apartment and return them sorted best-first."""
    scored = []
    for apt in apartments:
        entry = dict(apt)
        entry["score"] = score_apartment(apt)
        scored.append(entry)
    return sorted(scored, key=lambda x: x["score"], reverse=True)
