# TFM-BIC

- Trabajo de Fin de Master Desarrollod de Software con AI de BIC

- Descripción: Aplicación para aprender idiomas con videos y de forma interactiva, con ejercicios y con gamificación. Tendrás un Dashboard para el alumno con los logros conseguidos y los ejercicios y videos realizados. Tambén otro Dashboard para profesores, para que puedan ver los resultados de varios alumnos y organizar clases.

# Tegnologías

- Front-End: React, TypeScript, Vite, Tailwind
- Back-End: Node.js, TypeScript
- DB: PostgreSQL (remoto, gestionado — proveedor por decidir, ver [ADR-005](docs/adr/adr-005-database.md); **sin AWS**)
- Testing: Vitest, React Testing Library, Husky (hooks), Playwright
- Assistants: Claude (código), Gemini (audio de contenido), ChatGPT (información general y prompts)

# DevOps

- Jenkins puerto 8080

# Desde una terminal Ubuntu

cd ~/infrastructure/jenkins && docker compose up -d
cd ~/infrastructure/sonarqube && docker compose up -d

- SonarQube admin puerto9000
- Docker

# Comandos Docker

- docker compose stop # parar sin borrar nada
- docker compose up -d # volver a arrancar
- docker compose down # parar y quitar el contenedor (el volumen jenkins_home sobrevive)

# Arquitectura

- Clean Architecture + Hexagonal + modular monolith

> Nota: la base de datos se especificó inicialmente como DynamoDB (AWS); tras el Milestone 0 se
> fijó **PostgreSQL remoto, sin AWS**, como restricción de gobernanza del proyecto. Ver
> [docs/product/project-constitution.md](docs/product/project-constitution.md).

# Documentación del proyecto

Este repositorio sigue una gobernanza de arquitectura documentada en `docs/` y `.claude/`:

- [Project Constitution](docs/product/project-constitution.md) — principios no negociables.
- [Architecture Decision Records](docs/adr/README.md) — decisiones técnicas (`ACCEPTED` / `PENDING`).
- [Risk Register](docs/risk-register.md)
- [Seguridad (M16)](docs/security/M16-SECURITY-AUDIT.md) — auditoría, modelo de amenazas, matriz de autorización y
  pruebas de seguridad; lista de comprobación para desplegar en [environments.md](docs/deployment/environments.md).
- [Producción (M17)](docs/production/M17-PRODUCTION-AUDIT.md) — auditoría de producción, bloqueos, opciones de hosting
  (PENDIENTE de decisión), arquitectura de despliegue, secretos, copias de seguridad, recuperación, runbook e incidentes.
- [.claude/current-state.md](.claude/current-state.md) — qué existe realmente hoy en el repo.

# Desarrollo (Milestone 1)

Monorepo TypeScript gestionado con **pnpm workspaces** ([ADR-002](docs/adr/adr-002-monorepo.md)).
Estado actual del repo (qué existe de verdad, no solo lo documentado):
[.claude/current-state.md](.claude/current-state.md).

## Requisitos previos

- **Node.js 24** (Active LTS) — ver [`.nvmrc`](.nvmrc) y [ADR-016](docs/adr/adr-016-typescript-node-baseline.md).
  Con `nvm`: `nvm use`.
- **pnpm** — no hace falta instalarlo aparte: `corepack enable` (una vez por máquina) hace que
  Node resuelva automáticamente la versión de pnpm fijada en `package.json` (`packageManager`).
  Si `corepack enable` falla por permisos, se puede invocar pnpm puntualmente con
  `npx pnpm@<versión-de-packageManager> <comando>`.

## Instalación

```bash
pnpm install
```

## Comandos principales (desde la raíz del repo)

| Comando                        | Qué hace                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm dev`                     | Arranca `apps/web` y `apps/api` en paralelo                                  |
| `pnpm dev:web`                 | Solo el frontend (Vite, `http://localhost:5173`)                             |
| `pnpm dev:api`                 | Solo el backend (Fastify vía `tsx watch`, `http://localhost:3000`)           |
| `pnpm build`                   | Compila todos los packages/apps (orden topológico automático de pnpm)        |
| `pnpm test`                    | Suite Vitest completa (todos los packages/apps, un único proceso)            |
| `pnpm test:coverage`           | Igual, con cobertura (umbral: líneas/statements/functions ≥80%, ramas ≥75%)  |
| `pnpm test:e2e`                | Smoke tests Playwright (levanta `apps/web` automáticamente)                  |
| `pnpm lint` / `lint:fix`       | ESLint (flat config) sobre todo el repo                                      |
| `pnpm format` / `format:check` | Prettier sobre todo el repo                                                  |
| `pnpm typecheck`               | `tsc --noEmit` en cada package/app                                           |
| `pnpm check`                   | Pipeline de calidad completo: lint → format:check → typecheck → test → build |

`pnpm --filter @tfm-bic/<paquete> <script>` ejecuta un script en un único workspace (p. ej.
`pnpm --filter @tfm-bic/domain test`).

## Variables de entorno

Ver [`.env.example`](.env.example) (nunca commitear un `.env` real). En M1 solo
`NODE_ENV`/`PORT`/`DEFAULT_LANGUAGE` son leídas por código (`packages/config`); el resto
(`DATABASE_URL`, `AUTH_SECRET`, proveedores de email/Gemini/Hyperframes) están documentadas pero
sin uso todavía — ver [docs/deployment/environments.md](docs/deployment/environments.md).

## Git hooks

`pre-commit` corre `lint-staged` (ESLint + Prettier solo sobre ficheros staged); `pre-push` corre
la suite completa de tests. Detalle: [docs/development/husky-hooks.md](docs/development/husky-hooks.md).

## Troubleshooting

- **`corepack enable` falla con `EPERM`/permisos (Windows)**: usar
  `npx pnpm@<versión> <comando>` en su lugar, o ejecutar la terminal como administrador una vez.
- **`pnpm install` falla con `ERR_PNPM_IGNORED_BUILDS`**: pnpm 12 requiere aprobar explícitamente
  los scripts de postinstall de las dependencias; ya está resuelto en
  [`pnpm-workspace.yaml`](pnpm-workspace.yaml) (`allowBuilds`) — si aparece para una dependencia
  nueva, revisar qué hace su postinstall antes de aprobarlo.
- **Un test de `apps/web` deja el DOM "sucio" entre tests**: comprobar que el fichero de test usa
  `renderWithProviders`/`render` de forma normal — el cleanup de React Testing Library está
  registrado explícitamente en `src/test-setup.ts` (necesario porque `vitest.shared.ts` fija
  `globals: false`).

# CI/CD (Milestone 2)

Pipeline Jenkins declarativo (`Jenkinsfile`, raíz del repo) + análisis SonarQube
(`sonar-project.properties`). Detalle completo, decisiones de reproducibilidad y troubleshooting:
[docs/deployment/ci-cd-pipeline.md](docs/deployment/ci-cd-pipeline.md);
decisión: [ADR-010](docs/adr/adr-010-ci-cd.md).

**Aún no ejecutado contra una instancia real de Jenkins/SonarQube** — ninguna de las dos está
desplegada todavía (hosting PENDING). Lo que sí se puede reproducir en local, sin Jenkins, son
exactamente las mismas puertas de calidad:

```bash
pnpm check      # lint + format:check + typecheck + test + build
pnpm test:e2e   # Playwright
```

Requisitos de una instancia Jenkins real (agente con Docker, plugins necesarios, nombres exactos de
configuración esperados): [infrastructure/jenkins/README.md](infrastructure/jenkins/README.md).
Reglas de protección de rama recomendadas para GitHub (a aplicar manualmente, no automatizado desde
este repo): [git-branching-strategy.md](docs/development/git-branching-strategy.md#branch-protection-github-repository-settings).

# Producción (Milestone 17)

La aplicación se empaqueta en **una sola imagen Docker**: la API (Fastify) sirve también el SPA compilado desde el
mismo origen. Hosting, dominio, registro de imágenes y proveedor de email real siguen **PENDIENTES** — ver
[docs/production/M17-PRODUCTION-AUDIT.md](docs/production/M17-PRODUCTION-AUDIT.md). Con `NODE_ENV=production` la
aplicación se niega a arrancar con proveedores falsos (por eso hoy solo puede ejecutarse como `staging`).

```bash
pnpm build                                   # SPA + bundle de la API (apps/api/dist)
pnpm db:migrate                              # todas las migraciones, en orden, con bloqueo (DATABASE_URL)
SHA=$(git rev-parse --short=12 HEAD)
docker build -f infrastructure/docker/app.Dockerfile --build-arg APP_VERSION="0.1.0+$SHA" -t tfm-bic:$SHA .
infrastructure/docker/validate-image.sh tfm-bic:$SHA "0.1.0+$SHA"     # staging efímero + smoke test
infrastructure/deployment/restore-drill.sh tfm-bic:$SHA               # prueba de backup/restauración
```

En Windows (Git Bash) anteponer `MSYS_NO_PATHCONV=1` a los scripts de Docker. Procedimientos completos:
[runbook](docs/production/M17-PRODUCTION-RUNBOOK.md).

# Observabilidad (Milestone 18)

Logs JSON estructurados (servicio, entorno, versión, `reqId`, ruta, estado, duración) con redacción centralizada,
métricas en memoria (`GET /internal/metrics`, solo con `METRICS_TOKEN`), transiciones de readiness, errores del SPA
reportados al propio API (`POST /client-errors`) y runbooks por alerta. Sin proveedor externo. Decisión:
[ADR-029](docs/adr/adr-029-observability.md) · política de datos: [docs/observability-data-policy.md](docs/observability-data-policy.md)
· runbooks: [docs/runbooks/](docs/runbooks/README.md).
