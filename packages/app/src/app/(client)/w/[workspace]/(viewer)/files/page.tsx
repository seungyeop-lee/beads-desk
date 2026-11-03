import type { Metadata } from "next";
import { Suspense } from "react";
import { LocalFolderScreen } from "@/client/ui/screens/localFolder/LocalFolderScreen";
import { ViewerHeader } from "@/client/ui/shell/ViewerHeader";
import { LOCAL_FOLDER_QUERY } from "@/shared/contract/localFiles";
import { viewerTitle } from "../viewerTitle";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/w/[workspace]/files">): Promise<Metadata> {
  return viewerTitle((await params).workspace, (await searchParams)[LOCAL_FOLDER_QUERY.path]);
}

export default function LocalFolderPage() {
  return (
    <>
      <ViewerHeader viewer="folder" />
      <Suspense>
        <LocalFolderScreen />
      </Suspense>
    </>
  );
}
