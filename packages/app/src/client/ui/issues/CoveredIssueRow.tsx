import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CopyIssueIdButton } from "./CopyIssueIdButton";

type Cover =
  | {
      href: string;
      /** 넘기면 덮는 링크를 끄는 동안 행 전체의 모습을 끌기 그림으로 보입니다. */
      onDragStart?: (dataTransfer: DataTransfer) => void;
    }
  | { onSelect: () => void };

type Props = {
  as?: "li" | "div";
  issueId: string;
  /** 덮는 층의 접근 가능한 이름은 `<issueId> <title>`입니다. */
  title: string;
  cover: Cover;
  /** 행 자체의 배치와 모양입니다. 덮는 층의 기준이 되도록 relative는 이 component가 붙입니다. */
  className: string;
  /** 덮는 층의 위치와 모양입니다. 주지 않으면 행의 padding 영역 전체(inset-0)를 덮습니다. */
  coverClassName?: string;
  coverTooltip?: string;
  /** 지금 보고 있거나 고른 이슈임을 덮는 층의 aria-current로 알립니다. */
  current?: boolean;
  children: ReactNode;
};

/**
 * 행이나 카드 전체를 이슈 링크나 선택 단추로 만듭니다. 링크와 단추 안에는 ID 복사 단추를 넣을 수 없으므로,
 * 내용 없는 링크나 단추를 absolute로 행 전체에 겹치고 내용은 그 아래에 둡니다.
 * 덮는 층은 positioned 요소라 positioned가 아닌 내용보다 위에 그려집니다. 그래서 눌러야 하는 ID 복사 단추는
 * CoveredIssueIdButton으로 두고, 풍선 도움말이 있는 표시처럼 마우스가 닿아야 하는 요소에는 relative를 줍니다.
 */
export function CoveredIssueRow({
  as: Row = "div",
  issueId,
  title,
  cover,
  className,
  coverClassName = "inset-0",
  coverTooltip,
  current = false,
  children,
}: Props) {
  const layer = {
    className: `absolute ${coverClassName}`,
    title: coverTooltip,
    "aria-label": `${issueId} ${title}`,
    "aria-current": current ? ("true" as const) : undefined,
  };
  return (
    <Row className={`relative ${className}`}>
      {"href" in cover ? (
        <Link
          {...layer}
          href={cover.href}
          scroll={false}
          onDragStart={
            cover.onDragStart &&
            ((event) => {
              cover.onDragStart?.(event.dataTransfer);
              const row = event.currentTarget.parentElement;
              if (row) {
                event.dataTransfer.setDragImage(
                  row,
                  event.nativeEvent.offsetX,
                  event.nativeEvent.offsetY,
                );
              }
            })
          }
        />
      ) : (
        <button {...layer} type="button" onClick={cover.onSelect} />
      )}
      {children}
    </Row>
  );
}

/** CoveredIssueRow의 덮는 층 위에 올라와, 눌러도 이동·선택·끌기 없이 ID만 복사하는 단추입니다. */
export function CoveredIssueIdButton({
  className = "",
  ...props
}: ComponentProps<typeof CopyIssueIdButton>) {
  return <CopyIssueIdButton {...props} className={`relative ${className}`} />;
}
