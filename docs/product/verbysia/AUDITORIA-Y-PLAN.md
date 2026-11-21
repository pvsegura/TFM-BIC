# Verbysia — auditoría inicial y plan de transformación

Fecha: 2026-11-21. Rama de trabajo: `chore/rename-to-verbysia` (renombrado TFM-BIC → VerbySia ya commiteado).
Objetivo: convertir Verbysia en una plataforma comercial y autónoma de **español para hablantes de polaco**, con
método propio (Método PUENTE), reto gratuito de 7 días, cursos A1–B2, suscripciones y pagos.

---

## 1. Estado actual

| Área                 | Lo que existe hoy                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producto             | Plataforma para aprender **polaco** (A1–C2, 64 lecciones/explicaciones) e **inglés** (A1–C2), explicados **en inglés**. Interfaz solo en inglés.                                                        |
| Hosting              | `https://www.verbysia.com` en Render Free (entorno `staging`) + Neon Free (PostgreSQL). Dominio en Namecheap. Email transaccional con Resend (dominio verificado).                                      |
| Monorepo             | pnpm 12, Node 24, TypeScript 6. Monolito modular Clean/Hexagonal: `apps/api`, `apps/web`, `packages/{domain,application,data,contracts,config,ui,shared,testing}`.                                      |
| Backend              | Fastify 5, Drizzle ORM 0.45, PostgreSQL. Casos de uso + puertos + repositorios. Rate limiting, CSRF por Origin, cabeceras de seguridad, logs estructurados, métricas.                                   |
| Frontend             | React 19, Vite 8, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind. Página de inicio con animación por scroll (en inglés).                                                        |
| Usuarios             | Registro, verificación de email, login (sesión en servidor, cookie `verbysia_session`), recuperación de contraseña, perfil, borrado y exportación de datos (RGPD). Roles `student`, `teacher`, `admin`. |
| Contenido            | **Ficheros JSON validados** en `content/languages/<idioma>/…` (ADR-007/018): lecciones, explicaciones, ejercicios, vocabulario, fonética, gramática. Cada ítem declara `instructionLanguage`.           |
| Aprendizaje          | Lecciones con progreso, ejercicios (opción múltiple, verdadero/falso, respuesta escrita) con intentos registrados, vocabulario con estados (nuevo/aprendiendo/dominado), fonética, gramática.           |
| Gamificación         | Puntos en un libro mayor, logros, rachas, gráfica semanal.                                                                                                                                              |
| Medios               | Audio TTS (Gemini, cuota ~100 llamadas/día) y vídeos de lección renderizados offline con Hyperframes.                                                                                                   |
| IA                   | Coach de IA (ADR-034) con herramientas sobre el contenido y el alumno.                                                                                                                                  |
| Profesores           | Panel de profesor (alumnos, progreso). No encaja con el modelo 100 % autónomo; se conserva pero sin exponerlo en la navegación pública.                                                                 |
| Email                | Emails transaccionales y newsletter con doble opt-in y preferencias.                                                                                                                                    |
| Pagos/licencias      | **No existen.** Ni proveedor, ni productos, ni licencias, ni control de acceso premium.                                                                                                                 |
| Administración       | **No existe panel de administración.** El rol `admin` existe en el dominio, pero no tiene pantallas.                                                                                                    |
| Repetición espaciada | **No existe algoritmo SRS.** El vocabulario solo tiene estados manuales.                                                                                                                                |
| SEO                  | `robots.txt`, metadatos básicos y Open Graph en inglés. Sin sitemap, sin datos estructurados y sin páginas por nivel indexables en polaco.                                                              |
| Calidad              | ~4 200 tests unitarios y ~156 E2E (último estado conocido). CI con Jenkins y SonarQube en local.                                                                                                        |

## 2. Qué se reutiliza

- **Toda la plataforma técnica:** autenticación, sesiones, RGPD, email, rate limiting, observabilidad, despliegue.
- **El modelo de contenido por idioma:** un curso de español explicado en polaco es `languageId: "es"` +
  `instructionLanguage: "pl"`, sin cambiar la arquitectura.
- **Lecciones, ejercicios, vocabulario, fonética, gramática, progreso y gamificación.** Se amplían; no se reescriben.
- **Pipeline de audio y vídeo:** sirve para el español con narradores nativos.
- **Coach de IA:** se reorienta a la metodología PUENTE, con explicaciones en polaco y límites de uso.

## 3. Problemas detectados

1. La interfaz está escrita en inglés **directamente en los componentes**, sin sistema de traducciones.
2. No hay forma de cobrar ni de restringir contenido premium en el servidor.
3. El contenido solo se edita mediante commits: no hay CMS.
4. No hay repetición espaciada real.
5. Los cursos existentes son para angloparlantes (polaco/inglés) y no encajan con el nuevo público.
6. Render Free se duerme tras 15 minutos: no es aceptable para un producto de pago (primera carga lenta y webhooks de pago con latencia).
7. Lint local con 6 errores en `.media-build/` (carpeta sin seguimiento en git; no afecta al producto).

## 4. Decisiones tomadas

| Decisión                  | Elección                                                                                                                                                                | Motivo                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursos de polaco e inglés | **Se ocultan** (`isActive: false`), no se borran.                                                                                                                       | No destruir contenido ni progreso de usuarios; se pueden reactivar para otros mercados.                                                                                          |
| Curso nuevo               | `content/languages/es/`, explicado en polaco (`instructionLanguage: "pl"`).                                                                                             | Reutiliza el modelo existente.                                                                                                                                                   |
| Idioma de la interfaz     | Capa i18n con catálogos de mensajes; **polaco por defecto**.                                                                                                            | Requisito del brief y base para futuros mercados (otras lenguas maternas).                                                                                                       |
| Proveedor de pagos        | **Stripe** (Checkout + Billing + webhooks firmados). Métodos: tarjeta, BLIK y Przelewy24 (P24 solo para pagos únicos).                                                  | Ver §6.                                                                                                                                                                          |
| Repetición espaciada      | **SM-2 adaptado** con 4 respuestas (Nie pamiętam / Trudne / Dobrze / Łatwe), tarjetas por usuario en PostgreSQL.                                                        | Algoritmo documentado, determinista, fácil de auditar y de probar. FSRS es mejor a largo plazo, pero necesita historial para ajustar parámetros: se deja preparada la migración. |
| Licencias                 | Tabla `entitlements` derivada de compras/suscripciones, consultada en el servidor en cada ruta de contenido premium.                                                    | Nunca depender de ocultar botones en el frontend.                                                                                                                                |
| Administración            | **V1:** panel admin de productos, precios, licencias, usuarios, compras y métricas. **V2:** editor de contenidos en base de datos (importador desde los JSON actuales). | El contenido piloto y el modelo de unidades PUENTE deben asentarse antes de congelar el esquema del CMS.                                                                         |
| Panel de profesor         | Se conserva sin exponerlo en la navegación.                                                                                                                             | Modelo 100 % autónomo; no se destruye funcionalidad.                                                                                                                             |
| Hosting                   | Pasar a un plan de pago sin suspensión **antes de cobrar** (decisión y coste del propietario).                                                                          | Los webhooks y la experiencia de compra no pueden depender de un servidor dormido.                                                                                               |

## 5. Arquitectura propuesta (resumen)

```
content/languages/es/              curso de español explicado en polaco
  language.json                    niveles A1–B2 (A1 disponible; A2–B2 "coming soon")
  curriculum.json                  unidades por nivel, con objetivos y fases PUENTE
  levels/a1/content|exercises      lecciones y ejercicios
  vocabulary/                      categorías con lema, traducción PL, imagen y pista mnemotécnica
  challenges/7-dni.json            el reto: 7 días → lecciones, ejercicios, misión diaria

packages/domain
  learning/puente-phase.ts         P-U-E-N-T-E como tipo de dominio
  memory/sm2.ts                    algoritmo de repaso (puro)
  commerce/                        Product, Price, Entitlement, matriz de permisos
packages/application
  memory/  commerce/  admin/       casos de uso
packages/data
  memory_cards, memory_reviews     tarjetas y repasos por alumno
  products, prices, purchases, subscriptions, entitlements, payment_events (idempotencia)
apps/api
  /memory/*  /checkout/*  /webhooks/stripe  /admin/*   (admin: rol + rate limit + auditoría)
apps/web
  i18n/pl  páginas públicas (inicio, metoda, kursy, wyzwanie-7-dni, cennik, faq, kontakt, legal)
  panel del alumno, entrenador de memoria, checkout, panel admin
```

### Matriz de permisos (validada en el servidor)

| Licencia          | Reto 7 días | Unidad de muestra A1 | Curso A1 | Curso A2 | B1 / B2 | Entrenador de memoria           | Coach IA          |
| ----------------- | ----------- | -------------------- | -------- | -------- | ------- | ------------------------------- | ----------------- |
| `FREE`            | ✔           | ✔                    | –        | –        | –       | limitado (vocabulario gratuito) | –                 |
| `CHALLENGE_7D`    | ✔           | ✔                    | –        | –        | –       | vocabulario del reto            | –                 |
| `COURSE_A1`       | ✔           | ✔                    | ✔        | –        | –       | vocabulario A1                  | –                 |
| `COURSE_A2`       | ✔           | ✔                    | –        | ✔        | –       | vocabulario A2                  | –                 |
| `PREMIUM_MONTHLY` | ✔           | ✔                    | ✔        | ✔        | ✔       | completo                        | con cuota mensual |
| `PREMIUM_YEARLY`  | ✔           | ✔                    | ✔        | ✔        | ✔       | completo                        | con cuota mensual |

Las licencias de suscripción caducan con `current_period_end` + un periodo de gracia corto para pagos fallidos.
Las de curso individual son de acceso indefinido mientras exista el servicio (condición que debe revisar un asesor legal).

## 6. Pagos: comparación y elección

| Criterio                  | Stripe                                                                                                                                                        | PayU                                                            | Przelewy24 (directo)                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| Tarjetas, BLIK, P24       | Sí (BLIK y P24 solo en PLN; P24 en PLN/EUR)                                                                                                                   | Sí                                                              | Sí                                          |
| Suscripciones recurrentes | Stripe Billing con tarjeta; **BLIK recurrente** admitido desde 2026, con activación a nivel de cuenta y solo en los bancos que lo soportan (8 al anunciarse). | Pagos recurrentes con tarjeta (requiere contrato específico)    | No es un sistema de suscripciones           |
| Comisiones                | Según fuentes de terceros: BLIK ≈1,4 %, tarjeta EEE algo menos, más una cuota fija — **pendiente de confirmar en stripe.com/pl/pricing**.                     | BLIK ≈0,99 % según fuentes de terceros — pendiente de confirmar | Pendiente                                   |
| Integración con el stack  | SDK oficial de Node, Checkout alojado, portal de cliente, webhooks firmados, modo test completo                                                               | API REST, menos tooling para suscripciones                      | Requiere construir la lógica de suscripción |
| IVA/OSS                   | Stripe Tax opcional (coste adicional)                                                                                                                         | No                                                              | No                                          |

**Elección: Stripe.** Es el único que cubre a la vez pago único, suscripción, portal de cancelación, reembolsos,
webhooks y modo de pruebas con un solo proveedor y sin construir facturación propia. PayU puede ser algo más barato
en BLIK, pero exigiría desarrollar y mantener la lógica de suscripción. Se revisará si el volumen lo justifica.

Flujo: producto → Checkout de Stripe (precio final, condiciones y consentimiento para el suministro inmediato de
contenido digital) → webhook firmado `checkout.session.completed` / `invoice.paid` / `customer.subscription.*`
→ tabla `payment_events` (idempotencia por id de evento) → licencia → email de confirmación. **La URL de éxito
nunca desbloquea nada.**

## 7. Precios: análisis de la hipótesis

Referencias (precios variables y promociones frecuentes; comprobar en las webs oficiales antes de lanzar):

- **Babbel (PL):** anual ≈ 240–360 zł; acceso de por vida ≈ 900–1 349 zł; mensual ≈ 59–79 zł según la fuente.
- **Busuu:** Premium ≈ 58 €/año (≈ 250 zł).
- **Duolingo Super:** ≈ 90 €/año (≈ 385 zł).
- **Cursos de academia con profesor** (A1 de 54–60 h): 6 400–8 600 zł. No es comparable con un producto autónomo.
- TRADUES, Fiszkoteka y SuperMemo: no se encontraron precios fiables en esta investigación. Pendiente.

| Producto           | Hipótesis | Recomendación                         | Motivo                                                                                                                                                                            |
| ------------------ | --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free + reto 7 días | 0 zł      | 0 zł                                  | Captación. Una versión premium del reto no compensa al principio: el reto debe demostrar el valor sin fricción.                                                                   |
| Premium mensual    | 49 zł     | **49 zł**                             | Por debajo del mensual de Babbel y por encima de las apps generalistas; razonable para un producto especializado.                                                                 |
| Premium anual      | 399 zł    | **349 zł** en el lanzamiento          | 399 zł supera a Babbel y Busuu anuales mientras el catálogo sea solo A1. Con 349 zł el ahorro frente a 12 × 49 = 588 zł es real (≈ 40 %). Subir a 399 zł cuando A2 esté completo. |
| Curso A1 / A2      | 179 zł    | **149 zł**, acceso indefinido         | Debe competir con un anual de 349 zł: el curso individual es para quien no quiere suscripción.                                                                                    |
| Curso B1 / B2      | 199 zł    | 179 zł                                | Mismo razonamiento; publicar solo cuando exista el contenido.                                                                                                                     |
| Pack A1 + A2       | 299 zł    | 249 zł                                | Coherente con 2 × 149 zł.                                                                                                                                                         |
| Pack completo      | —         | 499 zł (cuando existan los 4 niveles) | Por debajo de la suma (656 zł) y por encima de un año de Premium.                                                                                                                 |

Reglas: sin precios tachados inventados, sin descuentos ficticios, precio final con IVA visible y condiciones de
renovación y cancelación junto al botón de compra. **No se vende ningún nivel que no exista todavía.**

## 8. Aspectos legales y fiscales (para revisión profesional)

- Ustawa o prawach konsumenta (t.j. Dz.U. 2026 poz. 1244), art. 38: para contenido digital online, el derecho de
  desistimiento solo se pierde si el consumidor **consiente expresamente** el inicio del suministro antes de que
  acabe el plazo **y** ha sido informado de esa pérdida; además debe recibir confirmación. Una casilla por sí sola
  no basta si falta la información o la confirmación.
- Pendiente con asesor: regulamin (condiciones de venta), suscripciones y renovación automática, facturación,
  IVA (posible OSS para ventas a otros países de la UE), forma jurídica del vendedor, datos del vendedor en la web.
- Los textos legales que se redacten llevarán la marca **«BORRADOR — requiere revisión legal»**.

## 9. Marca «Método PUENTE»

No se encontró ningún registro de marca «Método Puente» para enseñanza de idiomas en la búsqueda web (solo un
producto de Hotmart sin relación y el concepto pedagógico genérico de «the bridge» en educación bilingüe). Eso **no
sustituye** una búsqueda en EUIPO (eSearch plus), UPRP (Polonia) y OEPM (España), clases 41 y 9. Pendiente del
propietario antes del uso comercial.

## 10. Plan de ejecución

Orden de la primera versión comercial (V1):

| #   | Bloque                                                                           | Estado                             |
| --- | -------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Auditoría, investigación y plan (este documento)                                 | hecho                              |
| 2   | Curso `es` en el catálogo; polaco e inglés ocultos; currículo A1–B2              | en curso                           |
| 3   | Método PUENTE documentado (fases, evidencia, matriz de dificultades PL→ES)       | en curso                           |
| 4   | Contenido piloto: reto 7 días + unidad 1 de A1 (explicaciones en polaco)         | en curso                           |
| 5   | i18n polaco + nueva página de inicio, método, cursos, reto, precios, FAQ         | pendiente                          |
| 6   | Entrenador de memoria con SM-2 (BD, API y UI)                                    | pendiente                          |
| 7   | Productos, licencias y control de acceso en el servidor                          | pendiente                          |
| 8   | Stripe en modo test (Checkout, webhooks, portal de cliente)                      | pendiente: requiere claves de test |
| 9   | Panel admin V1 (productos, licencias, usuarios, compras, MRR/ARR/churn)          | pendiente                          |
| 10  | Emails en polaco y automatizaciones (bienvenida, reto, renovación, pago fallido) | pendiente                          |
| 11  | SEO polaco: sitemap, datos estructurados, metadatos, páginas por nivel           | pendiente                          |
| 12  | Borradores legales: regulamin, privacidad, cookies                               | pendiente                          |
| 13  | Pruebas completas (el propietario ha pedido no ejecutarlas por ahora)            | pendiente                          |
| 14  | Lanzamiento: hosting de pago, Stripe en modo live, revisión legal                | pendiente                          |

V2: editor de contenidos en base de datos, A2 completo, coach IA PUENTE con cuotas, B1/B2.

## 11. Lo que necesitaré del propietario (cuando toque)

1. Claves de **Stripe en modo test** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) y, más adelante, la activación de BLIK recurrente en la cuenta.
2. Datos del vendedor (forma jurídica, NIP/NIF, dirección) para condiciones de venta y facturas.
3. Revisión de un nativo polaco de los textos de la interfaz y de las explicaciones.
4. Decisión y coste del hosting sin suspensión.
5. Búsqueda de marca en EUIPO/UPRP.

## Fuentes

- Stripe — BLIK recurrente: https://docs.stripe.com/payments/blik/recurring-payments
- Stripe — Billing con BLIK: https://docs.stripe.com/changelog/dahlia/2026-04-22/stripe-billing-blik-recurring-payments
- Stripe — Przelewy24: https://docs.stripe.com/payments/p24
- BLIK — anuncio de pagos recurrentes: https://www.blik.com/en/use-openai-and-pay-with-blik-blik-recurring-payments-now-available-for-chatgpt-users
- Stripe vs PayU (terceros): https://freenance.io/przedsiebiorczosc/stripe-vs-payu-2026-co-wybrac-dla-firmy-koszty-prowizje-integracja/
- Babbel (precios PL, terceros): https://www.picodi.com/pl/babbel · https://wojciechmatula.com/babbel-recenzja/
- Busuu/Duolingo (precios EUR, terceros): https://sprachen-lernen-bild.compado.com/busuu-vs-duolingo/
- Cursos A1 con profesor (PARP): https://uslugirozwojowe.parp.gov.pl/
- Ley de derechos del consumidor, art. 38: https://www.lexlege.pl/ustawa-o-prawach-konsumenta/art-38/ · guía UOKiK: https://prawakonsumenta.uokik.gov.pl/pliki/rewolucja-konsumencka-2023-przewodnik-po-zmianach-w-prawie-konsumenckim.pdf
