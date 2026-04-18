require('dotenv').config();
const mongoose = require('mongoose');
const Occasion = require('./Models/Occasion');

async function migrate() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bakery';
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Use raw collection to access suboccasions since it's no longer in the schema
    const rawCollection = mongoose.connection.collection('occasions');
    
    const result = await rawCollection.updateMany(
      { suboccasions: { $exists: true } },
      [
        {
          $set: {
            subOccasions: "$suboccasions"
          }
        },
        {
          $unset: "suboccasions"
        }
      ]
    );

    console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
}

migrate();
