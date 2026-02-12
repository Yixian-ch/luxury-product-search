# -*- coding: utf-8 -*-
"""
DeepSeek API 客戶端模塊
包含 DeepSeek 對話生成、消息格式化等功能
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

# 配置日誌
logger = logging.getLogger(__name__)


def build_luxury_assistant_system_prompt() -> str:
    """
    構建奢侈品助手的系統提示詞
    
    Returns:
        系統提示詞字符串
    """
    return '\n'.join([
        '你是 Feel 智能助手：一位資深奢侈品顧問/私人買手助理。語氣要像精品店顧問：克制、專業、自然，不要客服模板腔。',
        '你只使用系統提供的本地數據庫信息（candidates）和在線搜索摘要（onlineResults）來回答，絕不杜撰商品/價格/鏈接/庫存。',
        '輸出風格：盡量短句+自然口吻；除非用戶要求，不要寫長篇"為了給您提供最準確的信息……"這類套話。',
        '提問策略：只問 1 個最關鍵的問題（最多 1 個）。優先用"二選一/三選一"讓用戶快速確認，不要連續列 3-5 個問題。',
        '場景處理：',
        '- 若本地候選裡有高置信度命中：直接給結果（名稱/參考號/價格/鏈接），並補充一句"需要我幫你對比其他尺寸/材質嗎？"。',
        '- 若本地只命中到相近但疑似不是同一類（例如命中配件但用戶問包）：先用一句話說明你看到的候選是什麼，並用一個問題確認用戶要找的品類/尺寸。',
        '- 若本地未命中：明確說"本地庫裡沒有"，然後基於 onlineResults 給出能確認的要點，並問 1 個問題（例如尺寸/材質/地區）以便繼續檢索。',
        '價格規則：只在信息中出現明確價格/幣種/來源時才輸出數字；如果 onlineResults 沒有明確價格，不要給"區間估價/大概範圍/歷史價格"。',
        '鏈接規則：優先給官網/權威來源鏈接；若鏈接不完整或不確定，就不要強行拼接。',
        '默認幣種為歐元（€）；僅在需要換算時再問用戶目標幣種。',
        '必要時用 **加粗** 強調關鍵字段（商品名/參考號/價格）。',
    ])


def normalize_agent_messages(messages: Any) -> List[Dict[str, str]]:
    """
    標準化消息格式
    
    過濾並標準化消息列表，只保留有效的 user/assistant 消息
    
    Args:
        messages: 原始消息列表
        
    Returns:
        標準化後的消息列表
    """
    if not isinstance(messages, list):
        return []
    
    result = []
    for item in messages:
        if not item or not isinstance(item, dict):
            continue
        
        role_raw = item.get('role')
        content_raw = item.get('content')
        
        # 只接受 user 或 assistant 角色
        if role_raw not in ('user', 'assistant'):
            continue
        
        # 內容必須是字符串
        if not isinstance(content_raw, str):
            continue
        
        content = content_raw.strip()
        if content:
            result.append({'role': role_raw, 'content': content})
    
    return result


def pick_recent_messages(messages: List[Dict[str, str]], max_count: int) -> List[Dict[str, str]]:
    """
    獲取最近的消息
    
    Args:
        messages: 消息列表
        max_count: 最大數量
        
    Returns:
        最近的消息列表
    """
    if not isinstance(messages, list) or len(messages) == 0:
        return []
    
    start = max(0, len(messages) - max_count)
    return messages[start:]


def extract_price_evidence(online_results: str) -> List[str]:
    """
    從在線搜索結果中提取價格證據
    
    使用正則表達式匹配各種貨幣格式的價格
    
    Args:
        online_results: 在線搜索結果文本
        
    Returns:
        包含價格信息的行列表
    """
    if not online_results:
        return []
    
    text = str(online_results)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # 價格正則表達式：匹配 €、$、£ 和人民幣格式
    price_pattern = re.compile(
        r'(€\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)|'
        r'(\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?\s?€)|'
        r'(\$\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)|'
        r'(£\s?\d{1,3}(?:[\s,\.]\d{3})*(?:[\.,]\d{1,2})?)|'
        r'(\bRMB\b|\bCNY\b|人民幣|人民币|元)\s?\d+',
        re.IGNORECASE
    )
    
    hit_lines = []
    for line in lines:
        if price_pattern.search(line):
            hit_lines.append(line)
            if len(hit_lines) >= 8:
                break
    
    # 去重並限制長度
    unique = []
    for line in hit_lines:
        if line in unique:
            continue
        # 截斷過長的行
        if len(line) > 220:
            line = f"{line[:220]}..."
        unique.append(line)
    
    return unique


class DeepSeekClient:
    """
    DeepSeek API 客戶端
    
    封裝 DeepSeek API 的調用，提供意圖分類和對話生成功能
    """
    
    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
    ):
        """
        初始化客戶端
        
        Args:
            api_key: DeepSeek API 密鑰（可從環境變量 DEEPSEEK_API_KEY 獲取）
            base_url: API 基礎 URL（默認 https://api.deepseek.com）
        """
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY') or os.getenv('Deepseek_API_KEY')
        self.base_url = base_url or os.getenv('DEEPSEEK_BASE_URL') or 'https://api.deepseek.com'
        self._client = None
        
        if self.api_key and OpenAI:
            try:
                self._client = OpenAI(
                    api_key=self.api_key,
                    base_url=self.base_url,
                )
                logger.info("DeepSeek 客戶端初始化成功")
            except Exception as e:
                logger.error(f"初始化 DeepSeek 客戶端失敗: {e}")
                self._client = None
        elif not OpenAI:
            logger.warning("OpenAI 庫未安裝，請執行: pip install openai")
        else:
            logger.warning("DeepSeek API Key 未配置")
    
    @property
    def is_available(self) -> bool:
        """檢查客戶端是否可用"""
        return self._client is not None
    
    async def classify_intent(self, query: str) -> Dict[str, str]:
        """
        對用戶查詢進行意圖分類
        
        Args:
            query: 用戶查詢
            
        Returns:
            包含 intent, hint, message 的字典
        """
        log_prefix = '[Intent]'
        logger.info(f"{log_prefix} 開始意圖分類，查詢: \"{query}\"")
        
        default_result = {'intent': 'query_price', 'hint': query or '', 'message': ''}
        
        if not self._client:
            logger.warning(f"{log_prefix} DeepSeek 客戶端未初始化，使用默認意圖 query_price")
            return default_result
        
        try:
            prompt = [
                {
                    'role': 'system',
                    'content': '\n'.join([
                        '你是意圖分類器，請輸出 JSON，不要輸出其他內容。',
                        '字段: intent (query_price_online/query_price/chat/other), hint (提取的商品名稱或參考號，若無則空字符串), message (非查價時給用戶的簡短中文回覆)。',
                        '判斷規則：',
                        '- query_price_online: 用戶明確要求"在線查詢"、"上網查"、"搜索"等關鍵詞，且包含商品信息',
                        '- query_price: 用戶想查價格，但沒有明確要求在線查詢',
                        '- chat: 用戶只是問候/閒聊/無商品信息',
                        '- other: 其他情況',
                        '如果 intent=chat，message 應為："您好，我是Feel智能助手，您可以給我商品具體名稱或者識別碼我來幫您查詢它們對應的價格，如果您想要我在線查詢某個商品的信息請說在線查詢XX品牌的商品"',
                        '不可編造商品或價格。',
                    ])
                },
                {'role': 'user', 'content': query or ''}
            ]
            
            response = self._client.chat.completions.create(
                model='deepseek-chat',
                temperature=0,
                messages=prompt,
                response_format={'type': 'json_object'},
            )
            
            text = response.choices[0].message.content or ''
            logger.debug(f"{log_prefix} DeepSeek 原始響應: {text}")
            
            parsed = json.loads(text)
            result = {
                'intent': parsed.get('intent') or 'query_price',
                'hint': parsed.get('hint') or query or '',
                'message': parsed.get('message') or '',
            }
            
            logger.info(f"{log_prefix} ✅ 意圖分類完成: {result}")
            return result
            
        except Exception as e:
            logger.error(f"{log_prefix} ❌ 意圖分類失敗: {e}")
            return default_result
    
    def classify_intent_sync(self, query: str) -> Dict[str, str]:
        """
        同步版本的意圖分類
        
        Args:
            query: 用戶查詢
            
        Returns:
            包含 intent, hint, message 的字典
        """
        log_prefix = '[Intent]'
        logger.info(f"{log_prefix} 開始意圖分類，查詢: \"{query}\"")
        
        default_result = {'intent': 'query_price', 'hint': query or '', 'message': ''}
        
        if not self._client:
            logger.warning(f"{log_prefix} DeepSeek 客戶端未初始化，使用默認意圖 query_price")
            return default_result
        
        try:
            prompt = [
                {
                    'role': 'system',
                    'content': '\n'.join([
                        '你是意圖分類器，請輸出 JSON，不要輸出其他內容。',
                        '字段: intent (query_price_online/query_price/chat/other), hint (提取的商品名稱或參考號，若無則空字符串), message (非查價時給用戶的簡短中文回覆)。',
                        '判斷規則：',
                        '- query_price_online: 用戶明確要求"在線查詢"、"上網查"、"搜索"等關鍵詞，且包含商品信息',
                        '- query_price: 用戶想查價格，但沒有明確要求在線查詢',
                        '- chat: 用戶只是問候/閒聊/無商品信息',
                        '- other: 其他情況',
                        '如果 intent=chat，message 應為："您好，我是Feel智能助手，您可以給我商品具體名稱或者識別碼我來幫您查詢它們對應的價格，如果您想要我在線查詢某個商品的信息請說在線查詢XX品牌的商品"',
                        '不可編造商品或價格。',
                    ])
                },
                {'role': 'user', 'content': query or ''}
            ]
            
            response = self._client.chat.completions.create(
                model='deepseek-chat',
                temperature=0,
                messages=prompt,
                response_format={'type': 'json_object'},
            )
            
            text = response.choices[0].message.content or ''
            logger.debug(f"{log_prefix} DeepSeek 原始響應: {text}")
            
            parsed = json.loads(text)
            result = {
                'intent': parsed.get('intent') or 'query_price',
                'hint': parsed.get('hint') or query or '',
                'message': parsed.get('message') or '',
            }
            
            logger.info(f"{log_prefix} ✅ 意圖分類完成: {result}")
            return result
            
        except Exception as e:
            logger.error(f"{log_prefix} ❌ 意圖分類失敗: {e}")
            return default_result
    
    def chat(
        self,
        user_query: str,
        history: List[Dict[str, str]] = None,
        intent: str = None,
        candidates: List[Dict[str, Any]] = None,
        online_results: str = None,
        temperature: float = 0.4,
    ) -> Optional[str]:
        """
        生成對話回覆
        
        Args:
            user_query: 用戶當前查詢
            history: 對話歷史
            intent: 意圖分類結果
            candidates: 本地商品候選
            online_results: 在線搜索結果
            temperature: 生成溫度
            
        Returns:
            助手回覆，失敗返回 None
        """
        if not self._client:
            return None
        
        try:
            # 處理歷史消息
            safe_history = pick_recent_messages(
                normalize_agent_messages(history or []),
                12
            )
            
            # 構建系統提示詞
            system_prompt = build_luxury_assistant_system_prompt()
            
            # 提取價格證據
            price_evidence = extract_price_evidence(online_results)
            
            # 構建上下文
            context_payload = {
                'intent': intent or 'unknown',
                'query': user_query or '',
                'candidates': candidates if isinstance(candidates, list) else [],
                'onlineResults': str(online_results)[:6000] if online_results else '',
                'priceEvidence': price_evidence,
            }
            
            # 構建消息列表
            messages = [
                {'role': 'system', 'content': system_prompt},
                {
                    'role': 'system',
                    'content': '額外硬性規則：如果 priceEvidence 為空，嚴禁輸出任何具體價格數字（也不要輸出價格區間/估價）。需要價格時請引導用戶去官網或讓我繼續在線搜索。'
                },
                {
                    'role': 'system',
                    'content': f'你可以使用以下信息作為參考（不是用戶原話）：\n{json.dumps(context_payload, ensure_ascii=False, indent=2)}'
                },
                *safe_history,
            ]
            
            # 確保最後一條是用戶消息
            if not messages or messages[-1].get('role') != 'user' or messages[-1].get('content') != user_query:
                messages.append({'role': 'user', 'content': user_query or ''})
            
            # 調用 API
            response = self._client.chat.completions.create(
                model='deepseek-chat',
                temperature=temperature,
                messages=messages,
            )
            
            content = response.choices[0].message.content
            return (content or '').strip()
            
        except Exception as e:
            logger.error(f"調用 DeepSeek 失敗: {e}")
            return None


# 創建默認客戶端實例
_default_client: Optional[DeepSeekClient] = None


def get_default_client() -> DeepSeekClient:
    """
    獲取默認的 DeepSeek 客戶端
    
    Returns:
        DeepSeekClient 實例
    """
    global _default_client
    if _default_client is None:
        _default_client = DeepSeekClient()
    return _default_client


# ============ 測試代碼 ============
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    
    # 測試消息標準化
    print("=== 消息標準化測試 ===")
    test_messages = [
        {'role': 'user', 'content': '你好'},
        {'role': 'assistant', 'content': '您好！'},
        {'role': 'invalid', 'content': '無效消息'},
        {'role': 'user', 'content': ''},
        None,
    ]
    normalized = normalize_agent_messages(test_messages)
    print(f"  輸入: {test_messages}")
    print(f"  輸出: {normalized}")
    
    # 測試價格證據提取
    print("\n=== 價格證據提取測試 ===")
    test_online = """
    Lady Dior Medium - €4,900
    MEDIUM LADY DIOR BAG - Price: € 4.900,00
    This bag costs $5,200 in the US
    Some other text without price
    """
    evidence = extract_price_evidence(test_online)
    print(f"  找到 {len(evidence)} 條價格證據:")
    for e in evidence:
        print(f"    - {e}")
    
    # 測試客戶端初始化
    print("\n=== 客戶端測試 ===")
    client = get_default_client()
    print(f"  客戶端可用: {client.is_available}")
    
    if client.is_available:
        # 測試意圖分類
        result = client.classify_intent_sync("迪奧包包多少錢")
        print(f"  意圖分類結果: {result}")
