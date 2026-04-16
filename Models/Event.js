const mongoose = require('mongoose');

const EventHighlightSchema = new mongoose.Schema({
  icon: String, // We'll store icon names or labels like 'Gift', 'Tag', etc.
  title: String,
  desc: String,
});

const EventOfferSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  badge: String,
  name: String,
  price: String,
  originalPrice: String,
  discount: String,
  image: String,
  emoji: String,
});

const EventSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  template: { type: String, enum: ['template1', 'template2'], default: 'template1' },
  
  // Hero
  badge: { type: String, default: "Special Offer" },
  title: { type: String, required: true },
  subtitle: String,
  ctaLabel: { type: String, default: "Shop Now" },
  ctaLink: { type: String, default: "/shop" },
  accentColor: { type: String, default: "#D4A373" },
  darkColor: { type: String, default: "#2C1810" },
  bgColor: { type: String, default: "#EBE3D5" },
  heroImage: String,

  // Date & Venue
  startDate: String,
  endDate: String,
  time: String,
  location: String,

  // Countdown
  countdown: {
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    mins: { type: Number, default: 0 },
    secs: { type: Number, default: 0 },
  },

  // Floating decorative emojis (up to 4)
  floatingEmojis: { type: [String], default: ["🎂", "✨", "🎁", "🌟"] },

  // Highlight cards
  highlights: [EventHighlightSchema],

  // Featured product/offer cards
  offers: [EventOfferSchema],

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', EventSchema);
