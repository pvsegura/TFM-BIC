// Polish for Spanish speakers — cumulative review of A1 units 1–3, printed at the end of unit 3 in
// the workbook (phase "review") and available in the app with the unit 3B exercises.
//   node infrastructure/content-authoring/pl-es-a1-review-1-3.mjs
import { kit, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const r = kit(3, "pl-es-unit-3-directions", 3900, COURSE);
const R = "Repaso 1–3. ";
r.mc(
  "pl-es-r13-greeting",
  "review",
  `${R}Son las ocho de la tarde y entras en una tienda. ¿Qué dices?`,
  "Por la tarde-noche: dobry wieczór.",
  ["Dobry wieczór.", "Dzień dobry wieczór.", "Dobranoc."],
);
r.mc(
  "pl-es-r13-formal-name",
  "review",
  `${R}Preguntas el nombre a una señora en una oficina. ¿Qué dices?`,
  "Formal: pani + tercera persona.",
  ["Jak pani ma na imię?", "Jak masz na imię?", "Jak pani masz na imię?"],
);
r.gap(
  "pl-es-r13-byc",
  "review",
  `${R}Completa con być.`,
  "Ja jestem, ona jest, my jesteśmy.",
  "Ja ___ z Hiszpanii, ona ___ z Polski, a my ___ przyjaciółmi.",
  [["jestem"], ["jest"], ["jesteśmy"]],
);
r.mc(
  "pl-es-r13-from",
  "review",
  `${R}¿Cómo dices «soy de México, de Guadalajara»?`,
  "Z + genitivo: z Meksyku, z Guadalajary.",
  [
    "Jestem z Meksyku, z Guadalajary.",
    "Jestem z Meksyk, z Guadalajara.",
    "Jestem w Meksyku, w Guadalajarze.",
  ],
);
r.mc("pl-es-r13-language", "review", `${R}¿Cuál es correcto?`, "Con mówić: po + -sku / -cku.", [
  "Mówię po hiszpańsku i trochę po polsku.",
  "Mówię hiszpański i trochę polski.",
  "Mówię po hiszpański.",
]);
r.gap(
  "pl-es-r13-verbs",
  "review",
  `${R}Completa con mówić, mieszkać y pracować.`,
  "Ty mówisz; oni mieszkają; my pracujemy.",
  "Czy ty ___ po angielsku? Moi rodzice ___ w Madrycie. My ___ w hotelu.",
  [["mówisz"], ["mieszkają"], ["pracujemy"]],
);
r.mc(
  "pl-es-r13-czy",
  "review",
  `${R}Transforma en pregunta de sí o no: Mieszkasz w Krakowie.`,
  "Czy al principio, sin cambiar el orden.",
  ["Czy mieszkasz w Krakowie?", "Mieszkasz czy w Krakowie?", "Gdzie mieszkasz w Krakowie?"],
);
r.match(
  "pl-es-r13-numbers",
  "review",
  `${R}Une cada número con su nombre.`,
  "15 piętnaście, 19 dziewiętnaście, 40 czterdzieści, 60 sześćdziesiąt.",
  [
    ["15", "piętnaście"],
    ["19", "dziewiętnaście"],
    ["40", "czterdzieści"],
    ["60", "sześćdziesiąt"],
    ["100", "sto"],
  ],
);
r.gap(
  "pl-es-r13-lat",
  "review",
  `${R}Completa con rok, lata o lat.`,
  "1 rok; 2–4 (no 12–14) lata; el resto lat.",
  "Hugo ma ___ (1), Zosia ma pięć ___, a Kasia ma trzydzieści dwa ___.",
  [["rok"], ["lat"], ["lata"]],
);
r.gap(
  "pl-es-r13-possessives",
  "review",
  `${R}Completa con mój, moja o moje.`,
  "Brat (m) mój; córka (f) moja; zdjęcie (n) moje.",
  "To jest ___ brat, ___ córka i ___ zdjęcie z wesela.",
  [["mój"], ["moja"], ["moje"]],
);
r.mc(
  "pl-es-r13-jej",
  "review",
  `${R}Marta tiene un marido. ¿Cómo dices «su marido» (de Marta)?`,
  "Dueña mujer: jej.",
  ["jej mąż", "jego mąż", "swój mąż jej"],
);
r.mc("pl-es-r13-nie-mam", "review", `${R}¿Cuál es correcto?`, "Nie mam + genitivo: siostry.", [
  "Nie mam siostry.",
  "Nie mam siostrę.",
  "Nie mam siostra.",
]);
r.mc(
  "pl-es-r13-date",
  "review",
  `${R}¿Cómo dices «mi cumpleaños es el 3 de mayo»?`,
  "Ordinal en genitivo + mes en genitivo.",
  ["Mam urodziny trzeciego maja.", "Mam urodziny trzy maj.", "Mam urodziny trzeci maja."],
);
r.gap(
  "pl-es-r13-month",
  "review",
  `${R}Completa con w / we + mes.`,
  "Luty → w lutym; wrzesień → we wrześniu.",
  "Mam urodziny ___ (luty), a imieniny ___ (wrzesień).",
  [["w lutym"], ["we wrześniu"]],
);
r.gap(
  "pl-es-r13-nie-ma",
  "review",
  `${R}Completa en genitivo después de nie ma.`,
  "Apteka → apteki; sklep → sklepu.",
  "W okolicy nie ma ___ (apteka) ani ___ (sklep).",
  [["apteki"], ["sklepu"]],
);
r.mc("pl-es-r13-w-na", "review", `${R}¿Cuál es correcto?`, "Dworzec y poczta van con na.", [
  "Jestem na dworcu, a Kasia na poczcie.",
  "Jestem w dworcu, a Kasia w poczcie.",
  "Jestem na dworzec, a Kasia na poczta.",
]);
r.mc(
  "pl-es-r13-obok",
  "review",
  `${R}Completa: Apteka jest obok ___.`,
  "Obok + genitivo: bank → banku.",
  ["banku", "bank", "bankiem"],
);
r.gap(
  "pl-es-r13-isc-jechac",
  "review",
  `${R}Completa con idę o jadę.`,
  "A pie idę; en vehículo jadę.",
  "Do piekarni ___ pieszo, a do Poznania ___ pociągiem.",
  [["idę"], ["jadę"]],
);
r.mc(
  "pl-es-r13-dokad",
  "review",
  `${R}— Dokąd jedziesz? ¿Qué respondes?`,
  "Dokąd? → do + genitivo.",
  ["Do Krakowa.", "W Krakowie.", "Kraków."],
);
r.mc(
  "pl-es-r13-sound",
  "review",
  `${R}¿Qué letra o grupo suena igual que ż?`,
  "Rz y ż suenan igual.",
  ["rz", "sz", "cz"],
);
r.ta(
  "pl-es-r13-translate-intro",
  "review",
  `${R}Escribe en polaco: Me llamo Ana, soy de España y vivo en Varsovia.`,
  "Mam na imię…, jestem z Hiszpanii, mieszkam w Warszawie.",
  [
    "Mam na imię Ana, jestem z Hiszpanii i mieszkam w Warszawie.",
    "Mam na imię Ana. Jestem z Hiszpanii i mieszkam w Warszawie.",
    "Mam na imię Ana, jestem z Hiszpanii, mieszkam w Warszawie.",
    "Nazywam się Ana, jestem z Hiszpanii i mieszkam w Warszawie.",
  ],
);
r.ta(
  "pl-es-r13-translate-family",
  "review",
  `${R}Escribe en polaco: Tengo un hermano. Su mujer es de Polonia.`,
  "Mam brata. Jego żona jest z Polski.",
  ["Mam brata. Jego żona jest z Polski.", "Mam brata, jego żona jest z Polski."],
);
r.ta(
  "pl-es-r13-translate-way",
  "review",
  `${R}Escribe en polaco (formal): Siga recto y en el cruce gire a la derecha.`,
  "Proszę iść prosto i na skrzyżowaniu skręcić w prawo.",
  [
    "Proszę iść prosto i na skrzyżowaniu skręcić w prawo.",
    "Proszę iść prosto, a na skrzyżowaniu skręcić w prawo.",
    "Proszę iść prosto i na skrzyżowaniu proszę skręcić w prawo.",
  ],
);
r.write(
  "pl-es-r13-write-me",
  "review",
  `${R}Escribe un texto sobre ti: quién eres, de dónde eres, dónde vives y qué hay en tu barrio, tu familia y cuándo es tu cumpleaños.`,
  "Usa lo aprendido en las unidades 1–3: z / w, po + idioma, mam / nie mam, fechas, jest / nie ma.",
  "Cześć! Mam na imię Pablo i jestem z Hiszpanii, z Bilbao. Teraz mieszkam w Gdańsku, niedaleko morza. Mówię po hiszpańsku, po angielsku i trochę po polsku. Mam siostrę, ale nie mam brata. Moja siostra mieszka w Madrycie. Mam urodziny dziesiątego kwietnia. W mojej okolicy jest park i dużo kawiarni, ale nie ma kina.",
  ["quién eres", "de dónde", "dónde vives", "familia", "cumpleaños", "tu barrio"],
  40,
  120,
  9,
);
console.log("review 1-3 saved", r.save(), "unit 3 (pl-es) total", renumber(3, { ...COURSE }));
