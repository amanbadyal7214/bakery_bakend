const jwt = require('jsonwebtoken');
const Customer = require('../Models/Customer');
const { sendEmail } = require('../config/emailService');

const otpStore = new Map(); // Simple in-memory cache for OTPs

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

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

    await sendEmail(
      normalizedEmail,
      'Your Registration OTP',
      `Your OTP for registration is: ${otp}. It expires in 5 minutes.`
    );

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, address, password, otp } = req.body;

    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ error: 'Name, email, phone, password, and OTP are required' });
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
