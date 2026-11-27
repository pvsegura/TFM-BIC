// Spanish for Polish speakers — A1 unit 7A (¿Me lo pruebo?) exercises.
//   node infrastructure/content-authoring/a1-unit-7a.mjs
import fs from "node:fs";

import { kit, planImages, renumber } from "./ex-kit.mjs";

// Older unit-7 exercises: put them in their proper PUENTE phase.
const EX = "c:/Users/usuario/TFM-BIC/content/languages/es/levels/a1/exercises/";
for (const [id, phase] of [
  ["es-u7-verde", "structure"],
  ["es-u7-talla", "connect"],
  ["es-u7-n70", "structure"],
  ["es-u7-n90", "structure"],
  ["es-u7-n100", "structure"],
]) {
  const file = `${EX}${id}.json`;
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(/"phase": "\w+"/, `"phase": "${phase}"`),
  );
}

const a = kit(7, "es-unit-7-shopping", 300);
// PERCIBIR
a.mc(
  "es-u7a-listen-what",
  "perceive",
  "Dialog: czego szuka Ola?",
  "Busco un vestido para una boda.",
  ["Sukienki na wesele.", "Butów do biegania.", "Płaszcza na zimę."],
);
a.tf(
  "es-u7a-listen-black",
  "perceive",
  "Dialog: Ola chce czarną sukienkę.",
  "Nada negro: es una boda de día — niebieską albo zieloną.",
  false,
);
a.mc(
  "es-u7a-listen-size",
  "perceive",
  "Dialog: jaki rozmiar w końcu pasuje Oli?",
  "38 jest za duże; la treinta y seis — ¡Perfecto!",
  ["36.", "38.", "40."],
);
a.mc(
  "es-u7a-listen-price",
  "perceive",
  "Dialog: ile Ola płaci za sukienkę?",
  "Ochenta euros… veinte por ciento de descuento: sesenta y cuatro.",
  ["64 euro.", "80 euro.", "20 euro."],
);
a.tf(
  "es-u7a-listen-bag",
  "perceive",
  "Dialog: Ola kupuje torbę za dziesięć centów.",
  "No, gracias, tengo una — ma swoją.",
  false,
);
// CONECTAR
a.match(
  "es-u7a-match-clothes",
  "connect",
  "Połącz ubrania z tłumaczeniem.",
  "La falda = spódnica; los vaqueros = dżinsy; el abrigo = płaszcz.",
  [
    ["la falda", "spódnica"],
    ["los vaqueros", "dżinsy"],
    ["el abrigo", "płaszcz"],
    ["el jersey", "sweter"],
    ["los calcetines", "skarpetki"],
    ["la bufanda", "szalik"],
  ],
);
a.match(
  "es-u7a-match-colours",
  "connect",
  "Połącz kolory z tłumaczeniem.",
  "Marrón = brązowy; gris = szary; amarillo = żółty.",
  [
    ["marrón", "brązowy"],
    ["gris", "szary"],
    ["amarillo", "żółty"],
    ["rosa", "różowy"],
    ["naranja", "pomarańczowy"],
  ],
);
a.mc(
  "es-u7a-probador",
  "connect",
  "Gdzie przymierzasz ubrania?",
  "El probador = przymierzalnia (od probar, próbować).",
  ["En el probador.", "En la caja.", "En la bolsa."],
);
a.mc(
  "es-u7a-numero",
  "connect",
  "Pytasz o rozmiar butów. Które słowo?",
  "Ubrania: la talla; buty: el número.",
  ["¿Qué número usas?", "¿Qué talla de zapatos tienes?", "¿Cuánto mide el zapato?"],
);
a.mc("es-u7a-rebajas", "connect", "Co znaczy las rebajas?", "Las rebajas = wyprzedaż.", [
  "Wyprzedaż.",
  "Paragon.",
  "Przymierzalnia.",
]);
// ESTRUCTURAR
a.gap(
  "es-u7a-gap-demonstratives",
  "structure",
  "Uzupełnij: este / esta / estos / estas (blisko mnie).",
  "Este vestido, esta falda, estos zapatos, estas botas.",
  "Me gusta ___ vestido, ___ falda y ___ zapatos.",
  [["este"], ["esta"], ["estos"]],
);
a.mc(
  "es-u7a-aquel",
  "structure",
  "Pokazujesz kurtkę na drugim końcu sklepu. Co mówisz?",
  "Daleko od nas obu: aquel / aquella.",
  ["Me gusta aquella chaqueta.", "Me gusta esta chaqueta.", "Me gusta aquello chaqueta."],
);
a.mc(
  "es-u7a-esto",
  "structure",
  "Które zdanie jest poprawne?",
  "Esto nie stoi przed rzeczownikiem: ¿Qué es esto? / este vestido.",
  ["¿Qué es esto?", "Me gusta esto vestido.", "¿Cuánto cuesta esto camisa?"],
);
a.gap(
  "es-u7a-gap-colours",
  "structure",
  "Uzupełnij kolor we właściwej formie.",
  "Una camisa blanca, unos zapatos negros, unas botas marrones.",
  "Una camisa ___ (blanco), unos zapatos ___ (negro) y unas botas ___ (marrón).",
  [["blanca"], ["negros"], ["marrones"]],
);
a.gap(
  "es-u7a-gap-quedar",
  "structure",
  "Uzupełnij: queda / quedan.",
  "Jedna rzecz: queda; wiele rzeczy: quedan.",
  "El vestido me ___ bien, pero los zapatos me ___ pequeños.",
  [["queda"], ["quedan"]],
);
a.mc(
  "es-u7a-queda-grande",
  "structure",
  "Spódnica jest na ciebie za duża. Co mówisz?",
  "Quedar jak gustar; przymiotnik zgadza się z falda: grande.",
  ["La falda me queda grande.", "Yo quedo grande la falda.", "La falda me quedo grande."],
);
a.gap(
  "es-u7a-gap-pronouns",
  "structure",
  "Uzupełnij zaimkiem: lo, la, los, las.",
  "El vestido → lo; la camisa → la; los zapatos → los.",
  "— ¿Y el vestido? — Me ___ llevo. — ¿Y la camisa? — No ___ quiero. — ¿Y los zapatos? — Me ___ pruebo.",
  [["lo"], ["la"], ["los"]],
);
a.mc(
  "es-u7a-me-lo-llevo",
  "structure",
  "Które zdanie jest poprawne?",
  "Zaimek przed odmienionym czasownikiem: me lo llevo.",
  ["Me lo llevo.", "Me llevo lo.", "Lo me llevo."],
);
a.mc(
  "es-u7a-probarmelo",
  "structure",
  "Jak zapytasz, czy możesz przymierzyć sweter?",
  "Z bezokolicznikiem: probármelo (zaimki przyczepione) albo ¿Me lo puedo probar?",
  ["¿Puedo probármelo?", "¿Puedo me lo probar?", "¿Puedo probar me lo?"],
);
a.match(
  "es-u7a-match-hundreds",
  "structure",
  "Połącz liczby z ich nazwą.",
  "Quinientos, setecientos i novecientos są nieregularne.",
  [
    ["101", "ciento uno"],
    ["500", "quinientos"],
    ["700", "setecientos"],
    ["900", "novecientos"],
    ["1000", "mil"],
  ],
);
a.mc(
  "es-u7a-doscientas",
  "structure",
  "Uzupełnij: En la tienda hay ___ camisetas (200).",
  "Setki zgadzają się z rodzajem: doscientas camisetas.",
  ["doscientas", "doscientos", "dos cientas"],
);
a.order(
  "es-u7a-order-colour",
  "structure",
  "Ułóż pytanie: Masz go w kolorze czarnym?",
  "¿Lo tienes en + kolor?",
  ["¿Lo", "tienes", "en", "negro?"],
);
a.order(
  "es-u7a-order-size",
  "structure",
  "Ułóż zdanie: Jest za duże. Masz rozmiar mniejszy?",
  "Me queda grande. ¿Tienes una talla menos?",
  ["Me", "queda", "grande.", "¿Tienes", "una", "talla", "menos?"],
);
// SONAR
a.mc(
  "es-u7a-sound-vestido",
  "sound",
  "Jak brzmi d w słowie vestido?",
  "Między samogłoskami: miękkie, jak th w angielskim „this”.",
  ["Miękko, jak th w „this”.", "Twardo, jak w „dom”.", "Jak polskie t."],
);
a.tf(
  "es-u7a-sound-usted",
  "sound",
  "W słowie usted końcowe d wymawia się mocno, jak polskie t.",
  "Nie: końcowe d jest bardzo słabe albo prawie nieme.",
  false,
);
a.mc(
  "es-u7a-sound-donde",
  "sound",
  "W którym słowie d jest twarde, jak w „dom”?",
  "Po pauzie i po n, l: ¿Dónde? — twarde.",
  ["¿Dónde?", "todo", "Madrid"],
);
// CULTURA
a.mc(
  "es-u7a-reading-when",
  "culture",
  "Lectura: kiedy tradycyjnie zaczynają się zimowe wyprzedaże w Hiszpanii?",
  "En invierno, desde el siete de enero.",
  ["7 stycznia.", "1 lipca.", "1 grudnia."],
);
a.mc(
  "es-u7a-reading-coat",
  "culture",
  "Lectura: ile Lucía płaci za płaszcz?",
  "Un abrigo gris de doscientos euros por solo noventa y nueve.",
  ["99 euro.", "200 euro.", "90 euro."],
);
a.tf(
  "es-u7a-reading-ticket",
  "culture",
  "Lectura: bez paragonu zwykle można zwrócić ubranie.",
  "Guarda siempre el tique: con el tique puedes cambiar o devolver.",
  false,
);
a.mc(
  "es-u7a-culture-size",
  "culture",
  "Kultura: kobiecy rozmiar 38 w Hiszpanii to zwykle jaki rozmiar w Polsce?",
  "Hiszpańskie rozmiary są zwykle o jeden większe: 38 hiszpańskie ≈ 36 polskie.",
  ["36.", "38.", "40."],
);
// TRANSFORMAR
a.ta(
  "es-u7a-translate-looking",
  "transform",
  "Napisz po hiszpańsku: Szukam czarnych butów.",
  "Busco unos zapatos negros.",
  ["Busco unos zapatos negros.", "Busco zapatos negros."],
);
a.ta(
  "es-u7a-translate-try",
  "transform",
  "Napisz po hiszpańsku: Mogę przymierzyć tę koszulę?",
  "¿Puedo probarme esta camisa?",
  ["¿Puedo probarme esta camisa?", "¿Me puedo probar esta camisa?"],
);
a.ta(
  "es-u7a-translate-fits",
  "transform",
  "Napisz po hiszpańsku: Te spodnie są na mnie za małe.",
  "Estos pantalones me quedan pequeños.",
  ["Estos pantalones me quedan pequeños.", "Los pantalones me quedan pequeños."],
);
a.ta(
  "es-u7a-translate-take",
  "transform",
  "Odpowiedz po hiszpańsku, że bierzesz kurtkę (la chaqueta): Biorę ją.",
  "Żeński zaimek: me la llevo.",
  ["Me la llevo.", "Me la llevo, gracias."],
);
a.ta(
  "es-u7a-translate-price",
  "transform",
  "Napisz słownie po hiszpańsku: 350 euro.",
  "Trescientos cincuenta euros.",
  ["trescientos cincuenta euros"],
);
// EXPRESAR
a.write(
  "es-u7a-write-dialogue",
  "express",
  "Napisz dialog w sklepie z ubraniami: szukasz rzeczy na konkretną okazję, pytasz o kolor i rozmiar, przymierzasz, mówisz, jak leży, i kupujesz.",
  "Sprawdź: este / ese / aquel, uzgodnienie koloru, quedar, lo / la, cena słownie.",
  "— Hola, ¿te puedo ayudar? — Sí, busco una chaqueta para el trabajo. — ¿De qué color? — Gris o azul oscuro. ¿Tienes aquella gris en la talla M? — Sí, aquí está. — ¿Qué tal te queda? — Me queda un poco grande. ¿Tienes la S? — Sí. — Ahora me queda bien. ¿Cuánto cuesta? — Ciento veinte euros. — Me la llevo.",
  ["okazja", "kolor i rozmiar", "jak leży", "cena", "decyzja"],
  35,
  110,
  8,
);
a.write(
  "es-u7a-write-wearing",
  "express",
  "Opisz, w co jesteś dziś ubrany / ubrana (kolory!), i jaką rzecz chcesz kupić w tym sezonie.",
  "Llevo + ubranie + kolor (uzgodniony); quiero comprar…",
  "Hoy llevo unos vaqueros azules, una camiseta blanca, un jersey gris y unas zapatillas negras. Este invierno quiero comprar un abrigo marrón y una bufanda roja. En enero espero las rebajas.",
  ["ubrania z kolorami", "plan zakupu"],
  25,
  80,
  6,
);
console.log("7A", a.save(), "unit 7 total", renumber(7));

planImages([
  {
    asset: "a1-u7-shop.png",
    prompt:
      "a young woman holding a dress on a hanger talks with a friendly shop assistant in a bright clothing store, clothes racks and shelves around, no signs, no price tags with text",
  },
]);
