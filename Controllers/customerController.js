const jwt = require('jsonwebtoken');
const axios = require('axios');
const Customer = require('../Models/Customer');
const sendEmail = require('../config/emailService');

const otpStore = new Map(); // Simple in-memory cache for OTPs

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
 const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "6LfpTaQsAAAAAKD3GHrYuA0j9hWTfalmLT4a7Wmm";
// Helper function to verify reCAPTCHA token
const verifyRecaptcha = async (token) => {
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );

    const { success, score } = response.data;
    
    // Log the response for debugging purposes
    console.log('reCAPTCHA response from Google:', response.data);

    // reCAPTCHA v2 doesn't have a score, it just has success: true/false
    // reCAPTCHA v3 has success and a score (0.0 to 1.0)
    if (success) {
      // If score is present (v3), check if it's high enough
      if (score !== undefined) {
        return score > 0.5;
      }
      // If no score (v2), just return success
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('reCAPTCHA Verification Error:', error);
    return false;
  }
};


exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Check if customer already exists
    const existing = await Customer.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Customer with this email already exists' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpStore.set(normalizedEmail, { otp, expiresAt });

    await sendEmail({
      email: normalizedEmail,
      subject: 'Your Registration OTP',
      message: `Your OTP for registration is: ${otp}. It expires in 5 minutes.`
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, address, password, otp, recaptchaToken } = req.body;

    if (!name || !email || !phone || !password || !otp || !recaptchaToken) {
      return res.status(400).json({ error: 'Name, email, phone, password, OTP, and reCAPTCHA verification are required' });
    }

    // Verify reCAPTCHA token
    const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
    if (!isValidRecaptcha) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check OTP
    const storedOtpData = otpStore.get(normalizedEmail);
    if (!storedOtpData) {
      return res.status(400).json({ error: 'OTP expired or not sent. Please request a new one.' });
    }
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if customer already exists
    const existing = await Customer.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Customer with this email already exists' });
    }

    const customer = new Customer({
      name,
      email: normalizedEmail,
      phone,
      address,
    });

    // Clear OTP after successful validation
    otpStore.delete(normalizedEmail);

    await customer.setPassword(password);
    await customer.save();

    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: customer.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const customer = await Customer.findOne({ email: normalizedEmail });

    if (!customer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: customer._id, email: customer.email, role: customer.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

exports.me = async (req, res) => {
  try {
    // Requires authMiddleware to attach req.user
    if (!req.user || req.user.role !== 'customer') {
      return res.status(401).json({ error: 'Not authenticated as a customer' });
    }
    
    const customer = await Customer.findById(req.user.id).select('-passwordHash');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    res.json({ customer });
  } catch (error) {
    console.error('Me Error:', error);
    res.status(500).json({ error: 'Failed to get customer profile' });
  }
};

// --- Password reset via OTP ---

// Send OTP for password reset (only for existing customers)
exports.sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Ensure customer exists
    const customer = await Customer.findOne({ email: normalizedEmail });
    if (!customer) {
      return res.status(400).json({ error: 'No account found for this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes for reset
    otpStore.set(`reset:${normalizedEmail}`, { otp, expiresAt });

    await sendEmail({
      email: normalizedEmail,
      subject: 'Your Password Reset OTP',
      message: `You requested a password reset. Your OTP is: ${otp}. It expires in 10 minutes.`
    });

    res.json({ message: 'Password reset OTP sent successfully' });
  } catch (error) {
    console.error('Send Reset OTP Error:', error);
    res.status(500).json({ error: 'Failed to send password reset OTP' });
  }
};

// Verify reset OTP
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const stored = otpStore.get(`reset:${normalizedEmail}`);
    if (!stored) return res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(`reset:${normalizedEmail}`);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    // Keep OTP until reset is completed, but indicate verification success
    res.json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Verify Reset OTP Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// Reset password using OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP and new password are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const stored = otpStore.get(`reset:${normalizedEmail}`);
    if (!stored) return res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(`reset:${normalizedEmail}`);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    if (stored.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    const customer = await Customer.findOne({ email: normalizedEmail });
    if (!customer) return res.status(400).json({ error: 'No account found for this email' });

    await customer.setPassword(newPassword);
    await customer.save();

    // Clear OTP after successful reset
    otpStore.delete(`reset:${normalizedEmail}`);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    // Allow admins/superadmins to fetch all customers
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }

    const customers = await Customer.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error('Fetch All Customers Error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};
