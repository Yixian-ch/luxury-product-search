import os
import sys
import pathlib
from typing import Any, Dict, List, Optional

import orjson
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


PROJECT_ROOT = pathlib.Path(__file__).resolve().parent
DEFAULT_DATA_PATH = PROJECT_ROOT / "server" / "data" / "products.json"


def load_products(path: pathlib.Path) -> List[Dict[str, Any]]:
    """Load products from JSON file."""
    with path.open("rb") as f:
        return orjson.loads(f.read())


def find_product(query: str, products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Simple case-insensitive match by reference or product/designation substring."""
    q = query.strip().lower()
    if not q:
        return None

    for item in products:
        ref = str(item.get("reference", "")).strip().lower()
        name = str(item.get("produit") or item.get("designation") or "").strip().lower()
        if not ref and not name:
            continue

        ref_hit = ref and (q == ref or q in ref or ref in q)
        name_hit = name and (q in name or name in q)

        if ref_hit or name_hit:
            return item

    return None


def build_model() -> ChatOpenAI:
    """Create DeepSeek-compatible ChatOpenAI client."""
    api_key = os.getenv("Deepseek_API_KEY")
    if not api_key:
        raise RuntimeError("環境變量 Deepseek_API_KEY 未設置")

    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    return ChatOpenAI(
        model="deepseek-chat",
        temperature=0.1,
        api_key=api_key,
        base_url=base_url,
    )


def format_price(item: Dict[str, Any]) -> str:
    price = item.get("prix_vente") or item.get("prix_achat")
    if price is None or price == "":
        return "未知"
    return str(price)


def main() -> None:
    if len(sys.argv) < 2:
        print('用法: python agent.py "商品名稱或參考號"')
        sys.exit(1)

    query = sys.argv[1]
    data_path = pathlib.Path(os.getenv("PRODUCTS_JSON_PATH", DEFAULT_DATA_PATH))
    if not data_path.exists():
        raise FileNotFoundError(f"找不到產品文件: {data_path}")

    products = load_products(data_path)
    matched = find_product(query, products)

    if not matched:
        print("不知道")
        return

    product_name = (
        matched.get("produit")
        or matched.get("designation")
        or matched.get("reference")
        or "該商品"
    )
    price_text = format_price(matched)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "你是 Feel 智能助手。根據提供的信息用中文回答，"
                "格式固定為：您好，我是Feel智能助手，您查询的{product_name}价格为{price}。",
            ),
            (
                "human",
                "商品名稱: {product_name}\n參考號: {reference}\n價格: {price}",
            ),
        ]
    )

    chain = prompt | build_model() | StrOutputParser()
    response = chain.invoke(
        {
            "product_name": product_name,
            "reference": matched.get("reference", ""),
            "price": price_text,
        }
    )

    print(response.strip())


if __name__ == "__main__":
    main()

