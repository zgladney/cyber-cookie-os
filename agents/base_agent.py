#!/usr/bin/env python3
"""
CyberCookieOS - Shared Agent Utilities
Base lifecycle shared by all placeholder agents.
"""
import json
import os
from datetime import datetime
from pathlib import Path

BASE_DIR    = Path(__file__).resolve().parent.parent
DATA_DIR    = str(BASE_DIR / "data")
STATUS_FILE = str(BASE_DIR / "data" / "agent_status.json")

SAMPLE_NOTICE = "SAMPLE DATA - FOR TESTING ONLY"


def load_config(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def update_status(agent_id, status, task=None, message=None):
    data = {}
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except (json.JSONDecodeError, ValueError):
                data = {}
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


def save_results(results_file, data):
    os.makedirs(os.path.dirname(results_file), exist_ok=True)
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def placeholder_lifecycle(agent_id, agent_name, version, task_label, result_key, items, results_file):
    """Standard skeleton lifecycle: running -> generate -> save -> completed."""
    print(f"[{agent_name}] Starting...")
    update_status(agent_id, "running", task=task_label)
    print(f"[{agent_name}] Status: RUNNING")

    labeled_items = [{**item, "note": SAMPLE_NOTICE} for item in items]

    results = {
        "data_notice":  SAMPLE_NOTICE,
        "generated_at": datetime.now().isoformat(),
        "agent":        agent_name,
        "version":      version,
        "count":        len(labeled_items),
        result_key:     labeled_items,
    }

    save_results(results_file, results)
    print(f"[{agent_name}] Results saved -> {results_file}")

    update_status(agent_id, "completed", message=f"Generated {len(labeled_items)} sample {result_key}")
    print(f"[{agent_name}] Status: COMPLETED")
