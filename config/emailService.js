const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    // Switch to 587 - most cloud providers allow this port
    port: 587,
    // secure MUST be false for port 587
    secure: false,
    // Force IPv4 to avoid the ENETUNREACH error from earlier
    family: 4,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    // Increase timeouts slightly for cloud environments
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,

  });

  const mailOptions = {
    from: '"Hangry?Sweet." <noreply@mehakara.com>',
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