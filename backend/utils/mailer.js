const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

function hudEmailShell({ header, bodyHtml, footer }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#12121A;border:1px solid #252535;border-radius:4px;">
        <tr><td style="padding:28px 24px;border-bottom:1px solid #252535;">
          <p style="margin:0;font-size:10px;letter-spacing:3px;color:#6B6B8A;">SYS://MAX-CONNECTIVITY</p>
          <h1 style="margin:8px 0 0;font-size:18px;letter-spacing:2px;color:#00F5FF;text-shadow:0 0 12px rgba(0,245,255,0.5);">${header}</h1>
        </td></tr>
        <tr><td style="padding:28px 24px;">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #252535;">
          <p style="margin:0;font-size:10px;letter-spacing:2px;color:#6B6B8A;text-align:center;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('[mailer] GMAIL_USER/GMAIL_PASS not set — email not sent:', { to, subject });
    return { dev: true };
  }
  await transport.sendMail({
    from: `"MAX Connectivity" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return { dev: false };
}

async function sendOTP(email, otp) {
  const html = hudEmailShell({
    header: 'JARVIS VERIFICATION SYSTEM',
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:1px;color:#6B6B8A;">Your access code:</p>
      <p style="margin:0;font-size:42px;font-weight:bold;letter-spacing:12px;color:#00F5FF;text-align:center;text-shadow:0 0 24px rgba(0,245,255,0.6);">${otp}</p>
      <p style="margin:20px 0 0;font-size:11px;color:#E8E8FF;text-align:center;">Enter this code in MAX Connectivity to authenticate.</p>`,
    footer: 'This code expires in 10 minutes',
  });
  return sendMail({
    to: email,
    subject: 'MAX Connectivity — Your Access Code',
    html,
  });
}

async function sendWelcome(email, displayName) {
  const name = displayName || 'Operator';
  const html = hudEmailShell({
    header: 'OPERATOR REGISTERED',
    bodyHtml: `
      <p style="margin:0;font-size:14px;color:#E8E8FF;line-height:1.6;">
        Welcome, <span style="color:#00F5FF;">${name}</span>. Your operator profile is online.
      </p>
      <p style="margin:16px 0 0;font-size:11px;color:#6B6B8A;">Systems nominal. Start connecting.</p>`,
    footer: 'MAX Connectivity — Stay connected',
  });
  return sendMail({
    to: email,
    subject: 'MAX Connectivity — Welcome, Operator',
    html,
  });
}

module.exports = { sendOTP, sendWelcome };
