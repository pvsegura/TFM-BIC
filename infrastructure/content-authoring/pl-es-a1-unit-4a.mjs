// Polish for Spanish speakers — A1 unit 4A (Poproszę kawę) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-4a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(4, "pl-es-unit-4-cafe", 4100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u4a-listen-kasia",
  "perceive",
  "Diálogo: ¿qué bebe Kasia?",
  "Dla mnie duża kawa z mlekiem.",
  ["Un café grande con leche.", "Un té con limón.", "Un zumo de naranja."],
);
k.tf(
  "pl-es-u4a-listen-szarlotka",
  "perceive",
  "Diálogo: Javier toma tarta de manzana.",
  "Szarlotki już nie ma — toma sernik (tarta de queso).",
  false,
);
k.mc(
  "pl-es-u4a-listen-place",
  "perceive",
  "Diálogo: ¿se quedan en la cafetería o se lo llevan?",
  "Na miejscu — para tomar allí.",
  ["Se quedan.", "Se lo llevan.", "No lo dicen."],
);
k.mc(
  "pl-es-u4a-listen-total",
  "perceive",
  "Diálogo: ¿cuánto pagan en total?",
  "Razem czterdzieści sześć złotych.",
  ["46 zł.", "36 zł.", "64 zł."],
);
k.tf(
  "pl-es-u4a-listen-card",
  "perceive",
  "Diálogo: Javier paga para los dos con tarjeta.",
  "Razem. Ja zapraszam! … Mogę zapłacić kartą? — Oczywiście.",
  true,
);
// CONECTAR
k.match(
  "pl-es-u4a-match-drinks",
  "connect",
  "Une cada palabra con su traducción.",
  "Herbata = té; sok = zumo; woda niegazowana = agua sin gas.",
  [
    ["herbata", "el té"],
    ["sok", "el zumo"],
    ["woda niegazowana", "el agua sin gas"],
    ["cukier", "el azúcar"],
    ["sernik", "la tarta de queso"],
    ["kawałek", "un trozo"],
  ],
);
k.match(
  "pl-es-u4a-match-phrases",
  "connect",
  "Une cada frase del camarero con su significado.",
  "Co podać? = ¿qué le pongo?; na wynos = para llevar.",
  [
    ["Co podać?", "¿Qué le pongo?"],
    ["Na miejscu czy na wynos?", "¿Para tomar aquí o para llevar?"],
    ["Razem czy osobno?", "¿Junto o por separado?"],
    ["Smacznego!", "¡Que aproveche!"],
  ],
);
k.mc("pl-es-u4a-napiwek", "connect", "¿Qué es el napiwek?", "Napiwek = la propina.", [
  "La propina.",
  "La cuenta.",
  "El cambio.",
]);
k.mc(
  "pl-es-u4a-reszty",
  "connect",
  "Quieres que el camarero se quede con el cambio. ¿Qué dices?",
  "Reszty nie trzeba = no hace falta el cambio.",
  ["Reszty nie trzeba.", "Razem, proszę.", "Na wynos, proszę."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u4a-gap-accusative",
  "structure",
  "Completa con el acusativo después de poproszę.",
  "Femenino -a → -ę; masculino y neutro de cosa: sin cambios.",
  "Poproszę ___ (kawa), ___ (sok) i ___ (szarlotka).",
  [["kawę"], ["sok"], ["szarlotkę"]],
);
k.mc("pl-es-u4a-woda", "structure", "¿Cuál es correcto?", "Woda (f) → wodę después de poproszę.", [
  "Poproszę wodę.",
  "Poproszę woda.",
  "Poproszę wody wodę.",
]);
k.mc(
  "pl-es-u4a-duza-kawe",
  "structure",
  "¿Cuál es correcto?",
  "El adjetivo femenino también cambia: duża → dużą.",
  ["Poproszę dużą kawę.", "Poproszę duża kawę.", "Poproszę dużą kawa."],
);
k.mc(
  "pl-es-u4a-chcialabym",
  "structure",
  "Eres mujer y quieres pedir con cortesía un té. ¿Qué dices?",
  "Mujer: chciałabym.",
  ["Chciałabym herbatę.", "Chciałbym herbatę.", "Chciała herbatę."],
);
k.mc(
  "pl-es-u4a-chcialbym",
  "structure",
  "Eres hombre y quieres pedir con cortesía un agua. ¿Qué dices?",
  "Hombre: chciałbym.",
  ["Chciałbym wodę.", "Chciałabym wodę.", "Chcę bym wodę."],
);
k.gap(
  "pl-es-u4a-gap-chciec",
  "structure",
  "Completa con el presente de chcieć.",
  "Ja chcę, ty chcesz, my chcemy.",
  "Ja ___ kawę, a ty co ___? My ___ zapłacić.",
  [["chcę"], ["chcesz"], ["chcemy"]],
);
k.gap(
  "pl-es-u4a-gap-z-bez",
  "structure",
  "Completa con z o bez.",
  "Z + instrumental (con), bez + genitivo (sin).",
  "Kawa ___ mlekiem, ale ___ cukru, i herbata ___ cytryną.",
  [["z"], ["bez"], ["z"]],
);
k.match(
  "pl-es-u4a-match-prices",
  "structure",
  "Une cada precio con cómo se dice.",
  "2, 3, 4 → złote; el resto → złotych (salvo 1 złoty).",
  [
    ["1 zł", "jeden złoty"],
    ["3 zł", "trzy złote"],
    ["7 zł", "siedem złotych"],
    ["24 zł", "dwadzieścia cztery złote"],
    ["13 zł", "trzynaście złotych"],
  ],
);
k.gap(
  "pl-es-u4a-gap-zloty",
  "structure",
  "Completa con złoty, złote o złotych.",
  "Mira la última cifra: 2 → złote; 5 → złotych; 22 → złote.",
  "Woda kosztuje dwa ___, kawa piętnaście ___, a sernik dwadzieścia dwa ___.",
  [["złote"], ["złotych"], ["złote"]],
);
k.match(
  "pl-es-u4a-match-hundreds",
  "structure",
  "Une cada número con su nombre.",
  "200 dwieście, 300 trzysta, 500 pięćset, 1000 tysiąc.",
  [
    ["200", "dwieście"],
    ["300", "trzysta"],
    ["500", "pięćset"],
    ["900", "dziewięćset"],
    ["1000", "tysiąc"],
  ],
);
k.mc("pl-es-u4a-kosztuje", "structure", "Completa: Ile ___ lody?", "Lody es plural: kosztują.", [
  "kosztują",
  "kosztuje",
  "kosztujesz",
]);
k.order(
  "pl-es-u4a-order-order",
  "structure",
  "Ordena: Para mí un té con limón, por favor.",
  "Dla mnie + herbata z cytryną + poproszę.",
  ["Dla", "mnie", "herbata", "z", "cytryną,", "poproszę."],
);
k.order(
  "pl-es-u4a-order-pay",
  "structure",
  "Ordena: ¿Puedo pagar con tarjeta?",
  "Mogę + zapłacić + kartą?",
  ["Mogę", "zapłacić", "kartą?"],
);
// SONAR
k.mc(
  "pl-es-u4a-sound-ciastko",
  "sound",
  "¿Cómo suena ciastko?",
  "Ci + vocal = ć: [ćastko], sin una i aparte.",
  ["[ćastko]", "[ci-ast-ko]", "[siastko]"],
);
k.tf(
  "pl-es-u4a-sound-same",
  "sound",
  "Ć en cześć y ci en ciastko suenan igual.",
  "Sí: es el mismo sonido; solo cambia la escritura.",
  true,
);
k.match(
  "pl-es-u4a-sound-pairs",
  "sound",
  "Une cada forma con tilde con su forma con i.",
  "Ć = ci, ś = si, ź = zi, ń = ni.",
  [
    ["ć", "ci"],
    ["ś", "si"],
    ["ź", "zi"],
    ["ń", "ni"],
  ],
);
// CULTURA
k.mc(
  "pl-es-u4a-reading-waiter",
  "culture",
  "Lectura: ¿cómo se pide en un bar mleczny?",
  "Tutaj nie ma kelnera. Zamawiasz przy kasie, płacisz i czekasz.",
  [
    "En la caja: pides, pagas y esperas.",
    "Te atiende un camarero en la mesa.",
    "Por una aplicación.",
  ],
);
k.mc(
  "pl-es-u4a-reading-pierogi",
  "culture",
  "Lectura: ¿cuánto cuestan los pierogi?",
  "Pierogi dwadzieścia dwa złote.",
  ["22 zł.", "8 zł.", "4 zł."],
);
k.tf(
  "pl-es-u4a-reading-people",
  "culture",
  "Lectura: en el bar mleczny comen sobre todo turistas.",
  "Studenci, emeryci, turyści i ludzie z biura — gente de todo tipo.",
  false,
);
k.mc(
  "pl-es-u4a-culture-paczki",
  "culture",
  "Cultura: ¿qué se come en Polonia el Tłusty Czwartek?",
  "El último jueves antes de Cuaresma se comen pączki.",
  ["Pączki.", "Sernik.", "Pierogi."],
);
k.tf(
  "pl-es-u4a-culture-dziekuje",
  "culture",
  "Cultura: si dices dziękuję al dar el dinero, el camarero puede quedarse con el cambio.",
  "Sí: puede interpretarlo como «quédese con el cambio».",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u4a-translate-coffee",
  "transform",
  "Escribe en polaco: Un café solo y un trozo de tarta de queso, por favor.",
  "Poproszę czarną kawę (acusativo) i kawałek sernika (genitivo).",
  [
    "Poproszę czarną kawę i kawałek sernika.",
    "Poproszę kawę czarną i kawałek sernika.",
    "Czarną kawę i kawałek sernika, poproszę.",
  ],
);
k.ta(
  "pl-es-u4a-translate-would-like",
  "transform",
  "Escribe en polaco (habla una mujer): Querría agua sin gas.",
  "Chciałabym + wodę niegazowaną (acusativo).",
  ["Chciałabym wodę niegazowaną.", "Chciałabym wodę bez gazu."],
);
k.ta(
  "pl-es-u4a-translate-how-much",
  "transform",
  "Escribe en polaco: ¿Cuánto cuesta la tarta de manzana?",
  "Ile kosztuje + szarlotka?",
  ["Ile kosztuje szarlotka?"],
);
k.ta(
  "pl-es-u4a-translate-price",
  "transform",
  "Escribe con letras: 34 zł.",
  "Termina en 4: złote.",
  ["trzydzieści cztery złote"],
);
k.ta(
  "pl-es-u4a-translate-invite",
  "transform",
  "Escribe en polaco: Junto, por favor. ¡Invito yo!",
  "Razem, poproszę. Ja zapraszam!",
  [
    "Razem, poproszę. Ja zapraszam!",
    "Razem, proszę. Ja zapraszam!",
    "Razem poproszę. Ja zapraszam!",
  ],
);
// EXPRESAR
k.write(
  "pl-es-u4a-write-dialogue",
  "express",
  "Escribe un diálogo corto en una cafetería polaca: el camarero, tú y un amigo. Pedid bebida y algo de comer, preguntad por algo que no hay y pagad.",
  "Revisa: poproszę + acusativo, chciałbym / chciałabym, z / bez, czy jest…?, el precio con złote / złotych.",
  "Kelner: Dzień dobry, co podać? Ja: Chciałabym cappuccino bez cukru. Marek: A dla mnie herbata z cytryną. Czy jest szarlotka? Kelner: Niestety nie ma, ale jest sernik. Marek: To poproszę sernik. Ja: Ile płacimy? Kelner: Trzydzieści dwa złote. Ja: Kartą, poproszę.",
  ["pedido de bebida", "pedido de comida", "algo que no hay", "pagar"],
  30,
  90,
  7,
);
k.write(
  "pl-es-u4a-write-review",
  "express",
  "Escribe una pequeña opinión sobre tu cafetería favorita: dónde está, qué tomas, qué tarta es buena y cuánto cuesta.",
  "Jest / są, poproszę o zamawiam + acusativo, precios con złoty / złote / złotych.",
  "Moja ulubiona kawiarnia jest w centrum, obok rynku. Zawsze zamawiam dużą kawę z mlekiem. Sernik jest tam bardzo dobry. Kawa kosztuje czternaście złotych, a kawałek sernika dwanaście złotych. Polecam!",
  ["dónde está", "qué tomas", "tarta", "precios"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 4 (pl-es) total", renumber(4, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u4-cafe.png",
    prompt:
      "a waitress with a small notepad takes an order from a man and a woman sitting at a small round table in a cosy cafe, a glass display case with cakes in the background, warm evening light, no menus or signs",
  },
]);
