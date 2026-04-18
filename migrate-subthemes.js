const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://badyalaman27:Aman@cluster0.9mc3zpy.mongodb.net/bakery';

async function migrate() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('themes');

    const result = await collection.updateMany(
      { subthemes: { $exists: true } },
      { $rename: { 'subthemes': 'subThemes' } }
    );

    console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
