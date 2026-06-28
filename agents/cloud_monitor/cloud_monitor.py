#!/usr/bin/env python3
"""
CyberCookieOS — Cloud Monitor (Skeleton v0.1)
Cloud infrastructure and security event monitoring.
NOTE: Cloud provider integration not yet implemented.
"""
import json
import os
from datetime import datetime, timedelta

BASE_DIR     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR     = os.path.join(BASE_DIR, "data")
CONFIG_FILE  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
RESULTS_FILE = os.path.join(DATA_DIR, "cloud_monitor_results.json")
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


def generate_sample_events():
    now = datetime.now()
    return [
        {
            "event_id":  "evt_001",
            "type":      "security",
            "severity":  "medium",
            "title":     "IAM login from new location",
            "source":    "aws_cloudwatch",
            "timestamp": (now - timedelta(hours=1)).isoformat(),
            "resolved":  False,
            "note":      SAMPLE_NOTICE,
        },
        {
            "event_id":  "evt_002",
            "type":      "cost",
            "severity":  "low",
            "title":     "S3 data transfer spike (+18%)",
            "source":    "aws_cloudwatch",
            "timestamp": (now - timedelta(hours=3)).isoformat(),
            "resolved":  True,
            "note":      SAMPLE_NOTICE,
        },
        {
            "event_id":  "evt_003",
            "type":      "security",
            "severity":  "high",
            "title":     "Dependabot: critical CVE in dependency",
            "source":    "github_security",
            "timestamp": (now - timedelta(hours=6)).isoformat(),
            "resolved":  False,
            "note":      SAMPLE_NOTICE,
        },
    ]


def run():
    config   = load_config()
    agent_id = config["agent_id"]
    print(f"[Cloud Monitor] {config['agent_name']} v{config['version']}")

    update_status(agent_id, "running", task="Generating sample cloud/security events")
    print("[Cloud Monitor] Status: RUNNING")

    events = generate_sample_events()

    results = {
        "data_notice":     SAMPLE_NOTICE,
        "generated_at":    datetime.now().isoformat(),
        "agent":           "Cloud Monitor",
        "version":         config["version"],
        "sources_planned": config["sources"],
        "event_count":     len(events),
        "critical_count":  sum(1 for e in events if e["severity"] == "high"),
        "unresolved_count": sum(1 for e in events if not e["resolved"]),
        "events":          events,
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"[Cloud Monitor] Results saved -> {RESULTS_FILE}")

    update_status(agent_id, "completed", message=f"Scanned {len(events)} sample events")
    print("[Cloud Monitor] Status: COMPLETED")


if __name__ == "__main__":
    run()
