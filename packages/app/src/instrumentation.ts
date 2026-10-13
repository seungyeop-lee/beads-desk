export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startServerRuntime } = await import("@/server/runtime/serverRuntime");
    await startServerRuntime();
  }
}
