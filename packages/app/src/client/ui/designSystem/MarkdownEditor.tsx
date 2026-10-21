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
import { documentWorkspace } from "@/client/infra/workspaces/documentWorkspace";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import { type FormatAction, MarkdownToolbar } from "./MarkdownToolbar";
import { localMarkdownUrl } from "./localMarkdownUrl";
import { MermaidDiagramDialog } from "./MermaidDiagramDialog";
import { createMermaidPreview, diagramAt } from "./mermaidPreview";
import {
  remarkWindowsPathSource,
  sourceUrlOf,
  windowsPath,
  windowsPathHandlers,
} from "./windowsPathSource";

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
  const [enlarged, setEnlarged] = useState<HTMLElement | null>(null);
  const [initialValue] = useState(value);
  const content = readOnly ? value : initialValue;
  const changed = useEffectEvent((markdown: string) => onChange?.(markdown));
  const cursorMoved = useEffectEvent((level: number) => setHeadingLevel(level));

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
        { editorViewCtx, editorViewOptionsCtx, remarkStringifyOptionsCtx, serializerCtx },
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
      if (!readOnly) {
        crepe.addFeature(linkTooltip).addFeature(toolbar, {
          boldLabel: labels.bold,
          italicLabel: labels.italic,
          strikethroughLabel: labels.strikethrough,
          codeLabel: labels.inlineCode,
          linkLabel: labels.link,
        });
      }
      // link와 image의 sourceUrl은 remarkWindowsPathSource가 남긴 원문 주소로, 경로를 되살리고 저장할 markdown에 원문
      // 주소를 쓸 때만 쓰고 HTML 속성으로는 내보내지 않습니다(null인 속성은 DOM에 붙지 않습니다).
      // 아래 parseMarkdown과 toMarkdown runner는 Milkdown 기본 runner에 sourceUrl만 더한 것이므로, Milkdown을 올리면
      // 기본 runner와 비교합니다.
      const sourceUrl = { default: null, validate: "string|null" };
      crepe.editor.config((ctx) => {
        ctx.update(commonmark.linkSchema.key, (previous) => (schemaCtx) => {
          const schema = previous(schemaCtx);
          return {
            ...schema,
            attrs: { ...schema.attrs, sourceUrl },
            parseMarkdown: {
              ...schema.parseMarkdown,
              runner: (state, node, markType) => {
                state.openMark(markType, {
                  href: node.url,
                  title: node.title,
                  sourceUrl: sourceUrlOf(node),
                });
                state.next(node.children);
                state.closeMark(markType);
              },
            },
            toDOM: (mark) => {
              const dom = schema.toDOM!(mark, false) as [string, Record<string, unknown>];
              // Milkdown은 http, https, mailto 같은 허용 scheme 밖의 href를 비웁니다. `C:/a.md`처럼 드라이브 문자가
              // scheme으로 읽히는 Windows 경로도 비워지므로, 앱 안 주소로 바뀌는 href는 원래 값에서 바꾸고
              // 바뀌지 않는 href만 Milkdown이 거른 값을 씁니다.
              const original = windowsPath(String(mark.attrs.href), mark.attrs.sourceUrl);
              const opened = localMarkdownUrl(original, documentWorkspace() ?? "");
              const href = opened === original ? dom[1].href : opened;
              return [dom[0], { ...dom[1], href, sourceUrl: null }];
            },
            toMarkdown: {
              ...schema.toMarkdown,
              runner: (state, mark) => {
                state.withMark(mark, "link", undefined, {
                  title: mark.attrs.title,
                  url: mark.attrs.href,
                  data: { sourceUrl: mark.attrs.sourceUrl },
                });
              },
            },
          };
        });
        ctx.update(commonmark.imageSchema.key, (previous) => (schemaCtx) => {
          const schema = previous(schemaCtx);
          return {
            ...schema,
            attrs: { ...schema.attrs, sourceUrl },
            parseMarkdown: {
              ...schema.parseMarkdown,
              runner: (state, node, type) => {
                state.addNode(type, {
                  src: node.url,
                  alt: node.alt ?? "",
                  title: node.title ?? "",
                  sourceUrl: sourceUrlOf(node),
                });
              },
            },
            toDOM: (node) => {
              const src = windowsPath(node.attrs.src, node.attrs.sourceUrl);
              return [
                "img",
                {
                  ...node.attrs,
                  src: localMarkdownUrl(src, documentWorkspace() ?? ""),
                  sourceUrl: null,
                },
              ];
            },
            toMarkdown: {
              ...schema.toMarkdown,
              runner: (state, node) => {
                state.addNode("image", undefined, undefined, {
                  title: node.attrs.title,
                  url: node.attrs.src,
                  alt: node.attrs.alt,
                  data: { sourceUrl: node.attrs.sourceUrl },
                });
              },
            },
          };
        });
        ctx.update(remarkStringifyOptionsCtx, (options) => ({
          ...options,
          handlers: { ...options.handlers, ...windowsPathHandlers },
        }));
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
      crepe.editor.use($remark("windowsPathSource", () => remarkWindowsPathSource));
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
      preview.dispose();
      setControls(null);
      void destroy?.();
    };
  }, [content, readOnly, label, placeholder, focusOnCreate, labels]);

  useEffect(() => {
    controls?.crepe.setReadonly(disabled);
  }, [controls, disabled]);

  // 그림은 Crepe가 sanitize해서 넣는 HTML이라 처리기를 붙일 수 없으므로, 그림을 누르는 동작을 편집기 root에서 받습니다.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const diagram = diagramAt(event.target);
      if (diagram) setEnlarged(diagram);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const diagram = diagramAt(event.target);
      if (!diagram || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      setEnlarged(diagram);
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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
      {enlarged && <MermaidDiagramDialog diagram={enlarged} onClose={() => setEnlarged(null)} />}
    </>
  );
}
