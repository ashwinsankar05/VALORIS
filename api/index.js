const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const ROOT_EMAIL = process.env.SMTP_USER || 'emergency@valoris-nexus.local';

app.use(cors());
app.use(express.json());

const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
let transporter = null;
if (process.env.SMTP_USER && smtpPass) {
  transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: { user: process.env.SMTP_USER, pass: smtpPass },
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', rootEmail: ROOT_EMAIL, serverTime: new Date().toISOString() });
});

app.get('/api/incidents', (req, res) => {
  res.json([]);
});

app.post('/api/dispatch', async (req, res) => {
  try {
    const { name, age, location, email, grievance } = req.body;
    if (!name || !email || !grievance) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Grievance are required.' });
    }

    const timestamp = new Date().toISOString();
    const incidentId = `SOS-${Date.now()}`;
    const record = { id: incidentId, name, age: age || 'N/A', location: location || 'Not specified', email, grievance, timestamp, status: 'DISPATCHED' };

    let emailSent = false;
    let emailError = null;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"VALORIS SOS" <${process.env.SMTP_USER}>`,
          to: ROOT_EMAIL,
          replyTo: email,
          subject: `🚨 [VALORIS SOS] Emergency Request from ${name} (${location})`,
          html: `<div style="font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;padding:20px"><div style="max-width:600px;margin:auto;background:#1e293b;border-radius:8px;border:2px solid #38bdf8;padding:24px"><h2 style="color:#38bdf8">⚡ VALORIS EMERGENCY SOS</h2><p><b>ID:</b> ${incidentId}</p><p><b>Time:</b> ${timestamp}</p><hr style="border:0;border-top:1px solid #334155;margin:15px 0"/><p><b>Name:</b> ${name}</p><p><b>Age:</b> ${age}</p><p><b>Location:</b> ${location}</p><p><b>Email:</b> ${email}</p><hr style="border:0;border-top:1px solid #334155;margin:15px 0"/><h3 style="color:#f87171">GRIEVANCE:</h3><div style="background:#0f172a;padding:15px;border-left:4px solid #ef4444;border-radius:4px">${grievance}</div></div></div>`,
        });
        emailSent = true;
      } catch (e) {
        emailError = e.message;
      }
    }

    res.json({ success: true, message: emailSent ? `Help request sent to ${ROOT_EMAIL}!` : `SOS saved (${incidentId}). ${emailError ? 'Email failed: ' + emailError : 'Email not configured.'}`, incident: record, emailSent, emailError });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = app;
