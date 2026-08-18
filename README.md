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
npm run check   # lint + 25 项测试 + 类型检查 + 生产构建
```

调试辅助：

- 访问 `/?preview` 可一次性预览所有系列、所有平行的卡面样式
- `npm run simulate -- --boxes 10000 --seed 20240818` 输出盒规与官方赔率对表
- `npm run import-checklist -- ...` 将 CSV/XLSX 规范化为系列独立卡目

## 文档

- [项目简介与目录结构](docs/项目简介.md)
- [真实化升级计划：卡图 · 卡池 · 概率](docs/真实卡图升级计划.md)
- [真实化升级执行计划与进度](docs/真实化升级执行计划.md)
- [M2 概率与盒规来源、估算项及模拟报告](docs/M2概率与盒规报告.md)

## 技术

Vite + React + TypeScript，无后端。卡面全部由代码绘制（CSS + SVG），
余额与收藏数据存于 localStorage。

> 仅供娱乐，卡面为程序生成的致敬设计，与 Panini / Topps 无关。
