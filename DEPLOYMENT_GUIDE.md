# 部署指南 - 奢侈品价格查询系统

## 快速总结
- **前端**：部署到 Vercel（免费）
- **后端**：部署到 Render（免费）
- **数据**：保存在 Render 后端（文件存储或数据库）

---

## 第一步：准备 GitHub 仓库

### 1.1 创建 GitHub 账号（如果没有）
访问 https://github.com/signup

### 1.2 创建新仓库
1. 登录 GitHub，点击右上角 **+**，选 **New repository**
2. 仓库名：`luxury-product-search`（可自定义）
3. 描述：`Luxury Product Query System`
4. 勾选 **Initialize with README**（可选）
5. 点击 **Create repository**

### 1.3 推送代码到 GitHub
在您的本地终端（项目根目录）运行：

```bash
cd /home/chenchen/Desktop/work/temp-luxury

# 初始化 git 仓库（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: luxury product search system"

# 添加远程仓库（替换 YOUR_USERNAME 和 YOUR_REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

**注意**：
- 替换 `YOUR_USERNAME` 为您的 GitHub 用户名
- 替换 `YOUR_REPO_NAME` 为您创建的仓库名
- 第一次推送可能需要输入 GitHub token 或密码（推荐使用 Personal Access Token）

---

## 第二步：部署前端到 Vercel

### 2.1 连接 Vercel 到 GitHub
1. 访问 https://vercel.com/signup
2. 用 GitHub 账号登录（选择 **Sign up with GitHub**）
3. 授权 Vercel 访问您的 GitHub 仓库

### 2.2 创建 Vercel 项目
1. 登录 Vercel 后，点击 **New Project**
2. 在 GitHub 中找到 `luxury-product-search` 仓库，点击 **Import**
3. **Configure Project**：
   - Framework Preset：选择 **Create React App**（或留空）
   - Root Directory：**temp-luxury**（如果代码在这个子目录）
   - Build Command：`npm run build`（通常自动识别）
   - Output Directory：`build`（通常自动识别）
4. **Environment Variables**：暂时不设置（下面再设置）
5. 点击 **Deploy**

等待部署完成，Vercel 会自动给您分配一个域名（例如 `luxury-product-search-abc123.vercel.app`）。

### 2.3 设置环境变量（用于后端 API 地址）
部署完后，在 Vercel 项目设置中：
1. 进入 **Settings** > **Environment Variables**
2. 添加新变量：
   - Name: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.onrender.com`（后面会生成）
3. 保存并重新部署

---

## 第三步：部署后端到 Render

### 3.1 准备后端（创建 package.json 脚本）
在 `temp-luxury/package.json` 中，确保有这些脚本：

```json
{
  "scripts": {
    "start": "react-scripts start",
    "start-server": "node server/index.js",
    "build": "react-scripts build"
  }
}
```

**注意**：Render 需要 `start` 或 `npm start` 命令来启动应用。由于这里是混合项目（既有前端也有后端），我们需要修改一下。

### 3.2 为后端创建独立的 package.json
在 `temp-luxury/server/` 目录中创建 `package.json`：

```bash
cd /home/chenchen/Desktop/work/temp-luxury/server
```

创建文件 `package.json`（内容）：

```json
{
  "name": "luxury-product-api",
  "version": "1.0.0",
  "description": "Backend API for luxury product search",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.4",
    "cors": "^2.8.5"
  }
}
```

### 3.3 连接 Render 到 GitHub
1. 访问 https://render.com（如果没账号先注册）
2. 用 GitHub 账号登录（选择 **Sign up with GitHub**）
3. 授权 Render 访问您的 GitHub 仓库

### 3.4 创建 Render Web Service
1. 在 Render 仪表盘，点击 **New +** > **Web Service**
2. 选择连接 GitHub 上的 `luxury-product-search` 仓库
3. **Configure service**：
   - Name: `luxury-product-api`（或自定义）
   - Environment: **Node**
   - Region: 选择最近的地区（例如 Singapore、Europe）
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
   - **Important**: 设置工作目录为 `server`（如果 UI 中有 Root Directory 选项，设为 `server`）
4. **Advanced Settings**（可选但推荐）：
   - Disk: 暂不需要（除非要持久化存储超过服务重启）
5. **Environment**：添加环境变量
   - Key: `ADMIN_KEY`
   - Value: 您的管理员密钥（例如 `jsonisall`，但推荐生产用更复杂的密钥）
6. 点击 **Create Web Service**

等待部署完成。Render 会分配一个 URL，例如 `https://luxury-product-api.onrender.com`。

---

## 第四步：更新前端以连接后端

### 4.1 在前端代码中使用后端 URL
编辑 `temp-luxury/src/LuxuryProductSearch.js`，找到所有 `fetch('/api/products'...` 并改为：

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// 在 useEffect 中改为：
fetch(`${API_URL}/api/products`)

// 在 handleFileUpload POST 中改为：
fetch(`${API_URL}/api/products`, {
  method: 'POST',
  headers,
  body: JSON.stringify(jsonData),
})
```

### 4.2 更新 Vercel 环境变量
回到 Vercel 项目设置：
1. **Settings** > **Environment Variables**
2. 更新 `REACT_APP_API_URL` 为 Render 的 URL（例如 `https://luxury-product-api.onrender.com`）
3. 保存并重新部署

---

## 第五步：测试生产环境

### 5.1 访问前端
打开 Vercel 分配的域名（例如 `https://luxury-product-search-abc123.vercel.app`）

### 5.2 测试查询功能
1. 页面应该能加载，显示"暂无商品数据"提示
2. 点击"管理员"按钮，输入您的 ADMIN_KEY（生产中请妥善保管）

### 5.3 测试上传功能
1. 准备一个测试 XLSX 文件
2. 点击"导入商品"，选择文件并上传
3. 如果您输入了正确的 ADMIN_KEY，应该看到提示"已保存到服务器与本地"
4. 刷新页面，确认数据仍在（从后端服务器加载）

### 5.4 测试查询
1. 在搜索框输入商品名称或识别码
2. 点击商品卡片查看详情
3. 测试排序和分页功能

---

## 故障排查

### 问题 1：前端无法连接后端
- 检查 Vercel 环境变量 `REACT_APP_API_URL` 是否正确
- 检查 Render 后端是否正在运行（在 Render 仪表盘查看日志）
- 检查 CORS 是否开启（`server/index.js` 中应有 `app.use(cors())`)

### 问题 2：上传失败提示"已保存到本地，未能保存到服务器"
- 确认 ADMIN_KEY 与后端设置的密钥一致
- 检查 Render 后端日志是否有 401 错误
- 确认后端 URL 正确（在浏览器控制台检查请求 URL）

### 问题 3：Render 免费计划限制
- Render 免费计划：30 天无活动自动停止，需访问唤醒
- 如果需要 24/7 运行，考虑升级到付费计划或使用其他服务（如 Railway、DigitalOcean）

---

## 后续优化（可选）

### 使用数据库而不是文件存储
当前后端用本地文件保存数据，如果需要多个实例/更高可靠性，建议改用数据库：
- **Supabase**（PostgreSQL）- 免费额度可用
- **MongoDB Atlas**（NoSQL）- 免费额度可用
- **Render PostgreSQL**（付费但性价比高）

### 使用 CDN 加速
- Vercel 已集成全球 CDN，前端通常很快
- 可考虑为图片加速（使用 Cloudflare 或图床）

### 备份数据
- 定期导出 Render 上的数据文件
- 或同步到 S3、Google Cloud Storage

---

## 总结
完成上述步骤后，您会有：
✅ 用户可访问的公开网站（Vercel 域名）  
✅ 可持久保存的商品数据（Render 后端）  
✅ 仅管理员可上传/修改数据（ADMIN_KEY 认证）  
✅ 用户可查询、搜索、排序、分页商品

祝部署顺利！有任何问题欢迎反馈。
