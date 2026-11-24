# Libro A1 en papel — estudio de opciones (2026-11-24)

## Conclusión

Usar **las dos vías a la vez**, cada una para lo que sirve:

1. **Amazon KDP (Kindle Direct Publishing) — tapa blanda con impresión bajo demanda.** Para que la gente
   lo encuentre y lo compre en Amazon.pl (y Amazon.de/es…). Amazon imprime y envía cada ejemplar; nosotros
   solo subimos el PDF del interior y la portada. Coste inicial 0 €.
2. **Lulu Print API — opcional, más adelante.** Para vender el libro impreso **desde verbysia.com**: el
   cliente paga en nuestra web (Stripe) y nuestro servidor envía el pedido a Lulu, que lo imprime y lo
   envía a su casa. Sin cuotas; se paga solo impresión + envío de cada pedido.

**Lo que no existe:** Amazon no ofrece ninguna API para que un pedido hecho en nuestra web lo imprima y
envíe Amazon. KDP solo vende dentro de Amazon. Si queremos que se compre en nuestra web, la opción es
Lulu (u otro servicio de impresión bajo demanda con API), no Amazon.

## Amazon KDP

- **Polonia:** Amazon.pl admite tapa blanda de KDP; los libros con distribución mundial o UE aparecen
  allí automáticamente. Precios en PLN.
- **Regalías:** 50 % o 60 % del precio de venta **menos el coste de impresión**. Precio mínimo
  orientativo en Amazon.pl: ~39–40 PLN según la tarifa (ver la tabla oficial de KDP antes de fijarlo).
- **Códigos QR dentro del libro:** KDP no tiene una norma específica sobre QR en el interior impreso.
  Las normas de enlaces (escritas para Kindle) permiten enlaces externos que aporten valor al lector y
  prohíben enlazar a otras tiendas de libros electrónicos. Que los QR lleven a nuestras lecciones o
  audios es aceptable; que lleven a una página de compra fuera de Amazon es arriesgado. Confirmar con
  el soporte de KDP antes de publicar.
- **Impuestos:** las regalías de KDP en Polonia se tratan normalmente como cánones (_tantiemy_). Sin el
  formulario W-8BEN, EE. UU. retiene un 30 %; con él, menos. Revisarlo con un asesor fiscal polaco.
- **ISBN:** KDP da uno gratuito (figura Amazon como sello) o se puede usar uno propio de la Biblioteca
  Nacional de Polonia (gratuito para editores registrados en Polonia).

## Lulu Print API

- API REST con webhooks y entorno de pruebas (_sandbox_) que no cobra ni imprime.
- Integración en nuestra arquitectura: un nuevo producto `book-a1-print` (pago único en Stripe, con
  dirección de envío) → al confirmarse el pago, el webhook crea el pedido en Lulu con los PDF ya
  generados → el estado del envío vuelve por webhook de Lulu.
- Alternativa sin código: Lulu Direct con Shopify/WooCommerce (no encaja con nuestra web propia).

## Qué hace falta en ambos casos

1. **PDF de interior imprimible:** tamaño de corte fijo (p. ej. 6×9 in o A5), márgenes y sangrado
   según la plantilla de KDP/Lulu, fuentes incrustadas e imágenes a 300 ppp. Nuestro generador
   (`infrastructure/book/generate-book.mts`) ya produce el libro completo: hay que añadirle un modo
   «print» con esas medidas.
2. **Portada completa** (contraportada + lomo + portada) con el ancho del lomo según el número de
   páginas — KDP y Lulu dan una calculadora.
3. **Datos del vendedor y cuenta fiscal** — pendiente de tener la cuenta polaca.

## Fuentes consultadas

- KDP: regalías de tapa blanda e importes mínimos por mercado; normas de contenido y enlaces.
- Nota de PublishDrive y publicación de KDP Community sobre la ampliación de la impresión bajo demanda
  a Suecia y Polonia.
- Lulu: páginas «Sell on your site» y «Print API»; blog de Lulu sobre la integración.
- iFirma / iWrity / Freenance (2026) sobre la tributación de KDP en Polonia y el W-8BEN (no oficial).
