import { DIAGRAMS } from "../src/diagrams";
import { buildFor } from "../src/build";
import { render } from "pele";

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const def of DIAGRAMS) {
  const result = buildFor(def, def.placeholder);
  if (!result.code) {
    console.log(`[FAIL] ${def.nameZh} 没生成代码`);
    fail += 1;
    failures.push(def.nameZh);
    continue;
  }
  try {
    const r = render(result.code, { fontFamily: "sans-serif" });
    pass += 1;
    console.log(`[OK]   ${def.nameZh.padEnd(8)} ${def.mode.padEnd(8)} type=${r.type} svg=${r.svg.length}B warn=${result.warnings.length}`);
  } catch (e) {
    fail += 1;
    failures.push(def.nameZh);
    const msg = (e as Error).message.replace(/\n/g, " | ").slice(0, 150);
    console.log(`[FAIL] ${def.nameZh}  ${msg}`);
    console.log(result.code.split("\n").map((l) => "       " + l).join("\n"));
  }
}

console.log(`\n通过 ${pass} / ${pass + fail}`);
if (failures.length) console.log("失败：" + failures.join("、"));
process.exit(fail === 0 ? 0 : 1);
