// Unit 4 workbook exercises (4A bar, 4B restaurant) and illustrations.
//   node infrastructure/content-authoring/a1-unit-4.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const a = kit(4, "es-unit-4-bar", 300);
a.mc(
  "es-u4a-listen-drinks",
  "perceive",
  "Dialog w barze: co pije Lucía?",
  "Para mí, una caña — małe piwo z beczki.",
  ["Małe piwo.", "Czerwone wino.", "Kawę z mlekiem."],
);
a.mc(
  "es-u4a-listen-tortilla",
  "perceive",
  "Dialog: z czego jest tortilla de patatas?",
  "Es una tortilla con huevos, patata y cebolla.",
  ["Z jajek, ziemniaków i cebuli.", "Z mąki kukurydzianej.", "Z sera i szynki."],
);
a.tf(
  "es-u4a-listen-price",
  "perceive",
  "Dialog: rachunek wynosi 15,50 € i Marek płaci gotówką.",
  "Son quince euros con cincuenta — ale Marek płaci kartą.",
  false,
);
a.match(
  "es-u4a-match-coffee",
  "connect",
  "Połącz rodzaje kawy z opisem.",
  "Solo = espresso; cortado = z odrobiną mleka; con leche = z dużą ilością mleka.",
  [
    ["un café solo", "espresso"],
    ["un cortado", "espresso z odrobiną mleka"],
    ["un café con leche", "kawa z dużą ilością mleka"],
    ["un descafeinado", "kawa bezkofeinowa"],
  ],
);
a.match(
  "es-u4a-match-tapas",
  "connect",
  "Połącz słowa z baru z tłumaczeniem.",
  "Una caña = małe piwo; una ración = duża porcja do dzielenia.",
  [
    ["una caña", "małe piwo z beczki"],
    ["una ración", "duża porcja do dzielenia"],
    ["las aceitunas", "oliwki"],
    ["la cuenta", "rachunek"],
    ["en efectivo", "gotówką"],
  ],
);
a.mc(
  "es-u4a-polite",
  "structure",
  "Która prośba jest najgrzeczniejsza?",
  "Me gustaría… brzmi najuprzejmiej; dame bez por favor — szorstko.",
  ["Me gustaría probar la tortilla.", "Dame la tortilla.", "Tortilla."],
);
a.gap(
  "es-u4a-gap-querer",
  "structure",
  "Uzupełnij formy querer.",
  "Querer: e → ie poza nosotros/vosotros.",
  "Yo ___ un café y vosotros ___ agua.",
  [["quiero"], ["queréis"]],
);
a.mc(
  "es-u4a-cuestan",
  "structure",
  "Uzupełnij: ¿Cuánto ___ las croquetas?",
  "Wiele rzeczy → cuestan.",
  ["cuestan", "cuesta", "cuestas"],
);
a.mc(
  "es-u4a-quisiera",
  "structure",
  "Co znaczy przy zamawianiu „Quería un vino”?",
  "Quería działa jak polskie „chciałbym” — łagodzi prośbę.",
  ["Chciałbym wino.", "Chciałem wino (wczoraj).", "Mam wino."],
);
a.order(
  "es-u4a-order-coffee",
  "structure",
  "Ułóż prośbę: Poda mi Pan kawę z mlekiem?",
  "W barze naturalne jest ¿Me pone(s)…?",
  ["¿Me", "pone", "un", "café", "con", "leche?"],
);
a.tf(
  "es-u4a-sound-cana",
  "sound",
  "Caña wymawia się [kania], a cana [kana] to inne słowo.",
  "Tak — ñ to polskie ń; la cana znaczy „siwy włos”.",
  true,
);
a.mc(
  "es-u4a-reading-free",
  "culture",
  "Czytanka: w jakich miastach tapa jest często gratis do napoju?",
  "En algunas ciudades, como Granada o León, con cada bebida el bar te pone una tapa gratis.",
  ["W Granadzie i Leónie.", "W Madrycie i Barcelonie.", "Tylko na wybrzeżu."],
);
a.tf(
  "es-u4a-reading-dinner",
  "culture",
  "Czytanka: Hiszpanie jedzą kolację zwykle po 21:00.",
  "La cena, después de las nueve de la noche.",
  true,
);
a.ta(
  "es-u4a-translate-card",
  "transform",
  "Napisz po hiszpańsku: Czy mogę zapłacić kartą?",
  "Pagar con tarjeta.",
  ["¿Puedo pagar con tarjeta?", "Puedo pagar con tarjeta"],
);
a.ta(
  "es-u4a-translate-bill",
  "transform",
  "Napisz po hiszpańsku: Rachunek, proszę.",
  "La cuenta, por favor.",
  ["La cuenta, por favor.", "La cuenta por favor"],
);
a.write(
  "es-u4a-write-bar",
  "express",
  "Napisz krótki dialog w barze (6–8 replik): zamówienie dla dwóch osób, pytanie o tapa, cena i płatność.",
  "Sprawdź grzeczne formy (quería, ¿me pones…?) i cuesta/cuestan.",
  "—Hola, ¿qué os pongo? —Para mí, un cortado. —Y yo quería un zumo de naranja. —¿Algo para comer? —¿Qué son las bravas? —Son patatas con salsa picante. —Una ración, por favor. ¿Cuánto es? —Son ocho euros. —Con tarjeta, por favor.",
  ["zamówienie dla dwóch osób", "pytanie ¿Qué es / son…?", "pytanie o cenę", "sposób płatności"],
  30,
  110,
  8,
);
console.log("4A", a.save());

const b = kit(4, "es-unit-4-restaurant", 300);
b.mc(
  "es-u4b-listen-anna",
  "perceive",
  "Dialog: co Anna zamawia na pierwsze danie?",
  "De primero, gazpacho.",
  ["Gazpacho.", "Sałatkę mieszaną.", "Soczewicę."],
);
b.tf(
  "es-u4b-listen-allergy",
  "perceive",
  "Dialog: Tomás ma alergię na orzechy.",
  "Soy alérgico a la lactosa — na laktozę.",
  false,
);
b.mc(
  "es-u4b-listen-sauce",
  "perceive",
  "Dialog: o co Tomás prosi kelnera?",
  "¿Puede ser sin salsa? — rybę bez sosu.",
  ["O rybę bez sosu.", "O dodatkowy chleb.", "O inny stolik."],
);
b.match(
  "es-u4b-match-cooking",
  "connect",
  "Połącz sposób przygotowania z tłumaczeniem.",
  "A la plancha = z grilla; frito = smażony; crudo = surowy.",
  [
    ["a la plancha", "z grilla"],
    ["frito", "smażony"],
    ["al horno", "z piekarnika"],
    ["crudo", "surowy"],
    ["picante", "ostry"],
  ],
);
b.match(
  "es-u4b-match-menu",
  "connect",
  "Połącz części menu z przykładem.",
  "Primero — zupa/sałatka, segundo — mięso/ryba, postre — deser.",
  [
    ["de primero", "ensalada mixta"],
    ["de segundo", "pollo asado"],
    ["de postre", "flan"],
    ["de beber", "agua sin gas"],
  ],
);
b.gap(
  "es-u4b-gap-preferir",
  "structure",
  "Uzupełnij formy preferir.",
  "Prefiero, preferimos (nosotros bez zmiany samogłoski).",
  "Yo ___ la carne y nosotros ___ el pescado.",
  [["prefiero"], ["preferimos"]],
);
b.mc(
  "es-u4b-lleva",
  "structure",
  "Jak zapytasz, czy w daniu jest mięso?",
  "O skład pytamy czasownikiem llevar.",
  ["¿Lleva carne?", "¿Es carne?", "¿Hay carne en ti?"],
);
b.mc(
  "es-u4b-alergico",
  "structure",
  "Uzupełnij: Soy alérgica ___ marisco.",
  "Alérgico a + el = al.",
  ["al", "del", "de"],
);
b.mc(
  "es-u4b-carta-menu",
  "structure",
  "Co znaczy la carta w restauracji?",
  "La carta to karta dań; el menú to zestaw w stałej cenie.",
  ["Karta dań (menu).", "Zestaw dnia.", "Rachunek."],
);
b.order(
  "es-u4b-order-table",
  "structure",
  "Ułóż prośbę: Stolik dla czterech osób, proszę.",
  "Una mesa para + liczba.",
  ["Una", "mesa", "para", "cuatro,", "por", "favor."],
);
b.mc(
  "es-u4b-bueno",
  "structure",
  "Uzupełnij: ¡Qué rica la sopa! ___ muy buena.",
  "Smak w danej chwili → estar: está buena.",
  ["Está", "Es", "Hay"],
);
b.tf(
  "es-u4b-sound-churros",
  "sound",
  "W słowie churros ch wymawiamy jak polskie cz.",
  "Tak: [czuros]; rr mocne.",
  true,
);
b.mc(
  "es-u4b-reading-price",
  "culture",
  "Czytanka: ile kosztuje zwykle menu dnia?",
  "Cuesta entre doce y dieciocho euros.",
  ["12–18 €", "5–8 €", "25–35 €"],
);
b.tf(
  "es-u4b-reading-sobremesa",
  "culture",
  "Czytanka: sobremesa to deser podawany po obiedzie.",
  "La sobremesa to rozmowy przy stole po posiłku.",
  false,
);
b.ta(
  "es-u4b-translate-recommend",
  "transform",
  "Napisz po hiszpańsku: Co mi Pan poleca?",
  "Recomendar, forma usted: ¿Qué me recomienda?",
  ["¿Qué me recomienda?", "Qué me recomienda"],
);
b.ta(
  "es-u4b-translate-vegetarian",
  "transform",
  "Napisz po hiszpańsku: Jestem wegetarianką.",
  "Ser vegetariano/a; kobieta: vegetariana.",
  ["Soy vegetariana."],
);
b.ta(
  "es-u4b-translate-order",
  "transform",
  "Napisz po hiszpańsku: Na pierwsze zupa, a na drugie ryba z grilla.",
  "De primero…, y de segundo… a la plancha.",
  [
    "De primero, sopa, y de segundo, pescado a la plancha.",
    "De primero sopa y de segundo pescado a la plancha.",
  ],
);
b.write(
  "es-u4b-write-review",
  "express",
  "Napisz krótką opinię o restauracji, w której jesz dziś obiad (5–6 zdań): co zamawiasz, jak smakuje, cena i czy polecasz.",
  "Sprawdź de primero/de segundo, estar bueno o smaku i liczby przy cenie.",
  "Hoy como en un restaurante pequeño del centro. De primero tomo una ensalada y de segundo, pescado a la plancha. El pescado está muy bueno y el postre es casero. El menú cuesta catorce euros. Lo recomiendo.",
  ["co zamówiłeś (de primero / de segundo)", "opinia o smaku", "cena", "rekomendacja"],
  25,
  100,
  7,
);
console.log("4B", b.save(), "unit 4 total", renumber(4));

planImages([
  {
    asset: "a1-u4-bar.png",
    prompt:
      "a lively Spanish tapas bar: a waiter behind the counter serves a small beer and a glass of wine with little plates of tapas to two friends, hams hanging, no signs or chalkboards",
  },
  {
    asset: "a1-u4-restaurant.png",
    prompt:
      "a waiter with a notepad takes the order of two friends sitting at a table with a tablecloth in a small family restaurant, bread basket and water bottle on the table, no menus with writing",
  },
  {
    asset: "a1-u4-tapas.png",
    prompt:
      "top view of a wooden table with several small plates of Spanish tapas: potato omelette slices, croquettes, olives, fried potatoes, bread and two glasses of wine",
  },
]);
