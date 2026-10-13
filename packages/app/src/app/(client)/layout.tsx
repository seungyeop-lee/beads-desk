import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/client/ui/designSystem/styles/index.css";

export const metadata: Metadata = {
  title: "beads-desk",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-base-200 text-base-content">{children}</body>
    </html>
  );
}
