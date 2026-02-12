# -*- coding: utf-8 -*-
"""
查詢預處理模塊
包含用戶輸入清理、品牌標準化、商品類型增強、搜索查詢優化等功能
"""

import re
import sys
from datetime import datetime
from typing import Optional, Tuple
from pathlib import Path

# 確保可以導入本地模塊
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.brand_mappings import (
    BRAND_ALIASES,
    BRAND_WEBSITE_MAP,
    PRODUCT_TYPE_MAP,
)


def preprocess_query(query: str) -> str:
    """
    輸入預處理：清理和標準化用戶輸入
    
    處理內容：
    - 去除首尾空白
    - 多空格合併為單空格
    - 統一引號格式
    - 中文標點轉英文
    
    Args:
        query: 原始用戶輸入
        
    Returns:
        清理後的查詢字符串
    """
    if not query:
        return ''
    
    result = query.strip()
    
    # 多空格合併為單空格
    result = re.sub(r'\s+', ' ', result)
    
    # 統一引號
    result = re.sub(r'[""''「」『』【】]', '"', result)
    
    # 中文標點轉英文
    punctuation_map = {
        '，': ',',
        '。': '.',
        '！': '!',
        '？': '?',
        '；': ';',
        '：': ':',
    }
    for chinese, english in punctuation_map.items():
        result = result.replace(chinese, english)
    
    return result


def normalize_brand_in_query(query: str) -> str:
    """
    品牌名標準化：將查詢中的各種品牌別名轉換為標準英文名
    
    按照別名長度排序（長的先替換），避免部分匹配問題
    例如：先替換 "louis vuitton" 再替換 "lv"
    
    Args:
        query: 用戶查詢
        
    Returns:
        品牌名標準化後的查詢
    """
    normalized = query.lower()
    
    # 按照別名長度排序（長的先替換）
    sorted_aliases = sorted(
        BRAND_ALIASES.items(),
        key=lambda x: len(x[0]),
        reverse=True
    )
    
    for alias, standard in sorted_aliases:
        # 使用正則表達式進行不區分大小寫的替換
        pattern = re.escape(alias)
        normalized = re.sub(pattern, standard, normalized, flags=re.IGNORECASE)
    
    return normalized


def enhance_product_type_in_query(query: str) -> str:
    """
    增強商品類型關鍵詞：添加多語言搜索詞
    
    當查詢中包含中文商品類型時，添加對應的英文/法文關鍵詞
    以提高搜索準確性
    
    Args:
        query: 用戶查詢
        
    Returns:
        增強後的查詢
    """
    enhanced = query
    
    for chinese, multilang in PRODUCT_TYPE_MAP.items():
        if chinese in query:
            # 取第一個英文詞
            keywords = multilang.split(' ')[0]
            if keywords.lower() not in query.lower():
                enhanced = f"{enhanced} {keywords}"
            break  # 只增強一個商品類型
    
    return enhanced


def extract_brand_from_query(query: str) -> Optional[Tuple[str, str]]:
    """
    從查詢中提取品牌名稱和對應的官網域名
    
    會先將查詢中的品牌別名標準化，然後匹配官網映射
    
    Args:
        query: 用戶查詢
        
    Returns:
        元組 (品牌名, 官網域名)，如果未找到則返回 None
    """
    # 先標準化品牌名
    normalized_query = normalize_brand_in_query(query)
    
    for brand, domain in BRAND_WEBSITE_MAP.items():
        if brand in normalized_query:
            return (brand, domain)
    
    return None


def enhance_search_query(original_query: str) -> str:
    """
    智能增強搜索查詢
    
    功能：
    1. 檢測"最新"、"new"、"latest"等關鍵詞
    2. 添加 "new" 和 "collection" 關鍵詞
    3. 自動添加當前季節信息
    
    Args:
        original_query: 原始查詢
        
    Returns:
        增強後的查詢
    """
    lower_query = original_query.lower()
    enhanced_query = original_query
    
    # 最新相關關鍵詞
    latest_keywords = ['最新', 'new', 'latest', 'newest', 'recent', 'nouveau', 'nouveauté']
    has_latest_intent = any(keyword in lower_query for keyword in latest_keywords)
    
    if has_latest_intent:
        # 添加 "new" 關鍵詞
        if 'new' not in lower_query and '最新' not in lower_query:
            enhanced_query = f"new {enhanced_query}"
        
        # 添加 "collection" 關鍵詞
        if 'collection' not in lower_query:
            enhanced_query = f"{enhanced_query} collection"
        
        # 獲取當前年份和季節
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        
        # 根據月份判斷季節
        if 1 <= current_month <= 3:
            season = 'Spring'
        elif 4 <= current_month <= 6:
            season = 'Summer'
        elif 7 <= current_month <= 9:
            season = 'Fall'
        else:
            season = 'Winter'
        
        # 添加季節和年份
        season_query = f"{season} {current_year}"
        if str(current_year) not in lower_query and season.lower() not in lower_query:
            enhanced_query = f"{enhanced_query} {season_query}"
    
    return enhanced_query.strip()


def sort_by_french_first(items: list, brand_domain: str) -> list:
    """
    對搜索結果排序：法國官網優先，其他官網其次
    
    目前僅對 Dior 品牌啟用此功能
    不會過濾掉非法國結果，而是排序後全部返回
    
    Args:
        items: 搜索結果列表，每項應包含 'link' 字段
        brand_domain: 品牌官網域名
        
    Returns:
        排序後的結果列表
    """
    if brand_domain != 'dior.com':
        return items
    
    # 分類：法國官網 vs 其他
    french_items = []
    other_items = []
    
    for item in items:
        link = (item.get('link') or '').lower()
        if '/fr_fr/' in link:
            french_items.append(item)
        else:
            other_items.append(item)
    
    # 法國官網優先返回
    return french_items + other_items


def build_site_restricted_query(query: str, brand: str = None) -> str:
    """
    構建限制在特定網站的搜索查詢
    
    如果提取到品牌，添加 site: 限制以提高搜索準確性
    
    Args:
        query: 原始查詢
        brand: 品牌名稱（可選，如果不提供則嘗試從查詢中提取）
        
    Returns:
        帶有 site: 限制的搜索查詢
    """
    if brand:
        domain = BRAND_WEBSITE_MAP.get(brand.lower())
    else:
        brand_info = extract_brand_from_query(query)
        domain = brand_info[1] if brand_info else None
    
    if domain:
        # 檢查查詢中是否已經有 site: 限制
        if 'site:' not in query.lower():
            return f"{query} site:{domain}"
    
    return query


def process_user_query(query: str, enhance: bool = True) -> dict:
    """
    完整的用戶查詢處理流程
    
    整合所有預處理步驟，返回處理結果
    
    Args:
        query: 原始用戶查詢
        enhance: 是否進行搜索增強
        
    Returns:
        包含處理結果的字典：
        - original: 原始查詢
        - cleaned: 清理後的查詢
        - normalized: 品牌標準化後的查詢
        - enhanced: 增強後的查詢（如果 enhance=True）
        - brand: 提取的品牌信息 (brand, domain) 或 None
    """
    # 1. 清理輸入
    cleaned = preprocess_query(query)
    
    # 2. 品牌標準化
    normalized = normalize_brand_in_query(cleaned)
    
    # 3. 商品類型增強
    with_product_type = enhance_product_type_in_query(normalized)
    
    # 4. 提取品牌
    brand_info = extract_brand_from_query(normalized)
    
    result = {
        'original': query,
        'cleaned': cleaned,
        'normalized': normalized,
        'brand': brand_info,
    }
    
    # 5. 搜索增強（可選）
    if enhance:
        enhanced = enhance_search_query(with_product_type)
        result['enhanced'] = enhanced
    
    return result


# ============ 測試代碼 ============
if __name__ == '__main__':
    # 測試預處理
    print("=== 預處理測試 ===")
    test_queries = [
        '  我想找   迪奥包包  ',
        '「LV」最新款包',
        '古驰裙子，多少钱？',
    ]
    for q in test_queries:
        print(f"  原始: '{q}'")
        print(f"  清理: '{preprocess_query(q)}'")
        print()
    
    # 測試品牌標準化
    print("=== 品牌標準化測試 ===")
    test_brand_queries = [
        '迪奥 lady dior',
        'LV 包包',
        '香奈儿 cf',
    ]
    for q in test_brand_queries:
        print(f"  原始: '{q}'")
        print(f"  標準化: '{normalize_brand_in_query(q)}'")
        print()
    
    # 測試品牌提取
    print("=== 品牌提取測試 ===")
    for q in test_brand_queries:
        brand_info = extract_brand_from_query(q)
        print(f"  查詢: '{q}'")
        print(f"  品牌: {brand_info}")
        print()
    
    # 測試搜索增強
    print("=== 搜索增強測試 ===")
    enhance_queries = [
        'dior 最新裙子',
        'gucci new bag',
    ]
    for q in enhance_queries:
        print(f"  原始: '{q}'")
        print(f"  增強: '{enhance_search_query(q)}'")
        print()
    
    # 測試完整流程
    print("=== 完整流程測試 ===")
    full_test = '我想找 LV 最新款包包'
    result = process_user_query(full_test)
    print(f"  輸入: '{full_test}'")
    for key, value in result.items():
        print(f"  {key}: {value}")
