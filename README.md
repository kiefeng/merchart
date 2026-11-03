# Merchart

Build Mermaid diagrams from plain Chinese text, without memorizing the syntax that breaks the moment you type Chinese.

## Why this exists

Mermaid identifiers have to be ASCII. Type `branch 内容线` and the parser stops with `Lexical error: Unrecognized text`. Use a full-width comma `，` in a Sankey line and it complains it expected `COMMA` and got `NON_ESCAPED_TEXT`. Drop an unquoted Chinese string into a requirement's `text` field and it fails the same way.

If you write in Chinese, you hit one of these almost every time. Merchart takes ordinary Chinese lines, generates the ASCII identifiers for you, keeps your Chinese as labels, and normalizes full-width punctuation before anything reaches the parser.

## Install

Not in the community store yet. Manual install:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Drop them into `<vault>/.obsidian/plugins/merchart/`.
3. Enable **Merchart** under Settings → Community plugins.

## Usage

Open the inserter from the command palette (**Insert diagram**), the editor right-click menu, or one of the six per-type commands. Pick a type on the left, type your content in the middle, and the diagram renders underneath as you go.

- `Ctrl` / `Cmd` + `Enter` inserts
- `Tab` / `Shift+Tab` indents and outdents the selection
- Drag the bottom-right corner to resize; the size is remembered as a share of the window, so it survives a monitor change

## Diagram types

All 22 types Obsidian renders are covered. Sixteen take structured Chinese input; six are editable templates because their syntax is declarative.

| Type | Input |
|---|---|
| Flowchart | indented lines, `name{}` for decisions, `label: name` for edge labels |
| Mindmap | indented lines, first line is the root |
| Timeline | `time : event` |
| Sequence | `A > B : message` |
| Class | `Name: member, member`, then `A > B : label` |
| State | `A > B : trigger`, `[*]` for start and end |
| ER diagram | `Entity: field, field`, then `A > B : label` |
| Gantt | `task \| start \| duration`, `after some task` works |
| Pie | `item : value` |
| Quadrant | `x: low --> high`, `y: low --> high`, then `Name: 0.7, 0.3` |
| Journey | `section: name`, then `action: score` |
| Kanban | columns at the margin, cards indented |
| Treemap | root first, then `name: value` |
| Radar | `axes: a, b, c`, then `Serie: 1, 2, 3` |
| Sankey | `source > target : value` |
| XY chart | `x: ...`, `y: ...`, `type: bar` or `line` |
| Git graph | template |
| C4 | template |
| Requirement | template |
| Block | template |
| Packet | template |
| Architecture | template |

## What happens to your Chinese

Three things, applied to every diagram:

1. **Identifiers become ASCII.** Nodes, branches, entities and axes get `n1`, `p1`, `t1` style ids; your Chinese text goes into the label instead. The `Lexical error` class of failure cannot happen.
2. **Full-width punctuation is folded.** `，` `：` `；` `（）` `【】` `｜` and their relatives are converted before parsing.
3. **Quotes and brackets inside labels are escaped**, so a label containing `"` or `[` will not truncate the statement.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Default diagram on open | Remember last | Follow the last type you used, or pin one |
| Indent width | 2 spaces | Spaces inserted by Tab |
| Close after inserting | On | Turn off to keep drawing in the same dialog |
| Add blank lines around the block | On | Keeps the fence from sticking to surrounding text |
| Live preview | On | Turn off for manual refresh on heavy diagrams |

## Compatibility

Obsidian 1.4 or newer. On 1.15 and later, Mermaid blocks are rendered by Pele, Obsidian's own renderer, and the preview follows automatically. The plugin does not depend on which renderer is in use.

Desktop only: the layout uses a fixed side column and a drag handle, neither of which makes sense on a phone.

## Known limits

- Six types (Git graph, C4, requirement, block, packet, architecture) are templates you edit directly rather than structured forms.
- No reverse editing yet: you cannot take an existing diagram and turn it back into the structured input.
- Preview zoom is not implemented.

## Development

```bash
npm install
npm run build          # typecheck + bundle to main.js
npm test               # covered types plus edge cases, rendered through Pele
```

The tests bundle with esbuild and render every generated diagram through `pele`, so a syntax regression fails the build rather than showing up as a broken diagram in the vault.

## 中文说明

Merchart 用中文写内容，生成合法的 Mermaid 代码。标识符自动转成 ASCII，中文全部作为标签保留，全角标点会先归一化再解析。覆盖 Obsidian 支持的全部 22 种图，其中 16 种是结构化输入，6 种是可编辑模板。

命令面板搜「插入图」，或在编辑器里右键。左侧选类型，中间填内容，下面实时预览，`Ctrl+Enter` 插入。

## License

MIT
