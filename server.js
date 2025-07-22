const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();

// CORS configuration - Allow all origins
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.json({ limit: '10mb' }));

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: true
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Contact form route
app.post('/send-contact', async (req, res) => {
  try {
    const { email, clientName, projectTitle, description, timeline, phoneNumber } = req.body;

    // Input validation
    if (!email || !clientName || !projectTitle || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Email, client name, project title, and description are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }

    // Create email content for TriadForge
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 10px 10px 0 0; 
            text-align: center;
          }
          .content { 
            background: #f8f9fa; 
            padding: 30px; 
            border-radius: 0 0 10px 10px;
          }
          .info-box { 
            background: white; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 8px; 
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .label { 
            font-weight: bold; 
            color: #495057; 
            margin-bottom: 5px;
          }
          .value { 
            color: #212529; 
            margin-bottom: 15px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 New Project Inquiry</h1>
          <p>You have received a new project inquiry from your website</p>
        </div>
        
        <div class="content">
          <div class="info-box">
            <div class="label">👤 Client Name:</div>
            <div class="value">${clientName}</div>
          </div>

          <div class="info-box">
            <div class="label">📧 Email Address:</div>
            <div class="value">${email}</div>
          </div>

          <div class="info-box">
            <div class="label">📱 Phone Number:</div>
            <div class="value">${phoneNumber || 'Not provided'}</div>
          </div>

          <div class="info-box">
            <div class="label">📋 Project Title:</div>
            <div class="value">${projectTitle}</div>
          </div>

          <div class="info-box">
            <div class="label">💰 Budget (INR):</div>
            <div class="value">${timeline || 'Not specified'}</div>
          </div>

          <div class="info-box">
            <div class="label">📝 Project Description:</div>
            <div class="value" style="white-space: pre-line;">${description}</div>
          </div>

          <div class="footer">
            <p><strong>TriadForge</strong> - Forging Digital Excellence</p>
            <p>This inquiry was submitted through your website contact form.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email with retry logic
    let retries = 3;
    let error;

    while (retries > 0) {
      try {
        await transporter.sendMail({
          from: `"TriadForge Contact Form" <${process.env.EMAIL_USER}>`, // Must use authenticated email
          to: process.env.EMAIL_USER, // Send to TriadForge email
          replyTo: `"${clientName}" <${email}>`, // Client's email for replies
          subject: `New Project Inquiry: ${projectTitle} - ${clientName}`,
          html: emailContent
        });

        console.log(`Contact form email sent successfully from ${email}`);
        return res.status(200).json({
          message: 'Your message has been sent successfully! We will get back to you soon.',
          status: 'success'
        });
      } catch (err) {
        error = err;
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        }
      }
    }

    // If all retries failed
    console.error('Failed to send email after retries:', error);
    throw error;

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message || 'An unexpected error occurred'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});