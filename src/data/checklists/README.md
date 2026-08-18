# Checklist 数据格式

正式卡池由 `scripts/import-checklist.ts` 从 UTF-8 CSV 或 XLSX 生成，不手工编辑生成后的 JSON。XLSX 使用 `Set / Number / Name / Team / Print Run` 表头；Prizm EPL 配置只导入基础卡、正式插入卡和签字卡，展开的平行版本留给 M2 概率数据处理。

必填列：

```csv
cardNumber,playerName,teamEn
```

可选列：

```csv
playerId,teamZh,countryEn,countryZh,rookie,subset,category,assetBase,assetAuto,assetRelic,assetAutoRelic,assetSource
```

- `rookie` 接受 `true/false`、`1/0`、`yes/no`、`y/n`、`rc` 或空值。
- `category` 接受 `base`、`insert`、`auto`、`relic`、`auto-relic`。
- `subset` 默认 `Base`，`category` 默认 `base`。
- `playerId` 为空时由英文球员名生成；同名球员需要在源 CSV 中显式指定。
- 每个 `subset + cardNumber` 对应一张卡；双人签字等同号多行会合并到 `subjects`。
- 图片列填写相对 `public/` 的 `.webp` 路径，禁止绝对路径和 `..`；`assetSource` 接受 `self-made`、`licensed`、`reference`，默认 `reference`。
- 约定路径为 `cards/{seriesId}/{cardId}[.auto|.relic].webp`，但运行时以显式元数据为准，不猜测文件名。

示例：

```bash
npm run import-checklist -- \
  --input ../2024-25-Panini-Prizm-Premier-League-Soccer.xlsx \
  --output src/data/checklists/prizm-epl.json \
  --series prizm-epl \
  --product "2024-25 Panini Prizm Premier League" \
  --release-date 2025-04-30 \
  --source-name "Checklist Center XLSX export" \
  --source-url "https://www.checklistcenter.com/2024-25-panini-prizm-premier-league-soccer-card-checklist/" \
  --source-kind reference \
  --accessed-at 2026-08-18
```

Prizm EPL 的 33 张 RC 编号由 TCDB Rookie Gallery 交叉核对，配置固定在导入器中；生成结果应为 692 张实体卡目、700 个球员记录，其中 Base 300 张、Insert 300 张、Auto 92 张。

M6 继续使用同一导入器处理 Checklist Center 的展开 XLSX，并只保留未展开的基础子系列、插卡、签名和物料名单：

- Select La Liga：646 张，其中 Base 250、Insert 200、Auto 86、Relic 100、Auto Relic 10。
- Obsidian：471 张，其中 Base 107、Insert 166、Auto 70、Relic 83、Auto Relic 45。
- Topps Chrome UCL：738 张，其中 Base 200、Insert 251、Auto 287。

扩展系列的自动生成球员 ID 带系列前缀，避免同一球员在不同年份或球队下覆盖全局资料。Select Future、Bowman Youth、Radiating Rookies、Wonderkids 与 Youthquake 中出现的球员会将 RC 标记传播到同系列其他卡目。各系列具体的允许子系列映射固定在 `scripts/import-checklist.ts`，重复执行输出稳定。

人工修订同样固定在导入配置和生成文件来源备注中：源表的 `Anthony rdon` 根据官方产品 PDF 与 TCDB 修订为 `Anthony Gordon`。不要直接修改生成 JSON。

## 图片素材

自制或已获授权的原图放在 `assets-src/{seriesId}/`。处理与检查命令：

```bash
npm run assets -- --process
npm run assets -- --todo
```

`--process` 会裁切为 500×700、转为 WebP、校验 120KB 上限，并生成 `public/cards/manifest.json`；`--todo` 会列出显式映射但缺少文件的路径，以及尚未配置图片的卡目。M3 的 `broken.webp` 映射为故意保留的加载失败回归样例。
