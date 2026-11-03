import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalDiffScreen } from "@/client/ui/screens/localDiff/LocalDiffScreen";
import { ViewerHeader } from "@/client/ui/shell/ViewerHeader";
import { LOCAL_DIFF_QUERY } from "@/shared/contract/localFiles";
import { viewerTitle } from "../viewerTitle";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/w/[workspace]/diff">): Promise<Metadata> {
  return viewerTitle((await params).workspace, (await searchParams)[LOCAL_DIFF_QUERY.path]);
}

export default function LocalDiffPage() {
  return (
    <>
      <ViewerHeader viewer="diff" />
      <Suspense>
        <LocalDiffScreen />
      </Suspense>
    </>
  );
}
