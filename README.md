# ⚽ 球星卡模拟拆卡器 Card Ripper

一个纯前端的足球球星卡模拟拆卡网页。用模拟余额购买卡盒，体验真实的撕包翻卡过程，
支持带编卡、物料卡、签名卡，拆到的卡自动存入收藏册（保存在浏览器本地）。

## 收录系列

| 系列 | 结构 | 保底 |
| --- | --- | --- |
| Panini Prizm 英超 | 12 包 × 12 张 | 2 签名 |
| Panini Select 西甲 | 12 包 × 5 张 | 1 签名 + 1 物料 |
| Panini Obsidian 黑曜石（全球） | 1 包 × 7 张 | 2 签名 + 2 物料，全员带编 |
| Topps Chrome 欧冠 | 24 包 × 4 张 | 1 签名 |

每个系列的平行卡（银折、彩折、扎染、Color Blast、SuperFractor 等）、编号档位
（/199、/99、/25、/10、1/1）与爆率均参考真实产品设定。

## 本地开发

```bash
npm install
npm run dev     # 开发服务器
npm run build   # 生产构建，输出到 dist/
```

调试辅助：

- 访问 `/?preview` 可一次性预览所有系列、所有平行的卡面样式
- `npx tsx scripts/simulate.ts` 批量模拟拆盒，验证保底与爆率分布

## 技术

Vite + React + TypeScript，无后端。卡面全部由代码绘制（CSS + SVG），
余额与收藏数据存于 localStorage。

> 仅供娱乐，卡面为程序生成的致敬设计，与 Panini / Topps 无关。
