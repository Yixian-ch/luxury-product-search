# -*- coding: utf-8 -*-
"""
配置模塊
"""

from .brand_mappings import (
    BRAND_WEBSITE_MAP,
    BRAND_ALIASES,
    FAMILLE_NORMALIZATION_MAP,
    PRODUCT_TYPE_MAP,
    normalize_famille,
    get_brand_website,
    normalize_brand,
    get_product_type_keywords,
)

__all__ = [
    'BRAND_WEBSITE_MAP',
    'BRAND_ALIASES',
    'FAMILLE_NORMALIZATION_MAP',
    'PRODUCT_TYPE_MAP',
    'normalize_famille',
    'get_brand_website',
    'normalize_brand',
    'get_product_type_keywords',
]
