import type { CmdKey } from "@milkdown/kit/core";
import type { FormatAction } from "./MarkdownToolbar";

type Commonmark = typeof import("@milkdown/kit/preset/commonmark");
type Gfm = typeof import("@milkdown/kit/preset/gfm");

/** 서식 동작 하나를 편집기 명령으로 실행하고 커서를 편집기로 되돌립니다. */
type Run = <T>(command: { key: CmdKey<T> }, payload?: T) => void;

/**
 * 편집 도구 줄의 서식 동작과 문단 형식을 편집기 명령표로 엽니다.
 * `setHeading`의 level이 0이면 문단, 1 이상이면 그 수준의 제목으로 바꿉니다.
 */
export function markdownFormatControls(
  commonmark: Commonmark,
  gfm: Gfm,
  run: Run,
): { format: (action: FormatAction) => void; setHeading: (level: number) => void } {
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
  return {
    format: (action) => commands[action](),
    setHeading: (level) =>
      level === 0
        ? run(commonmark.turnIntoTextCommand)
        : run(commonmark.wrapInHeadingCommand, level),
  };
}
