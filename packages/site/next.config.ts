import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // next dev가 packages/site에 AGENTS.md를 만들지 않게 합니다. 패키지 안내와 규칙은 저장소 루트 AGENTS.md에 둡니다.
  agentRules: false,
};

export default nextConfig;
