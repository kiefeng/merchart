import { DIAGRAMS } from "../src/diagrams";
import { buildFor } from "../src/build";
import { detectKind, reverseFor } from "../src/reverse";
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

console.log(`\n反向编辑：一致 ${pass} / 不一致 ${fail}，共 ${SUPPORTED.length} 种`);
process.exit(fail === 0 ? 0 : 1);
