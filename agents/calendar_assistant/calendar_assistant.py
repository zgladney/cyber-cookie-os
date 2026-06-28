#!/usr/bin/env python3
"""
CyberCookieOS — Calendar Assistant (Skeleton v0.1)
Schedule management and reminder generation.
NOTE: Calendar integration not yet implemented.
"""
import json
import os
from datetime import datetime, timedelta

BASE_DIR     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR     = os.path.join(BASE_DIR, "data")
CONFIG_FILE  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
RESULTS_FILE = os.path.join(DATA_DIR, "calendar_results.json")
STATUS_FILE  = os.path.join(DATA_DIR, "agent_status.json")

SAMPLE_NOTICE = "SAMPLE DATA - FOR TESTING ONLY"


def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def update_status(agent_id, status, task=None, message=None):
    data = {}
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    data.setdefault("agents", {})
    existing = data["agents"].get(agent_id, {})
    data["agents"][agent_id] = {
        "status":       status,
        "current_task": task,
        "last_run":     datetime.now().isoformat() if status == "running" else existing.get("last_run"),
        "message":      message or status,
    }
    data["last_updated"] = datetime.now().isoformat()
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def generate_sample_reminders():
    now = datetime.now()
    return [
        {
            "id":       "rem_001",
            "title":    "Check housing leads",
            "due":      (now + timedelta(hours=2)).isoformat(),
            "calendar": "personal",
            "priority": "high",
            "note":     SAMPLE_NOTICE,
        },
        {
            "id":       "rem_002",
            "title":    "Review Etsy listing drafts",
            "due":      (now + timedelta(days=1)).isoformat(),
            "calendar": "work",
            "priority": "medium",
            "note":     SAMPLE_NOTICE,
        },
        {
            "id":       "rem_003",
            "title":    "Monthly goal review",
            "due":      (now + timedelta(days=3)).isoformat(),
            "calendar": "goals",
            "priority": "medium",
            "note":     SAMPLE_NOTICE,
        },
    ]


def run():
    config   = load_config()
    agent_id = config["agent_id"]
    print(f"[Calendar Assistant] {config['agent_name']} v{config['version']}")

    update_status(agent_id, "running", task="Generating sample schedule reminders")
    print("[Calendar Assistant] Status: RUNNING")

    reminders = generate_sample_reminders()

    results = {
        "data_notice":    SAMPLE_NOTICE,
        "generated_at":   datetime.now().isoformat(),
        "agent":          "Calendar Assistant",
        "version":        config["version"],
        "calendars":      config["calendars"],
        "reminder_count": len(reminders),
        "reminders":      reminders,
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"[Calendar Assistant] Results saved -> {RESULTS_FILE}")

    update_status(agent_id, "completed", message=f"Generated {len(reminders)} sample reminders")
    print("[Calendar Assistant] Status: COMPLETED")


if __name__ == "__main__":
    run()
