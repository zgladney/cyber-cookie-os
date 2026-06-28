# 🩷 CyberCookieOS

CyberCookieOS is a cyber operations simulator that combines Python automation with an interactive web-based Security Operations Center (SOC).

The project is being built as my cybersecurity capstone and portfolio project. Instead of creating standalone scripts, CyberCookieOS brings multiple autonomous agents together inside a virtual headquarters where each agent performs a specific task.

---

# Current Version

**v1.0.0-alpha**

---

# How to Run

```bash
python launch.py
```

This starts a local server on port 8080 and opens the dashboard automatically.
Dashboard URL: http://localhost:8080/hq/index.html

Press Ctrl+C to stop the server.

---

# Current Features

## 🛡️ Agent 001 – Threat Hunter

- Scan IPv4 addresses
- Determine IP type
- Generate threat scores
- Create investigation cases
- Assign investigations to Agent 001
- Generate recommendations
- Save TXT logs
- Save JSON incident database
- Search previous investigations
- Display session statistics

---

## 🏢 CyberCookieOS HQ

- Interactive cyber headquarters
- Animated Agent 001
- Live Threat Hunter dashboard
- Event feed
- Active alert system
- Automatic dashboard refresh
- Reads live JSON investigation data
- Investigation status tracking

---

# Tech Stack

## Python

- ipaddress
- json
- datetime

## Frontend

- HTML5
- CSS3
- JavaScript

## Version Control

- Git
- GitHub

---

# Project Architecture

```
Python Threat Hunter
        │
        ▼
scan_log.json
        │
        ▼
CyberCookieOS Dashboard
        │
        ▼
Agent 001
```

---

# Roadmap

## Phase 1 ✅

- Threat Hunter
- Live Dashboard
- JSON Logging
- Autonomous Agent 001
- Cyber HQ

---

## Phase 2 ✅

### Agent 002 — Apartment Hunter

Features built:

- Filter by max rent budget
- Filter by pet-friendly requirement
- Filter by housing voucher acceptance
- Filter by preferred cities
- Filter by minimum bedrooms
- Score and rank matches 0–100
- Save ranked results to JSON
- Apartment Hunter room in CyberCookieOS HQ
- HQ Hallway connecting rooms
- Live panel updates from apartment_results.json

How to run:

```bash
cd agents/apartment_hunter
python apartment_hunter.py
```

Results saved to: `data/apartment_results.json`

Apartment Hunter room: `http://localhost:8080/apartment/index.html`

HQ Hallway: `http://localhost:8080/hallway/index.html`

Sample data note:

`data/apartments.json` contains 15 sample listings for Burlington County, NJ
(Willingboro, Mount Laurel, Marlton, Southampton). These are fictional listings
for development and demo purposes. The `listing_url` field on each listing
points to a real estate search page for that city. To use real listings:
replace `listing_url` values with actual property URLs from Zillow, Realtor.com,
or Apartments.com, and update the other fields to match real listings.

Features planned:

- Live apartment scraping
- Daily update scheduler
- Save favorites
- Email alerts for new matches

---

## Phase 3

Additional autonomous agents

- Calendar Agent
- Email Agent
- Cloud Agent
- Etsy Agent
- Passive Income Agent

---

# Future Vision

CyberCookieOS will evolve into a complete personal cyber operating system where autonomous agents perform real-world tasks while reporting back to a centralized headquarters.

Examples include:

- Cybersecurity investigations
- Housing searches
- Calendar management
- Email monitoring
- Cloud monitoring
- Automation workflows

---

# 📸 Screenshots

## CyberCookieOS HQ

![HQ](screenshots/hq-room.png)

---

## Threat Hunter Dashboard

![Dashboard](screenshots/dashboard.png)

---

## Agent 001

![Agent](screenshots/agent001.png)

---

## Python Threat Hunter

![Python](screenshots/python-scan.png)

---

## Live Event Feed

![Feed](screenshots/event-feed.png)

---

# Installation

Clone the repository

```bash
git clone https://github.com/zgladney/cyber-cookie-os.git
```

Run the Python Threat Hunter

```bash
python threat_hunter.py
```

Open the HQ

```
hq/index.html
```

---

# Author

**Zimiah Gladney**

Cybersecurity Student

Building CyberCookieOS one autonomous agent at a time.
