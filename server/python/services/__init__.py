# -*- coding: utf-8 -*-
"""
服務模塊
"""

from .query_processor import (
    preprocess_query,
    normalize_brand_in_query,
    enhance_product_type_in_query,
    extract_brand_from_query,
    enhance_search_query,
    sort_by_french_first,
    build_site_restricted_query,
    process_user_query,
)

from .product_search import (
    tokenize_text,
    score_product_for_query,
    find_top_product_candidates,
    to_candidate_brief,
    search_products,
    load_products_from_file,
    ProductSearcher,
)

from .deepseek_client import (
    DeepSeekClient,
    build_luxury_assistant_system_prompt,
    normalize_agent_messages,
    pick_recent_messages,
    extract_price_evidence,
    get_default_client as get_default_deepseek_client,
)

from .google_search import (
    reverse_image_search,
)

__all__ = [
    # query_processor
    'preprocess_query',
    'normalize_brand_in_query',
    'enhance_product_type_in_query',
    'extract_brand_from_query',
    'enhance_search_query',
    'sort_by_french_first',
    'build_site_restricted_query',
    'process_user_query',
    # product_search
    'tokenize_text',
    'score_product_for_query',
    'find_top_product_candidates',
    'to_candidate_brief',
    'search_products',
    'load_products_from_file',
    'ProductSearcher',
    # deepseek_client
    'DeepSeekClient',
    'build_luxury_assistant_system_prompt',
    'normalize_agent_messages',
    'pick_recent_messages',
    'extract_price_evidence',
    'get_default_deepseek_client',
    # google_search
    'reverse_image_search',
]
