# 奢侈品价格查询（非营利信息分享项目）

> 本项目仅用于公开信息整理与分享，不提供任何买卖撮合或商业性服务。所有数据来源于公开渠道，供学习、调研与参考使用。

## ✨ 项目定位

- **非营利目的**：旨在帮助用户了解奢侈品市场价格区间、品牌趋势等公开信息。
- **信息展示型网站**：前端提供搜索、筛选、分页、详情弹窗等体验；后端负责存储 JSON 数据并提供开放接口。
- **管理员自维护**：通过 Excel 批量导入或按品牌批量删除，确保数据可控、可追溯。

更多法律合规说明请参见 [`LEGAL_NOTICE.md`](./LEGAL_NOTICE.md)。

## 🧩 功能概览

- 按名称、识别码、品牌关键词搜索  
- 价格 / 品牌排序、分页、品牌筛选  
- 商品详情弹窗、图片展示  
- 管理员登录、Excel 批量导入、单条编辑  
- 按品牌批量删除数据（管理员操作）  
- REST API（GET / POST / PATCH / DELETE）

## 🏗 技术栈

| 层级 | 技术 | 说明 |
| ---- | ---- | ---- |
| 前端 | React 18、Tailwind CSS、SheetJS (xlsx)、lucide-react | 搜索展示与数据上传 |
| 后端 | Express.js、CORS、中间件 | JSON 数据读写、鉴权 |
| 存储 | 文件系统 (`server/data/products.json`) | Render 或本地部署均可使用 |
| 部署 | Vercel（前端）、Render（后端） | 支持环境变量配置 |

## 🚀 本地开发

```bash
# 启动后端
cd server
npm install
npm start   # 默认监听 http://localhost:5000

# 启动前端（新终端）
cd ..
npm install
npm start   # 默认监听 http://localhost:3000
```

前端启动后即可访问 `http://localhost:3000`，管理员登录默认密钥为 `dev-secret`（也可在启动后端时设置 `ADMIN_KEY` 环境变量）。

## 🌐 部署配置

- Vercel（前端）：设置 `REACT_APP_API_URL=https://<your-backend>.onrender.com`
- Render（后端）：设置 `ADMIN_KEY=<你的管理员密钥>`
- 详细步骤见 [`SETUP_INSTRUCTIONS.md`](./SETUP_INSTRUCTIONS.md)

## 📁 项目结构（节选）

```
temp-luxury/
├── src/
│   ├── App.js
│   ├── LuxuryProductSearch.js
│   ├── AdminPanel.js
│   └── ...
├── server/
│   ├── index.js
│   └── data/products.json
├── LEGAL_NOTICE.md
├── PROJECT_OVERVIEW.md
├── SETUP_INSTRUCTIONS.md
└── ...
```

## 🤝 贡献与反馈

欢迎提交 Issue / Pull Request 或通过电子邮件反馈数据错误。请在提交前确认：

- 数据来源合法、可公开使用
- 未提供任何敏感个人信息
- 改动符合本项目非营利、信息分享的定位

## 📄 法律与隐私

- 网站不存储、不处理用户隐私数据
- 所有商品信息均来自公开渠道或授权数据
- 未开展任何商业化行为

详尽法律声明请参阅 [`LEGAL_NOTICE.md`](./LEGAL_NOTICE.md)。欢迎关注项目最新进展并共同维护开放透明的数据生态。谢谢支持！
