const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_EMAIL = process.env.ROOT_EMAIL || process.env.SMTP_USER || 'emergency@valoris-nexus.local';
const DATA_FILE = path.join(__dirname, 'incidents.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Log JSON parse errors as JSON not HTML
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[BODY PARSE ERROR]', err.message, 'body:', err.body);
    return res.status(400).json({ success: false, message: 'Invalid JSON: ' + err.message, error: err.message });
  }
  next(err);
});

function loadIncidents() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveIncident(incident) {
  const incidents = loadIncidents();
  incidents.unshift(incident);
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(incidents, null, 2), 'utf8');
  } catch (e) {
    // Vercel filesystem is read-only — don't crash dispatch
    console.warn('[AEGIS] Could not write incidents.json (read-only FS on Vercel):', e.message);
  }
  return incidents;
}

let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  const smtpPass = process.env.SMTP_PASS.replace(/\s+/g, '');
  transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: smtpPass,
    },
  });
  // Verify early and log actionable error
  transporter.verify((err) => {
    if (err) console.error('[AEGIS] SMTP verify failed:', err.message, '- Check App Password / 2-Step verification. Will still save SOS locally.');
    else console.log('[AEGIS] SMTP ready.');
  });
  console.log('[AEGIS] Configured SMTP Transporter.');
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    rootEmail: ROOT_EMAIL,
    serverTime: new Date().toISOString()
  });
});

app.get('/api/incidents', (req, res) => {
  res.json(loadIncidents());
});

app.post('/api/dispatch', async (req, res) => {
  try {
    const { name, age, location, email, grievance } = req.body;

    if (!name || !email || !grievance) {
      return res.status(400).json({
        success: false,
        message: 'Name, Email, and Grievance are required.'
      });
    }

    const timestamp = new Date().toISOString();
    const incidentId = `SOS-${Date.now()}`;

    const record = {
      id: incidentId,
      name,
      age: age || 'N/A',
      location: location || 'Not specified',
      email,
      grievance,
      timestamp,
      status: 'DISPATCHED'
    };

    saveIncident(record);

    console.log('='.repeat(50));
    console.log(`[SOS DISPATCH] ${incidentId}`);
    console.log(`Civilian: ${name} (${email})`);
    console.log(`Location: ${location}`);
    console.log(`Grievance: ${grievance}`);
    console.log(`Target: ${ROOT_EMAIL}`);
    console.log('='.repeat(50));

    let emailSent = false;
    let emailError = null;
    if (transporter) {
      const mailOptions = {
        from: `"Superhero SOS" <${process.env.SMTP_USER}>`,
        to: ROOT_EMAIL,
        replyTo: email,
        subject: `🚨 [SUPERHERO SOS] Help Request from ${name} (${location})`,
        html: `
          <div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #1e293b; border-radius: 8px; border: 2px solid #38bdf8; padding: 24px;">
              <h2 style="color: #38bdf8;">🦸‍♂️ SUPERHERO EMERGENCY SOS DISPATCH</h2>
              <p><strong>Incident ID:</strong> ${incidentId}</p>
              <p><strong>Timestamp:</strong> ${timestamp}</p>
              <hr style="border: 0; border-top: 1px solid #334155; margin: 15px 0;" />
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Age:</strong> ${age}</p>
              <p><strong>Location:</strong> ${location}</p>
              <p><strong>Email:</strong> ${email}</p>
              <hr style="border: 0; border-top: 1px solid #334155; margin: 15px 0;" />
              <h3 style="color: #f87171;">GRIEVANCE:</h3>
              <div style="background: #0f172a; padding: 15px; border-left: 4px solid #ef4444; border-radius: 4px;">
                ${grievance}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Routed to: ${ROOT_EMAIL}</p>
            </div>
          </div>
        `
      };
      try {
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`[EMAIL SUCCESS] Delivered to ${ROOT_EMAIL}`);
      } catch (mailErr) {
        emailError = mailErr.message;
        console.error('[SMTP Error] Email failed but SOS saved:', mailErr.message);
      }
    } else {
      console.warn('[AEGIS] No SMTP configured - SOS saved locally only');
    }

    res.json({
      success: true,
      message: emailSent ? `Help request successfully sent to ${ROOT_EMAIL}!` : `SOS saved (ID: ${incidentId}). ${emailError ? 'Email failed: ' + emailError + ' - Check Vercel env SMTP_PASS.' : 'Email not configured.'}`,
      incident: record,
      emailSent,
      emailError
    });
  } catch (err) {
    console.error('[DISPATCH ERROR]', err);
    res.status(500).json({ success: false, message: err.message, error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SERVER] Superhero Dispatch backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
