"""
VALORIS — Superhero Emergency SOS Dispatch Server
Modular Production Backend
Handles /api/dispatch directly sending emails to SMTP_USER via Gmail SMTP
Serves public/ and src/ modular static assets
"""

import http.server
import socketserver
import json
import os
import sys
import smtplib
import mimetypes
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone

PORT = 3000

# Base project paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
SRC_DIR = os.path.join(BASE_DIR, "src")
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "incidents.json")
ENV_FILE = os.path.join(BASE_DIR, ".env")
ENV_EXAMPLE = os.path.join(BASE_DIR, ".env.example")

os.makedirs(DATA_DIR, exist_ok=True)

def load_env_file():
    target = ENV_FILE if os.path.exists(ENV_FILE) else ENV_EXAMPLE
    if os.path.exists(target):
        try:
            with open(target, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip()
            print(f"[SERVER] Loaded credentials from {os.path.basename(target)}")
        except Exception as e:
            print("[SERVER] Could not load env:", e)

load_env_file()

# SMTP_USER serves as both the sending account and the root recipient
ROOT_EMAIL = os.environ.get("ROOT_EMAIL") or os.environ.get("SMTP_USER") or "emergency@valoris-nexus.local"

def load_incidents():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_incident(incident):
    incidents = load_incidents()
    incidents.insert(0, incident)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(incidents, f, indent=2)
    return incidents

class ValorisDispatchHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            res = {
                "status": "ONLINE",
                "rootEmail": ROOT_EMAIL,
                "serverTime": datetime.now(timezone.utc).isoformat()
            }
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        if self.path == "/api/incidents":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            incidents = load_incidents()
            self.wfile.write(json.dumps(incidents).encode("utf-8"))
            return

        # Support serving /src/... modular assets cleanly
        if self.path.startswith("/src/") or self.path.startswith("src/"):
            rel_path = self.path.lstrip("/").replace("src/", "", 1)
            file_path = os.path.abspath(os.path.join(SRC_DIR, rel_path))
            # Security check: prevent directory traversal
            if file_path.startswith(SRC_DIR) and os.path.isfile(file_path):
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/javascript" if file_path.endswith(".js") else "text/plain"
                self.send_response(200)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(os.path.getsize(file_path)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                with open(file_path, "rb") as f:
                    self.wfile.write(f.read())
                return

        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/dispatch":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode("utf-8"))
                name = data.get("name", "").strip()
                age = data.get("age", "").strip()
                location = data.get("location", "").strip()
                email = data.get("email", "").strip()
                grievance = data.get("grievance", "").strip()

                if not name or not email or not grievance:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "message": "Name, Email, and Grievance are required."}).encode("utf-8"))
                    return

                now_utc = datetime.now(timezone.utc)
                timestamp_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
                incident_id = f"SOS-{int(now_utc.timestamp())}"

                incident_record = {
                    "id": incident_id,
                    "name": name,
                    "age": age,
                    "location": location,
                    "email": email,
                    "grievance": grievance,
                    "timestamp": timestamp_str,
                    "status": "DISPATCHED TO SUPERHERO"
                }

                save_incident(incident_record)

                print("="*60)
                print(f"[VALORIS SOS DISPATCH] ID: {incident_id}")
                print(f"Timestamp: {timestamp_str}")
                print(f"Civilian: {name} (Age: {age})")
                print(f"Location: {location}")
                print(f"Email: {email}")
                print(f"Grievance: {grievance}")
                print(f"Delivering To: {ROOT_EMAIL}")
                print("="*60)

                # Send live email via SMTP
                smtp_user = os.environ.get("SMTP_USER") or ROOT_EMAIL
                smtp_pass = os.environ.get("SMTP_PASS")
                if smtp_pass:
                    smtp_pass = smtp_pass.replace(" ", "")

                email_sent = False

                if smtp_user and smtp_pass:
                    try:
                        msg = MIMEMultipart("alternative")
                        msg["Subject"] = f"🚨 [VALORIS HERO SOS] Emergency Request from {name} ({location})"
                        msg["From"] = f"VALORIS Hero Network <{smtp_user}>"
                        msg["To"] = ROOT_EMAIL
                        msg["Reply-To"] = email

                        html = f"""
                        <html>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #040810; color: #f0f4ff; padding: 24px;">
                          <div style="max-width: 600px; margin: auto; background-color: #070c18; border-radius: 12px; border: 2px solid #00e5ff; padding: 28px; box-shadow: 0 10px 30px rgba(0, 229, 255, 0.2);">
                            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0, 229, 255, 0.3); padding-bottom: 14px; margin-bottom: 20px;">
                              <h2 style="color: #00e5ff; margin: 0; font-size: 22px; letter-spacing: 1px;">⚡ VALORIS EMERGENCY DISTRESS CALL</h2>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold; width: 35%;">Incident ID:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-family: monospace; font-size: 14px;">{incident_id}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold;">Timestamp:</td>
                                <td style="padding: 8px 0; color: #ffffff;">{timestamp_str}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold;">Civilian Name:</td>
                                <td style="padding: 8px 0; color: #ffffff; font-size: 15px; font-weight: bold;">{name}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold;">Age:</td>
                                <td style="padding: 8px 0; color: #ffffff;">{age}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold;">Sector / Location:</td>
                                <td style="padding: 8px 0; color: #ffffff;">{location}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #a78bfa; font-weight: bold;">Contact Email:</td>
                                <td style="padding: 8px 0;"><a href="mailto:{email}" style="color: #22d3ee; text-decoration: none; font-weight: bold;">{email}</a></td>
                              </tr>
                            </table>

                            <div style="background-color: rgba(0, 229, 255, 0.08); border-left: 4px solid #00e5ff; border-radius: 6px; padding: 16px; margin: 20px 0;">
                              <h3 style="color: #22d3ee; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">EMERGENCY GRIEVANCE / ISSUE TO RESOLVE:</h3>
                              <p style="color: #ffffff; font-size: 15px; line-height: 1.6; margin-bottom: 0; white-space: pre-wrap;">{grievance}</p>
                            </div>

                            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;">
                              VALORIS Superhero Defense Protocol &bull; Automatic Emergency Relay
                            </p>
                          </div>
                        </body>
                        </html>
                        """
                        msg.attach(MIMEText(html, "html"))

                        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                            server.login(smtp_user, smtp_pass)
                            server.sendmail(smtp_user, [ROOT_EMAIL], msg.as_string())
                        email_sent = True
                        print(f"📧 [EMAIL SUCCESS] Live distress email delivered directly to {ROOT_EMAIL}")
                    except Exception as e:
                        print(f"⚠️ [SMTP Error]: {e}")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                response_payload = {
                    "success": True,
                    "message": f"Help request successfully sent to {ROOT_EMAIL}!",
                    "incident": incident_record,
                    "emailSent": email_sent
                }
                self.wfile.write(json.dumps(response_payload).encode("utf-8"))

            except Exception as err:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
    server_address = ("", PORT)
    httpd = socketserver.TCPServer(server_address, ValorisDispatchHandler)
    print("=" * 60)
    print(f"[VALORIS SERVER] SUPERHERO DISPATCH BACKEND READY")
    print(f"[VALORIS SERVER] URL: http://localhost:{PORT}")
    print(f"[VALORIS SERVER] Root Email Destination: {ROOT_EMAIL}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[VALORIS SERVER] Shutting down.")
        httpd.server_close()
