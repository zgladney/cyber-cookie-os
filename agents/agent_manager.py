#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CyberCookieOS - Agent Manager
Central control panel for all registered agents.
"""
import json
import os
import subprocess
import sys
from datetime import datetime

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR       = os.path.join(BASE_DIR, "data")
REGISTRY_FILE  = os.path.join(DATA_DIR, "agents_registry.json")
STATUS_FILE    = os.path.join(DATA_DIR, "agent_status.json")

# ANSI colors
CYAN    = "\033[96m"
YELLOW  = "\033[93m"
GREEN   = "\033[92m"
RED     = "\033[91m"
DIM     = "\033[2m"
BOLD    = "\033[1m"
RESET   = "\033[0m"

STATUS_COLOR = {
    "idle":      CYAN,
    "running":   YELLOW,
    "blocked":   RED,
    "completed": GREEN,
    "failed":    RED,
}
STATUS_ICON = {
    "idle":      "o",
    "running":   ">",
    "blocked":   "X",
    "completed": "+",
    "failed":    "X",
}


def load_registry():
    with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_status():
    if not os.path.exists(STATUS_FILE):
        return {"agents": {}}
    with open(STATUS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_status(data):
    data["last_updated"] = datetime.now().isoformat()
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def set_agent_status(agent_id, status, task=None, message=None):
    data = load_status()
    data.setdefault("agents", {})
    existing = data["agents"].get(agent_id, {})
    data["agents"][agent_id] = {
        "status":       status,
        "current_task": task,
        "last_run":     datetime.now().isoformat() if status == "running" else existing.get("last_run"),
        "message":      message or status,
    }
    save_status(data)


def fmt_status(s):
    color = STATUS_COLOR.get(s, "")
    icon  = STATUS_ICON.get(s, "?")
    return f"{color}{icon} {s.upper():<12}{RESET}"


def fmt_time(ts):
    if not ts:
        return f"{DIM}never{RESET}"
    try:
        return datetime.fromisoformat(ts).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(ts)[:16]


def print_header():
    print(f"\n{BOLD}{'=' * 70}{RESET}")
    print(f"{BOLD}  CyberCookieOS - Agent Manager{RESET}")
    print(f"  {DIM}Registry: {REGISTRY_FILE}{RESET}")
    print(f"{'=' * 70}")


def list_agents(registry, status_data):
    agents   = registry.get("agents", [])
    statuses = status_data.get("agents", {})

    print(f"\n  {BOLD}{'#':<4}{'AGENT':<22}{'STATUS':<22}{'LAST RUN':<20}{'ROOM'}{RESET}")
    print(f"  {'-' * 66}")

    for i, ag in enumerate(agents, start=1):
        aid  = ag["id"]
        st   = statuses.get(aid, {})
        row_status = fmt_status(st.get("status", "idle"))
        last = fmt_time(st.get("last_run"))
        room = ag.get("room", "-")
        msg  = st.get("message", "")
        enabled_tag = "" if ag.get("enabled", True) else f" {RED}[disabled]{RESET}"
        print(f"  [{i}] {ag['name']:<20} {row_status} {last:<20} {room}{enabled_tag}")
        if msg and msg not in ("idle", "running", "completed", "failed", "blocked"):
            print(f"       {DIM}{msg}{RESET}")

    print()


def run_agent(ag):
    agent_id = ag["id"]
    script   = os.path.join(BASE_DIR, ag["script_path"])

    if not os.path.exists(script):
        print(f"\n  {RED}[!] Script not found:{RESET} {script}")
        return

    if not ag.get("enabled", True):
        print(f"\n  {RED}[!] Agent '{ag['name']}' is disabled.{RESET}")
        return

    print(f"\n  {YELLOW}> Running: {ag['name']}{RESET}")
    print(f"  {DIM}Script: {ag['script_path']}{RESET}\n")
    print(f"  {'-' * 66}")

    set_agent_status(agent_id, "running", task="Started by Agent Manager")
    result = subprocess.run([sys.executable, script])

    if result.returncode == 0:
        set_agent_status(agent_id, "completed", message="Finished successfully")
        print(f"\n  {'-' * 66}")
        print(f"  {GREEN}[OK] {ag['name']} completed.{RESET}")
    else:
        set_agent_status(agent_id, "failed", message=f"Exit code {result.returncode}")
        print(f"\n  {'-' * 66}")
        print(f"  {RED}[!!] {ag['name']} failed (exit {result.returncode}).{RESET}")


def main():
    print_header()

    if not os.path.exists(REGISTRY_FILE):
        print(f"\n  {RED}[!] Registry not found:{RESET} {REGISTRY_FILE}")
        sys.exit(1)

    registry = load_registry()
    agents   = registry.get("agents", [])

    while True:
        status_data = load_status()
        list_agents(registry, status_data)

        cmd_hint = "  ".join(f"[{i}]" for i in range(1, len(agents) + 1))
        print(f"  Commands: {cmd_hint}  [r] refresh  [q] quit")
        try:
            cmd = input(f"\n  {BOLD}>{RESET} ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print(f"\n\n  {DIM}Exiting Agent Manager.{RESET}\n")
            break

        if cmd == "q":
            print(f"\n  {DIM}Exiting Agent Manager.{RESET}\n")
            break
        elif cmd == "r" or cmd == "":
            continue
        elif cmd.isdigit():
            idx = int(cmd)
            if 1 <= idx <= len(agents):
                run_agent(agents[idx - 1])
            else:
                print(f"\n  {RED}[!] No agent #{idx}.{RESET}")
        else:
            print(f"\n  {DIM}Unknown command: {cmd}{RESET}")


if __name__ == "__main__":
    main()
