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
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { type FormatAction, MarkdownToolbar } from "./MarkdownToolbar";

type Controls = {
  crepe: CrepeBuilder;
  format: (action: FormatAction) => void;
  setHeading: (level: number) => void;
};

type Props = {
  /** 읽기 전용이면 바뀔 때마다 다시 그립니다. 편집 중에는 처음 값만 씁니다. */
  value: string;
  readOnly?: boolean;
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
 */
export function MarkdownEditor({
  value,
  readOnly = false,
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
  const content = readOnly ? value : initialValue;
  const changed = useEffectEvent((markdown: string) => onChange?.(markdown));
  const cursorMoved = useEffectEvent((level: number) => setHeadingLevel(level));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let destroy: (() => Promise<unknown>) | undefined;
    let disposed = false;
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
        { editorViewCtx, editorViewOptionsCtx, serializerCtx },
        { $prose, callCommand },
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
        .addFeature(codeMirror, { languages });
      if (!readOnly) {
        crepe.addFeature(linkTooltip).addFeature(toolbar, {
          boldLabel: labels.bold,
          italicLabel: labels.italic,
          strikethroughLabel: labels.strikethrough,
          codeLabel: labels.inlineCode,
          linkLabel: labels.link,
        });
      }
      crepe.editor.config((ctx) => {
        ctx.update(editorViewOptionsCtx, (options) => ({
          ...options,
          attributes: readOnly
            ? {}
            : () => ({
                role: "textbox",
                "aria-multiline": "true",
                ...(label ? { "aria-label": label } : {}),
                ...(crepe.readonly ? { "aria-readonly": "true" } : {}),
              }),
          // 이미지 파일을 올릴 곳이 없습니다. Milkdown upload plugin은 blob: 주소를 본문에 넣어 새로고침하면 깨지므로,
          // 그 plugin이 처리할 붙여 넣기와 끌어 놓기를 먼저 받아 버립니다.
          handlePaste: (_view, event) =>
            Boolean(event.clipboardData?.files.length) &&
            !event.clipboardData?.getData("text/html"),
          handleDrop: (_view, event) => Boolean(event.dataTransfer?.files.length),
        }));
      });
      crepe.setReadonly(readOnly);
      // Crepe의 markdownUpdated는 200ms 늦게 오고 편집기를 닫으면 버려져, 바로 저장하면 마지막 입력이 빠집니다.
      crepe.editor.use(
        $prose(
          (ctx) =>
            new Plugin({
              view: () => ({
                update: (view, previous) => {
                  const block = view.state.selection.$from.parent;
                  cursorMoved(block.type.name === "heading" ? Number(block.attrs.level) : 0);
                  if (view.state.doc.eq(previous.doc)) return;
                  // 직렬화 결과 끝에 붙는 줄바꿈은 빼고, textarea로 입력하던 때처럼 입력한 글자만 넘깁니다.
                  changed(ctx.get(serializerCtx)(view.state.doc).replace(/\n$/, ""));
                },
              }),
            }),
        ),
      );
      const created = crepe.create();
      destroy = () => created.then(() => crepe.destroy());
      await created;
      if (disposed) return;
      const view = crepe.editor.ctx.get(editorViewCtx);
      if (focusOnCreate) view.focus();
      if (readOnly) return;
      const run = <T,>(command: { key: CmdKey<T> }, payload?: T) => {
        crepe.editor.action(callCommand(command.key, payload));
        view.focus();
      };
      const commands: Record<FormatAction, () => void> = {
        bold: () => run(commonmark.toggleStrongCommand),
        italic: () => run(commonmark.toggleEmphasisCommand),
        strikethrough: () => run(gfm.toggleStrikethroughCommand),
        inlineCode: () => run(commonmark.toggleInlineCodeCommand),
        bulletList: () => run(commonmark.wrapInBulletListCommand),
        orderedList: () => run(commonmark.wrapInOrderedListCommand),
        quote: () => run(commonmark.wrapInBlockquoteCommand),
        codeBlock: () => run(commonmark.createCodeBlockCommand),
        table: () => run(gfm.insertTableCommand, { row: 3, col: 3 }),
        divider: () => run(commonmark.insertHrCommand),
      };
      setControls({
        crepe,
        format: (action) => commands[action](),
        setHeading: (level) =>
          level === 0
            ? run(commonmark.turnIntoTextCommand)
            : run(commonmark.wrapInHeadingCommand, level),
      });
    })();
    return () => {
      disposed = true;
      setControls(null);
      void destroy?.();
    };
  }, [content, readOnly, label, placeholder, focusOnCreate, labels]);

  useEffect(() => {
    controls?.crepe.setReadonly(disabled);
  }, [controls, disabled]);

  return (
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
  );
}
