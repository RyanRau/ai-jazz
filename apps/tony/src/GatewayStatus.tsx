import { useEffect, useState } from "react";
import { StatusDot } from "bluestar";
import type { StatusDotVariant } from "bluestar";
import { GATEWAY_URL } from "./gateway";

type Health = { status: string; loaded_model: string | null; process_alive: boolean };
type State = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 20_000;

/**
 * A little "is the LLM server reachable" light for the sidebar -- Playground
 * and Chat both silently fail with a generic network error when the
 * WireGuard tunnel to home is down, which isn't obvious until you've
 * already typed a prompt. This polls the gateway's own unauthenticated
 * `/health` (no API key needed, just reachability) so that's visible at a
 * glance instead.
 *
 * "Online" means the gateway process answered, not that a model is
 * currently loaded -- `loaded_model` unloads itself on an idle timeout
 * during totally normal operation, so keying the dot off that would flicker
 * between states for a reason that has nothing to do with whether the
 * gateway is actually up.
 */
export function GatewayStatus() {
  const [state, setState] = useState<State>("checking");
  const [loadedModel, setLoadedModel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function check() {
      fetch(`${GATEWAY_URL}/health`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<Health>;
        })
        .then((data) => {
          if (cancelled) return;
          setState("online");
          setLoadedModel(data.loaded_model);
        })
        .catch(() => {
          if (cancelled) return;
          setState("offline");
          setLoadedModel(null);
        });
    }

    check();
    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const label: string =
    state === "checking" ? "Checking…" : state === "online" ? "Online" : "Offline";
  const variant: StatusDotVariant =
    state === "checking" ? "neutral" : state === "online" ? "success" : "error";

  return (
    <span title={loadedModel ? `Loaded: ${loadedModel}` : undefined}>
      <StatusDot variant={variant} label={label} pulse={state === "online"} />
    </span>
  );
}
