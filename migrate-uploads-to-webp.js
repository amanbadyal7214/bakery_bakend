/*
  migrate-uploads-to-webp.js
  - Scans the Backend/uploads directory for non-webp images (png/jpg/jpeg/gif)
  - Converts each to WebP using sharp
  - Updates Product documents where `img` references the old filename to point to the new `/uploads/<new>.webp`
  - Deletes the original file after successful conversion

  Usage (PowerShell):
    $env:MONGO_URI = "mongodb://127.0.0.1:27017/bakery"; node migrate-uploads-to-webp.js
  Or set MONGO_URI in your environment / .env before running.
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bakery';

const isImage = (name) => /\.(png|jpe?g|gif|bmp|tiff?)$/i.test(name);

async function main() {
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  const files = await fs.promises.readdir(UPLOADS_DIR).catch((e) => { console.error('Failed to read uploads dir', e); process.exit(1); });
  const toConvert = files.filter(f => isImage(f) && !f.toLowerCase().endsWith('.webp'));
  if (toConvert.length === 0) {
    console.log('No non-webp images found in uploads.');
    await mongoose.disconnect();
    return;
  }

  for (const file of toConvert) {
    const src = path.join(UPLOADS_DIR, file);
    const newName = `${Date.now()}-${Math.round(Math.random()*1e9)}.webp`;
    const dest = path.join(UPLOADS_DIR, newName);
    try {
      console.log('Converting', file, '->', newName);
      await sharp(src).webp({ quality: 80 }).toFile(dest);

      // update products that reference this file in their img field
      const possiblePaths = [
        file,
        `/uploads/${file}`,
        `uploads/${file}`,
        `./uploads/${file}`
      ];
      const updateQuery = { img: { $in: possiblePaths } };

      const res = await Product.updateMany(updateQuery, { $set: { img: `/uploads/${newName}` } }).exec();
      console.log(`Updated ${res.nModified || res.modifiedCount || 0} products to new image path.`);

      // remove original file
      await fs.promises.unlink(src).catch((err) => { console.warn('Failed to delete original file', src, err); });
    } catch (e) {
      console.error('Failed converting', file, e);
    }
  }

  console.log('Done. Disconnecting from MongoDB.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
