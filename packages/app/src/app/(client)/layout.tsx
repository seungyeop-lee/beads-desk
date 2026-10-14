import type { Metadata } from "next";
import type { ReactNode } from "react";

import { KeyboardFocusMode } from "@/client/ui/designSystem/KeyboardFocusMode";
import { ToastRegion } from "@/client/ui/designSystem/Toast";
import { LocaleProvider } from "@/client/ui/locale/LocaleProvider";
import { AppHeader } from "@/client/ui/shell/AppHeader";
import { requestLocale } from "@/server/web/locale/requestLocale";

import "@/client/ui/designSystem/styles/index.css";

export const metadata: Metadata = {
  title: "beads-desk",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await requestLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen bg-base-200 font-sans text-base-content antialiased">
        <LocaleProvider locale={locale}>
          <KeyboardFocusMode />
          <AppHeader />
          {children}
          <ToastRegion />
        </LocaleProvider>
      </body>
    </html>
  );
}
