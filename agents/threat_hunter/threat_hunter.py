import ipaddress
import json
from pathlib import Path
from datetime import datetime

# ==========================
# DATA FILES
# ==========================

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(exist_ok=True)

LOG_FILE      = DATA_DIR / "scan_log.txt"
JSON_LOG_FILE = DATA_DIR / "scan_log.json"

# ==========================
# THREAT MODEL — IPv4
# ==========================

# Well-known public DNS resolvers (IPv4).
TRUSTED_RESOLVERS_V4 = {
    "8.8.8.8":          "Google Public DNS",
    "8.8.4.4":          "Google Public DNS",
    "1.1.1.1":          "Cloudflare DNS",
    "1.0.0.1":          "Cloudflare DNS",
    "9.9.9.9":          "Quad9 DNS",
    "149.112.112.112":  "Quad9 DNS",
    "208.67.222.222":   "OpenDNS",
    "208.67.220.220":   "OpenDNS",
    "4.2.2.1":          "Level3 DNS",
    "4.2.2.2":          "Level3 DNS",
    "4.2.2.3":          "Level3 DNS",
    "4.2.2.4":          "Level3 DNS",
    "4.2.2.5":          "Level3 DNS",
    "4.2.2.6":          "Level3 DNS",
}

# Well-known public DNS resolvers (IPv6).
TRUSTED_RESOLVERS_V6 = {
    "2001:4860:4860::8888": "Google Public DNS (IPv6)",
    "2001:4860:4860::8844": "Google Public DNS (IPv6)",
    "2606:4700:4700::1111": "Cloudflare DNS (IPv6)",
    "2606:4700:4700::1001": "Cloudflare DNS (IPv6)",
    "2620:fe::fe":           "Quad9 DNS (IPv6)",
    "2620:fe::9":            "Quad9 DNS (IPv6)",
    "2620:119:35::35":       "OpenDNS (IPv6)",
    "2620:119:53::53":       "OpenDNS (IPv6)",
}

# RFC 6598 — Shared/carrier-grade NAT space (IPv4 only).
_SHARED_CGN = ipaddress.ip_network("100.64.0.0/10")

# RFC 5737 — Documentation-only addresses (IPv4).
_TEST_NETS_V4 = [
    ipaddress.ip_network("192.0.2.0/24"),     # TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),  # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),   # TEST-NET-3
]

# RFC 1112 — Reserved for future IANA use (IPv4).
_RESERVED_FUTURE_V4 = ipaddress.ip_network("240.0.0.0/4")

# ==========================
# THREAT MODEL — IPv6
# ==========================

# RFC 3849 — Documentation-only prefix (IPv6).
_DOC_NET_V6 = ipaddress.ip_network("2001:db8::/32")

# RFC 4193 — Unique Local Addresses (ULA) — analogous to RFC 1918 private.
_ULA_V6 = ipaddress.ip_network("fc00::/7")

# RFC 3056 — 6to4 relay addresses (embeds IPv4 in IPv6).
_6TO4_V6 = ipaddress.ip_network("2002::/16")

# RFC 4380 — Teredo tunneling prefix.
_TEREDO_V6 = ipaddress.ip_network("2001::/32")

# RFC 6052 — IPv4-mapped/translated addresses.
_IPV4_MAPPED_V6 = ipaddress.ip_network("64:ff9b::/96")

# ==========================
# SESSION STATS
# ==========================

scan_count    = 0
high_count    = 0
medium_count  = 0
low_count     = 0
invalid_count = 0


# ==========================
# HELPERS
# ==========================

def banner():
    print("=" * 56)
    print("CyberCookieOS - Threat Hunter v7 (IPv4 + IPv6)")
    print("=" * 56)


def get_existing_cases():
    try:
        with open(JSON_LOG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def build_alert(threat):
    if threat == "High":
        return "HIGH RISK IP DETECTED"
    elif threat == "Medium":
        return "Suspicious activity detected"
    elif threat == "Low":
        return "Low risk scan recorded"
    return "No active threat detected"


def build_status(threat):
    if threat == "High":
        return "Investigating"
    elif threat == "Medium":
        return "Monitoring"
    return "Closed"


def build_recommendation(threat, ip_type, ip_version):
    v = f"IPv{ip_version}"
    if ip_type.startswith("Trusted DNS"):
        return f"Known public DNS resolver ({v}); no action required"
    if ip_type == "Documentation IP":
        return f"RFC documentation address ({v}) in live traffic — investigate for spoofing or misconfiguration"
    if ip_type == "Reserved IP":
        return f"Reserved address range ({v}) — investigate anomalous routing or misconfiguration"
    if ip_type in ("Link-Local IP", "Link-Local IPv6"):
        return f"Link-local address ({v}); no external threat — check DHCP/SLAAC if unexpected"
    if ip_type == "Shared Address Space":
        return "ISP carrier-grade NAT address (IPv4); no external threat"
    if ip_type in ("Private IP", "ULA (Private) IPv6"):
        return f"Internal/private address ({v}); no external threat"
    if ip_type == "Multicast IPv6":
        return "IPv6 multicast address; expected in local network control traffic — verify if seen externally"
    if ip_type == "6to4 Relay IPv6":
        return "IPv6-in-IPv4 tunnel address (6to4); investigate if found in unexpected context"
    if ip_type == "Teredo Tunnel IPv6":
        return "Teredo NAT traversal address; disable Teredo if not required to reduce attack surface"
    if ip_type == "IPv4-Mapped IPv6":
        return "IPv4-mapped IPv6 address; treat as the embedded IPv4 address for threat assessment"
    if threat == "High":
        return f"Block {v} address immediately and review recent logs"
    if threat == "Medium":
        return f"Unknown public {v} — run through threat intel feeds before acting"
    if threat == "Low":
        return "No immediate action required"
    return "No action required"


# ==========================
# CLASSIFIER
# ==========================

def classify_ip(address):
    """
    Returns (ip_type: str, threat: str, score: int)
    Works for both IPv4Address and IPv6Address objects.
    """
    ip_str   = str(address)
    version  = address.version   # 4 or 6

    # ── Loopback ──────────────────────────────────────────
    if address.is_loopback:
        return "Loopback", "None", 0

    # ── Multicast (IPv6 only meaningful externally) ───────
    if address.is_multicast:
        label = "Multicast IPv6" if version == 6 else "Multicast IP"
        return label, "Low", 5

    # ── IPv6-specific special ranges ──────────────────────
    if version == 6:
        if address in _DOC_NET_V6:
            return "Documentation IP", "High", 85
        if address in _ULA_V6:
            return "ULA (Private) IPv6", "Low", 5
        if address.is_link_local:
            return "Link-Local IPv6", "Low", 5
        if ip_str in TRUSTED_RESOLVERS_V6:
            return f"Trusted DNS ({TRUSTED_RESOLVERS_V6[ip_str]})", "Low", 5
        if address in _IPV4_MAPPED_V6:
            return "IPv4-Mapped IPv6", "Low", 10
        if address in _TEREDO_V6:
            return "Teredo Tunnel IPv6", "Medium", 45
        if address in _6TO4_V6:
            return "6to4 Relay IPv6", "Medium", 40
        # Generic public IPv6
        return "Public IPv6", "Medium", 40

    # ── IPv4-specific ranges ───────────────────────────────
    # Check narrow special-use ranges BEFORE is_private because Python 3.11+
    # expanded is_private to include RFC 5737 (documentation) and other ranges.
    if any(address in net for net in _TEST_NETS_V4):
        return "Documentation IP", "High", 85
    if address in _RESERVED_FUTURE_V4:
        return "Reserved IP", "Medium", 55
    if address in _SHARED_CGN:
        return "Shared Address Space", "Low", 5
    if ip_str in TRUSTED_RESOLVERS_V4:
        return f"Trusted DNS ({TRUSTED_RESOLVERS_V4[ip_str]})", "Low", 5
    if address.is_loopback:
        return "Loopback", "None", 0
    if address.is_link_local:
        return "Link-Local IP", "Low", 5
    if address.is_private:
        return "Private IP", "Low", 5

    return "Public IP", "Medium", 40


# ==========================
# SCAN
# ==========================

def scan_ip(ip):
    global scan_count, high_count, medium_count, low_count

    # Parse — accepts both IPv4 and IPv6 (including bracket notation)
    ip_clean = ip.strip().strip("[]")
    address  = ipaddress.ip_address(ip_clean)
    version  = address.version

    ip_type, threat, score = classify_ip(address)

    # Adjust global counters (loopback counts as None threat)
    if threat == "High":
        high_count += 1
    elif threat == "Medium":
        medium_count += 1
    elif threat == "Low":
        low_count += 1

    scan_count += 1

    alert          = build_alert(threat)
    status         = build_status(threat)
    recommendation = build_recommendation(threat, ip_type, version)

    print("\nScanning...\n")
    print(f"IP Address : {address}")
    print(f"IP Version : IPv{version}")
    print(f"Type       : {ip_type}")
    print(f"Threat     : {threat}")
    print(f"Score      : {score}/100")
    print(f"Agent      : Agent 001")
    print(f"Status     : {status}")
    print(f"Alert      : {alert}")
    print(f"Recommend  : {recommendation}")

    save_log(address, ip_type, threat, score, version)
    print("\n[OK] Case saved successfully!")


# ==========================
# LOGGING
# ==========================

def save_log(address, ip_type, threat, score, version):
    timestamp       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    existing_cases  = get_existing_cases()
    case_id         = len(existing_cases) + 1

    alert          = build_alert(threat)
    status         = build_status(threat)
    recommendation = build_recommendation(threat, ip_type, version)

    text_entry = (
        f"Case #{case_id:04d} | {timestamp} | {address} | IPv{version} | "
        f"{ip_type} | {threat} | Score: {score} | "
        f"Alert: {alert} | Status: {status}\n"
    )

    json_entry = {
        "case_id":        case_id,
        "timestamp":      timestamp,
        "ip":             str(address),
        "ip_version":     version,
        "type":           ip_type,
        "threat":         threat,
        "score":          score,
        "alert":          alert,
        "status":         status,
        "agent":          "Agent 001",
        "recommendation": recommendation,
    }

    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(text_entry)

    existing_cases.append(json_entry)

    with open(JSON_LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_cases, f, indent=4)


# ==========================
# MENU ACTIONS
# ==========================

def view_logs():
    print("\n========== Scan History ==========\n")
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as log:
            history = log.read()
            if history.strip():
                print(history)
            else:
                print("No scans saved yet.")
    except FileNotFoundError:
        print("No scan log found yet.")


def search_logs():
    keyword = input("\nSearch logs (IP, threat, score, case ID): ").strip()
    if not keyword:
        print("Search cancelled.")
        return
    print("\n========== Search Results ==========\n")
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as log:
            matches = [line for line in log if keyword.lower() in line.lower()]
        if matches:
            for m in matches:
                print(m.strip())
        else:
            print("No matching logs found.")
    except FileNotFoundError:
        print("No scan log found yet.")


def show_stats():
    print("\n========== Session Stats ==========\n")
    print(f"Total scans   : {scan_count}")
    print(f"High threats  : {high_count}")
    print(f"Medium threats: {medium_count}")
    print(f"Low threats   : {low_count}")
    print(f"Invalid       : {invalid_count}")


def menu():
    print("\nWhat do you want to do?")
    print("1. Scan an IP address (IPv4 or IPv6)")
    print("2. View scan history")
    print("3. Search scan logs")
    print("4. Show session stats")
    print("5. Quit")


# ==========================
# MAIN
# ==========================

def main():
    global invalid_count

    banner()

    while True:
        menu()
        choice = input("\nChoose an option: ").strip()

        if choice == "1":
            ip = input("\nEnter an IP address (IPv4 or IPv6): ").strip()
            if not ip:
                print("No IP entered.")
                continue
            try:
                scan_ip(ip)
            except ValueError:
                invalid_count += 1
                print("[!] Invalid IP address. Please try again.")
            except Exception as e:
                print(f"[!] Unexpected error: {e}")

        elif choice == "2":
            view_logs()
        elif choice == "3":
            search_logs()
        elif choice == "4":
            show_stats()
        elif choice == "5":
            print("\nFinal session summary:")
            show_stats()
            print("\nThreat Hunter shutting down...")
            break
        else:
            print("Invalid choice. Pick 1-5.")


if __name__ == "__main__":
    main()
