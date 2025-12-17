require('dotenv').config();

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
const GOOGLE_SEARCH_API_KEY = process.env.Google_Search_API_KEY || process.env.GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_SEARCH_ENGINE_ID = '764a84f1e63f549d8';

// 品牌到官网域名的映射
const BRAND_WEBSITE_MAP = {
  'dior': 'dior.com',
  'gucci': 'gucci.com',
  'prada': 'prada.com',
  'burberry': 'burberry.com',
  'fendi': 'fendi.com',
  'celine': 'celine.com',
  'loewe': 'loewe.com',
  'maxmara': 'maxmara.com',
  'moncler': 'moncler.com',
  'ysl': 'ysl.com',
  'saint laurent': 'ysl.com',
  'miumiu': 'miumiu.com',
  'margiela': 'maisonmargiela.com',
  'acne': 'acnestudios.com',
  'qeelin': 'qeelin.com',
  'fred': 'fred.com',
  'chanel': 'chanel.com',
  'hermes': 'hermes.com',
  'louis vuitton': 'louisvuitton.com',
  'lv': 'louisvuitton.com',
  'cartier': 'cartier.com',
  'tiffany': 'tiffany.com',
  'bulgari': 'bulgari.com',
  'bvlgari': 'bulgari.com',
  'versace': 'versace.com',
  'valentino': 'valentino.com',
  'balenciaga': 'balenciaga.com',
  'bottega veneta': 'bottegaveneta.com',
  'givenchy': 'givenchy.com',
  'alexander mcqueen': 'alexandermcqueen.com',
  'chloe': 'chloe.com',
  'ferragamo': 'ferragamo.com',
  'armani': 'armani.com',
  'dolce gabbana': 'dolcegabbana.com',
  'coach': 'coach.com',
  'michael kors': 'michaelkors.com',
  'kate spade': 'katespade.com',
  'tod': 'tods.com',
  'roger vivier': 'rogervivier.com',
  'jimmy choo': 'jimmychoo.com',
  'christian louboutin': 'christianlouboutin.com',
  'omega': 'omegawatches.com',
  'rolex': 'rolex.com',
  'patek philippe': 'patek.com',
  'van cleef': 'vancleefarpels.com',
};

// 品牌别名映射（中文、常见拼写错误、简写等 -> 标准英文名）
const BRAND_ALIASES = {
  // 迪奥
  '迪奥': 'dior', 'christian dior': 'dior', '克里斯汀迪奥': 'dior',
  // 古驰
  '古驰': 'gucci', '古琦': 'gucci', '古奇': 'gucci',
  // 普拉达
  '普拉达': 'prada', '普拉達': 'prada',
  // 爱马仕
  '爱马仕': 'hermes', '愛馬仕': 'hermes', '艾尔梅斯': 'hermes',
  // 香奈儿
  '香奈儿': 'chanel', '香奈兒': 'chanel', '夏奈尔': 'chanel',
  // 圣罗兰
  '圣罗兰': 'saint laurent', '聖羅蘭': 'saint laurent', 'ysl': 'saint laurent', '伊夫圣罗兰': 'saint laurent',
  // 路易威登
  '路易威登': 'louis vuitton', '路易維登': 'louis vuitton', 'lv': 'louis vuitton', '威登': 'louis vuitton',
  // 巴宝莉
  '巴宝莉': 'burberry', '巴寶莉': 'burberry', '博柏利': 'burberry',
  // 芬迪
  '芬迪': 'fendi', '芬蒂': 'fendi',
  // 赛琳
  '赛琳': 'celine', '塞琳': 'celine', '思琳': 'celine', 'céline': 'celine',
  // 罗意威
  '罗意威': 'loewe', '羅意威': 'loewe', '罗威': 'loewe',
  // 麦丝玛拉
  '麦丝玛拉': 'maxmara', '麥絲瑪拉': 'maxmara', 'max mara': 'maxmara',
  // 盟可睐
  '盟可睐': 'moncler', '蒙口': 'moncler', '蒙克莱': 'moncler',
  // 缪缪
  '缪缪': 'miumiu', '繆繆': 'miumiu', 'miu miu': 'miumiu',
  // 马吉拉
  '马吉拉': 'margiela', '馬吉拉': 'margiela', 'maison margiela': 'margiela', 'mm6': 'margiela',
  // 卡地亚
  '卡地亚': 'cartier', '卡地亞': 'cartier',
  // 蒂芙尼
  '蒂芙尼': 'tiffany', '蒂凡尼': 'tiffany', 'tiffany co': 'tiffany',
  // 宝格丽
  '宝格丽': 'bulgari', '寶格麗': 'bulgari', 'bvlgari': 'bulgari',
  // 范思哲
  '范思哲': 'versace', '範思哲': 'versace', '凡赛斯': 'versace',
  // 华伦天奴
  '华伦天奴': 'valentino', '華倫天奴': 'valentino',
  // 巴黎世家
  '巴黎世家': 'balenciaga', '巴黎世家': 'balenciaga',
  // 葆蝶家
  '葆蝶家': 'bottega veneta', 'bv': 'bottega veneta', '宝缇嘉': 'bottega veneta',
  // 纪梵希
  '纪梵希': 'givenchy', '紀梵希': 'givenchy',
  // 亚历山大麦昆
  '亚历山大麦昆': 'alexander mcqueen', '麦昆': 'alexander mcqueen', 'mcqueen': 'alexander mcqueen',
  // 蔻依
  '蔻依': 'chloe', '珂洛艾伊': 'chloe', 'chloé': 'chloe',
  // 菲拉格慕
  '菲拉格慕': 'ferragamo', '菲拉格默': 'ferragamo', 'salvatore ferragamo': 'ferragamo',
  // 阿玛尼
  '阿玛尼': 'armani', '亞曼尼': 'armani', 'giorgio armani': 'armani',
  // 杜嘉班纳
  '杜嘉班纳': 'dolce gabbana', 'dg': 'dolce gabbana', 'd&g': 'dolce gabbana',
  // 蔻驰
  '蔻驰': 'coach', '寇驰': 'coach',
  // 迈克高仕
  '迈克高仕': 'michael kors', 'mk': 'michael kors',
  // 凯特丝蓓
  '凯特丝蓓': 'kate spade', 'ks': 'kate spade',
  // 托德斯
  '托德斯': 'tod', 'tods': 'tod', "tod's": 'tod',
  // 罗杰维维亚
  '罗杰维维亚': 'roger vivier', 'rv': 'roger vivier',
  // 周仰杰
  '周仰杰': 'jimmy choo', '吉米周': 'jimmy choo',
  // 克里斯提鲁布托
  '红底鞋': 'christian louboutin', '鲁布托': 'christian louboutin', 'louboutin': 'christian louboutin', 'cl': 'christian louboutin',
  // 欧米茄
  '欧米茄': 'omega', '歐米茄': 'omega',
  // 劳力士
  '劳力士': 'rolex', '勞力士': 'rolex',
  // 百达翡丽
  '百达翡丽': 'patek philippe', '百達翡麗': 'patek philippe',
  // 梵克雅宝
  '梵克雅宝': 'van cleef', '梵克雅寶': 'van cleef', 'vca': 'van cleef',
  // 艾克妮
  '艾克妮': 'acne', 'acne studios': 'acne',
  // 麒麟
  '麒麟': 'qeelin',
  // 斐登
  '斐登': 'fred',
};

// 商品类型关键词映射（中文 -> 多语言搜索词）
const PRODUCT_TYPE_MAP = {
  // 服装类
  '裙子': 'skirt jupe robe dress',
  '裙': 'skirt jupe robe dress',
  '连衣裙': 'dress robe',
  '半裙': 'skirt jupe',
  '外套': 'coat jacket manteau veste',
  '大衣': 'coat manteau overcoat',
  '夹克': 'jacket veste blouson',
  '风衣': 'trench coat trench',
  '西装': 'suit blazer costume',
  '衬衫': 'shirt chemise blouse',
  '毛衣': 'sweater pull pullover knitwear',
  '针织': 'knitwear maille tricot',
  'T恤': 't-shirt tee',
  '裤子': 'pants trousers pantalon',
  '牛仔裤': 'jeans denim',
  '短裤': 'shorts',
  // 包袋类
  '包': 'bag sac handbag',
  '包包': 'bag sac handbag',
  '手袋': 'handbag sac',
  '手提包': 'tote bag cabas',
  '斜挎包': 'crossbody bag bandouliere',
  '单肩包': 'shoulder bag',
  '双肩包': 'backpack sac dos',
  '钱包': 'wallet portefeuille',
  '卡包': 'card holder porte carte',
  '腰包': 'belt bag',
  // 鞋类
  '鞋': 'shoes chaussures',
  '鞋子': 'shoes chaussures',
  '高跟鞋': 'heels pumps escarpins',
  '运动鞋': 'sneakers baskets trainers',
  '凉鞋': 'sandals sandales',
  '靴子': 'boots bottes',
  '乐福鞋': 'loafers mocassins',
  '平底鞋': 'flats ballerines',
  // 配饰类
  '手表': 'watch montre',
  '腕表': 'watch montre timepiece',
  '项链': 'necklace collier',
  '戒指': 'ring bague',
  '耳环': 'earrings boucles oreilles',
  '手链': 'bracelet',
  '手镯': 'bangle bracelet',
  '太阳镜': 'sunglasses lunettes soleil',
  '眼镜': 'glasses lunettes',
  '围巾': 'scarf foulard echarpe',
  '丝巾': 'silk scarf carre',
  '帽子': 'hat chapeau cap',
  '皮带': 'belt ceinture',
  '腰带': 'belt ceinture',
  // 珠宝类
  '珠宝': 'jewelry joaillerie bijoux',
  '首饰': 'jewelry bijoux accessoires',
  '钻石': 'diamond diamant',
  // 香水化妆品
  '香水': 'perfume parfum fragrance',
  '口红': 'lipstick rouge levres',
  '化妆品': 'makeup maquillage cosmetics',
};

/**
 * 输入预处理：清理和标准化用户输入
 */
function preprocessQuery(query) {
  if (!query) return '';
  
  return query
    .trim()
    .replace(/\s+/g, ' ')           // 多空格合并为单空格
    .replace(/[""''「」『』【】]/g, '"')  // 统一引号
    .replace(/[，。！？；：]/g, match => {  // 中文标点转英文
      const map = { '，': ',', '。': '.', '！': '!', '？': '?', '；': ';', '：': ':' };
      return map[match] || match;
    });
}

/**
 * 品牌名标准化：将各种别名转换为标准英文名
 */
function normalizeBrandInQuery(query) {
  let normalized = query.toLowerCase();
  
  // 按照别名长度排序（长的先替换，避免部分匹配问题）
  const sortedAliases = Object.entries(BRAND_ALIASES)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, standard] of sortedAliases) {
    const regex = new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    normalized = normalized.replace(regex, standard);
  }
  
  return normalized;
}

/**
 * 增强商品类型关键词：添加多语言搜索词
 */
function enhanceProductTypeInQuery(query) {
  let enhanced = query;
  
  for (const [chinese, multilang] of Object.entries(PRODUCT_TYPE_MAP)) {
    if (query.includes(chinese)) {
      // 添加英文/法文关键词以提高搜索准确性
      const keywords = multilang.split(' ')[0]; // 取第一个英文词
      if (!query.toLowerCase().includes(keywords)) {
        enhanced = `${enhanced} ${keywords}`;
      }
      break; // 只增强一个商品类型
    }
  }
  
  return enhanced;
}

/**
 * 从查询中提取品牌名称（使用标准化后的查询）
 */
function extractBrandFromQuery(query) {
  // 先标准化品牌名
  const normalizedQuery = normalizeBrandInQuery(query);
  
  for (const [brand, domain] of Object.entries(BRAND_WEBSITE_MAP)) {
    if (normalizedQuery.includes(brand)) {
      return { brand, domain };
    }
  }
  return null;
}

/**
 * 智能增强搜索查询
 * 1. 检测"最新"、"new"、"latest"等关键词，添加相关搜索词
 * 2. 自动添加当前季节信息
 */
function enhanceSearchQuery(originalQuery) {
  const lowerQuery = originalQuery.toLowerCase();
  let enhancedQuery = originalQuery;
  
  const latestKeywords = ['最新', 'new', 'latest', 'newest', 'recent', 'nouveau', 'nouveauté'];
  const hasLatestIntent = latestKeywords.some(keyword => lowerQuery.includes(keyword));
  
  if (hasLatestIntent) {
    if (!lowerQuery.includes('new') && !lowerQuery.includes('最新')) {
      enhancedQuery = `new ${enhancedQuery}`;
    }
    if (!lowerQuery.includes('collection')) {
      enhancedQuery = `${enhancedQuery} collection`;
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    let season = '';
    if (currentMonth >= 1 && currentMonth <= 3) {
      season = 'Spring';
    } else if (currentMonth >= 4 && currentMonth <= 6) {
      season = 'Summer';
    } else if (currentMonth >= 7 && currentMonth <= 9) {
      season = 'Fall';
    } else {
      season = 'Winter';
    }
    
    const seasonQuery = `${season} ${currentYear}`;
    if (!lowerQuery.includes(currentYear.toString()) && !lowerQuery.includes(season.toLowerCase())) {
      enhancedQuery = `${enhancedQuery} ${seasonQuery}`;
    }
  }
  
  return enhancedQuery.trim();
}

/**
 * 对搜索结果排序：法国官网优先，其他官网其次
 * 不再过滤掉非法国结果，而是排序后全部返回
 */
function sortByFrenchFirst(items, brandDomain) {
  if (brandDomain !== 'dior.com') {
    return items;
  }
  
  // 分类：法国官网 vs 其他
  const frenchItems = [];
  const otherItems = [];
  
  for (const item of items) {
    const link = (item.link || '').toLowerCase();
    if (link.includes('/fr_fr/')) {
      frenchItems.push(item);
    } else {
      otherItems.push(item);
    }
  }
  
  // 法国官网优先返回
  return [...frenchItems, ...otherItems];
}

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
  const logPrefix = '[Intent]';
  console.log(`${logPrefix} 开始意图分类，查询: "${rawQuery}"`);
  
  if (!deepseekClient) {
    console.warn(`${logPrefix} ⚠️  DeepSeek 客户端未初始化，使用默认意图 query_price`);
    return { intent: 'query_price', hint: rawQuery || '', message: '' };
  }
  try {
    const prompt = [
      {
        role: 'system',
        content: [
          '你是意图分类器，请输出 JSON，不要输出其他内容。',
          '字段: intent (query_price_online/query_price/chat/other), hint (提取的商品名称或参考号，若无则空字符串), message (非查价时给用户的简短中文回复)。',
          '判断规则：',
          '- query_price_online: 用户明确要求"在线查询"、"上网查"、"搜索"等关键词，且包含商品信息',
          '- query_price: 用户想查价格，但没有明确要求在线查询',
          '- chat: 用户只是问候/闲聊/无商品信息',
          '- other: 其他情况',
          '如果 intent=chat，message 应为："您好，我是Feel智能助手，您可以给我商品具体名称或者识别码我来帮您查询它们对应的价格，如果您想要我在线查询某个商品的信息请说在线查询XX品牌的商品"',
          '不可编造商品或价格。',
        ].join('\n'),
      },
      { role: 'user', content: rawQuery || '' },
    ];

    const startTime = Date.now();
    const resp = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      messages: prompt,
      response_format: { type: 'json_object' },
    });
    const duration = Date.now() - startTime;
    
    const text = resp?.choices?.[0]?.message?.content || '';
    console.log(`${logPrefix} DeepSeek 响应时间: ${duration}ms`);
    console.log(`${logPrefix} DeepSeek 原始响应:`, text);
    
    const parsed = JSON.parse(text);
    const result = {
      intent: parsed.intent || 'query_price',
      hint: parsed.hint || rawQuery || '',
      message: parsed.message || '',
    };
    
    console.log(`${logPrefix} ✅ 意图分类完成:`, result);
    return result;
  } catch (e) {
    console.error(`${logPrefix} ❌ 意图分类失败:`, {
      message: e?.message,
      stack: e?.stack,
      query: rawQuery,
    });
    console.log(`${logPrefix} 回退为默认意图 query_price`);
    return { intent: 'query_price', hint: rawQuery || '', message: '' };
  }
}

async function searchOnline(query) {
  const logPrefix = '[Google Search]';
  console.log(`${logPrefix} ========== 开始在线搜索 ==========`);
  console.log(`${logPrefix} 原始查询: "${query}"`);
  
  if (!GOOGLE_SEARCH_API_KEY) {
    console.error(`${logPrefix} ❌ 错误: Google Search API Key 未配置`);
    return '未配置 Google Search API Key';
  }
  
  console.log(`${logPrefix} API Key: ${GOOGLE_SEARCH_API_KEY.substring(0, 10)}... (已配置)`);
  console.log(`${logPrefix} 搜索引擎 ID: ${GOOGLE_SEARCH_ENGINE_ID}`);

  try {
    // 提取品牌信息
    const brandInfo = extractBrandFromQuery(query);
    let enhancedQuery = enhanceSearchQuery(query);
    
    // 构建搜索 URL - 限制到品牌官网但不限制语言版本
    if (brandInfo) {
      console.log(`${logPrefix} 检测到品牌: ${brandInfo.brand}`);
      enhancedQuery = `${enhancedQuery} site:${brandInfo.domain}`;
      console.log(`${logPrefix} 🌐 限制搜索为 ${brandInfo.domain}`);
    }
    
    console.log(`${logPrefix} 增强后查询: "${enhancedQuery}"`);
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(GOOGLE_SEARCH_API_KEY)}&cx=${encodeURIComponent(GOOGLE_SEARCH_ENGINE_ID)}&q=${encodeURIComponent(enhancedQuery)}&num=10`;
    console.log(`${logPrefix} 请求 URL: ${searchUrl.replace(GOOGLE_SEARCH_API_KEY, '***')}`);
    
    const startTime = Date.now();
    const response = await fetch(searchUrl);
    const requestDuration = Date.now() - startTime;
    console.log(`${logPrefix} API 响应时间: ${requestDuration}ms`);
    console.log(`${logPrefix} HTTP 状态码: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} ❌ API 返回错误状态:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500),
      });
      throw new Error(`Google Search API 返回错误: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`${logPrefix} API 响应数据结构:`, {
      hasItems: !!data.items,
      itemsCount: data.items?.length || 0,
      hasError: !!data.error,
    });
    
    if (data.error) {
      console.error(`${logPrefix} ❌ Google Search API 错误:`, JSON.stringify(data.error, null, 2));
      return `搜索API错误: ${data.error.message || JSON.stringify(data.error)}`;
    }
    
    let items = data.items || [];
    console.log(`${logPrefix} 原始结果数量: ${items.length}`);
    
    // 对 Dior 结果排序：法国官网优先
    if (brandInfo && brandInfo.domain === 'dior.com') {
      items = sortByFrenchFirst(items, brandInfo.domain);
      const frenchCount = items.filter(i => (i.link || '').toLowerCase().includes('/fr_fr/')).length;
      console.log(`${logPrefix} 🇫🇷 法国官网结果: ${frenchCount}/${items.length}`);
    }
    
    if (items.length === 0) {
      console.warn(`${logPrefix} ⚠️  未找到搜索结果`);
      return '未找到相关商品信息';
    }

    // 提取结果：只返回标题、链接、摘要
    const results = items.slice(0, 5).map((item, index) => {
      const title = item.title || '';
      const snippet = item.snippet || '';
      const link = item.link || '';
      
      console.log(`${logPrefix} 结果 ${index + 1}: ${title.substring(0, 40)}...`);
      
      return `标题: ${title}\n摘要: ${snippet}\n链接: ${link}`;
    });

    const resultText = results.join('\n\n');
    console.log(`${logPrefix} ✅ 搜索成功，返回 ${results.length} 条结果`);
    console.log(`${logPrefix} ========== 搜索完成 ==========`);
    return resultText;
  } catch (e) {
    console.error(`${logPrefix} ❌ 在线搜索异常:`, {
      message: e?.message,
      stack: e?.stack,
      query: query,
    });
    console.log(`${logPrefix} ========== 搜索失败 ==========`);
    return `在线搜索失败: ${e?.message || '未知错误'}`;
  }
}

async function askDeepseek({ productName, price, reference, query, matched, onlineResults, brand, link }) {
  if (!deepseekClient) return null;
  try {
    const systemContent = onlineResults
      ? [
          '你是 Feel 智能助手，一位专业的奢侈品顾问。请用中文回答，语气专业、友好、有温度。',
          '',
          '【角色定位】',
          '你是用户的私人奢侈品顾问，帮助他们了解品牌新品和时尚资讯。',
          '',
          '【回复格式】',
          '1. 开头用一句话热情回应，说明找到了什么',
          '2. 为每个商品提供：',
          '   **商品名称**',
          '   简洁描述（1-2句，突出亮点/特色）',
          '   🔗 链接地址',
          '',
          '3. 结尾可以添加一句贴心建议或邀请继续咨询',
          '',
          '【注意事项】',
          '- 保持专业但不失亲切的语气',
          '- 链接必须完整（https://开头），单独成行',
          '- 如果有价格信息，务必提取并告知',
          '- 如搜索结果包含"未配置"、"失败"、"错误"、"未找到"，礼貌回复：',
          '  "很抱歉，在线搜索暂时无法获取结果。建议您直接访问品牌官方网站查看最新商品，如有其他问题随时问我～"',
          '- 绝不杜撰信息',
        ].join('\n')
      : [
          '你是 Feel 智能助手，一位专业的奢侈品顾问。请用中文回答，语气专业、友好。',
          '',
          '【回复规则】',
          '1. 如果匹配到商品且有价格和链接：',
          '   "您好！为您查询到 **{商品名}**',
          '   💰 价格：{价格}€',
          '   📦 参考号：{参考号}',
          '   🔗 {链接地址}',
          '   如有其他问题随时问我～"',
          '',
          '2. 如果匹配到商品但没有链接：',
          '   "您好！为您查询到 **{商品名}**',
          '   💰 价格：{价格}€',
          '   📦 参考号：{参考号}',
          '   如需查看官网详情，可以说"在线查询{品牌}{商品}"～"',
          '',
          '3. 如果未匹配到商品：',
          '   "抱歉，暂未在数据库中找到相关商品',
          '   您可以：',
          '   • 检查商品名称或编号是否正确',
          '   • 尝试说"在线查询{品牌}{商品}"搜索官网',
          '   有其他问题随时问我～"',
          '',
          '【注意】',
          '- 绝不杜撰商品或价格',
          '- 价格单位是欧元（€）',
          '- 如果有链接，必须完整显示（https://开头），单独成行',
          '- 保持友好专业的语气',
        ].join('\n');

    const userContent = onlineResults
      ? [
          `用户想查询: ${query || ''}`,
          '',
          `在线搜索结果:`,
          onlineResults,
        ].join('\n')
      : [
          `用户查询: ${query || ''}`,
          `商品名称: ${productName || '无'}`,
          `参考号: ${reference || '无'}`,
          `价格: ${price || '未知'}`,
          `品牌: ${brand || '未知'}`,
          `商品链接: ${link || '无'}`,
          `是否匹配到商品: ${matched ? '是' : '否'}`,
        ].join('\n');

    const prompt = [
      {
        role: 'system',
        content: systemContent,
      },
      {
        role: 'user',
        content: userContent,
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
  const logPrefix = '[Agent]';
  console.log(`${logPrefix} ========== 收到新的 Agent 请求 ==========`);
  
  const body = req.body || {};
  const rawQuery = (body.query || '').toString().trim();
  console.log(`${logPrefix} 原始查询: "${rawQuery}"`);
  
  if (!rawQuery) {
    console.warn(`${logPrefix} ⚠️  查询为空，返回错误`);
    return res.status(400).json({ error: 'query_required' });
  }

  // 输入长度限制（防止 API 成本过高）
  const MAX_QUERY_LENGTH = 300;
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    console.warn(`${logPrefix} ⚠️  查询过长: ${rawQuery.length} 字符`);
    return res.json({ 
      message: '您的查询内容过长，请精简后重试。建议直接输入品牌名称和商品类型，例如"Dior裙子"或"Gucci包"。',
      intent: 'error' 
    });
  }

  // 🔧 输入预处理
  const cleanedQuery = preprocessQuery(rawQuery);
  console.log(`${logPrefix} 预处理后: "${cleanedQuery}"`);

  // 🏢 检测是否询问 Feel Europe 介绍
  const aboutFeelKeywords = ['feel europe', 'feel-europe', 'feeleurope', '介绍feel', 'feel介绍', '什么是feel', 'feel是什么', 'about feel', '关于feel',"你自己"];
  const lowerQuery = cleanedQuery.toLowerCase();
  const isAboutFeel = aboutFeelKeywords.some(kw => lowerQuery.includes(kw));
  
  if (isAboutFeel) {
    console.log(`${logPrefix} ✅ 检测到 Feel Europe 介绍请求`);
    const feelIntro = [
      '**关于 Feel Europe**',
      '',
      'Chez Feel Europe, nous incarnons l\'excellence dans chaque détail. Depuis plus de 10 ans, nous mettons à votre disposition des articles d\'exception pour sublimer votre style et votre quotidien. Découvrez un univers où le raffinement rencontre l\'élégance, où chaque produit raconte une histoire de perfection.',
      '',
      '',
      '在 Feel Europe，我们在每一个细节中追求卓越。十余年来，我们为您提供非凡的精品，提升您的品味与日常生活品质。在这里，您将发现一个精致与优雅交融的世界，每一件产品都诉说着完美的故事。'
    ].join('\n');
    
    return res.json({
      message: feelIntro,
      intent: 'about_feel'
    });
  }
  
  // 🔧 品牌名标准化
  const normalizedQuery = normalizeBrandInQuery(cleanedQuery);
  console.log(`${logPrefix} 品牌标准化后: "${normalizedQuery}"`);
  
  // 🔧 商品类型增强
  const enhancedQuery = enhanceProductTypeInQuery(normalizedQuery);
  console.log(`${logPrefix} 商品类型增强后: "${enhancedQuery}"`);

  console.log(`${logPrefix} 开始意图分类...`);
  const intentResult = await classifyIntent(enhancedQuery);
  const intent = intentResult.intent || 'query_price';
  const hint = (intentResult.hint || enhancedQuery).toString().trim();
  const intentMessage = intentResult.message || '';
  
  console.log(`${logPrefix} 意图分类结果:`, {
    intent,
    hint,
    hasMessage: !!intentMessage,
  });

  // 处理 chat 意图
  if (intent === 'chat') {
    console.log(`${logPrefix} 💬 处理 chat 意图（闲聊/问候）`);
    const message = intentMessage || [
      '您好！我是 Feel 智能助手 🌟',
      '',
      '我可以帮您：',
      '• 查询奢侈品价格（输入商品名称或编号）',
      '• 在线搜索品牌新品（说"在线查询XX品牌商品"）',
      '',
      '支持 Dior、Gucci、Prada、LV、Chanel 等 40+ 奢侈品牌',
      '请问有什么可以帮您的？',
    ].join('\n');
    console.log(`${logPrefix} ========== 请求处理完成 ==========`);
    return res.json({ message, intent });
  }

  // 处理 other 意图
  if (intent === 'other') {
    console.log(`${logPrefix} ❓ 处理 other 意图（其他情况）`);
    const message = intentMessage || [
      '抱歉，我暂时无法理解您的问题 😅',
      '',
      '您可以尝试：',
      '• 输入具体商品名称，如"Dior Lady Dior包"',
      '• 输入商品编号/参考号',
      '• 说"在线查询Gucci裙子"进行网络搜索',
      '',
      '如有其他问题，欢迎随时咨询！',
    ].join('\n');
    console.log(`${logPrefix} ========== 请求处理完成 ==========`);
    return res.json({ message, intent });
  }

  // 处理 query_price_online 意图
  if (intent === 'query_price_online') {
    const onlineLogPrefix = '[Agent/Online]';
    console.log(`${onlineLogPrefix} ========== 处理在线查询请求 ==========`);
    console.log(`${onlineLogPrefix} 原始查询: "${rawQuery}"`);
    console.log(`${onlineLogPrefix} 预处理后: "${enhancedQuery}"`);
    console.log(`${onlineLogPrefix} 意图分类结果:`, { intent, hint, intentMessage });
    
    const products = readProducts();
    // 使用品牌标准化后的 hint
    const lookupQuery = normalizeBrandInQuery(hint).toLowerCase();
    console.log(`${onlineLogPrefix} 本地查询关键词: "${lookupQuery}"`);
    console.log(`${onlineLogPrefix} 本地商品总数: ${products.length}`);
    
    let matched = null;

    // 先尝试本地查询
    console.log(`${logPrefix} 开始本地商品匹配...`);
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
        console.log(`${logPrefix} ✅ 本地匹配成功:`, {
          reference: item.reference,
          produit: item.produit,
          designation: item.designation,
          prix_vente: item.prix_vente,
        });
        break;
      }
    }
    
    if (!matched) {
      console.log(`${logPrefix} ⚠️  本地未找到匹配商品`);
    }

    const productName = matched
      ? (matched.produit || matched.designation || matched.reference || '该商品').toString()
      : '';
    const price = matched
      ? (matched.prix_vente ?? matched.prix_achat ?? '未知')
      : '未知';
    const reference = matched ? (matched.reference || '') : '';
    // 提取商品链接（lien_externe 是商品页面链接，img_url 是图片链接）
    const productLink = matched 
      ? (matched.lien_externe || '') 
      : '';
    
    // 提取品牌信息
    const brandInfo = extractBrandFromQuery(enhancedQuery);
    const brandName = brandInfo ? brandInfo.brand : (matched?.marque || '');

    // 进行在线搜索（使用增强后的查询）
    const searchQuery = enhanceProductTypeInQuery(hint || enhancedQuery);
    console.log(`${onlineLogPrefix} 准备在线搜索，查询内容: "${searchQuery}"`);
    const onlineResults = await searchOnline(searchQuery);
    console.log(`${onlineLogPrefix} 在线搜索结果:`, {
      resultLength: onlineResults.length,
      preview: onlineResults.substring(0, 200) + (onlineResults.length > 200 ? '...' : ''),
    });

    // 调用 DeepSeek 生成回复
    console.log(`${onlineLogPrefix} 调用 DeepSeek 生成回复...`);
    try {
      const reply = await askDeepseek({
        productName,
        price,
        reference,
        query: rawQuery,
        matched: Boolean(matched),
        onlineResults,
        brand: brandName,
        link: productLink,
      });

      const message =
        (reply && reply.trim()) ||
        (matched
          ? `您好，我是Feel智能助手，您查询的${productName}价格为${price}欧元`
          : '不知道');
      
      console.log(`${logPrefix} ✅ 生成最终回复:`, message.substring(0, 100) + (message.length > 100 ? '...' : ''));
      console.log(`${logPrefix} ========== 请求处理完成 ==========`);
      
      return res.json({ message, product: productName, price, reference, matched: Boolean(matched), intent, online: true });
    } catch (err) {
      console.error(`${logPrefix} ❌ DeepSeek 回复失败:`, err);
      const message = matched
        ? `您好，我是Feel智能助手，您查询的${productName}价格为${price}欧元`
        : '不知道';
      console.log(`${logPrefix} ========== 使用本地回退 ==========`);
      return res.json({ message, product: productName, price, reference, matched: Boolean(matched), intent, online: true });
    }
  }

  // 处理 query_price 意图（本地查询）
  console.log(`${logPrefix} 🔍 处理 query_price 意图（本地查询）`);
  const products = readProducts();
  const lookupQuery = hint.toLowerCase();
  console.log(`${logPrefix} 本地查询关键词: "${lookupQuery}"`);
  console.log(`${logPrefix} 本地商品总数: ${products.length}`);
  
  let matched = null;

  console.log(`${logPrefix} 开始本地商品匹配...`);
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
      console.log(`${logPrefix} ✅ 本地匹配成功:`, {
        reference: item.reference,
        produit: item.produit,
        designation: item.designation,
        prix_vente: item.prix_vente,
      });
      break;
    }
  }
  
  if (!matched) {
    console.log(`${logPrefix} ⚠️  本地未找到匹配商品`);
  }

  const productName = matched
    ? (matched.produit || matched.designation || matched.reference || '该商品').toString()
    : '';
  const price = matched
    ? (matched.prix_vente ?? matched.prix_achat ?? '未知')
    : '未知';
  const reference = matched ? (matched.reference || '') : '';
  // 提取商品链接（lien_externe 是商品页面链接，img_url 是图片链接）
  const productLink = matched 
    ? (matched.lien_externe || '') 
    : '';
  
  // 提取品牌信息
  const localBrandInfo = extractBrandFromQuery(enhancedQuery);
  const brandName = localBrandInfo ? localBrandInfo.brand : (matched?.marque || '');

  // 查价时调用 DeepSeek，失败时回退
  console.log(`${logPrefix} 调用 DeepSeek 生成回复...`);
  console.log(`${logPrefix} 商品链接: "${productLink}"`);
  askDeepseek({ productName, price, reference, query: rawQuery, matched: Boolean(matched), brand: brandName, link: productLink })
    .then((reply) => {
      // 构建回退消息（包含链接）
      let fallbackMsg = matched
        ? `您好！为您查询到 **${productName}**\n💰 价格：${price}€\n📦 参考号：${reference}`
        : '抱歉，暂未找到相关商品。您可以尝试说"在线查询{品牌}{商品}"搜索官网～';
      if (matched && productLink) {
        fallbackMsg += `\n🔗 ${productLink}`;
      }
      
      const message = (reply && reply.trim()) || fallbackMsg;
      console.log(`${logPrefix} ✅ 生成最终回复:`, message.substring(0, 100) + (message.length > 100 ? '...' : ''));
      console.log(`${logPrefix} ========== 请求处理完成 ==========`);
      res.json({ message, product: productName, price, reference, link: productLink, matched: Boolean(matched), intent });
    })
    .catch((err) => {
      console.error(`${logPrefix} ❌ DeepSeek 回复失败:`, err);
      let message = matched
        ? `您好！为您查询到 **${productName}**\n💰 价格：${price}€\n📦 参考号：${reference}`
        : '抱歉，暂未找到相关商品信息。';
      if (matched && productLink) {
        message += `\n🔗 ${productLink}`;
      }
      console.log(`${logPrefix} ========== 使用本地回退 ==========`);
      res.json({ message, product: productName, price, reference, link: productLink, matched: Boolean(matched), intent });
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
