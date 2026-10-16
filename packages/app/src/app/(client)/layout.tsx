import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { KeyboardFocusMode } from "@/client/ui/designSystem/KeyboardFocusMode";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { CloseReasonDialogHost } from "@/client/ui/issues/fields/CloseReasonDialog";
import { DeferDialogHost } from "@/client/ui/issues/fields/DeferDialog";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { GraphScreen } from "@/client/ui/screens/graph/GraphScreen";
import { AppHeader } from "@/client/ui/shell/AppHeader";
import { themeAttribute } from "@/client/ui/theme/themeAttribute";
import { ThemeProvider } from "@/client/ui/theme/ThemeProvider";
import { requestLocale } from "@/server/web/locale/requestLocale";
import { requestTheme } from "@/server/web/theme/requestTheme";

import "@/client/ui/designSystem/styles/index.css";

export const metadata: Metadata = {
  title: "beads-desk",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([requestLocale(), requestTheme()]);
  return (
    <html lang={locale} data-theme={themeAttribute(theme)}>
      <body className="min-h-screen bg-base-200 font-sans text-base-content antialiased">
        <LocaleProvider locale={locale}>
          <ThemeProvider theme={theme}>
            <KeyboardFocusMode />
            <AppHeader />
            {children}
            <Suspense>
              <GraphScreen />
            </Suspense>
            <CloseReasonDialogHost />
            <DeferDialogHost />
            <ToastRegion />
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
