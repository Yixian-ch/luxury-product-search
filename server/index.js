const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
// Admin key for protecting write endpoints. Set ADMIN_KEY in environment for production.
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-secret';

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function readProducts() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.warn('readProducts error', e);
    return [];
  }
}

function writeProducts(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeProducts error', e);
    return false;
  }
}

// Get all products
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Replace all products (used after upload/import)
app.post('/api/products', (req, res) => {
  // simple admin auth: x-admin-key header OR Authorization: Bearer <key>
  const headerKey = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!headerKey || headerKey !== ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body;
  if (!Array.isArray(body)) return res.status(400).json({ error: 'Expected array of products' });
  const ok = writeProducts(body);
  if (!ok) return res.status(500).json({ error: 'Failed to save products' });
  res.json({ ok: true, saved: body.length });
});

// simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
