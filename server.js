const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS with configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
}));

// Parse JSON payload requests
app.use(express.json());

// Serve index.html and assets in current directory
app.use(express.static(__dirname));

// Rate Limiting: 5 requests per IP per hour
const formSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after an hour or contact info@sajanshah.com.'
  }
});

/**
 * Generates a unique Reference ID in the format REQ-YYYYMMDD-XXXX
 * YYYYMMDD is the current date. XXXX is a random 4-character uppercase alphanumeric string.
 */
function generateReferenceId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${dateStr}-${randStr}`;
}

// SMTP Transport setup using credentials in .env
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true'; // parse boolean
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Validate presence of credentials
  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP credentials missing from configuration. Mails will fail to send. Please set SMTP parameters in .env.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

// POST endpoint for request processing
app.post('/api/request', formSubmitLimiter, async (req, res) => {
  const {
    fullName,
    organisationName,
    mobile,
    email,
    city,
    audienceType,
    participantCount,
    programTypes,
    challenges,
    expectedOutcomes,
    preferredMode,
    preferredDate,
    additionalRequirements
  } = req.body;

  // 1. Server-side Validation Checks
  if (
    !fullName || !fullName.trim() ||
    !organisationName || !organisationName.trim() ||
    !mobile ||
    !email ||
    !city || !city.trim() ||
    !audienceType ||
    !participantCount ||
    !programTypes || !Array.isArray(programTypes) || programTypes.length === 0 ||
    !challenges || !challenges.trim() ||
    !expectedOutcomes || !expectedOutcomes.trim() ||
    !preferredMode ||
    !preferredDate
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please ensure all required fields are filled out.'
    });
  }

  // Mobile check: exactly 10 digits
  const cleanMobile = mobile.replace(/\D/g, '');
  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number must be exactly 10 digits.'
    });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address format.'
    });
  }

  // Participant count check: min 10
  const count = parseInt(participantCount, 10);
  if (isNaN(count) || count < 10) {
    return res.status(400).json({
      success: false,
      message: 'Participant count must be at least 10.'
    });
  }

  // Date check: must not be in the past
  const reqDate = new Date(preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (reqDate < today) {
    return res.status(400).json({
      success: false,
      message: 'Preferred date cannot be in the past.'
    });
  }

  // 2. Generate Reference ID & Details
  const referenceId = generateReferenceId();
  const submissionDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  const commaProgramTypes = programTypes.join(', ');

  // 3. Build Requester Confirmation Email
  // Template Placeholder: chained string replacement mapping
  const requesterEmailTemplate = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000; color: #fff; padding: 40px; border-top: 4px solid #f26522; border-bottom: 1px solid #1f2937; border-left: 1px solid #1f2937; border-right: 1px solid #1f2937;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #f26522; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px;">SAJAN SHAH</h2>
    <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">Customised Programs</p>
  </div>
  
  <h1 style="color: #ffffff; font-size: 22px; border-bottom: 1px solid #1f2937; padding-bottom: 15px; margin-bottom: 20px;">Request Confirmed ✅</h1>
  
  <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6;">Dear {{fullName}},</p>
  <p style="color: #9ca3af; font-size: 15px; line-height: 1.6;">
    Thank you for submitting your program request for <strong style="color: #fff;">{{organisationName}}</strong>.
    Our team will review your requirements and contact you within <strong style="color: #f26522;">24–48 hours</strong>
    to begin designing your customised program.
  </p>
  
  <h3 style="color: #f26522; font-size: 16px; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px dashed #1f2937; padding-bottom: 5px;">Your Request Summary</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
    <tr>
      <td style="padding: 10px 0; color: #9ca3af; width: 40%; border-bottom: 1px solid #0a0a0a;">Reference ID</td>
      <td style="padding: 10px 0; color: #f26522; font-weight: bold; border-bottom: 1px solid #0a0a0a;">{{referenceId}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #0a0a0a;">Program Types</td>
      <td style="padding: 10px 0; color: #fff; border-bottom: 1px solid #0a0a0a;">{{programTypes}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #0a0a0a;">Preferred Mode</td>
      <td style="padding: 10px 0; color: #fff; border-bottom: 1px solid #0a0a0a;">{{preferredMode}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #0a0a0a;">Preferred Date</td>
      <td style="padding: 10px 0; color: #fff; border-bottom: 1px solid #0a0a0a;">{{preferredDate}}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #0a0a0a;">Participants Count</td>
      <td style="padding: 10px 0; color: #fff; border-bottom: 1px solid #0a0a0a;">{{participantCount}}</td>
    </tr>
  </table>
  
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">
    If you have any urgent changes or details to share, please reply to this email or call our team directly.
  </p>

  <div style="color: #9ca3af; font-size: 12px; border-top: 1px solid #1f2937; padding-top: 20px; line-height: 1.6;">
    <strong>Sajan Shah Training & Consultancy</strong><br>
    Vadodara, Gujarat, India<br>
    📞 +91 85113 63376 | 📧 <a href="mailto:info@sajanshah.com" style="color: #f26522; text-decoration: none;">info@sajanshah.com</a> | 🌐 <a href="https://sajanshah.com" style="color: #f26522; text-decoration: none;">sajanshah.com</a>
  </div>
</div>
`;

  // Dynamic variable replacement chain for confirmation email
  const htmlRequester = requesterEmailTemplate
    .replace(/{{fullName}}/g, fullName)
    .replace(/{{organisationName}}/g, organisationName)
    .replace(/{{city}}/g, city)
    .replace(/{{audienceType}}/g, audienceType)
    .replace(/{{participantCount}}/g, String(count))
    .replace(/{{programTypes}}/g, commaProgramTypes)
    .replace(/{{preferredMode}}/g, preferredMode)
    .replace(/{{preferredDate}}/g, preferredDate)
    .replace(/{{mobile}}/g, cleanMobile)
    .replace(/{{email}}/g, email.trim())
    .replace(/{{referenceId}}/g, referenceId)
    .replace(/{{submissionDate}}/g, submissionDate);

  // 4. Build Admin Notification Email
  const htmlAdmin = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

    <div style="background:#000;padding:24px 32px;border-bottom:3px solid #f26522;">
      <h2 style="color:#f26522;margin:0;font-size:20px;">🎯 New Customised Program Request</h2>
      <p style="color:#9ca3af;margin:4px 0 0;font-size:13px;">Sajan Shah Programs — Admin Notification</p>
    </div>

    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;width:45%;">Reference ID</td>
          <td style="padding:10px 0;font-weight:bold;color:#f26522;">${referenceId}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Submission Date & Time</td>
          <td style="padding:10px 0;font-weight:600;">${submissionDate}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Full Name</td>
          <td style="padding:10px 0;font-weight:600;">${fullName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Organisation / Company</td>
          <td style="padding:10px 0;font-weight:600;">${organisationName}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">City</td>
          <td style="padding:10px 0;">${city}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Mobile</td>
          <td style="padding:10px 0;"><a href="tel:${cleanMobile}" style="color:#f26522;">+91 ${cleanMobile}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Email</td>
          <td style="padding:10px 0;"><a href="mailto:${email.trim()}" style="color:#f26522;">${email.trim()}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Audience Type</td>
          <td style="padding:10px 0;">${audienceType}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Participants</td>
          <td style="padding:10px 0;">${count}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Programs Requested</td>
          <td style="padding:10px 0;font-weight:600;color:#f26522;">${commaProgramTypes}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Preferred Mode</td>
          <td style="padding:10px 0;">${preferredMode}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;">Preferred Date</td>
          <td style="padding:10px 0;">${preferredDate}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">Key Challenges</td>
          <td style="padding:10px 0;line-height:1.6;white-space: pre-wrap;">${challenges}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">Expected Outcomes</td>
          <td style="padding:10px 0;line-height:1.6;white-space: pre-wrap;">${expectedOutcomes}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;vertical-align:top;">Additional Requirements</td>
          <td style="padding:10px 0;line-height:1.6;white-space: pre-wrap;">${additionalRequirements || 'None'}</td>
        </tr>
      </table>
    </div>

    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Follow up within 24–48 hours</p>
      <a href="mailto:${email.trim()}"
         style="display:inline-block;background:#f26522;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;margin-right:8px;">
        Email ${fullName} →
      </a>
      <a href="tel:${cleanMobile}"
         style="display:inline-block;background:#000;color:#fff;padding:10px 24px;border-radius:4px;text-decoration:none;font-weight:bold;font-size:14px;border:1px solid #f26522;">
        Call +91 ${cleanMobile}
      </a>
    </div>

  </div>
</body>
</html>
`;

  // 5. Send Emails via Nodemailer SMTP
  try {
    const transporter = getMailTransporter();
    const adminEmailAddress = process.env.ADMIN_EMAIL || 'info@sajanshah.com';

    // Requester email configuration
    const mailOptionsRequester = {
      from: `"Sajan Shah Programs" <${process.env.SMTP_USER}>`,
      to: email.trim(),
      subject: `✅ Program Request Confirmed — ${organisationName} | Ref: ${referenceId}`,
      replyTo: adminEmailAddress,
      html: htmlRequester
    };

    // Admin email configuration
    const mailOptionsAdmin = {
      from: `"Sajan Shah Programs" <${process.env.SMTP_USER}>`,
      to: adminEmailAddress,
      subject: `🎯 New Program Request — ${organisationName} | ${city} | Ref: ${referenceId}`,
      html: htmlAdmin
    };

    // Parallel Email Dispatches
    await Promise.all([
      transporter.sendMail(mailOptionsRequester),
      transporter.sendMail(mailOptionsAdmin)
    ]);

    // Success response
    return res.status(200).json({
      success: true,
      referenceId
    });

  } catch (err) {
    console.error('Mail dispatch error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send confirmation emails. Please try again or email info@sajanshah.com.'
    });
  }
});

// Fallback to route index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server Listen
app.listen(PORT, () => {
  console.log(`🚀 Sajan Shah Programs Server is running on port ${PORT}`);
});
