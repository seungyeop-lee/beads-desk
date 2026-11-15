import type { ReactNode } from "react";

import "../globals.css";

export default function JapaneseLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
