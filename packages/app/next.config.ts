import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // next dev가 packages/app에 AGENTS.md를 만들지 않게 합니다. 같은 안내는 저장소 루트의 AGENTS.md에 있습니다.
  agentRules: false,
  compiler: {
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  },
};

export default nextConfig;
