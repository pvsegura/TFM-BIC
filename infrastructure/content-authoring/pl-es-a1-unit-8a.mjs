// Polish for Spanish speakers — A1 unit 8A (Parapetówka) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-8a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(8, "pl-es-unit-8-home", 8100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u8a-listen-gift",
  "perceive",
  "Diálogo: ¿qué le trae Kasia a Javier?",
  "Mam dla ciebie chleb i sól.",
  ["Pan y sal.", "Flores.", "Una botella de vino."],
);
k.mc(
  "pl-es-u8a-listen-rooms",
  "perceive",
  "Diálogo: ¿qué tiene el piso?",
  "Ma dwa pokoje, kuchnię i łazienkę.",
  [
    "Dos habitaciones, cocina y baño.",
    "Tres habitaciones y dos baños.",
    "Una habitación y cocina.",
  ],
);
k.mc(
  "pl-es-u8a-listen-painting",
  "perceive",
  "Diálogo: ¿dónde está el cuadro de Sevilla?",
  "Nad kanapą wisi obraz z Sewilli.",
  ["Encima del sofá.", "En el dormitorio.", "Debajo de la ventana."],
);
k.tf(
  "pl-es-u8a-listen-bedroom",
  "perceive",
  "Diálogo: el dormitorio es más grande que el salón.",
  "Jest mniejsza niż salon, ale cichsza.",
  false,
);
k.mc(
  "pl-es-u8a-listen-floor",
  "perceive",
  "Diálogo: ¿en qué piso está el nuevo piso de Javier?",
  "Jest na drugim piętrze, nie na parterze.",
  ["En el segundo.", "En la planta baja.", "En el cuarto."],
);
// CONECTAR
k.match(
  "pl-es-u8a-match-rooms",
  "connect",
  "Une cada palabra con su traducción.",
  "Sypialnia = dormitorio; przedpokój = recibidor; piwnica = trastero.",
  [
    ["sypialnia", "el dormitorio"],
    ["przedpokój", "el recibidor"],
    ["korytarz", "el pasillo"],
    ["piwnica", "el trastero"],
    ["parter", "la planta baja"],
  ],
);
k.match(
  "pl-es-u8a-match-furniture",
  "connect",
  "Une cada mueble o aparato con su traducción.",
  "Szafa = armario; lodówka = nevera; biurko = escritorio.",
  [
    ["szafa", "el armario"],
    ["lodówka", "la nevera"],
    ["biurko", "el escritorio"],
    ["półka", "la estantería"],
    ["zmywarka", "el lavavajillas"],
    ["obraz", "el cuadro"],
  ],
);
k.mc(
  "pl-es-u8a-parapetowka",
  "connect",
  "¿Qué es una parapetówka?",
  "La fiesta para inaugurar un piso nuevo.",
  ["La fiesta de inauguración de un piso.", "El alféizar de la ventana.", "Una mudanza."],
);
k.mc(
  "pl-es-u8a-drzwi",
  "connect",
  "Completa: Te ___ są nowe. (drzwi)",
  "Drzwi solo existe en plural: te drzwi są.",
  ["drzwi", "drzwa", "drzwia"],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u8a-gap-position",
  "structure",
  "Completa con stoi, leży o wisi.",
  "Cuadro colgado → wisi; libro en la mesa → leży; sofá → stoi.",
  "Nad kanapą ___ obraz, na stole ___ książka, a pod oknem ___ kanapa.",
  [["wisi"], ["leży"], ["stoi"]],
);
k.mc(
  "pl-es-u8a-wisi",
  "structure",
  "¿Cuál es lo más natural?",
  "La lámpara del techo cuelga: wisi.",
  ["Nad stołem wisi lampa.", "Nad stołem leży lampa.", "Nad stołem stoi lampa."],
);
k.mc(
  "pl-es-u8a-leza",
  "structure",
  "Completa: Na stole ___ klucze.",
  "Klucze (plural, tumbadas): leżą.",
  ["leżą", "leży", "wiszą"],
);
k.gap(
  "pl-es-u8a-gap-instrumental",
  "structure",
  "Completa con el instrumental.",
  "Okno → pod oknem; kanapa → nad kanapą; łóżko → pod łóżkiem.",
  "Fotel stoi pod ___ (okno), lampa wisi nad ___ (kanapa), a kot śpi pod ___ (łóżko).",
  [["oknem"], ["kanapą"], ["łóżkiem"]],
);
k.mc(
  "pl-es-u8a-miedzy",
  "structure",
  "¿Cuál es correcto?",
  "Między + instrumental: między szafą a oknem.",
  [
    "Biurko stoi między szafą a oknem.",
    "Biurko stoi między szafa i okno.",
    "Biurko stoi między szafy a okna.",
  ],
);
k.mc(
  "pl-es-u8a-obok",
  "structure",
  "Completa: Sypialnia jest obok ___ (łazienka).",
  "Obok + genitivo: łazienki.",
  ["łazienki", "łazienką", "łazience"],
);
k.match(
  "pl-es-u8a-match-comparatives",
  "structure",
  "Une cada adjetivo con su comparativo.",
  "Duży → większy, dobry → lepszy, tani → tańszy, jasny → jaśniejszy.",
  [
    ["duży", "większy"],
    ["dobry", "lepszy"],
    ["mały", "mniejszy"],
    ["tani", "tańszy"],
    ["jasny", "jaśniejszy"],
  ],
);
k.gap(
  "pl-es-u8a-gap-comparative",
  "structure",
  "Completa con el comparativo concordado.",
  "Mieszkanie (n) większe; kuchnia (f) mniejsza; pokój (m) cichszy.",
  "Moje mieszkanie jest ___ (duży) niż twoje, ale kuchnia jest ___ (mały), a pokój ___ (cichy).",
  [["większe"], ["mniejsza"], ["cichszy"]],
);
k.mc(
  "pl-es-u8a-bardziej",
  "structure",
  "¿Cómo dices «mejor» (dobry)?",
  "Irregular: lepszy, nunca bardziej dobry.",
  ["lepszy", "bardziej dobry", "dobrzejszy"],
);
k.mc("pl-es-u8a-niz", "structure", "¿Cuál es correcto?", "Niż + nominativo.", [
  "Mój pokój jest większy niż twój.",
  "Mój pokój jest większy od twój.",
  "Mój pokój jest więcej duży niż twój.",
]);
k.mc(
  "pl-es-u8a-pietro",
  "structure",
  "¿Cómo dices «vivo en el tercer piso»?",
  "Na + locativo: na trzecim piętrze.",
  ["Mieszkam na trzecim piętrze.", "Mieszkam w trzecie piętro.", "Mieszkam na trzy piętro."],
);
k.order(
  "pl-es-u8a-order-painting",
  "structure",
  "Ordena: Encima del sofá cuelga un cuadro.",
  "Nad kanapą + wisi + obraz.",
  ["Nad", "kanapą", "wisi", "obraz."],
);
k.order(
  "pl-es-u8a-order-compare",
  "structure",
  "Ordena: El dormitorio es más pequeño que el salón.",
  "Sypialnia jest mniejsza niż salon.",
  ["Sypialnia", "jest", "mniejsza", "niż", "salon."],
);
// SONAR
k.mc(
  "pl-es-u8a-sound-jaki",
  "sound",
  "¿Cómo dices «¡Qué cocina tan grande!»?",
  "Jaka (kuchnia es femenino) + adjetivo + sustantivo.",
  ["Jaka duża kuchnia!", "Jak duża kuchnia!", "Jaki duży kuchnia!"],
);
k.tf(
  "pl-es-u8a-sound-intonation",
  "sound",
  "En Jak tu ładnie! la voz sube con fuerza en ŁAD- y baja al final.",
  "Sí: se resalta la palabra que se admira.",
  true,
);
k.mc(
  "pl-es-u8a-sound-jak",
  "sound",
  "¿Qué exclamación usa jak (no jaki)?",
  "Jak + adverbio: Jak tu ładnie!",
  ["Jak tu ładnie!", "Jak piękny obraz!", "Jak jasne mieszkanie!"],
);
// CULTURA
k.mc(
  "pl-es-u8a-reading-size",
  "culture",
  "Lectura: ¿cuántos metros tiene el piso del anuncio?",
  "Ma czterdzieści osiem metrów kwadratowych.",
  ["48 m².", "84 m².", "28 m²."],
);
k.mc(
  "pl-es-u8a-reading-kitchen",
  "culture",
  "Lectura: ¿dónde está la cocina?",
  "W salonie jest aneks kuchenny.",
  ["Abierta, en el salón.", "En una habitación aparte.", "En el balcón."],
);
k.tf(
  "pl-es-u8a-reading-rent",
  "culture",
  "Lectura: el alquiler de 2800 zł ya incluye luz, agua y calefacción.",
  "Plus media — se pagan aparte.",
  false,
);
k.mc(
  "pl-es-u8a-culture-bread",
  "culture",
  "Cultura: ¿qué simbolizan el pan y la sal en una casa nueva?",
  "Que en esa casa nunca faltará nada.",
  ["Que nunca faltará nada.", "Que la casa es vieja.", "Que el anfitrión debe cocinar."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u8a-translate-floor",
  "transform",
  "Escribe en polaco: Vivo en el segundo piso.",
  "Mieszkam na drugim piętrze.",
  ["Mieszkam na drugim piętrze."],
);
k.ta(
  "pl-es-u8a-translate-sofa",
  "transform",
  "Escribe en polaco: Debajo de la ventana está el sofá.",
  "Pod oknem stoi kanapa (o: jest kanapa).",
  ["Pod oknem stoi kanapa.", "Pod oknem jest kanapa.", "Kanapa stoi pod oknem."],
);
k.ta(
  "pl-es-u8a-translate-keys",
  "transform",
  "Escribe en polaco: Las llaves están en la mesa.",
  "Klucze leżą na stole.",
  ["Klucze leżą na stole.", "Na stole leżą klucze.", "Klucze są na stole."],
);
k.ta(
  "pl-es-u8a-translate-cheaper",
  "transform",
  "Escribe en polaco: Este piso es más barato que aquel.",
  "To mieszkanie jest tańsze niż tamto.",
  ["To mieszkanie jest tańsze niż tamto."],
);
k.ta(
  "pl-es-u8a-translate-beautiful",
  "transform",
  "Escribe en polaco: ¡Qué bonito está esto!",
  "Jak tu ładnie!",
  ["Jak tu ładnie!", "Jak tu pięknie!"],
);
// EXPRESAR
k.write(
  "pl-es-u8a-write-flat",
  "express",
  "Describe tu piso (real o imaginario) para un amigo polaco: piso, habitaciones, dónde están los muebles y una comparación con tu piso anterior.",
  "Revisa: na … piętrze, stoi / leży / wisi, nad / pod / między + instrumental, comparativos con niż.",
  "Mieszkam na trzecim piętrze w starej kamienicy. Mieszkanie ma dwa pokoje, kuchnię i łazienkę. W salonie pod oknem stoi kanapa, a nad kanapą wisi duży obraz. Między szafą a oknem stoi biurko. Sypialnia jest mniejsza niż salon, ale cichsza. To mieszkanie jest droższe niż moje stare, ale jaśniejsze i lepsze.",
  ["piso y habitaciones", "posición de los muebles", "preposiciones", "comparación"],
  35,
  110,
  8,
);
k.write(
  "pl-es-u8a-write-invite",
  "express",
  "Escribe una invitación a tu parapetówka: dirección, piso, día, hora y qué pueden traer los invitados.",
  "Zapraszam na parapetówkę…; mieszkam na … piętrze; o której; możecie przynieść…",
  "Cześć wszystkim! Zapraszam na parapetówkę w sobotę o dziewiętnastej. Mój nowy adres to ulica Długa 15, mieszkanie numer 8, na drugim piętrze. Nie ma windy! Możecie przynieść coś do picia. Jedzenie jest moje. Do zobaczenia!",
  ["invitación", "dirección y piso", "día y hora", "qué traer"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 8 (pl-es) total", renumber(8, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u8-housewarming.png",
    prompt:
      "at the open door of an apartment a young woman hands a young man a round loaf of bread with a small salt cellar on top, both smiling, behind them a living room with a sofa under a window and a painting above it, no text or signs",
  },
]);
