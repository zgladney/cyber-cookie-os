import http.server
import socketserver
import socket
import webbrowser
import os

PORT = 8080
URL  = f"http://localhost:{PORT}/hq/index.html"

os.chdir(os.path.dirname(os.path.abspath(__file__)))

handler = http.server.SimpleHTTPRequestHandler


class DualStackServer(socketserver.TCPServer):
    """TCPServer bound to IPv6 with IPV6_V6ONLY=0 for dual-stack (IPv4 + IPv6)."""
    address_family = socket.AF_INET6
    allow_reuse_address = True

    def server_bind(self):
        # Disable IPV6_V6ONLY so the IPv6 socket also accepts IPv4 connections
        # via IPv4-mapped IPv6 addresses (::ffff:a.b.c.d).
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()


def start_server():
    # Try dual-stack first (IPv4 + IPv6 on the same socket).
    try:
        with DualStackServer(("::", PORT), handler) as httpd:
            print(f"CyberCookieOS  :  {URL}")
            print(f"Dual-stack     :  http://[::1]:{PORT}/hq/index.html")
            print(f"Serving on     :  :: (IPv4 + IPv6)")
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")
    except OSError:
        # IPv6 not available on this machine — fall back to IPv4-only.
        print("[!] IPv6 unavailable — falling back to IPv4-only.")
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            httpd.allow_reuse_address = True
            print(f"CyberCookieOS  :  {URL}")
            webbrowser.open(URL)
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServer stopped.")


if __name__ == "__main__":
    start_server()
