import { usePathname, useSearchParams } from "next/navigation";
import type { GraphScope } from "@/client/modules/graph/domain/graphScope";
import { graphHref } from "./graphAddress";

export function useGraphHref(): (scope: GraphScope) => string {
  const pathname = usePathname();
  const params = useSearchParams();
  return (scope) => graphHref(scope, `${pathname}?${params}`);
}
