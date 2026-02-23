from serpapi import GoogleSearch
import base64
import requests

UPLOAD_API = "110bbfe9edb29ed91a750c675d163560"

def upload_to_imgbb(image_path, api_key, expiration=None):
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    payload = {
        "key": api_key,
        "image": image_data,
    }
    if expiration:
        payload["expiration"] = expiration  # 自動刪除秒數（60~15552000）

    response = requests.post("https://api.imgbb.com/1/upload", data=payload)
    result = response.json()
    
    if result["status"] == 200:
        return result["data"]["url"]  # 返回圖片 URL
    else:
        raise Exception(f"上傳失敗: {result}")

# 使用範例
# url = upload_to_imgbb("1.jpg", UPLOAD_API)


params = {
  "engine": "google_reverse_image",
#   "gl":"fr", # for search in France
  "image_url": "https://i.ibb.co/F48TSRn5/a89ea95f6729.webp",
  "api_key": "13bbdf11fa097a2ca7767af03b38fdbe21a8e5152f21783a51876f095a337129"
}

search = GoogleSearch(params)
results = search.get_dict()
image_results = results["image_results"]
# print(image_results)
links = {k["title"]:(k["link"],k["source"]) for k in image_results}

for title, link in links.items():
    print(f"📌 {title}\n   🔗 {link}\n")