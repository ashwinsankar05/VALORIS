# ⚡ VALORIS // Cyber Command Nexus & Superhero Emergency SOS Dispatch

> *"In a city drowning in noise, some signals fall through the cracks. I'm the system that catches them."*

An ultra-modern cyber-command platform and encrypted emergency SOS dispatch network. Built with vanilla ES modules, modular HSL design tokens, an interactive 60FPS particle tracking engine, and an automated SMTP emergency relay.

---

## 🛡️ Core Capabilities & Features

- **Autonomous Comms Terminal**: Multi-step civilian emergency intake compiling Name, Age, Geolocation, Contact Email, and Threat Dossier.
- **Bi-Directional Scroll Engine**: Seamless entrance animations that dynamically reverse back to their vanished state when scrolling in reverse.
- **Satellite Geolocation**: Real-time browser GPS coordinate acquisition with reverse geocoding via OpenStreetMap Nominatim.
- **Interactive 60FPS Energy Canvas**: 110 physics-driven particles with mouse and touch-proximity laser filaments and cursor illumination.
- **Live Transmission Records**: Persistent incident archive and mission dossier logging.
- **Emergency Dispatch Relay**: Automated SMTP dispatch alerting the hero network via Gmail relay with client-side fallback.

---

## 🚀 How to Run Locally

### Option 1: Python Backend (Recommended — Zero Dependencies)
Run the built-in HTTP server and SMTP relay:
```bash
python backend/server.py
```
> Or directly launch with root script:
> ```bash
> python server.py
> ```
Open your browser and navigate to: **`http://localhost:3000`**

---

### Option 2: Node.js Backend
If you prefer Node.js / Express:
```bash
npm install
npm start
```
Open your browser and navigate to: **`http://localhost:3000`**

---

## ⚙️ Environment Configuration (Live Email Alerts)

To receive real distress signals via email when someone uses the chatbot:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. In your Google Account, enable **2-Step Verification** and generate a 16-character **App Password** under **Security > App passwords**.
3. Fill in your credentials in `.env`:
   ```env
   PORT=3000
   ROOT_EMAIL=your_command_email@example.com
   SMTP_USER=your_gmail@gmail.com
   SMTP_PASS=your_16_character_app_password
   ```
4. Restart the server. SOS submissions will automatically trigger live email dispatches to your designated root email with GPS coordinates and civilian grievance dossiers!

---

## 📁 Architecture & File Layout

```
VALORIS/
├── backend/
│   └── server.py               # Production Python SOS dispatch backend
├── data/
│   └── incidents.json          # Persistent incident storage & mission dossier logs
├── public/
│   ├── index.html              # Clean client entry point with modular stylesheet imports
│   ├── styles.css              # Master stylesheet
│   └── app.js                  # Client runtime engine & legacy fallback
├── src/
│   ├── scripts/                # Modular JavaScript architecture
│   │   ├── index.js            # Main coordinator & event binder
│   │   ├── chat.js             # 5-step emergency intake state machine & API dispatcher
│   │   ├── canvas.js           # High-performance 60FPS particle & filament tracking
│   │   └── animations.js       # Boot sequence simulation & IntersectionObserver reveal
│   └── styles/                 # Modular CSS design system
│       ├── main.css            # Unified aggregator
│       ├── base.css            # Root design tokens, typography, resets
│       ├── layout.css          # Navigation, hero centered layout, content sections, footer
│       ├── components.css      # Power cards, chatbot widget, live transmissions, modals
│       └── animations.css      # Atmospheric blooms, laser marquee, keyframe pulses
├── index.html                  # Root entry point
├── server.py                   # Server launcher
├── server.js                   # Node.js Express server
├── package.json                # Project configuration
├── vercel.json                 # Vercel deployment configuration
└── .env.example                # Environment variables template
```

---

## 💻 Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Custom CSS3 Design System
- **Backend**: Python 3 (Zero-dependency HTTP/SMTP Server), Node.js / Express (Optional)
- **Design & Typography**: Orbitron, Rajdhani, JetBrains Mono, Inter
- **Integrations**: OpenStreetMap Nominatim API, Gmail SMTP SSL
