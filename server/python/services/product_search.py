# -*- coding: utf-8 -*-
"""
商品搜索匹配模塊
包含文本分詞、商品評分、候選商品查找等功能
"""

import re
import json
from typing import List, Dict, Any, Optional
from pathlib import Path


def tokenize_text(value: str) -> List[str]:
    """
    文本分詞：將文本拆分為搜索詞元
    
    支持英文、數字和中文字符
    
    Args:
        value: 待分詞的文本
        
    Returns:
        詞元列表
    """
    if not value:
        return []
    
    text = str(value).lower().strip()
    
    # 使用正則表達式分割：匹配非字母、數字、中文的字符
    # [^a-z0-9\u4e00-\u9fa5]+ 匹配所有非單詞字符
    tokens = re.split(r'[^a-z0-9\u4e00-\u9fa5]+', text)
    
    # 過濾空字符串
    return [t.strip() for t in tokens if t.strip()]


def score_product_for_query(item: Dict[str, Any], query: str) -> int:
    """
    計算商品與查詢的匹配分數
    
    評分規則：
    - 參考號完全匹配：+120
    - 參考號部分匹配：+80
    - 商品名完全匹配：+70
    - 商品名包含查詢（長度>=3）：+45
    - 品牌匹配：+15
    - 詞元匹配：每個詞元 +5（最多 +25）
    
    Args:
        item: 商品數據字典
        query: 用戶查詢
        
    Returns:
        匹配分數（0 表示不匹配）
    """
    q = (query or '').strip().lower()
    if not q:
        return 0
    
    # 提取商品字段
    ref = str(item.get('produit') or '').strip().lower()
    name = str(item.get('designation') or item.get('descriptif') or '').strip().lower()
    brand = str(item.get('Marque') or '').strip().lower()
    
    score = 0
    
    # 參考號匹配
    if ref:
        if q == ref:
            score += 120
        elif ref in q or q in ref:
            score += 80
    
    # 商品名匹配
    if name:
        if q == name:
            score += 70
        elif len(q) >= 3 and q in name:
            score += 45
    
    # 品牌匹配
    if brand and (q == brand or brand in q):
        score += 15
    
    # 詞元匹配
    q_tokens = tokenize_text(q)
    if q_tokens:
        # 構建搜索文本
        descriptif = str(item.get('descriptif') or '').lower()
        hay = f"{ref} {name} {brand} {descriptif}"
        
        hits = 0
        for t in q_tokens:
            if len(t) < 2:
                continue
            if t in hay:
                hits += 1
        
        score += min(25, hits * 5)
    
    return score


def find_top_product_candidates(
    products: List[Dict[str, Any]],
    query: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    查找與查詢最匹配的商品
    
    對所有商品進行評分，返回分數最高的候選
    
    Args:
        products: 商品列表
        query: 用戶查詢
        limit: 返回數量限制
        
    Returns:
        評分後的候選商品列表，每項包含 'score' 和 'item'
    """
    if not isinstance(products, list):
        products = []
    
    scored = []
    for item in products:
        score = score_product_for_query(item, query)
        if score <= 0:
            continue
        scored.append({'score': score, 'item': item})
    
    # 按分數降序排序
    scored.sort(key=lambda x: x['score'], reverse=True)
    
    return scored[:limit]


def to_candidate_brief(scored: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    將評分後的候選商品轉換為簡要格式
    
    只保留必要的字段，用於傳遞給 AI 模型
    
    Args:
        scored: 評分後的候選商品列表
        
    Returns:
        簡要格式的商品列表
    """
    result = []
    for entry in scored:
        item = entry.get('item') or {}
        result.append({
            'score': entry.get('score', 0),
            'designation': item.get('designation') or item.get('descriptif') or '',
            'Marque': item.get('Marque') or '',
            'produit': item.get('produit') or '',
            'Prix_Vente': item.get('Prix_Vente') or item.get('prix_achat') or '',
            'Lien_Externe': item.get('Lien_Externe') or '',
            'Perso_Lien_Photo': item.get('Perso_Lien_Photo') or item.get('image_url') or '',
        })
    return result


def search_products(
    products: List[Dict[str, Any]],
    query: str,
    limit: int = 5,
    brief: bool = True
) -> List[Dict[str, Any]]:
    """
    搜索商品的完整流程
    
    整合評分和格式化步驟
    
    Args:
        products: 商品列表
        query: 用戶查詢
        limit: 返回數量限制
        brief: 是否返回簡要格式
        
    Returns:
        匹配的商品列表
    """
    candidates = find_top_product_candidates(products, query, limit)
    
    if brief:
        return to_candidate_brief(candidates)
    
    return candidates


def load_products_from_file(file_path: str) -> List[Dict[str, Any]]:
    """
    從 JSON 文件加載商品數據
    
    Args:
        file_path: JSON 文件路徑
        
    Returns:
        商品列表
    """
    path = Path(file_path)
    if not path.exists():
        return []
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, IOError):
        return []


class ProductSearcher:
    """
    商品搜索器類
    
    封裝商品數據加載和搜索功能
    """
    
    def __init__(self, products: List[Dict[str, Any]] = None, data_file: str = None):
        """
        初始化搜索器
        
        Args:
            products: 商品列表（可選）
            data_file: 商品數據文件路徑（可選）
        """
        self._products = products or []
        self._data_file = data_file
        
        if data_file and not products:
            self._products = load_products_from_file(data_file)
    
    @property
    def products(self) -> List[Dict[str, Any]]:
        """獲取商品列表"""
        return self._products
    
    def reload(self) -> None:
        """重新加載商品數據"""
        if self._data_file:
            self._products = load_products_from_file(self._data_file)
    
    def search(
        self,
        query: str,
        limit: int = 5,
        brief: bool = True
    ) -> List[Dict[str, Any]]:
        """
        搜索商品
        
        Args:
            query: 用戶查詢
            limit: 返回數量限制
            brief: 是否返回簡要格式
            
        Returns:
            匹配的商品列表
        """
        return search_products(self._products, query, limit, brief)
    
    def get_by_produit(self, produit: str) -> Optional[Dict[str, Any]]:
        """
        根據 produit 獲取商品
        
        Args:
            produit: 商品編號
            
        Returns:
            商品數據，未找到則返回 None
        """
        prod_lower = produit.lower().strip()
        for item in self._products:
            item_prod = str(item.get('produit') or '').lower().strip()
            if item_prod == prod_lower:
                return item
        return None
    
    def get_by_brand(self, brand: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        根據品牌獲取商品
        
        Args:
            brand: 品牌名稱
            limit: 返回數量限制
            
        Returns:
            該品牌的商品列表
        """
        brand_lower = brand.lower().strip()
        result = []
        for item in self._products:
            item_brand = str(item.get('Marque') or '').lower().strip()
            if item_brand == brand_lower:
                result.append(item)
                if len(result) >= limit:
                    break
        return result


# ============ 測試代碼 ============
if __name__ == '__main__':
    # 測試分詞
    print("=== 分詞測試 ===")
    test_texts = [
        'Lady Dior Medium',
        '迪奥 包包',
        'M0505OVRB_M928',
    ]
    for text in test_texts:
        print(f"  '{text}' -> {tokenize_text(text)}")
    
    # 測試評分
    print("\n=== 評分測試 ===")
    test_product = {
        'produit': 'M0505OVRB_M928',
        'designation': 'Lady Dior Medium',
        'Marque': 'Dior',
        'descriptif': 'Lady Dior Medium Bag',
    }
    test_queries = ['lady dior', 'M0505OVRB_M928', 'dior bag', '包包']
    for q in test_queries:
        score = score_product_for_query(test_product, q)
        print(f"  查詢: '{q}' -> 分數: {score}")
    
    # 測試搜索
    print("\n=== 搜索測試 ===")
    test_products = [
        {'produit': 'REF001', 'designation': 'Lady Dior Medium', 'Marque': 'Dior', 'Prix_Vente': 4900},
        {'produit': 'REF002', 'designation': 'GG Marmont', 'Marque': 'Gucci', 'Prix_Vente': 2100},
        {'produit': 'REF003', 'designation': 'Triomphe Bag', 'Marque': 'Celine', 'Prix_Vente': 2850},
    ]
    
    results = search_products(test_products, 'dior', limit=2)
    print(f"  查詢 'dior' 結果:")
    for r in results:
        print(f"    {r}")
