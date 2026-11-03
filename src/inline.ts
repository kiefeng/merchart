import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { MarkdownView, setIcon } from "obsidian";
import type MerchartPlugin from "./main";
import { detectKind } from "./reverse";
import type { DiagramKind } from "./types";

const FENCE_OPEN = /^\s*```\s*mermaid\s*$/i;
const FENCE_CLOSE = /^\s*```\s*$/;

/**
 * 光标停在 mermaid 块里时，在开头围栏行右侧挂一个编辑按钮。
 *
 * 用 ViewPlugin 而不是注册事件：块的位置随编辑变化，装饰每帧重算最省心。
 * 只在光标进入块内时出现，不干扰阅读；出了块就消失。
 */
class EditButton extends WidgetType {
  constructor(
    private plugin: MerchartPlugin,
    private line: number,
    private kind: DiagramKind | null
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const btn = createSpan({ cls: "mc-inline-edit" });
    setIcon(btn, "pencil");
    btn.setAttribute("aria-label", this.plugin.t.commandEditHere);
    btn.addEventListener("mousedown", (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.plugin.editAtLine(this.line, this.kind ?? undefined);
    });
    return btn;
  }

  eq(other: EditButton): boolean {
    return other.line === this.line && other.kind === this.kind;
  }
}

export function inlineEditExtension(plugin: MerchartPlugin) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = build(view, plugin);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = build(update.view, plugin);
        }
      }
    },
    {
      decorations: (value) => value.decorations,
    }
  );
}

function build(view: EditorView, plugin: MerchartPlugin): DecorationSet {
  const doc = view.state.doc;
  const head = view.state.selection.main.head;
  const widgets: Range<Decoration>[] = [];

  let openLine = 0;
  for (let i = 1; i <= doc.lines; i += 1) {
    const line = doc.line(i);

    if (openLine === 0 && FENCE_OPEN.test(line.text)) {
      openLine = i;
      continue;
    }

    if (openLine > 0 && FENCE_CLOSE.test(line.text)) {
      const blockFrom = doc.line(openLine).from;
      if (head >= blockFrom && head <= line.to) {
        const firstContent = openLine + 1 <= doc.lines ? doc.line(openLine + 1).text : "";
        widgets.push(
          Decoration.widget({
            widget: new EditButton(plugin, openLine, detectKind(firstContent)),
            side: 1,
          }).range(doc.line(openLine).to)
        );
      }
      openLine = 0;
    }
  }

  return Decoration.set(widgets, true);
}

/** 供命令复用：光标已在块内就直接开弹窗，不在就什么都不做 */
export function isInsideMermaid(view: EditorView): boolean {
  const doc = view.state.doc;
  const head = view.state.selection.main.head;
  let openLine = 0;
  for (let i = 1; i <= doc.lines; i += 1) {
    const line = doc.line(i);
    if (openLine === 0 && FENCE_OPEN.test(line.text)) {
      openLine = i;
      continue;
    }
    if (openLine > 0 && FENCE_CLOSE.test(line.text)) {
      if (head >= doc.line(openLine).from && head <= line.to) return true;
      openLine = 0;
    }
  }
  return false;
}

export function activeMarkdownEditor(plugin: MerchartPlugin): MarkdownView | null {
  return plugin.app.workspace.getActiveViewOfType(MarkdownView);
}
