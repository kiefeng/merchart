import type { DiagramDef } from "./types";

export type Lang = "zh" | "en";

/** Obsidian 的界面语言存在 localStorage 的 language 键里，没设过就看系统语言 */
export function currentLang(): Lang {
  let raw = "";
  try {
    raw = window.localStorage.getItem("language") ?? "";
  } catch {
    raw = "";
  }
  if (!raw) raw = navigator.language ?? "";
  return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export interface UiStrings {
  searchPlaceholder: string;
  noMatch: string;
  previewEmpty: string;
  previewLabel: string;
  syntaxHelp: string;
  refresh: string;
  cancel: string;
  insert: string;
  nothingToInsert: string;
  commandInsert: string;
  commandInsertKind: (name: string) => string;
  settingsTitle: string;
  defaultKind: string;
  defaultKindDesc: string;
  rememberLast: string;
  indentSize: string;
  indentSizeDesc: string;
  closeAfterInsert: string;
  closeAfterInsertDesc: string;
  autoBlankLine: string;
  autoBlankLineDesc: string;
  livePreview: string;
  livePreviewDesc: string;
  spaces: (n: number) => string;
  resizeHint: string;
  renderFailed: string;
}

const ZH: UiStrings = {
  searchPlaceholder: "搜索图类型",
  noMatch: "没有匹配的类型",
  previewEmpty: "填点内容，这里会实时显示图",
  previewLabel: "预览",
  syntaxHelp: "语法提示",
  refresh: "刷新",
  cancel: "取消",
  insert: "插入图",
  nothingToInsert: "还没有可以插入的内容",
  commandInsert: "插入图",
  commandInsertKind: (name) => `插入${name}`,
  settingsTitle: "Merchart 设置",
  defaultKind: "打开时默认选中",
  defaultKindDesc: "记住上次：跟着你最近画的那类走。也可以钉死某一种。",
  rememberLast: "记住上次",
  indentSize: "缩进宽度",
  indentSizeDesc: "输入框里按 Tab 时插入几个空格。",
  closeAfterInsert: "插入后关闭弹窗",
  closeAfterInsertDesc: "关掉后插入完留在弹窗里，可以接着画下一张。",
  autoBlankLine: "插入时自动补空行",
  autoBlankLineDesc: "光标贴着正文时，自动在代码块前后留出空行。",
  livePreview: "实时预览",
  livePreviewDesc: "关掉后停止边打字边重画，图很复杂时更顺。手动点刷新才更新。",
  spaces: (n) => `${n} 个空格`,
  resizeHint: "拖动调整大小",
  renderFailed: "渲染失败，检查一下语法",
};

const EN: UiStrings = {
  searchPlaceholder: "Search diagram types",
  noMatch: "No matching type",
  previewEmpty: "Start typing, the diagram shows up here",
  previewLabel: "Preview",
  syntaxHelp: "Syntax help",
  refresh: "Refresh",
  cancel: "Cancel",
  insert: "Insert diagram",
  nothingToInsert: "Nothing to insert yet",
  commandInsert: "Insert diagram",
  commandInsertKind: (name) => `Insert ${name}`,
  settingsTitle: "Merchart settings",
  defaultKind: "Default diagram on open",
  defaultKindDesc: "Remember last follows whatever you drew most recently.",
  rememberLast: "Remember last",
  indentSize: "Indent width",
  indentSizeDesc: "Spaces inserted when you press Tab in the input box.",
  closeAfterInsert: "Close after inserting",
  closeAfterInsertDesc: "Turn off to keep the dialog open and draw the next one.",
  autoBlankLine: "Add blank lines around the block",
  autoBlankLineDesc: "Keeps the code block from sticking to surrounding text.",
  livePreview: "Live preview",
  livePreviewDesc: "Turn off to stop redrawing while you type. Refresh manually instead.",
  spaces: (n) => `${n} spaces`,
  resizeHint: "Drag to resize",
  renderFailed: "Render failed. Check the syntax.",
};

export function ui(lang: Lang): UiStrings {
  return lang === "zh" ? ZH : EN;
}

export function displayName(def: DiagramDef, lang: Lang): string {
  return lang === "zh" ? def.nameZh : def.nameEn;
}

export function displayHint(def: DiagramDef, lang: Lang): string {
  return lang === "zh" ? def.hint : def.hintEn;
}

export function displayRules(def: DiagramDef, lang: Lang): string[] {
  return lang === "zh" ? def.rules : def.rulesEn;
}
