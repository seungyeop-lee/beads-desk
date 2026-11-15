import type { Metadata } from "next";

import { LandingPage } from "../../components/LandingPage";
import { enContent } from "../../content/en";
import { buildLocaleMetadata } from "../../content/siteMeta";

export const metadata: Metadata = buildLocaleMetadata("en");

export default function EnglishHomePage() {
  return <LandingPage content={enContent} />;
}
