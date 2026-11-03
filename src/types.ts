export type DiagramKind =
  | "flowchart"
  | "mindmap"
  | "timeline"
  | "sequence"
  | "gantt"
  | "pie"
  | "class"
  | "state"
  | "er"
  | "journey"
  | "quadrant"
  | "kanban"
  | "treemap"
  | "radar"
  | "sankey"
  | "xychart"
  | "gitgraph"
  | "c4"
  | "requirement"
  | "block"
  | "packet"
  | "architecture";

/** builder：按中文输入解析生成；template：直接把输入当代码，给一份可改的模板 */
export type DiagramMode = "builder" | "template";

export interface DiagramDef {
  kind: DiagramKind;
  nameZh: string;
  nameEn: string;
  /** 搜索用的别名词，全小写 */
  aliases: string[];
  /** 一句话说明，显示在选择器里 */
  hint: string;
  hintEn: string;
  /** 输入框里的灰色示例 */
  placeholder: string;
  /** 输入区下方的语法提示，逐条显示 */
  rules: string[];
  rulesEn: string[];
  mode: DiagramMode;
}

export interface BuildResult {
  code: string;
  /** 解析中跳过的行，用于提示 */
  warnings: string[];
}

/** 大纲树节点，流程图和思维导图共用 */
export interface OutlineNode {
  text: string;
  /** 连线标签，例如「是: 启动筛查」里的「是」 */
  edgeLabel: string;
  /** true 表示该节点画成菱形判断 */
  decision: boolean;
  depth: number;
  children: OutlineNode[];
}
