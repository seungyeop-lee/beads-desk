import { redirect } from "next/navigation";

/** workspace 이름이 없는 주소는 루트에서 workspace를 고르거나 하나뿐인 workspace로 이동합니다. */
export default function WorkspacesPage() {
  redirect("/");
}
