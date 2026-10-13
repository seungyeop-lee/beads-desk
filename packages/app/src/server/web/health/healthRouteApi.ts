import { getServerRuntime } from "@/server/infra/runtime/serverRuntime";

export function handleHealthRequest(): Response {
  return Response.json({ runtime: getServerRuntime() });
}
