import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"main">, "className"> & {
  /**
   * board는 열이 나란히 놓이는 너비(md 이상)에서, panes는 모든 너비에서 main이 body의 남은 창 높이를 채웁니다.
   * 내용이 넘치면 화면 안의 영역이 따로 스크롤합니다.
   */
  variant?: "default" | "spacious" | "board" | "panes";
};

const VARIANTS = {
  default: "gap-4 pb-16",
  spacious: "gap-6 pb-16",
  board: "gap-4 pb-16 md:min-h-0 md:grow md:basis-0 md:pb-6",
  panes: "gap-4 min-h-0 grow basis-0 pb-6",
};

export function ScreenFrame({ variant = "default", ...props }: Props) {
  return <main {...props} className={`content-width flex flex-col px-8 ${VARIANTS[variant]}`} />;
}
