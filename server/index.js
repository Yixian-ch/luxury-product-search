const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { pipeline } = require('stream/promises');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = process.env.PRODUCTS_JSON_PATH || path.join(__dirname, 'data', 'products.json');
const REMOTE_DATA_URL = process.env.PRODUCTS_DATA_URL || '';
const REMOTE_DATA_BEARER = process.env.PRODUCTS_DATA_BEARER || process.env.HF_DATA_TOKEN || '';
const HAS_GLOBAL_FETCH = typeof fetch === 'function';
// Admin key for protecting write endpoints. Set ADMIN_KEY in environment for production.
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-secret';
const DEEPSEEK_KEY = process.env.Deepseek_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

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

function buildDeepseekClient() {
  if (!DEEPSEEK_KEY) return null;
  try {
    return new OpenAI({
      apiKey: DEEPSEEK_KEY,
      baseURL: DEEPSEEK_BASE_URL,
    });
  } catch (e) {
    console.error('初始化 DeepSeek 客户端失败:', e);
    return null;
  }
}

const deepseekClient = buildDeepseekClient();

async function classifyIntent(rawQuery) {
  if (!deepseekClient) {
    return { intent: 'query_price', hint: rawQuery || '', message: '' };
  }
  try {
    const prompt = [
      {
        role: 'system',
        content: [
          '你是意图分类器，请输出 JSON，不要输出其他内容。',
          '字段: intent (query_price/chat/other), hint (提取的商品名称或参考号，若无则空字符串), message (非查价时给用户的简短中文回复)。',
          '如果用户只是问候/闲聊/无商品信息，则 intent=chat，hint 空，message 提示“请提供商品名称或参考号”。',
          '如果用户明显是查价格，intent=query_price，hint 里放可能的商品名或参考号（可原样）。',
          '不可编造商品或价格。',
        ].join('\n'),
      },
      { role: 'user', content: rawQuery || '' },
    ];

    const resp = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      messages: prompt,
      response_format: { type: 'json_object' },
    });

    const text = resp?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return {
      intent: parsed.intent || 'query_price',
      hint: parsed.hint || rawQuery || '',
      message: parsed.message || '',
    };
  } catch (e) {
    console.error('意图分类失败，回退为查价:', e?.message || e);
    return { intent: 'query_price', hint: rawQuery || '', message: '' };
  }
}

async function askDeepseek({ productName, price, reference, query, matched }) {
  if (!deepseekClient) return null;
  try {
    const prompt = [
      {
        role: 'system',
        content: [
          '你是 Feel 智能助手，请始终用中文、简短回答。',
          '先判断用户意图：如果只是打招呼/闲聊/无商品信息，则礼貌回复并提示“请提供商品名称或参考号”，不要编造价格。',
          '如果明确是查价且有匹配商品和价格，格式固定：您好，我是Feel智能助手，您查询的{商品}价格为{价格}。',
          '如果想查价但缺少商品信息或未匹配到/没有价格，回答：不知道。',
          '不要杜撰商品或价格。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `原始查询: ${query || ''}`,
          `匹配到的商品: ${productName || '无'}`,
          `参考号: ${reference || '无'}`,
          `价格: ${price || '未知'}`,
          `是否匹配到商品: ${matched ? '是' : '否'}`,
        ].join('\n'),
      },
    ];

    const resp = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0.1,
      messages: prompt,
    });

    const msg = resp?.choices?.[0]?.message?.content;
    return (msg || '').toString().trim();
  } catch (e) {
    console.error('调用 DeepSeek 失败:', e?.message || e);
    return null;
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
  if (!fs.existsSync(DATA_FILE)) {
    return res.json([]);
  }

  res.setHeader('Content-Type', 'application/json');
  const stream = fs.createReadStream(DATA_FILE);
  stream.on('error', (err) => {
    console.error('Stream read error:', err);
    res.status(500).json({ error: 'Failed to read products data' });
  });
  stream.pipe(res);
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

// Simple agent endpoint: query by name/reference and respond with price
app.post('/api/agent', async (req, res) => {
  const body = req.body || {};
  const rawQuery = (body.query || '').toString().trim();
  if (!rawQuery) {
    return res.status(400).json({ error: 'query_required' });
  }

  const intentResult = await classifyIntent(rawQuery);
  const intent = intentResult.intent || 'query_price';
  const hint = (intentResult.hint || rawQuery).toString().trim();
  const intentMessage = intentResult.message || '';

  // 如果不是查价，直接用意图回复（或友好提示）
  if (intent !== 'query_price') {
    const message = intentMessage || '请提供商品名称或参考号，我将为您查询价格。';
    return res.json({ message, intent });
  }

  const products = readProducts();
  const lookupQuery = hint.toLowerCase();
  let matched = null;

  for (const item of products) {
    const ref = (item.reference || '').toString().trim().toLowerCase();
    const name = (
      item.produit ||
      item.designation ||
      ''
    ).toString().trim().toLowerCase();

    if (!ref && !name) continue;

    const refHit =
      ref &&
      (lookupQuery === ref || ref.includes(lookupQuery) || lookupQuery.includes(ref));

    const nameHit =
      name &&
      lookupQuery.length >= 3 &&
      name.includes(lookupQuery);

    if (refHit || nameHit) {
      matched = item;
      break;
    }
  }

  const productName = matched
    ? (matched.produit || matched.designation || matched.reference || '该商品').toString()
    : '';
  const price = matched
    ? (matched.prix_vente ?? matched.prix_achat ?? '未知')
    : '未知';
  const reference = matched ? (matched.reference || '') : '';

  // 查价时调用 DeepSeek，失败时回退
  askDeepseek({ productName, price, reference, query: rawQuery, matched: Boolean(matched) })
    .then((reply) => {
      const message =
        (reply && reply.trim()) ||
        (matched
          ? `您好，我是Feel智能助手，您查询的${productName}价格为${price}欧元`
          : '不知道');
      res.json({ message, product: productName, price, reference, matched: Boolean(matched), intent });
    })
    .catch((err) => {
      console.error('agent 回复失败，使用本地回退:', err);
      const message = matched
        ? `您好，我是Feel智能助手，您查询的${productName}价格为${price}`
        : '不知道';
      res.json({ message, product: productName, price, reference, matched: Boolean(matched), intent });
    });
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
