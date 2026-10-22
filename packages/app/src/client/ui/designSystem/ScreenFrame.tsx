import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"main">, "className"> & {
  variant?: "default" | "spacious" | "board";
};

export function ScreenFrame({ variant = "default", ...props }: Props) {
  return (
    <main
      {...props}
      className={`content-width flex flex-col px-8 pb-16 ${variant === "spacious" ? "gap-6" : "gap-4"} ${variant === "board" ? "md:min-h-0 md:grow md:basis-0 md:pb-6" : ""}`}
    />
  );
}
