# CONTEXTO COMPLETO DEL TFM — para generar README, Word y PowerPoint

> **Cómo usar este documento**: pega este archivo entero en ChatGPT o Gemini y, a continuación, el prompt de la
> sección 16 que corresponda (README, Word o PPT). Todo lo que hay aquí sale del repositorio a fecha **2026-10-07**.
> Los datos marcados **[RELLENAR]** los tienes que completar tú. Pide a la IA que **no invente** cifras,
> funcionalidades ni proveedores que no aparezcan aquí.

---

## 1. Ficha del proyecto

| Campo                 | Valor                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Nombre                | **TFM-BIC** — plataforma web para aprender idiomas                                                                           |
| Contexto              | Trabajo de Fin de Máster, _Máster en Desarrollo de Software con IA_ (BIC)                                                    |
| Autor                 | **[RELLENAR: nombre completo]** (usuario GitHub `pascual143`, firma en la web: "© 2026 pvsegura · TFM-BIC")                  |
| Repositorio           | **[RELLENAR: URL de GitHub]** (rama principal `main`)                                                                        |
| Demo pública          | **https://www.verbysia.com** (Render Free + Neon Free; entorno `staging`)                                                    |
| Dominio               | **verbysia.com**, comprado en **Namecheap**; `verbysia.com` redirige (301) a `www.verbysia.com`, que apunta por DNS a Render |
| Periodo de desarrollo | 15-09-2026 (commit inicial) → 07-10-2026                                                                                     |
| Tamaño                | 339 commits en `main`, 34 ADRs, ~24 hitos (M0–M23)                                                                           |
| Idiomas de curso      | **Polaco** (A1–C2 completos) e **Inglés para hispanohablantes** (A1)                                                         |
| Licencia              | Privada (UNLICENSED)                                                                                                         |

**Descripción en una frase**: aplicación web para aprender idiomas con vídeos pedagógicos generados por IA, audio
de pronunciación, ejercicios interactivos corregidos en el servidor, gamificación, un **coach de aprendizaje con IA** (agente Gemini) y dos paneles: uno para el
alumno y otro para el profesor.

---

## 2. Problema que resuelve

1. **Las apps de idiomas suelen ser solo ejercicios sueltos** (tarjetas, test) sin explicación: el alumno memoriza
   sin entender la gramática ni oír el idioma en contexto.
2. **Idiomas "minoritarios" como el polaco** tienen poco contenido de calidad, estructurado por niveles MCER
   (A1–C2), para hispanohablantes.
3. **El profesor no ve qué hace el alumno fuera de clase**: no sabe quién practica, qué acierta ni qué falla.
4. **Producir vídeo y audio educativo es caro**: grabar locutores y animar escenas para cada lección no escala.
5. **Añadir un idioma nuevo suele obligar a duplicar la aplicación**.
6. **El alumno se queda solo cuando falla**: no tiene a quién preguntar "¿por qué está mal?" o "¿qué estudio ahora?",
   y los chatbots genéricos no conocen su progreso real e inventan datos.

## 3. Solución propuesta

- **Aprendizaje "vídeo primero"**: cada lección empieza con un vídeo pedagógico (situaciones con personajes
  ilustrados, foco en la palabra, contraste, y una pausa de "recuperación" en la que el alumno intenta recordar
  antes de ver la respuesta). Después: transcripción con hablantes, "ver otra vez", palabras de la lección,
  lección relacionada.
- **Audio de pronunciación** en cada palabra de vocabulario y en las tablas de gramática (p. ej. los números).
- **Ejercicios interactivos** cuya corrección se hace **en el servidor** (el alumno no puede ver la solución en el
  navegador).
- **Gamificación**: puntos (+10/+25/+50), logros, progreso por nivel y por destreza.
- **Panel del alumno** (dashboard) con puntos, progreso, lecciones completadas, siguiente lección, actividad
  reciente y logros.
- **Panel del profesor** (teacher dashboard) con la lista de sus alumnos, quién está activo (últimos 7 días),
  lecciones completadas, intentos, % de acierto, puntos, logros y series semanales de 8 semanas.
- **Contenido como datos**: lecciones, ejercicios, vocabulario, fonética y gramática viven en ficheros JSON
  validados por esquema, parametrizados por `languageId`. **Añadir un idioma = añadir una carpeta de contenido**, sin
  tocar código (se demostró añadiendo el inglés).
- **Generación de medios por IA de forma offline**: un CLI de operador genera el audio con **Gemini TTS** y
  renderiza el vídeo con **Hyperframes** (HTML → vídeo) + FFmpeg; los ficheros resultantes se versionan y se sirven
  desde el mismo origen. Nunca se genera nada cuando un usuario visita la página (coste y latencia controlados).
- **AI Learning Coach (M23)**: un agente con **Gemini** que responde preguntas del alumno sobre _su propio
  aprendizaje en la app_ (por qué falló un ejercicio, qué estudiar después, qué significa una palabra, qué dijo un
  personaje en un vídeo, cómo se pronuncia un sonido) y genera mini-prácticas a partir de sus puntos débiles
  reales. No es un chatbot genérico: usa **16 herramientas tipadas de solo lectura** sobre los datos reales de la
  app y no puede inventar puntuaciones ni ver datos de otros alumnos.
- **Coste cero de infraestructura**: demo desplegada en planes gratuitos (Render + Neon).

---

## 4. Funcionalidades (lo que existe de verdad)

### Público (sin cuenta)

- **Homepage narrativa**: 10 escenas con scroll (Descubre, Entiende, Escucha, Mira, Practica, Recuerda, Progresa,
  Recorrido, Idiomas, Empieza) que siguen una palabra polaca (_szkoła_, "escuela") con un hilo naranja tipo
  "margen de cuaderno". Sin librerías de animación; respeta "reducir movimiento"; responsive 375–1920 px.
- Catálogo de idiomas y niveles; **referencia gramatical** pública (polaco 21 temas, inglés 19 temas: adverbios de
  tiempo, derivación, verbos, conjugaciones, pronombres, números con audio…).
- Aviso de privacidad, pie de página con privacidad, datos y contacto.

### Alumno (cuenta registrada)

- Registro, verificación de email, login, logout, recuperación de contraseña.
- Perfil (nombre, apellidos, nickname, avatar de catálogo).
- **Lecciones** con vídeo pedagógico, transcripción, palabras de la lección.
- **Ejercicios** (sistema extensible de tipos mediante un registro de evaluadores; intentos guardados en modo
  "solo añadir").
- **Vocabulario** por categorías, búsqueda que ignora diacríticos, botón de audio, "Mi vocabulario" con estados
  guardada / aprendiendo / aprendida.
- **Fonética** (representaciones por tema, progreso visto / practicado / completado).
- **Gramática** de consulta.
- **AI Coach** (`/learn/coach`): ver sección 4 bis.
- **Puntos y logros**, dashboard del alumno.
- **Newsletter** con doble opt-in (confirmar y darse de baja).
- **Mis datos (RGPD)**: descargar todos sus datos en JSON y **borrar la cuenta** (requiere contraseña + confirmación;
  borrado inmediato y definitivo).
- Modo oscuro, diseño responsive, transiciones suaves entre páginas, fondo de papel pautado.

### Profesor (rol TEACHER)

- `/teacher`: lista paginada y filtrable de **sus** alumnos (estudiantes vinculados), activos en 7 días, última
  actividad, lecciones completadas / en curso, intentos, % de acierto, puntos.
- `/teacher/students/:id`: detalle del alumno con logros, lecciones publicadas por nivel y **serie semanal de las
  últimas 8 semanas** (lecciones, intentos, aciertos, % acierto, puntos).
- Seguridad en 4 capas: sesión → rol TEACHER → relación profesor-alumno → protección IDOR (un alumno que no es tuyo
  devuelve el mismo 404 que uno que no existe).
- Vinculación profesor-alumno y promoción a TEACHER **solo por CLI de operador** (no hay auto-registro de
  profesores, para evitar que cualquiera vea datos de alumnos).

### 4 bis. AI Learning Coach (M23) — agente de IA con Gemini

- **Qué es**: un coach conversacional (texto) en `/learn/coach` para alumnos registrados, con accesos
  contextuales desde los ejercicios ("Explain my answer"), lecciones, vídeos, vocabulario y fonética.
- **7 modos**: explicar un error, practicar puntos débiles, conversación en el idioma, vocabulario, ayuda con la
  lección, ayuda con el vídeo, pronunciación.
- **Cómo funciona**: el modelo (**Gemini 3.8 Flash**, _Interactions API_ con _function calling_) razona y decide
  qué herramienta usar; la aplicación ejecuta la herramienta con el usuario de la **sesión** y devuelve un
  resultado mínimo. Máximo 4 rondas de herramientas por turno.
- **16 herramientas de solo lectura** que reutilizan los casos de uso existentes (M5–M22): contexto del alumno,
  resumen de progreso, actividad reciente, puntos débiles, recomendar siguiente actividad, lecciones, vocabulario,
  fonética, gramática, contexto de un ejercicio, transcripción del vídeo, y `propose_practice_activity` (valida en el dominio la práctica que escribe el
  modelo antes de mostrarla).
- **Nivel MCER deducido** del progreso real del alumno (no lo elige el alumno ni el modelo): a un A1 le explica sin
  terminología de casos; a un B2 le habla de acusativo y orden de palabras.
- **Pedagogía en las instrucciones**: recuperación antes que repetición, significado antes que forma, una sola
  corrección cada vez, feedback concreto sin elogios inmerecidos, reciclar lo ya visto.
- **Anti-invención**: si no hay herramienta para un dato, dice que no lo sabe (p. ej. no hay "racha de días" y lo
  dice en vez de inventarla).
- **Regla de la respuesta oculta**: si el alumno aún no ha intentado un ejercicio, el coach **no** da la solución;
  le guía con preguntas.
- **Seguridad** (las instrucciones del prompt _no_ son la barrera; el código sí):
  - Ninguna herramienta acepta un id de usuario → imposible pedir datos de otro alumno (anti-IDOR por diseño).
  - Sesión + comprobación de Origin + esquemas estrictos; rate limit 20/h por usuario, 30/h por IP, ≤2 turnos
    concurrentes.
  - Clave de Gemini solo en el servidor; errores del proveedor nunca llegan al alumno ni a los logs.
  - Resistente a _prompt injection_ (probado: no revela instrucciones ni claves).
- **Privacidad**: sin tabla nueva; la conversación vive en el navegador y se reenvía en cada turno (máx. 12
  turnos); `store: false` en Gemini → el proveedor no guarda la conversación. Cerrar la pestaña la borra.
- **Coste**: `thinking_level: low` eliminó los tokens de "pensamiento" (que se facturan) en las pruebas.
- **Evaluación con el modelo real** (06-10-2026, 24 peticiones): **15 escenarios → 14 PASS, 1 N/A (voz)** —
  explicar error, práctica de puntos débiles, recomendación, vocabulario, transcripción de vídeo, adaptación
  A1 vs B2, dato desconocido, _prompt injection_, datos de otro alumno, respuesta oculta, conversación,
  proveedor caído, fallo de herramienta.
- **Proveedores intercambiables**: `AI_COACH_PROVIDER = fake | gemini | disabled` (puerto `AiAgentService` sin
  tipos de Gemini; adaptador `GeminiAgentProvider`). Comparte con el TTS de M12 la capa HTTP de Gemini.
- **Voz** (Gemini Live API): verificada como viable pero **no implementada** (decisión de producto: primero texto).
- Decisiones: **ADR-034**. Documentación: `docs/m23-ai-agent.md`, `docs/m23-ai-evaluation.md`.

### Contenido disponible hoy

| Idioma                                                   | Niveles                                    | Contenido                                                                                                    |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Polaco                                                   | A1, A2, B1, B2, C1, C2 (todos disponibles) | 6 ítems por nivel, 10–12 ejercicios, una categoría de vocabulario por nivel; 21 temas de gramática; fonética |
| Inglés (para hispanohablantes, instrucciones en español) | A1                                         | lecciones, vocabulario, 19 temas de gramática                                                                |

**Medios generados con IA (desplegados en main)**: **26 vídeos de lección** (5 de polaco A1, 5 de inglés A1 y 16 de
polaco A2–B2) y **~650 ficheros de audio** (pronunciación de palabras polacas e inglesas, números de las tablas de
gramática). Pendientes por la cuota diaria de Gemini: los vídeos restantes de polaco (~14, niveles B2–C2); los
guiones/planes ya están escritos y validados.

---

## 5. Stack tecnológico

| Capa                        | Tecnología                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lenguaje                    | **TypeScript 6** (modo estricto) en todo el proyecto                                                                                                                                                |
| Runtime                     | **Node.js 24 LTS**                                                                                                                                                                                  |
| Monorepo                    | **pnpm workspaces** (pnpm 12)                                                                                                                                                                       |
| Frontend                    | **React 19**, **Vite 8**, **React Router 8**, **TanStack Query 5**, **Zustand 5**, **React Hook Form 7**, **Zod 4**, **Tailwind CSS 4**                                                             |
| Backend                     | **Fastify 5** (API REST), Zod para validar DTOs, **Argon2id** para contraseñas, sesiones en servidor con cookie                                                                                     |
| Base de datos               | **PostgreSQL** gestionado en **Neon** (región eu-central-1), ORM **Drizzle**, driver `pg`; PGlite en tests                                                                                          |
| IA — audio                  | **Google Gemini API TTS** (voces distintas por personaje: Aoede, Charon, Puck…)                                                                                                                     |
| IA — vídeo                  | **Hyperframes** (renderizador HTML→vídeo de código abierto de HeyGen) + **FFmpeg**                                                                                                                  |
| IA — agente (AI Coach)      | **Gemini 3.8 Flash** vía **Gemini Interactions API** con _function calling_ (16 herramientas), `fetch` directo sin SDK                                                                              |
| Testing                     | **Vitest** + **React Testing Library** (unit/componente/aplicación/dominio), **Playwright** (E2E)                                                                                                   |
| Calidad                     | ESLint 10 (flat config), Prettier, Husky + lint-staged (pre-commit), suite completa en pre-push                                                                                                     |
| CI/CD                       | **Jenkins** (Jenkinsfile declarativo) + **SonarQube** (Quality Gate), gitleaks (secretos), auditoría de dependencias                                                                                |
| Contenedores                | **Docker** (una sola imagen: la API sirve también el SPA)                                                                                                                                           |
| Hosting demo                | **Render Free** (web service) + **Neon Free** (PostgreSQL)                                                                                                                                          |
| Asistentes IA de desarrollo | **Claude** (Claude Code: código, arquitectura, tests, documentación), **Gemini** (generación de audio de contenido), **ChatGPT** (información general y prompts), Antigravity en los primeros hitos |

**Restricciones de gobierno** (Project Constitution): sin AWS, sin proveedores inventados, coste cero, secretos
nunca en Git, una ADR por cada decisión relevante.

---

## 6. Arquitectura

**Estilo**: **monolito modular** con **Clean Architecture + Hexagonal (puertos y adaptadores)**. Sin
microservicios, Kubernetes, CQRS ni event sourcing (prohibidos salvo ADR que lo justifique: "no
sobreingeniería").

### Estructura del monorepo

```
apps/
  web/          React SPA (presentación)
  api/          Fastify: rutas, controladores, validación, seguridad, logs, sirve el SPA en producción
packages/
  domain/       Entidades, value objects, reglas de negocio (sin dependencias externas)
  application/  Casos de uso + puertos (interfaces de repositorios y servicios)
  data/         Adaptadores: repositorios Drizzle/PostgreSQL, Gemini, Hyperframes, email, CLIs de operador
  contracts/    DTOs y esquemas Zod compartidos entre web y api
  config/       Variables de entorno validadas al arrancar (con guardas de producción)
  ui/           Componentes React reutilizables
  shared/, testing/
content/
  languages/<pl|en>/  language.json, levels/a1..c2, vocabulary, phonetics, grammar, media (planes de vídeo)
  media/              vídeos y audios generados + manifest.json
tests/e2e/      Playwright
infrastructure/ docker, jenkins, deployment (smoke test, restore drill)
docs/           ADRs, arquitectura, seguridad, privacidad, producción, runbooks
```

### Flujo de dependencias

```
React UI → hooks → cliente API (tipos de packages/contracts)
  → API Fastify (rutas/controladores)
  → Casos de uso (packages/application)
  → Dominio (packages/domain)
  → Interfaces de repositorio
  → Adaptadores (packages/data) → PostgreSQL / Gemini / Hyperframes
```

Reglas duras: el dominio no importa infraestructura, React ni SDKs; React no contiene reglas de negocio; no hay
`if (languageId === 'pl')` en el código (el idioma es un dato).

### Bounded contexts (módulos)

Identity (auth), Profile, Content/Languages, Lessons, Exercises, Gamification, Vocabulary, Phonetics, Grammar,
Teaching (dashboard profesor), Email/Newsletter, Privacy, Media (audio/vídeo), Observability, **Coach (agente IA)**.

### Flujo del AI Coach (agente)

```
Navegador (/learn/coach) ── POST /ai-coach/messages {mensaje, modo, historial} + cookie de sesión
  → Fastify: verifyOrigin → authenticate → rate limit por usuario → esquema estricto
  → AskCoachUseCase (orquestador, máx. 4 rondas) — nivel MCER deducido del progreso real
  → AiAgentService (puerto) → GeminiAgentProvider → Gemini Interactions API (store: false)
  ← "llama a get_exercise_context(exerciseId)"
  → herramienta permitida en el modo + argumentos validados → caso de uso existente con el userId de la SESIÓN
  → resultado minimizado → Gemini → respuesta {answer, toolsUsed, practice?} filtrada por esquema
```

El modelo razona y redacta; **la aplicación** es dueña de la identidad, la autorización, los datos y la validación.

### Decisiones clave (ADRs destacadas, 34 en total)

- ADR-001/002: monolito modular + monorepo pnpm.
- ADR-005: PostgreSQL en Neon, sin AWS (inicialmente se pensó en DynamoDB y se descartó).
- ADR-006: sesiones en servidor + Argon2id + comprobación de `Origin` contra CSRF.
- ADR-007/018: contenido como JSON validado, idioma como dato.
- ADR-020: ejercicios con evaluadores por tipo e intentos "append-only".
- ADR-021: gamificación con libro mayor de puntos "append-only" y recompensas idempotentes.
- ADR-024: dashboard del profesor con vínculos gestionados por operador y modelo de lectura SQL acotado al profesor.
- ADR-026: privacidad — exportación, borrado de cuenta, logs de auditoría.
- ADR-027: endurecimiento de seguridad — rate limits por capas, proxies de confianza, CSP, tokens atómicos.
- ADR-028: una imagen Docker, la API sirve el SPA, migraciones como paso separado, guardas "fail-fast".
- ADR-029: observabilidad sin proveedor: logs JSON a stdout, métricas en proceso, errores del SPA same-origin.
- ADR-030: homepage con scroll sin librería de animación.
- ADR-031/032: medios "vídeo primero", generados offline, voz por personaje, escenas pedagógicas basadas en
  evidencia (recuperación activa, contraste, foco).
- ADR-033: referencia gramatical pública validada al arrancar.
- **ADR-034: AI Learning Coach** — agente Gemini con herramientas de solo lectura sobre los casos de uso
  existentes, sin id de usuario en ninguna herramienta, historial en el navegador, `store: false`, proveedor
  fake/gemini/disabled; voz aplazada.

---

## 7. Calidad, testing y CI/CD

- **TDD obligatorio** (RED → GREEN → REFACTOR) desde M1 hasta M20A. Estrategia 80/20: 80 % tests rápidos
  (unit/componente/aplicación/dominio con Vitest), 20 % E2E (Playwright) sobre flujos críticos.
- **Vitest**: ~**4.200 tests** pasando (último registro completo: 4.216 pass / 5 skipped / 0 fail), 333 ficheros de
  test.
- **Cobertura**: ~**94,6 % sentencias / 88,7 % ramas / 93,3 % funciones / 94,7 % líneas** (umbral exigido: 80 %
  líneas/sentencias/funciones, 75 % ramas).
- **Playwright**: **156 tests E2E** pasando (27 specs), incluido un proyecto `production-build` que comprueba la CSP
  y que la app no se puede embeber en un iframe (clickjacking); regresión visual opcional de la homepage.
  _Nota honesta_: al publicar el polaco A2–C2 (03-10) todos los niveles pasaron a "disponibles" y **17 tests E2E
  antiguos que esperaban "A1 es el único nivel / coming soon" quedaron desactualizados** (fallan igual con y sin
  M23; actualizarlos está pendiente).
- **AI Coach**: tests automáticos del dominio, orquestador, herramientas, adaptador y rutas (con proveedor _fake_)
  - **evaluación manual con Gemini real: 14/15 PASS, 1 N/A** (voz no implementada).
- **Tests guardianes** de arquitectura: inventario de rutas "deny by default" (toda ruta nueva debe clasificarse),
  prohibición de HTML crudo, prohibición de ramas por idioma, registro de tablas con datos personales.
- **Jenkins** (local, Docker en WSL): pipeline con lint → format → typecheck → tests + cobertura → build → E2E →
  SonarQube → Quality Gate → auditoría de dependencias → escaneo de secretos (gitleaks) → build y validación de imagen.
  **Primer pipeline completamente verde: build #17 (30-09-2026), Quality Gate OK.**
- **Husky**: pre-commit (lint-staged), pre-push (suite completa).
- **Smoke test desplegado**: 18/18 en la demo de Render.
- Simulacros: restauración de backup y rollback (N+1 → N) superados; caída de BD y recuperación probada.

## 8. Seguridad y privacidad

- Contraseñas con **Argon2id**; sesiones en servidor con cookie; verificación de email; reset con tokens de un solo
  uso consumidos de forma atómica (sin condiciones de carrera).
- **Rate limiting por capas**: por IP, por cuenta en login (10/15 min), por usuario en exportación/borrado (5/h),
  audio (30/h), vídeo (10/h).
- Cabeceras de seguridad y **CSP estricta** (solo `self`, sin inline ni eval, `frame-ancestors 'none'`), HSTS,
  Permissions-Policy, COOP, `no-store` por defecto en la API.
- Protección CSRF por comprobación de `Origin` / `Sec-Fetch-Site`.
- Validación de toda entrada con Zod (esquemas estrictos); los logs redactan secretos y nunca registran parámetros
  SQL con datos personales.
- **RGPD (base técnica, no certificación)**: exportación de datos, borrado inmediato de cuenta, newsletter con doble
  opt-in separada de los emails transaccionales, aviso de privacidad versionado. Los aspectos legales (base jurídica,
  plazos de retención, responsable del tratamiento) están marcados como **pendientes de revisión legal**.
- Auditoría de seguridad M16: modelo de amenazas, matriz de autorización, sin hallazgos críticos.
- **Seguridad de IA (M23)**: el prompt no es la barrera de seguridad; el código sí. Sin id de usuario en las
  herramientas (anti-IDOR), _prompt injection_ tratada como entrada no confiable y probada, la solución de un
  ejercicio solo se revela tras un intento, clave de Gemini solo en servidor, `store: false`, límites 20/h por
  usuario. Uso de Gemini por alumnos con la cuestión de **términos para menores de 18** aún sin resolver:
  registrado como **riesgo aceptado** por el autor (ADR-034), no como resuelto.

## 9. Despliegue y observabilidad

- Una **imagen Docker** (~240 MB): Fastify sirve API + SPA (mismo origen, sin nginx), assets con hash inmutables,
  compresión brotli/gzip, usuario no-root, sistema de ficheros de solo lectura.
- **Migraciones** como paso separado con bloqueo consultivo (10 conjuntos de migración).
- `/health` (vida) y `/ready` (`SELECT 1` en ≤2 s); arranque espera a la BD; apagado ordenado.
- Guardas de configuración: en `production` la app **se niega a arrancar** con proveedores falsos o configuración
  insegura (por eso la demo corre como `staging`).
- Demo: **https://www.verbysia.com** — Render Free (se duerme tras 15 min sin uso: la primera carga puede tardar
  ~1 min) + Neon Free. Despliegue automático al hacer push a `main`.
- **Dominio propio `verbysia.com`** (registrado en Namecheap, único coste del proyecto **[RELLENAR: precio/año]**):
  DNS de Namecheap → Render (dominio personalizado con HTTPS). El dominio raíz redirige a `www.verbysia.com`, que es
  el **origen canónico**: `APP_BASE_URL` apunta a él y la API solo acepta escrituras (login, registro, coach…) con
  ese `Origin`. La antigua URL `tfm-bic.onrender.com` sigue sirviendo la web pero **ya no permite iniciar sesión**
  (403): usar siempre `www.verbysia.com`.
- El dominio propio **desbloquea el email real**: un proveedor de email transaccional necesita un dominio
  verificado (SPF/DKIM). El **adaptador real con Resend ya está implementado** (`EMAIL_PROVIDER=resend`, commit
  `1d27aa9`): reintentos solo en errores transitorios, clave de idempotencia por mensaje, cabeceras
  `List-Unsubscribe` (RFC 8058) en el correo de marketing. **[CONFIRMAR: si Resend ya está activo en Render con
  `verbysia.com` verificado]**.
- **Observabilidad sin proveedor externo** (coste cero): logs JSON estructurados con `requestId`, métricas en memoria
  (`/internal/metrics` protegido por token), errores del navegador reportados al propio servidor.
- Hosting evaluado y descartado: AWS (coste), Railway (solo prueba de 5 $), Koyeb (pedía pago), GitHub Pages (solo
  estático).

## 10. Uso de la IA en el proyecto

1. **IA como herramienta de desarrollo**: Claude Code (agente) escribió código, tests, ADRs y documentación siguiendo
   _skills_ del proyecto (`.claude/skills/`: arquitectura, TDD, seguridad, anti-alucinación, testing, base de datos,
   Gemini, Hyperframes, RGPD…). Cada hito empezaba con una auditoría y terminaba con verificación y estado
   documentado en `.claude/current-state.md`.
2. **Regla anti-alucinación**: prohibido inventar APIs, versiones, precios o requisitos legales; lo no verificable se
   marca `UNKNOWN`/`PENDING`; las alternativas se presentan como opciones A/B/C.
3. **IA dentro del producto (generación de contenido)**:
   - Audio: **Gemini TTS**, una voz por personaje, audición previa midiendo el tono (Hz) para que encaje con el
     personaje dibujado.
   - Vídeo: guiones pedagógicos v2 validados (situaciones, personajes, foco, contraste, recuperación) → escenas SVG →
     **Hyperframes** las renderiza a MP4 → FFmpeg; subtítulos y transcripción.
   - Todo por **CLI de operador offline**, con límite de llamadas y respeto de la cuota diaria (~100 peticiones/día).
   - Arquitectura con interfaces `AudioGenerationService` / `VideoGenerationService` y adaptadores intercambiables
     (fake, disabled, real).
4. **IA dentro del producto (en tiempo real) — AI Learning Coach (M23)**: primer flujo en el que es el **alumno**
   quien dispara la IA. Un agente Gemini con _function calling_ que consulta los datos reales del alumno a través
   de 16 herramientas de solo lectura, adapta la explicación a su nivel MCER y crea prácticas validadas. Antes de
   programarlo se **verificaron contra la API real** los detalles dudosos de la documentación (p. ej. la identidad de
   una llamada llega como `id` y se devuelve como `call_id`; con `store: false` no hay id de interacción, así que el
   historial se reenvía). Ver sección 4 bis.

---

## 11. Cronología: pasos seguidos (hitos)

| Hito                                  | Fecha aprox. | Qué se hizo                                                                                                                                                                                           |
| ------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0** — Arquitectura y gobierno      | 15-09        | Project Constitution, ADRs iniciales, modelo de dominio, estrategia de contenido, riesgos, MVP y roadmap. Cambio de DynamoDB a PostgreSQL sin AWS.                                                    |
| **M1** — Monorepo base                | sep.         | pnpm workspaces, TypeScript estricto, ESLint/Prettier, Vitest, Playwright, Husky.                                                                                                                     |
| **M2** — CI/CD                        | sep.         | Jenkinsfile declarativo + SonarQube.                                                                                                                                                                  |
| **M3** — Autenticación                | sep.         | Registro, verificación email, login/logout, reset, sesiones, Argon2id, rate limits, CSRF por Origin.                                                                                                  |
| **M4** — Perfil de alumno             | sep.         | Perfil y catálogo de avatares.                                                                                                                                                                        |
| **M5** — Idiomas y contenido          | sep.         | Contenido JSON validado, `ContentRepository`, catálogo público, páginas `/learn`, test de idioma ficticio para probar extensibilidad.                                                                 |
| **M6** — Lecciones                    | sep.         | Lecciones como contenido, progreso por alumno.                                                                                                                                                        |
| **M7** — Ejercicios                   | sep.         | Tipos de ejercicio con registro de evaluadores, corrección en servidor, intentos append-only.                                                                                                         |
| **M8** — Gamificación                 | sep.         | Libro mayor de puntos, recompensas idempotentes, logros.                                                                                                                                              |
| **M9** — Vocabulario                  | sep.         | Categorías, búsqueda sin diacríticos, "Mi vocabulario".                                                                                                                                               |
| **M10** — Fonética                    | sep.         | Representaciones fonéticas por tema y progreso.                                                                                                                                                       |
| **M11** — Vídeo con Hyperframes       | 25-09        | `VideoGenerationService` + adaptador Hyperframes.                                                                                                                                                     |
| **M12** — Audio con Gemini            | 25-09        | `AudioGenerationService` + adaptador Gemini TTS.                                                                                                                                                      |
| **M13** — Dashboard del profesor      | 26-09        | Rol TEACHER, tabla `teacher_students`, modelo de lectura SQL, páginas `/teacher`, CLI de operador.                                                                                                    |
| **M14** — Email y newsletter          | 26-09        | Remitentes transaccional/marketing separados, doble opt-in (proveedor fake; el adaptador real con **Resend** llegó el 07-10).                                                                         |
| **M15** — Privacidad / RGPD           | 26-09        | Exportación de datos, borrado de cuenta, aviso de privacidad, limpieza de logs.                                                                                                                       |
| **M16** — Seguridad                   | 26-09        | Auditoría, CSP, cabeceras, rate limits por capas, tokens atómicos, inventario de rutas.                                                                                                               |
| **M17** — Producción                  | 27/28-09     | Imagen Docker, migraciones, guardas, simulacros; **demo desplegada en Render + Neon (smoke 18/18)**.                                                                                                  |
| **M18** — Observabilidad              | 29-09        | Logs JSON, métricas, errores del cliente, runbooks.                                                                                                                                                   |
| **M20A** — Homepage pública           | 29/30-09     | Historia con scroll en 10 escenas, SEO básico, desplegada.                                                                                                                                            |
| **CI local**                          | 30-09        | Jenkins + SonarQube en Docker: primer pipeline verde (#17), Quality Gate OK.                                                                                                                          |
| **M21** — Vídeo primero               | 30-09/01-10  | Pipeline real de generación (Gemini + Hyperframes + FFmpeg), medios versionados y servidos con Range; primeros vídeos en producción.                                                                  |
| **M22** — Vídeo pedagógico            | 01/03-10     | Guiones v2 (situaciones, personajes, recuperación), personajes SVG, voz por personaje; 5 vídeos A1 + audio de 29 palabras; **curso de inglés para hispanohablantes**; **polaco A2–C2 completo**.      |
| **Referencia gramatical** (ADR-033)   | 03-10        | Temas de gramática consultables (pl 21, en 19) con API pública y audio de números. _(En el repo también aparece etiquetada como "M23".)_                                                              |
| **Backlog de medios**                 | 03/07-10     | Generación diaria por lotes según cuota de Gemini (vídeos de inglés A1 completos, polaco A2–B2); pie de página con privacidad/datos/contacto.                                                         |
| **M23 — AI Learning Coach** (ADR-034) | 06/07-10     | Agente Gemini con 16 herramientas sobre los casos de uso existentes, 7 modos, página `/learn/coach` y accesos contextuales; verificación de la API real; evaluación 14/15 PASS; desplegado en Render. |

### Metodología de trabajo

- Cada hito en su propia rama `feature/<hito>` encadenada a la anterior; fusión a `main` por fast-forward.
- Flujo por hito: auditoría inicial → decisiones con el usuario (registradas en ADR) → TDD → verificación (lint,
  typecheck, tests, cobertura, E2E, build) → documentación de estado → despliegue.
- Decisiones que dependían del autor (hosting, proveedores, legal) se marcaban **PENDING USER DECISION** en lugar de
  asumirse.

---

## 12. Cifras para destacar

- 339 commits · 34 ADRs · ~24 hitos en ~3 semanas.
- ~4.200 tests unitarios/componente + ~156 E2E · cobertura ~94,6 %.
- 2 idiomas, 6 niveles MCER de polaco, 41 temas de gramática.
- 26 vídeos pedagógicos y ~650 audios generados con IA.
- AI Coach: 16 herramientas, 7 modos, evaluación real 14/15 PASS.
- Infraestructura de coste 0 € (hosting y BD gratuitos); único gasto: el dominio verbysia.com.
- Pipeline Jenkins verde con Quality Gate de SonarQube.

## 13. Limitaciones y trabajo futuro (ser honesto en la defensa)

- Email: el adaptador real (**Resend**) está programado y el dominio `verbysia.com` comprado; falta confirmar que
  está activo en Render con el dominio verificado (DNS en Namecheap). Hasta entonces la demo sigue en `staging`.
  **[CONFIRMAR: si los correos de verificación ya llegan de verdad]**.
- Render Free se duerme: primera carga lenta.
- Pendiente de revisión legal: textos RGPD, términos de Gemini para menores de 18, responsable del tratamiento.
- Pendiente revisión por hablante nativo del contenido polaco.
- Medios pendientes por cuota de Gemini (~14 vídeos de polaco B2–C2).
- Inglés solo en A1.
- AI Coach: solo texto (la **voz** con Gemini Live API está verificada como viable pero no implementada); el último
  ajuste del coach (presupuesto de tiempo por turno completo y aviso de espera) aún no está en `main`; depende de la
  cuota de la API de Gemini; términos de Gemini para menores = riesgo aceptado, pendiente de revisión legal.
- 17 tests E2E desactualizados tras abrir todos los niveles de polaco (pendiente actualizarlos).
- Futuro: coach por voz, más idiomas, repetición espaciada, rankings, app móvil, CMS de contenido, panel de
  administración, gestión de clases por el propio profesor (hoy los vínculos los crea un operador).

---

## 14. Credenciales de la cuenta de profesor (para la entrega)

El dashboard del profesor **ya está implementado y desplegado** (M13), pero **todavía no existe una cuenta TEACHER en
la base de datos de la demo (Neon)**. Hay que crearla antes de entregar:

1. En https://www.verbysia.com registrar dos cuentas de demostración (no usar datos personales reales):
   - Profesor: **[RELLENAR email]** / **[RELLENAR contraseña]**
   - Alumno de ejemplo: **[RELLENAR email]** / **[RELLENAR contraseña]** → hacer algunas lecciones y ejercicios para
     que el panel muestre datos.
2. Desde el repo, en **CMD**, con la cadena de conexión de Neon (no la compartas ni la subas a Git):
   ```
   set "DATABASE_URL=postgresql://...?sslmode=require"
   pnpm --filter @tfm-bic/data teacher:admin promote <emailProfesor>
   pnpm --filter @tfm-bic/data teacher:admin link <emailProfesor> <emailAlumno>
   ```
3. Entrar como profesor → aparece el enlace **Teacher** → `/teacher`.
4. Con la cuenta de alumno se puede probar también el **AI Coach** en `/learn/coach` (p. ej. fallar un ejercicio y
   pulsar "Explain my answer").

**Bloque para la entrega** (rellenar):

| Rol         | URL                              | Email      | Contraseña |
| ----------- | -------------------------------- | ---------- | ---------- |
| Profesor    | https://www.verbysia.com/teacher | [RELLENAR] | [RELLENAR] |
| Alumno demo | https://www.verbysia.com/login   | [RELLENAR] | [RELLENAR] |

> Recomendación: pon las credenciales en el **Word** (documento de entrega privado) y no en el README si el
> repositorio es público. Usa cuentas exclusivas de demo y cámbialas o bórralas tras la evaluación.

---

## 15. Cómo ejecutar en local (para el README)

Requisitos: Node.js 24, pnpm (vía `corepack enable`), PostgreSQL (o Docker para el Postgres de desarrollo).

```
pnpm install
pnpm dev            # web en http://localhost:5173 + api en http://localhost:3000
pnpm test           # Vitest
pnpm test:coverage  # con cobertura
pnpm test:e2e       # Playwright
pnpm check          # lint + format:check + typecheck + test + build
pnpm db:migrate     # migraciones (requiere DATABASE_URL)
pnpm content:validate
```

Variables de entorno: ver `.env.example` (nunca subir un `.env` real).

---

## 16. PROMPTS PARA CHATGPT / GEMINI

### 16.1 Prompt — README.md

```
Con el contexto anterior, escribe un README.md en español para el repositorio de GitHub de mi TFM.
Requisitos:
- Markdown compatible con GitHub, con estilo cuidado: título centrado con <div align="center">, subtítulo,
  badges de shields.io (TypeScript, React, Node.js, Fastify, PostgreSQL, Vite, Tailwind, Vitest, Playwright,
  Jenkins, SonarQube, Docker, Render, licencia), enlace destacado a la demo https://www.verbysia.com.
- Secciones: Descripción · Problema y solución · Funcionalidades (alumno / profesor / público) ·
  AI Learning Coach (sección propia, con diagrama mermaid de secuencia del agente y sus herramientas) · Demo ·
  Capturas (placeholders ![](docs/img/...)) · Stack (tabla) · Arquitectura (diagrama mermaid de capas y del
  monorepo) · Contenido disponible · IA en el proyecto · Calidad y testing (cifras) · Seguridad y privacidad ·
  Puesta en marcha local · Scripts · Despliegue · Documentación (enlaces a docs/adr, etc.) · Hoja de ruta ·
  Limitaciones · Autor.
- Usa emojis con moderación en los títulos, tablas, bloques <details> para lo largo y un índice al principio.
- NO incluyas credenciales. No inventes nada que no esté en el contexto; si falta un dato, deja [RELLENAR].
```

### 16.2 Prompt — Documento Word (resumen de los pasos seguidos)

```
Con el contexto anterior, redacta el contenido de un documento Word (8–12 páginas) titulado
"TFM-BIC — Memoria resumida del proceso de desarrollo", en español formal y académico.
Estructura:
1. Portada (título, autor [RELLENAR], máster, fecha 2026-10).
2. Índice.
3. Introducción y objetivos.
4. Problema y solución.
5. Metodología (hitos, ramas, TDD, ADRs, trabajo con agentes de IA y regla anti-alucinación).
6. Pasos seguidos: un apartado por hito (M0 → M23) con objetivo, qué se construyó y decisiones clave.
7. Arquitectura y stack (con tabla).
8. Calidad: testing, cobertura, CI/CD con Jenkins y SonarQube.
9. Seguridad, privacidad y despliegue.
10. Uso de la IA: (a) en el desarrollo, (b) generación offline de vídeo y audio, (c) AI Learning Coach
    en tiempo real (agente Gemini con herramientas, seguridad, evaluación 14/15).
11. Resultados y cifras.
12. Limitaciones y trabajo futuro.
13. Conclusiones.
Anexo A: Acceso a la demo y credenciales (tabla de la sección 14).
Anexo B: Índice de ADRs.
Indica dónde van tablas y figuras (diagrama de arquitectura, capturas). No inventes datos.
```

(Para el Word: pega el resultado en Word y aplica estilos Título 1/2/3 para que el índice se genere solo, o pide a
la IA el contenido en formato que puedas importar.)

### 16.3 Prompt — PowerPoint de 10 diapositivas

```
Con el contexto anterior, crea una presentación de 10 diapositivas en español para la defensa de mi TFM.
Para cada diapositiva dame: título, 3–5 viñetas cortas, sugerencia visual (diagrama/icono/captura) y notas
del orador (60–90 palabras). Estilo visual: papel de cuaderno claro, acento naranja (#F26A21 aprox.) y azul
marino, tipografía sans geométrica (tipo Bricolage Grotesque). Estructura:
1. Portada: TFM-BIC — aprender idiomas con vídeo, un coach de IA y gamificación (autor, máster, URL demo).
2. El problema.
3. La solución: qué es la aplicación.
4. Funcionalidades: alumno, profesor y público (dashboard del profesor destacado).
5. IA en el producto (1): vídeos pedagógicos y audio (Gemini TTS + Hyperframes, generación offline).
6. IA en el producto (2): AI Learning Coach — agente Gemini con 16 herramientas de solo lectura, 7 modos,
   nivel MCER deducido, sin acceso a datos de otros alumnos, evaluación real 14/15 PASS (diagrama del flujo).
7. Cómo lo construimos: metodología + línea de tiempo de hitos M0→M23 (gráfico), TDD, ADRs, agentes de IA,
   anti-alucinación.
8. Arquitectura técnica: monolito modular + Clean/Hexagonal, monorepo, stack.
9. Calidad, seguridad y despliegue: 4.200+ tests, 94 % cobertura, Jenkins + SonarQube, CSP, RGPD, Render+Neon gratis + dominio propio verbysia.com.
10. Resultados, limitaciones, futuro y demo en vivo (URL + credenciales de profesor solo si la presentación es privada).
No inventes datos fuera del contexto.
```

(Gemini en Google Slides o ChatGPT pueden generar el .pptx; si no, copia el contenido en una plantilla.)
