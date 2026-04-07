const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 (important for Render)
dns.setDefaultResultOrder('ipv4first');

// Create transporter ONCE (better performance)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,   // MUST be in ENV
    pass: process.env.EMAIL_PASSWORD    // Gmail App Password
  }
});

// Verify transporter (optional but recommended)
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

// Helper
function buildOptions(arg1, arg2, arg3, arg4) {
  if (typeof arg1 === 'object' && arg1 !== null) return arg1;

  return {
    email: arg1,
    subject: arg2,
    message: arg3,
    html: arg4,
  };
}

// Send Email Function
const sendEmail = async (arg1, arg2, arg3, arg4) => {
  const options = buildOptions(arg1, arg2, arg3, arg4);

  if (!options.email || !options.subject || (!options.message && !options.html)) {
    throw new Error('Email, subject, and message or html are required');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Hangry?Sweet. " <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ EMAIL ERROR FULL:', error);
    throw new Error(error.message);
  }
};

module.exports = { sendEmail };