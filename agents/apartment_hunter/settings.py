# ============================================================
# CyberCookieOS — Apartment Hunter Agent 002
# Search Parameters — Edit these to customize your search
# ============================================================

SETTINGS = {

    # ── BUDGET ───────────────────────────────────────────────
    # Maximum monthly rent you are willing to pay
    "max_rent": 2100,

    # ── LOCATION ─────────────────────────────────────────────
    # Cities to search — leave empty [] to search all cities
    "preferred_cities": [
        "Willingboro",
        "Mount Laurel",
        "Marlton",
        "Southampton",
    ],

    # ── UNIT REQUIREMENTS ────────────────────────────────────
    # Minimum number of bedrooms required (hard filter — no studios or 1BR)
    "bedrooms_min": 2,

    # ── DEAL-BREAKERS (hard filters) ─────────────────────────
    # Apartment MUST allow pets
    "pet_friendly_required": True,

    # Apartment MUST accept housing vouchers / Section 8
    "voucher_friendly_required": True,
    "accepts_housing_vouchers": True,

    # Apartment MUST be family-friendly (not age-restricted)
    "family_friendly_required": True,

    # Reject all senior/age-restricted housing
    "no_senior_housing": True,

    # Only accept these property types
    # Excluded: apartment, apartment_complex, apartment_building, senior_housing, studio
    "allowed_property_types": ["house", "townhouse", "condo"],

}
