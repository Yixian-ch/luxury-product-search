# 🎯 Cursor 项目上手指南

## 欢迎！这是一个奢侈品电商平台项目

### 📌 项目是什么？
- **用户端**：搜索/浏览奢侈品（包、鞋、皮带等）
- **管理端**：通过 Excel 文件批量导入产品
- **后端**：数据持久化存储，多用户共享

### 🏃 30 秒快速启动

```bash
# 终端 1：启动后端
cd server && npm start
# → 监听 http://localhost:5000

# 终端 2：启动前端
npm start
# → 打开 http://localhost:3000
```

完成！现在你可以：
1. 看到产品列表
2. 点击蓝色"管理员登录"按钮
3. 输入任意密钥（本地开发模式）
4. 上传 Excel 文件测试

---

## 📁 项目结构（只需知道这些）

```
src/
├── App.js                    ← 路由器（管理员 vs 普通用户）
├── LuxuryProductSearch.js   ← 用户界面（搜索/排序/分页）
└── AdminPanel.js            ← 管理员界面（上传 Excel）

server/
├── index.js                 ← API 服务器（GET/POST products）
└── data/
    └── products.json        ← 产品数据（自动生成）
```

---

## 🔄 工作流程（如何修改代码）

### 修改用户界面
编辑 `src/LuxuryProductSearch.js`：
- 改搜索逻辑？找 `filteredProducts`
- 改排序逻辑？找 `sortedProducts`
- 改样式？修改 `className` 中的 Tailwind CSS 类

### 修改管理员界面
编辑 `src/AdminPanel.js`：
- 改上传逻辑？找 `handleFileUpload`
- 改 Excel 字段映射？找 `headerMap` 对象
- 改样式？修改 `className`

### 修改 API 端点
编辑 `server/index.js`：
- 改 GET /api/products？找 `app.get('/api/products')`
- 改 POST 验证？找 `app.post('/api/products')`

### 修改后的下一步
```bash
# 1. 本地 npm start 测试
# 2. 检查控制台是否有错误（F12）
# 3. 提交代码
git add -A
git commit -m "描述你的改动"
git push

# 4. Vercel 自动部署（2-5 分钟）
```

---

## 🔐 3 个关键概念

### 1️⃣ 认证流程
```
用户 → 点击"管理员登录" → 输入密钥 → 保存到 sessionStorage
     → 界面切换到 AdminPanel → 可以上传 Excel
```

### 2️⃣ 数据流向
```
用户上传 Excel
  ↓
前端解析文件（规范化字段名、转换价格）
  ↓
POST /api/products（带 x-admin-key 头）
  ↓
后端验证密钥 → 保存到 products.json
  ↓
后续请求 GET /api/products 都返回这个数据
```

### 3️⃣ Excel 字段映射
Excel 中的列名会自动转换为内部字段：
- `Price / Prix Vente / Tarif` → `prix_vente`（自动转为数字）
- `Reference / Référence` → `reference`
- `Product / Produit` → `produit`
- `Brand / Marque` → `marque`
- 更多映射见 `src/AdminPanel.js` 中的 `headerMap`

---

## 💡 常见修改场景

### 改管理员密钥
**生产环境**（Render）：
1. 打开 https://dashboard.render.com
2. 找到你的 Web Service
3. 修改环境变量 `ADMIN_KEY`
4. 保存，应用自动重启

**本地开发**：密钥任意（因为 `server/index.js` 中没有检查）

### 改 API 地址
**生产环境**（Vercel）：
1. 打开 https://vercel.com/dashboard
2. 找到你的项目
3. 修改环境变量 `REACT_APP_API_URL` = `https://你的render地址`
4. 保存，Vercel 自动重新部署

### 改每页默认产品数
编辑 `src/LuxuryProductSearch.js`，第 11 行：
```javascript
const [pageSize, setPageSize] = useState(12);  // 改成你想要的数字
```

### 添加新的搜索字段
编辑 `src/LuxuryProductSearch.js`，找 `filteredProducts` 函数，添加：
```javascript
(p.新字段?.toLowerCase().includes(searchLower)) ||
```

---

## 🧪 测试步骤

### ✅ 基本功能测试
1. 打开 http://localhost:3000
2. 搜索产品（输入关键词）
3. 排序产品（点击排序按钮）
4. 改变分页（选择每页数量）
5. 点击产品查看详情

### ✅ 管理员功能测试
1. 点击"管理员登录"
2. 输入密钥（任意字符，因为是本地）
3. 应该看到 AdminPanel 界面
4. 上传一个 Excel 文件
5. 应该看到成功消息
6. 检查 `server/data/products.json` 是否更新

### ✅ 生产环境测试
部署后打开 Vercel 的网站 URL，重复上述步骤。

---

## 🚨 遇到问题？

| 问题 | 解决方案 |
|------|--------|
| 页面空白 | `npm start` 后检查浏览器控制台（F12）错误信息 |
| 404 错误 | 检查 `API_URL` 是否正确；或后端是否启动（node server/index.js） |
| 上传失败 | 确保文件是 .xlsx 格式；检查网络标签（F12 → Network）的响应 |
| ESLint 错误 | 运行 `npm run build` 查看具体错误，按提示修复 |

---

## 📚 完整文档

- **PROJECT_OVERVIEW.md** ← 详细的架构说明
- **QUICK_REFERENCE.md** ← API 调用、命令、快速查询

在 Cursor 中用 **Cmd+F** 搜索这些文档来快速找答案！

---

## 🎯 接下来你可以

- [ ] 本地启动项目，测试基本功能
- [ ] 修改 Excel 字段映射，支持你的业务字段
- [ ] 修改 UI 样式（调整颜色、布局等）
- [ ] 推送到 GitHub，测试生产部署
- [ ] 添加新功能（图片上传、高级搜索等）

**有问题？** 查看 PROJECT_OVERVIEW.md 的「常见问题排查」部分！

祝编码愉快！🚀
