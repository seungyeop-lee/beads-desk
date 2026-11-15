import type { Metadata } from "next";

import { LandingPage } from "../../../components/LandingPage";
import { koContent } from "../../../content/ko";
import { buildLocaleMetadata } from "../../../content/siteMeta";

export const metadata: Metadata = buildLocaleMetadata("ko");

export default function KoreanHomePage() {
  return <LandingPage content={koContent} />;
}
