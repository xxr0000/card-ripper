# ⚽ 球星卡模拟拆卡器 Card Ripper

一个纯前端的足球球星卡模拟拆卡网页。用模拟余额购买卡盒，体验真实的撕包翻卡过程，
支持带编卡、物料卡、签名卡，拆到的卡自动存入收藏册（保存在浏览器本地）。

## 收录系列

| 系列 | 结构 | 保底 |
| --- | --- | --- |
| Panini Prizm 英超 | 12 包 × 12 张 | 1 签名、4 Silver、5 编号 |
| Panini Select 西甲 | 12 包 × 5 张 | 3 签名或物料、5 编号 |
| Panini Obsidian 黑曜石（全球） | 1 包 × 7 张 | 4 签名或物料、1 平行、1 插卡 |
| Topps Chrome 欧冠 | 20 包 × 4 张 | 1 签名，平行按官方包赔率 |

每个系列的盒均结构按产品资料建模；编号平行由 checklist 数量和单卡印量推导，
Topps Chrome 的平行概率直接采用官方逐包赔率。未公开的内部拆分会明确标记为估算。

## 本地开发

```bash
npm ci
npm run dev     # 开发服务器
npm run build   # 生产构建，输出到 dist/
npm run check   # lint + 测试 + 类型检查 + 生产构建 + 体积门禁
```

调试辅助：

- 访问 `/?preview` 可一次性预览所有系列、所有平行的卡面样式
- `npm run simulate -- --boxes 10000 --seed 20240818` 输出盒规与官方赔率对表
- `npm run import-checklist -- ...` 将 CSV/XLSX 规范化为系列独立卡目
- `npm run media:audit` 核对全量球员媒体尺寸、重复内容、来源清单与回退率

## 文档

- [项目简介与目录结构](docs/项目简介.md)
- [真实化升级计划：卡图 · 卡池 · 概率](docs/真实卡图升级计划.md)
- [真实化升级执行计划与进度](docs/真实化升级执行计划.md)
- [M2 概率与盒规来源、估算项及模拟报告](docs/M2概率与盒规报告.md)
- [M6 系列扩展、性能与部署报告](docs/M6-扩展性能与部署报告.md)

## 部署

当前项目通过 `.openai/hosting.json`、Sites Vite 插件和 Cloudflare Worker 静态资源绑定构建；
`VITE_BASE_PATH=/` 用于根路径托管，不设置时保持 GitHub Pages 的 `/card-ripper/` 子路径兼容。
`vercel.json` 继续作为私有 Vercel 备选配置。球员图片按需加载并随构建产物发布；M10
验收完成后仍需用户明确确认，才会更新线上版本。

## 技术

Vite + React + TypeScript，Cloudflare Worker 仅负责静态资源与 SPA 回退。卡面由真实素材与
代码绘制回退层（CSS + SVG）共同组成，
余额与收藏数据存于 localStorage。

> 仅供娱乐，卡面为程序生成的致敬设计，与 Panini / Topps 无关。
