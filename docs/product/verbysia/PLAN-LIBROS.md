# Plan de la colección de libros Verbysia (A1–C2) en consonancia con la web

Estado: **aprobado** (2026-11-24). Sustituye la idea de un único libro corto por nivel: el libro A1
actual (48 páginas) es un resumen de las lecciones, no un manual de curso.

## 1. Qué vamos a producir

**12 libros = 6 niveles × 2 libros**, todos en polaco (explicaciones) y español (contenido):

| Libro                                   | Para qué sirve                                                     | Páginas objetivo |
| --------------------------------------- | ------------------------------------------------------------------ | ---------------- |
| **Podręcznik** (libro de temario) A1…C2 | Textos, diálogos, vocabulario, gramática, cultura, misiones orales | 170–190          |
| **Zeszyt ćwiczeń** (cuaderno) A1…C2     | Ejercicios de cada unidad, repasos, examen final, soluciones       | 160–180          |

Cada libro tiene también una **versión digital (PDF)** y una **muestra gratuita** (unidad 1).

## 2. Principios: la web y los libros son el mismo curso

1. **Una sola fuente.** Cada unidad se escribe una vez en `content/` (JSON validado). De ahí salen la web,
   el Podręcznik y el Zeszyt. Nunca se escribe texto «solo para el libro» a mano en una plantilla:
   así web y libros no pueden contradecirse.
2. **La web basta para hacer el curso.** Todo lo que está en los libros está en la web (en formato
   interactivo). Los libros son el formato papel del mismo curso, no un curso distinto.
3. **El libro remite a la web**: QR en cada unidad y en cada audio → escuchar, corregir automáticamente,
   repasar en el entrenador de memoria, preguntar al asistente IA.
4. **La web remite al libro**: cada unidad y cada ejercicio de la web muestra su página («Podręcznik
   s. 42 · Zeszyt s. 27, ćw. 3.14»).
5. **Misma numeración en todas partes**: unidad `A2.5`, sección `A2.5 E`, ejercicio `ćw. 5.12`,
   audio `nagranie 5.3`. El número impreso es el mismo que ve el alumno en la web.

## 3. Estructura de una unidad (igual en web y libros)

Doce unidades por nivel en todos los niveles (A1 añade la «Unidad 0»: el reto de 7 días). Cada unidad
sigue las fases PUENTE ([METODO-PUENTE.md](METODO-PUENTE.md)):

| Sección | Fase PUENTE         | Podręcznik (≈12 págs.)                                                                                         | Zeszyt (≈10 págs.)                                                            | Web                                                      |
| ------- | ------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0       | —                   | Portadilla: objetivos «Po tej lekcji potrafisz…», QR de la unidad                                              | —                                                                             | Cabecera de la unidad                                    |
| P       | Percibir            | Diálogo/texto modelo, 3 escuchas guiadas, comprensión (2 págs.)                                                | Ejercicios de escucha (QR al audio) (1,5 págs.)                               | Audio con velocidad ajustable, ejercicios autocorregidos |
| U       | Unir                | Vocabulario temático con imágenes, género marcado, asociaciones (2 págs.)                                      | Ejercicios de vocabulario (1,5 págs.)                                         | Tarjetas al entrenador de memoria                        |
| E       | Estructurar         | Gramática en contexto, tablas, «Po polsku / po hiszpańsku», **Pułapka** (errores típicos de polacos) (3 págs.) | Ejercicios de gramática (2,5 págs.)                                           | Tablas, explicaciones, ejercicios                        |
| —       | Fonética / registro | A1–B1: pronunciación y ortografía · B2–C2: registro y estilo (1 pág.)                                          | Ejercicios (0,5 págs.)                                                        | Pares mínimos con audio, grabación                       |
| —       | Lectura y cultura   | Texto de lectura + España/Latinoamérica frente a Polonia (1 pág.)                                              | Comprensión lectora (1 pág.)                                                  | Mismo texto, preguntas autocorregidas                    |
| T       | Transformar         | —                                                                                                              | Reformular, traducir PL→ES selectivamente (1 pág.)                            | Respuesta escrita con corrección                         |
| E       | Expresar            | Misión comunicativa, juego de rol, tema para grabarse (1 pág.)                                                 | Tarea de escritura con líneas (1 pág.)                                        | Grabación y comparación; comentario del asistente IA     |
| N       | Nutrir la memoria   | Resumen «Ściąga» + autoevaluación «Potrafię…» (1 pág.)                                                         | Repaso intercalado de unidades anteriores + autotest de 10 preguntas (1 pág.) | Repaso espaciado SM-2, test de la unidad                 |

**Volumen por unidad:** unos 30 ejercicios en el Zeszyt (hoy la web tiene 12 por unidad: hay que llegar
a ~30, y todos estarán también en la web).

## 4. Presupuesto de páginas

**Podręcznik (≈184 págs.)**

| Parte                                                                                       | Págs. |
| ------------------------------------------------------------------------------------------- | ----- |
| Portada interior, créditos, índice, cómo usar libro + web, mapa PUENTE, leyenda de símbolos | 8     |
| 12 unidades × 12 págs.                                                                      | 144   |
| 4 páginas de «Mapa de progreso» (tras las unidades 3, 6, 9, 12)                             | 4     |
| Apéndices: tablas de conjugación, resumen gramatical, glosario ES–PL                        | 24    |
| Páginas en blanco de ajuste (inicio de unidad en página impar)                              | ~4    |

**Zeszyt ćwiczeń (≈176 págs.)**

| Parte                                                                | Págs. |
| -------------------------------------------------------------------- | ----- |
| Portada interior, créditos, índice, cómo corregir en la web          | 4     |
| 12 unidades × 10 págs.                                               | 120   |
| 4 repasos acumulativos × 4 págs. (tras las unidades 3, 6, 9, 12)     | 16    |
| Examen final de nivel, formato tipo DELE (modelo propio, no oficial) | 8     |
| Soluciones                                                           | 20    |
| Transcripciones de los audios                                        | 8     |

A1 suma la Unidad 0 (reto de 7 días): +8 págs. en el Podręcznik y +6 en el Zeszyt.

## 5. Temario por nivel (12 unidades cada uno)

Detalle completo de A1–B2 en [CURRICULO.md](CURRICULO.md); se ampliará con C1–C2 y con el reparto de
gramática, vocabulario y matriz PL→ES de cada unidad antes de escribir cada nivel.

- **A1** (escrito; hay que ampliarlo): 0 Reto 7 días · 1 ¡Hola! · 2 Familia · 3 ¿Dónde está? · 4 Bar y
  restaurante · 5 Mi día · 6 Gustos · 7 De compras · 8 Mi casa · 9 Tiempo y estaciones · 10 Moverse por la
  ciudad · 11 Salud · 12 Repaso y tarea final.
- **A2:** biografía (pretérito perfecto) · el fin de semana (indefinido) · infancia (imperfecto) · viajes y
  alojamiento · trabajo y estudios · servicios y pronombres de objeto · comparar · planes y futuro · cocina
  (imperativo) · hábitos y consejos · quejas y problemas («a» personal, doble negación) · tarea final.
- **B1:** contar historias (contraste de pasados) · deseos y planes (subjuntivo presente) · consejos ·
  emociones y relaciones · opinar y debatir · hipótesis (condicional) · estilo indirecto · correos formales ·
  vivir en España (trámites, alquiler) · entrevista de trabajo · medios y actualidad · tarea final.
- **B2:** subjuntivo imperfecto y condicionales · perífrasis · conectores y argumentación · registro formal
  e informal · ser/estar con adjetivos · expresiones idiomáticas · sociedad y medio ambiente · ciencia y
  tecnología · cultura y arte · economía y consumo · falsos amigos avanzados y traducción · tarea final
  (ensayo y debate).
- **C1:** matices del subjuntivo (concesivas, relativas) · citar y estilo indirecto avanzado · escritura
  académica · español profesional (informes, reuniones, negociación) · variedades del español (España,
  México, Río de la Plata, Caribe, Andes) · humor, ironía y sobrentendidos · fraseología y colocaciones ·
  pasiva, impersonalidad y nominalización · literatura y cine · instituciones, derecho y política · análisis
  crítico de medios · tarea final.
- **C2:** precisión léxica y sinonimia · estilística y registro literario · retórica y discurso público ·
  traducción y mediación PL↔ES · coloquial y argot · historia del español · textos especializados (jurídico,
  científico) · literatura hispánica · argumentación avanzada · escritura creativa · pragmática y cortesía ·
  tarea final.

**Derechos de autor:** solo textos propios o fragmentos literarios de dominio público. No se copian ni
adaptan manuales existentes.

## 6. Cómo se conectan web y libros

**Enlaces cortos y estables** impresos en los QR: `verbysia.com/k/a1/3` (unidad), `/k/a1/3/e` (sección),
`/k/a1/3/n2` (audio). Una ruta de la web los redirige a la página real, así un libro impreso no se rompe
si cambian las rutas.

**Índice de páginas generado.** Al generar los libros se guarda la página de cada unidad, sección y
ejercicio en `content/languages/es/books/{nivel}.json` (en git). La API lo expone y la web muestra
«Podręcznik s. 42». Si se reedita el libro, el índice se regenera.

**Qué recibe quien compra el libro** (los ejemplares de Amazon son idénticos, así que no pueden llevar un
código individual):

- **Gratis para todos los lectores ("Strefa książki"):** audios y transcripciones de cada unidad, y las
  páginas a las que llevan los QR de audio.
- **Curso web:** los ejercicios interactivos, el entrenador de memoria, el asistente IA y el progreso
  siguen siendo parte del curso de pago de cada nivel (o Premium).
- **Comprando en verbysia.com** (Lulu): podemos enviar por email un descuento para el curso web o un pack
  libro + curso, porque sabemos quién ha comprado.

## 7. Cambios necesarios en la web y en el contenido

1. **Modelo de contenido:** añadir unidad → secciones (con su fase PUENTE) a las lecciones de cada nivel.
2. **Nuevos tipos de bloque:** lectura, cultura, «Pułapka» (error típico), comparación PL/ES, tabla,
   misión, resumen «Ściąga» + autoevaluación, imagen.
3. **Nuevos tipos de ejercicio** (en la web y en papel): relacionar, ordenar, completar huecos múltiples,
   escritura libre con respuesta modelo. Cada ejercicio con número, unidad, fase y pistas de maquetación
   (líneas para escribir, espacio).
4. **Audios con varias voces** (diálogos) y, desde B2, variedades del español. Hoy usamos una sola voz de
   Piper: hay que verificar qué voces hay disponibles por variedad.
5. **Imágenes:** el vocabulario y las portadillas las necesitan. Sigue pendiente decidir la fuente
   (ilustraciones encargadas, imágenes generadas con licencia revisada o un banco de iconos libre).
6. **Página de cada nivel con los dos libros:** muestras gratis, compra en papel/digital y referencias de
   página en cada unidad y ejercicio.
7. **Productos:** libros en papel (Lulu), PDFs digitales (incluidos en la licencia del nivel y en Premium)
   y cursos C1 y C2 (hoy el catálogo llega a B2).

## 8. Generador de libros

- Un solo comando: `generate-books.mts --level a1 --book podrecznik|zeszyt|all --format print|digital|sample`.
- Plantillas por libro y componentes comunes: portadilla de unidad, renderizado de cada tipo de bloque y de
  ejercicio para papel (con líneas y casillas), soluciones automáticas, glosario a partir del vocabulario,
  tablas de conjugación a partir de la gramática.
- Paginación: evaluar Paged.js (biblioteca libre) para el índice con números de página, cabeceras
  («A2 · Unidad 5») y la extracción del índice de páginas. Verificar versión y compatibilidad antes.
- **Diseño de la colección:** misma maqueta en los 12 libros y un color por nivel. Portada del Podręcznik
  y del Zeszyt diferenciadas por una franja y el nombre. Interior en blanco y negro (el código de color del
  género se sustituye en papel por símbolos; en la web sigue en color).
- **Formato recomendado: A4** para los dos libros (tablas legibles y espacio para escribir en el cuaderno).
  Confirmar en la calculadora de Lulu y en KDP que A4 en blanco y negro está disponible y ver su coste;
  6×9 in es demasiado pequeño para un manual con ejercicios.

## 9. Control de calidad (para que no se desincronicen)

Pruebas automáticas en el repositorio:

- Cada ejercicio del Zeszyt existe en la web con el mismo número.
- Cada QR / enlace corto apunta a una ruta que existe.
- Cada unidad tiene todas las secciones PUENTE y el número mínimo de ejercicios.
- El número de páginas de cada libro está en el rango objetivo.
- Las soluciones coinciden con las respuestas de la web.

Revisión humana por unidad: profesor nativo de español (contenido) y nativo polaco (explicaciones), y
comprobación de derechos de imágenes y textos. Recomendado obligatorio para C1 y C2.

## 10. Orden de trabajo

| Fase | Entregable                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L0   | Fundamentos: modelo de unidades/secciones, nuevos bloques y ejercicios (web + papel), numeración, enlaces cortos, generador de dos libros, diseño de la colección, índice de páginas, pruebas de consonancia |
| L1   | **Piloto:** unidad A1.1 completa con la nueva estructura en web + Podręcznik + Zeszyt. Revisión contigo antes de seguir                                                                                      |
| L2   | A1 completo (Unidad 0 + 12 unidades ampliadas, repasos, examen) → 2 libros A1                                                                                                                                |
| L3   | A2: temario detallado → unidades en la web una a una → 2 libros A2                                                                                                                                           |
| L4   | B1 (igual)                                                                                                                                                                                                   |
| L5   | B2 (igual)                                                                                                                                                                                                   |
| L6   | C1 (igual, con revisión experta)                                                                                                                                                                             |
| L7   | C2 (igual, con revisión experta)                                                                                                                                                                             |
| L8   | Por cada nivel terminado: productos en Lulu y Stripe, ficha en Amazon KDP, ISBN, muestra gratis en la web                                                                                                    |

Las unidades de la web se publican a medida que se terminan; los libros de un nivel salen cuando el
nivel está completo.

## 11. Decisiones (tomadas el 2026-11-24)

1. **Formato:** A4, interior en blanco y negro, portada en color.
2. **Imágenes:** mezcla de ilustraciones encargadas, imágenes generadas con IA (revisando la licencia de la
   herramienta) e iconos de bancos libres con licencia permisiva; cada imagen registra su origen y
   licencia, y los créditos se imprimen en la página de créditos.
3. **Compradores del libro:** audios y transcripciones gratis para cualquier lector; ejercicios
   interactivos, entrenador de memoria y asistente IA en el curso de pago; descuento o pack para quien
   compra en verbysia.com.
4. **ISBN propios** (Biblioteca Nacional de Polonia, como editor).
5. **Revisión nativa:** la hace el propietario del proyecto, unidad a unidad.
6. **Precios:** se fijan cuando se conozca el coste de impresión de Lulu en A4.

## 12. Riesgos

- **Volumen de escritura:** cada nivel son unos 360 ejercicios y decenas de textos. Se escribe con ayuda
  de IA, pero cada unidad necesita revisión humana.
- **Calidad en C1–C2:** exige matices, variedades y textos auténticos: revisión experta imprescindible.
- **Coste de impresión** de libros A4 de ~180 páginas: comprobarlo antes de fijar precios.
- **Voces sintéticas** en niveles altos (variedades, diálogos naturales): puede hacer falta otra solución
  de audio.
