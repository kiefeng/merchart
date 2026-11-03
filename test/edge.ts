import { DIAGRAMS } from "../src/diagrams";
import { buildFor } from "../src/build";
import { render } from "pele";
import type { DiagramKind } from "../src/types";

interface EdgeCase {
  name: string;
  kind: DiagramKind;
  input: string;
}

const long = Array.from({ length: 1000 }, (_, i) => `节点${i}`).join("\n");
const deep = Array.from({ length: 200 }, (_, i) => "  ".repeat(i % 10) + `层${i}`).join("\n");

const CASES: EdgeCase[] = [
  { name: "空输入", kind: "flowchart", input: "" },
  { name: "只有空白", kind: "flowchart", input: "   \n\n\t\n" },
  { name: "全角逗号", kind: "sankey", input: "医生，门诊，60\n门诊，处方，45" },
  { name: "全角冒号", kind: "pie", input: "肠内营养：45\n麻醉：25" },
  { name: "标签含双引号", kind: "flowchart", input: '患者"特殊"就诊\n  营养筛查' },
  { name: "标签含方括号", kind: "flowchart", input: "患者[初诊]\n  筛查" },
  { name: "非法行混入", kind: "flowchart", input: "医生\n  子节点" },
  { name: "1000 个节点", kind: "flowchart", input: long },
  { name: "200 行深层缩进", kind: "mindmap", input: deep },
  { name: "象限坐标越界", kind: "quadrant", input: "品种A: 2.5, -0.3" },
  { name: "饼图非数字", kind: "pie", input: "项目 : abc" },
  { name: "时序省略参与者", kind: "sequence", input: "甲 > 乙 : 消息" },
  { name: "甘特引用不存在的任务", kind: "gantt", input: "任务A | after 不存在 | 5" },
  { name: "模板空输入", kind: "gitgraph", input: "" },
  { name: "雷达轴数不匹配", kind: "radar", input: "轴: A, B, C\n方案: 1, 2" },
  { name: "看板只有卡片没有列", kind: "kanban", input: "  孤儿卡片" },
  { name: "树图缺根", kind: "treemap", input: "  孤儿: 10" },
  { name: "旅程分数越界", kind: "journey", input: "section: 甲\n步骤: 99" },
];

let ok = 0;
let bad = 0;

for (const c of CASES) {
  const def = DIAGRAMS.find((d) => d.kind === c.kind);
  if (!def) {
    console.log(`[SKIP] ${c.name} 找不到类型 ${c.kind}`);
    continue;
  }

  let built;
  try {
    built = buildFor(def, c.input);
  } catch (e) {
    bad += 1;
    console.log(`[CRASH] ${c.name} -> 生成器抛异常：${(e as Error).message}`);
    continue;
  }

  if (!built.code) {
    ok += 1;
    console.log(`[EMPTY] ${c.name} -> 无代码（预期内的空结果），warn=${built.warnings.length}`);
    continue;
  }

  try {
    const r = render(built.code, { fontFamily: "sans-serif" });
    ok += 1;
    console.log(`[OK]    ${c.name} -> type=${r.type} svg=${r.svg.length}B warn=${built.warnings.length}`);
  } catch (e) {
    bad += 1;
    const msg = (e as Error).message.replace(/\n/g, " | ").slice(0, 130);
    console.log(`[FAIL]  ${c.name} -> ${msg}`);
    console.log(built.code.split("\n").slice(0, 6).map((l) => "         " + l).join("\n"));
  }
}

console.log(`\n边界用例：无异常 ${ok} / 有问题 ${bad} / 共 ${CASES.length}`);
process.exit(bad === 0 ? 0 : 1);
