const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    // Switch to 587 - most cloud providers allow this port
    port: 465,
    // secure MUST be false for port 587
    secure: true, 
    family: 4, // Force IPv4
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    // Increase timeouts slightly for cloud environments
    connectionTimeout: 30000, 
    greetingTimeout: 30000,
    socketTimeout: 30000,
    // Explicitly tell it to use STARTTLS
    tls: {
      rejectUnauthorized: true // Keep this true for security
    }
  });

  const mailOptions = {
    from: '"Mehakara" <noreply@mehakara.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email delivered: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email Delivery Failed:', error.message);
    throw error;
  }
};

module.exports = sendEmail;