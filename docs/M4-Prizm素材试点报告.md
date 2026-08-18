# M4 Prizm 英超素材试点报告

> 完成日期：2026-08-18
>
> 使用范围：朋友间私下娱乐，不公开传播链接
>
> 卡目：2024–25 Panini Prizm Premier League Base

## 1. 试点范围

- 共接入 39 张真实基础卡扫描图，覆盖 `base-1–10`、`base-21–29`、`base-41–50`、`base-271–280`。
- 覆盖 Manchester City、Arsenal、Liverpool FC、Leicester City、Ipswich Town FC，包含 Haaland、De Bruyne、Foden、Saka、Rice、Salah 等球员和 5 张 RC。
- 基础卡覆盖率为 39/300（13%）；完整 Prizm 卡目覆盖率为 39/692（5.6%）。未配置素材继续使用绘制回退层。

## 2. 来源与追踪

- 来源：[Trading Card Database 画廊](https://www.tcdb.com/Gallery.cfm/sid/481484/2024-25-Panini-Prizm-Premier-League?PageIndex=1)。
- 获取日期：2026-08-18。
- 每张卡的运行时素材元数据包含 TCDB 图片 ID、获取日期和 `private M4 pilot` 使用备注；图片 ID 按 `28923325 + cardNumber` 映射。
- 原始 JPG 保存在 `assets-src/prizm-epl/`，处理后的 WebP 保存在 `public/cards/prizm-epl/`，校验结果记录在 `public/cards/manifest.json`。

## 3. 处理与体积

- 39 张基础卡均处理为 500×700、5:7 WebP。
- 基础卡成品总计 1,109,316 bytes（约 1.06MB），平均 28,444 bytes，最小 24,152 bytes，最大 34,566 bytes。
- 所有成品均低于 120KB 单图门槛；整个 Prizm 成品目录约 1.2MB（另含 M3 签名/物料测试图）。
- `assets --todo` 报告 42 个显式映射、1 个故意保留的错误 URL、652 张未配置卡目。

## 4. 验证结果

- `?preview` 集中展示 39 张试点卡，真实图加载成功率 39/39，回退数 0。
- 桌面和 390×844 移动视口均保持 148×207 的 5:7 卡片占位，无横向溢出或布局抖动。
- 银折效果可复用同一底图叠加；RC、编号、签名、物料和错误 URL 回退继续由 M3 组合覆盖。
- 页面控制台无错误；代码检查、31 项测试、类型检查和生产构建全部通过。

## 5. 后续建议

- 后续可按球队或收藏优先级继续补齐素材，不需要修改 CardFace。
- 当前图片按项目要求随仓库保存；如果未来改为公开部署，应重新评估图片分发与缓存策略。
