import type { ReactNode } from "react";

import "../globals.css";

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
