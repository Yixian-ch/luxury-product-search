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
  // Enforce reference presence and batch-level deduplication (case-insensitive)
  const normalizeRef = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const missingRefIndices = [];
  const seenInBatch = new Set();
  const deduped = [];
  const skippedRefs = [];
  for (let i = 0; i < body.length; i += 1) {
    const item = body[i] || {};
    const refNorm = normalizeRef(item.reference);
    if (!refNorm) {
      missingRefIndices.push(i);
      continue;
    }
    if (seenInBatch.has(refNorm)) {
      skippedRefs.push(item.reference);
      continue;
    }
    seenInBatch.add(refNorm);
    deduped.push(item);
  }
  if (missingRefIndices.length > 0) {
    return res.status(400).json({ error: 'reference_required', indices: missingRefIndices });
  }

  // Merge with existing by reference ONLY; keep existing records, do not overwrite
  const existing = readProducts();
  const mapByRef = new Map();
  existing.forEach((p) => {
    const r = normalizeRef(p.reference);
    if (r) mapByRef.set(r, p);
  });

  let inserted = 0;
  deduped.forEach((p) => {
    const r = normalizeRef(p.reference);
    if (!mapByRef.has(r)) {
      mapByRef.set(r, p);
      inserted += 1;
    }
  });

  const result = Array.from(mapByRef.values());
  const ok = writeProducts(result);
  if (!ok) return res.status(500).json({ error: 'Failed to save products' });
  res.json({
    ok: true,
    inserted,
    duplicatesSkipped: skippedRefs.length,
    skippedRefs,
    total: result.length
  });
});

// simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Get single product by reference (optional helper)
app.get('/api/products/:reference', (req, res) => {
  const ref = (req.params.reference || '').toString().trim().toLowerCase();
  if (!ref) return res.status(400).json({ error: 'reference_required' });
  const items = readProducts();
  const found = items.find((p) => (p.reference || '').toString().trim().toLowerCase() === ref);
  if (!found) return res.status(404).json({ error: 'not_found' });
  res.json(found);
});

// Patch single product (update any fields except reference)
app.patch('/api/products/:reference', (req, res) => {
  const headerKey = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!headerKey || headerKey !== ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  const ref = (req.params.reference || '').toString().trim().toLowerCase();
  if (!ref) return res.status(400).json({ error: 'reference_required' });
  const updates = req.body || {};
  if (Object.prototype.hasOwnProperty.call(updates, 'reference')) {
    return res.status(400).json({ error: 'reference_immutable' });
  }

  const items = readProducts();
  const idx = items.findIndex((p) => (p.reference || '').toString().trim().toLowerCase() === ref);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });

  // Basic normalization
  const sanitized = { ...updates };
  if (sanitized.prix_vente !== undefined) {
    const num = Number.parseFloat(String(sanitized.prix_vente).replace(/,/g, '.'));
    if (Number.isNaN(num)) return res.status(400).json({ error: 'invalid_prix_vente' });
    sanitized.prix_vente = num;
  }
  if (sanitized.Link !== undefined) {
    sanitized.Link = String(sanitized.Link);
  }
  if (sanitized.lien_externe !== undefined) {
    sanitized.lien_externe = String(sanitized.lien_externe);
  }

  const before = items[idx];
  const after = { ...before, ...sanitized };
  items[idx] = after;
  const ok = writeProducts(items);
  if (!ok) return res.status(500).json({ error: 'Failed to save products' });
  res.json({ ok: true, reference: before.reference, updatedFields: Object.keys(sanitized) });
});
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
