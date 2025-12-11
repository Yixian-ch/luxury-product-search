# 🚀 配置前端连接到后端

## ✅ 后端状态确认

您的后端已成功部署在：
```
https://luxury-product-search.onrender.com
```

测试结果：
- `/api/health` ✅ 正常
- `/api/products` ✅ 已有数据

---

## 📝 需要配置 Vercel 环境变量

### 步骤 1：登录 Vercel

1. 访问 https://vercel.com
2. 登录您的账号
3. 找到 `temp-luxury` 或 `luxury-product-search` 项目

### 步骤 2：设置环境变量

1. 在项目页面，点击 **Settings**（设置）
2. 在左侧菜单点击 **Environment Variables**（环境变量）
3. 添加新变量：
   - **Name（名称）**：`REACT_APP_API_URL`
   - **Value（值）**：`https://luxury-product-search.onrender.com`
   - **Environment（环境）**：选择所有（Production, Preview, Development）

4. 点击 **Save**（保存）

### 步骤 3：重新部署

**重要**：更改环境变量后必须重新部署！

1. 返回项目主页
2. 点击顶部的 **Deployments**（部署）
3. 找到最新的部署
4. 点击右边的 **三个点 (⋯)**
5. 选择 **Redeploy**（重新部署）
6. 确认重新部署

等待 1-2 分钟，部署完成后刷新网站。

---

## 🧪 测试上传功能

部署完成后：

1. **访问您的前端网站**
   - 例如：`https://你的项目名.vercel.app`

2. **管理员登录**
   - 点击右下角"管理员登录"按钮
   - 输入管理员密钥（您在 Render 设置的 `ADMIN_KEY`）
   - 如果不记得密钥，去 Render → 您的服务 → Environment 查看

3. **测试上传**
   - 准备一个测试 Excel 文件
   - 点击"上传商品数据"
   - 选择文件并上传

4. **查看浏览器控制台**（F12）
   - 应该看到：
     ```
     上传数据到: https://luxury-product-search.onrender.com/api/products
     数据条数: XX
     数据大小: XXXX bytes
     ```

---

## ❓ 如何检查当前配置

### 方法 1：在浏览器检查

1. 打开您的网站
2. 按 F12 打开开发者工具
3. 在 Console（控制台）输入：
   ```javascript
   console.log(process.env.REACT_APP_API_URL)
   ```
4. 如果显示 `undefined`，说明环境变量未配置

### 方法 2：查看网络请求

1. F12 → Network（网络）标签
2. 尝试上传数据
3. 查看请求地址：
   - ✅ 正确：`https://luxury-product-search.onrender.com/api/products`
   - ❌ 错误：`http://localhost:5000/api/products`

---

## 🔐 管理员密钥配置

### 在 Render 查看/设置密钥：

1. 登录 https://render.com
2. 选择您的后端服务
3. 点击 **Environment** 标签
4. 查看 `ADMIN_KEY` 的值
5. 如果没有，添加：
   - Key: `ADMIN_KEY`
   - Value: 您的密钥（例如：`jsonisall`）

**注意**：修改后端环境变量后，服务会自动重启。

---

## 📊 完整配置清单

### Vercel（前端）
- [ ] 环境变量 `REACT_APP_API_URL` = `https://luxury-product-search.onrender.com`
- [ ] 重新部署前端
- [ ] 测试网站能否访问

### Render（后端）
- [x] 服务正常运行 ✅
- [ ] 环境变量 `ADMIN_KEY` 已设置
- [x] `/api/health` 正常响应 ✅
- [x] `/api/products` 返回数据 ✅

---

## 🐛 故障排查

### 问题：上传时显示"无法连接到服务器"

**可能原因**：
1. Vercel 环境变量未配置或配置错误
2. Render 服务休眠（冷启动）

**解决方案**：
1. 确认环境变量正确
2. 访问 `https://luxury-product-search.onrender.com/api/health` 唤醒服务
3. 等待 30 秒后重试上传

### 问题：上传时显示"管理员密钥无效"

**解决方案**：
1. 检查输入的密钥是否正确（区分大小写）
2. 在 Render 确认 `ADMIN_KEY` 环境变量的值
3. 退出管理员重新登录

### 问题：数据上传后消失

**原因**：Render 免费版没有持久化存储

**临时解决方案**：
- 定期重新上传数据
- 或升级到 Render 付费版并添加 Persistent Disk

**永久解决方案**：
- 使用数据库（MongoDB / PostgreSQL）

---

## 📧 需要帮助？

如果配置后仍有问题，请提供：
1. Vercel 环境变量截图
2. 浏览器控制台错误信息
3. 网络请求详情（F12 → Network）







