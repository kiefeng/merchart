import {
  App,
  Component,
  Editor,
  MarkdownRenderer,
  Modal,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  setIcon,
} from "obsidian";
import { DIAGRAMS } from "./diagrams";
import { buildFor } from "./build";
import {
  currentLang,
  displayHint,
  displayName,
  displayRules,
  ui,
  type Lang,
  type UiStrings,
} from "./i18n";
import type { BuildResult, DiagramDef, DiagramKind } from "./types";

interface MerchartSettings {
  /** "remember" 表示跟随上次使用的类型 */
  defaultKind: DiagramKind | "remember";
  indentSize: number;
  closeAfterInsert: boolean;
  autoBlankLine: boolean;
  livePreview: boolean;
  /** 上次拖拽后的弹窗尺寸（相对视口的比例），换屏幕也能用。未拖过则用默认值 */
  modalWidthRatio?: number;
  modalHeightRatio?: number;
  lastKind?: DiagramKind;
}

const DEFAULT_SETTINGS: MerchartSettings = {
  defaultKind: "remember",
  indentSize: 2,
  closeAfterInsert: true,
  autoBlankLine: true,
  livePreview: true,
};

export default class MerchartPlugin extends Plugin {
  settings: MerchartSettings = { ...DEFAULT_SETTINGS };
  lang: Lang = currentLang();
  t: UiStrings = ui(this.lang);

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "insert-diagram",
      name: this.t.commandInsert,
      editorCallback: (editor: Editor) => this.openModal(editor),
    });

    for (const def of DIAGRAMS) {
      this.addCommand({
        id: `insert-${def.kind}`,
        name: this.t.commandInsertKind(displayName(def, this.lang)),
        editorCallback: (editor: Editor) => this.openModal(editor, def.kind),
      });
    }

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor: Editor) => {
        menu.addItem((item) =>
          item.setTitle(this.t.commandInsert).setIcon("shapes").onClick(() => this.openModal(editor))
        );
      })
    );

    this.addSettingTab(new MerchartSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<MerchartSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  openModal(editor: Editor, kind?: DiagramKind): void {
    new DiagramModal(this.app, editor, this, kind).open();
  }

  async remember(kind: DiagramKind): Promise<void> {
    if (this.settings.lastKind === kind) return;
    this.settings.lastKind = kind;
    await this.saveSettings();
  }

  initialKind(preferred?: DiagramKind): DiagramKind {
    if (preferred) return preferred;
    if (this.settings.defaultKind !== "remember") return this.settings.defaultKind;
    const saved = this.settings.lastKind;
    if (saved && DIAGRAMS.some((d) => d.kind === saved)) return saved;
    return DIAGRAMS[0].kind;
  }
}

/* ------------------------------------------------------------------ */
/* 设置页                                                              */
/* ------------------------------------------------------------------ */

class MerchartSettingTab extends PluginSettingTab {
  plugin: MerchartPlugin;

  constructor(app: App, plugin: MerchartPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const t = this.plugin.t;
    const lang = this.plugin.lang;
    containerEl.empty();

    containerEl.createEl("h2", { text: t.settingsTitle });

    new Setting(containerEl)
      .setName(t.defaultKind)
      .setDesc(t.defaultKindDesc)
      .addDropdown((dd) => {
        dd.addOption("remember", t.rememberLast);
        for (const d of DIAGRAMS) dd.addOption(d.kind, displayName(d, lang));
        dd.setValue(this.plugin.settings.defaultKind);
        dd.onChange(async (value) => {
          this.plugin.settings.defaultKind = value as DiagramKind | "remember";
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t.indentSize)
      .setDesc(t.indentSizeDesc)
      .addDropdown((dd) => {
        dd.addOption("2", t.spaces(2));
        dd.addOption("4", t.spaces(4));
        dd.setValue(String(this.plugin.settings.indentSize));
        dd.onChange(async (value) => {
          this.plugin.settings.indentSize = Number(value);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t.closeAfterInsert)
      .setDesc(t.closeAfterInsertDesc)
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.closeAfterInsert).onChange(async (value) => {
          this.plugin.settings.closeAfterInsert = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t.autoBlankLine)
      .setDesc(t.autoBlankLineDesc)
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.autoBlankLine).onChange(async (value) => {
          this.plugin.settings.autoBlankLine = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t.livePreview)
      .setDesc(t.livePreviewDesc)
      .addToggle((tg) =>
        tg.setValue(this.plugin.settings.livePreview).onChange(async (value) => {
          this.plugin.settings.livePreview = value;
          await this.plugin.saveSettings();
        })
      );
  }
}

/* ------------------------------------------------------------------ */
/* 主弹窗                                                              */
/* ------------------------------------------------------------------ */

class DiagramModal extends Modal {
  private editor: Editor;
  private plugin: MerchartPlugin;
  private preferred?: DiagramKind;

  private current: DiagramDef = DIAGRAMS[0];
  private result: BuildResult = { code: "", warnings: [] };
  private timer: number | null = null;
  private component = new Component();

  private listEl!: HTMLElement;
  private searchEl!: HTMLInputElement;
  private diagramTitleEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private rulesEl!: HTMLElement;
  private previewEl!: HTMLElement;
  private warnEl!: HTMLElement;
  private insertBtn!: HTMLButtonElement;
  private refreshBtn!: HTMLButtonElement;

  constructor(app: App, editor: Editor, plugin: MerchartPlugin, preferred?: DiagramKind) {
    super(app);
    this.editor = editor;
    this.plugin = plugin;
    this.preferred = preferred;
  }

  private get t(): UiStrings {
    return this.plugin.t;
  }

  private get lang(): Lang {
    return this.plugin.lang;
  }

  private get indent(): string {
    return " ".repeat(this.plugin.settings.indentSize);
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("mc-modal");
    contentEl.empty();
    this.component.load();

    const ratioW = this.plugin.settings.modalWidthRatio;
    const ratioH = this.plugin.settings.modalHeightRatio;
    if (ratioW && ratioW > 0.2 && ratioW <= 1) {
      modalEl.style.width = `${Math.round(window.innerWidth * ratioW)}px`;
    }
    if (ratioH && ratioH > 0.2 && ratioH <= 1) {
      modalEl.style.height = `${Math.round(window.innerHeight * ratioH)}px`;
    }

    const root = contentEl.createDiv({ cls: "mc-root" });

    /* 左侧：类型列表 */
    const side = root.createDiv({ cls: "mc-side" });
    const searchWrap = side.createDiv({ cls: "mc-search" });
    setIcon(searchWrap.createSpan({ cls: "mc-search-icon" }), "search");
    this.searchEl = searchWrap.createEl("input", {
      cls: "mc-search-input",
      attr: { type: "text", placeholder: this.t.searchPlaceholder },
    });
    this.listEl = side.createDiv({ cls: "mc-list" });

    this.searchEl.addEventListener("input", () => this.renderList());
    this.searchEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        this.listEl.querySelector<HTMLElement>(".mc-item")?.click();
      }
    });

    /* 右侧：输入与预览 */
    const main = root.createDiv({ cls: "mc-main" });
    const head = main.createDiv({ cls: "mc-head" });
    this.diagramTitleEl = head.createDiv({ cls: "mc-title" });
    this.hintEl = head.createDiv({ cls: "mc-hint" });

    this.inputEl = main.createEl("textarea", {
      cls: "mc-input",
      attr: { spellcheck: "false" },
    });
    this.inputEl.addEventListener("input", () => {
      this.autoSizeInput();
      if (this.plugin.settings.livePreview) this.scheduleBuild();
    });
    this.inputEl.addEventListener("keydown", (evt) => this.onInputKeydown(evt));

    const rulesBox = main.createEl("details", { cls: "mc-rules" });
    rulesBox.createEl("summary", { cls: "mc-rules-summary", text: this.t.syntaxHelp });
    this.rulesEl = rulesBox.createDiv({ cls: "mc-rules-body" });

    const preview = main.createDiv({ cls: "mc-preview" });
    const previewHead = preview.createDiv({ cls: "mc-preview-head" });
    previewHead.createDiv({ cls: "mc-preview-label", text: this.t.previewLabel });
    this.refreshBtn = previewHead.createEl("button", {
      cls: "mc-refresh",
      text: this.t.refresh,
    });
    this.refreshBtn.addEventListener("click", () => void this.build());
    this.refreshBtn.toggleAttribute("hidden", this.plugin.settings.livePreview);
    this.previewEl = preview.createDiv({ cls: "mc-preview-body" });

    /* 底部 */
    const foot = root.createDiv({ cls: "mc-foot" });
    this.warnEl = foot.createDiv({ cls: "mc-warn" });
    const actions = foot.createDiv({ cls: "mc-actions" });

    const cancel = actions.createEl("button", { text: this.t.cancel, cls: "mc-btn" });
    cancel.addEventListener("click", () => this.close());

    this.insertBtn = actions.createEl("button", { cls: "mc-btn mc-btn-primary" });
    setIcon(this.insertBtn.createSpan({ cls: "mc-btn-icon" }), "arrow-down-to-line");
    this.insertBtn.createSpan({ text: this.t.insert });
    this.insertBtn.createSpan({
      cls: "mc-kbd",
      text: Platform.isMacOS ? "⌘↵" : "Ctrl+↵",
    });
    this.insertBtn.addEventListener("click", () => this.insert());

    this.scope.register(["Mod"], "Enter", (evt) => {
      evt.preventDefault();
      this.insert();
      return false;
    });

    this.renderList();
    const startKind = this.plugin.initialKind(this.preferred);
    this.select(DIAGRAMS.find((d) => d.kind === startKind) ?? DIAGRAMS[0], false);
    this.attachResizer(modalEl);
    window.setTimeout(() => this.inputEl.focus(), 30);
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.component.unload();
  }

  /** 右下角拖拽调节弹窗大小，尺寸按视口比例记下来，换屏幕也合适 */
  private attachResizer(modalEl: HTMLElement): void {
    const handle = this.contentEl.createDiv({ cls: "mc-resizer" });
    handle.setAttribute("aria-label", this.t.resizeHint);

    handle.addEventListener("mousedown", (evt: MouseEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const rect = modalEl.getBoundingClientRect();
      const startX = evt.clientX;
      const startY = evt.clientY;
      const startW = rect.width;
      const startH = rect.height;

      const onMove = (e: MouseEvent): void => {
        const maxW = window.innerWidth - 48;
        const maxH = window.innerHeight - 48;
        const w = Math.min(Math.max(520, startW + (e.clientX - startX)), maxW);
        const h = Math.min(Math.max(360, startH + (e.clientY - startY)), maxH);
        modalEl.style.width = `${Math.round(w)}px`;
        modalEl.style.height = `${Math.round(h)}px`;
      };

      const onUp = (): void => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.removeClass("mc-resizing");
        const next = modalEl.getBoundingClientRect();
        this.plugin.settings.modalWidthRatio = next.width / window.innerWidth;
        this.plugin.settings.modalHeightRatio = next.height / window.innerHeight;
        void this.plugin.saveSettings();
      };

      document.body.addClass("mc-resizing");
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  /* ---------------- 输入框键盘 ---------------- */

  private onInputKeydown(evt: KeyboardEvent): void {
    if (evt.key === "Enter" && (evt.ctrlKey || evt.metaKey)) {
      evt.preventDefault();
      this.insert();
      return;
    }
    if (evt.key === "Tab") {
      evt.preventDefault();
      this.indentBlock(!evt.shiftKey);
    }
  }

  /** 输入框随内容长，最多占弹窗高度的 42%，超过就自己滚 */
  private autoSizeInput(): void {
    const el = this.inputEl;
    if (!el) return;
    el.style.height = "auto";
    const modalH = this.modalEl.getBoundingClientRect().height || window.innerHeight * 0.6;
    const max = Math.max(96, Math.round(modalH * 0.42));
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  private indentBlock(forward: boolean): void {
    const el = this.inputEl;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const unit = this.indent;

    if (start === end && forward) {
      el.value = value.slice(0, start) + unit + value.slice(end);
      el.selectionStart = el.selectionEnd = start + unit.length;
      this.scheduleBuild(0);
      return;
    }

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const blockEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, blockEnd);

    const lines = block.split("\n").map((line) => {
      if (forward) return unit + line;
      if (line.startsWith(unit)) return line.slice(unit.length);
      if (line.startsWith("\t")) return line.slice(1);
      return line.replace(/^ +/, "");
    });

    const next = lines.join("\n");
    el.value = value.slice(0, lineStart) + next + value.slice(blockEnd);
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + next.length;
    this.scheduleBuild(0);
  }

  /* ---------------- 类型列表 ---------------- */

  private renderList(): void {
    const q = this.searchEl.value.trim().toLowerCase();
    this.listEl.empty();

    const matches = DIAGRAMS.filter((d) => {
      if (!q) return true;
      return (
        d.nameZh.toLowerCase().includes(q) ||
        d.nameEn.toLowerCase().includes(q) ||
        d.aliases.some((a) => a.includes(q))
      );
    });

    if (matches.length === 0) {
      this.listEl.createDiv({ cls: "mc-empty", text: this.t.noMatch });
      return;
    }

    for (const d of matches) {
      const item = this.listEl.createDiv({ cls: "mc-item" });
      if (d.kind === this.current.kind) item.addClass("is-active");
      item.createDiv({ cls: "mc-item-name", text: displayName(d, this.lang) });
      item.createDiv({
        cls: "mc-item-en",
        text: this.lang === "zh" ? d.nameEn : d.nameZh,
      });
      item.addEventListener("click", () => this.select(d, true));
    }
  }

  private select(def: DiagramDef, remember: boolean): void {
    this.current = def;
    this.diagramTitleEl.setText(displayName(def, this.lang));
    this.hintEl.setText(displayHint(def, this.lang));
    this.inputEl.value = def.placeholder;
    this.inputEl.placeholder = def.placeholder;

    this.rulesEl.empty();
    for (const rule of displayRules(def, this.lang)) {
      this.rulesEl.createDiv({ cls: "mc-rule", text: rule });
    }
    this.autoSizeInput();

    this.listEl.querySelectorAll(".mc-item").forEach((el) => el.removeClass("is-active"));
    for (const el of Array.from(this.listEl.querySelectorAll<HTMLElement>(".mc-item"))) {
      if (el.querySelector(".mc-item-name")?.textContent === displayName(def, this.lang)) {
        el.addClass("is-active");
      }
    }

    if (remember) void this.plugin.remember(def.kind);

    this.scheduleBuild(0);
    this.inputEl.focus();
  }

  /* ---------------- 生成与预览 ---------------- */

  private scheduleBuild(delay = 200): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.build(), delay);
  }

  private async build(): Promise<void> {
    const result = buildFor(this.current, this.inputEl.value);
    this.result = result;
    this.warnEl.setText(result.warnings.join(this.lang === "zh" ? "；" : "; "));

    if (!result.code) {
      this.previewEl.empty();
      this.previewEl.createDiv({ cls: "mc-preview-empty", text: this.t.previewEmpty });
      this.insertBtn.disabled = true;
      return;
    }

    this.insertBtn.disabled = false;
    this.previewEl.empty();
    const fence = "```mermaid\n" + result.code + "\n```";
    try {
      await MarkdownRenderer.render(this.app, fence, this.previewEl, "", this.component);
    } catch (error) {
      this.previewEl.empty();
      this.previewEl.createDiv({ cls: "mc-preview-error", text: this.t.renderFailed });
      console.error("[Merchart] failed to render preview", error);
    }
  }

  /* ---------------- 插入 ---------------- */

  private insert(): void {
    if (!this.result.code) {
      new Notice(this.t.nothingToInsert);
      return;
    }

    void this.plugin.remember(this.current.kind);

    const block = "```mermaid\n" + this.result.code + "\n```";
    const cursor = this.editor.getCursor();
    const before = this.editor.getRange({ line: 0, ch: 0 }, cursor);
    const openIndex = before.lastIndexOf("```mermaid");

    if (openIndex >= 0) {
      const tail = before.slice(openIndex);
      const fenceCount = (tail.match(/```/g) ?? []).length;
      if (fenceCount === 1) {
        const lineEnd = { line: cursor.line, ch: this.editor.getLine(cursor.line).length };
        this.editor.replaceRange("\n" + this.result.code, lineEnd);
        if (this.plugin.settings.closeAfterInsert) this.close();
        return;
      }
    }

    let text = block;
    if (this.plugin.settings.autoBlankLine) {
      const lineText = this.editor.getLine(cursor.line);
      const needsLeading = lineText.slice(0, cursor.ch).trim().length > 0;
      const needsTrailing = lineText.slice(cursor.ch).trim().length > 0;
      text = (needsLeading ? "\n" : "") + block + (needsTrailing ? "\n" : "");
    }

    this.editor.replaceRange(text, cursor);
    if (this.plugin.settings.closeAfterInsert) this.close();
  }
}
