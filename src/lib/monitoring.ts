export type VertexEventLevel = "info" | "warn" | "error";

export function logVertexEvent(
  event: string,
  details: Record<string, unknown>,
  level: VertexEventLevel = "info"
) {
  const payload = {
    event,
    level,
    ts: new Date().toISOString(),
    ...details,
  };

  if (level === "error") {
    console.error("[vertex:event]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[vertex:event]", payload);
    return;
  }

  console.info("[vertex:event]", payload);
}
