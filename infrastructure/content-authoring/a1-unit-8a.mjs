// Spanish for Polish speakers — A1 unit 8A (Se alquila piso) exercises.
//   node infrastructure/content-authoring/a1-unit-8a.mjs
import fs from "node:fs";

import { kit, planImages, renumber } from "./ex-kit.mjs";

// Older unit-8 exercises: put them in their proper PUENTE phase.
const EX = "c:/Users/usuario/TFM-BIC/content/languages/es/levels/a1/exercises/";
for (const [id, phase] of [
  ["es-u8-armario", "connect"],
  ["es-u8-dormitorio", "connect"],
  ["es-u8-luminoso", "connect"],
  ["es-u8-piso", "connect"],
  ["es-u8-barato", "connect"],
  ["es-u8-peor", "structure"],
]) {
  const file = `${EX}${id}.json`;
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/"phase": "\w+"/, `"phase": "${phase}"`),
  );
}

const a = kit(8, "es-unit-8-home", 300);
// PERCIBIR
a.tf(
  "es-u8a-listen-bright",
  "perceive",
  "Dialog: mieszkanie jest ciemne.",
  "¡Qué luminoso! — Sí, es exterior.",
  false,
);
a.mc(
  "es-u8a-listen-floor",
  "perceive",
  "Dialog: na którym piętrze jest mieszkanie?",
  "Está en un cuarto piso con ascensor.",
  ["Na czwartym, z windą.", "Na parterze.", "Na drugim, bez windy."],
);
a.mc(
  "es-u8a-listen-bedrooms",
  "perceive",
  "Dialog: jakie są sypialnie?",
  "Hay dos: una más grande y otra más pequeña pero más tranquila.",
  ["Dwie: większa i mniejsza, ale cichsza.", "Jedna duża.", "Trzy małe."],
);
a.mc(
  "es-u8a-listen-bathroom",
  "perceive",
  "Dialog: gdzie jest łazienka?",
  "El baño está entre los dos dormitorios.",
  ["Między dwiema sypialniami.", "Obok kuchni.", "Na końcu korytarza."],
);
a.mc(
  "es-u8a-listen-rent",
  "perceive",
  "Dialog: ile wynosi czynsz i ile opłaty?",
  "Novecientos euros al mes; luz y agua aparte, unos sesenta.",
  ["900 € + około 60 € opłat.", "600 € z opłatami.", "960 € z opłatami."],
);
// CONECTAR
a.match(
  "es-u8a-match-furniture",
  "connect",
  "Połącz meble i sprzęty z tłumaczeniem.",
  "La lavadora = pralka; el horno = piekarnik; la estantería = regał.",
  [
    ["la lavadora", "pralka"],
    ["el horno", "piekarnik"],
    ["la estantería", "regał"],
    ["el sillón", "fotel"],
    ["la bañera", "wanna"],
    ["el lavavajillas", "zmywarka"],
  ],
);
a.match(
  "es-u8a-match-adjectives",
  "connect",
  "Połącz przeciwieństwa.",
  "Luminoso ↔ oscuro; tranquilo ↔ ruidoso; exterior ↔ interior.",
  [
    ["luminoso", "oscuro"],
    ["tranquilo", "ruidoso"],
    ["exterior", "interior"],
    ["amplio", "pequeño"],
  ],
);
a.mc(
  "es-u8a-exterior",
  "connect",
  "Co znaczy piso exterior w ogłoszeniu?",
  "Exterior = okna wychodzą na ulicę (zwykle jaśniej).",
  ["Mieszkanie z oknami na ulicę.", "Dom za miastem.", "Mieszkanie z ogrodem."],
);
a.mc("es-u8a-alquiler", "connect", "Co to jest el alquiler?", "El alquiler = czynsz najmu.", [
  "Czynsz najmu.",
  "Kaucja.",
  "Agencja nieruchomości.",
]);
// ESTRUCTURAR
a.gap(
  "es-u8a-gap-hay-esta",
  "structure",
  "Uzupełnij hay albo está.",
  "Hay + un / dos; está + el / la.",
  "En el piso ___ dos dormitorios. La cocina ___ al lado del salón. ¿___ lavadora?",
  [["hay"], ["está"], ["Hay"]],
);
a.mc(
  "es-u8a-donde-esta",
  "structure",
  "Które pytanie jest poprawne?",
  "O konkretną, znaną rzecz pytasz z está.",
  ["¿Dónde está el baño?", "¿Dónde hay el baño?", "¿Dónde es el baño?"],
);
a.gap(
  "es-u8a-gap-place",
  "structure",
  "Uzupełnij wyrażeniem miejsca.",
  "Encima de (na), debajo de (pod), entre (między).",
  "La lámpara está ___ la mesa, el gato está ___ la cama y el baño está ___ los dormitorios.",
  [["encima de", "sobre"], ["debajo de"], ["entre"]],
);
a.mc("es-u8a-del", "structure", "Które zdanie jest poprawne?", "De + el = del.", [
  "La cocina está al lado del salón.",
  "La cocina está al lado de el salón.",
  "La cocina está al lado salón.",
]);
a.gap(
  "es-u8a-gap-comparison",
  "structure",
  "Uzupełnij porównanie: más / menos / tan / que / como.",
  "Más… que, tan… como.",
  "Mi piso es ___ pequeño ___ el tuyo, pero es ___ luminoso ___ tu casa.",
  [["más"], ["que"], ["tan"], ["como"]],
);
a.mc("es-u8a-mejor", "structure", "Które zdanie jest poprawne?", "Bueno → mejor; „niż” = que.", [
  "Este piso es mejor que aquel.",
  "Este piso es más bueno que aquel.",
  "Este piso es mejor de aquel.",
]);
a.mc(
  "es-u8a-mayor",
  "structure",
  "Jak powiesz „Mój brat jest starszy ode mnie”?",
  "Wiek: mayor que.",
  ["Mi hermano es mayor que yo.", "Mi hermano es más viejo de mí.", "Mi hermano es grande que yo."],
);
a.match(
  "es-u8a-match-floors",
  "structure",
  "Połącz piętra.",
  "Primero → primer piso; tercero → tercer piso; parter = planta baja.",
  [
    ["1.º", "primer piso"],
    ["3.º", "tercer piso"],
    ["4.º", "cuarto piso"],
    ["parter", "planta baja"],
  ],
);
a.mc(
  "es-u8a-primer",
  "structure",
  "Uzupełnij: Vivo en el ___ piso (1).",
  "Primero przed rzeczownikiem męskim: primer.",
  ["primer", "primero", "uno"],
);
a.order(
  "es-u8a-order-where",
  "structure",
  "Ułóż: Łazienka jest na końcu korytarza.",
  "El baño está + al fondo del pasillo.",
  ["El", "baño", "está", "al", "fondo", "del", "pasillo."],
);
a.order(
  "es-u8a-order-compare",
  "structure",
  "Ułóż: To mieszkanie jest droższe niż moje.",
  "Este piso es + más caro que + el mío.",
  ["Este", "piso", "es", "más", "caro", "que", "el", "mío."],
);
// SONAR
a.mc(
  "es-u8a-sound-taxi",
  "sound",
  "Jak brzmi x w słowie taxi?",
  "Między samogłoskami: [ks] — [taksi].",
  ["[ks]", "[ch]", "[s]"],
);
a.mc(
  "es-u8a-sound-mexico",
  "sound",
  "Jak wymawia się México?",
  "W tej nazwie x czyta się jak hiszpańskie j: [méjiko].",
  ["[méjiko], jak j.", "[méksiko].", "[mésiko]."],
);
a.tf(
  "es-u8a-sound-exterior",
  "sound",
  "W codziennej mowie exterior często brzmi [esterior].",
  "Tak: przed spółgłoską x często upraszcza się do [s].",
  true,
);
// CULTURA
a.mc(
  "es-u8a-reading-share",
  "culture",
  "Lectura: co często robią młodzi w Madrycie?",
  "Muchas veces comparten piso.",
  ["Wynajmują wspólne mieszkanie.", "Kupują dom za miastem.", "Mieszkają w hotelu."],
);
a.tf(
  "es-u8a-reading-exterior",
  "culture",
  "Lectura: mieszkania z oknami na podwórze (interiores) są jaśniejsze.",
  "Los exteriores son más luminosos que los interiores.",
  false,
);
a.mc(
  "es-u8a-reading-pay",
  "culture",
  "Lectura: co trzeba zwykle zapłacić na początku?",
  "El primer mes y una fianza de uno o dos meses.",
  ["Pierwszy miesiąc i kaucję.", "Rok z góry.", "Nic."],
);
a.mc(
  "es-u8a-culture-heating",
  "culture",
  "Kultura: co często zaskakuje Polaków w hiszpańskich mieszkaniach zimą?",
  "Wiele starych mieszkań nie ma centralnego ogrzewania: w środku bywa chłodno.",
  ["Że w środku jest chłodno.", "Że jest za gorąco.", "Że nie ma okien."],
);
// TRANSFORMAR
a.ta(
  "es-u8a-translate-how-many",
  "transform",
  "Napisz po hiszpańsku: Ile pokoi (sypialni) ma mieszkanie?",
  "¿Cuántos dormitorios tiene el piso? / ¿Cuántos dormitorios hay?",
  [
    "¿Cuántos dormitorios tiene el piso?",
    "¿Cuántos dormitorios hay?",
    "¿Cuántos dormitorios hay en el piso?",
  ],
);
a.ta(
  "es-u8a-translate-next-to",
  "transform",
  "Napisz po hiszpańsku: Kuchnia jest obok łazienki.",
  "La cocina está al lado del baño.",
  ["La cocina está al lado del baño."],
);
a.ta(
  "es-u8a-translate-third",
  "transform",
  "Napisz po hiszpańsku: Mieszkam na trzecim piętrze.",
  "Vivo en el tercer piso / en un tercero.",
  ["Vivo en el tercer piso.", "Vivo en un tercer piso.", "Vivo en el tercero."],
);
a.ta(
  "es-u8a-translate-quieter",
  "transform",
  "Napisz po hiszpańsku: Ta sypialnia jest cichsza niż tamta.",
  "Este dormitorio es más tranquilo que aquel.",
  ["Este dormitorio es más tranquilo que aquel.", "Este dormitorio es más tranquilo que ese."],
);
a.ta(
  "es-u8a-translate-rent",
  "transform",
  "Napisz po hiszpańsku: Ile wynosi czynsz?",
  "¿Cuánto es el alquiler?",
  ["¿Cuánto es el alquiler?", "¿Cuánto cuesta el alquiler?"],
);
// EXPRESAR
a.write(
  "es-u8a-write-ad",
  "express",
  "Napisz ogłoszenie o wynajmie swojego (prawdziwego albo wymyślonego) mieszkania: piętro, pokoje, meble, co jest w okolicy i cena.",
  "Sprawdź: hay / está, primer / tercer piso, al lado de, przymiotniki zgodne z rzeczownikiem.",
  "Se alquila piso exterior en el centro de Valencia. Está en un tercer piso con ascensor. Hay dos dormitorios, un salón amplio, una cocina con lavadora y horno, y un baño con ducha. El piso está amueblado y reformado. Al lado del edificio hay un supermercado y una parada de metro. Alquiler: ochocientos euros al mes.",
  ["piętro", "pokoje", "meble i sprzęty", "okolica", "cena"],
  35,
  110,
  8,
);
a.write(
  "es-u8a-write-compare",
  "express",
  "Porównaj swoje mieszkanie z mieszkaniem kogoś z rodziny albo z mieszkaniem z dialogu.",
  "Más / menos… que, tan… como, mejor / peor, mayor.",
  "Mi piso es más pequeño que el piso de Marek, pero es más tranquilo. Su salón es más luminoso que mi salón, porque su piso es exterior. Mi cocina es tan moderna como la suya. Su piso es más caro, pero está mejor: está reformado.",
  ["trzy porównania", "mejor / peor albo tan… como"],
  25,
  80,
  6,
);
console.log("8A", a.save(), "unit 8 total", renumber(8));

planImages([
  {
    asset: "a1-u8-flat.png",
    prompt:
      "a middle-aged woman shows a bright furnished living room to a young man, a sofa, a dining table with chairs, a tall window with a small balcony and sunlight, tiled floor, no text or signs",
  },
]);
