# -*- coding: utf-8 -*-
"""
搜索模塊
包含 imgbb 上傳、Google 反向圖片搜索、SerpAPI 文字搜索
"""

import os
import base64
import logging
import tempfile
from typing import List, Dict
import requests
from serpapi import GoogleSearch

logger = logging.getLogger(__name__)


def _upload_api():
    return os.getenv("UPLOAD_API")

def _reverse_img_api():
    return os.getenv("Reverse_IMG_API")


# ============ imgbb 上傳 ============

def upload_to_imgbb(image_path: str, api_key: str, expiration=None) -> str:
    """上傳本地圖片到 imgbb，返回公開 URL"""
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    payload = {"key": api_key, "image": image_data}
    if expiration:
        payload["expiration"] = expiration

    response = requests.post("https://api.imgbb.com/1/upload", data=payload)
    result = response.json()

    if result.get("status") == 200:
        return result["data"]["url"]
    raise Exception(f"imgbb 上傳失敗: {result}")


# ============ 反向圖片搜索 ============

def reverse_image_search(image_bytes: bytes) -> List[Dict[str, str]]:
    """
    接收圖片位元組，上傳到 imgbb，再用 SerpAPI 做 Google 反向圖片搜索。

    Returns:
        [{"title": "...", "link": "...", "source": "..."}, ...]
    """

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        image_url = upload_to_imgbb(tmp_path, "110bbfe9edb29ed91a750c675d163560")
        logger.info(f"[ReverseImg] imgbb URL: {image_url}")
    finally:
        os.unlink(tmp_path)

    params = {
        "engine": "google_reverse_image",
        "image_url": image_url,
        "api_key": "13bbdf11fa097a2ca7767af03b38fdbe21a8e5152f21783a51876f095a337129",
    }

    results = GoogleSearch(params).get_dict()
    image_results = results.get("image_results", [])

    return [
        {"title": r.get("title", ""), "link": r.get("link", ""), "source": r.get("source", "")}
        for r in image_results
    ]


