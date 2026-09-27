# infrastructure/nginx

Not used. Since M17 the API serves the built SPA with its security headers itself
([ADR-028](../../docs/adr/adr-028-production-runtime-and-deployment.md)) — the user chose one image/one process over an
nginx + API pair. TLS is terminated by the hosting platform.
