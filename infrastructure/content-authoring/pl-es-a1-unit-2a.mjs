// Polish for Spanish speakers — A1 unit 2A (To moja rodzina) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-2a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(2, "pl-es-unit-2-family", 2100, COURSE);
// PERCIBIR — the wedding photos
k.mc(
  "pl-es-u2a-listen-photo",
  "perceive",
  "Diálogo: ¿qué hay en la foto de Kasia?",
  "To moja rodzina na weselu — su familia en una boda.",
  ["Su familia en una boda.", "Sus compañeros de trabajo.", "Sus amigos en la playa."],
);
k.mc(
  "pl-es-u2a-listen-adam",
  "perceive",
  "Diálogo: ¿quién es Adam?",
  "To mój wujek Adam, brat mamy — el tío de Kasia, hermano de su madre.",
  ["El tío de Kasia.", "El hermano de Kasia.", "El padre de Kasia."],
);
k.tf(
  "pl-es-u2a-listen-piotrek",
  "perceive",
  "Diálogo: Piotrek, el hermano de Kasia, vive en Cracovia.",
  "Mieszka w Gdańsku — vive en Gdańsk.",
  false,
);
k.mc(
  "pl-es-u2a-listen-zosia",
  "perceive",
  "Diálogo: ¿cuántos años tiene Zosia, la hija de Piotrek?",
  "Ma pięć lat i jest bardzo wesoła.",
  ["Cinco.", "Tres.", "Quince."],
);
k.tf(
  "pl-es-u2a-listen-lucia",
  "perceive",
  "Diálogo: Javier tiene una hermana y un hermano.",
  "Mam siostrę. Nie mam brata — solo tiene una hermana.",
  false,
);
k.mc(
  "pl-es-u2a-listen-hugo",
  "perceive",
  "Diálogo: ¿quién es Hugo?",
  "To mój siostrzeniec, Hugo — el hijo de la hermana de Javier.",
  ["El sobrino de Javier.", "El hijo de Javier.", "El hermano de Javier."],
);
// CONECTAR — family words and adjectives
k.match(
  "pl-es-u2a-match-family",
  "connect",
  "Une cada palabra con su traducción.",
  "Mąż = marido; żona = mujer, esposa; rodzeństwo = hermanos.",
  [
    ["mąż", "el marido"],
    ["żona", "la esposa"],
    ["córka", "la hija"],
    ["dziadek", "el abuelo"],
    ["ciocia", "la tía"],
    ["rodzeństwo", "los hermanos"],
  ],
);
k.match(
  "pl-es-u2a-match-opposites",
  "connect",
  "Une cada adjetivo con su contrario.",
  "Wysoki ↔ niski, młody ↔ stary, wesoły ↔ poważny.",
  [
    ["wysoki", "niski"],
    ["młody", "stary"],
    ["wesoły", "poważny"],
  ],
);
k.mc(
  "pl-es-u2a-nephew",
  "connect",
  "Tu hermano tiene un hijo. ¿Qué es para ti?",
  "El hijo de tu hermano (brat) es bratanek; el de tu hermana (siostra), siostrzeniec.",
  ["bratanek", "siostrzeniec", "wnuk"],
);
k.mc(
  "pl-es-u2a-mama-matka",
  "connect",
  "¿Cómo llama normalmente un polaco adulto a su madre?",
  "En casa se dice mama; matka es formal o literario.",
  ["mama", "matka", "pani"],
);
k.ta(
  "pl-es-u2a-grandparents",
  "connect",
  "Escribe en polaco: los abuelos (una sola palabra).",
  "Dziadek + babcia = dziadkowie.",
  ["dziadkowie"],
);
// ESTRUCTURAR — gender, possessives, mieć
k.match(
  "pl-es-u2a-match-gender",
  "structure",
  "Une cada sustantivo con su género.",
  "Consonante = masculino; -a = femenino; -o, -e = neutro. Tata es masculino: es un hombre.",
  [
    ["syn", "masculino (consonante)"],
    ["tata", "masculino (aunque acabe en -a)"],
    ["babcia", "femenino"],
    ["zdjęcie", "neutro"],
  ],
);
k.gap(
  "pl-es-u2a-gap-moj",
  "structure",
  "Completa con mój, moja o moje.",
  "Mój + masculino, moja + femenino, moje + neutro.",
  "To jest ___ brat, ___ siostra i ___ dziecko.",
  [["mój"], ["moja"], ["moje"]],
);
k.gap(
  "pl-es-u2a-gap-twoj",
  "structure",
  "Completa con twój, twoja o twoje.",
  "Tata es masculino (twój), mama femenino (twoja), zdjęcie neutro (twoje).",
  "Czy to ___ tata? A to ___ mama? Ładne ___ zdjęcie!",
  [["twój"], ["twoja"], ["twoje"]],
);
k.mc(
  "pl-es-u2a-tata",
  "structure",
  "¿Cuál es correcto?",
  "Tata acaba en -a pero es masculino: mój tata.",
  ["mój tata", "moja tata", "moje tata"],
);
k.mc(
  "pl-es-u2a-jej",
  "structure",
  "Kasia ma brata. ¿Cómo dices «su hermano» (de Kasia)?",
  "El dueño es una mujer: jej, aunque brat sea masculino.",
  ["jej brat", "jego brat", "ich brat"],
);
k.mc(
  "pl-es-u2a-jego",
  "structure",
  "Piotrek ma córkę. ¿Cómo dices «su hija» (de Piotrek)?",
  "El dueño es un hombre: jego. Jego no cambia con el género de la hija.",
  ["jego córka", "jej córka", "jega córka"],
);
k.mc(
  "pl-es-u2a-moi",
  "structure",
  "Completa: ___ rodzice mieszkają w Madrycie.",
  "Rodzice es un plural de personas con al menos un hombre: moi.",
  ["Moi", "Moje", "Mój"],
);
k.gap(
  "pl-es-u2a-gap-mam",
  "structure",
  "Completa con la forma de acusativo después de mam.",
  "Femenino -a → -ę; masculino de persona + -a; neutro sin cambios.",
  "Mam ___ (siostra), ___ (brat) i ___ (dziecko).",
  [["siostrę"], ["brata"], ["dziecko"]],
);
k.gap(
  "pl-es-u2a-gap-nie-mam",
  "structure",
  "Completa con la forma de genitivo después de nie mam.",
  "Nie mam + genitivo: siostry, męża, rodzeństwa.",
  "Nie mam ___ (siostra), nie mam ___ (mąż) i nie mam ___ (rodzeństwo).",
  [["siostry"], ["męża"], ["rodzeństwa"]],
);
k.mc(
  "pl-es-u2a-nie-mam-corki",
  "structure",
  "¿Cuál es correcto?",
  "Después de nie mam: genitivo. Córka → córki.",
  ["Nie mam córki.", "Nie mam córkę.", "Nie mam córka."],
);
k.gap(
  "pl-es-u2a-gap-adjectives",
  "structure",
  "Completa el adjetivo: -y / -i para él, -a para ella.",
  "Brat → wysoki; babcia → miła; mama → elegancka.",
  "Mój brat jest wysok___, moja babcia jest mił___, a moja mama jest eleganck___.",
  [["i"], ["a"], ["a"]],
);
k.mc(
  "pl-es-u2a-przystojny",
  "structure",
  "Quieres decir que tu hermano es guapo. ¿Qué dices?",
  "Para un hombre: przystojny; para una mujer: ładna.",
  ["Mój brat jest przystojny.", "Mój brat jest ładna.", "Mój brat jest przystojna."],
);
k.mc(
  "pl-es-u2a-kto-co",
  "structure",
  "Señalas a una persona en una foto. ¿Qué preguntas?",
  "Para personas kto, para cosas co.",
  ["Kto to jest?", "Co to jest?", "Skąd to jest?"],
);
k.order(
  "pl-es-u2a-order-uncle",
  "structure",
  "Ordena: Al lado está su mujer, la tía Ewa.",
  "Obok jest + jego żona + ciocia Ewa.",
  ["Obok", "jest", "jego", "żona,", "ciocia", "Ewa."],
);
k.order(
  "pl-es-u2a-order-siblings",
  "structure",
  "Ordena la pregunta: ¿Tienes hermanos?",
  "Las preguntas de sí o no pueden empezar por czy.",
  ["Czy", "masz", "rodzeństwo?"],
);
// SONAR — same sounds, different letters
k.match(
  "pl-es-u2a-sound-pairs",
  "sound",
  "Une cada palabra con la letra que suena igual.",
  "Ó = u; rz = ż; ch = h.",
  [
    ["córka", "ó suena como u"],
    ["rzeka", "rz suena como ż"],
    ["chłopak", "ch suena como h"],
  ],
);
k.tf(
  "pl-es-u2a-sound-przystojny",
  "sound",
  "En przystojny, el grupo prz suena [pż], con voz.",
  "No: rz detrás de p pierde la voz y suena como sz: [pszystojny].",
  false,
);
k.mc(
  "pl-es-u2a-sound-maz",
  "sound",
  "¿Cómo suena mąż al final de la palabra?",
  "Al final, ż se ensordece y suena como sz: [mąsz].",
  ["[mąsz]", "[mąż] con voz", "[mas]"],
);
// CULTURA — reading and culture
k.mc(
  "pl-es-u2a-reading-parents",
  "culture",
  "Lectura: ¿dónde viven los padres de Kasia?",
  "Moi rodzice mieszkają w Tarnowie, niedaleko Krakowa.",
  ["En Tarnów, cerca de Cracovia.", "En Gdańsk.", "En Gdynia."],
);
k.tf(
  "pl-es-u2a-reading-filemon",
  "culture",
  "Lectura: Filemon es el hermano pequeño de Zosia.",
  "Zosia ma kota, Filemona — Filemon es su gato.",
  false,
);
k.mc(
  "pl-es-u2a-reading-grandpa",
  "culture",
  "Lectura: ¿qué hace el abuelo en la comida del domingo?",
  "Dziadek nie gotuje, ale opowiada śmieszne historie.",
  ["Cuenta historias divertidas.", "Cocina pierogi.", "Prepara el rosół."],
);
k.mc(
  "pl-es-u2a-culture-babcia",
  "culture",
  "Cultura: ¿qué se celebra en Polonia el 21 de enero?",
  "El 21 de enero es Dzień Babci; el 22, Dzień Dziadka.",
  ["El Día de la Abuela.", "El Día de la Madre.", "El santo de todos los Piotr."],
);
// TRANSFORMAR — translations
k.ta(
  "pl-es-u2a-translate-this",
  "transform",
  "Escribe en polaco: Este es mi padre y esta es mi madre.",
  "To jest mój tata, a to (jest) moja mama. A une con contraste; i también vale.",
  [
    "To jest mój tata, a to jest moja mama.",
    "To jest mój tata, a to moja mama.",
    "To jest mój tata i to jest moja mama.",
    "To mój tata, a to moja mama.",
  ],
);
k.ta(
  "pl-es-u2a-translate-sister",
  "transform",
  "Escribe en polaco: Tengo una hermana, pero no tengo hermanos varones.",
  "Mam siostrę (acusativo), ale nie mam brata (genitivo).",
  ["Mam siostrę, ale nie mam brata.", "Mam siostrę ale nie mam brata."],
);
k.ta(
  "pl-es-u2a-translate-children",
  "transform",
  "Escribe en polaco: No tengo hijos.",
  "Dzieci no cambia después de nie mam.",
  ["Nie mam dzieci."],
);
k.ta(
  "pl-es-u2a-translate-name",
  "transform",
  "Escribe en polaco: ¿Cómo se llama tu hermano?",
  "Jak ma na imię + twój brat?",
  ["Jak ma na imię twój brat?"],
);
k.ta(
  "pl-es-u2a-translate-her-son",
  "transform",
  "Escribe en polaco: Marta tiene un hijo. Su hijo es muy alegre.",
  "Ma syna (acusativo); jej syn (de Marta); wesoły (masculino).",
  ["Marta ma syna. Jej syn jest bardzo wesoły.", "Marta ma syna, jej syn jest bardzo wesoły."],
);
// EXPRESAR — writing
k.write(
  "pl-es-u2a-write-family",
  "express",
  "Escribe en polaco un texto sobre tu familia para un compañero de trabajo polaco: presenta a tres personas, di dónde viven, describe a dos con un adjetivo y di qué familia no tienes.",
  "Revisa: mój / moja / moi según el género, mam + acusativo, nie mam + genitivo, adjetivos -y / -a.",
  "Moja rodzina mieszka w Hiszpanii. Moi rodzice mieszkają w Walencji. Mój tata jest wysoki i spokojny, a moja mama jest bardzo wesoła. Mam brata, Pabla. Jego żona jest z Polski, z Poznania. Nie mam siostry. Mam też babcię. Ona jest bardzo miła.",
  ["tres personas", "dónde viven", "dos adjetivos", "mam…", "nie mam…"],
  30,
  90,
  7,
);
k.write(
  "pl-es-u2a-write-questions",
  "express",
  "Kasia te escribe: «Masz rodzeństwo? Jak mają na imię twoi rodzice?». Contesta y hazle dos preguntas sobre su familia.",
  "Usa mam / nie mam, ma na imię y preguntas con czy, kto o jak.",
  "Mam jednego brata. Ma na imię Diego i mieszka w Madrycie. Moja mama ma na imię Rosa, a mój tata ma na imię Luis. A ty? Czy twój brat ma dzieci? Jak ma na imię twoja babcia?",
  ["rodzeństwo", "nombres de los padres", "dos preguntas"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 2 (pl-es) total", renumber(2, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u2-photos.png",
    prompt:
      "a young woman showing photos on her smartphone to a male coworker, both sitting at a table in a bright office kitchen during lunch break, smiling, the phone screen faces away from the viewer, lunch boxes and coffee mugs on the table",
  },
]);
