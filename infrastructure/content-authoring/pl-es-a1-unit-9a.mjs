// Polish for Spanish speakers — A1 unit 9A (Jaka będzie pogoda?) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-9a.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(9, "pl-es-unit-9-weather", 9100, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u9a-listen-saturday",
  "perceive",
  "Diálogo: ¿qué tiempo hará el sábado en Zakopane?",
  "W sobotę będzie padać śnieg i będzie minus osiem stopni.",
  ["Nevará y estarán a −8 °C.", "Hará sol y 12 °C.", "Lloverá y hará viento."],
);
k.mc(
  "pl-es-u9a-listen-madrid",
  "perceive",
  "Diálogo: ¿qué tiempo hace ahora en Madrid?",
  "W Madrycie teraz jest dwanaście stopni i świeci słońce.",
  ["12 °C y sol.", "−8 °C y nieve.", "2 °C y lluvia."],
);
k.tf(
  "pl-es-u9a-listen-wind",
  "perceive",
  "Diálogo: el domingo hará mucho viento.",
  "W niedzielę będzie słonecznie i nie będzie wiatru.",
  false,
);
k.mc(
  "pl-es-u9a-listen-saturday-plan",
  "perceive",
  "Diálogo: ¿qué harán el sábado si nieva?",
  "Pójdziemy do karczmy na herbatę z sokiem malinowym.",
  ["Ir a una taberna a tomar té.", "Esquiar.", "Quedarse en el hotel durmiendo."],
);
k.tf(
  "pl-es-u9a-listen-ski",
  "perceive",
  "Diálogo: Javier sabe esquiar.",
  "Nie umiem! Ale chcę spróbować.",
  false,
);
// CONECTAR
k.match(
  "pl-es-u9a-match-weather",
  "connect",
  "Une cada expresión con su traducción.",
  "Pada deszcz = llueve; wieje wiatr = hace viento; jest mgła = hay niebla.",
  [
    ["pada deszcz", "llueve"],
    ["pada śnieg", "nieva"],
    ["wieje wiatr", "hace viento"],
    ["świeci słońce", "hace sol"],
    ["jest mgła", "hay niebla"],
    ["jest pochmurno", "está nublado"],
  ],
);
k.match(
  "pl-es-u9a-match-seasons",
  "connect",
  "Une cada estación con «en…».",
  "Wiosna → wiosną, lato → latem, jesień → jesienią, zima → zimą.",
  [
    ["wiosna", "wiosną"],
    ["lato", "latem"],
    ["jesień", "jesienią"],
    ["zima", "zimą"],
  ],
);
k.mc(
  "pl-es-u9a-parasol",
  "connect",
  "En polaco, ¿qué es un parasol?",
  "Parasol (pl) = el paraguas para la lluvia.",
  ["El paraguas para la lluvia.", "La sombrilla de playa.", "El chubasquero."],
);
k.mc("pl-es-u9a-mroz", "connect", "¿Qué significa jest mróz?", "Mróz = helada, frío bajo cero.", [
  "Hiela, hace mucho frío.",
  "Hace mucho calor.",
  "Hay tormenta.",
]);
// ESTRUCTURAR
k.gap(
  "pl-es-u9a-gap-verbs",
  "structure",
  "Completa con świeci, pada o wieje.",
  "Słońce świeci; deszcz / śnieg pada; wiatr wieje.",
  "Rano ___ słońce, po południu ___ wiatr, a wieczorem ___ śnieg.",
  [["świeci"], ["wieje"], ["pada"]],
);
k.gap(
  "pl-es-u9a-gap-degrees",
  "structure",
  "Completa con stopień, stopnie o stopni.",
  "1 stopień; 2–4 stopnie; 5+ stopni.",
  "Dzisiaj jest jeden ___, jutro będą trzy ___, a w sobotę dziesięć ___.",
  [["stopień"], ["stopnie"], ["stopni"]],
);
k.mc("pl-es-u9a-mi-zimno", "structure", "¿Cómo dices «tengo frío»?", "Dativo: jest mi zimno.", [
  "Jest mi zimno.",
  "Jestem zimno.",
  "Mam zimno.",
]);
k.mc(
  "pl-es-u9a-zupa",
  "structure",
  "Completa: Herbata jest ___ (fría).",
  "Una cosa: adjetivo concordado (herbata, f → zimna).",
  ["zimna", "zimno", "mi zimno"],
);
k.gap(
  "pl-es-u9a-gap-future",
  "structure",
  "Completa con el futuro de być.",
  "Ja będę, my będziemy, oni będą.",
  "Jutro ja ___ pracować, a w sobotę my ___ jeździć na nartach. Dzieci ___ lepić bałwana.",
  [["będę"], ["będziemy"], ["będą"]],
);
k.mc("pl-es-u9a-bedzie-padac", "structure", "¿Cuál es correcto?", "Futuro: będzie + infinitivo.", [
  "Jutro będzie padać.",
  "Jutro jest padać.",
  "Jutro będzie pada.",
]);
k.mc(
  "pl-es-u9a-nie-bedzie",
  "structure",
  "¿Cómo dices «no habrá nieve»?",
  "Nie będzie + genitivo: śniegu.",
  ["Nie będzie śniegu.", "Nie będzie śnieg.", "Nie jest śniegu."],
);
k.mc(
  "pl-es-u9a-bedzie-cieplo",
  "structure",
  "¿Cómo dices «mañana hará calor»?",
  "Będzie + adverbio, sin sujeto.",
  ["Jutro będzie ciepło.", "Jutro będzie ciepły.", "Jutro ma ciepło."],
);
k.mc(
  "pl-es-u9a-perfective",
  "structure",
  "Pójdziemy do karczmy significa…",
  "Pójdziemy es perfectivo: forma de presente con valor de futuro.",
  ["Iremos a una taberna.", "Vamos ahora a una taberna.", "Fuimos a una taberna."],
);
k.order(
  "pl-es-u9a-order-ski",
  "structure",
  "Ordena: El domingo vamos a esquiar.",
  "W niedzielę + będziemy jeździć + na nartach.",
  ["W", "niedzielę", "będziemy", "jeździć", "na", "nartach."],
);
k.order(
  "pl-es-u9a-order-forecast",
  "structure",
  "Ordena: Mañana hará frío y nevará.",
  "Jutro będzie zimno i będzie padać śnieg.",
  ["Jutro", "będzie zimno", "i", "będzie padać", "śnieg."],
);
// SONAR
k.mc(
  "pl-es-u9a-sound-cas",
  "sound",
  "Un montañés dice cas. ¿Qué palabra estándar es?",
  "Mazurzenie: cz → c: czas.",
  ["czas", "kasa", "cześć"],
);
k.tf(
  "pl-es-u9a-sound-stress",
  "sound",
  "En la gwara góralska muchas palabras llevan el acento en la primera sílaba: PO-goda.",
  "Sí; en el polaco estándar el acento va en la penúltima: po-GO-da.",
  true,
);
k.mc(
  "pl-es-u9a-sound-standard",
  "sound",
  "¿Dónde va el acento en pogoda en polaco estándar?",
  "Penúltima sílaba: po-GO-da.",
  ["po-GO-da", "PO-go-da", "po-go-DA"],
);
// CULTURA
k.mc(
  "pl-es-u9a-reading-gdansk",
  "culture",
  "Lectura: ¿qué tiempo hará en Gdańsk?",
  "Będzie wiać silny wiatr i będzie padać deszcz; dwa stopnie.",
  ["Viento fuerte y lluvia, 2 °C.", "Sol y −8 °C.", "Niebla y smog."],
);
k.mc(
  "pl-es-u9a-reading-krakow",
  "culture",
  "Lectura: ¿qué recomiendan en Cracovia?",
  "Jakość powietrza będzie zła, więc lepiej nie biegać na zewnątrz.",
  ["No correr al aire libre.", "Ir a esquiar.", "Llevar crema solar."],
);
k.tf(
  "pl-es-u9a-reading-mountains",
  "culture",
  "Lectura: el domingo en Zakopane hará sol.",
  "W niedzielę będzie słonecznie, minus osiem stopni.",
  true,
);
k.mc(
  "pl-es-u9a-culture-jesien",
  "culture",
  "Cultura: ¿qué es la złota polska jesień?",
  "El otoño dorado polaco: hojas amarillas y días soleados en septiembre y octubre.",
  ["El otoño soleado de hojas doradas.", "Una fiesta de Navidad.", "Una bebida caliente."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u9a-translate-sun",
  "transform",
  "Escribe en polaco: Hace sol, pero hace frío.",
  "Świeci słońce, ale jest zimno.",
  ["Świeci słońce, ale jest zimno.", "Świeci słońce ale jest zimno."],
);
k.ta(
  "pl-es-u9a-translate-cold",
  "transform",
  "Escribe en polaco: ¿Tienes frío?",
  "Jest ci zimno?",
  ["Jest ci zimno?", "Czy jest ci zimno?"],
);
k.ta(
  "pl-es-u9a-translate-minus",
  "transform",
  "Escribe en polaco: Estamos a diez bajo cero.",
  "Jest minus dziesięć stopni.",
  ["Jest minus dziesięć stopni.", "Jest minus dziesięć."],
);
k.ta(
  "pl-es-u9a-translate-rain",
  "transform",
  "Escribe en polaco: Mañana lloverá.",
  "Jutro będzie padać (deszcz).",
  ["Jutro będzie padać.", "Jutro będzie padać deszcz.", "Jutro będzie padał deszcz."],
);
k.ta(
  "pl-es-u9a-translate-winter",
  "transform",
  "Escribe en polaco: En invierno nieva.",
  "Zimą pada śnieg.",
  ["Zimą pada śnieg.", "W zimie pada śnieg."],
);
// EXPRESAR
k.write(
  "pl-es-u9a-write-forecast",
  "express",
  "Escribe la previsión del tiempo del fin de semana para tu ciudad y lo que vas a hacer cada día según el tiempo.",
  "Revisa: będzie + infinitivo / adverbio, stopień / stopnie / stopni, nie będzie + genitivo.",
  "W sobotę w Krakowie będzie pochmurno i będzie padać deszcz. Będzie pięć stopni. W niedzielę nie będzie deszczu, będzie słonecznie, ale zimno: minus dwa stopnie. W sobotę będę czytać w domu, a w niedzielę pójdę na spacer do parku z przyjaciółmi.",
  ["sábado", "domingo", "temperatura", "planes"],
  30,
  100,
  7,
);
k.write(
  "pl-es-u9a-write-compare",
  "express",
  "Escribe a un amigo polaco cómo es el tiempo en tu ciudad española en cada estación y en qué estación prefieres visitar Polonia.",
  "Wiosną, latem, jesienią, zimą + jest / pada / świeci.",
  "W moim mieście, w Sewilli, latem jest bardzo gorąco: czterdzieści stopni! Zimą jest ciepło, piętnaście stopni, i rzadko pada deszcz. Wiosną jest pięknie. Chcę przyjechać do Polski jesienią, bo podoba mi się złota polska jesień.",
  ["estaciones en tu ciudad", "cuándo visitar Polonia"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 9 (pl-es) total", renumber(9, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u9-snow.png",
    prompt:
      "a young man and a young woman in winter hats and scarves walk along a snowy street of a mountain village with wooden houses, snowy mountain peaks in the background, snowflakes falling, no signs or text",
  },
]);
