# -*- coding: utf-8 -*-
"""
FastAPI 主應用
整合所有服務模塊，提供 API 端點
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

# 載入 .env 文件（必須在所有其他 import 之前）
from dotenv import load_dotenv
load_dotenv(dotenv_path="/etc/secrets/.env", override=False)
from fastapi import FastAPI, HTTPException, Request, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# 確保可以導入本地模塊
sys.path.insert(0, str(Path(__file__).parent))

# 導入服務模塊
from config import (
    normalize_famille,
    normalize_brand,
    get_brand_website,
)

from services import (
    # 查詢處理
    preprocess_query,
    normalize_brand_in_query,
    enhance_product_type_in_query,
    extract_brand_from_query,
    process_user_query,
    # 商品搜索
    ProductSearcher,
    search_products,
    to_candidate_brief,
    find_top_product_candidates,
    # DeepSeek
    DeepSeekClient,
    normalize_agent_messages,
    # Google 搜索
    reverse_image_search,
)


# ============ 配置 ============

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 數據文件路徑
DATA_DIR = Path(__file__).parent.parent / 'data'
PRODUCTS_FILE = os.getenv('PRODUCTS_JSON_PATH') or str(DATA_DIR / 'products.json')

# 遠端數據 URL（Hugging Face）
REMOTE_DATA_URL = os.getenv('PRODUCTS_DATA_URL') or 'https://huggingface.co/datasets/yixiannn/luxury-products-data/resolve/main/products.json'
REMOTE_DATA_BEARER = os.getenv('PRODUCTS_DATA_BEARER') or os.getenv('HF_DATA_TOKEN') or ''

# 最大查詢長度
MAX_QUERY_LENGTH = 300

# Feel Europe 介紹關鍵詞
ABOUT_FEEL_KEYWORDS = [
    'feel europe', 'feel-europe', 'feeleurope', '介绍feel', 'feel介绍',
    '什么是feel', 'feel是什么', 'about feel', '关于feel', '你自己'
]

# Feel Europe 介紹文本
FEEL_INTRO = '''**關於 Feel Europe**

Chez Feel Europe, nous incarnons l'excellence dans chaque détail. Depuis plus de 10 ans, nous mettons à votre disposition des articles d'exception pour sublimer votre style et votre quotidien. Découvrez un univers où le raffinement rencontre l'élégance, où chaque produit raconte une histoire de perfection.


在 Feel Europe，我們在每一個細節中追求卓越。十餘年來，我們為您提供非凡的精品，提升您的品味與日常生活品質。在這裡，您將發現一個精緻與優雅交融的世界，每一件產品都訴說著完美的故事。'''


# ============ Pydantic 模型 ============

class Message(BaseModel):
    role: str
    content: str


class AgentRequest(BaseModel):
    query: Optional[str] = None
    messages: Optional[List[Message]] = []


class AgentResponse(BaseModel):
    message: str
    intent: Optional[str] = None
    product: Optional[str] = None
    price: Optional[Any] = None
    reference: Optional[str] = None
    matched: Optional[bool] = None
    online: Optional[bool] = None


class NormalizeFamilleRequest(BaseModel):
    famille: str


class NormalizeFamilleResponse(BaseModel):
    original: str
    normalized: str


# ============ FastAPI 應用 ============

app = FastAPI(
    title="Feel Europe Luxury API",
    description="奢侈品價格查詢智能助手 API",
    version="1.0.0",
)

# GZip 壓縮中間件 - 自動壓縮大於 500 字節的響應
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 简单的 IP 日志中间件：在每次请求到达时打印/记录来源 IP
def _get_remote_ip(request: Request) -> str:
    xff = request.headers.get('x-forwarded-for') or request.headers.get('X-Forwarded-For')
    if xff:
        return xff.split(',')[0].strip()
    xr = request.headers.get('x-real-ip') or request.headers.get('X-Real-IP')
    if xr:
        return xr.strip()
    try:
        return request.client.host or 'unknown'
    except Exception:
        return 'unknown'


@app.middleware('http')
async def log_ip_middleware(request: Request, call_next):
    ip = _get_remote_ip(request)
    logger.info(f"[IP] {ip} -> {request.method} {request.url.path}")
    # also print to stdout for quick visibility
    try:
        print(f"[IP] {ip} -> {request.method} {request.url.path}")
    except Exception:
        pass
    return await call_next(request)

# 全局產品緩存（啟動時一次載入，常駐內存）
_products_cache: List[Dict[str, Any]] = []
_products_loaded = False

def get_cached_products() -> List[Dict[str, Any]]:
    """獲取內存中的商品數據（啟動時已載入，無磁盤IO）"""
    return _products_cache


def _load_products_into_memory():
    """將商品數據載入內存並規範化（只在啟動時調用一次）"""
    global _products_cache, _products_loaded
    import time
    
    start = time.time()
    raw = []
    try:
        if os.path.exists(PRODUCTS_FILE):
            with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
                raw = json.load(f)
    except Exception as e:
        logger.error(f"讀取商品數據失敗: {e}")
    
    # 一次性規範化所有 Famille
    _products_cache = [
        {**p, 'Famille': normalize_famille(p.get('Famille', ''))}
        for p in raw
    ]
    _products_loaded = True
    elapsed = time.time() - start
    logger.info(f"✅ 商品數據已載入內存: {len(_products_cache)} 條，耗時 {elapsed:.2f}s")


# ============ 工具函數 ============

def ensure_data_file():
    """確保數據文件存在，如果不存在則從遠端下載"""
    import requests
    
    if os.path.exists(PRODUCTS_FILE):
        logger.info(f"數據文件已存在: {PRODUCTS_FILE}")
        return
    
    if not REMOTE_DATA_URL:
        logger.warning("數據文件不存在且 PRODUCTS_DATA_URL 未設置")
        return
    
    try:
        logger.info(f"正在從 {REMOTE_DATA_URL} 下載數據...")
        headers = {}
        if REMOTE_DATA_BEARER:
            headers['Authorization'] = f'Bearer {REMOTE_DATA_BEARER}'
        
        response = requests.get(REMOTE_DATA_URL, headers=headers, timeout=60)
        response.raise_for_status()
        
        # 確保目錄存在
        os.makedirs(os.path.dirname(PRODUCTS_FILE), exist_ok=True)
        
        # 寫入文件
        with open(PRODUCTS_FILE, 'wb') as f:
            f.write(response.content)
        
        logger.info(f"數據文件下載成功: {PRODUCTS_FILE}")
    except Exception as e:
        logger.error(f"下載數據文件失敗: {e}")


# 應用啟動時：下載數據 → 載入內存
ensure_data_file()
_load_products_into_memory()

# 初始化服務（ProductSearcher 直接使用內存數據）
product_searcher = ProductSearcher(products=_products_cache)
deepseek_client = DeepSeekClient()


def read_products() -> List[Dict[str, Any]]:
    """讀取商品數據（從內存緩存）"""
    return get_cached_products()


def write_products(data: List[Dict[str, Any]]) -> bool:
    """寫入商品數據"""
    try:
        os.makedirs(os.path.dirname(PRODUCTS_FILE), exist_ok=True)
        with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"寫入商品數據失敗: {e}")
        return False


def is_about_feel(query: str) -> bool:
    """檢查是否詢問 Feel Europe 介紹"""
    lower_query = query.lower()
    return any(kw in lower_query for kw in ABOUT_FEEL_KEYWORDS)


# ============ API 端點 ============

@app.get("/api/health")
def health_check():
    """健康檢查端點"""
    return {"ok": True}


@app.post("/api/reverse-image-search")
async def reverse_image_search_endpoint(file: UploadFile = File(...)):
    """
    反向圖片搜索端點
    接收用戶上傳的圖片，上傳到 imgbb，再用 SerpAPI 做 Google 反向圖片搜索。
    返回格式: [{"title": "...", "link": "...", "source": "..."}, ...]
    """
    try:
        image_bytes = await file.read()
        results = reverse_image_search(image_bytes)
        return JSONResponse(content={"results": results})
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"[ReverseImg] 錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 前端列表只需要的精簡字段
LIST_FIELDS = {
    'produit', 'designation', 'descriptif', 'Marque', 'Couleur',
    'Taille', 'Prix_Vente', 'prix_achat', 'Rayon', 'Famille', 'SousFamille',
    'Perso_Lien_Photo', 'image_url', 'Lien_Externe', 'Motif', 'Matiere', 'Dimension',
}

def _slim_product(p: Dict[str, Any]) -> Dict[str, Any]:
    """只返回前端列表需要的字段，減少傳輸量"""
    return {k: v for k, v in p.items() if k in LIST_FIELDS}


@app.get("/api/products")
def get_products(
    page: int = Query(None, ge=1, description="頁碼，從 1 開始"),
    limit: int = Query(None, ge=1, le=500, description="每頁數量，最大 500"),
    brand: str = Query(None, description="按品牌篩選"),
    slim: bool = Query(False, description="是否返回精簡字段"),
):
    """
    獲取商品列表
    
    - 不帶參數：返回所有商品（向後兼容）
    - page + limit：分頁返回
    - brand：按品牌篩選
    - slim=true：只返回列表顯示所需字段
    """
    products = get_cached_products()
    
    # 品牌篩選
    if brand:
        brand_lower = brand.lower().strip()
        products = [p for p in products if p.get('Marque', '').lower().strip() == brand_lower]
    
    # 精簡字段
    if slim:
        products = [_slim_product(p) for p in products]
    
    # 如果沒有分頁參數，返回全部（向後兼容）
    if page is None or limit is None:
        return JSONResponse(
            content=products,
            headers={"Cache-Control": "public, max-age=300"}  # 瀏覽器緩存 5 分鐘
        )
    
    # 分頁
    total = len(products)
    start = (page - 1) * limit
    end = start + limit
    items = products[start:end]
    
    return JSONResponse(
        content={
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        },
        headers={"Cache-Control": "public, max-age=300"}
    )


@app.get("/api/products/{produit}")
def get_product_by_produit(produit: str):
    """根據 produit 獲取商品"""
    products = read_products()
    prod_lower = produit.lower().strip()
    
    for product in products:
        product_prod = str(product.get('produit', '')).lower().strip()
        if product_prod == prod_lower:
            return product
    
    raise HTTPException(status_code=404, detail="商品未找到")


@app.post("/api/normalize-famille")
def normalize_famille_endpoint(request: NormalizeFamilleRequest):
    """標準化 Famille 字段"""
    return NormalizeFamilleResponse(
        original=request.famille,
        normalized=normalize_famille(request.famille)
    )


@app.post("/api/agent")
async def agent_endpoint(request: AgentRequest):
    """
    智能助手主端點
    
    處理用戶查詢，返回商品價格信息或對話回覆
    """
    log_prefix = '[Agent]'
    logger.info(f"{log_prefix} ========== 收到新的 Agent 請求 ==========")
    
    # 提取查詢
    incoming_messages = request.messages or []
    normalized_messages = normalize_agent_messages([m.model_dump() for m in incoming_messages])
    
    # 從最後一條用戶消息獲取查詢
    last_user = None
    for m in reversed(normalized_messages):
        if m.get('role') == 'user':
            last_user = m
            break
    
    raw_query = (request.query or (last_user.get('content') if last_user else '') or '').strip()
    logger.info(f"{log_prefix} 原始查詢: \"{raw_query}\"")
    
    if not raw_query:
        raise HTTPException(status_code=400, detail="query_required")
    
    # 輸入長度限制
    if len(raw_query) > MAX_QUERY_LENGTH:
        logger.warning(f"{log_prefix} 查詢過長: {len(raw_query)} 字符")
        return AgentResponse(
            message='您的查詢內容過長，請精簡後重試。建議直接輸入品牌名稱和商品類型，例如"Dior裙子"或"Gucci包"。',
            intent='error'
        )
    
    # 輸入預處理
    cleaned_query = preprocess_query(raw_query)
    logger.info(f"{log_prefix} 預處理後: \"{cleaned_query}\"")
    
    # 檢測 Feel Europe 介紹請求
    if is_about_feel(cleaned_query):
        logger.info(f"{log_prefix} ✅ 檢測到 Feel Europe 介紹請求")
        return AgentResponse(message=FEEL_INTRO, intent='about_feel')
    
    # 品牌名標準化
    normalized_query = normalize_brand_in_query(cleaned_query)
    logger.info(f"{log_prefix} 品牌標準化後: \"{normalized_query}\"")
    
    # 商品類型增強
    enhanced_query = enhance_product_type_in_query(normalized_query)
    logger.info(f"{log_prefix} 商品類型增強後: \"{enhanced_query}\"")
    
    # 意圖分類
    logger.info(f"{log_prefix} 開始意圖分類...")
    intent_result = deepseek_client.classify_intent_sync(enhanced_query)
    intent = intent_result.get('intent', 'query_price')
    hint = (intent_result.get('hint') or enhanced_query).strip()
    intent_message = intent_result.get('message', '')
    
    logger.info(f"{log_prefix} 意圖分類結果: intent={intent}, hint={hint}")
    
    # 處理 chat 意圖
    if intent == 'chat':
        logger.info(f"{log_prefix} 💬 處理 chat 意圖（閒聊/問候）")
        message = deepseek_client.chat(
            user_query=raw_query,
            history=normalized_messages,
            intent=intent,
            candidates=[],
            online_results='',
        )
        if not message:
            message = intent_message or '\n'.join([
                '您好！我是 Feel 智能助手',
                '',
                '我可以幫您：',
                '• 查詢奢侈品價格（輸入商品名稱或編號）',
                '• 在線搜索品牌新品（說"在線查詢XX品牌商品"）',
                '',
                '請問有什麼可以幫您的？',
            ])
        return AgentResponse(message=message, intent=intent)
    
    # 處理 other 意圖
    if intent == 'other':
        logger.info(f"{log_prefix} ❓ 處理 other 意圖（其他情況）")
        message = deepseek_client.chat(
            user_query=raw_query,
            history=normalized_messages,
            intent=intent,
            candidates=[],
            online_results='',
        )
        if not message:
            message = intent_message or '\n'.join([
                '抱歉，我暫時無法理解您的問題',
                '',
                '您可以嘗試：',
                '• 輸入具體商品名稱，如"Dior Lady Dior包"',
                '• 輸入商品編號/參考號',
                '• 說"在線查詢Gucci裙子"進行網絡搜索',
                '',
                '如有其他問題，歡迎隨時諮詢！',
            ])
        return AgentResponse(message=message, intent=intent)
    
    # 使用內存緩存的商品數據（無磁盤 IO）
    products = get_cached_products()
    lookup_query = normalize_brand_in_query(hint).lower()
    logger.info(f"{log_prefix} 本地查詢關鍵詞: \"{lookup_query}\"")
    logger.info(f"{log_prefix} 本地商品總數: {len(products)}")
    
    # 查找匹配商品
    top_matches = find_top_product_candidates(products, lookup_query, 5)
    matched = top_matches[0]['item'] if top_matches else None
    candidates = to_candidate_brief(top_matches)
    
    if matched:
        logger.info(f"{log_prefix} ✅ 本地匹配成功: {matched.get('reference')}")
    else:
        logger.info(f"{log_prefix} ⚠️ 本地未找到匹配商品")
    
    # 提取商品信息
    product_name = (
        matched.get('designation') or matched.get('descriptif') or matched.get('produit') or '該商品'
    ) if matched else ''
    price = matched.get('Prix_Vente') or matched.get('prix_achat') or '未知' if matched else '未知'
    reference = matched.get('produit', '') if matched else ''
    product_link = matched.get('Lien_Externe', '') if matched else ''
    
    # 處理 query_price_online 意圖
    if intent == 'query_price_online':
        logger.info(f"{log_prefix} 🌐 處理 query_price_online 意圖（在線查詢）")
        
        # 執行在線搜索
        search_query = enhance_product_type_in_query(hint or enhanced_query)
        logger.info(f"{log_prefix} 準備在線搜索: \"{search_query}\"")
        online_results = ''
        
        # 生成回覆
        try:
            reply = deepseek_client.chat(
                user_query=raw_query,
                history=normalized_messages,
                intent=intent,
                candidates=candidates,
                online_results=online_results,
            )
            
            message = reply or (
                f"您好！為您查詢到 **{product_name}**\n💰 價格：{price}€\n📦 參考號：{reference}"
                + (f"\n🔗 {product_link}" if product_link else '')
                if matched else
                '抱歉，暫未找到相關商品。您可以嘗試提供更具體的商品名稱/參考號，或說"在線查詢{品牌}{商品}"我幫您搜索官網。'
            )
            
            return AgentResponse(
                message=message,
                intent=intent,
                product=product_name,
                price=price,
                reference=reference,
                matched=bool(matched),
                online=True,
            )
            
        except Exception as e:
            logger.error(f"{log_prefix} ❌ DeepSeek 回覆失敗: {e}")
            message = (
                f"您好！為您查詢到 **{product_name}**\n💰 價格：{price}€\n📦 參考號：{reference}"
                + (f"\n🔗 {product_link}" if product_link else '')
                if matched else
                '抱歉，在線搜索暫時無法生成結果。建議您稍後重試或直接訪問品牌官網。'
            )
            return AgentResponse(
                message=message,
                intent=intent,
                product=product_name,
                price=price,
                reference=reference,
                matched=bool(matched),
                online=True,
            )
    
    # 處理 query_price 意圖（本地查詢）
    logger.info(f"{log_prefix} 🔍 處理 query_price 意圖（本地查詢）")
    
    # 如果本地未匹配，嘗試在線搜索補充
    online_results = ''
    if not matched:
        logger.info(f"{log_prefix} 本地未匹配，嘗試在線搜索補充...")
        online_results = ''
    
    # 生成回覆
    try:
        reply = deepseek_client.chat(
            user_query=raw_query,
            history=normalized_messages,
            intent=intent,
            candidates=candidates,
            online_results=online_results,
        )
        
        message = reply or (
            f"您好！為您查詢到 **{product_name}**\n💰 價格：{price}€\n📦 參考號：{reference}"
            + (f"\n🔗 {product_link}" if product_link else '')
            if matched else
            '抱歉，暫未找到相關商品。您可以說"在線查詢{品牌}{商品}"我幫您搜索官網。'
        )
        
        return AgentResponse(
            message=message,
            intent=intent,
            product=product_name,
            price=price,
            reference=reference,
            matched=bool(matched),
            online=bool(online_results),
        )
        
    except Exception as e:
        logger.error(f"{log_prefix} ❌ DeepSeek 回覆失敗: {e}")
        message = (
            f"您好！為您查詢到 **{product_name}**\n💰 價格：{price}€\n📦 參考號：{reference}"
            + (f"\n🔗 {product_link}" if product_link else '')
            if matched else
            '抱歉，查詢暫時失敗。請稍後重試。'
        )
        return AgentResponse(
            message=message,
            intent=intent,
            product=product_name,
            price=price,
            reference=reference,
            matched=bool(matched),
        )


# ============ 啟動入口 ============

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 5000))
    uvicorn.run(app, host='0.0.0.0', port=port)
