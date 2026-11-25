// Example of a unit script (unit 2B). Already applied — kept as a template; re-running only rewrites the same files.
import { kit, planImages, renumber } from "./ex-kit.mjs";

const k = kit(2, "es-unit-2-birthdays", 400);
k.mc(
  "es-u2b-listen-age",
  "perceive",
  "Dialog: ile lat kończy tata Marty?",
  "Sesenta — sześćdziesiąt.",
  ["60", "70", "50"],
);
k.mc(
  "es-u2b-listen-date",
  "perceive",
  "Dialog: kiedy jest przyjęcie?",
  "El sábado veinte de mayo a las dos.",
  ["W sobotę 20 maja o 14:00.", "W niedzielę 12 maja o 20:00.", "W sobotę 2 marca o 12:00."],
);
k.tf(
  "es-u2b-listen-ines",
  "perceive",
  "Dialog: Inés ma krótkie, jasne włosy i niebieskie oczy.",
  "Es morena, tiene el pelo largo y los ojos verdes.",
  false,
);
k.match(
  "es-u2b-match-months",
  "connect",
  "Połącz miesiące z tłumaczeniem.",
  "Junio to czerwiec, julio — lipiec; enero — styczeń.",
  [
    ["enero", "styczeń"],
    ["junio", "czerwiec"],
    ["julio", "lipiec"],
    ["octubre", "październik"],
    ["diciembre", "grudzień"],
  ],
);
k.match(
  "es-u2b-match-looks",
  "connect",
  "Połącz opis z tłumaczeniem.",
  "Pelo rizado = kręcone włosy; lleva gafas = nosi okulary.",
  [
    ["el pelo rizado", "kręcone włosy"],
    ["los ojos marrones", "brązowe oczy"],
    ["lleva gafas", "nosi okulary"],
    ["es calvo", "jest łysy"],
  ],
);
k.mc(
  "es-u2b-ser-tener",
  "structure",
  "Uzupełnij: Mi hermano ___ alto y ___ los ojos azules.",
  "Ser — cecha całej osoby (alto); tener — części ciała (los ojos).",
  ["es / tiene", "tiene / es", "está / tiene"],
);
k.mc(
  "es-u2b-pelo",
  "structure",
  "Wybierz poprawne zdanie: Ona ma długie włosy.",
  "El pelo w liczbie pojedynczej, z rodzajnikiem, przymiotnik po rzeczowniku.",
  ["Tiene el pelo largo.", "Tiene largos pelos.", "Es pelo largo."],
);
k.gap(
  "es-u2b-gap-date",
  "structure",
  "Napisz datę słownie: 12 marca.",
  "Data: el + liczba główna + de + miesiąc (małą literą).",
  "Mi cumpleaños es el ___ de ___.",
  [["doce"], ["marzo"]],
);
k.mc(
  "es-u2b-cumplir",
  "structure",
  "Uzupełnij: Mañana mi abuela ___ ochenta años.",
  "Kończyć lata = cumplir (ella cumple).",
  ["cumple", "tiene", "es"],
);
k.gap(
  "es-u2b-gap-plural",
  "structure",
  "Utwórz liczbę mnogą: el profesor joven → los ___ ___.",
  "Spółgłoska + es; joven → jóvenes z kreską.",
  "los ___ ___",
  [["profesores"], ["jóvenes"]],
);
k.order(
  "es-u2b-order-question",
  "structure",
  "Ułóż pytanie: Kiedy są urodziny twojej siostry?",
  "Pytanie z cuándo: ¿Cuándo es el cumpleaños de…?",
  ["¿Cuándo", "es", "el", "cumpleaños", "de", "tu", "hermana?"],
);
k.tf(
  "es-u2b-sound-question",
  "sound",
  "W pytaniu tak/nie (¿Tienes hermanos?) głos na końcu idzie w górę.",
  "Tak — samo podniesienie głosu zamienia zdanie w pytanie.",
  true,
);
k.mc(
  "es-u2b-reading-santo",
  "culture",
  "Czytanka: co w Hiszpanii świętuje się przede wszystkim?",
  "En España las personas celebran sobre todo el cumpleaños.",
  ["Urodziny.", "Imieniny.", "Rocznicę ślubu."],
);
k.mc(
  "es-u2b-reading-reyes",
  "culture",
  "Czytanka: kiedy dzieci dostają prezenty od Trzech Króli?",
  "De los Reyes Magos, el seis de enero.",
  ["6 stycznia.", "24 grudnia.", "19 marca."],
);
k.ta(
  "es-u2b-translate-birthday",
  "transform",
  "Napisz po hiszpańsku: Kiedy masz urodziny?",
  "Pytanie z cuándo i rzeczownikiem cumpleaños.",
  ["¿Cuándo es tu cumpleaños?", "Cuándo es tu cumpleaños"],
);
k.ta(
  "es-u2b-translate-glasses",
  "transform",
  "Napisz po hiszpańsku: Mój tata nosi okulary i ma siwe włosy.",
  "Llevar gafas; tener el pelo canoso.",
  ["Mi padre lleva gafas y tiene el pelo canoso.", "Mi padre tiene el pelo canoso y lleva gafas."],
);
k.write(
  "es-u2b-write-person",
  "express",
  "Opisz członka rodziny albo przyjaciela: wygląd (ser, tener, llevar), charakter i datę urodzin.",
  "Sprawdź, czy używasz ser dla całej osoby, tener dla włosów i oczu oraz czy data ma liczbę główną.",
  "Mi mejor amiga se llama Kasia. Es alta y delgada. Tiene el pelo rizado y los ojos azules. Lleva gafas. Es muy trabajadora y divertida. Su cumpleaños es el tres de octubre.",
  [
    "ser + cecha całej osoby",
    "tener + el pelo / los ojos",
    "co najmniej jeden przymiotnik charakteru",
    "data urodzin z el + liczba + de + miesiąc",
  ],
  20,
  80,
  7,
);
console.log("saved", k.save(), "unit 2 total", renumber(2));

planImages([
  {
    asset: "a1-u2-birthday.png",
    prompt:
      "a family birthday party at home: a smiling grandfather blows out candles on a cake, family members around him clap, balloons, no text on the cake",
  },
]);
