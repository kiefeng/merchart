import {
  buildFlowchart,
  buildGantt,
  buildMindmap,
  buildPie,
  buildSequence,
  buildTimeline,
} from "./generators";
import {
  buildClass,
  buildEr,
  buildJourney,
  buildKanban,
  buildQuadrant,
  buildRadar,
  buildSankey,
  buildState,
  buildTreemap,
  buildXychart,
} from "./generators-ext";
import { repairSyntaxPunctuation } from "./chinese";
import type { BuildResult, DiagramDef, DiagramKind } from "./types";

export type BuilderKind = Exclude<
  DiagramKind,
  "gitgraph" | "c4" | "requirement" | "block" | "packet" | "architecture"
>;

export const BUILDERS: Record<BuilderKind, (text: string) => BuildResult> = {
  flowchart: buildFlowchart,
  mindmap: buildMindmap,
  timeline: buildTimeline,
  sequence: buildSequence,
  class: buildClass,
  state: buildState,
  er: buildEr,
  gantt: buildGantt,
  pie: buildPie,
  quadrant: buildQuadrant,
  journey: buildJourney,
  kanban: buildKanban,
  treemap: buildTreemap,
  radar: buildRadar,
  sankey: buildSankey,
  xychart: buildXychart,
};

export function buildFor(def: DiagramDef, text: string): BuildResult {
  const result = def.mode === "template"
    ? { code: text.trim(), warnings: [] as string[] }
    : BUILDERS[def.kind as BuilderKind](text);

  // 兜底：模板是人手写的，全角标点混进语法位就整张图崩，先换成半角再往下走
  const repaired = repairSyntaxPunctuation(result.code);
  if (repaired.count > 0) {
    result.code = repaired.code;
    result.warnings.push(`把 ${repaired.count} 处全角标点换成了半角，Mermaid 只认半角`);
  }
  return result;
}
