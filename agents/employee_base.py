#!/usr/bin/env python3
"""
CyberCookieOS — Employee Base Class
All AI employees inherit from this base for consistent lifecycle, status
reporting, and result saving.
"""

import json
import os
from datetime import datetime
from pathlib import Path

BASE_DIR    = Path(__file__).resolve().parent.parent
DATA_DIR    = BASE_DIR / "data"
STATUS_FILE = DATA_DIR / "agent_status.json"

DATA_DIR.mkdir(exist_ok=True)

SAMPLE_NOTICE = "SAMPLE DATA — FOR TESTING ONLY"

STATUS_COLORS = {
    "running":   "\033[93m",
    "idle":      "\033[96m",
    "completed": "\033[92m",
    "blocked":   "\033[91m",
    "failed":    "\033[91m",
}
RESET = "\033[0m"
BOLD  = "\033[1m"


class Employee:
    """
    Base class for every CyberCookieOS AI employee.

    Subclasses implement `run_duties()` and return a dict of results.
    The base handles status updates, result saving, and lifecycle logging.
    """

    name:       str = "Employee"
    title:      str = "AI Employee"
    department: str = "operations"
    agent_id:   str = "employee"
    version:    str = "1.0.0"
    reports_to: str = "Operations Center"

    def __init__(self):
        self.results_file = str(DATA_DIR / f"{self.agent_id}_results.json")

    # ── STATUS ────────────────────────────────────────────────

    def _load_status(self):
        if not STATUS_FILE.exists():
            return {"agents": {}}
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, ValueError):
            return {"agents": {}}

    def _save_status(self, data):
        data["last_updated"] = datetime.now().isoformat()
        with open(STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def update_status(self, status, task=None, message=None):
        data = self._load_status()
        data.setdefault("agents", {})
        existing = data["agents"].get(self.agent_id, {})
        data["agents"][self.agent_id] = {
            "status":       status,
            "current_task": task,
            "last_run":     datetime.now().isoformat() if status == "running" else existing.get("last_run"),
            "message":      message or status,
        }
        self._save_status(data)

    # ── RESULTS ───────────────────────────────────────────────

    def save_results(self, payload):
        os.makedirs(os.path.dirname(self.results_file), exist_ok=True)
        with open(self.results_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

    # ── LOGGING ───────────────────────────────────────────────

    def log(self, msg, color=None):
        c = STATUS_COLORS.get(color, "")
        print(f"{c}[{self.name}] {msg}{RESET}")

    def banner(self):
        line = "=" * 56
        print(f"\n{BOLD}{line}{RESET}")
        print(f"{BOLD}  CyberCookieOS — {self.name}{RESET}")
        print(f"  {self.title} | {self.department.upper()} DEPT")
        print(f"  Reports to: {self.reports_to}")
        print(f"  Version: {self.version}")
        print(f"{BOLD}{line}{RESET}\n")

    # ── LIFECYCLE ─────────────────────────────────────────────

    def run_duties(self):
        """
        Subclasses override this to perform real or placeholder work.
        Must return a dict; keys become the results payload body.
        """
        raise NotImplementedError(f"{self.name} must implement run_duties()")

    def execute(self):
        """Full employee work cycle: load → run → save → complete."""
        self.banner()
        self.log(f"Starting duty cycle...", color="running")
        self.update_status("running", task=f"{self.title} duty cycle")

        try:
            result_data = self.run_duties()
        except Exception as exc:
            self.log(f"Error during duties: {exc}", color="failed")
            self.update_status("failed", message=str(exc))
            raise

        payload = {
            "agent":        self.name,
            "agent_id":     self.agent_id,
            "title":        self.title,
            "department":   self.department,
            "version":      self.version,
            "generated_at": datetime.now().isoformat(),
            **result_data,
        }

        self.save_results(payload)
        self.log(f"Results saved → {self.results_file}")
        self.update_status("completed", message=f"{self.name} completed duty cycle")
        self.log("Duty cycle complete. Status: COMPLETED", color="completed")
        return payload


class PlaceholderEmployee(Employee):
    """
    Generic placeholder employee.  Produces sample output and proves
    the architecture works without any real external calls.
    """

    placeholder_items: list = []
    result_key:        str  = "items"

    def run_duties(self):
        items = [{**item, "note": SAMPLE_NOTICE} for item in self.placeholder_items]
        self.log(f"Generated {len(items)} placeholder {self.result_key}")
        return {
            "data_notice": SAMPLE_NOTICE,
            "count":       len(items),
            self.result_key: items,
        }


# ── CONVENIENCE HELPERS ───────────────────────────────────────

def load_employee_config(employee_id):
    config_path = BASE_DIR / "employees" / employee_id / "config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def load_employee_profile(employee_id):
    profile_path = BASE_DIR / "employees" / employee_id / "profile.json"
    if profile_path.exists():
        with open(profile_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}
