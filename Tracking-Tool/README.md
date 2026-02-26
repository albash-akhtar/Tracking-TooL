# Tracking Tool API Structure

## Project Structure
```
Tracking-Tool/
  ├── backend/
  │   ├── config/
  │   │   └── db.js
  │   ├── models/
  │   │   ├── Order.js
  │   │   ├── Partner.js
  │   │   └── Status.js
  │   ├── routes/
  │   │   ├── orderRoutes.js
  │   │   ├── partnerRoutes.js
  │   │   └── statusRoutes.js
  │   ├── controllers/
  │   │   ├── orderController.js
  │   │   ├── partnerController.js
  │   │   └── statusController.js
  │   ├── middleware/
  │   │   └── authMiddleware.js
  │   ├── .env
  │   ├── server.js
  │   └── package.json
  └── netlify.toml
```

## backend/server.js
```javascript
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const orderRoutes = require('./routes/orderRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const statusRoutes = require('./routes/statusRoutes');

dotenv.config();

const app = express();
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/status', statusRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## backend/models/Order.js
```javascript
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  product: String,
  quantity: Number,
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
```

## backend/models/Partner.js
```javascript
const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  name: String,
  contact: String,
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
}, { timestamps: true });

module.exports = mongoose.model('Partner', partnerSchema);
```

## backend/models/Status.js
```javascript
const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  status: String,
}, { timestamps: true });

module.exports = mongoose.model('Status', statusSchema);
```

## backend/routes/orderRoutes.js
```javascript
const express = require('express');
const { getAllOrders, createOrder, updateOrder, deleteOrder } = require('../controllers/orderController');

const router = express.Router();

router.get('/', getAllOrders);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;
```

## backend/routes/partnerRoutes.js
```javascript
const express = require('express');
const { getAllPartners, createPartner, updatePartner, deletePartner } = require('../controllers/partnerController');

const router = express.Router();

router.get('/', getAllPartners);
router.post('/', createPartner);
router.put('/:id', updatePartner);
router.delete('/:id', deletePartner);

module.exports = router;
```

## backend/routes/statusRoutes.js
```javascript
const express = require('express');
const { getAllStatus, createStatus } = require('../controllers/statusController');

const router = express.Router();

router.get('/', getAllStatus);
router.post('/', createStatus);

module.exports = router;
```

## backend/controllers/orderController.js
```javascript
const Order = require('../models/Order');

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
};

exports.createOrder = async (req, res) => {
  const newOrder = new Order(req.body);
  await newOrder.save();
  res.status(201).json(newOrder);
};

exports.updateOrder = async (req, res) => {
  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedOrder);
};

exports.deleteOrder = async (req, res) => {
  await Order.findByIdAndRemove(req.params.id);
  res.status(204).send();
};
```

## backend/controllers/partnerController.js
```javascript
const Partner = require('../models/Partner');

exports.getAllPartners = async (req, res) => {
  const partners = await Partner.find();
  res.json(partners);
};

exports.createPartner = async (req, res) => {
  const newPartner = new Partner(req.body);
  await newPartner.save();
  res.status(201).json(newPartner);
};

exports.updatePartner = async (req, res) => {
  const updatedPartner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updatedPartner);
};

exports.deletePartner = async (req, res) => {
  await Partner.findByIdAndRemove(req.params.id);
  res.status(204).send();
};
```

## backend/controllers/statusController.js
```javascript
const Status = require('../models/Status');

exports.getAllStatus = async (req, res) => {
  const status = await Status.find();
  res.json(status);
};

exports.createStatus = async (req, res) => {
  const newStatus = new Status(req.body);
  await newStatus.save();
  res.status(201).json(newStatus);
};
```

## backend/.env
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

## netlify.toml
```
[build]
  command = "npm run build"
  publish = "./dist"

[functions]
  directory = "./functions"
```
