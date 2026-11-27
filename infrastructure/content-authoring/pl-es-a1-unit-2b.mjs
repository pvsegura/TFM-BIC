// Polish for Spanish speakers — A1 unit 2B (Wszystkiego najlepszego!) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-2b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(2, "pl-es-unit-2-birthdays", 2500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u2b-listen-age",
  "perceive",
  "Diálogo: ¿cuántos años cumple Kasia?",
  "Trzydzieści. Okrągła liczba!",
  ["Treinta.", "Veinticinco.", "Cincuenta."],
);
k.tf(
  "pl-es-u2b-listen-cake",
  "perceive",
  "Diálogo: los compañeros han comprado una tarta para Kasia.",
  "No: Kasia trae la tarta — Mam tort dla wszystkich.",
  false,
);
k.mc(
  "pl-es-u2b-listen-javier",
  "perceive",
  "Diálogo: ¿cuándo es el cumpleaños de Javier?",
  "Dwudziestego marca — el 20 de marzo.",
  ["El 20 de marzo.", "El 14 de mayo.", "El 21 de diciembre."],
);
k.mc("pl-es-u2b-listen-today", "perceive", "Diálogo: ¿a qué día están hoy?", "Czternasty maja.", [
  "14 de mayo.",
  "25 de noviembre.",
  "18 de mayo.",
]);
k.tf(
  "pl-es-u2b-listen-boss",
  "perceive",
  "Diálogo: el jefe cumple cincuenta años el viernes.",
  "W piątek są urodziny szefa: kończy pięćdziesiąt lat.",
  true,
);
// CONECTAR
k.match(
  "pl-es-u2b-match-tens",
  "connect",
  "Une cada número con su nombre.",
  "20 -dzieścia; 30, 40 -dzieści; 50–90 -dziesiąt.",
  [
    ["20", "dwadzieścia"],
    ["40", "czterdzieści"],
    ["50", "pięćdziesiąt"],
    ["70", "siedemdziesiąt"],
    ["90", "dziewięćdziesiąt"],
    ["100", "sto"],
  ],
);
k.match(
  "pl-es-u2b-match-months",
  "connect",
  "Une cada mes con su nombre en español.",
  "Lipiec (tilo) = julio; listopad (caída de hojas) = noviembre.",
  [
    ["lipiec", "julio"],
    ["listopad", "noviembre"],
    ["sierpień", "agosto"],
    ["kwiecień", "abril"],
    ["październik", "octubre"],
    ["luty", "febrero"],
  ],
);
k.ta("pl-es-u2b-write-48", "connect", "Escribe con letras: 48.", "Sin «y»: czterdzieści osiem.", [
  "czterdzieści osiem",
]);
k.mc(
  "pl-es-u2b-imieniny",
  "connect",
  "¿Qué son las imieniny?",
  "Imieniny = el santo, el día de tu nombre en el calendario.",
  ["El santo (día del nombre).", "El cumpleaños.", "El aniversario de boda."],
);
k.match(
  "pl-es-u2b-match-party",
  "connect",
  "Une las palabras de la fiesta.",
  "Tort = tarta; świeczki = velas; życzenia = felicitaciones.",
  [
    ["tort", "la tarta"],
    ["świeczki", "las velas"],
    ["prezent", "el regalo"],
    ["życzenia", "las felicitaciones"],
    ["impreza", "la fiesta"],
  ],
);
// ESTRUCTURAR
k.mc(
  "pl-es-u2b-today",
  "structure",
  "Hoy es 5 de octubre. ¿Qué dices?",
  "Który jest dzisiaj? → nominativo: piąty października.",
  [
    "Dzisiaj jest piąty października.",
    "Dzisiaj jest piątego października.",
    "Dzisiaj jest pięć październik.",
  ],
);
k.mc(
  "pl-es-u2b-when",
  "structure",
  "Tu cumpleaños es el 3 de junio. ¿Qué dices?",
  "Kiedy? → genitivo: trzeciego czerwca.",
  [
    "Mam urodziny trzeciego czerwca.",
    "Mam urodziny trzeci czerwca.",
    "Mam urodziny w trzy czerwiec.",
  ],
);
k.gap(
  "pl-es-u2b-gap-dates",
  "structure",
  "Completa con el ordinal en genitivo (-ego).",
  "1 pierwszego, 2 drugiego, 31 trzydziestego pierwszego.",
  "Nowy Rok jest ___ (1) stycznia, a Sylwester ___ ___ (31) grudnia.",
  [["pierwszego"], ["trzydziestego"], ["pierwszego"]],
);
k.gap(
  "pl-es-u2b-gap-in-month",
  "structure",
  "Completa con w / we + mes.",
  "Marzec → w marcu; wrzesień → we wrześniu; maj → w maju.",
  "Mam urodziny ___ (marzec), imieniny ___ (wrzesień), a wakacje ___ (lipiec).",
  [["w marcu"], ["we wrześniu"], ["w lipcu"]],
);
k.mc(
  "pl-es-u2b-month-genitive",
  "structure",
  "¿Cuál es correcto?",
  "El mes en la fecha va en genitivo: maja, no maj.",
  ["Pierwszego maja.", "Pierwszego maj.", "Pierwszy maj."],
);
k.gap(
  "pl-es-u2b-gap-lat-lata",
  "structure",
  "Completa con lat o lata.",
  "Mira la última cifra: 2, 3, 4 → lata (no 12–14); el resto → lat.",
  "Tomek ma dwadzieścia trzy ___, Kasia ma trzydzieści ___, a szef ma pięćdziesiąt dwa ___.",
  [["lata"], ["lat"], ["lata"]],
);
k.mc(
  "pl-es-u2b-21",
  "structure",
  "¿Cuál es correcto?",
  "21 termina en 1 (no es el número 1 solo): lat.",
  ["Mam dwadzieścia jeden lat.", "Mam dwadzieścia jeden lata.", "Mam dwadzieścia jeden rok."],
);
k.mc(
  "pl-es-u2b-konczyc",
  "structure",
  "¿Cómo dices «cumplo cuarenta años»?",
  "Cumplir años = kończyć … lat.",
  ["Kończę czterdzieści lat.", "Mam czterdzieści lat urodziny.", "Robię czterdzieści lat."],
);
k.mc(
  "pl-es-u2b-sto-lat",
  "structure",
  "Alguien te canta Sto lat! ¿Qué respondes?",
  "Sto lat es una felicitación, no una pregunta: dziękuję.",
  ["Dziękuję!", "Nie, mam trzydzieści lat.", "Sto lat też!"],
);
k.order(
  "pl-es-u2b-order-birthday",
  "structure",
  "Ordena: ¿Cuándo es tu cumpleaños?",
  "Kiedy + masz + urodziny?",
  ["Kiedy", "masz", "urodziny?"],
);
k.order(
  "pl-es-u2b-order-date",
  "structure",
  "Ordena: Mi santo es el veinticinco de noviembre.",
  "Mam imieniny + ordinal en genitivo + mes en genitivo.",
  ["Mam", "imieniny", "dwudziestego", "piątego", "listopada."],
);
// SONAR
k.mc(
  "pl-es-u2b-sound-wsz",
  "sound",
  "¿Cómo empieza a sonar wszystkiego?",
  "W ante consonante sorda suena f: [fshystkiego].",
  ["[fsh…]", "[vs…]", "[us…]"],
);
k.tf(
  "pl-es-u2b-sound-vowels",
  "sound",
  "Para pronunciar trzydzieści es útil meter una vocal: [te-ry-dzieści].",
  "No: los grupos se leen en bloque, sin vocales añadidas: [tshydźeśći].",
  false,
);
k.match(
  "pl-es-u2b-sound-groups",
  "sound",
  "Une cada grupo con cómo suena.",
  "Szcz = shch, trz = tsh, cz = ch.",
  [
    ["szcz (szczęście)", "[shch]"],
    ["trz (trzydzieści)", "[tsh]"],
    ["cz (czternaście)", "[ch]"],
  ],
);
// CULTURA
k.mc(
  "pl-es-u2b-reading-when",
  "culture",
  "Lectura: ¿cuándo es la fiesta de Kasia?",
  "W sobotę, osiemnastego maja, o dziewiętnastej.",
  ["El sábado 18 de mayo a las 19:00.", "El viernes 14 de mayo.", "El domingo 18 de marzo."],
);
k.tf(
  "pl-es-u2b-reading-gifts",
  "culture",
  "Lectura: Kasia pide a sus invitados regalos caros.",
  "Nie potrzebuję prezentów — no necesita regalos; como mucho, música o flores.",
  false,
);
k.mc(
  "pl-es-u2b-reading-marta",
  "culture",
  "Lectura: ¿cuántos años tiene Marta, la hermana de Kasia?",
  "Ma dwadzieścia sześć lat.",
  ["Veintiséis.", "Treinta.", "Dieciséis."],
);
k.mc(
  "pl-es-u2b-culture-who-pays",
  "culture",
  "Cultura: en una oficina polaca, ¿quién trae la tarta el día del cumpleaños?",
  "La persona que cumple años invita a sus compañeros.",
  ["La persona que cumple años.", "El jefe.", "Nadie: no se celebra en el trabajo."],
);
k.tf(
  "pl-es-u2b-culture-flowers",
  "culture",
  "Cultura: en Polonia, un ramo de cumpleaños debe tener un número par de flores.",
  "No: número impar. Los ramos pares se asocian a los funerales.",
  false,
);
// TRANSFORMAR
k.ta(
  "pl-es-u2b-translate-happy",
  "transform",
  "Escribe en polaco: ¡Felicidades! ¿Cuántos años cumples?",
  "Wszystkiego najlepszego! + Ile lat kończysz?",
  [
    "Wszystkiego najlepszego! Ile lat kończysz?",
    "Wszystkiego najlepszego, ile lat kończysz?",
    "Sto lat! Ile lat kończysz?",
  ],
);
k.ta(
  "pl-es-u2b-translate-my-birthday",
  "transform",
  "Escribe en polaco: Mi cumpleaños es el 2 de abril.",
  "Mam urodziny + drugiego kwietnia.",
  ["Mam urodziny drugiego kwietnia."],
);
k.ta(
  "pl-es-u2b-translate-today",
  "transform",
  "Escribe en polaco: Hoy es 20 de agosto.",
  "Nominativo: dwudziesty sierpnia.",
  ["Dzisiaj jest dwudziesty sierpnia.", "Dziś jest dwudziesty sierpnia."],
);
k.ta(
  "pl-es-u2b-translate-age",
  "transform",
  "Escribe en polaco: Mi padre tiene sesenta y cuatro años.",
  "64 termina en 4: lata.",
  ["Mój tata ma sześćdziesiąt cztery lata.", "Mój ojciec ma sześćdziesiąt cztery lata."],
);
k.ta(
  "pl-es-u2b-translate-september",
  "transform",
  "Escribe en polaco: Mi santo es en septiembre.",
  "W + septiembre → we wrześniu.",
  ["Mam imieniny we wrześniu."],
);
// EXPRESAR
k.write(
  "pl-es-u2b-write-wishes",
  "express",
  "Escribe un mensaje de felicitación a un compañero de trabajo que cumple años: felicítalo, pregunta si hay fiesta, di cuándo es tu cumpleaños y propón tomar algo juntos.",
  "Revisa: Wszystkiego najlepszego / Sto lat, la fecha con ordinal en genitivo y el mes en genitivo.",
  "Cześć, Tomek! Wszystkiego najlepszego i sto lat! Czy masz dzisiaj imprezę? Ja mam urodziny dwudziestego marca, więc za dwa miesiące. Może w piątek idziemy na kawę? Zapraszam! Javier",
  ["felicitación", "pregunta por la fiesta", "tu fecha de cumpleaños", "propuesta"],
  20,
  70,
  6,
);
k.write(
  "pl-es-u2b-write-family-dates",
  "express",
  "Escribe cuándo son los cumpleaños de tres personas de tu familia y cuántos años cumplen este año.",
  "Mój brat ma urodziny… i kończy … lat / lata.",
  "Moja mama ma urodziny piątego lutego i kończy sześćdziesiąt lat. Mój brat ma urodziny dwunastego lipca. Kończy trzydzieści cztery lata. Moja babcia ma urodziny w grudniu, trzeciego grudnia, i kończy osiemdziesiąt dziewięć lat.",
  ["tres personas", "fechas con ordinal", "lat / lata"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 2 (pl-es) total", renumber(2, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u2-cake.png",
    prompt:
      "three office coworkers, two men and a woman, standing around a desk with a birthday cake with lit candles, coffee cups and small plates, the woman is cutting the cake, cheerful mood, office background",
  },
]);
