// Polish for Spanish speakers — A1 unit 3A (Co jest w okolicy?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-3a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(3, "pl-es-unit-3-places", 3100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u3a-listen-shop",
  "perceive",
  "Diálogo: ¿qué hay en la esquina?",
  "Na rogu jest mały sklep spożywczy.",
  ["Una pequeña tienda de alimentación.", "Una farmacia.", "Un banco."],
);
k.mc(
  "pl-es-u3a-listen-pharmacy",
  "perceive",
  "Diálogo: ¿dónde está la farmacia?",
  "Apteka jest naprzeciwko kościoła, na ulicy Długiej.",
  ["Enfrente de la iglesia.", "Al lado del parque.", "En el supermercado."],
);
k.tf(
  "pl-es-u3a-listen-bank",
  "perceive",
  "Diálogo: en el barrio hay un banco.",
  "Banku tu nie ma — solo hay un cajero en el supermercado.",
  false,
);
k.mc(
  "pl-es-u3a-listen-tram",
  "perceive",
  "Diálogo: ¿a qué distancia está la parada del tranvía?",
  "Niedaleko, pięć minut stąd, obok parku.",
  ["A cinco minutos, al lado del parque.", "Muy lejos, en el centro.", "En la esquina."],
);
k.tf(
  "pl-es-u3a-listen-cafes",
  "perceive",
  "Diálogo: según la señora Halina, las cafeterías de la plaza mayor son baratas.",
  "Ale są drogie — son caras.",
  false,
);
// CONECTAR
k.match(
  "pl-es-u3a-match-places",
  "connect",
  "Une cada lugar con su traducción.",
  "Apteka = farmacia; poczta = correos; kantor = casa de cambio.",
  [
    ["apteka", "la farmacia"],
    ["poczta", "correos"],
    ["kantor", "la casa de cambio"],
    ["piekarnia", "la panadería"],
    ["przystanek", "la parada"],
    ["kościół", "la iglesia"],
  ],
);
k.match(
  "pl-es-u3a-match-adjectives",
  "connect",
  "Une cada adjetivo con su contrario.",
  "Duży ↔ mały; tani ↔ drogi; blisko ↔ daleko.",
  [
    ["duży", "mały"],
    ["tani", "drogi"],
    ["nowy", "stary"],
    ["blisko", "daleko"],
  ],
);
k.mc(
  "pl-es-u3a-rynek",
  "connect",
  "¿Qué es el rynek de una ciudad polaca?",
  "Rynek = la plaza mayor, la antigua plaza del mercado.",
  ["La plaza mayor.", "El mercado de abastos.", "La estación de tren."],
);
k.mc(
  "pl-es-u3a-cash",
  "connect",
  "Necesitas sacar dinero. ¿Qué buscas?",
  "Bankomat = cajero automático.",
  ["bankomat", "kantor", "apteka"],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u3a-gap-jest-sa",
  "structure",
  "Completa con jest o są.",
  "Jest + una cosa; są + varias.",
  "W okolicy ___ apteka i ___ dwie piekarnie. Gdzie ___ przystanek?",
  [["jest"], ["są"], ["jest"]],
);
k.gap(
  "pl-es-u3a-gap-nie-ma",
  "structure",
  "Completa en genitivo después de nie ma.",
  "Bank → banku, apteka → apteki, kino → kina.",
  "Tu nie ma ___ (bank), nie ma ___ (apteka) i nie ma ___ (kino).",
  [["banku"], ["apteki"], ["kina"]],
);
k.mc(
  "pl-es-u3a-nie-ma-poczty",
  "structure",
  "¿Cómo dices «aquí no hay oficina de correos»?",
  "Nie ma + genitivo: poczta → poczty.",
  ["Tu nie ma poczty.", "Tu nie jest poczta.", "Tu nie ma poczta."],
);
k.mc("pl-es-u3a-na-poczcie", "structure", "¿Cuál es correcto?", "Poczta va con na: na poczcie.", [
  "Jestem na poczcie.",
  "Jestem w poczcie.",
  "Jestem na poczta.",
]);
k.gap(
  "pl-es-u3a-gap-w-na",
  "structure",
  "Completa con w o na.",
  "W sklepie, w parku; na dworcu, na ulicy.",
  "Kasia jest ___ sklepie, Tomek jest ___ dworcu, a my jesteśmy ___ parku.",
  [["w"], ["na"], ["w"]],
);
k.match(
  "pl-es-u3a-match-locative",
  "structure",
  "Une cada lugar con su forma de locativo.",
  "Apteka → w aptece; rynek → na rynku; kawiarnia → w kawiarni.",
  [
    ["apteka", "w aptece"],
    ["rynek", "na rynku"],
    ["kawiarnia", "w kawiarni"],
    ["sklep", "w sklepie"],
    ["przystanek", "na przystanku"],
  ],
);
k.mc(
  "pl-es-u3a-obok",
  "structure",
  "Completa: Piekarnia jest obok ___.",
  "Obok pide genitivo: park → parku.",
  ["parku", "park", "parkiem"],
);
k.mc(
  "pl-es-u3a-naprzeciwko",
  "structure",
  "Completa: Bank jest naprzeciwko ___.",
  "Naprzeciwko pide genitivo: kościół → kościoła.",
  ["kościoła", "kościół", "kościele"],
);
k.mc(
  "pl-es-u3a-formal",
  "structure",
  "Preguntas a una señora mayor por la calle. ¿Qué dices?",
  "Con desconocidos: pani + tercera persona.",
  [
    "Przepraszam, czy pani wie, gdzie jest poczta?",
    "Przepraszam, czy wiesz, gdzie jest poczta?",
    "Hej, gdzie jest poczta?",
  ],
);
k.order(
  "pl-es-u3a-order-question",
  "structure",
  "Ordena: Perdone, ¿hay una farmacia cerca de aquí?",
  "Przepraszam + czy jest tu blisko + apteka?",
  ["Przepraszam,", "czy", "jest", "tu", "blisko", "apteka?"],
);
k.order(
  "pl-es-u3a-order-atm",
  "structure",
  "Ordena: El cajero está en el supermercado.",
  "Bankomat jest + w + locativo.",
  ["Bankomat", "jest", "w", "supermarkecie."],
);
k.gap(
  "pl-es-u3a-gap-adjectives",
  "structure",
  "Completa el adjetivo con la terminación del género.",
  "Sklep (m) mały; kawiarnia (f) droga; kino (n) nowe.",
  "To jest mał___ sklep, drog___ kawiarnia i now___ kino.",
  [["y"], ["a"], ["e"]],
);
// SONAR
k.mc(
  "pl-es-u3a-sound-krakowie",
  "sound",
  "¿Dónde va el acento en w Krakowie?",
  "En la penúltima: w kra-KO-wie. Se mueve respecto a KRA-ków.",
  ["kra-KO-wie", "KRA-ko-wie", "kra-ko-WIE"],
);
k.tf(
  "pl-es-u3a-sound-tilde",
  "sound",
  "La tilde de kościół indica dónde va el acento.",
  "No: en polaco la tilde (ś, ó, ć…) cambia el sonido, no marca el acento. Kościół se acentúa en la penúltima: KOŚ-ciół.",
  false,
);
k.mc(
  "pl-es-u3a-sound-muzeum",
  "sound",
  "¿Cuál de estas palabras es una excepción a la regla de la penúltima?",
  "Muzeum se acentúa mu-ZE-um (antepenúltima), por ser extranjera.",
  ["muzeum", "apteka", "przystanek"],
);
// CULTURA
k.mc(
  "pl-es-u3a-reading-where",
  "culture",
  "Lectura: ¿dónde está Kazimierz?",
  "To stara dzielnica niedaleko centrum, dziesięć minut od Rynku Głównego.",
  ["Cerca del centro de Cracovia.", "En Varsovia.", "Lejos de la ciudad, en el campo."],
);
k.tf(
  "pl-es-u3a-reading-supermarket",
  "culture",
  "Lectura: en el barrio de la autora hay un gran supermercado.",
  "Nie ma tu dużego supermarketu — está a dos paradas.",
  false,
);
k.mc(
  "pl-es-u3a-reading-saturday",
  "culture",
  "Lectura: ¿por qué hace la compra grande el sábado?",
  "W niedzielę większość sklepów jest zamknięta.",
  [
    "Porque el domingo casi todas las tiendas están cerradas.",
    "Porque el sábado es más barato.",
    "Porque trabaja el domingo.",
  ],
);
k.mc(
  "pl-es-u3a-culture-sunday",
  "culture",
  "Cultura: ¿qué suele estar abierto en Polonia un domingo normal?",
  "La mayoría de las tiendas cierra; abren farmacias, panaderías, gasolineras y tiendas pequeñas atendidas por sus dueños.",
  ["Farmacias, panaderías y gasolineras.", "Todos los supermercados.", "Solo los bancos."],
);
k.tf(
  "pl-es-u3a-culture-kantor",
  "culture",
  "Cultura: para cambiar euros, el kantor suele dar mejor cambio que el aeropuerto.",
  "Sí: los kantory de la ciudad suelen tener tipos mucho mejores.",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u3a-translate-where",
  "transform",
  "Escribe en polaco: ¿Dónde está la parada?",
  "Gdzie jest + przystanek?",
  ["Gdzie jest przystanek?"],
);
k.ta(
  "pl-es-u3a-translate-no-hospital",
  "transform",
  "Escribe en polaco: En la zona no hay hospital.",
  "W okolicy nie ma + genitivo: szpitala.",
  ["W okolicy nie ma szpitala.", "Nie ma szpitala w okolicy."],
);
k.ta(
  "pl-es-u3a-translate-next-to",
  "transform",
  "Escribe en polaco: La panadería está al lado del banco.",
  "Obok + genitivo: banku.",
  ["Piekarnia jest obok banku."],
);
k.ta(
  "pl-es-u3a-translate-station",
  "transform",
  "Escribe en polaco: Estoy en la estación.",
  "Dworzec va con na: na dworcu.",
  ["Jestem na dworcu."],
);
k.ta(
  "pl-es-u3a-translate-two-parks",
  "transform",
  "Escribe en polaco: En mi barrio hay dos parques y una biblioteca.",
  "Są + plural; dwa parki. «Mi barrio»: w mojej okolicy / na moim osiedlu.",
  [
    "W mojej okolicy są dwa parki i biblioteka.",
    "W mojej okolicy są dwa parki i jedna biblioteka.",
    "Na moim osiedlu są dwa parki i biblioteka.",
  ],
);
// EXPRESAR
k.write(
  "pl-es-u3a-write-district",
  "express",
  "Describe tu barrio para un amigo polaco: dónde está, qué hay, qué no hay, dónde está cada cosa y cómo es.",
  "Revisa: jest / są, nie ma + genitivo, w / na + locativo, obok / naprzeciwko + genitivo, adjetivos concordados.",
  "Mieszkam w Madrycie, w dzielnicy Lavapiés. To stara dzielnica w centrum. W mojej okolicy jest dużo małych sklepów i restauracji. Na rogu jest piekarnia, a obok jest apteka. Naprzeciwko mojej kamienicy jest mały park. Nie ma tu dużego supermarketu, ale jest stacja metra.",
  ["dónde está", "qué hay", "qué no hay", "dónde está cada cosa", "cómo es"],
  30,
  90,
  7,
);
k.write(
  "pl-es-u3a-write-note",
  "express",
  "Un amigo polaco viene a tu casa. Escríbele una nota: dónde hay una panadería, una farmacia y una parada de autobús cerca de tu casa.",
  "Usa jest + na rogu / obok / naprzeciwko / niedaleko + genitivo.",
  "Cześć, Piotrek! Piekarnia jest na rogu, obok banku. Apteka jest naprzeciwko kościoła, pięć minut stąd. Przystanek autobusowy jest niedaleko parku. Do zobaczenia!",
  ["panadería", "farmacia", "parada"],
  20,
  60,
  5,
);
console.log("saved", k.save(), "unit 3 (pl-es) total", renumber(3, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u3-neighbour.png",
    prompt:
      "an elderly woman and a young man talking on the staircase landing of an old European apartment building with wooden banisters and tall windows, the young man holds a cardboard moving box, the woman smiles and points out of the window",
  },
]);
