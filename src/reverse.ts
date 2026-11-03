import type { DiagramKind } from "./types";

/**
 * 反向编辑：把已经生成的 Mermaid 代码解回结构化输入。
 *
 * 只处理自己生成的那些稳定形态，解不出来就返回 null，
 * 由调用方决定退回原样展示还是保持不动。宁可不解，也不要解错。
 */

export function reverseFor(kind: DiagramKind, code: string): string | null {
  const text = code.trim();
  if (!text) return null;

  switch (kind) {
    case "timeline":
      return reverseTimeline(text);
    case "pie":
      return reversePie(text);
    case "sequence":
      return reverseSequence(text);
    case "mindmap":
      return reverseMindmap(text);
    case "flowchart":
      return reverseFlowchart(text);
    default:
      return null;
  }
}

/** 从代码首行猜出图类型，认不出就返回 null */
export function detectKind(code: string): DiagramKind | null {
  const first = code.trim().split("\n")[0].trim().toLowerCase();
  if (first.startsWith("flowchart")) return "flowchart";
  if (first.startsWith("sequencediagram")) return "sequence";
  if (first.startsWith("pie")) return "pie";
  if (first.startsWith("timeline")) return "timeline";
  if (first.startsWith("mindmap")) return "mindmap";
  if (first.startsWith("gantt")) return "gantt";
  if (first.startsWith("classdiagram")) return "class";
  if (first.startsWith("statediagram")) return "state";
  if (first.startsWith("erdiagram")) return "er";
  if (first.startsWith("journey")) return "journey";
  if (first.startsWith("quadrantchart")) return "quadrant";
  if (first.startsWith("kanban")) return "kanban";
  if (first.startsWith("treemap")) return "treemap";
  if (first.startsWith("radar")) return "radar";
  if (first.startsWith("sankey")) return "sankey";
  if (first.startsWith("xychart")) return "xychart";
  if (first.startsWith("gitgraph")) return "gitgraph";
  if (first.startsWith("c4")) return "c4";
  if (first.startsWith("requirementdiagram")) return "requirement";
  if (first.startsWith("block")) return "block";
  if (first.startsWith("packet")) return "packet";
  if (first.startsWith("architecture")) return "architecture";
  return null;
}

/* ------------------------------------------------------------------ */

function reverseTimeline(code: string): string | null {
  const lines = code.split("\n").map((l) => l.trim());
  if (!lines[0]?.startsWith("timeline")) return null;
  const out: string[] = [];
  let lastTime = "";
  for (const line of lines.slice(1)) {
    if (!line) continue;
    const parts = line.split(":").map((p) => p.trim());
    if (parts.length >= 2 && parts[0]) {
      lastTime = parts[0];
      out.push(`${parts[0]} : ${parts.slice(1).join(" : ")}`);
    } else if (parts.length >= 2 && !parts[0] && lastTime) {
      out.push(`${lastTime} : ${parts.slice(1).join(" : ")}`);
    }
  }
  return out.length ? out.join("\n") : null;
}

function reversePie(code: string): string | null {
  const lines = code.split("\n").map((l) => l.trim());
  if (!lines[0]?.toLowerCase().startsWith("pie")) return null;
  const out: string[] = [];
  for (const line of lines.slice(1)) {
    const m = /^"(.*)"\s*:\s*(\S+)$/.exec(line);
    if (m) out.push(`${m[1]} : ${m[2]}`);
  }
  return out.length ? out.join("\n") : null;
}

function reverseSequence(code: string): string | null {
  const lines = code.split("\n").map((l) => l.trim());
  if (!lines[0]?.startsWith("sequenceDiagram")) return null;

  const names = new Map<string, string>();
  const messages: string[] = [];

  for (const line of lines.slice(1)) {
    const p = /^participant\s+(\w+)\s+as\s+(.+)$/.exec(line);
    if (p) {
      names.set(p[1], p[2]);
      continue;
    }
    const m = /^(\w+)\s*-{1,2}>>?\s*(\w+)\s*:\s*(.+)$/.exec(line);
    if (m) {
      const from = names.get(m[1]) ?? m[1];
      const to = names.get(m[2]) ?? m[2];
      messages.push(`${from} > ${to} : ${m[3]}`);
    }
  }

  if (!messages.length) return null;
  const participants = [...names.values()];
  const head = participants.length ? [`参与者: ${participants.join(", ")}`, ""] : [];
  return [...head, ...messages].join("\n");
}

function reverseMindmap(code: string): string | null {
  const raw = code.split("\n");
  if (!raw[0]?.trim().startsWith("mindmap")) return null;

  const out: string[] = [];
  for (const line of raw.slice(1)) {
    if (!line.trim()) continue;
    const indent = /^[ \t]*/.exec(line)?.[0].replace(/\t/g, "  ").length ?? 0;
    let text = line.trim();
    const root = /^\(\((.*)\)\)$/.exec(text);
    if (root) {
      out.push(root[1]);
      continue;
    }
    out.push(" ".repeat(indent) + text);
  }
  return out.length ? out.join("\n") : null;
}

function reverseFlowchart(code: string): string | null {
  const lines = code.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines[0] || !/^flowchart\s+(TD|TB|LR|RL|BT)$/i.test(lines[0])) return null;

  const labels = new Map<string, { text: string; decision: boolean }>();
  const edges: { from: string; to: string; label: string }[] = [];

  for (const line of lines.slice(1)) {
    const node = /^([A-Za-z][\w]*)\s*([[{])\s*"(.*?)"\s*([\]}])$/.exec(line);
    if (node) {
      labels.set(node[1], { text: node[3], decision: node[2] === "{" });
      continue;
    }
    const edge = /^([A-Za-z][\w]*)\s*-->(?:\|"?(.*?)"?\|)?\s*([A-Za-z][\w]*)$/.exec(line);
    if (edge) {
      edges.push({ from: edge[1], to: edge[3], label: edge[2] ?? "" });
    }
  }

  if (!labels.size) return null;

  const hasParent = new Set(edges.map((e) => e.to));
  const roots = [...labels.keys()].filter((id) => !hasParent.has(id));
  if (!roots.length) return null;

  const childrenOf = new Map<string, { to: string; label: string }[]>();
  for (const e of edges) {
    const list = childrenOf.get(e.from) ?? [];
    list.push({ to: e.to, label: e.label });
    childrenOf.set(e.from, list);
  }

  const out: string[] = [];
  const seen = new Set<string>();

  const walk = (id: string, depth: number, edgeLabel: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const info = labels.get(id);
    if (!info) return;

    const name = info.decision ? `${info.text}{}` : info.text;
    const prefix = edgeLabel ? `${edgeLabel}: ` : "";
    out.push("  ".repeat(depth) + prefix + name);

    for (const child of childrenOf.get(id) ?? []) {
      walk(child.to, depth + 1, child.label);
    }
  };

  for (const root of roots) walk(root, 0, "");
  return out.length ? out.join("\n") : null;
}
