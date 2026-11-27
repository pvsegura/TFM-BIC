// Polish for Spanish speakers — A1 unit 4B (Co pan poleca?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-4b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(4, "pl-es-unit-4-restaurant", 4500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u4b-listen-recommend",
  "perceive",
  "Diálogo: ¿qué recomienda el camarero?",
  "Dzisiaj polecam żurek i pierogi z mięsem.",
  ["Żurek y pierogi de carne.", "Barszcz y sernik.", "Rosół y bigos."],
);
k.tf(
  "pl-es-u4b-listen-zurek",
  "perceive",
  "Diálogo: el żurek no lleva carne.",
  "Żurek jest z kiełbasą — lleva salchicha.",
  false,
);
k.mc(
  "pl-es-u4b-listen-lucia",
  "perceive",
  "Diálogo: ¿qué pide Lucía de segundo?",
  "Pierogi ruskie — de queso y patata.",
  ["Pierogi ruskie.", "Kotlet schabowy.", "Pierogi z mięsem."],
);
k.mc(
  "pl-es-u4b-listen-nuts",
  "perceive",
  "Diálogo: ¿qué postre lleva frutos secos?",
  "W serniku nie ma orzechów, ale w makowcu są.",
  ["El makowiec.", "El sernik.", "Ninguno."],
);
k.mc(
  "pl-es-u4b-listen-drinks",
  "perceive",
  "Diálogo: ¿qué piden de beber?",
  "Dwa kompoty i butelkę wody.",
  ["Dos compotas y una botella de agua.", "Dos cervezas.", "Dos zumos y un café."],
);
// CONECTAR
k.match(
  "pl-es-u4b-match-dishes",
  "connect",
  "Une cada plato con su descripción.",
  "Barszcz = sopa de remolacha; gołąbki = col rellena; bigos = guiso de chucrut.",
  [
    ["barszcz czerwony", "sopa de remolacha"],
    ["rosół", "caldo de pollo"],
    ["gołąbki", "hojas de col rellenas"],
    ["bigos", "guiso de chucrut y carne"],
    ["kotlet schabowy", "filete empanado de cerdo"],
  ],
);
k.match(
  "pl-es-u4b-match-ingredients",
  "connect",
  "Une cada ingrediente con su traducción.",
  "Ziemniaki = patatas; kapusta = col; grzyby = setas.",
  [
    ["ziemniaki", "las patatas"],
    ["kapusta", "la col"],
    ["grzyby", "las setas"],
    ["ryba", "el pescado"],
    ["orzechy", "los frutos secos"],
    ["jajko", "el huevo"],
  ],
);
k.mc(
  "pl-es-u4b-ruskie",
  "connect",
  "¿De qué son los pierogi ruskie?",
  "Pierogi ruskie: patata, queso fresco y cebolla.",
  ["De patata y queso.", "De carne.", "De col y setas."],
);
k.match(
  "pl-es-u4b-match-taste",
  "connect",
  "Une cada adjetivo con su contrario.",
  "Słony ↔ słodki; gorący ↔ zimny; pyszny ↔ niedobry.",
  [
    ["słony", "słodki"],
    ["gorący", "zimny"],
    ["pyszny", "niedobry"],
  ],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u4b-gap-jesc-pic",
  "structure",
  "Completa con jem o piję.",
  "La sopa se come (jem); el café y el kompot se beben (piję).",
  "Na obiad ___ zupę i ___ kompot, a rano ___ kawę.",
  [["jem"], ["piję"], ["piję"]],
);
k.gap(
  "pl-es-u4b-gap-conj",
  "structure",
  "Completa con jeść o pić.",
  "Oni jedzą; ty pijesz; my jemy.",
  "Polacy ___ (jeść) dużo zupy. Co ___ (pić, ty)? My ___ (jeść) pierogi.",
  [["jedzą"], ["pijesz"], ["jemy"]],
);
k.mc("pl-es-u4b-soup", "structure", "¿Cuál es correcto?", "La sopa se come: jem zupę.", [
  "Jem zupę.",
  "Piję zupę.",
  "Biorę zupę pić.",
]);
k.mc(
  "pl-es-u4b-nie-jem",
  "structure",
  "¿Cómo dices «no como pescado»?",
  "Negación + genitivo: ryba → ryby.",
  ["Nie jem ryby.", "Nie jem rybę.", "Nie jem ryba."],
);
k.gap(
  "pl-es-u4b-gap-negation",
  "structure",
  "Completa en genitivo después del verbo en negativo.",
  "Mięso → mięsa; alkohol → alkoholu; kawa → kawy.",
  "Nie jem ___ (mięso), nie piję ___ (alkohol) i nie piję ___ (kawa).",
  [["mięsa"], ["alkoholu"], ["kawy"]],
);
k.mc(
  "pl-es-u4b-wegetarianka",
  "structure",
  "Eres mujer y vegetariana. ¿Qué dices?",
  "Jestem + instrumental: wegetarianką.",
  ["Jestem wegetarianką.", "Jestem wegetarianka.", "Jestem wegetarianinem."],
);
k.mc(
  "pl-es-u4b-alergia",
  "structure",
  "¿Cómo dices «tengo alergia a la leche»?",
  "Mam alergię na + acusativo: na mleko.",
  ["Mam alergię na mleko.", "Mam alergię z mlekiem.", "Mam alergia mleka."],
);
k.gap(
  "pl-es-u4b-gap-smakowac",
  "structure",
  "Completa con smakuje o smakują.",
  "Una cosa → smakuje; varias → smakują.",
  "Zupa mi ___, ale pierogi mi nie ___. Czy panu ___ kotlet?",
  [["smakuje"], ["smakują"], ["smakuje"]],
);
k.mc(
  "pl-es-u4b-smakuja",
  "structure",
  "¿Cómo dices «me gustan los pierogi» (al comerlos)?",
  "Smakować como «gustar»: smakują mi pierogi.",
  ["Smakują mi pierogi.", "Ja smakuję pierogi.", "Pierogi smakuję mi."],
);
k.gap(
  "pl-es-u4b-gap-z-bez",
  "structure",
  "Completa con z o bez.",
  "Pierogi z mięsem (con); barszcz bez mięsa (sin).",
  "Pierogi ___ kapustą i grzybami, a dla mnie zupa ___ mięsa.",
  [["z"], ["bez"]],
);
k.order(
  "pl-es-u4b-order-menu",
  "structure",
  "Ordena: De primero rosół y de segundo pierogi.",
  "Na pierwsze danie… a na drugie…",
  ["Na", "pierwsze", "danie", "rosół,", "a", "na", "drugie", "pierogi."],
);
k.order(
  "pl-es-u4b-order-meat",
  "structure",
  "Ordena: ¿El żurek lleva carne?",
  "Czy + żurek jest + z mięsem?",
  ["Czy", "żurek", "jest", "z", "mięsem?"],
);
// SONAR
k.mc(
  "pl-es-u4b-sound-byc",
  "sound",
  "¿Qué significa bić (con i)?",
  "Być (con y) = ser; bić (con i) = pegar.",
  ["Pegar.", "Ser.", "Beber."],
);
k.tf(
  "pl-es-u4b-sound-y",
  "sound",
  "La y polaca suena igual que la i española.",
  "No: es más grave y oscura, con la lengua más atrás.",
  false,
);
k.mc(
  "pl-es-u4b-sound-my-mi",
  "sound",
  "¿Cuál significa «nosotros»?",
  "My (con y) = nosotros; mi (con i) = a mí.",
  ["my", "mi", "mój"],
);
// CULTURA
k.tf(
  "pl-es-u4b-reading-russia",
  "culture",
  "Lectura: los pierogi ruskie vienen de Rusia.",
  "To nieprawda: el nombre viene de Ruś, una región histórica del este.",
  false,
);
k.mc(
  "pl-es-u4b-reading-filling",
  "culture",
  "Lectura: ¿con qué se comen los pierogi ruskie?",
  "Je się je z cebulką albo ze śmietaną.",
  ["Con cebolla o con nata agria.", "Con azúcar.", "Con ketchup."],
);
k.mc(
  "pl-es-u4b-reading-best",
  "culture",
  "Lectura: ¿cuáles son los mejores pierogi?",
  "Najlepsze są domowe, robione przez babcię.",
  ["Los caseros, hechos por la abuela.", "Los del restaurante.", "Los congelados."],
);
k.mc(
  "pl-es-u4b-culture-obiad",
  "culture",
  "Cultura: ¿qué suele tener un obiad polaco?",
  "Sopa y segundo plato (carne o pescado con patatas y surówka), a menudo con kompot.",
  ["Sopa y segundo plato.", "Solo un bocadillo.", "Tres platos de carne."],
);
k.tf(
  "pl-es-u4b-culture-wigilia",
  "culture",
  "Cultura: en la cena de Nochebuena (Wigilia) se sirven doce platos sin carne.",
  "Sí: barszcz con uszka, carpa, pierogi… y un plato vacío para un huésped inesperado.",
  true,
);
// TRANSFORMAR
k.ta(
  "pl-es-u4b-translate-recommend",
  "transform",
  "Escribe en polaco: ¿Qué recomienda usted (a un camarero)?",
  "Co pan poleca?",
  ["Co pan poleca?"],
);
k.ta(
  "pl-es-u4b-translate-vegetarian",
  "transform",
  "Escribe en polaco (habla un hombre): Soy vegetariano. No como carne.",
  "Jestem wegetarianinem. Nie jem mięsa.",
  ["Jestem wegetarianinem. Nie jem mięsa.", "Jestem wegetarianinem, nie jem mięsa."],
);
k.ta(
  "pl-es-u4b-translate-allergy",
  "transform",
  "Escribe en polaco: Mi hermana tiene alergia a los frutos secos.",
  "Moja siostra ma alergię na orzechy.",
  ["Moja siostra ma alergię na orzechy."],
);
k.ta(
  "pl-es-u4b-translate-soup",
  "transform",
  "Escribe en polaco: ¿Esta sopa lleva carne?",
  "Czy ta zupa jest z mięsem?",
  ["Czy ta zupa jest z mięsem?", "Czy zupa jest z mięsem?"],
);
k.ta(
  "pl-es-u4b-translate-bill",
  "transform",
  "Escribe en polaco: Los pierogi están riquísimos. La cuenta, por favor.",
  "Pierogi są pyszne. Poproszę rachunek.",
  ["Pierogi są pyszne. Poproszę rachunek.", "Pierogi są pyszne, poproszę rachunek."],
);
// EXPRESAR
k.write(
  "pl-es-u4b-write-order",
  "express",
  "Escribe el diálogo entre tú y un camarero: pide primero, segundo y bebida para ti y para un amigo que no come carne o tiene una alergia.",
  "Revisa: na pierwsze / na drugie danie, z / bez, nie jem + genitivo, mam alergię na + acusativo.",
  "Kelner: Co dla państwa? Ja: Na pierwsze danie poproszę rosół, a na drugie kotlet schabowy z ziemniakami. Mój kolega nie je mięsa. Czy pierogi z kapustą są bez mięsa? Kelner: Tak, są z kapustą i grzybami. Ja: To dla kolegi barszcz i pierogi z kapustą. Do picia dwa kompoty, poproszę.",
  ["primero", "segundo", "dieta o alergia", "bebida"],
  30,
  90,
  7,
);
k.write(
  "pl-es-u4b-write-food",
  "express",
  "Escribe qué comes y bebes en un día normal y qué platos polacos o españoles te gustan y cuáles no.",
  "Jem / piję + acusativo, nie jem + genitivo, smakuje mi / smakują mi.",
  "Rano piję kawę i jem kanapkę. Na obiad jem zupę i drugie danie. Wieczorem piję herbatę. Smakuje mi żurek, a pierogi ruskie są pyszne. Nie smakuje mi bigos: jest za kwaśny. Nie piję alkoholu.",
  ["mañana", "obiad", "gustos"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 4 (pl-es) total", renumber(4, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u4-restaurant.png",
    prompt:
      "a waiter wearing an apron serves plates of dumplings to a man and a woman sitting at a restaurant table with a checked tablecloth, two bowls of red soup on the table, rustic wooden interior, no menus or signs",
  },
]);
