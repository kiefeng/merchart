import { escapeLabel, measureIndent, meaningfulLines, normalizePunctuation } from "./chinese";
import type { BuildResult } from "./types";

/** 把「甲 > 乙 : 关系」拆开 */
function splitArrow(line: string): { from: string; to: string; label: string } | null {
  const m = /^(.+?)\s*[-—>＞]+\s*(.+?)(?:\s*:\s*(.*))?$/.exec(line);
  if (!m) return null;
  return { from: m[1].trim(), to: m[2].trim(), label: (m[3] ?? "").trim() };
}

/* ------------------------------------------------------------------ */
/* 类图                                                                */
/* ------------------------------------------------------------------ */

export function buildClass(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];

  const classes: { name: string; members: string[] }[] = [];
  const relations: { from: string; to: string; label: string }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const arrow = splitArrow(line);
    if (arrow && !line.includes(":")) {
      relations.push(arrow);
      continue;
    }

    const colon = line.indexOf(":");
    if (colon > 0) {
      const name = line.slice(0, colon).trim();
      const members = line
        .slice(colon + 1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (name) classes.push({ name, members });
      continue;
    }

    if (line) classes.push({ name: line, members: [] });
  }

  if (classes.length === 0 && relations.length === 0) return { code: "", warnings };

  const ids = new Map<string, string>();
  let n = 0;
  const idOf = (name: string): string => {
    const existing = ids.get(name);
    if (existing) return existing;
    n += 1;
    const id = `c${n}`;
    ids.set(name, id);
    return id;
  };

  for (const r of relations) {
    if (!classes.some((c) => c.name === r.from)) classes.push({ name: r.from, members: [] });
    if (!classes.some((c) => c.name === r.to)) classes.push({ name: r.to, members: [] });
  }

  const body: string[] = ["classDiagram"];
  for (const c of classes) {
    body.push(`  class ${idOf(c.name)}["${escapeLabel(c.name)}"] {`);
    for (const m of c.members) body.push(`    +${escapeLabel(m)}`);
    body.push("  }");
  }
  for (const r of relations) {
    body.push(
      r.label
        ? `  ${idOf(r.from)} --> ${idOf(r.to)} : ${escapeLabel(r.label)}`
        : `  ${idOf(r.from)} --> ${idOf(r.to)}`
    );
  }

  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 状态图                                                              */
/* ------------------------------------------------------------------ */

export function buildState(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const transitions: { from: string; to: string; label: string }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const a = splitArrow(line);
    if (!a) {
      warnings.push(`跳过无法识别的行：${line}（要写成「甲 > 乙 : 触发条件」）`);
      continue;
    }
    transitions.push({ from: a.from, to: a.to, label: a.label });
  }

  if (transitions.length === 0) return { code: "", warnings };

  const body: string[] = ["stateDiagram-v2"];
  for (const t of transitions) {
    const label = t.label ? ` : ${escapeLabel(t.label)}` : "";
    body.push(`  ${t.from} --> ${t.to}${label}`);
  }

  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* ER 图                                                               */
/* ------------------------------------------------------------------ */

export function buildEr(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const entities: { name: string; fields: string[] }[] = [];
  const relations: { from: string; to: string; label: string }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const a = splitArrow(line);
    if (a && !line.includes(":")) {
      relations.push(a);
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0) {
      const name = line.slice(0, colon).trim();
      const fields = line
        .slice(colon + 1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (name) entities.push({ name, fields });
      continue;
    }
    if (line) entities.push({ name: line, fields: [] });
  }

  if (entities.length === 0 && relations.length === 0) return { code: "", warnings };

  const ids = new Map<string, string>();
  let n = 0;
  const idOf = (name: string): string => {
    const existing = ids.get(name);
    if (existing) return existing;
    n += 1;
    const id = `e${n}`;
    ids.set(name, id);
    return id;
  };

  for (const r of relations) {
    if (!entities.some((e) => e.name === r.from)) entities.push({ name: r.from, fields: [] });
    if (!entities.some((e) => e.name === r.to)) entities.push({ name: r.to, fields: [] });
  }

  const body: string[] = ["erDiagram"];
  for (const e of entities) {
    if (e.fields.length === 0) {
      body.push(`  ${idOf(e.name)} {`);
      body.push(`    string 名称`);
      body.push("  }");
      warnings.push(`实体「${e.name}」没有写字段，补了一个占位字段`);
      continue;
    }
    body.push(`  ${idOf(e.name)} {`);
    for (const f of e.fields) body.push(`    string ${f}`);
    body.push("  }");
  }
  for (const r of relations) {
    const label = r.label ? ` : ${escapeLabel(r.label)}` : "";
    body.push(`  ${idOf(r.from)} ||--o{ ${idOf(r.to)}${label}`);
  }

  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 用户旅程                                                            */
/* ------------------------------------------------------------------ */

export function buildJourney(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const body: string[] = ["journey"];
  let currentSection = "";
  let count = 0;

  for (const raw of lines) {
    const line = raw.trim();

    const sMatch = /^(?:section|阶段|章节)\s*:\s*(.+)$/i.exec(line);
    if (sMatch) {
      currentSection = sMatch[1].trim();
      body.push(`  section ${escapeLabel(currentSection)}`);
      continue;
    }

    const colon = line.lastIndexOf(":");
    if (colon <= 0) {
      warnings.push(`跳过无法识别的行：${line}（要写成「步骤: 分数」）`);
      continue;
    }
    const step = line.slice(0, colon).trim();
    const score = line.slice(colon + 1).trim();
    if (!step || !/^\d+$/.test(score)) {
      warnings.push(`跳过内容不全的行：${line}（分数要写 1 到 5 的数字）`);
      continue;
    }
    body.push(`    ${escapeLabel(step)}: ${score}: 用户`);
    count += 1;
  }

  if (count === 0) return { code: "", warnings };
  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 象限图                                                              */
/* ------------------------------------------------------------------ */

export function buildQuadrant(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const points: { name: string; x: string; y: string }[] = [];
  let xAxis = "";
  let yAxis = "";

  for (const raw of lines) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const head = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1).trim();

    if (/^(x轴|xaxis|x)$/i.test(head)) {
      const m = /^(.+?)\s*(?:>|->|→)\s*(.+)$/.exec(rest);
      xAxis = m ? `${m[1].trim()} --> ${m[2].trim()}` : rest;
      continue;
    }
    if (/^(y轴|yaxis|y)$/i.test(head)) {
      const m = /^(.+?)\s*(?:>|->|→)\s*(.+)$/.exec(rest);
      yAxis = m ? `${m[1].trim()} --> ${m[2].trim()}` : rest;
      continue;
    }

    const nums = rest.split(",").map((s) => s.trim());
    if (nums.length < 2 || !nums.every((v) => /^\d*\.?\d+$/.test(v))) {
      warnings.push(`跳过无法识别的行：${line}（要写成「名称: 0.7, 0.3」）`);
      continue;
    }
    points.push({ name: head, x: nums[0], y: nums[1] });
  }

  if (points.length === 0) return { code: "", warnings };

  const body: string[] = ["quadrantChart"];
  if (xAxis) body.push(`  x-axis ${xAxis}`);
  if (yAxis) body.push(`  y-axis ${yAxis}`);
  for (const p of points) body.push(`  ${escapeLabel(p.name)}: [${p.x}, ${p.y}]`);

  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 看板                                                                */
/* ------------------------------------------------------------------ */

export function buildKanban(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const body: string[] = ["kanban"];
  let columns = 0;

  for (const raw of lines) {
    const depth = measureIndent(raw);
    const line = raw.trim();
    if (depth <= 0) {
      body.push(`  ${escapeLabel(line)}`);
      columns += 1;
    } else {
      if (columns === 0) {
        warnings.push(`卡片「${line}」前面没有列名，已忽略`);
        continue;
      }
      body.push(`    [${escapeLabel(line)}]`);
    }
  }

  if (columns === 0) return { code: "", warnings };
  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 树图                                                                */
/* ------------------------------------------------------------------ */

export function buildTreemap(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const body: string[] = ["treemap-beta"];
  let depth0Seen = false;

  for (const raw of lines) {
    const depth = measureIndent(raw);
    const line = raw.trim();
    if (depth <= 0) {
      body.push(line.startsWith('"') ? line : `"${line}"`);
      depth0Seen = true;
      continue;
    }
    if (!depth0Seen) {
      warnings.push(`「${line}」上面缺少根节点，已忽略`);
      continue;
    }
    const colon = line.lastIndexOf(":");
    if (colon > 0) {
      const name = line.slice(0, colon).trim().replace(/^"|"$/g, "");
      const value = line.slice(colon + 1).trim();
      if (!/^\d+$/.test(value)) {
        warnings.push(`「${name}」的数值不是整数，已按原样写入`);
      }
      body.push(`    "${name}": ${value}`);
    } else {
      body.push(`    "${line.replace(/^"|"$/g, "")}"`);
    }
  }

  if (!depth0Seen) return { code: "", warnings };
  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 雷达图                                                              */
/* ------------------------------------------------------------------ */

export function buildRadar(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const axes: string[] = [];
  const curves: { name: string; values: string[] }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const head = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1).trim();

    if (/^(轴|axes|axis)$/i.test(head)) {
      for (const a of rest.split(",")) {
        const name = a.trim();
        if (name) axes.push(name);
      }
      continue;
    }

    const values = rest.split(",").map((s) => s.trim());
    if (!values.every((v) => /^\d*\.?\d+$/.test(v))) {
      warnings.push(`「${head}」的数值里有非数字，已跳过`);
      continue;
    }
    curves.push({ name: head, values });
  }

  if (axes.length === 0 || curves.length === 0) return { code: "", warnings: [...warnings, "至少要有「轴: ...」和一条曲线"] };

  const max = Math.max(...curves.flatMap((c) => c.values.map((v) => Number(v))), 5);
  const body: string[] = ["radar-beta"];

  const axisIds: string[] = [];
  axes.forEach((name, i) => {
    const id = `a${i + 1}`;
    axisIds.push(id);
    body.push(`  axis ${id}["${escapeLabel(name)}"]`);
  });

  curves.forEach((c, i) => {
    const padded = [...c.values];
    while (padded.length < axes.length) padded.push("0");
    if (padded.length > axes.length) {
      warnings.push(`「${c.name}」的数值比轴多，多的部分已截掉`);
    }
    body.push(`  curve c${i + 1}["${escapeLabel(c.name)}"]{${padded.slice(0, axes.length).join(", ")}}`);
  });

  body.push(`  max ${Math.ceil(max)}`);
  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 桑基图                                                              */
/* ------------------------------------------------------------------ */

export function buildSankey(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const rows: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const a = splitArrow(line);
    if (a && a.label) {
      rows.push(`${a.from},${a.to},${a.label}`);
      continue;
    }
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length === 3 && parts.every(Boolean)) {
      rows.push(`${parts[0]},${parts[1]},${parts[2]}`);
      continue;
    }
    warnings.push(`跳过无法识别的行：${line}（要写成「来源 > 去向 : 数值」）`);
  }

  if (rows.length === 0) return { code: "", warnings };
  return { code: ["sankey-beta", ...rows].join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* XY 图                                                               */
/* ------------------------------------------------------------------ */

export function buildXychart(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  let title = "";
  let xValues: string[] = [];
  let yValues: number[] = [];
  let chartType: "bar" | "line" = "bar";

  for (const raw of lines) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const head = line.slice(0, colon).trim().toLowerCase();
    const rest = line.slice(colon + 1).trim();

    if (head === "标题" || head === "title") {
      title = rest;
      continue;
    }
    if (head === "类型" || head === "type") {
      chartType = /线|line/i.test(rest) ? "line" : "bar";
      continue;
    }
    if (head === "x" || head === "x轴") {
      xValues = rest.split(",").map((s) => s.trim()).filter(Boolean);
      continue;
    }
    if (head === "y" || head === "y轴") {
      yValues = rest
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const num = Number(s);
          if (Number.isNaN(num)) {
            warnings.push(`y 里的「${s}」不是数字，按 0 处理`);
            return 0;
          }
          return num;
        });
      continue;
    }
  }

  if (xValues.length === 0 || yValues.length === 0) {
    return { code: "", warnings: [...warnings, "至少要写「x: 类别, 类别」和「y: 数值, 数值」"] };
  }

  const body: string[] = ["xychart-beta"];
  if (title) body.push(`  title "${escapeLabel(title)}"`);
  body.push(`  x-axis [${xValues.map((v) => `"${escapeLabel(v)}"`).join(", ")}]`);
  const maxY = Math.max(...yValues, 1);
  body.push(`  y-axis 0 --> ${Math.ceil(maxY * 1.2)}`);
  body.push(`  ${chartType} [${yValues.join(", ")}]`);

  return { code: body.join("\n"), warnings };
}
