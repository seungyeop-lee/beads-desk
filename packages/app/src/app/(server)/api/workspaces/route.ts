import {
  handleRegisterWorkspaceRequest,
  handleWorkspacesRequest,
} from "@/server/web/workspaces/workspacesRouteApi";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return handleWorkspacesRequest();
}

export function POST(request: Request): Promise<Response> {
  return handleRegisterWorkspaceRequest(request);
}
