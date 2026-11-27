# Verbysia — contexto para continuar el proyecto (2026-11-26)

Documento de traspaso para retomar el trabajo en otra sesión de Claude Code (app de escritorio o
CLI) exactamente donde se dejó. Léelo entero antes de tocar nada.

## 1. Qué es el proyecto

- **Verbysia** (www.verbysia.com): plataforma comercial de autoestudio que enseña **español a
  hablantes de polaco**. Empezó como TFM (repo `TFM-BIC`) y el 2026-11-21 pasó a producto.
- Interfaz en polaco (por defecto), inglés y español, con selector de banderas.
- Metodología propia: **Método PUENTE**, con 8 fases por unidad: percibir (perceive), conectar
  (connect), estructurar (structure), sonar (sound), cultura (culture), transformar (transform),
  expresar (express) y repasar (review). Documentos: `docs/product/verbysia/METODO-PUENTE.md`,
  `CURRICULO.md`, `AUDITORIA-Y-PLAN.md`, `PLAN-MODELO-TRADUES.md`, `PLAN-LIBROS.md` y
  `LIBRO-IMPRESION.md`.
- Hay un reto gratuito de 7 días (unidad 0) y después un curso de pago (Stripe, en modo test).
- Cursos de la plataforma:
  - **es-pl** «Hiszpański dla Polaków»: el curso principal, de pago.
  - **pl-es** «Polaco para hispanohablantes»: curso nuevo con la misma metodología PUENTE y sus
    PDF. Por ahora es gratuito (`access: "free"`); falta decidir si será de pago.
  - **pl-en** «Polish for English speakers»: el curso antiguo. Se mantiene, pero hay que adaptarlo
    a PUENTE más adelante.
  - **en-es** «Inglés para hispanohablantes»: el curso antiguo, gratuito.
- **Forma de trabajo acordada:** se alterna una lección de polaco para hispanohablantes con una de
  español para polacos.

## 2. Reglas del usuario (obligatorias)

- **El contenido tiene que estar muy cuidado en todos los niveles.** Los libros deben llegar a las
  páginas previstas creando contenido real, nunca rellenando. El usuario propuso crucigramas
  (autodefinidos), vocabulario temático, tablas de conjugación, verbos irregulares, pronombres y
  derivaciones.
- **Imágenes: usar Gemini, no Higgsfield.** Las ilustraciones no deben contener texto, mapas ni
  carteles.
- **Subir (push):** solo cuando el usuario lo diga explícitamente en ese turno («sube con
  --no-verify»). La autorización no se arrastra a turnos siguientes. Hace falta `--no-verify`
  porque unos 370 tests web antiguos esperan la interfaz en inglés.
- **Commits locales en cada paso**, terminados con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Secretos:** nunca leer los `.env` ni mostrar claves. La clave de Gemini la lee solo el script,
  desde `.env.media.local` (fuera de git). Los secretos de Stripe nunca se escriben en el chat.
- **Pagos reales desactivados** hasta que exista una cuenta de Stripe polaca y se revisen los
  textos legales. No se abrirá cuenta española.
- **El curso no debe mandar al alumno a apuntarse a otra escuela o curso.** Las misiones usan
  situaciones neutras: hotel, oficina, intercambio, etc.
- **Carpeta `/docs`:** nunca dejar archivos sueltos en la raíz; usar subcarpetas temáticas.
- **Comunicación:** el usuario escribe en español. Hay que avisar si un test falla y no afirmar
  nunca que algo se ejecutó si no se hizo.
- **No revisar Jenkins ni Sonar** salvo que el usuario lo pida.

## 3. Stack y despliegue

- Monorepo pnpm, Node 24, TypeScript 6:
  - `apps/api`: Fastify.
  - `apps/web`: React + Vite + TanStack Query + Tailwind.
  - `packages/contracts`: Zod.
  - `packages/domain`, `packages/application`, `packages/data`: Drizzle + Neon Postgres.
- Arquitectura limpia/hexagonal.
- **Guardia contra ramas por idioma**
  (`packages/data/src/content/no-language-branching.test.ts`): el código de producción no puede
  contener nombres de idioma ni comparar códigos literales. Solo se permite en `i18n/`, y los datos
  van en ficheros de contenido.
- **Rama de trabajo:** `chore/rename-to-verbysia`. Se avanza `main` en fast-forward, y **Render
  despliega `main`** automáticamente con Docker (`infrastructure/docker/app.Dockerfile`). El
  `.dockerignore` excluye `infrastructure` salvo `!infrastructure/web`.
- Las migraciones de producción las ejecuta el usuario: `pnpm.cmd db:migrate` con la URL
  `tfm_migrator` de Neon.
- Cada tipo de fichero estático nuevo en `apps/web/public` debe añadirse a `CONTENT_TYPES` en
  `apps/api/src/web/web-app.ts`; si no, el servidor no arranca.
- **Particularidades de la máquina (Windows):**
  - No hay Python; usar node para los scripts.
  - Los heredoc con apóstrofes fallan: escribir los scripts con la herramienta Write.
  - Los argumentos no ASCII en la shell se estropean.
  - El pre-commit ejecuta lint-staged y el pre-push ejecuta todo Vitest.

## 4. Modelo de contenido (ficheros, no BD)

- `content/languages/{lang}/language.json`. Polaco tiene `"courses": ["en", "es"]`: la primera
  entrada es el curso por defecto.
- Lecciones en `content/languages/{lang}/levels/{level}/content/*.json`, con estos campos:
  - `id`, `order`, `unit`, `instructionLanguage`, `title`, `description`, `blocks` (máximo 150
    bloques) y, opcionalmente, `access`.
  - Tipos de bloque: `section` (con `phase`), `explanation`, `example`, `dialogue`, `table` (sin
    celdas vacías; usar «—»), `comparison`, `pitfall`, `reading`, `culture`, `mission`, `summary`
    e `image`. Para `image`, el asset debe estar en `content/images/` y en `credits.json`.
- Ejercicios en `.../exercises/*.json`. Un fichero por ejercicio, con
  `book: {unit, number, phase, lines?}`.
  - Tipos: `multiple-choice`, `true-false`, `text-answer`, `matching` (izquierda y derecha únicas),
    `ordering` (elementos únicos), `gap-fill` (un `___` por hueco) y `open-writing` (cuenta como
    hecho si respeta el número de palabras).
  - Los números de cuaderno son únicos por (idioma, idioma de instrucción, nivel).
  - Los intentos se guardan en modo solo-añadir; **no cambiar el id** de un ejercicio publicado.
- Validación: `pnpm content:validate`. Tests de contenido:
  `pnpm --filter @verbysia/data exec vitest run src/content`.
- Varios cursos por idioma:
  - Las rutas `/content` y `/lessons` aceptan `instruction`; `resolveCourse(language, requested)`
    está en domain.
  - La web envía el curso elegido: `apps/web/src/services/course-choice.ts` lo guarda en
    localStorage con la clave `verbysia-course:{lang}`. Si no hay elección, se usa el idioma de la
    interfaz.
  - La página «Nuestros cursos» (`other-courses-page.tsx`) lista los cursos de
    `apps/web/src/i18n/courses.ts`, cada uno con el nombre en el idioma de quien lo estudia.
- Enlaces cortos (para los QR de los libros): `GET /k/{lang}[-{instr}]-{level}/{unit}[/{phase|number}]`
  responde con un 302.
- Índice de páginas de los libros: `GET /books/:course`, a partir de `content/books/{course}.json`
  (por ejemplo `es-a1.json` o `pl-es-a1.json`). Si no existe, prueba `{lang}-{level}`.

## 5. Flujo para escribir una unidad

1. Escribir la lección JSON completa con la plantilla PUENTE. Referencias:
   `es-unit-5-my-day.json` y `es-unit-6-likes.json` (español), `pl-es-unit-1-hello.json` y
   `pl-es-unit-1-countries.json` (polaco). Estructura:
   - section perceive + explicación de las 3 escuchas + imagen + diálogo de 10–13 líneas;
   - section connect + tablas de vocabulario + explicación «Łącz i zapamiętuj» o «Une y memoriza»
     (asociaciones);
   - section structure + explicaciones, tablas, comparación con la L1 y 2–5 `pitfall`;
   - section sound;
   - section culture + `reading` + `culture`;
   - section express + `mission` (6 pasos) + `summary` (frases y canDo).
2. Escribir un script de ejercicios en `infrastructure/content-authoring/` usando `ex-kit.mjs`:
   - `kit(unit, lessonId, startOrder, {language, instruction, level})` y los métodos
     `mc/tf/ta/match/order/gap/write`, más `save()`;
   - `renumber(unit, {language, instruction})` asigna los números del cuaderno en orden PUENTE;
   - `planImages([...])` añade el prompt a `content/images/plan.json`.
   - Cada lección lleva unos 35 ejercicios repartidos entre todas las fases.
3. Ejecutar `node infrastructure/content-authoring/<script>.mjs`.
4. Generar la imagen (unos 0,03 $ cada una):
   `packages/data/node_modules/.bin/tsx infrastructure/images/generate-images.mts --limit 1`.
   Modelo `gemini-3.1-flash-lite-image`; los créditos se añaden solos. **Mirar la imagen** antes de
   aceptarla (sin texto inventado).
5. Ejecutar `npx prettier --write` sobre los ficheros nuevos, luego `pnpm content:validate` y los
   tests de contenido.
6. Generar los libros:
   - español: `packages/data/node_modules/.bin/tsx infrastructure/book/generate-books.mts --level a1`;
   - polaco: añadir `--language pl --instruction es`.
   - Salida en `infrastructure/book/out/a1/` (Paged.js + puppeteer-core + iconos Tabler; textos del
     libro por idioma en `infrastructure/book/book-i18n.mts`).
   - Vista previa de páginas: `cd infrastructure/book/out && ../../../packages/data/node_modules/.bin/tsx preview.mts a1/<fichero>.html 74,75 <prefijo>`.
     El número de página se busca en `content/books/*.json`.
7. Commit local.

## 6. Estado actual

### Español para polacos (A1 = 13 unidades: 0 = reto de 7 días y 1–12, dos lecciones por unidad)

- **Hechas con la plantilla completa:**
  - unidad 1 (alfabeto, países, números);
  - unidad 2 (familia, cumpleaños);
  - unidad 3 (lugares, direcciones);
  - unidad 4 (bar, restaurante);
  - unidad 5 (mi día, la semana);
  - **unidad 6A «¿Qué te gusta?»** (`es-unit-6-likes`, order 150);
  - **unidad 6B «¿Quedamos?»** (`es-unit-6-plans`, order 155): deportes, invitar/aceptar/rechazar,
    poder/querer/saber (no sé vs no puedo), quedar/quedarse, enlace entre palabras. Unidad 6: 83
    ejercicios. `ir a + infinitivo` se dejó para la unidad 9, como dice el currículo;
  - repaso de las unidades 1–3.
- **Pendientes:**
  - unidades 7–12 (ahora son lecciones finas de unos 10 bloques que hay que reescribir: shopping,
    home, weather, getting-around, health…);
  - unidad 0;
  - repasos tras las unidades 6, 9 y 12;
  - examen final.
- Hay apéndices de gramática (17 temas) y de vocabulario temático (hotel, viajes, profesiones,
  comida, cuerpo, calendario, adjetivos), además de crucigramas.
- **Unidad 7A** «¿Me lo pruebo?» (`es-unit-7-shopping` reescrita, order 160): ropa, colores, este/ese/aquel,
  quedar, lo/la/los/las, números hasta 1000.
- **Unidad 7B** «¿Me pone un kilo?» (`es-unit-7-market`, order 165): Mercado Central de Valencia,
  cantidades con de, mucho/poco, otro, precios con céntimos, hiato. Unidad 7: 83 ejercicios.
- **Unidad 8A** «Se alquila piso» (`es-unit-8-home` reescrita, order 170): hay/está, preposiciones de lugar,
  comparativos, primer/tercer piso, la x.
- **Unidad 8B** «¿Qué estás haciendo?» (`es-unit-8-moving-in`, order 175): estar + gerundio, ser/estar,
  ¡Qué…! Unidad 8: 80 ejercicios.
- **Unidad 9A** «¿Qué tiempo va a hacer?» (`es-unit-9-weather` reescrita, order 180): hace/está/hay,
  tengo frío, ir a + infinitivo, acentos regionales.
- **Unidad 9B** «¿Qué vas a hacer en vacaciones?» (`es-unit-9-holidays`, order 185): pensar / tener ganas de /
  me gustaría, a / en / de en viajes, -ísimo. Unidad 9: 80 ejercicios.
- Libros A1: Podręcznik **152 páginas** y Zeszyt **124**. Objetivo: unas 170–190 y 160–180.

### Polaco para hispanohablantes (pl-es)

- **Al mismo nivel que español (unidades 1–6 con la plantilla completa + repaso 1–3):**
  - 1A «Cześć! Mam na imię…» (order 1080) y 1B «Skąd jesteś?» (1085);
  - 2A «To moja rodzina» (1090) y 2B «Wszystkiego najlepszego!» (1095: números hasta 100, fechas);
  - 3A «Co jest w okolicy?» (1100: jest/są, nie ma, w/na + locativo) y 3B «Jak dojść do…?» (1105:
    iść/jechać, do + genitivo, transporte); repaso 1–3 (24 ejercicios, fase review, con la 3B);
  - 4A «Poproszę kawę» (1110: acusativo, chciałbym/chciałabym, złoty) y 4B «Co pan poleca?» (1115:
    jeść/pić, dieta, smakować);
  - 5A «Mój dzień» (1120: się, la hora) y 5B «W tym tygodniu» (1125: días, musieć/móc);
  - 6A «Co lubisz robić?» (1130: lubić/podobać się, grać w/na) y 6B «Umówmy się!» (1135:
    umieć/wiedzieć/znać/móc, iść na).
  - 7A «Ile kosztuje ta kurtka?» (1140: szukam + genitivo, ten/tę, pasować, go/ją/je) y 7B «Poproszę kilo
    ziemniaków» (1145: cantidades + genitivo singular y plural, deka, 2–4 / 5+); unidad 7: 69 ejercicios.
  - 8A «Parapetówka» (1150: stoi/leży/wisi, nad/pod/między + instrumental, comparativos -szy,
    na drugim piętrze) y 8B «Przeprowadzka» (1155: imperativo ty/wy, postawić/położyć/powiesić,
    właśnie + presente); unidad 8: 70 ejercicios.
  - 9A «Jaka będzie pogoda?» (1160: pogoda, jest mi zimno, będzie + infinitivo, gwara góralska) y 9B «Gdzie jedziesz
    na wakacje?» (1165: nad morze / w góry, futuro perfectivo, na + duración, jechać/jeździć); unidad 9: 68.
  - Personajes fijos: Javier (español en una oficina de Cracovia), Kasia, Tomek, Ola, Lucía.
  - Ejercicios por unidad: 1 = 55, 2 = 76, 3 = 95 (con repaso), 4 = 73, 5 = 71, 6 = 72.
- **Apéndices explicados en español:** vocabulario temático (15 categorías `es-*`, 389 entradas,
  `pl-es-vocabulary-a1.mjs`) y gramática (20 temas `pl-es-ref-*`, `pl-es-grammar-a1.mjs`).
  Los crucigramas de polaco mantienen Ą, Ę, Ł… (`CROSSWORD_KEEPS_LETTERS` en `book-i18n.mts`).
- **Libros pl-es A1 (para Lulu):** Podręcznik **148 páginas** y Zeszyt **120**.
- Siguiente: repasos de las unidades 4–6 y 7–9 en los dos cursos (fase review, como el de 1–3); luego
  10A de español (reescribir `es-unit-10-getting-around`, order 190) y 10A de polaco (order 1170).
- Después: unidades 8–12 en los dos cursos (en español hay que reescribir las lecciones finas),
  repasos tras las unidades 6, 9 y 12, unidad 0 y examen final.
- Diálogos de la 1A (recepción de hotel) y la 1B (primer día en la oficina) ya están en contextos
  neutros (2026-11-27).
- Las respuestas aceptadas con diacríticos polacos deben ir primero (lo exige
  `shipped-exercises.test.ts`).

### Git

- Commits locales sin subir en `chore/rename-to-verbysia` desde el último push (2026-11-26):
  unidades 2A–6B de polaco, repaso 1–3, vocabulario, gramática y crucigramas.
- Para verlos en la web: el usuario debe decir «sube con --no-verify». Después se hace
  fast-forward de `main` y se sube `main` para que Render despliegue.

## 7. Pendientes aparcados

1. Placeholders legales `[DO UZUPEŁNIENIA]` en `apps/web/src/i18n/legal` (vendedor, NIP,
   dirección, IVA). También hay que revisar legalmente el §7.3 sobre el desistimiento de Premium.
2. Registro de privacidad: hay que añadir las tablas de comercio y memoria a
   `USER_DATA_REGISTER` y comprobar que el borrado y la exportación de cuenta las cubren.
3. Unos 370 tests web obsoletos esperan la interfaz en inglés, además de los tests antiguos de rol
   ADMIN.
4. Hallazgos de auditoría solo de desarrollo (vite, vitest, jsdom, eslint, drizzle-kit,
   hyperframes). La auditoría de producción está limpia.
5. Integración con la Print API de Lulu: necesita una cuenta sandbox y decidir dónde se alojan los
   PDF privados. También hay que validar los PDF en el comprobador de Lulu.
6. Adaptar el curso antiguo pl-en a PUENTE.
7. Decidir si el curso pl-es será de pago.
8. Niveles A2–C2: 12 unidades cada uno y 2 libros por nivel (12 libros en total).

## 8. Situación fiscal y de negocio (orientativa, no es asesoría)

- El usuario no tiene empresa y quiere resultados antes de darse de alta como autónomo.
- Se le explicó que los ingresos siempre se declaran.
- Si es residente fiscal en Polonia, encaja la _działalność nierejestrowana_: límite de
  10 813,50 zł por trimestre en 2026, declaración en el PIT-36.
- En España no existe una figura equivalente.
- Se le recomendó consultar a un asesor.
- Stripe se abrirá con una cuenta polaca.

## 9. Memoria persistente

Claude Code guarda notas en `C:\Users\usuario\.claude\projects\c--Users-usuario-TFM-BIC\memory\`
(índice en `MEMORY.md`). Una sesión nueva sobre esta misma carpeta del repo las carga sola. Este
documento resume lo esencial por si la nueva sesión no las ve.

## 10. Para empezar en la nueva sesión

Pega esto como primer mensaje:

> Lee `docs/product/verbysia/CONTEXTO-CONTINUIDAD.md` y la memoria del proyecto. Seguimos
> alternando lecciones: toca la 6B de español (y antes respóndeme si pasamos el diálogo de la 1A
> de polaco al hotel). Commits locales; no subas hasta que te diga «sube con --no-verify».
