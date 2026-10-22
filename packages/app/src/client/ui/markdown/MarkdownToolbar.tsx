import { Fragment, type ComponentType, type SVGProps } from "react";
import { useMessages } from "@/client/ui/locale/LocaleProvider";
import {
  BoldIcon,
  BulletListIcon,
  CodeBlockIcon,
  CodeIcon,
  DividerIcon,
  ItalicIcon,
  OrderedListIcon,
  QuoteIcon,
  StrikethroughIcon,
  TableIcon,
} from "../designSystem/icons";

export type FormatAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inlineCode"
  | "bulletList"
  | "orderedList"
  | "quote"
  | "codeBlock"
  | "table"
  | "divider";

type Props = {
  /** 도구 줄이 다루는 편집기의 이름입니다. */
  label: string;
  /** 커서가 있는 블록의 제목 수준입니다. 0이면 본문입니다. */
  headingLevel: number;
  disabled: boolean;
  onHeading: (level: number) => void;
  onFormat: (action: FormatAction) => void;
};

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

const BUTTON_GROUPS: { action: FormatAction; Icon: ComponentType<SVGProps<SVGSVGElement>> }[][] = [
  [
    { action: "bold", Icon: BoldIcon },
    { action: "italic", Icon: ItalicIcon },
    { action: "strikethrough", Icon: StrikethroughIcon },
    { action: "inlineCode", Icon: CodeIcon },
  ],
  [
    { action: "bulletList", Icon: BulletListIcon },
    { action: "orderedList", Icon: OrderedListIcon },
    { action: "quote", Icon: QuoteIcon },
  ],
  [
    { action: "codeBlock", Icon: CodeBlockIcon },
    { action: "table", Icon: TableIcon },
    { action: "divider", Icon: DividerIcon },
  ],
];

/** markdown 편집기 위에 두는 서식 단추 줄입니다. */
export function MarkdownToolbar({ label, headingLevel, disabled, onHeading, onFormat }: Props) {
  const labels = useMessages().markdownEditor;
  return (
    <div
      role="toolbar"
      aria-label={labels.toolbar(label)}
      className="mb-2 flex flex-wrap items-center gap-0.5 border-b border-base-300 pb-1.5"
    >
      <select
        aria-label={labels.blockType}
        className="select select-ghost select-xs w-24"
        value={headingLevel}
        disabled={disabled}
        onChange={(event) => onHeading(Number(event.target.value))}
      >
        <option value={0}>{labels.paragraph}</option>
        {HEADING_LEVELS.map((level) => (
          <option key={level} value={level}>
            {labels.heading(level)}
          </option>
        ))}
      </select>
      {BUTTON_GROUPS.map((group, index) => (
        <Fragment key={index}>
          <span className="mx-1 h-4 w-px bg-base-300" aria-hidden="true" />
          {group.map(({ action, Icon }) => (
            <button
              key={action}
              type="button"
              className="btn btn-ghost btn-xs btn-square text-base-content/75 hover:text-base-content"
              title={labels[action]}
              aria-label={labels[action]}
              disabled={disabled}
              // 단추가 포커스를 가져가지 않아야 편집기의 커서와 선택 영역이 그대로 남습니다.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onFormat(action)}
            >
              <Icon width={14} height={14} />
            </button>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
