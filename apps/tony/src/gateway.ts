// Same convention as pb.ts's VITE_PB_URL: only set for pointing at a
// gateway reachable during local dev. In production this is the gateway's
// public subdomain once the WireGuard tunnel + Traefik route exist (see
// home-server/llm-gateway) -- until then, requests here will fail to reach
// it, which is expected, not a bug in this app.
export const GATEWAY_URL = import.meta.env.VITE_LLM_GATEWAY_URL ?? "https://llm.ryanzrau.dev";
