import { Suspense } from "react";
import { LocalFolderScreen } from "@/client/ui/screens/localFolder/LocalFolderScreen";

export default function LocalFolderPage() {
  return (
    <Suspense>
      <LocalFolderScreen />
    </Suspense>
  );
}
