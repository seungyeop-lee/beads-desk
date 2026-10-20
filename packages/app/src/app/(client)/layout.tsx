import type { Metadata } from "next";
import type { ReactNode } from "react";

import { KeyboardFocusMode } from "@/client/ui/designSystem/KeyboardFocusMode";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { CloseReasonDialogHost } from "@/client/ui/issues/fields/CloseReasonDialog";
import { DeferDialogHost } from "@/client/ui/issues/fields/DeferDialog";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { themeAttribute } from "@/client/ui/theme/themeAttribute";
import { ThemeProvider } from "@/client/ui/theme/ThemeProvider";
import { APP_BODY_LAYOUT } from "@/client/ui/shell/appBodyLayout";
import { requestLocale } from "@/server/web/locale/requestLocale";
import { requestTheme } from "@/server/web/theme/requestTheme";

import "@/client/ui/designSystem/styles/index.css";

/**
 * 탭이 많아지면 제목이 뒷부분부터 잘리므로, 하위 segment가 정한 workspace 이름을 앞에 둡니다.
 * 하위 segment가 제목을 정하지 않은 화면은 `beads-desk`만 보입니다.
 */
export const metadata: Metadata = {
  title: { default: "beads-desk", template: "%s · beads-desk" },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([requestLocale(), requestTheme()]);
  return (
    <html lang={locale} data-theme={themeAttribute(theme)}>
      <body className={`${APP_BODY_LAYOUT} font-sans text-base-content antialiased`}>
        <LocaleProvider locale={locale}>
          <ThemeProvider theme={theme}>
            <KeyboardFocusMode />
            {children}
            <CloseReasonDialogHost />
            <DeferDialogHost />
            <ToastRegion />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
