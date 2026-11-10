import { DIAGRAMS } from "../src/diagrams";
import { buildFor } from "../src/build";
import { FULL_TEMPLATES } from "../src/templates";
import { repairSyntaxPunctuation } from "../src/chinese";
import { render } from "pele";

/**
 * 完整模板的守门测试。
 * 模板会直接插进笔记，一旦语法过时就是一张报错的图，
 * 所以这里逐个渲染，另外查首行关键字有没有串行、语法位有没有漏网的全角标点。
 */

let pass = 0;
let fail = 0;
const problems: string[] = [];

const HEADER: Record<string, RegExp> = {
  flowchart: /^flowchart\s+(TD|TB|LR|RL|BT)\b/i,
  mindmap: /^mindmap\b/i,
  timeline: /^timeline\b/i,
  sequence: /^sequenceDiagram\b/i,
  class: /^classDiagram\b/i,
  state: /^stateDiagram/i,
  er: /^erDiagram\b/i,
  gantt: /^gantt\b/i,
  pie: /^pie\b/i,
  quadrant: /^quadrantChart\b/i,
  journey: /^journey\b/i,
  kanban: /^kanban\b/i,
  treemap: /^treemap/i,
  radar: /^radar-beta\b/i,
  sankey: /^sankey-beta\b/i,
  xychart: /^xychart-beta\b/i,
  gitgraph: /^gitGraph\b/i,
  c4: /^C4(Context|Container|Component|Dynamic|Deployment)\b/i,
  requirement: /^requirement(Diagram)?\b/i,
  block: /^block-beta\b/i,
  packet: /^packet-beta\b/i,
  architecture: /^architecture-beta\b/i,
};

for (const def of DIAGRAMS) {
  const template = FULL_TEMPLATES[def.kind];
  const label = `${def.nameZh}(${def.kind})`;

  if (!template || !template.trim()) {
    fail += 1;
    problems.push(`${label} 没有完整模板`);
    continue;
  }

  const header = HEADER[def.kind];
  const first = template.split("\n")[0].trim();
  if (header && !header.test(first)) {
    fail += 1;
    problems.push(`${label} 首行不是这类图的声明：${first}`);
    continue;
  }

  const repaired = repairSyntaxPunctuation(template);
  if (repaired.count > 0) {
    fail += 1;
    problems.push(`${label} 语法位里有 ${repaired.count} 处全角标点`);
    continue;
  }

  try {
    const r = render(template, { fontFamily: "sans-serif" });
    pass += 1;
    console.log(`[OK]   ${label.padEnd(16)} type=${r.type.padEnd(12)} svg=${r.svg.length}B lines=${template.split("\n").length}`);
  } catch (e) {
    fail += 1;
    problems.push(`${label} 渲染失败：${(e as Error).message.replace(/\n/g, " | ").slice(0, 160)}`);
  }
}

/* 全角标点兜底：语法位换成半角，引号里的文字一个不动 */
const cases: { name: string; input: string; expect: string }[] = [
  {
    name: "桑基图全角逗号",
    input: "sankey-beta\n访问，注册，60",
    expect: "sankey-beta\n访问,注册,60",
  },
  {
    name: "引号里的中文标点不动",
    input: 'pie showData\n  "桌面端，移动端" : 45',
    expect: 'pie showData\n  "桌面端，移动端" : 45',
  },
  {
    name: "全角冒号与括号",
    input: "flowchart TD\n  A［注］--> B",
    expect: "flowchart TD\n  A［注］--> B",
  },
  {
    name: "全角括号做语法",
    input: "flowchart TD\n  A（开始）--> B",
    expect: "flowchart TD\n  A(开始)--> B",
  },
];

for (const c of cases) {
  const got = repairSyntaxPunctuation(c.input).code;
  if (got === c.expect) {
    pass += 1;
    console.log(`[OK]   ${c.name}`);
  } else {
    fail += 1;
    problems.push(`${c.name}：期望 ${JSON.stringify(c.expect)}，实际 ${JSON.stringify(got)}`);
  }
}

/* 桑基图：节点名只能是 ASCII（Obsidian 1.15 的渲染器只认 ASCII 单元格），
   中文节点名自动改画流程图版，别让它硬渲染一张报错的桑基图 */
const sankeyDef = DIAGRAMS.find((d) => d.kind === "sankey")!;
const sankeyBody = FULL_TEMPLATES.sankey
  .split("\n")
  .filter((line) => !/^\s*%%/.test(line))
  .join("\n");

if (/[^\x20-\x7E\n]/.test(sankeyBody)) {
  fail += 1;
  problems.push("桑基图模板里有非 ASCII 节点名，在 Obsidian 里会解析失败");
} else {
  pass += 1;
  console.log("[OK]   桑基图模板节点名全是 ASCII");
}

const chineseFlow = buildFor(sankeyDef, "访问 > 注册 : 60\n访问 > 离开 : 40");
if (chineseFlow.code.startsWith("flowchart") && chineseFlow.warnings.some((w) => w.includes("流程图"))) {
  pass += 1;
  console.log("[OK]   中文节点名自动转流程图版");
  try {
    render(chineseFlow.code, { fontFamily: "sans-serif" });
  } catch (e) {
    fail += 1;
    problems.push(`中文流程图版渲染失败：${(e as Error).message.slice(0, 120)}`);
  }
} else {
  fail += 1;
  problems.push(`中文节点名没有转成流程图版：${chineseFlow.code.split("\n")[0]}`);
}

const asciiFlow = buildFor(sankeyDef, "visit > signup : 60");
if (asciiFlow.code.startsWith("sankey-beta")) {
  pass += 1;
  console.log("[OK]   英文节点名仍然是桑基图");
} else {
  fail += 1;
  problems.push("英文节点名没有生成桑基图");
}

console.log(`\n完整模板：通过 ${pass} / ${pass + fail}`);
if (problems.length) {
  for (const p of problems) console.log("  - " + p);
}
process.exit(fail === 0 ? 0 : 1);
