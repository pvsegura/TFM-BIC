// Spanish for Polish speakers — A1 unit 7B (¿Me pone un kilo?) exercises.
//   node infrastructure/content-authoring/a1-unit-7b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const b = kit(7, "es-unit-7-market", 300);
// PERCIBIR
b.mc(
  "es-u7b-listen-why",
  "perceive",
  "Dialog: po co Ola robi zakupy?",
  "Zaprasza znajomych na paellę w sobotę.",
  ["Na paellę dla znajomych.", "Na wesele.", "Na piknik na plaży."],
);
b.mc(
  "es-u7b-listen-tomatoes",
  "perceive",
  "Dialog: ile pomidorów kupuje Ola?",
  "¿Me pone un kilo de tomates?",
  ["Kilo.", "Pół kilo.", "Dwa kilo."],
);
b.mc(
  "es-u7b-listen-oranges",
  "perceive",
  "Dialog: po ile są pomarańcze?",
  "A un euro cincuenta el kilo.",
  ["1,50 € za kilo.", "2 € za kilo.", "0,50 € za kilo."],
);
b.tf(
  "es-u7b-listen-lemons",
  "perceive",
  "Dialog: sprzedawca daje Oli cztery cytryny.",
  "Le pongo cinco — daje pięć.",
  false,
);
b.mc(
  "es-u7b-listen-change",
  "perceive",
  "Dialog: ile reszty dostaje Ola?",
  "Son ocho euros con veinte; paga diez: un euro ochenta de vuelta.",
  ["1,80 €.", "2,80 €.", "1,20 €."],
);
// CONECTAR
b.match(
  "es-u7b-match-fruit",
  "connect",
  "Połącz owoce i warzywa z tłumaczeniem.",
  "La sandía = arbuz; la zanahoria = marchewka; el ajo = czosnek.",
  [
    ["la sandía", "arbuz"],
    ["la zanahoria", "marchewka"],
    ["el ajo", "czosnek"],
    ["el melocotón", "brzoskwinia"],
    ["la cebolla", "cebula"],
    ["las fresas", "truskawki"],
  ],
);
b.match(
  "es-u7b-match-containers",
  "connect",
  "Połącz opakowania z produktami.",
  "Una botella de agua, una lata de atún, una barra de pan.",
  [
    ["una botella de", "agua"],
    ["una lata de", "atún"],
    ["una barra de", "pan"],
    ["una docena de", "huevos"],
  ],
);
b.mc("es-u7b-docena", "connect", "Ile to jest una docena de huevos?", "Una docena = tuzin = 12.", [
  "12 jajek.",
  "10 jajek.",
  "6 jajek.",
]);
b.mc(
  "es-u7b-ultimo",
  "connect",
  "Podchodzisz do stoiska z kolejką. Co pytasz?",
  "¿Quién es el último? — kto jest ostatni w kolejce.",
  ["¿Quién es el último?", "¿Quién es el primero?", "¿Dónde está la cola?"],
);
// ESTRUCTURAR
b.gap(
  "es-u7b-gap-de",
  "structure",
  "Uzupełnij: ilość + de.",
  "Po ilości zawsze de, bez rodzajnika.",
  "Un kilo ___ naranjas, una botella ___ aceite y cien gramos ___ jamón.",
  [["de"], ["de"], ["de"]],
);
b.mc(
  "es-u7b-de-agua",
  "structure",
  "Które zdanie jest poprawne?",
  "Ilość + de + rzeczownik bez rodzajnika.",
  [
    "Una botella de agua, por favor.",
    "Una botella del agua, por favor.",
    "Una botella agua, por favor.",
  ],
);
b.gap(
  "es-u7b-gap-mucho",
  "structure",
  "Uzupełnij mucho / mucha / muchos / muchas.",
  "Pan (m) mucho; leche (f) mucha; tomates (m, l.mn.) muchos.",
  "En casa hay ___ pan, ___ leche y ___ tomates.",
  [["mucho"], ["mucha"], ["muchos"]],
);
b.mc(
  "es-u7b-gente",
  "structure",
  "Uzupełnij: En el mercado hay ___ gente.",
  "Gente jest rodzaju żeńskiego: mucha gente.",
  ["mucha", "mucho", "muchos"],
);
b.mc(
  "es-u7b-como-mucho",
  "structure",
  "Jak powiesz „Dużo pracuję”?",
  "Po czasowniku mucho się nie zmienia.",
  ["Trabajo mucho.", "Trabajo mucha.", "Mucho trabajo yo."],
);
b.mc("es-u7b-otro", "structure", "Chcesz jeszcze jedną butelkę wody. Co mówisz?", "Otra bez un.", [
  "Otra botella de agua, por favor.",
  "Una otra botella de agua, por favor.",
  "Otro botella de agua, por favor.",
]);
b.gap(
  "es-u7b-gap-otro",
  "structure",
  "Uzupełnij otro / otra / otros / otras.",
  "Kilo (m) otro; barra (f) otra; limones (m, l.mn.) otros.",
  "¿Me pone ___ kilo de patatas, ___ barra de pan y ___ dos limones?",
  [["otro"], ["otra"], ["otros"]],
);
b.match(
  "es-u7b-match-prices",
  "structure",
  "Połącz cenę z wymową.",
  "Euro + centy: un euro cincuenta / un euro con cincuenta.",
  [
    ["0,50 €", "cincuenta céntimos"],
    ["1,50 €", "un euro con cincuenta"],
    ["2,99 €", "dos euros noventa y nueve"],
    ["12,05 €", "doce euros con cinco"],
  ],
);
b.mc(
  "es-u7b-a-como",
  "structure",
  "Jak zapytasz, po ile są truskawki?",
  "¿A cómo están + produkt?",
  ["¿A cómo están las fresas?", "¿Cómo están las fresas?", "¿Cuánto son las fresas de kilo?"],
);
b.order(
  "es-u7b-order-ask",
  "structure",
  "Ułóż: Poproszę pół kilo marchewki.",
  "¿Me pone + medio kilo de + zanahorias?",
  ["¿Me", "pone", "medio", "kilo", "de", "zanahorias?"],
);
b.order(
  "es-u7b-order-total",
  "structure",
  "Ułóż: Nic więcej, dziękuję. Ile za wszystko?",
  "Nada más, gracias. ¿Cuánto es todo?",
  ["Nada", "más,", "gracias.", "¿Cuánto", "es", "todo?"],
);
// SONAR
b.mc(
  "es-u7b-sound-dia",
  "sound",
  "Ile sylab ma día?",
  "Akcent na i rozdziela samogłoski: dí-a — dwie sylaby.",
  ["Dwie: dí-a.", "Jedną: dia.", "Trzy: d-i-a."],
);
b.tf(
  "es-u7b-sound-tienda",
  "sound",
  "W słowie tienda ie to dwie osobne sylaby: ti-en-da.",
  "Nie: bez akcentu na i to dyftong, jedna sylaba: tien-da.",
  false,
);
b.mc(
  "es-u7b-sound-eria",
  "sound",
  "Jak dzielisz na sylaby panadería?",
  "Sklepy na -ería mają rozziew: pa-na-de-rí-a.",
  ["pa-na-de-rí-a", "pa-na-de-ria", "pan-a-der-ía"],
);
// CULTURA
b.mc(
  "es-u7b-reading-where",
  "culture",
  "Lectura: gdzie jest Mercado Central?",
  "Está en el centro de la ciudad, en un edificio modernista.",
  ["W centrum Walencji.", "Przy plaży.", "Poza miastem."],
);
b.tf(
  "es-u7b-reading-sunday",
  "culture",
  "Lectura: Mercado Central jest otwarty w niedziele.",
  "Los domingos está cerrado.",
  false,
);
b.mc(
  "es-u7b-reading-stalls",
  "culture",
  "Lectura: ile stoisk ma targ?",
  "Hay más de trescientos puestos.",
  ["Ponad trzysta.", "Około trzydziestu.", "Ponad trzy tysiące."],
);
b.mc(
  "es-u7b-culture-guapa",
  "culture",
  "Kultura: sprzedawca mówi do ciebie guapa. Co to znaczy?",
  "To zwykła, serdeczna forma zwracania się do klientki, nie flirt.",
  ["To serdeczna, zwyczajna forma.", "Że cię podrywa.", "Że jesteś stałą klientką VIP."],
);
// TRANSFORMAR
b.ta(
  "es-u7b-translate-kilo",
  "transform",
  "Napisz po hiszpańsku: Poproszę kilo jabłek.",
  "¿Me pone un kilo de manzanas? / Un kilo de manzanas, por favor.",
  [
    "¿Me pone un kilo de manzanas?",
    "Un kilo de manzanas, por favor.",
    "¿Me pone un kilo de manzanas, por favor?",
  ],
);
b.ta(
  "es-u7b-translate-dozen",
  "transform",
  "Napisz po hiszpańsku: tuzin jajek i litr mleka",
  "Una docena de huevos y un litro de leche.",
  ["una docena de huevos y un litro de leche"],
);
b.ta(
  "es-u7b-translate-price",
  "transform",
  "Napisz po hiszpańsku: Po ile są banany?",
  "¿A cómo están los plátanos?",
  ["¿A cómo están los plátanos?"],
);
b.ta(
  "es-u7b-translate-another",
  "transform",
  "Napisz po hiszpańsku: Jeszcze jeden chleb, proszę.",
  "Otra barra de pan / otro pan, por favor.",
  ["Otra barra de pan, por favor.", "Otro pan, por favor.", "Otra barra, por favor."],
);
b.ta(
  "es-u7b-translate-total",
  "transform",
  "Napisz słownie po hiszpańsku cenę: 6,40 €",
  "Seis euros con cuarenta / seis euros cuarenta.",
  ["seis euros con cuarenta", "seis euros cuarenta"],
);
// EXPRESAR
b.write(
  "es-u7b-write-list",
  "express",
  "Napisz listę zakupów na kolację dla czterech osób (co najmniej sześć produktów z ilościami), a potem krótki dialog ze sprzedawcą na targu.",
  "Sprawdź: ilość + de, ¿Me pone…?, ¿A cómo están…?, otro / otra, ¿Cuánto es todo?",
  "Lista: un kilo de patatas, medio kilo de cebollas, una docena de huevos, un litro de leche, una botella de aceite y una barra de pan. — Buenos días, ¿me pone un kilo de patatas y medio kilo de cebollas? — Aquí tiene. ¿Algo más? — ¿A cómo están los tomates? — A dos euros el kilo. — Pues otro kilo de tomates. ¿Cuánto es todo? — Son cinco euros con treinta.",
  ["lista z ilościami", "prośba", "pytanie o cenę", "otro / otra", "zapłata"],
  35,
  110,
  8,
);
b.write(
  "es-u7b-write-habits",
  "express",
  "Opisz, gdzie i jak często robisz zakupy, co kupujesz zawsze, a czego nigdy nie kupujesz.",
  "Compro…, mucho / poco, a menudo, nunca.",
  "Normalmente hago la compra en el supermercado de mi barrio dos veces a la semana. Siempre compro mucha fruta, pan, leche y huevos. Los sábados voy al mercado: allí el pescado es muy fresco. Nunca compro refrescos porque tienen demasiado azúcar.",
  ["gdzie", "jak często", "co kupujesz", "czego nie kupujesz"],
  25,
  80,
  6,
);
console.log("7B", b.save(), "unit 7 total", renumber(7));

planImages([
  {
    asset: "a1-u7-market.png",
    prompt:
      "a young woman with a wicker basket buys oranges and tomatoes at a fruit and vegetable stall inside a large covered market hall with iron columns and a glass dome, a smiling middle-aged vendor weighs fruit, no signs or price labels with text",
  },
]);
