const Values = require('../Models/Values');

exports.getValues = async (req, res) => {
  try {
    const doc = await Values.findOne();
    if (!doc) return res.json({ ok: true, values: [] });
    res.json({ ok: true, values: doc.values });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateValues = async (req, res) => {
  try {
    const data = req.body || {};
    let doc = await Values.findOne();
    if (!doc) {
      doc = new Values({ values: Array.isArray(data.values) ? data.values : [] });
    } else {
      doc.values = Array.isArray(data.values) ? data.values : doc.values;
      doc.updatedAt = new Date();
    }
    await doc.save();
    res.json({ ok: true, values: doc.values });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
