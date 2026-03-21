const Contact = require('../Models/Contact');

exports.create = async (req, res, next) => {
  try {
    const { name, phone, subject, message } = req.body || {};
    if (!name || !phone || !message) return res.status(400).json({ success: false, error: 'Missing required fields' });

    const contact = new Contact({ name, phone, subject, message });
    await contact.save();

    // Optionally send an admin notification here (SMS, webhook) — omitted for brevity

    res.status(201).json({ success: true, contact });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    // simple admin-protected listing with optional ?unread=true filter
    const filter = {};
    if (req.query.unread === 'true') filter.read = false;
    const contacts = await Contact.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (err) {
    next(err);
  }
};

// Public: list contact messages that are feedbacks and expose them as testimonials
exports.listTestimonials = async (req, res, next) => {
  try {
    // Only return contacts where subject equals 'feedback' (case-insensitive)
    const contacts = await Contact.find({ subject: { $regex: /^feedback$/i } })
      .sort({ createdAt: -1 })
      .limit(6);

    const testimonials = contacts.map(c => ({
      name: c.name,
      text: c.message,
      stars: 5, // default to 5 stars for testimonial display
      role: c.phone || '',
    }));

    res.json({ success: true, testimonials });
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Contact.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, contact: updated });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Contact.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, deletedId: id });
  } catch (err) {
    next(err);
  }
};
