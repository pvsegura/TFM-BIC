// Polish for Spanish speakers — A1 unit 1B exercises (explained in Spanish).
//   node infrastructure/content-authoring/pl-es-a1-unit-1b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(1, "pl-es-unit-1-countries", 1300, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u1b-listen-javier",
  "perceive",
  "Diálogo: ¿de dónde es Javier?",
  "Jestem z Hiszpanii, z Madrytu.",
  ["De España, de Madrid.", "De Argentina, de Buenos Aires.", "De México, de Guadalajara."],
);
k.tf(
  "pl-es-u1b-listen-carlos",
  "perceive",
  "Diálogo: Carlos es de España.",
  "Nie, nie jestem z Hiszpanii. Jestem Meksykaninem — es mexicano.",
  false,
);
k.mc(
  "pl-es-u1b-listen-valentina",
  "perceive",
  "Diálogo: ¿qué idiomas habla Valentina?",
  "Mówię po hiszpańsku, po angielsku i trochę po włosku.",
  [
    "Español, inglés y un poco de italiano.",
    "Español y un poco de polaco.",
    "Español, francés e inglés.",
  ],
);
k.tf(
  "pl-es-u1b-listen-family",
  "perceive",
  "Diálogo: la familia de Javier también vive en Cracovia.",
  "Moja rodzina mieszka w Madrycie — su familia vive en Madrid.",
  false,
);
k.mc(
  "pl-es-u1b-listen-group",
  "perceive",
  "Diálogo: ¿cuántas personas hay ahora en el equipo?",
  "Teraz jest nas dwanaście osób — doce.",
  ["Doce.", "Dos.", "Veinte."],
);
// CONECTAR
k.match(
  "pl-es-u1b-match-countries",
  "connect",
  "Une cada país con su nombre en polaco.",
  "Niemcy = Alemania; Włochy = Italia: dos nombres que no se parecen al español.",
  [
    ["Alemania", "Niemcy"],
    ["Italia", "Włochy"],
    ["México", "Meksyk"],
    ["Polonia", "Polska"],
    ["Estados Unidos", "Stany Zjednoczone"],
  ],
);
k.match(
  "pl-es-u1b-match-languages",
  "connect",
  "Une cada idioma con su forma después de mówię.",
  "Po + -sku / -cku: po polsku, po niemiecku.",
  [
    ["español", "po hiszpańsku"],
    ["polaco", "po polsku"],
    ["alemán", "po niemiecku"],
    ["francés", "po francusku"],
    ["inglés", "po angielsku"],
  ],
);
k.mc(
  "pl-es-u1b-polka",
  "connect",
  "¿Cómo se dice «una polaca» (la nacionalidad, mujer)?",
  "Polak (él) / Polka (ella), con mayúscula.",
  ["Polka", "Polska", "polski"],
);
k.match(
  "pl-es-u1b-match-numbers",
  "connect",
  "Une cada número con su nombre.",
  "Del 11 al 19 terminan en -naście.",
  [
    ["6", "sześć"],
    ["9", "dziewięć"],
    ["12", "dwanaście"],
    ["15", "piętnaście"],
    ["20", "dwadzieścia"],
  ],
);
// ESTRUCTURAR
k.mc(
  "pl-es-u1b-z-polski",
  "structure",
  "Completa: Ewa jest ___ (de Polonia).",
  "Después de z el nombre cambia: Polska → z Polski.",
  ["z Polski", "z Polska", "w Polsce"],
);
k.mc(
  "pl-es-u1b-w-krakowie",
  "structure",
  "Completa: Mieszkam ___ (en Cracovia).",
  "¿Dónde? → w + forma de lugar: Kraków → w Krakowie.",
  ["w Krakowie", "z Krakowa", "w Kraków"],
);
k.mc(
  "pl-es-u1b-we-wroclawiu",
  "structure",
  "Completa: Moja siostra mieszka ___ (en Breslavia).",
  "Delante de w + consonante se dice we para poder pronunciarlo: we Wrocławiu.",
  ["we Wrocławiu", "w Wrocławiu", "z Wrocławia"],
);
k.gap(
  "pl-es-u1b-gap-mowic",
  "structure",
  "Completa con las formas de mówić.",
  "Ja mówię, ty mówisz, oni mówią.",
  "Ja ___ po hiszpańsku, ty ___ po polsku, a oni ___ po angielsku.",
  [["mówię"], ["mówisz"], ["mówią"]],
);
k.gap(
  "pl-es-u1b-gap-mieszkac",
  "structure",
  "Completa con las formas de mieszkać.",
  "My mieszkamy, wy mieszkacie, pan mieszka (tercera persona).",
  "My ___ w Madrycie. Gdzie wy ___? A gdzie pan ___?",
  [["mieszkamy"], ["mieszkacie"], ["mieszka"]],
);
k.mc(
  "pl-es-u1b-pracuje",
  "structure",
  "Completa: Carlos ___ w Krakowie.",
  "Pracować: ja pracuję, on pracuje.",
  ["pracuje", "pracuję", "pracujesz"],
);
k.mc(
  "pl-es-u1b-czy",
  "structure",
  "¿Cómo preguntas «¿Hablas polaco?»?",
  "Las preguntas de sí o no empiezan por czy; el idioma va con po.",
  ["Czy mówisz po polsku?", "Czy mówisz polski?", "Skąd mówisz po polsku?"],
);
k.mc(
  "pl-es-u1b-po-polsku",
  "structure",
  "¿Cuál es correcta?",
  "Con mówić: po polsku. Polski es el adjetivo (język polski).",
  ["Mówię trochę po polsku.", "Mówię trochę polski.", "Mówię trochę polsku."],
);
k.mc(
  "pl-es-u1b-hiszpanka",
  "structure",
  "Una mujer de España dice: Jestem ___.",
  "Tras jestem la nacionalidad femenina cambia -a por -ą: Hiszpanka → Hiszpanką.",
  ["Hiszpanką", "Hiszpanka", "hiszpanką"],
);
k.mc(
  "pl-es-u1b-polakiem",
  "structure",
  "Un hombre polaco dice: Jestem ___.",
  "Tras k se añade -iem: Polak → Polakiem.",
  ["Polakiem", "Polak", "Polakem"],
);
k.mc(
  "pl-es-u1b-lata",
  "structure",
  "Completa: Mam dwadzieścia trzy ___.",
  "Números que terminan en 2, 3, 4 (no 12–14) → lata.",
  ["lata", "lat", "rok"],
);
k.mc("pl-es-u1b-lat", "structure", "Completa: Ania ma dziesięć ___.", "De 5 a 21 → lat.", [
  "lat",
  "lata",
  "roku",
]);
k.order(
  "pl-es-u1b-order-negation",
  "structure",
  "Ordena: No, no soy de España, soy de Chile.",
  "Nie al principio (respuesta) y nie delante del verbo (negación).",
  ["Nie,", "nie", "jestem", "z", "Hiszpanii,", "jestem z Chile."],
);
// SONAR
k.tf(
  "pl-es-u1b-sound-piec",
  "sound",
  "En pięć se oye una n antes de la ć: [pieñch].",
  "Sí: la ę nasal delante de ć suena como en + n suave.",
  true,
);
k.match(
  "pl-es-u1b-sound-match",
  "sound",
  "Une cada número con su pronunciación aproximada.",
  "Sz = sh; ś, si = sh suave; dzi = «y» enfática.",
  [
    ["sześć", "[sheśch]"],
    ["siedem", "[śedem]"],
    ["dziewięć", "[dźevieñch]"],
    ["czternaście", "[chternaśche]"],
  ],
);
k.mc(
  "pl-es-u1b-sound-mowia",
  "sound",
  "¿Cómo suena la ą final en mówią (hablan)?",
  "Al final de palabra ą suena como una o nasal: [mówiõ].",
  ["Como una o nasal: [mówiõ].", "Como una a: [mówia].", "No se pronuncia: [mówi]."],
);
// CULTURA
k.mc(
  "pl-es-u1b-reading-marek",
  "culture",
  "Lectura: ¿dónde vive Marek Nowak ahora?",
  "Teraz mieszkam w Hiszpanii, w Walencji.",
  ["En Valencia.", "En Gdańsk.", "En Sevilla."],
);
k.tf(
  "pl-es-u1b-reading-home",
  "culture",
  "Lectura: en casa, la familia habla polaco y español.",
  "W domu mówimy po polsku i po hiszpańsku.",
  true,
);
k.mc(
  "pl-es-u1b-reading-pablo",
  "culture",
  "Lectura: ¿cuántos años tiene Pablo?",
  "Pablo ma siedem lat.",
  ["Siete.", "Diez.", "Diecisiete."],
);
k.mc(
  "pl-es-u1b-culture-kowalska",
  "culture",
  "Cultura: el señor se llama Jan Kowalski. ¿Cómo se apellida su mujer, si adopta su apellido?",
  "Los apellidos en -ski concuerdan con la persona: Kowalski → Kowalska.",
  ["Kowalska", "Kowalski", "Kowalskiego"],
);
k.tf(
  "pl-es-u1b-culture-nowak",
  "culture",
  "Cultura: el apellido Nowak también cambia para las mujeres (Nowakowa).",
  "No en el uso actual: Marek Nowak, Katarzyna Nowak. Solo cambian los apellidos-adjetivo (-ski, -cki, -dzki).",
  false,
);
// TRANSFORMAR
k.ta(
  "pl-es-u1b-translate-from",
  "transform",
  "Escribe en polaco: Soy de México, de Guadalajara.",
  "Jestem z + país, z + ciudad.",
  ["Jestem z Meksyku, z Guadalajary."],
);
k.ta(
  "pl-es-u1b-translate-live",
  "transform",
  "Escribe en polaco: ¿Dónde vive usted? (a una mujer)",
  "Pani + tercera persona: mieszka.",
  ["Gdzie pani mieszka?"],
);
k.ta(
  "pl-es-u1b-translate-age",
  "transform",
  "Escribe en polaco: Tengo diecinueve años.",
  "19 → lat.",
  ["Mam dziewiętnaście lat."],
);
k.ta(
  "pl-es-u1b-translate-languages",
  "transform",
  "Escribe en polaco: Hablo español e inglés y un poco de polaco.",
  "Po hiszpańsku, po angielsku, trochę po polsku.",
  [
    "Mówię po hiszpańsku i po angielsku i trochę po polsku.",
    "Mówię po hiszpańsku, po angielsku i trochę po polsku.",
  ],
);
// EXPRESAR
k.write(
  "pl-es-u1b-write-intro",
  "express",
  "Escribe en polaco tu presentación para el primer día en un trabajo nuevo: nombre, de dónde eres, dónde vives, qué idiomas hablas, tu edad y una pregunta con czy para un compañero.",
  "Revisa: z + país, w + ciudad, po + idioma, lat / lata, czy al principio de la pregunta.",
  "Cześć! Mam na imię Lucía. Jestem z Hiszpanii, z Sewilli, ale teraz mieszkam w Warszawie. Mówię po hiszpańsku, po angielsku i trochę po polsku. Mam dwadzieścia cztery lata. A ty? Czy mówisz po hiszpańsku?",
  ["nombre", "z + país / ciudad", "mieszkam w…", "po + idiomas", "edad", "pregunta con czy"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 1 (pl-es) total", renumber(1, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u1-office.png",
    prompt:
      "a friendly woman team leader standing at the head of a meeting table in a bright modern office, welcoming three new colleagues of different ages who sit with notebooks and coffee cups, no screens with text or signs",
  },
]);
