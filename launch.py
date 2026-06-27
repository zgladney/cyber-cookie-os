import http.server
import socketserver
import webbrowser
import os

PORT = 8080
URL = f"http://localhost:{PORT}/hq/index.html"

os.chdir(os.path.dirname(os.path.abspath(__file__)))

handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    httpd.allow_reuse_address = True
    print(f"CyberCookieOS HQ: {URL}")
    webbrowser.open(URL)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
