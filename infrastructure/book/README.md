# Libros Verbysia

Plan: [docs/product/verbysia/PLAN-LIBROS.md](../../docs/product/verbysia/PLAN-LIBROS.md).

| Script                    | Qué genera                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `generate-books.mts`      | **Colección A4**: Podręcznik + Zeszyt ćwiczeń de un nivel, portadas, índice de páginas |
| `generate-book.mts`       | Libro digital corto A1 (muestra pública en `apps/web/public/ksiazka/`)                 |
| `generate-print-book.mts` | Edición corta 6×9 in (primera versión, sustituida por la colección A4)                 |

```sh
packages/data/node_modules/.bin/tsx infrastructure/book/generate-books.mts --level a1
#   --book podrecznik|zeszyt|all   (por defecto all)
#   --format print|digital         (print: sangrado 0,125 in + portada; digital: A4 sin sangrado)
```

- La salida va a `infrastructure/book/out/{nivel}/` (no se sube a git: son productos de pago).
- Con `--format print` se actualiza `content/books/{idioma}-{nivel}.json`: la página impresa de cada
  unidad, sección y ejercicio, que la web muestra junto a cada contenido. Ese archivo sí se sube.
- Paginación con Paged.js dentro de Chrome (puppeteer-core): índice con números de página, cabeceras
  y páginas pares para imprenta. Necesita Chrome o Edge instalado.
- Los QR usan los enlaces cortos `/k/{idioma}-{nivel}/{unidad}[/{sección|ejercicio}]`.
- Antes del primer pedido real, validar interior y portada en el validador de Lulu.
