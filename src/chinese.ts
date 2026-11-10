/**
 * 中文输入的处理层。
 *
 * 这里解决三件事：
 * 1. 全角标点归一，Mermaid 的解析器只认半角。
 * 2. 标识符必须 ASCII，中文一律放进标签里。
 * 3. 标签里的引号、方括号等要转义，不然会截断语法。
 */

const FULL_TO_HALF: Record<string, string> = {
  "，": ",",
  "：": ":",
  "；": ";",
  "（": "(",
  "）": ")",
  "【": "[",
  "】": "]",
  "｛": "{",
  "｝": "}",
  "｜": "|",
  "＞": ">",
  "＜": "<",
  "＝": "=",
  "　": " ",
  "～": "~",
  "！": "!",
  "？": "?",
  "．": ".",
};

/** 把全角标点换成半角，中文文字本身不动 */
export function normalizePunctuation(input: string): string {
  let out = "";
  for (const ch of input) {
    out += FULL_TO_HALF[ch] ?? ch;
  }
  return out;
}

/**
 * 兜底修复：整块 Mermaid 代码里，语法位的全角标点换成半角。
 *
 * 生成器自己不会写出全角，但模板是把用户代码原样拿过来的——那边一旦有
 * 全角逗号，Sankey、XY、看板这类按语法切分的图就会直接解析失败。
 * 引号里的内容是标签文字，一个字都不动；每行重算，避免跨行引号错位。
 */
const SYNTAX_PUNCT: Record<string, string> = {
  "，": ",",
  "：": ":",
  "；": ";",
  "（": "(",
  "）": ")",
  "｛": "{",
  "｝": "}",
  "｜": "|",
  "＞": ">",
  "＜": "<",
  "＝": "=",
  "　": " ",
};

export function repairSyntaxPunctuation(code: string): { code: string; count: number } {
  let count = 0;
  const lines = code.split("\n").map((line) => {
    // 注释行是给人看的，不参与解析，原样留着
    if (/^\s*%%/.test(line)) return line;

    let inQuote = false;
    let out = "";
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
        out += ch;
        continue;
      }
      const half = SYNTAX_PUNCT[ch];
      if (!inQuote && half) {
        out += half;
        count += 1;
        continue;
      }
      out += ch;
    }
    return out;
  });
  return { code: lines.join("\n"), count };
}

/** 标签里会被 Mermaid 当语法字符吃掉的东西，做最小转义 */
export function escapeLabel(text: string): string {
  return text.replace(/"/g, "#quot;").replace(/[[\]]/g, (m) => (m === "[" ? "#91;" : "#93;"));
}

/** 生成 ASCII 标识符：n1、n2……并保证不重复 */
export class IdPool {
  private used = new Set<string>();
  private counter = 0;

  next(prefix = "n"): string {
    let id: string;
    do {
      this.counter += 1;
      id = `${prefix}${this.counter}`;
    } while (this.used.has(id));
    this.used.add(id);
    return id;
  }
}

/** 去掉行首空白后计算缩进层级，Tab 和空格混用也能算对 */
export function measureIndent(line: string): number {
  const match = /^[ \t]*/.exec(line);
  const raw = match ? match[0] : "";
  let width = 0;
  for (const ch of raw) width += ch === "\t" ? 2 : 1;
  return width;
}

/** 按空白行和空行切成有效行，去掉首尾空白 */
export function meaningfulLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
}
