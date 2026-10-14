"use client";

import { createContext, use, type ReactNode } from "react";
import type { ThemeChoice } from "@/shared/contract/theme";

const ThemeContext = createContext<ThemeChoice>("system");

/** layout이 요청에서 읽은 테마 선택을 설정 화면에 내려 줍니다. */
export function ThemeProvider({ theme, children }: { theme: ThemeChoice; children: ReactNode }) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): ThemeChoice {
  return use(ThemeContext);
}
