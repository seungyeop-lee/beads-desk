import { useSearchParams } from "next/navigation";
import type { GraphScope } from "@/client/modules/graph/domain/graphScope";
import { useScreenPathname, useWorkspaceHref } from "@/client/ui/address/workspaceAddress";
import { graphHref } from "./graphAddress";

export function useGraphHref(): (scope: GraphScope) => string {
  const screenPathname = useScreenPathname();
  const params = useSearchParams();
  const workspaceHref = useWorkspaceHref();
  return (scope) => workspaceHref(graphHref(scope, `${screenPathname}?${params}`));
}
