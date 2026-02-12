# -*- coding: utf-8 -*-
"""
Google 搜索模塊
包含 Google Custom Search API 調用、品牌官網限制搜索等功能
"""

import os
import sys
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import quote
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# 確保可以導入本地模塊
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.query_processor import (
    extract_brand_from_query,
    enhance_search_query,
    sort_by_french_first,
)

# 配置日誌
logger = logging.getLogger(__name__)


class GoogleSearchClient:
    """
    Google Custom Search API 客戶端
    
    封裝 Google Custom Search API 的調用
    """
    
    # 默認搜索引擎 ID
    DEFAULT_SEARCH_ENGINE_ID = '764a84f1e63f549d8'
    
    def __init__(
        self,
        api_key: str = None,
        search_engine_id: str = None,
    ):
        """
        初始化客戶端
        
        Args:
            api_key: Google Search API 密鑰（可從環境變量獲取）
            search_engine_id: 搜索引擎 ID（可選）
        """
        self.api_key = (
            api_key or 
            os.getenv('GOOGLE_SEARCH_API_KEY') or 
            os.getenv('Google_Search_API_KEY')
        )
        self.search_engine_id = (
            search_engine_id or 
            os.getenv('GOOGLE_SEARCH_ENGINE_ID') or 
            self.DEFAULT_SEARCH_ENGINE_ID
        )
        
        if not self.api_key:
            logger.warning("Google Search API Key 未配置")
        
        if not requests:
            logger.warning("requests 庫未安裝，請執行: pip install requests")
    
    @property
    def is_available(self) -> bool:
        """檢查客戶端是否可用"""
        return bool(self.api_key and requests)
    
    def search(
        self,
        query: str,
        num_results: int = 10,
        site_restrict: str = None,
    ) -> Dict[str, Any]:
        """
        執行搜索
        
        Args:
            query: 搜索查詢
            num_results: 結果數量（最多 10）
            site_restrict: 限制搜索的網站域名
            
        Returns:
            搜索結果字典，包含 'items' 列表
        """
        if not self.is_available:
            return {'error': 'API 未配置或 requests 庫未安裝', 'items': []}
        
        # 構建查詢
        final_query = query
        if site_restrict and 'site:' not in query.lower():
            final_query = f"{query} site:{site_restrict}"
        
        # 構建 URL
        url = (
            f"https://www.googleapis.com/customsearch/v1"
            f"?key={quote(self.api_key)}"
            f"&cx={quote(self.search_engine_id)}"
            f"&q={quote(final_query)}"
            f"&num={min(num_results, 10)}"
        )
        
        try:
            logger.info(f"[Google Search] 執行搜索: \"{final_query}\"")
            response = requests.get(url, timeout=30)
            
            logger.info(f"[Google Search] HTTP 狀態碼: {response.status_code}")
            
            if not response.ok:
                error_text = response.text[:500]
                logger.error(f"[Google Search] API 返回錯誤: {error_text}")
                return {
                    'error': f"API 錯誤: {response.status_code}",
                    'items': []
                }
            
            data = response.json()
            
            if 'error' in data:
                logger.error(f"[Google Search] API 錯誤: {data['error']}")
                return {
                    'error': data['error'].get('message', str(data['error'])),
                    'items': []
                }
            
            items = data.get('items', [])
            logger.info(f"[Google Search] 找到 {len(items)} 條結果")
            
            return {'items': items}
            
        except requests.Timeout:
            logger.error("[Google Search] 請求超時")
            return {'error': '請求超時', 'items': []}
        except requests.RequestException as e:
            logger.error(f"[Google Search] 請求異常: {e}")
            return {'error': str(e), 'items': []}
        except Exception as e:
            logger.error(f"[Google Search] 未知錯誤: {e}")
            return {'error': str(e), 'items': []}


def search_online(
    query: str,
    api_key: str = None,
    search_engine_id: str = None,
) -> str:
    """
    在線搜索函數
    
    整合品牌提取、查詢增強、搜索執行、結果排序等功能
    
    Args:
        query: 用戶查詢
        api_key: Google Search API 密鑰（可選）
        search_engine_id: 搜索引擎 ID（可選）
        
    Returns:
        格式化的搜索結果文本
    """
    log_prefix = '[Google Search]'
    logger.info(f"{log_prefix} ========== 開始在線搜索 ==========")
    logger.info(f"{log_prefix} 原始查詢: \"{query}\"")
    
    # 創建客戶端
    client = GoogleSearchClient(api_key, search_engine_id)
    
    if not client.is_available:
        logger.error(f"{log_prefix} ❌ 錯誤: Google Search API 未配置")
        return '未配置 Google Search API Key'
    
    try:
        # 提取品牌信息
        brand_info = extract_brand_from_query(query)
        
        # 增強搜索查詢
        enhanced_query = enhance_search_query(query)
        
        # 構建搜索查詢（限制到品牌官網）
        site_restrict = None
        if brand_info:
            brand, domain = brand_info
            site_restrict = domain
            logger.info(f"{log_prefix} 檢測到品牌: {brand}")
            logger.info(f"{log_prefix} 🌐 限制搜索為 {domain}")
        
        logger.info(f"{log_prefix} 增強後查詢: \"{enhanced_query}\"")
        
        # 執行搜索
        result = client.search(enhanced_query, num_results=10, site_restrict=site_restrict)
        
        if result.get('error'):
            logger.error(f"{log_prefix} ❌ 搜索錯誤: {result['error']}")
            return f"搜索 API 錯誤: {result['error']}"
        
        items = result.get('items', [])
        logger.info(f"{log_prefix} 原始結果數量: {len(items)}")
        
        if not items:
            logger.warning(f"{log_prefix} ⚠️ 未找到搜索結果")
            return '未找到相關商品信息'
        
        # 對 Dior 結果排序：法國官網優先
        if brand_info and brand_info[1] == 'dior.com':
            items = sort_by_french_first(items, brand_info[1])
            french_count = sum(1 for i in items if '/fr_fr/' in (i.get('link') or '').lower())
            logger.info(f"{log_prefix} 🇫🇷 法國官網結果: {french_count}/{len(items)}")
        
        # 格式化結果
        results = []
        for idx, item in enumerate(items[:5]):
            title = item.get('title', '')
            snippet = item.get('snippet', '')
            link = item.get('link', '')
            
            logger.info(f"{log_prefix} 結果 {idx + 1}: {title[:40]}...")
            
            results.append(f"標題: {title}\n摘要: {snippet}\n鏈接: {link}")
        
        result_text = '\n\n'.join(results)
        logger.info(f"{log_prefix} ✅ 搜索成功，返回 {len(results)} 條結果")
        logger.info(f"{log_prefix} ========== 搜索完成 ==========")
        
        return result_text
        
    except Exception as e:
        logger.error(f"{log_prefix} ❌ 在線搜索異常: {e}")
        logger.info(f"{log_prefix} ========== 搜索失敗 ==========")
        return f"在線搜索失敗: {str(e)}"


def format_search_results(items: List[Dict[str, Any]], max_results: int = 5) -> str:
    """
    格式化搜索結果為文本
    
    Args:
        items: 搜索結果項列表
        max_results: 最大結果數量
        
    Returns:
        格式化的文本
    """
    if not items:
        return '未找到相關商品信息'
    
    results = []
    for item in items[:max_results]:
        title = item.get('title', '')
        snippet = item.get('snippet', '')
        link = item.get('link', '')
        results.append(f"標題: {title}\n摘要: {snippet}\n鏈接: {link}")
    
    return '\n\n'.join(results)


def extract_prices_from_results(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    從搜索結果中提取價格信息
    
    Args:
        items: 搜索結果項列表
        
    Returns:
        包含價格信息的結果列表
    """
    import re
    
    # 價格正則表達式
    price_pattern = re.compile(
        r'(€\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)|'
        r'(\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?\s?€)|'
        r'(\$\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)|'
        r'(£\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)',
        re.IGNORECASE
    )
    
    results_with_prices = []
    
    for item in items:
        title = item.get('title', '')
        snippet = item.get('snippet', '')
        link = item.get('link', '')
        
        # 在標題和摘要中搜索價格
        text = f"{title} {snippet}"
        price_matches = price_pattern.findall(text)
        
        if price_matches:
            # 展平匹配結果（正則返回元組）
            prices = [p for group in price_matches for p in group if p]
            results_with_prices.append({
                'title': title,
                'snippet': snippet,
                'link': link,
                'prices': prices,
            })
    
    return results_with_prices


# 創建默認客戶端實例
_default_client: Optional[GoogleSearchClient] = None


def get_default_client() -> GoogleSearchClient:
    """
    獲取默認的 Google Search 客戶端
    
    Returns:
        GoogleSearchClient 實例
    """
    global _default_client
    if _default_client is None:
        _default_client = GoogleSearchClient()
    return _default_client


# ============ 測試代碼 ============
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    
    # 測試客戶端初始化
    print("=== 客戶端測試 ===")
    client = get_default_client()
    print(f"  API Key 配置: {bool(client.api_key)}")
    print(f"  搜索引擎 ID: {client.search_engine_id}")
    print(f"  客戶端可用: {client.is_available}")
    
    if client.is_available:
        # 測試搜索
        print("\n=== 搜索測試 ===")
        result = search_online("dior lady dior bag price")
        print(f"  結果長度: {len(result)} 字符")
        print(f"  結果預覽: {result[:200]}...")
