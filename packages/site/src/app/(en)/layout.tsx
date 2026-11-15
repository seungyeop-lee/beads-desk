import type { ReactNode } from "react";

import { buildRootLocaleRedirectScript } from "../../locale/localePreference";
import "../globals.css";

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: buildRootLocaleRedirectScript(),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
