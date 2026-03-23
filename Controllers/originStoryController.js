const OriginStory = require('../Models/OriginStory');

exports.getStory = async (req, res) => {
  try {
    const story = await OriginStory.findOne();
    if (!story) return res.json({ ok: true, story: null });
    res.json({ ok: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateStory = async (req, res) => {
  try {
    const data = req.body || {};
    let story = await OriginStory.findOne();
    if (!story) {
      story = new OriginStory(data);
    } else {
      story.title = data.title ?? story.title;
      story.subtitle = data.subtitle ?? story.subtitle;
      story.paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : story.paragraphs;
      // merge founder fields explicitly so quote is preserved
      story.founder = {
        name: data.founder?.name ?? story.founder?.name,
        since: data.founder?.since ?? story.founder?.since,
        img: data.founder?.img ?? story.founder?.img,
        quote: data.founder?.quote ?? story.founder?.quote,
      };
      story.updatedAt = new Date();
    }
    await story.save();
    res.json({ ok: true, story });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
