const nodemailer = require('nodemailer');
const dns = require('dns');

// Force DNS resolution to use IPv4 first to prevent ENETUNREACH errors on Render/IPv6
dns.setDefaultResultOrder('ipv4first');

function buildOptions(arg1, arg2, arg3, arg4) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return arg1;
  }

  return {
    email: arg1,
    subject: arg2,
    message: arg3,
    html: arg4,
  };
}

const sendEmail = async (arg1, arg2, arg3, arg4) => {
  const options = buildOptions(arg1, arg2, arg3, arg4);

  if (!options.email || !options.subject || (!options.message && !options.html)) {
    throw new Error('Email, subject, and message or html are required to send email');
  }

  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USERNAME || "pisoftgit@gmail.com",
      pass: process.env.EMAIL_PASSWORD || "gbtiwpfucairwlpa"
    },
    tls: {
      rejectUnauthorized: false // This bypasses the self-signed certificate error
    }
  });

  // 2) Define the email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Hangary?Sweet. <noreply@mehakara.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // 3) Actually send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error(`Email transmission failed: ${error.message}`);
  }
};

module.exports = { sendEmail };
