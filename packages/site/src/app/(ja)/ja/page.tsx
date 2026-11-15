import type { Metadata } from "next";

import { LandingPage } from "../../../components/LandingPage";
import { jaContent } from "../../../content/ja";
import { buildLocaleMetadata } from "../../../content/siteMeta";

export const metadata: Metadata = buildLocaleMetadata("ja");

export default function JapaneseHomePage() {
  return <LandingPage content={jaContent} />;
}
