"use client";

import "@milkdown/crepe/theme/common/prosemirror.css";
import "@milkdown/crepe/theme/common/reset.css";
import "@milkdown/crepe/theme/common/code-mirror.css";
import "@milkdown/crepe/theme/common/cursor.css";
import "@milkdown/crepe/theme/common/link-tooltip.css";
import "@milkdown/crepe/theme/common/list-item.css";
import "@milkdown/crepe/theme/common/placeholder.css";
import "@milkdown/crepe/theme/common/toolbar.css";
import "@milkdown/crepe/theme/common/table.css";
import type { CrepeBuilder } from "@milkdown/crepe/builder";
import type { CmdKey } from "@milkdown/kit/core";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { remarkWindowsPathSource } from "@/client/modules/markdown/domain/windowsPathSource";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { markdownFormatControls } from "./formatCommands";
import {
  contentUpdateView,
  drivePathLinkTool,
  milkdownAddress,
  previewAddressLinkTool,
  refuseFileUpload,
  windowsPathAddressConfig,
} from "./milkdownAdapter";
import { type FormatAction, MarkdownToolbar } from "./MarkdownToolbar";
import { MermaidDiagramDialog } from "./MermaidDiagramDialog";
import { createMermaidPreview, useEnlargedDiagrams } from "./mermaidPreview";

type Controls = {
  crepe: CrepeBuilder;
  format: (action: FormatAction) => void;
  setHeading: (level: number) => void;
};

type Props = {
  /** 읽기 전용이면 바뀔 때마다 다시 그립니다. 편집 중에는 처음 값만 씁니다. */
  value: string;
  readOnly?: boolean;
  /** markdown 본문의 링크와 그림 주소를 브라우저에서 여는 주소로 바꿉니다. 바꿀 주소가 아니면 그대로 돌려줍니다. */
  openAddress: (url: string) => string;
  /** 편집 영역의 접근 가능한 이름입니다. */
  label?: string;
  placeholder?: string;
  focusOnCreate?: boolean;
  /** 편집 중에 입력과 서식 도구를 잠급니다. 저장하는 동안 입력한 글자가 저장되지 않고 사라지는 것을 막습니다. */
  disabled?: boolean;
  onChange?: (markdown: string) => void;
  /** Ctrl/Cmd+Enter */
  onSubmit?: () => void;
};

/**
 * markdown을 Milkdown Crepe로 보여 주고 고칩니다. 편집할 때는 위에 서식 도구 줄을 둡니다.
 * Crepe는 브라우저에서만 만들 수 있어 mount된 뒤 불러오므로, 처음 그릴 때는 비어 있습니다.
 * Milkdown과 앱 규칙을 잇는 주소 정책과 schema는 milkdownAdapter에, 서식 명령은 formatCommands에 있습니다.
 */
export function MarkdownEditor({
  value,
  readOnly = false,
  openAddress,
  label,
  placeholder,
  focusOnCreate = false,
  disabled = false,
  onChange,
  onSubmit,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labels = useMessages().markdownEditor;
  const [controls, setControls] = useState<Controls | null>(null);
  const [headingLevel, setHeadingLevel] = useState(0);
  const [initialValue] = useState(value);
  const diagrams = useEnlargedDiagrams(rootRef);
  const content = readOnly ? value : initialValue;
  const changed = useEffectEvent((markdown: string) => onChange?.(markdown));
  const cursorMoved = useEffectEvent((level: number) => setHeadingLevel(level));
  const addressOf = useEffectEvent((url: string) => openAddress(url));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let destroy: (() => Promise<unknown>) | undefined;
    let disposed = false;
    const preview = createMermaidPreview(root, {
      loading: labels.previewLoading,
      enlarge: labels.enlargeDiagram,
    });
    void (async () => {
      const [
        { CrepeBuilder },
        { codeMirror },
        { cursor },
        { linkTooltip },
        { listItem },
        { placeholder: placeholderFeature },
        { table },
        { toolbar },
        { languages },
        { codeHighlighting, codeEditorTheme },
        { localFilePreview },
        core,
        { $prose, $remark, callCommand },
        { Plugin },
        commonmark,
        gfm,
      ] = await Promise.all([
        import("@milkdown/crepe/builder"),
        import("@milkdown/crepe/feature/code-mirror"),
        import("@milkdown/crepe/feature/cursor"),
        import("@milkdown/crepe/feature/link-tooltip"),
        import("@milkdown/crepe/feature/list-item"),
        import("@milkdown/crepe/feature/placeholder"),
        import("@milkdown/crepe/feature/table"),
        import("@milkdown/crepe/feature/toolbar"),
        import("@codemirror/language-data"),
        import("./codeHighlighting"),
        import("./localFilePreview"),
        import("@milkdown/kit/core"),
        import("@milkdown/kit/utils"),
        import("@milkdown/kit/prose/state"),
        import("@milkdown/kit/preset/commonmark"),
        import("@milkdown/kit/preset/gfm"),
      ]);
      if (disposed) return;
      // Crepe class는 끈 기능(KaTeX 등)까지 모두 import하므로, 쓰는 기능만 builder에 붙입니다.
      const crepe = new CrepeBuilder({ root, defaultValue: content })
        .addFeature(cursor)
        .addFeature(listItem)
        .addFeature(table)
        .addFeature(placeholderFeature, { text: placeholder ?? "" })
        .addFeature(codeMirror, {
          languages,
          theme: [codeHighlighting, codeEditorTheme],
          renderPreview: preview.renderPreview,
          previewLabel: labels.preview,
          previewLoading: labels.previewLoading,
          previewToggleText: (previewOnly) => (previewOnly ? labels.showCode : labels.hideCode),
        });
      const address = milkdownAddress(commonmark, addressOf);
      if (!readOnly) {
        crepe.addFeature(linkTooltip).addFeature(toolbar, {
          boldLabel: labels.bold,
          italicLabel: labels.italic,
          strikethroughLabel: labels.strikethrough,
          codeLabel: labels.inlineCode,
          linkLabel: labels.link,
        });
        crepe.editor.use([
          $prose(
            (ctx) =>
              new Plugin({
                view: (view) => drivePathLinkTool(view, commonmark.linkSchema.type(ctx)),
              }),
          ),
          $prose(() => new Plugin({ view: (view) => previewAddressLinkTool(view, address) })),
        ]);
      } else {
        // 편집 중에는 원문 보존(keepUnchangedBlocks)에 영향을 주지 않도록 읽기 전용에서만 붙입니다.
        crepe.editor.use(
          $prose((ctx) => localFilePreview(commonmark.linkSchema.type(ctx), address, labels)),
        );
      }
      crepe.editor.config(windowsPathAddressConfig(commonmark, core, address));
      crepe.editor.config((ctx) => {
        ctx.update(core.editorViewOptionsCtx, (options) => ({
          ...options,
          attributes: readOnly
            ? {}
            : () => ({
                role: "textbox",
                "aria-multiline": "true",
                ...(label ? { "aria-label": label } : {}),
                ...(crepe.readonly ? { "aria-readonly": "true" } : {}),
              }),
          ...refuseFileUpload,
        }));
      });
      crepe.editor.use($remark("windowsPathSource", () => remarkWindowsPathSource));
      crepe.setReadonly(readOnly);
      // Crepe의 markdownUpdated는 200ms 늦게 오고 편집기를 닫으면 버려져, 바로 저장하면 마지막 입력이 빠집니다.
      crepe.editor.use(
        $prose(
          (ctx) =>
            new Plugin({
              view: () => ({
                update: contentUpdateView(ctx.get(core.serializerCtx), changed, cursorMoved),
              }),
            }),
        ),
      );
      const created = crepe.create();
      destroy = () => created.then(() => crepe.destroy());
      await created;
      if (disposed) return;
      const view = crepe.editor.ctx.get(core.editorViewCtx);
      if (focusOnCreate) view.focus();
      if (readOnly) return;
      const run = <T,>(command: { key: CmdKey<T> }, payload?: T) => {
        crepe.editor.action(callCommand(command.key, payload));
        view.focus();
      };
      setControls({ crepe, ...markdownFormatControls(commonmark, gfm, run) });
    })();
    return () => {
      disposed = true;
      preview.dispose();
      setControls(null);
      void destroy?.();
    };
  }, [content, readOnly, label, placeholder, focusOnCreate, labels]);

  useEffect(() => {
    controls?.crepe.setReadonly(disabled);
  }, [controls, disabled]);

  return (
    <>
      <div
        className="markdown-editor"
        data-readonly={readOnly || undefined}
        // 코드 블록의 CodeMirror는 Ctrl/Cmd+Enter를 편집기에 넘기지 않으므로, 편집기보다 먼저 받습니다.
        onKeyDownCapture={(event) => {
          if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || !onSubmit) return;
          event.preventDefault();
          event.stopPropagation();
          onSubmit();
        }}
      >
        {controls && (
          <MarkdownToolbar
            label={label ?? ""}
            headingLevel={headingLevel}
            disabled={disabled}
            onHeading={controls.setHeading}
            onFormat={controls.format}
          />
        )}
        <div ref={rootRef} />
      </div>
      {/* 편집기 밖에 두어, dialog 안에서 누른 Ctrl/Cmd+Enter가 위의 onKeyDownCapture에 닿지 않게 합니다. */}
      {diagrams.enlarged && (
        <MermaidDiagramDialog diagram={diagrams.enlarged} onClose={diagrams.close} />
      )}
    </>
  );
}
