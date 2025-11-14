const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { pipeline } = require('stream/promises');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = process.env.PRODUCTS_JSON_PATH || path.join(__dirname, 'data', 'products.json');
const REMOTE_DATA_URL = process.env.PRODUCTS_DATA_URL || '';
const REMOTE_DATA_BEARER = process.env.PRODUCTS_DATA_BEARER || process.env.HF_DATA_TOKEN || '';
const HAS_GLOBAL_FETCH = typeof fetch === 'function';
// Admin key for protecting write endpoints. Set ADMIN_KEY in environment for production.
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-secret';

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
fs.mkdirSync(dataDir, { recursive: true });

async function ensureDataFile() {
  if (fs.existsSync(DATA_FILE)) {
    return;
  }

  if (!REMOTE_DATA_URL) {
    console.warn('Data file is missing and PRODUCTS_DATA_URL is not set. API will start with empty product list.');
    return;
  }

  if (!HAS_GLOBAL_FETCH) {
    console.error('Global fetch API is not available. Please upgrade to Node.js 18+ or install a fetch polyfill.');
    return;
  }

  try {
    console.log('Downloading products data from', REMOTE_DATA_URL);
    const headers = {};
    if (REMOTE_DATA_BEARER) {
      headers.Authorization = `Bearer ${REMOTE_DATA_BEARER}`;
    }
    const response = await fetch(REMOTE_DATA_URL, { headers });
    if (!response.ok || !response.body) {
      throw new Error(`fetch failed with status ${response.status}`);
    }
    await pipeline(response.body, fs.createWriteStream(DATA_FILE));
    console.log('Products data downloaded to', DATA_FILE);
  } catch (error) {
    console.error('Failed to download products data:', error);
  }
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
  try {
    console.log('收到上传请求，Content-Type:', req.headers['content-type']);
    console.log('请求体大小:', JSON.stringify(req.body || {}).length, 'bytes');
    
    // simple admin auth: x-admin-key header OR Authorization: Bearer <key>
    const headerKey = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!headerKey || headerKey !== ADMIN_KEY) {
      console.warn('认证失败: 提供的密钥', headerKey ? '存在但不匹配' : '不存在');
      return res.status(401).json({ error: 'unauthorized' });
    }

    const body = req.body;
    if (!Array.isArray(body)) {
      console.warn('请求体不是数组:', typeof body);
      return res.status(400).json({ error: 'Expected array of products' });
    }
    
    console.log('收到产品数量:', body.length);
    
    // Enforce reference presence and batch-level deduplication (case-insensitive)
    const normalizeRefValue = (value) => {
      if (value === undefined || value === null) return '';
      return String(value).trim();
    };

    const missingRefIndices = [];
    const preparedItems = [];
    for (let i = 0; i < body.length; i += 1) {
      const item = body[i] || {};
      const ref = normalizeRefValue(item.reference);
      if (!ref) {
        missingRefIndices.push(i);
        continue;
      }
      preparedItems.push({
        ...item,
        reference: ref,
      });
    }

    if (missingRefIndices.length > 0) {
      return res.status(400).json({ error: 'reference_required', indices: missingRefIndices });
    }

    // Append new items while allowing duplicate references for related variants
    const existing = readProducts();
    const result = existing.concat(preparedItems);
    const inserted = preparedItems.length;

    const ok = writeProducts(result);
    if (!ok) {
      console.error('写入文件失败');
      return res.status(500).json({ error: 'Failed to save products' });
    }
    
    console.log('上传成功: 新增', inserted, '当前总量', result.length);
    res.json({
      ok: true,
      inserted,
      duplicatesSkipped: 0,
      skippedRefs: [],
      total: result.length
    });
  } catch (error) {
    console.error('处理上传请求时出错:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
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

// Delete all products for a specific brand (case-insensitive)
app.delete('/api/brands/:brand', (req, res) => {
  const headerKey = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!headerKey || headerKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const brandRaw = req.params.brand;
  const brand = typeof brandRaw === 'string' ? brandRaw.trim().toLowerCase() : '';
  if (!brand) {
    return res.status(400).json({ error: 'brand_required' });
  }

  const items = readProducts();
  const remaining = [];
  let removed = 0;

  items.forEach((item) => {
    const itemBrand = typeof item.marque === 'string' ? item.marque.trim().toLowerCase() : '';
    if (itemBrand === brand) {
      removed += 1;
    } else {
      remaining.push(item);
    }
  });

  if (removed === 0) {
    return res.status(404).json({ error: 'brand_not_found', removed });
  }

  const ok = writeProducts(remaining);
  if (!ok) {
    return res.status(500).json({ error: 'Failed to save products' });
  }

  console.log(`删除品牌 "${brand}" 项目数量:`, removed, '剩余总量:', remaining.length);
  res.json({ ok: true, removed, total: remaining.length });
});

// 错误处理中间件（必须在所有路由之后）
app.use((err, req, res, next) => {
  console.error('Express 错误:', err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

ensureDataFile().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Data file: ${DATA_FILE}`);
    console.log(`Admin key: ${ADMIN_KEY === 'dev-secret' ? '使用默认密钥（开发模式）' : '已从环境变量加载'}`);
    if (REMOTE_DATA_URL) {
      console.log(`Remote data source: ${REMOTE_DATA_URL}`);
    }
  });
});
