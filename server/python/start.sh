#!/bin/bash
# Render 啟動腳本

# 進入 Python 後端目錄
cd server/python

# 安裝依賴（如果沒有使用 Docker）
pip install -r requirements.txt

# 啟動 uvicorn
uvicorn app:app --host 0.0.0.0 --port ${PORT:-5000}
