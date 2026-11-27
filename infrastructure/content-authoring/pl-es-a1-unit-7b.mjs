// Polish for Spanish speakers — A1 unit 7B (Poproszę kilo ziemniaków) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-7b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(7, "pl-es-unit-7-market", 7500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u7b-listen-why",
  "perceive",
  "Diálogo: ¿para qué compra Javier?",
  "Robię hiszpańską tortillę dla kolegów z pracy.",
  [
    "Para hacer una tortilla para sus compañeros.",
    "Para una boda.",
    "Para el desayuno de su hermana.",
  ],
);
k.mc(
  "pl-es-u7b-listen-potatoes",
  "perceive",
  "Diálogo: ¿qué pide primero?",
  "Poproszę kilo ziemniaków i dwie cebule.",
  ["Un kilo de patatas y dos cebollas.", "Medio kilo de tomates.", "Diez huevos."],
);
k.mc(
  "pl-es-u7b-listen-tomatoes",
  "perceive",
  "Diálogo: ¿qué tomates elige y cuánto?",
  "To poproszę pół kilo malinowych.",
  ["Medio kilo de los malinowe.", "Un kilo de los normales.", "Dos kilos de los malinowe."],
);
k.tf(
  "pl-es-u7b-listen-deka",
  "perceive",
  "Diálogo: veinte deka son dos kilos.",
  "Dwadzieścia deka to dwieście gramów.",
  false,
);
k.mc(
  "pl-es-u7b-listen-total",
  "perceive",
  "Diálogo: ¿cuánto paga en total?",
  "Razem trzydzieści cztery złote.",
  ["34 zł.", "44 zł.", "24 zł."],
);
// CONECTAR
k.match(
  "pl-es-u7b-match-veg",
  "connect",
  "Une cada palabra con su traducción.",
  "Ziemniak = patata; marchewka = zanahoria; czosnek = ajo.",
  [
    ["ziemniak", "la patata"],
    ["marchewka", "la zanahoria"],
    ["czosnek", "el ajo"],
    ["ogórek", "el pepino"],
    ["gruszka", "la pera"],
    ["śliwka", "la ciruela"],
  ],
);
k.match(
  "pl-es-u7b-match-containers",
  "connect",
  "Une cada envase con su producto.",
  "Litr mleka, bochenek chleba, butelka wody, paczka ryżu.",
  [
    ["litr", "mleka"],
    ["bochenek", "chleba"],
    ["butelka", "wody"],
    ["paczka", "ryżu"],
  ],
);
k.mc(
  "pl-es-u7b-deko",
  "connect",
  "¿Cuántos gramos son dziesięć deka?",
  "Deko = 10 g; dziesięć deka = 100 g.",
  ["100 g.", "10 g.", "1 kg."],
);
k.mc(
  "pl-es-u7b-warzywniak",
  "connect",
  "¿Qué es un warzywniak?",
  "Una frutería de barrio (warzywa = verduras).",
  ["Una frutería de barrio.", "Una panadería.", "Una carnicería."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u7b-gap-uncountable",
  "structure",
  "Completa con el genitivo singular.",
  "Mleko → mleka; ser → sera; woda → wody.",
  "Poproszę litr ___ (mleko), kawałek ___ (ser) i butelkę ___ (woda).",
  [["mleka"], ["sera"], ["wody"]],
);
k.gap(
  "pl-es-u7b-gap-countable",
  "structure",
  "Completa con el genitivo plural.",
  "Pomidor → pomidorów; jabłko → jabłek; jajko → jajek.",
  "Poproszę kilo ___ (pomidor), kilo ___ (jabłko) i dziesięć ___ (jajko).",
  [["pomidorów"], ["jabłek"], ["jajek"]],
);
k.mc(
  "pl-es-u7b-kilo-jablek",
  "structure",
  "¿Cuál es correcto?",
  "Kilo + genitivo plural: jabłek.",
  ["Kilo jabłek.", "Kilo jabłka.", "Kilo z jabłek."],
);
k.match(
  "pl-es-u7b-match-genpl",
  "structure",
  "Une cada palabra con su genitivo plural.",
  "Masculino -ów; femenino y neutro sin terminación (a veces con e).",
  [
    ["ziemniak", "ziemniaków"],
    ["banan", "bananów"],
    ["truskawka", "truskawek"],
    ["cytryna", "cytryn"],
    ["cebula", "cebul"],
  ],
);
k.gap(
  "pl-es-u7b-gap-numbers",
  "structure",
  "Completa: 2–4 → plural; 5 o más → genitivo plural.",
  "Dwa pomidory; pięć pomidorów; trzy jajka; dziesięć jajek.",
  "Dwa ___ (pomidor), pięć ___ (pomidor), trzy ___ (jajko) i dziesięć ___ (jajko).",
  [["pomidory"], ["pomidorów"], ["jajka"], ["jajek"]],
);
k.mc(
  "pl-es-u7b-dwie",
  "structure",
  "¿Cómo dices «dos cebollas»?",
  "Cebula es femenino: dwie + plural.",
  ["dwie cebule", "dwa cebule", "dwie cebul"],
);
k.mc(
  "pl-es-u7b-duzo",
  "structure",
  "¿Cómo dices «necesito muchos huevos»?",
  "Dużo + genitivo plural: jajek.",
  ["Potrzebuję dużo jajek.", "Potrzebuję dużo jajka.", "Potrzebuję dużych jajka."],
);
k.mc(
  "pl-es-u7b-troche",
  "structure",
  "Completa: Poproszę trochę ___ (ser).",
  "Trochę + genitivo singular: sera.",
  ["sera", "ser", "serów"],
);
k.mc(
  "pl-es-u7b-po-ile",
  "structure",
  "La vendedora dice: Po osiem złotych za kilo. ¿Qué significa?",
  "Po … złotych za kilo = a … złotys el kilo.",
  ["A ocho złotys el kilo.", "Ocho kilos por un złoty.", "Después de las ocho."],
);
k.order(
  "pl-es-u7b-order-ask",
  "structure",
  "Ordena: Medio kilo de fresas, por favor.",
  "Poproszę + pół kilo + truskawek.",
  ["Poproszę", "pół", "kilo", "truskawek."],
);
k.order(
  "pl-es-u7b-order-end",
  "structure",
  "Ordena: Sí, es todo. Pago con tarjeta.",
  "Tak, to wszystko. Płacę kartą.",
  ["Tak,", "to", "wszystko.", "Płacę", "kartą."],
);
// SONAR
k.mc(
  "pl-es-u7b-sound-kilo",
  "sound",
  "¿Cómo suena la k de kilo?",
  "Ante i, la k se suaviza: [kʲilo].",
  ["Suave, con la lengua hacia el paladar.", "Dura, como la k española de «kilo».", "Como una ch."],
);
k.tf(
  "pl-es-u7b-sound-kielbasa",
  "sound",
  "Kiełbasa tiene cuatro sílabas: ki-eł-ba-sa.",
  "No: la i tras k no forma sílaba: kieł-ba-sa, tres sílabas.",
  false,
);
k.mc(
  "pl-es-u7b-sound-drogie",
  "sound",
  "¿En qué palabra la g suena suave?",
  "G ante e: drogie [drogʲe].",
  ["drogie", "drogo", "gruszka"],
);
// CULTURA
k.mc(
  "pl-es-u7b-reading-where",
  "culture",
  "Lectura: ¿quién compra sobre todo en el Stary Kleparz?",
  "Turystów jest tu mało: kupują tu głównie mieszkańcy.",
  ["Los vecinos de Cracovia.", "Los turistas.", "Los restaurantes."],
);
k.mc(
  "pl-es-u7b-reading-autumn",
  "culture",
  "Lectura: ¿qué hay en otoño?",
  "Jesienią jabłka, śliwki i grzyby.",
  ["Manzanas, ciruelas y setas.", "Fresas y cerezas.", "Sandías."],
);
k.tf(
  "pl-es-u7b-reading-prices",
  "culture",
  "Lectura: los precios del mercado siempre son más bajos que en el supermercado.",
  "Ceny są czasem wyższe — a veces son más altos, pero el producto es fresco.",
  false,
);
k.mc(
  "pl-es-u7b-culture-malinowe",
  "culture",
  "Cultura: ¿qué son los tomates malinowe?",
  "Tomates grandes, rosados y dulces, los favoritos de los polacos.",
  ["Tomates rosados, grandes y dulces.", "Tomates verdes para freír.", "Tomates secos importados."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u7b-translate-kilo",
  "transform",
  "Escribe en polaco: Un kilo de manzanas, por favor.",
  "Poproszę kilo jabłek.",
  ["Poproszę kilo jabłek.", "Kilo jabłek, poproszę."],
);
k.ta(
  "pl-es-u7b-translate-milk",
  "transform",
  "Escribe en polaco: un litro de leche y una botella de agua",
  "Litr mleka i butelka wody.",
  ["litr mleka i butelkę wody", "litr mleka i butelka wody"],
);
k.ta(
  "pl-es-u7b-translate-eggs",
  "transform",
  "Escribe en polaco: diez huevos y doscientos gramos de queso",
  "Dziesięć jajek i dwadzieścia deka sera.",
  ["dziesięć jajek i dwadzieścia deka sera", "dziesięć jajek i dwieście gramów sera"],
);
k.ta(
  "pl-es-u7b-translate-price",
  "transform",
  "Escribe en polaco: ¿Cuánto cuestan las fresas?",
  "Ile kosztują truskawki?",
  ["Ile kosztują truskawki?"],
);
k.ta(
  "pl-es-u7b-translate-end",
  "transform",
  "Escribe en polaco: ¿Algo más? — No, es todo.",
  "Coś jeszcze? — Nie, to wszystko.",
  ["Coś jeszcze? Nie, to wszystko.", "Coś jeszcze? — Nie, to wszystko."],
);
// EXPRESAR
k.write(
  "pl-es-u7b-write-list",
  "express",
  "Escribe la lista de la compra para un plato de tu país (al menos seis productos con cantidades) y un diálogo corto en el mercado.",
  "Revisa: cantidad + genitivo, 2–4 / 5+, deka, coś jeszcze? / to wszystko.",
  "Lista: kilo ziemniaków, dwie cebule, dziesięć jajek, litr mleka, butelka oleju i dwadzieścia deka sera. — Dzień dobry, poproszę kilo ziemniaków i dwie cebule. — Coś jeszcze? — Tak, dziesięć jajek. Ile kosztują pomidory? — Po dziesięć złotych za kilo. — To pół kilo pomidorów. To wszystko.",
  ["lista con cantidades", "petición", "precio", "fin de la compra"],
  35,
  110,
  8,
);
k.write(
  "pl-es-u7b-write-habits",
  "express",
  "Escribe dónde y cada cuánto haces la compra, qué compras siempre y qué no compras nunca.",
  "Kupuję + acusativo; dużo / mało + genitivo; nigdy nie kupuję + genitivo.",
  "Zakupy robię dwa razy w tygodniu w supermarkecie obok domu. W sobotę chodzę na targ. Zawsze kupuję chleb, mleko i dużo owoców. Nigdy nie kupuję słodyczy, bo mają za dużo cukru.",
  ["dónde", "frecuencia", "qué compras", "qué no compras"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 7 (pl-es) total", renumber(7, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u7-market.png",
    prompt:
      "a young man buys potatoes and tomatoes at an open-air vegetable stall in an old European market square, a smiling middle-aged saleswoman weighs tomatoes on a scale, crates of apples and cucumbers, no signs or price labels with text",
  },
]);
