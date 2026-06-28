# ============================================================
# CyberCookieOS — Apartment Hunter Agent 002
# Filters — Each function removes listings that fail a hard rule
# ============================================================

from settings import SETTINGS


def filter_by_budget(apartments):
    """Remove apartments where rent exceeds max_rent."""
    return [a for a in apartments if a["rent"] <= SETTINGS["max_rent"]]


def filter_by_bedrooms(apartments):
    """Remove apartments with fewer bedrooms than bedrooms_min (no studios, no 1BR)."""
    minimum = SETTINGS.get("bedrooms_min", 2)
    return [a for a in apartments if a["bedrooms"] >= minimum]


def filter_by_pets(apartments):
    """If pet_friendly_required, remove listings that do not allow pets."""
    if not SETTINGS.get("pet_friendly_required"):
        return apartments
    return [a for a in apartments if a.get("pet_friendly")]


def filter_by_voucher(apartments):
    """If voucher_friendly_required, remove listings that do not accept housing vouchers."""
    if not SETTINGS.get("voucher_friendly_required"):
        return apartments
    return [a for a in apartments if a.get("voucher_accepted")]


def filter_by_family_friendly(apartments):
    """If family_friendly_required, remove listings that are not family-friendly."""
    if not SETTINGS.get("family_friendly_required"):
        return apartments
    return [a for a in apartments if a.get("family_friendly")]


def filter_by_senior_housing(apartments):
    """If no_senior_housing, remove all age-restricted / senior-only listings."""
    if not SETTINGS.get("no_senior_housing"):
        return apartments
    return [a for a in apartments if not a.get("is_senior_housing", False)]


def filter_by_property_type(apartments):
    """Only keep listings whose property type is in allowed_property_types."""
    allowed = SETTINGS.get("allowed_property_types", [])
    if not allowed:
        return apartments
    return [a for a in apartments if a.get("property_type") in allowed]


def filter_by_city(apartments):
    """If preferred_cities is set, only keep apartments in those cities."""
    cities = SETTINGS.get("preferred_cities", [])
    if not cities:
        return apartments
    return [a for a in apartments if a.get("city") in cities]


def apply_all_filters(apartments):
    """Run every hard filter in order and return what survives."""
    results = apartments
    results = filter_by_budget(results)
    results = filter_by_bedrooms(results)
    results = filter_by_pets(results)
    results = filter_by_voucher(results)
    results = filter_by_family_friendly(results)
    results = filter_by_senior_housing(results)
    results = filter_by_property_type(results)
    results = filter_by_city(results)
    return results
