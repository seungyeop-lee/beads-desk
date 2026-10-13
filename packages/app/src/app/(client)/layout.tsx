import type { Metadata } from "next";
import type { ReactNode } from "react";

import { KeyboardFocusMode } from "@/client/ui/designSystem/KeyboardFocusMode";
import { AppHeader } from "@/client/ui/shell/AppHeader";

import "@/client/ui/designSystem/styles/index.css";

export const metadata: Metadata = {
  title: "beads-desk",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-base-200 font-sans text-base-content antialiased">
        <KeyboardFocusMode />
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
