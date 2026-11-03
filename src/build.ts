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
  if (def.mode === "template") {
    const code = text.trim();
    return { code, warnings: [] };
  }
  return BUILDERS[def.kind as BuilderKind](text);
}
