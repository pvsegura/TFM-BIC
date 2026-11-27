// Polish for Spanish speakers — A1 unit 5B (W tym tygodniu) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-5b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(5, "pl-es-unit-5-week", 5500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u5b-listen-problem",
  "perceive",
  "Diálogo: ¿cuál es el problema?",
  "W kuchni jest bałagan!",
  ["La cocina está hecha un desastre.", "No funciona la lavadora.", "No hay comida en casa."],
);
k.mc(
  "pl-es-u5b-listen-kasia-dishes",
  "perceive",
  "Diálogo: ¿qué días friega Kasia los platos?",
  "W poniedziałek, w środę i w piątek.",
  ["Lunes, miércoles y viernes.", "Martes, jueves y sábado.", "Solo el domingo."],
);
k.tf(
  "pl-es-u5b-listen-sunday",
  "perceive",
  "Diálogo: el domingo friegan juntas después de comer.",
  "W niedzielę zmywamy razem, po obiedzie.",
  true,
);
k.mc(
  "pl-es-u5b-listen-rubbish",
  "perceive",
  "Diálogo: ¿quién saca la basura?",
  "A kto wynosi śmieci? — Ty, dobrze? — Dobrze.",
  ["Kasia.", "Ola.", "Las dos juntas."],
);
k.mc(
  "pl-es-u5b-listen-saturday",
  "perceive",
  "Diálogo: ¿por qué Kasia no puede este sábado?",
  "Jadę do rodziców do Tarnowa.",
  ["Va a casa de sus padres a Tarnów.", "Tiene que trabajar.", "Va al gimnasio."],
);
// CONECTAR
k.order(
  "pl-es-u5b-order-week",
  "connect",
  "Ordena los días de la semana empezando por el lunes.",
  "Poniedziałek (después del domingo), wtorek (segundo), środa (medio), czwartek (cuarto), piątek (quinto), sobota, niedziela.",
  ["poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela"],
  ", ",
);
k.match(
  "pl-es-u5b-match-chores",
  "connect",
  "Une cada tarea con su traducción.",
  "Odkurzać = pasar la aspiradora; zmywać naczynia = fregar los platos.",
  [
    ["odkurzać", "pasar la aspiradora"],
    ["zmywać naczynia", "fregar los platos"],
    ["prać", "lavar la ropa"],
    ["prasować", "planchar"],
    ["wynosić śmieci", "sacar la basura"],
    ["podlewać kwiaty", "regar las plantas"],
  ],
);
k.mc(
  "pl-es-u5b-niedziela",
  "connect",
  "¿De dónde viene niedziela (domingo)?",
  "Nie + działać: el día en que no se trabaja.",
  ["De «no hacer, no trabajar».", "De «nueve».", "De «sábado»."],
);
k.match(
  "pl-es-u5b-match-time",
  "connect",
  "Une cada expresión con su traducción.",
  "Jutro = mañana; wczoraj = ayer; w przyszłym tygodniu = la semana que viene.",
  [
    ["jutro", "mañana"],
    ["wczoraj", "ayer"],
    ["pojutrze", "pasado mañana"],
    ["w przyszłym tygodniu", "la semana que viene"],
  ],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u5b-gap-days",
  "structure",
  "Completa con w / we + día en acusativo.",
  "Środa → w środę; wtorek → we wtorek; sobota → w sobotę.",
  "Sprzątam ___ (środa), piorę ___ (wtorek), a odpoczywam ___ (sobota).",
  [["w środę"], ["we wtorek"], ["w sobotę"]],
);
k.mc("pl-es-u5b-niedziele", "structure", "¿Cuál es correcto?", "Niedziela (f) → w niedzielę.", [
  "w niedzielę",
  "w niedziela",
  "we niedzieli",
]);
k.mc(
  "pl-es-u5b-od-do",
  "structure",
  "¿Cómo dices «de lunes a viernes»?",
  "Od + genitivo, do + genitivo.",
  ["od poniedziałku do piątku", "od poniedziałek do piątek", "w poniedziałek do piątek"],
);
k.gap(
  "pl-es-u5b-gap-musiec",
  "structure",
  "Completa con musieć.",
  "Ja muszę, ty musisz, oni muszą.",
  "Ja ___ sprzątać, ty ___ gotować, a dzieci ___ odrabiać lekcje.",
  [["muszę"], ["musisz"], ["muszą"]],
);
k.gap(
  "pl-es-u5b-gap-moc",
  "structure",
  "Completa con móc.",
  "Ja mogę, ty możesz, my możemy.",
  "Czy ty ___ odkurzać w sobotę? Ja nie ___. My ___ to zrobić w niedzielę.",
  [["możesz"], ["mogę"], ["możemy"]],
);
k.mc("pl-es-u5b-infinitive", "structure", "¿Cuál es correcto?", "Muszę + infinitivo: sprzątać.", [
  "Muszę sprzątać łazienkę.",
  "Muszę sprzątam łazienkę.",
  "Muszę do sprzątać łazienkę.",
]);
k.mc(
  "pl-es-u5b-nie-musze",
  "structure",
  "¿Qué significa nie muszę gotować?",
  "Nie muszę = no tengo que, no hace falta.",
  ["No tengo que cocinar.", "No puedo cocinar.", "No quiero cocinar."],
);
k.mc(
  "pl-es-u5b-czasu",
  "structure",
  "¿Cómo dices «no tengo tiempo»?",
  "Negación + genitivo: czas → czasu.",
  ["Nie mam czasu.", "Nie mam czas.", "Nie jestem czas."],
);
k.gap(
  "pl-es-u5b-gap-verbs",
  "structure",
  "Completa con el presente.",
  "Sprzątać → sprząta; gotować → gotuje; prać → piorę.",
  "Ola ___ (sprzątać) kuchnię, Kasia ___ (gotować), a ja ___ (prać).",
  [["sprząta"], ["gotuje"], ["piorę"]],
);
k.order(
  "pl-es-u5b-order-plan",
  "structure",
  "Ordena: El martes y el jueves friego los platos.",
  "We wtorek i w czwartek + zmywam naczynia.",
  ["We", "wtorek", "i", "w", "czwartek", "zmywam", "naczynia."],
);
k.order(
  "pl-es-u5b-order-cant",
  "structure",
  "Ordena: Lo siento, el viernes no puedo.",
  "Przepraszam + w piątek nie mogę.",
  ["Przepraszam,", "w", "piątek", "nie", "mogę."],
);
// SONAR
k.mc(
  "pl-es-u5b-sound-musza",
  "sound",
  "Oyes [mushõ], con nasal al final. ¿Quién habla de obligación?",
  "Ą final nasal: muszą = ellos tienen que.",
  ["Ellos (muszą).", "Yo (muszę).", "Tú (musisz)."],
);
k.tf(
  "pl-es-u5b-sound-srode",
  "sound",
  "En w środę, la ę final se pronuncia casi como una e normal.",
  "Sí: [fśrode]. La ą final, en cambio, sí mantiene la nasalidad.",
  true,
);
k.match(
  "pl-es-u5b-sound-pairs",
  "sound",
  "Une cada forma con su persona.",
  "-ę final = ja; -ą final = oni.",
  [
    ["mogę", "ja"],
    ["mogą", "oni"],
    ["gotuję", "ja (cocino)"],
    ["gotują", "oni (cocinan)"],
  ],
);
// CULTURA
k.mc(
  "pl-es-u5b-reading-ola",
  "culture",
  "Lectura: ¿qué hace Ola el sábado por la mañana?",
  "Ola odkurza w sobotę rano.",
  ["Pasa la aspiradora.", "Lava la ropa.", "Va a casa de sus padres."],
);
k.mc(
  "pl-es-u5b-reading-paper",
  "culture",
  "Lectura: ¿en qué contenedor va el papel?",
  "Papier do niebieskiego pojemnika — azul.",
  ["En el azul.", "En el verde.", "En el amarillo."],
);
k.tf(
  "pl-es-u5b-reading-laundry",
  "culture",
  "Lectura: lavan la ropa entre semana.",
  "Pranie robią w weekend.",
  false,
);
k.mc(
  "pl-es-u5b-culture-glass",
  "culture",
  "Cultura: ¿de qué color es en Polonia el contenedor del vidrio?",
  "Verde para vidrio; amarillo para plástico y metal; marrón para orgánico.",
  ["Verde.", "Azul.", "Marrón."],
);
k.mc(
  "pl-es-u5b-culture-dzialka",
  "culture",
  "Cultura: ¿qué es una działka?",
  "Una parcela con huerto y caseta a las afueras de la ciudad.",
  ["Una parcela con huerto a las afueras.", "Un piso compartido.", "Un día festivo."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u5b-translate-wednesday",
  "transform",
  "Escribe en polaco: El miércoles limpio el baño.",
  "W środę + sprzątam łazienkę.",
  ["W środę sprzątam łazienkę.", "Sprzątam łazienkę w środę."],
);
k.ta(
  "pl-es-u5b-translate-must",
  "transform",
  "Escribe en polaco: Tengo que hacer la compra.",
  "Muszę + robić zakupy.",
  ["Muszę robić zakupy.", "Muszę zrobić zakupy."],
);
k.ta(
  "pl-es-u5b-translate-can",
  "transform",
  "Escribe en polaco: ¿Puedes sacar la basura?",
  "Czy możesz + wynieść / wynosić śmieci?",
  ["Czy możesz wynieść śmieci?", "Możesz wynieść śmieci?", "Czy możesz wynosić śmieci?"],
);
k.ta(
  "pl-es-u5b-translate-twice",
  "transform",
  "Escribe en polaco: Paso la aspiradora dos veces a la semana.",
  "Odkurzam + dwa razy w tygodniu.",
  ["Odkurzam dwa razy w tygodniu."],
);
k.ta(
  "pl-es-u5b-translate-weekdays",
  "transform",
  "Escribe en polaco: De lunes a viernes no tengo tiempo.",
  "Od poniedziałku do piątku + nie mam czasu.",
  ["Od poniedziałku do piątku nie mam czasu.", "Nie mam czasu od poniedziałku do piątku."],
);
// EXPRESAR
k.write(
  "pl-es-u5b-write-week",
  "express",
  "Escribe tu semana: qué haces cada día, qué tareas de casa tienes que hacer y qué día no puedes hacer nada.",
  "Revisa: w + acusativo (w środę, we wtorek), muszę / mogę + infinitivo, nie mam czasu.",
  "Od poniedziałku do piątku pracuję. W poniedziałek i w czwartek chodzę na siłownię. We wtorek robię zakupy, a w środę gotuję dla całego tygodnia. W piątek wieczorem nie mam czasu, bo spotykam się z przyjaciółmi. W sobotę muszę sprzątać mieszkanie i prać. W niedzielę odpoczywam.",
  ["días de la semana", "tareas", "muszę / mogę", "un día sin tiempo"],
  35,
  100,
  8,
);
k.write(
  "pl-es-u5b-write-message",
  "express",
  "Escribe un mensaje a tu compañero de piso: no puedes hacer tu tarea esta semana, explica por qué y propón otro día.",
  "Przepraszam, w … nie mogę, bo…; mogę w…; czy możesz…?",
  "Cześć, Marek! Przepraszam, w czwartek nie mogę wynieść śmieci, bo mam spotkanie w pracy do dwudziestej. Mogę wynieść je w środę wieczorem. A w sobotę mogę odkurzać za ciebie. Czy to dobrze?",
  ["disculpa", "motivo", "otro día", "pregunta"],
  20,
  70,
  6,
);
console.log("saved", k.save(), "unit 5 (pl-es) total", renumber(5, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u5-flatmates.png",
    prompt:
      "two young women laughing in a small apartment kitchen, one washing dishes at the sink, the other holding a vacuum cleaner, plants on the windowsill, no writing or signs",
  },
]);
