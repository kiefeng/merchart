import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const files = ["mockup-en.svg", "mockup-zh.svg", "mockup-mobile-en.svg", "mockup-mobile-zh.svg"];

for (const f of files) {
  const src = path.join("assets", f);
  if (!fs.existsSync(src)) {
    console.log(`跳过 ${f}：不存在`);
    continue;
  }
  const svg = fs.readFileSync(src, "utf8");
  const resvg = new Resvg(svg, { font: { loadSystemFonts: true } });
  const png = resvg.render().asPng();
  const out = src.replace(/\.svg$/, ".png");
  fs.writeFileSync(out, png);

  const meta = resvg.width + "x" + resvg.height;
  const kb = (png.length / 1024).toFixed(0);
  console.log(`${f}  ->  ${path.basename(out)}  ${meta}  ${kb}KB`);
}
