/**
 * The SPA's HTTP security headers (M16, ADR-027). Since M17 the single source of truth lives in
 * @tfm-bic/contracts, because two servers must send exactly these values: `vite preview`
 * (vite.config.ts) and the API, which serves the built SPA in staging/production (ADR-028).
 */
export {
  CONTENT_SECURITY_POLICY,
  WEB_SECURITY_HEADERS,
} from "@tfm-bic/contracts/web-security-headers";
