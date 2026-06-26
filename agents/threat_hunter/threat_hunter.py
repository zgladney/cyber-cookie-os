import ipaddress
from datetime import datetime

print("=" * 45)
print("🛡️ CyberCookieOS - Threat Hunter v3")
print("=" * 45)

while True:

    ip = input("\nEnter an IP address (or type 'quit' to exit): ")

    if ip.strip() == "":
        continue

    if ip.lower() == "quit":
        print("\nThreat Hunter shutting down...")
        break

    try:
        address = ipaddress.ip_address(ip)

        print("\nScanning...\n")
        print(f"IP: {address}")

        # Determine IP type
        if address.is_private:
            ip_type = "Private IP"
            threat = "Low 🟢"
            score = 5

        elif address.is_loopback:
            ip_type = "Localhost"
            threat = "None 🟢"
            score = 0

        else:
            ip_type = "Public IP"

            # Fake intelligence engine
            first_octet = int(str(address).split(".")[0])

            if first_octet < 50:
                threat = "High 🔴"
                score = 90

            elif first_octet < 100:
                threat = "Medium 🟠"
                score = 60

            else:
                threat = "Low 🟢"
                score = 20

        print(f"Type: {ip_type}")
        print(f"Threat Level: {threat}")
        print(f"Threat Score: {score}/100")

        with open("scan_log.txt", "a", encoding="utf-8") as log:
            log.write(
                f"{datetime.now()} | {address} | {ip_type} | {threat} | Score: {score}\n"
            )

        print("\n✅ Scan saved successfully!")

    except ValueError:
        print("❌ Invalid IP address. Please try again.")

    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")