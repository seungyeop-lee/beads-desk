import type { MetadataRoute } from "next";

import { localeAbsoluteUrl } from "../content/siteMeta";

export const dynamic = "force-static";

const SHARED_ALTERNATES = {
  languages: {
    en: localeAbsoluteUrl("en"),
    ko: localeAbsoluteUrl("ko"),
    ja: localeAbsoluteUrl("ja"),
    "x-default": localeAbsoluteUrl("en"),
  },
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: localeAbsoluteUrl("en"),
      changeFrequency: "weekly",
      priority: 1,
      alternates: SHARED_ALTERNATES,
    },
    {
      url: localeAbsoluteUrl("ko"),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: SHARED_ALTERNATES,
    },
    {
      url: localeAbsoluteUrl("ja"),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: SHARED_ALTERNATES,
    },
  ];
}
