import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

function apiBase() {
  const envUrl =
    (import.meta as any).env?.REACT_APP_WASP_SERVER_URL ||
    (import.meta as any).env?.REACT_APP_API_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
}

export function MobileBridgePage() {
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Ligação inválida.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `${apiBase()}/mobile/auth/web-bridge/consume?token=${encodeURIComponent(token)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || payload.error || "Ligação expirada.");
        }
        if (cancelled) return;
        localStorage.setItem("wasp:sessionId", JSON.stringify(payload.sessionId));
        const next = typeof payload.next === "string" && payload.next.startsWith("/") ? payload.next : "/app";
        window.location.replace(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível abrir a sessão.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", padding: 24 }}>
      <p>{error || "A abrir a Catequese Viva…"}</p>
    </main>
  );
}
