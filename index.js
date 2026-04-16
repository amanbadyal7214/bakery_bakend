require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const productRoutes = require('./Routes/productRoutes');
const categoryRoutes = require('./Routes/categoryRoutes');
const flavorRoutes = require('./Routes/flavorRoutes');
const typeRoutes = require('./Routes/typeRoutes');
const occasionRoutes = require('./Routes/occasionRoutes');
const weightRoutes = require('./Routes/weightRoutes');
const shapeRoutes = require('./Routes/shapeRoutes');
const themeRoutes = require('./Routes/themeRoutes');
const orderRoutes = require('./Routes/orderRoutes');
const checkoutOrderRoutes = require('./Routes/checkoutOrderRoutes');
const galleryRoutes = require('./Routes/galleryRoutes');
const authRoutes = require('./Routes/authRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const customerRoutes = require('./Routes/customerRoutes');
const cartRoutes = require('./Routes/cartRoutes');
const storeRoutes = require('./Routes/storeRoutes');
const contactRoutes = require('./Routes/contactRoutes');
const originStoryRoutes = require('./Routes/originStoryRoutes');
const valuesRoutes = require('./Routes/valuesRoutes');
const teamRoutes = require('./Routes/teamRoutes');
const ingredientRoutes = require('./Routes/ingredientRoutes');
const ingredientDetailRoutes = require('./Routes/ingredientDetailRoutes');
const permissionRoutes = require('./Routes/permissionRoutes');
const roleRoutes = require('./Routes/roleRoutes');
const paymentModeRoutes = require('./Routes/paymentModeRoutes');
const stockAdjustmentRoutes = require('./Routes/stockAdjustmentRoutes');
const eventRoutes = require('./Routes/eventRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// allow larger payloads (base64 images) — increase limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send({ ok: true, message: 'Bakery API is running' }));

const authMiddleware = require('./Middleware/authMiddleware');

app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cart', cartRoutes);

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/flavors', flavorRoutes);
app.use('/api/types', typeRoutes);
app.use('/api/occasions', occasionRoutes);
app.use('/api/weights', weightRoutes);
app.use('/api/shapes', shapeRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout-orders', checkoutOrderRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/origin-story', originStoryRoutes);
app.use('/api/values', valuesRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/ingredient-details', ingredientDetailRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/payment-modes', paymentModeRoutes);
app.use('/api/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/events', eventRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image size must be 500KB or less' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

async function start() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bakery';
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

start();