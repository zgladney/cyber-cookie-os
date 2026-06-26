import ipaddress
from datetime import datetime

print("=" * 40)
print("🛡️  CyberCookieOS - Threat Hunter v2")
print("=" * 40)

while True:
    # Ask the user for an IP address
    ip = input("\nEnter an IP address (or type 'quit' to exit): ")

    # Show exactly what was entered (for debugging)
    print(f"DEBUG: You entered -> '{ip}'")

    # Ignore blank entries
    if ip.strip() == "":
        print("Please enter an IP address.")
        continue

    # Exit program
    if ip.lower() == "quit":
        print("\nThreat Hunter shutting down...")
        break

    try:
        # Convert text into an IP address object
        address = ipaddress.ip_address(ip)

        print("\nScanning...\n")
        print(f"IP: {address}")

        # Classify the IP
        if address.is_private:
            ip_type = "Private IP"
            threat = "Low 🟢"

        elif address.is_loopback:
            ip_type = "Localhost"
            threat = "None 🟢"

        else:
            ip_type = "Public IP"
            threat = "Unknown 🟡"

        print(f"Type: {ip_type}")
        print(f"Threat Level: {threat}")

        # Save the scan
        with open("scan_log.txt", "a", encoding="utf-8") as log:
            log.write(
                f"{datetime.now()} | {address} | {ip_type} | Threat: {threat}\n"
            )

        print("\n✅ Scan saved successfully!")

    except ValueError:
        print("❌ Invalid IP address. Please try again.")

    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")