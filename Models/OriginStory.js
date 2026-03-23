const mongoose = require('mongoose');

const OriginStorySchema = new mongoose.Schema({
  title: { type: String, default: 'A Kitchen, A Dream, & A Wooden Spoon.' },
  subtitle: { type: String, default: '' },
  paragraphs: { type: [String], default: [] },
  founder: {
    name: { type: String, default: 'Margaret Howell' },
    since: { type: String, default: 'Est. 2024' },
    img: { type: String, default: '/about-baker.png' },
    quote: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model('OriginStory', OriginStorySchema);
