import ipaddress
import json
from datetime import datetime

LOG_FILE = "scan_log.txt"
JSON_LOG_FILE = "scan_log.json"

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
    if threat == "High":
        return "Block IP immediately and review recent logs"
    elif threat == "Medium":
        return "Monitor IP and review related activity"
    elif ip_type == "Private IP":
        return "Internal/private IP detected; no external threat"
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

    if address.is_loopback:
        ip_type = "Localhost"
        threat = "None"
        score = 0

    elif address.is_private:
        ip_type = "Private IP"
        threat = "Low"
        score = 5
        low_count += 1

    else:
        ip_type = "Public IP"
        first_octet = int(str(address).split(".")[0])

        if first_octet < 50:
            threat = "High"
            score = 90
            high_count += 1

        elif first_octet < 100:
            threat = "Medium"
            score = 60
            medium_count += 1

        else:
            threat = "Low"
            score = 20
            low_count += 1

    scan_count += 1

    print("\nScanning...\n")
    print(f"IP: {address}")
    print(f"Type: {ip_type}")
    print(f"Threat Level: {threat}")
    print(f"Threat Score: {score}/100")
    print(f"Assigned Agent: Agent 001")
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


main()