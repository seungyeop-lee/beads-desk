import { getServerRuntime } from "@/server/infra/runtime/serverRuntime";
import { respondJson } from "@/server/web/http/routeResponse";

export function handleHealthRequest(): Response {
  return respondJson({ runtime: getServerRuntime() });
}
