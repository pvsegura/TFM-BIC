# Plan: Verbysia con el modelo de TRADUES

Fecha: 2026-11-22. Referencia analizada: https://tradues.pl/ (inicio, «Kursy i ceny», «Książka», «Książka + aplikacja»).
Objetivo: ofrecer el mismo **tipo** de producto y la misma estructura comercial que TRADUES, reutilizando lo que Verbysia
ya tiene. **No se copian** textos, imágenes, diseño, nombres de productos ni materiales de TRADUES: se replica el modelo
(qué se ofrece y cómo se organiza), con contenido y diseño propios.

## 1. Qué hace TRADUES (resumen)

| Bloque              | Cómo lo presenta TRADUES                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Marca               | Escuela + biblioteca de productos digitales con una persona visible (profesor nativo) y contacto directo por WhatsApp.                                                                                                                                                                                       |
| Inicio              | Hero con 2 tarjetas de precio de curso → 3 tarjetas numeradas («usa solo lo que necesites») → productos digitales → vídeos demo de 20 s → servicios → cifras del sistema libro+app → **bloque gratuito jugable** → muestra del libro → **test de comprensión auditiva** → programa del curso → apps sueltas. |
| Cursos en directo   | Semestre de 24 clases de 60 min. Online: grupo de hasta 3 personas; presencial: hasta 8. Cuota mensual sin permanencia anual.                                                                                                                                                                                |
| Libro digital + app | Libro A1–B2 con códigos QR que abren el ejercicio exacto en la app; app con preguntas, imágenes, audio, diálogos, modo oscuro.                                                                                                                                                                               |
| Bloque gratis       | «BLOK 1»: 10 temas y 160 ejercicios gratis en el navegador, instalable en el móvil.                                                                                                                                                                                                                          |
| Pack completo       | Libro ampliado + cómic + apps, a precio único.                                                                                                                                                                                                                                                               |
| Apps sueltas        | Juegos y apps de práctica independientes, con prueba de 20 s.                                                                                                                                                                                                                                                |
| Test auditivo       | 4 diálogos (aeropuerto, cafetería, restaurante, tienda) × 10 preguntas → % y nivel aproximado, indicando que no es un examen MCER.                                                                                                                                                                           |
| Zona de cliente     | Contraseña tras el contacto; acepta contrato y calendario y paga cada mes desde el panel, sin cargos automáticos.                                                                                                                                                                                            |
| Otros               | Traducciones PL↔ES, diálogos, vídeo de gramática, concurso escolar, zona de descargas, versión ES, páginas legales.                                                                                                                                                                                          |
| Confianza           | Transparencia de precios y condiciones; sin reseñas ni certificados visibles.                                                                                                                                                                                                                                |

## 2. Qué tiene ya Verbysia y qué falta

| Bloque TRADUES             | Verbysia hoy                                                                      | Hueco                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Bloque gratis jugable      | Reto de 7 días (7 lecciones, 21 ejercicios, 40 palabras), requiere cuenta         | Modo **demo sin cuenta** y más volumen de ejercicios.                                                    |
| App de ejercicios          | Lecciones, 3 tipos de ejercicio, entrenador SM-2, vocabulario, fonética, coach IA | Tipos de ejercicio con **imagen**, **audio** («escucha y elige») y **diálogo**.                          |
| Libro + QR                 | Contenido en JSON validado; ninguna salida imprimible                             | **Libro digital (PDF)** generado desde el contenido, con un QR por tema que abre la lección o ejercicio. |
| Vídeos demo y de gramática | Pipeline de vídeo (Hyperframes) y TTS de Gemini (~100 llamadas/día)               | Vídeos cortos de producto y de gramática (ser/estar/hay).                                                |
| Test auditivo              | Diálogos del reto con transcripción, sin audio publicado                          | **Test público** de comprensión auditiva con audio TTS y nivel orientativo.                              |
| Precios y productos        | Productos en BD, panel admin, página de precios, licencias en servidor            | Productos tipo «libro+app», «pack completo» y «app suelta»; pagos reales (Stripe pendiente).             |
| Zona de cliente            | Cuenta, panel, perfil, exportación y borrado de datos (RGPD)                      | Mis compras, descargas y estado de suscripción (cuando haya pagos).                                      |
| Contacto directo           | Sin canal de contacto                                                             | Botón WhatsApp/email y página de contacto.                                                               |
| Diálogos                   | Diálogos dentro de las lecciones                                                  | Página pública de diálogos con audio.                                                                    |
| Versión ES                 | Interfaz en PL/EN/ES con banderas                                                 | — (hecho).                                                                                               |
| Legales                    | Política de privacidad                                                            | Regulamin, desistimiento para contenido digital, cookies (borradores para revisión legal).               |
| Cursos en directo          | No existen (decisión inicial: 100 % autónomo)                                     | **Decisión pendiente** (ver §4).                                                                         |
| Traducciones               | No existen                                                                        | **Decisión pendiente** (ver §4).                                                                         |

## 3. Plan por fases

### Fase A — Inicio y presentación con la estructura de TRADUES (sin dependencias externas)

1. Reordenar la página de inicio: hero con tarjetas de precio y CTA → 3 tarjetas numeradas «usa solo lo que necesites»
   (curso autónomo, libro digital, entrenador/apps) → productos → vídeos demo → **bloque gratis embebido** → muestra del
   libro → **test auditivo** → programa A1 → preguntas frecuentes.
2. Botón de contacto (WhatsApp y email) en la cabecera y en el pie, y página de contacto.
3. Mensajes de transparencia: precio final, sin permanencia y «elige solo lo que necesitas».

### Fase B — Bloque gratuito sin cuenta

1. Modo demo: los días 1–2 del reto y un set de tarjetas del entrenador se pueden jugar sin registrarse; el progreso se
   guarda en el navegador y pasa a la cuenta al registrarse.
2. Ampliar el bloque gratuito a ~10 temas (los 7 días del reto + 3 temas de la unidad 1 de A1) con ~160 ejercicios, todo
   contenido propio.

### Fase C — Más tipos de ejercicio (app)

1. «Escucha y elige» (audio TTS), «imagen → palabra», «ordena la frase» y «diálogo con huecos».
2. Imágenes propias o con licencia libre para el vocabulario A1. Hay que decidir de dónde salen: generadas o de un banco con licencia.

### Fase D — Test auditivo público

1. 4 situaciones (aeropuerto, cafetería, restaurante, tienda), escritas desde cero, con 10 preguntas cada una y audio TTS.
2. Resultado en % y nivel **orientativo** (A1/A2), indicando expresamente que no es un examen oficial. CTA al reto.
3. Coste de TTS: ~4 audios largos + 40 cortos, que caben en la cuota diaria actual.

### Fase E — Libro digital con QR

1. Generar un PDF «Hiszpański metodą PUENTE A1» a partir de los JSON del curso: lecciones, ejemplos, diálogos,
   explicaciones y un QR por tema que abre la lección o el ejercicio en la web.
2. Muestra gratuita de unas 30 páginas. El libro completo se vende como producto digital (licencia `BOOK_A1`), descargable
   desde la zona de cliente.
3. Más adelante, versión impresa, solo si hay demanda.

### Fase F — Catálogo comercial completo

1. Productos: curso A1 autónomo, libro digital + app, pack completo y Premium (mensual/anual), todos gestionados desde el panel admin.
2. Pagos con Stripe (necesito las claves de test) y webhooks firmados. Recomiendo mantener la renovación automática con
   cancelación en un clic, aunque TRADUES cobra cada mes de forma manual.
3. Zona de cliente: mis compras, facturas, descargas y suscripción.

### Fase G — Vídeos

1. Vídeos de 20 s de cada producto y un vídeo de gramática (ser/estar/hay), con el pipeline actual y voz TTS.

### Fase H — Legal

1. Borradores de regulamin, desistimiento para contenido digital y cookies, marcados «requieren revisión legal».

## 4. Decisiones que necesito del propietario

1. **¿Clases en directo en grupos pequeños** (como el modelo de 3 personas online de TRADUES)? El brief inicial decía
   «sin clases en directo». Si se añaden, hace falta: profesor, calendario, contrato y cobro mensual.
2. **¿Servicio de traducciones PL↔ES?** Es un negocio distinto, que solo es viable si tienes traductor.
3. **¿Persona visible de la marca?** TRADUES se apoya en «Carlos». ¿Quieres aparecer tú (nombre y foto) o mantener la marca sin persona?
4. **Contacto**: número de WhatsApp y email públicos.
5. **Imágenes**: ¿generadas con IA, de un banco con licencia o fotos propias?
6. **Libro impreso**: ¿solo digital por ahora?

## 5. Orden recomendado

A → B → D → C → E → F → G → H. Las fases A, B y D no dependen de nadie externo y son las que más se parecen a la
experiencia de TRADUES. E y F son las que generan ingresos, y F depende de Stripe.
