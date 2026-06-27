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

LOG_FILE = DATA_DIR / "scan_log.txt"
JSON_LOG_FILE = DATA_DIR / "scan_log.json"

# ==========================
# THREAT MODEL
# ==========================

# Well-known public DNS resolvers verified by their operators.
# These IPs are safe by definition and should never be flagged as threats.
TRUSTED_RESOLVERS = {
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

# RFC 6598 — Shared address space used by ISPs for carrier-grade NAT.
# Behaves like private space; never externally routable.
_SHARED_CGN = ipaddress.ip_network("100.64.0.0/10")

# RFC 5737 — Reserved exclusively for documentation and examples.
# Seeing these in live traffic indicates packet spoofing or misconfiguration.
_TEST_NETS = [
    ipaddress.ip_network("192.0.2.0/24"),     # TEST-NET-1
    ipaddress.ip_network("198.51.100.0/24"),  # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),   # TEST-NET-3
]

# RFC 1112 — Reserved for future IANA use; never legitimately routed.
_RESERVED_FUTURE = ipaddress.ip_network("240.0.0.0/4")

scan_count = 0
high_count = 0
medium_count = 0
low_count = 0
invalid_count = 0


def banner():
    print("=" * 50)
    print("🛡️ CyberCookieOS - Threat Hunter v6")
    print("=" * 50)


def get_existing_cases():
    try:
        with open(JSON_LOG_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
            return data
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []


def build_alert(threat):
    if threat == "High":
        return "HIGH RISK IP DETECTED"
    elif threat == "Medium":
        return "Suspicious activity detected"
    elif threat == "Low":
        return "Low risk scan recorded"
    else:
        return "No active threat detected"


def build_status(threat):
    if threat == "High":
        return "Investigating"
    elif threat == "Medium":
        return "Monitoring"
    elif threat == "Low":
        return "Closed"
    else:
        return "Closed"


def build_recommendation(threat, ip_type):
    if ip_type.startswith("Trusted DNS"):
        return "Known public DNS resolver; no action required"
    elif ip_type == "Documentation IP":
        return "RFC 5737 documentation address detected in live traffic — investigate for packet spoofing or misconfiguration"
    elif ip_type == "Reserved IP":
        return "Reserved address range (RFC 1112) — investigate anomalous routing or misconfiguration"
    elif ip_type == "Link-Local IP":
        return "Link-local address; no external threat — check for DHCP issues if unexpected"
    elif ip_type == "Shared Address Space":
        return "ISP carrier-grade NAT address; no external threat"
    elif ip_type == "Private IP":
        return "Internal/private IP detected; no external threat"
    elif threat == "High":
        return "Block IP immediately and review recent logs"
    elif threat == "Medium":
        return "Unknown public IP — run through threat intel feeds before acting"
    elif threat == "Low":
        return "No immediate action required"
    else:
        return "No action required"


def save_log(address, ip_type, threat, score):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    existing_cases = get_existing_cases()
    case_id = len(existing_cases) + 1

    alert = build_alert(threat)
    status = build_status(threat)
    recommendation = build_recommendation(threat, ip_type)

    text_entry = (
        f"Case #{case_id:04d} | {timestamp} | {address} | {ip_type} | "
        f"{threat} | Score: {score} | Alert: {alert} | Status: {status}\n"
    )

    json_entry = {
        "case_id": case_id,
        "timestamp": timestamp,
        "ip": str(address),
        "type": ip_type,
        "threat": threat,
        "score": score,
        "alert": alert,
        "status": status,
        "agent": "Agent 001",
        "recommendation": recommendation
    }

    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(text_entry)

    existing_cases.append(json_entry)

    with open(JSON_LOG_FILE, "w", encoding="utf-8") as file:
        json.dump(existing_cases, file, indent=4)


def scan_ip(ip):
    global scan_count, high_count, medium_count, low_count

    address = ipaddress.ip_address(ip)
    ip_str = str(address)

    if address.is_loopback:
        # RFC 5735 — loopback addresses never leave the host.
        ip_type = "Localhost"
        threat = "None"
        score = 0

    elif address.is_private:
        # RFC 1918 — private ranges (10/8, 172.16/12, 192.168/16).
        # Internal traffic only; no external exposure.
        ip_type = "Private IP"
        threat = "Low"
        score = 5

    elif address.is_link_local:
        # RFC 3927 — 169.254.0.0/16, auto-configured when DHCP fails.
        # Never routed beyond the local link.
        ip_type = "Link-Local IP"
        threat = "Low"
        score = 5

    elif address in _SHARED_CGN:
        # RFC 6598 — 100.64.0.0/10, ISP carrier-grade NAT space.
        # Functionally private; should not reach the public internet.
        ip_type = "Shared Address Space"
        threat = "Low"
        score = 5

    elif ip_str in TRUSTED_RESOLVERS:
        # Known, operator-verified public DNS resolver.
        # Presence in logs is expected and benign.
        ip_type = f"Trusted DNS ({TRUSTED_RESOLVERS[ip_str]})"
        threat = "Low"
        score = 5
        low_count += 1

    elif any(address in net for net in _TEST_NETS):
        # RFC 5737 — documentation-only addresses that must never appear in live traffic.
        # Detecting one strongly suggests a spoofed or malformed packet.
        ip_type = "Documentation IP"
        threat = "High"
        score = 85
        high_count += 1

    elif address in _RESERVED_FUTURE:
        # RFC 1112 — 240.0.0.0/4, reserved for future IANA use.
        # Legitimate routing of these addresses does not exist.
        ip_type = "Reserved IP"
        threat = "Medium"
        score = 55
        medium_count += 1

    else:
        # Routable public address with no trust classification on record.
        # Treat as unknown — warrants monitoring but not immediate blocking.
        ip_type = "Public IP"
        threat = "Medium"
        score = 40
        medium_count += 1

    scan_count += 1

    print("\nScanning...\n")
    print(f"IP: {address}")
    print(f"Type: {ip_type}")
    print(f"Threat Level: {threat}")
    print(f"Threat Score: {score}/100")
    print("Assigned Agent: Agent 001")
    print(f"Status: {build_status(threat)}")
    print(f"Alert: {build_alert(threat)}")
    print(f"Recommendation: {build_recommendation(threat, ip_type)}")

    save_log(address, ip_type, threat, score)

    print("\n✅ Case saved successfully!")


def view_logs():
    print("\n========== Scan History ==========\n")

    try:
        with open(LOG_FILE, "r", encoding="utf-8") as log:
            history = log.read()

            if history.strip() == "":
                print("No scans saved yet.")
            else:
                print(history)

    except FileNotFoundError:
        print("No scan log found yet.")


def search_logs():
    keyword = input("\nSearch logs for IP, threat level, score, or case ID: ").strip()

    if keyword == "":
        print("Search cancelled.")
        return

    print("\n========== Search Results ==========\n")

    try:
        with open(LOG_FILE, "r", encoding="utf-8") as log:
            matches = []

            for line in log:
                if keyword.lower() in line.lower():
                    matches.append(line)

            if matches:
                for match in matches:
                    print(match.strip())
            else:
                print("No matching logs found.")

    except FileNotFoundError:
        print("No scan log found yet.")


def show_stats():
    print("\n========== Session Stats ==========\n")
    print(f"Total scans this session: {scan_count}")
    print(f"High threats found: {high_count}")
    print(f"Medium threats found: {medium_count}")
    print(f"Low threats found: {low_count}")
    print(f"Invalid entries: {invalid_count}")


def menu():
    print("\nWhat do you want to do?")
    print("1. Scan an IP address")
    print("2. View scan history")
    print("3. Search scan logs")
    print("4. Show session stats")
    print("5. Quit")


def main():
    global invalid_count

    banner()

    while True:
        menu()
        choice = input("\nChoose an option: ").strip()

        if choice == "1":
            ip = input("\nEnter an IP address: ").strip()

            if ip == "":
                print("No IP entered.")
                continue

            try:
                scan_ip(ip)

            except ValueError:
                invalid_count += 1
                print("❌ Invalid IP address. Please try again.")

            except Exception as e:
                print(f"⚠️ Unexpected error: {e}")

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
            print("Invalid choice. Pick 1, 2, 3, 4, or 5.")


if __name__ == "__main__":
    main()