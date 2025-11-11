# 快速参考 - 项目架构和开发指南

## 🎯 核心概念速览

### 三个主要组件

| 组件 | 文件 | 用户类型 | 功能 |
|------|------|---------|------|
| **App（路由器）** | `src/App.js` | 所有人 | 管理登录状态，切换视图 |
| **LuxuryProductSearch** | `src/LuxuryProductSearch.js` | 普通用户 | 搜索、排序、分页产品 |
| **AdminPanel** | `src/AdminPanel.js` | 管理员 | 上传 Excel 文件 |

### 数据流向

```
用户访问网站
  ↓
显示 LuxuryProductSearch（产品列表）+ 管理员登录按钮
  ↓
点击"管理员登录"按钮
  ↓
输入密钥 → 保存到 sessionStorage
  ↓
切换到 AdminPanel（上传界面）
  ↓
选择 Excel 文件
  ↓
发送 POST /api/products（带 x-admin-key 头）
  ↓
后端验证密钥 → 保存到 products.json
  ↓
前端显示成功消息
  ↓
点击退出登录 → 返回 LuxuryProductSearch
```

---

## 🔧 快速修改指南

### 1. 改变管理员密钥
**位置**：Render 环境变量 `ADMIN_KEY`
```javascript
// 用户登录时输入的密钥必须与这个值一致
// 在 Render 仪表板修改 ADMIN_KEY，应用自动重启
```

### 2. 修改 API 地址
**位置**：Vercel 环境变量 `REACT_APP_API_URL`
```javascript
// 前端所有 fetch 请求都使用这个地址
// 例如：https://luxury-api.onrender.com
```

### 3. 修改产品字段映射
**位置**：`src/AdminPanel.js` 中的 `headerMap` 对象（第 36 行开始）
```javascript
const headerMap = {
  produit: 'produit',
  prix_vente: 'prix_vente',
  // 在这里添加新的字段映射
  // 左边 = Excel 列名（规范化后），右边 = 内部字段名
};
```

### 4. 修改分页默认值
**位置**：`src/LuxuryProductSearch.js` 第 11 行
```javascript
const [pageSize, setPageSize] = useState(12);  // 改为你想要的默认值
```

### 5. 修改搜索字段
**位置**：`src/LuxuryProductSearch.js` 中的 `filteredProducts` 函数
```javascript
// 搜索会在这些字段中查找关键词
const searchLower = searchTerm.toLowerCase();
const matches = (p) =>
  (p.reference?.toString().toLowerCase().includes(searchLower)) ||
  (p.produit?.toLowerCase().includes(searchLower)) ||
  // 添加更多搜索字段...
```

---

## 📦 API 调用示例

### 获取所有产品（GET）
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

fetch(`${API_URL}/api/products`)
  .then(res => res.json())
  .then(data => {
    console.log('产品数据:', data);
    // data 是一个数组，每个元素都是产品对象
  });
```

### 上传产品数据（POST - 需要管理员权限）
```javascript
const adminKey = sessionStorage.getItem('admin_key');
const products = [
  { produit: '包', prix_vente: 1000, reference: 'A123' },
  { produit: '鞋', prix_vente: 500, reference: 'B456' }
];

fetch(`${API_URL}/api/products`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': adminKey  // 必须包含这个头
  },
  body: JSON.stringify(products)
})
.then(res => {
  if (res.ok) console.log('上传成功');
  else console.log('上传失败:', res.status);
});
```

---

## 🛠️ 本地开发命令

```bash
# 启动后端
cd server
npm start

# 启动前端（新终端）
cd ..
npm start

# 构建前端（检查 ESLint）
npm run build

# 推送到 GitHub（自动触发 Vercel 部署）
git add -A
git commit -m "描述你的改动"
git push
```

---

## 📋 文件操作速查

| 任务 | 文件 | 代码位置 |
|------|------|--------|
| 改 UI 样式 | `src/LuxuryProductSearch.js` | JSX 中的 className（Tailwind） |
| 改搜索逻辑 | `src/LuxuryProductSearch.js` | `filteredProducts` 函数 |
| 改排序逻辑 | `src/LuxuryProductSearch.js` | `sortedProducts` 函数 |
| 改登录方式 | `src/App.js` | `handleAdminLogin` 函数 |
| 改上传逻辑 | `src/AdminPanel.js` | `handleFileUpload` 函数 |
| 改 API 端点 | `server/index.js` | 路由定义（app.get、app.post） |
| 改字段规范化 | `src/AdminPanel.js` | `normalizeHeader` 和 `headerMap` |

---

## 🧪 测试清单

### ✅ 完整功能测试
- [ ] 打开前端 URL，看到产品列表
- [ ] 搜索功能正常（输入关键词能找到产品）
- [ ] 排序功能正常（价格升降序、品牌排序）
- [ ] 分页功能正常（切换页码、改变每页数量）
- [ ] 点击产品弹出详情弹窗
- [ ] 点击"管理员登录"按钮
- [ ] 输入管理员密钥后跳转到 AdminPanel
- [ ] 能上传 Excel 文件（拖拽或点击）
- [ ] 上传后显示成功消息
- [ ] 点击退出登录返回到用户视图
- [ ] 刷新页面后，新上传的产品仍在列表中

### 🐛 错误检查
- [ ] 浏览器控制台没有红色错误（F12 → Console）
- [ ] 网络请求成功（F12 → Network，没有红色 4xx/5xx）
- [ ] Vercel 构建成功（没有 ESLint 错误）

---

## 🚀 部署流程（自动化）

```mermaid
本地修改
  ↓
git commit & git push
  ↓
GitHub 接收更新
  ↓
Vercel 自动触发构建
  ↓
npm run build（检查 ESLint）
  ↓
构建成功 → 部署到 vercel.app
  ↓
网站更新完成（2-5 分钟）
```

**注意**：后端（Render）需要手动触发，步骤：
1. 修改 `server/` 文件
2. `git push`
3. 在 Render 仪表板点击"Deploy"或自动检测（取决于配置）

---

## 💾 数据持久化

### 产品数据存储位置
- **本地开发**：`server/data/products.json`
- **生产环境（Render）**：`/var/data/products.json` 或 Render 的持久化目录

### localStorage 备份
- 前端在 `localStorage` 中也保存一份产品数据
- 作用：后端不可达时，用户仍能看到之前加载过的产品

### 数据结构示例
```json
[
  {
    "produit": "LV 单肩包",
    "designation": "经典款",
    "reference": "M41612",
    "prix_vente": 8500,
    "marque": "Louis Vuitton",
    "couleur": "棕色",
    "Link": "https://example.com/product"
  },
  {
    "produit": "Gucci 腰带",
    "reference": "431691",
    "prix_vente": 3000,
    "marque": "Gucci"
  }
]
```

---

## 🔑 环境变量配置

### Vercel（前端）
在 Vercel 项目设置中添加：
```
REACT_APP_API_URL = https://luxury-api.onrender.com
```

### Render（后端）
在 Render Web Service 设置中添加：
```
ADMIN_KEY = jsonisall
NODE_ENV = production
PORT = 5000
```

---

## 📱 移动端适配

所有样式都使用 Tailwind CSS 的响应式类：
```javascript
// 示例：不同屏幕宽度应用不同样式
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* 手机 1 列，平板 2 列，电脑 3 列，大屏 4 列 */}
</div>
```

修改时注意保持响应式设计。

---

## 🎨 样式修改快速指南

### Tailwind 常用类
- **间距**：`px-4 py-3`（左右间距、上下间距）
- **颜色**：`bg-blue-600 text-white hover:bg-blue-700`
- **圆角**：`rounded-full rounded-lg rounded-none`
- **阴影**：`shadow-lg shadow-md`
- **响应式**：`md:text-lg lg:text-xl`
- **Flex 布局**：`flex items-center justify-between gap-4`
- **Grid 布局**：`grid grid-cols-3 gap-4`

**修改组件样式**：
1. 打开相关 `.js` 文件
2. 找到对应的 className
3. 修改 Tailwind 类（无需编写 CSS）
4. `npm start` 本地测试
5. 满意后 `git push` 部署

---

## 🐛 常见开发错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| "Cannot read property of undefined" | 数据未加载 | 检查 API 调用或 useState 初始值 |
| "CORS error" | 跨域请求被阻止 | 检查后端 CORS 配置或 API_URL |
| "x-admin-key not provided" | 缺少认证头 | 确保 adminKey 已保存到 sessionStorage |
| "Failed to compile" | ESLint 错误 | 运行 `npm run build` 查看具体错误 |
| "404 /api/products" | API 端点不存在 | 检查后端路由或 API_URL 配置 |

---

## 🎓 学习资源

- React Hooks：https://react.dev/reference/react/hooks
- Tailwind CSS：https://tailwindcss.com/docs
- Express 路由：https://expressjs.com/en/guide/routing.html
- XLSX 库：https://docs.sheetjs.com/docs/api/parse-options

---

**提示**：在 Cursor 中使用 Cmd+F 搜索本文档来快速找到你需要的内容！
