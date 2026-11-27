// Polish for Spanish speakers — A1 unit 7A (Ile kosztuje ta kurtka?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-7a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(7, "pl-es-unit-7-shopping", 7100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u7a-listen-what",
  "perceive",
  "Diálogo: ¿qué busca Javier?",
  "Szukam ciepłej kurtki na zimę.",
  ["Una chaqueta de abrigo para el invierno.", "Unos zapatos.", "Un traje para una boda."],
);
k.mc(
  "pl-es-u7a-listen-first",
  "perceive",
  "Diálogo: ¿qué chaqueta le gusta primero?",
  "Podoba mi się ta niebieska kurtka.",
  ["La azul.", "La negra.", "La verde."],
);
k.tf(
  "pl-es-u7a-listen-small",
  "perceive",
  "Diálogo: la primera chaqueta le queda grande.",
  "Jest trochę za mała — le queda pequeña.",
  false,
);
k.mc(
  "pl-es-u7a-listen-colour",
  "perceive",
  "Diálogo: ¿qué color se lleva al final?",
  "Niebieskiej w L już nie ma… To poproszę czarną.",
  ["Negro.", "Azul.", "Verde."],
);
k.mc(
  "pl-es-u7a-listen-price",
  "perceive",
  "Diálogo: ¿cuánto paga con el descuento?",
  "Pięćset złotych… dwadzieścia procent rabatu. Czyli czterysta.",
  ["400 zł.", "500 zł.", "20 zł."],
);
// CONECTAR
k.match(
  "pl-es-u7a-match-clothes",
  "connect",
  "Une cada prenda con su traducción.",
  "Płaszcz = abrigo; czapka = gorro; rękawiczki = guantes.",
  [
    ["płaszcz", "el abrigo"],
    ["czapka", "el gorro"],
    ["rękawiczki", "los guantes"],
    ["spódnica", "la falda"],
    ["szalik", "la bufanda"],
    ["sukienka", "el vestido"],
  ],
);
k.match(
  "pl-es-u7a-match-colours",
  "connect",
  "Une cada color con su traducción.",
  "Granatowy = azul marino (¡no granate!); brązowy = marrón.",
  [
    ["granatowy", "azul marino"],
    ["brązowy", "marrón"],
    ["szary", "gris"],
    ["żółty", "amarillo"],
    ["różowy", "rosa"],
  ],
);
k.mc(
  "pl-es-u7a-przymierzalnia",
  "connect",
  "¿Dónde te pruebas la ropa?",
  "Przymierzalnia = el probador (przymierzyć = probarse).",
  ["W przymierzalni.", "W kasie.", "Na paragonie."],
);
k.mc(
  "pl-es-u7a-w-sam-raz",
  "connect",
  "¿Qué significa jest w sam raz?",
  "W sam raz = justo, perfecto de talla.",
  ["Me queda perfecto.", "Es demasiado grande.", "Está en rebajas."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u7a-gap-szukam",
  "structure",
  "Completa en genitivo después de szukam.",
  "Kurtka → kurtki; sweter → swetra; czapka → czapki.",
  "Szukam ___ (kurtka), ___ (sweter) i ___ (czapka).",
  [["kurtki"], ["swetra"], ["czapki"]],
);
k.mc(
  "pl-es-u7a-szukam-cieplej",
  "structure",
  "¿Cuál es correcto?",
  "Szukać + genitivo, también el adjetivo: ciepłej kurtki.",
  ["Szukam ciepłej kurtki.", "Szukam ciepłą kurtkę.", "Szukam ciepła kurtka."],
);
k.mc("pl-es-u7a-te", "structure", "¿Cuál es correcto?", "Acusativo femenino de ta: tę.", [
  "Poproszę tę kurtkę.",
  "Poproszę ta kurtka.",
  "Poproszę ten kurtkę.",
]);
k.gap(
  "pl-es-u7a-gap-ten",
  "structure",
  "Completa con ten, ta, to o te.",
  "Sweter (m) ten; sukienka (f) ta; spodnie (pl) te.",
  "Ile kosztuje ___ sweter? A ___ sukienka? I ___ spodnie?",
  [["ten"], ["ta"], ["te"]],
);
k.mc(
  "pl-es-u7a-spodnie",
  "structure",
  "¿Cuál es correcto?",
  "Spodnie solo existe en plural: te spodnie są…",
  ["Te spodnie są drogie.", "Ta spodnia jest droga.", "Ten spodnie jest drogi."],
);
k.gap(
  "pl-es-u7a-gap-colours",
  "structure",
  "Completa el color con la terminación correcta.",
  "Kurtka (f) czarna; sweter (m) biały; buty (pl) brązowe.",
  "Mam czarn___ kurtkę, biał___ sweter i brązow___ buty.",
  [["ą"], ["y"], ["e"]],
);
k.mc(
  "pl-es-u7a-pasuje",
  "structure",
  "¿Cómo dices «esta chaqueta me queda bien»?",
  "Pasować como «quedar»: ta kurtka mi pasuje.",
  ["Ta kurtka mi pasuje.", "Ja pasuję ta kurtka.", "Ta kurtka pasuję mi."],
);
k.gap(
  "pl-es-u7a-gap-za",
  "structure",
  "Completa el adjetivo con za.",
  "Spodnie (pl) za długie; kurtka (f) za mała; sweter (m) za duży.",
  "Spodnie są za dług___, kurtka jest za mał___, a sweter jest za duż___.",
  [["ie"], ["a"], ["y"]],
);
k.gap(
  "pl-es-u7a-gap-pronouns",
  "structure",
  "Completa con go, ją o je.",
  "Sweter → go; kurtka → ją; buty → je.",
  "Ten sweter jest ładny, biorę ___. Ta kurtka? Chcę ___ przymierzyć. Te buty? Kupuję ___.",
  [["go"], ["ją"], ["je"]],
);
k.mc(
  "pl-es-u7a-biore-ja",
  "structure",
  "Te llevas la chaqueta (kurtka). ¿Qué dices?",
  "Femenino en acusativo: ją.",
  ["Biorę ją.", "Biorę ona.", "Biorę jej."],
);
k.order(
  "pl-es-u7a-order-try",
  "structure",
  "Ordena: ¿Puedo probarme este jersey?",
  "Czy mogę przymierzyć + ten sweter?",
  ["Czy", "mogę", "przymierzyć", "ten", "sweter?"],
);
k.order(
  "pl-es-u7a-order-size",
  "structure",
  "Ordena: Es demasiado pequeña. ¿La hay en la talla L?",
  "Jest za mała. Czy jest w rozmiarze L?",
  ["Jest", "za", "mała.", "Czy", "jest", "w", "rozmiarze", "L?"],
);
// SONAR
k.mc("pl-es-u7a-sound-bialy", "sound", "¿Cómo suena biały?", "Ł = w inglesa: [biawy].", [
  "[biawy]",
  "[bialy]",
  "[biaży]",
]);
k.tf(
  "pl-es-u7a-sound-szalik",
  "sound",
  "En szalik, la l suena como una w inglesa.",
  "No: es una l normal, como la española. Solo ł suena como w.",
  false,
);
k.mc(
  "pl-es-u7a-sound-laska",
  "sound",
  "¿Qué significa łaska, con ł?",
  "Laska = bastón; łaska = gracia. La ł cambia la palabra.",
  ["Gracia.", "Bastón.", "Caja."],
);
// CULTURA
k.mc(
  "pl-es-u7a-reading-onion",
  "culture",
  "Lectura: ¿qué significa ubierz się na cebulkę?",
  "Como una cebolla, con muchas capas.",
  ["Vístete en capas.", "Ponte ropa de color cebolla.", "Compra ropa en rebajas."],
);
k.mc(
  "pl-es-u7a-reading-winter",
  "culture",
  "Lectura: ¿qué temperatura hace a menudo en enero?",
  "Minus pięć albo minus dziesięć stopni.",
  ["Entre −5 y −10 grados.", "Unos 5 grados.", "Entre 10 y 15 grados."],
);
k.tf(
  "pl-es-u7a-reading-shoes",
  "culture",
  "Lectura: en una casa polaca puedes andar con los zapatos de la calle.",
  "W butach nie chodzi się po mieszkaniu — te los quitas y te dan kapcie.",
  false,
);
k.mc(
  "pl-es-u7a-culture-size",
  "culture",
  "Cultura: una talla 38 española de mujer suele ser en Polonia…",
  "Polonia sigue el sistema alemán: 38 española ≈ 36 polaca.",
  ["36.", "38.", "40."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u7a-translate-looking",
  "transform",
  "Escribe en polaco: Busco un gorro y una bufanda.",
  "Szukam + genitivo: czapki i szalika.",
  ["Szukam czapki i szalika."],
);
k.ta(
  "pl-es-u7a-translate-try",
  "transform",
  "Escribe en polaco: ¿Puedo probármela? (la kurtka)",
  "Czy mogę ją przymierzyć?",
  ["Czy mogę ją przymierzyć?", "Mogę ją przymierzyć?"],
);
k.ta(
  "pl-es-u7a-translate-long",
  "transform",
  "Escribe en polaco: Estos pantalones son demasiado largos.",
  "Te spodnie są za długie.",
  ["Te spodnie są za długie."],
);
k.ta(
  "pl-es-u7a-translate-black",
  "transform",
  "Escribe en polaco: La negra, por favor. (la chaqueta)",
  "Poproszę + acusativo femenino: czarną.",
  ["Poproszę czarną.", "Poproszę czarną kurtkę.", "Czarną, poproszę."],
);
k.ta(
  "pl-es-u7a-translate-cost",
  "transform",
  "Escribe en polaco: ¿Cuánto cuestan estos zapatos?",
  "Ile kosztują te buty?",
  ["Ile kosztują te buty?"],
);
// EXPRESAR
k.write(
  "pl-es-u7a-write-dialogue",
  "express",
  "Escribe un diálogo en una tienda de ropa polaca: buscas una prenda de invierno, pides talla y color, te la pruebas, dices cómo te queda y la compras.",
  "Revisa: szukam + genitivo, ten / ta / tę, za duży / pasuje mi, go / ją / je, el precio con złote / złotych.",
  "— Dzień dobry, w czym mogę pomóc? — Szukam ciepłego płaszcza. — Jaki rozmiar? — M. Podoba mi się tamten szary płaszcz. Czy mogę go przymierzyć? — Oczywiście. — Jest trochę za duży. Czy jest w rozmiarze S? — Tak, proszę. — Teraz jest w sam raz. Ile kosztuje? — Sześćset złotych. — Biorę go.",
  ["prenda que buscas", "talla y color", "cómo te queda", "precio", "decisión"],
  35,
  110,
  8,
);
k.write(
  "pl-es-u7a-write-wearing",
  "express",
  "Describe qué llevas hoy (con colores) y qué ropa necesitas para un invierno polaco.",
  "Mam na sobie + acusativo (llevo puesto…), los colores concordados, potrzebuję + genitivo.",
  "Dzisiaj mam na sobie niebieskie dżinsy, białą koszulkę i szary sweter. Na zimę w Polsce potrzebuję ciepłej kurtki, czapki, szalika i rękawiczek. Muszę też kupić dobre kozaki.",
  ["ropa de hoy con colores", "ropa para el invierno"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 7 (pl-es) total", renumber(7, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u7-jacket.png",
    prompt:
      "a young man tries on a winter jacket in front of a full-length mirror in a clothing store, a smiling female shop assistant holds another jacket on a hanger, racks of coats behind, no signs or price tags with text",
  },
]);
