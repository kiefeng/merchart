import {
  IdPool,
  escapeLabel,
  measureIndent,
  meaningfulLines,
  normalizePunctuation,
} from "./chinese";
import type { BuildResult, OutlineNode } from "./types";

/* ------------------------------------------------------------------ */
/* 大纲解析：流程图与思维导图共用                                        */
/* ------------------------------------------------------------------ */

export function parseOutline(text: string): OutlineNode[] {
  const lines = meaningfulLines(normalizePunctuation(text));
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const raw of lines) {
    const depth = measureIndent(raw);
    let body = raw.trim();

    let edgeLabel = "";
    const colon = body.indexOf(":");
    if (colon > 0) {
      edgeLabel = body.slice(0, colon).trim();
      body = body.slice(colon + 1).trim();
    }

    let decision = false;
    if (body.endsWith("{}")) {
      decision = true;
      body = body.slice(0, -2).trim();
    }

    if (!body) continue; // 只剩标签没有文字的，跳过

    const node: OutlineNode = { text: body, edgeLabel, decision, depth, children: [] };

    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }

  return roots;
}

/* ------------------------------------------------------------------ */
/* 1. 流程图                                                           */
/* ------------------------------------------------------------------ */

export function buildFlowchart(text: string): BuildResult {
  const roots = parseOutline(text);
  const warnings: string[] = [];
  if (roots.length === 0) return { code: "", warnings };

  const pool = new IdPool();
  const shapeLines: string[] = [];
  const edgeLines: string[] = [];

  const walk = (node: OutlineNode, parentId?: string): string => {
    const id = pool.next();
    const label = escapeLabel(node.text);
    shapeLines.push(node.decision ? `  ${id}{"${label}"}` : `  ${id}["${label}"]`);

    if (parentId) {
      const arrow = node.edgeLabel ? `  ${parentId} -->|"${escapeLabel(node.edgeLabel)}"| ${id}` : `  ${parentId} --> ${id}`;
      edgeLines.push(arrow);
    }
    for (const child of node.children) walk(child, id);
    return id;
  };

  for (const root of roots) walk(root);

  const code = ["flowchart TD", ...shapeLines, ...edgeLines].join("\n");
  return { code, warnings };
}

/* ------------------------------------------------------------------ */
/* 2. 思维导图                                                         */
/* ------------------------------------------------------------------ */

export function buildMindmap(text: string): BuildResult {
  const roots = parseOutline(text);
  const warnings: string[] = [];
  if (roots.length === 0) return { code: "", warnings };

  if (roots.length > 1) {
    warnings.push("思维导图只取第一个顶层节点当根，其余顶层节点已忽略");
  }

  const lines: string[] = ["mindmap"];

  const walk = (node: OutlineNode, depth: number): void => {
    const indent = "  ".repeat(depth);
    const label = escapeLabel(node.text);
    lines.push(depth === 0 ? `${indent}((${label}))` : `${indent}${label}`);
    for (const child of node.children) walk(child, depth + 1);
  };

  walk(roots[0], 0);
  return { code: lines.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 3. 时间线                                                           */
/* ------------------------------------------------------------------ */

export function buildTimeline(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const order: string[] = [];
  const grouped = new Map<string, string[]>();

  for (const raw of lines) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon <= 0) {
      warnings.push(`跳过无法识别的行：${line}（要写成「时间 : 事件」）`);
      continue;
    }
    const when = line.slice(0, colon).trim();
    const what = line.slice(colon + 1).trim();
    if (!when || !what) {
      warnings.push(`跳过内容不全的行：${line}`);
      continue;
    }
    if (!grouped.has(when)) {
      grouped.set(when, []);
      order.push(when);
    }
    grouped.get(when)!.push(what);
  }

  if (order.length === 0) return { code: "", warnings };

  const body = order.map((when) => {
    const events = grouped.get(when)!;
    return [`  ${when} : ${events[0]}`, ...events.slice(1).map((e) => `  : ${e}`)].join("\n");
  });

  return { code: ["timeline", ...body].join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 4. 时序图                                                           */
/* ------------------------------------------------------------------ */

export function buildSequence(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];

  const participants: string[] = [];
  const messages: { from: string; to: string; label: string }[] = [];
  let current = "";

  for (const raw of lines) {
    const line = raw.trim();

    const pMatch = /^(?:参与者|participant)\s*:\s*(.+)$/i.exec(line);
    if (pMatch) {
      for (const name of pMatch[1].split(",")) {
        const trimmed = name.trim();
        if (trimmed && !participants.includes(trimmed)) participants.push(trimmed);
      }
      continue;
    }

    // A > B : 消息
    const mMatch = /^(.+?)\s*[-—>＞]+\s*(.+?)\s*:\s*(.+)$/.exec(line);
    if (mMatch) {
      let from = mMatch[1].trim();
      let to = mMatch[2].trim();
      // 参与者列表里写了「医生, 系统」，允许只写前两个字
      const findName = (candidate: string) =>
        participants.find((p) => p === candidate || p.startsWith(candidate) || candidate.startsWith(p)) ?? candidate;
      from = findName(from);
      to = findName(to);
      messages.push({ from, to, label: mMatch[3].trim() });
      continue;
    }

    current = line;
    warnings.push(`跳过无法识别的行：${current}（要写成「甲 > 乙 : 消息」）`);
  }

  if (messages.length === 0) return { code: "", warnings };

  for (const msg of messages) {
    for (const name of [msg.from, msg.to]) {
      if (!participants.includes(name)) participants.push(name);
    }
  }

  const pool = new IdPool();
  const ids = new Map<string, string>();
  const head: string[] = ["sequenceDiagram"];
  for (const name of participants) {
    const id = pool.next("p");
    ids.set(name, id);
    head.push(`  participant ${id} as ${escapeLabel(name)}`);
  }

  const body = messages.map((m) => `  ${ids.get(m.from)}->>${ids.get(m.to)}: ${escapeLabel(m.label)}`);
  return { code: [...head, ...body].join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 5. 甘特图                                                           */
/* ------------------------------------------------------------------ */

type GanttItem =
  | { kind: "section"; name: string }
  | { kind: "task"; name: string; start: string; duration: string; id: string };

export function buildGantt(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const items: GanttItem[] = [];
  const nameToId = new Map<string, string>();
  let counter = 0;

  for (const raw of lines) {
    const line = raw.trim();

    const sMatch = /^(?:section|章节|阶段)\s*:\s*(.+)$/i.exec(line);
    if (sMatch) {
      items.push({ kind: "section", name: sMatch[1].trim() });
      continue;
    }

    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 3) {
      warnings.push(`跳过无法识别的行：${line}（要写成「任务 | 开始 | 工期」）`);
      continue;
    }

    const [name, start, duration] = parts;
    if (!name || !start || !duration) {
      warnings.push(`跳过内容不全的行：${line}`);
      continue;
    }

    counter += 1;
    const id = `t${counter}`;
    if (!nameToId.has(name)) nameToId.set(name, id);
    items.push({ kind: "task", name, start, duration, id });
  }

  if (!items.some((i) => i.kind === "task")) return { code: "", warnings };

  const body: string[] = ["gantt", "  dateFormat YYYY-MM-DD"];

  for (const item of items) {
    if (item.kind === "section") {
      body.push(`  section ${item.name}`);
      continue;
    }

    let start = item.start;
    const afterMatch = /^after\s+(.+)$/i.exec(start);
    if (afterMatch) {
      const refName = afterMatch[1].trim();
      const refId = nameToId.get(refName);
      if (refId) {
        start = `after ${refId}`;
      } else {
        warnings.push(`找不到被引用的任务：${refName}，已忽略这项依赖`);
        start = "";
      }
    }

    if (!start) continue;

    const dur = /^\d+$/.test(item.duration) ? `${item.duration}d` : item.duration;
    body.push(`  ${item.name} :${item.id}, ${start}, ${dur}`);
  }

  return { code: body.join("\n"), warnings };
}

/* ------------------------------------------------------------------ */
/* 6. 饼图                                                             */
/* ------------------------------------------------------------------ */

export function buildPie(text: string): BuildResult {
  const lines = meaningfulLines(normalizePunctuation(text));
  const warnings: string[] = [];
  const items: { label: string; value: string }[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const colon = line.lastIndexOf(":");
    if (colon <= 0) {
      warnings.push(`跳过无法识别的行：${line}（要写成「项目 : 数值」）`);
      continue;
    }
    const label = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!label || !value) {
      warnings.push(`跳过内容不全的行：${line}`);
      continue;
    }
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      warnings.push(`「${label}」的数值不是数字，已跳过`);
      continue;
    }
    items.push({ label, value });
  }

  if (items.length === 0) return { code: "", warnings };

  const body = items.map((i) => `  "${escapeLabel(i.label)}" : ${i.value}`);
  return { code: ["pie showData", ...body].join("\n"), warnings };
}
