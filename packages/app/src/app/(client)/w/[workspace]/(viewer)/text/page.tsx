import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalTextScreen } from "@/client/ui/screens/localText/LocalTextScreen";
import { ViewerHeader } from "@/client/ui/shell/ViewerHeader";
import { LOCAL_TEXT_QUERY } from "@/shared/contract/localFiles";
import { viewerTitle } from "../viewerTitle";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/w/[workspace]/text">): Promise<Metadata> {
  return viewerTitle((await params).workspace, (await searchParams)[LOCAL_TEXT_QUERY.path]);
}

export default function LocalTextPage() {
  return (
    <>
      <ViewerHeader viewer="text" />
      <Suspense>
        <LocalTextScreen />
      </Suspense>
    </>
  );
}
