import { getServerRuntime } from "@/server/runtime/serverRuntime";

export function handleHealthRequest(): Response {
  return Response.json({ runtime: getServerRuntime() });
}
