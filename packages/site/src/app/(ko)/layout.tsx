import type { ReactNode } from "react";

import "../globals.css";

export default function KoreanLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
