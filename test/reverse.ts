import { DIAGRAMS } from "../src/diagrams";
import { buildFor } from "../src/build";
import { detectKind, reverseFor } from "../src/reverse";
import { FULL_TEMPLATES } from "../src/templates";
import type { DiagramKind } from "../src/types";

const SUPPORTED: DiagramKind[] = ["flowchart", "sequence", "pie", "timeline", "mindmap"];

let pass = 0;
let fail = 0;

for (const kind of SUPPORTED) {
  const def = DIAGRAMS.find((d) => d.kind === kind);
  if (!def) continue;

  const built = buildFor(def, def.placeholder);
  if (!built.code) {
    console.log(`[SKIP] ${kind} 没有生成代码`);
    continue;
  }

  const detected = detectKind(built.code);
  const reversed = reverseFor(kind, built.code);

  if (!reversed) {
    console.log(`[FAIL] ${kind} 无法反向解析`);
    console.log(built.code.split("\n").map((l) => "       " + l).join("\n"));
    fail += 1;
    continue;
  }

  const rebuilt = buildFor(def, reversed);
  const same = rebuilt.code === built.code;

  if (same && detected === kind) {
    pass += 1;
    console.log(`[OK]   ${kind} 往返一致`);
  } else {
    fail += 1;
    console.log(`[DIFF] ${kind}  识别为 ${detected}，往返不一致`);
    console.log("  原始代码:");
    console.log(built.code.split("\n").map((l) => "    " + l).join("\n"));
    console.log("  反向文本:");
    console.log(reversed.split("\n").map((l) => "    " + l).join("\n"));
    console.log("  重建代码:");
    console.log(rebuilt.code.split("\n").map((l) => "    " + l).join("\n"));
  }
}

/* 完整模板不能被反向解析：不然切到结构化输入时，子图、样式、注释会被悄悄吞掉 */
for (const kind of SUPPORTED) {
  if (reverseFor(kind, FULL_TEMPLATES[kind])) {
    fail += 1;
    console.log(`[LEAK] ${kind} 的完整模板被解成了结构化输入，复杂写法会丢`);
  } else {
    pass += 1;
    console.log(`[OK]   ${kind} 完整模板保持代码编辑`);
  }
}

console.log(`\n反向编辑：通过 ${pass} / 失败 ${fail}`);
process.exit(fail === 0 ? 0 : 1);