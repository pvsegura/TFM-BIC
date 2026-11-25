// Writes the Spanish A1 grammar reference (content/languages/es/grammar/*.json), explained in
// Polish. Used by the web's grammar section and printed as the textbook's grammar appendix.
//   node infrastructure/content-authoring/es-grammar-a1.mjs
import fs from "node:fs";

const DIR = "content/languages/es/grammar";
fs.mkdirSync(DIR, { recursive: true });
const topics = [];
let order = 0;
const P = [
  "yo",
  "tú",
  "él / ella / usted",
  "nosotros / nosotras",
  "vosotros / vosotras",
  "ellos / ellas / ustedes",
];
const ex = (text, translation, note) => ({ text, translation, ...(note ? { note } : {}) });
const table = (columns, rows, caption) => ({ ...(caption ? { caption } : {}), columns, rows });
const conj = (verbs) =>
  table(
    ["Osoba", ...verbs.map((v) => v[0])],
    P.map((p, i) => [p, ...verbs.map((v) => v[1][i])]),
  );
function topic(id, category, title, description, sections) {
  order += 10;
  topics.push({
    schemaVersion: 1,
    id: `es-ref-${id}`,
    languageId: "es",
    status: "published",
    order,
    category,
    levelId: "a1",
    instructionLanguage: "pl",
    title,
    description,
    sections,
  });
}

topic(
  "present-regular",
  "verbs",
  "Czas teraźniejszy: czasowniki regularne",
  "Trzy wzory odmiany: -ar, -er, -ir.",
  [
    {
      text: "Hiszpańskie czasowniki dzielą się na trzy grupy według końcówki bezokolicznika: -ar, -er, -ir. W czasownikach regularnych odcinasz końcówkę i dodajesz końcówki osobowe. Zaimek osobowy zwykle pomijamy, bo końcówka pokazuje, kto działa.",
      table: conj([
        ["hablar (mówić)", ["hablo", "hablas", "habla", "hablamos", "habláis", "hablan"]],
        ["comer (jeść)", ["como", "comes", "come", "comemos", "coméis", "comen"]],
        ["vivir (mieszkać)", ["vivo", "vives", "vive", "vivimos", "vivís", "viven"]],
      ]),
      examples: [
        ex("Hablo polaco y un poco de español.", "Mówię po polsku i trochę po hiszpańsku."),
        ex("¿Dónde vivís?", "Gdzie mieszkacie?"),
      ],
    },
    {
      heading: "Częste czasowniki regularne",
      table: table(
        ["-ar", "-er", "-ir"],
        [
          ["trabajar — pracować", "beber — pić", "escribir — pisać"],
          ["estudiar — uczyć się", "leer — czytać", "abrir — otwierać"],
          ["escuchar — słuchać", "aprender — uczyć się (czegoś)", "subir — wchodzić"],
          ["comprar — kupować", "comprender — rozumieć", "recibir — otrzymywać"],
          ["llegar — przybywać", "correr — biegać", "compartir — dzielić się"],
          ["necesitar — potrzebować", "vender — sprzedawać", "decidir — decydować"],
          ["cocinar — gotować", "deber — musieć, być winnym", "asistir — uczęszczać"],
        ],
      ),
    },
  ],
);

topic(
  "key-irregulars",
  "verbs",
  "Ser, estar, tener, ir",
  "Cztery najważniejsze czasowniki nieregularne.",
  [
    {
      text: "Te cztery czasowniki są nieregularne i występują w prawie każdej rozmowie. Ser i estar to dwa odpowiedniki polskiego „być”: ser — kim/czym ktoś jest (tożsamość, pochodzenie, zawód, cechy), estar — gdzie jest i w jakim stanie się znajduje.",
      table: conj([
        ["ser (być)", ["soy", "eres", "es", "somos", "sois", "son"]],
        ["estar (być)", ["estoy", "estás", "está", "estamos", "estáis", "están"]],
        ["tener (mieć)", ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"]],
        ["ir (iść, jechać)", ["voy", "vas", "va", "vamos", "vais", "van"]],
      ]),
    },
    {
      heading: "Ser czy estar?",
      table: table(
        ["ser", "estar"],
        [
          ["tożsamość: Soy Ana.", "miejsce: Estoy en casa."],
          ["pochodzenie: Es de Polonia.", "stan: Está cansada."],
          ["zawód: Es médico.", "samopoczucie: ¿Cómo estás? — Bien."],
          ["cechy: La casa es grande.", "stan cywilny (zwykle): Está casado."],
          ["godzina, data: Son las tres.", "wynik działania: La puerta está abierta."],
        ],
      ),
      examples: [
        ex(
          "Marta es simpática, pero hoy está nerviosa.",
          "Marta jest sympatyczna, ale dziś jest zdenerwowana.",
        ),
      ],
    },
  ],
);

topic(
  "present-irregular",
  "verbs",
  "Czas teraźniejszy: czasowniki nieregularne",
  "Zmiany samogłoski w temacie i nieregularna 1. osoba.",
  [
    {
      text: "W wielu częstych czasownikach samogłoska tematu zmienia się, gdy pada na nią akcent: e → ie, o → ue, e → i. Zmiana nie dotyczy form nosotros i vosotros — w tabeli tworzą one „podeszwę buta”, dlatego mówimy o czasownikach „bota”.",
      table: conj([
        ["querer (e → ie)", ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"]],
        ["poder (o → ue)", ["puedo", "puedes", "puede", "podemos", "podéis", "pueden"]],
        ["pedir (e → i)", ["pido", "pides", "pide", "pedimos", "pedís", "piden"]],
        ["jugar (u → ue)", ["juego", "juegas", "juega", "jugamos", "jugáis", "juegan"]],
      ]),
    },
    {
      heading: "Inne czasowniki z tymi zmianami",
      table: table(
        ["e → ie", "o → ue", "e → i"],
        [
          ["empezar — zaczynać", "dormir — spać", "repetir — powtarzać"],
          ["preferir — woleć", "volver — wracać", "servir — podawać"],
          ["pensar — myśleć", "encontrar — znajdować", "seguir — kontynuować"],
          ["entender — rozumieć", "costar — kosztować", "vestirse — ubierać się"],
          ["cerrar — zamykać", "acostarse — kłaść się spać", "elegir — wybierać"],
        ],
      ),
    },
    {
      heading: "Nieregularna tylko 1. osoba (yo)",
      table: table(
        ["Bezokolicznik", "yo", "pozostałe osoby"],
        [
          ["hacer — robić", "hago", "haces, hace, hacemos…"],
          ["poner — kłaść", "pongo", "pones, pone…"],
          ["salir — wychodzić", "salgo", "sales, sale…"],
          ["traer — przynosić", "traigo", "traes, trae…"],
          ["conocer — znać", "conozco", "conoces, conoce…"],
          ["saber — wiedzieć", "sé", "sabes, sabe…"],
          ["dar — dawać", "doy", "das, da…"],
          ["ver — widzieć", "veo", "ves, ve…"],
        ],
      ),
    },
    {
      heading: "Całkowicie nieregularne",
      table: conj([
        ["venir (przychodzić)", ["vengo", "vienes", "viene", "venimos", "venís", "vienen"]],
        ["decir (mówić)", ["digo", "dices", "dice", "decimos", "decís", "dicen"]],
        ["oír (słyszeć)", ["oigo", "oyes", "oye", "oímos", "oís", "oyen"]],
      ]),
      examples: [
        ex("¿Puedes repetir, por favor?", "Możesz powtórzyć?"),
        ex("Salgo de casa a las ocho.", "Wychodzę z domu o ósmej."),
      ],
    },
  ],
);

topic(
  "reflexive",
  "verbs",
  "Czasowniki zwrotne",
  "Llamarse, levantarse, ducharse: zaimek przed czasownikiem.",
  [
    {
      text: "Czasowniki zwrotne mają w bezokoliczniku końcówkę -se (llamarse, levantarse). W odmianie zaimek zwrotny stoi przed czasownikiem i zmienia się z osobą — tak jak polskie „się”, ale nie zawsze w tych samych czasownikach.",
      table: table(
        ["Osoba", "Zaimek", "levantarse (wstawać)", "acostarse (kłaść się, o → ue)"],
        [
          ["yo", "me", "me levanto", "me acuesto"],
          ["tú", "te", "te levantas", "te acuestas"],
          ["él / ella / usted", "se", "se levanta", "se acuesta"],
          ["nosotros / nosotras", "nos", "nos levantamos", "nos acostamos"],
          ["vosotros / vosotras", "os", "os levantáis", "os acostáis"],
          ["ellos / ellas / ustedes", "se", "se levantan", "se acuestan"],
        ],
      ),
    },
    {
      heading: "Codzienna rutyna",
      table: table(
        ["Hiszpański", "Polski"],
        [
          ["despertarse (e → ie)", "budzić się"],
          ["ducharse", "brać prysznic"],
          ["lavarse los dientes", "myć zęby"],
          ["vestirse (e → i)", "ubierać się"],
          ["peinarse", "czesać się"],
          ["quedarse", "zostawać"],
        ],
      ),
      examples: [ex("Me levanto a las siete y me ducho.", "Wstaję o siódmej i biorę prysznic.")],
    },
  ],
);

topic(
  "gustar",
  "verbs",
  "Gustar, encantar, doler",
  "Czasowniki, w których podmiotem jest rzecz, która się podoba lub boli.",
  [
    {
      text: "W zdaniu Me gusta el café podmiotem jest kawa: to ona „podoba się mnie”. Dlatego czasownik ma formę gusta (jedna rzecz, czasownik w bezokoliczniku) albo gustan (wiele rzeczy). Osobę wskazuje zaimek przed czasownikiem: me, te, le, nos, os, les.",
      table: table(
        ["Komu?", "Zaimek", "jedna rzecz / czynność", "wiele rzeczy"],
        [
          ["(a mí)", "me", "me gusta el té", "me gustan los gatos"],
          ["(a ti)", "te", "te gusta bailar", "te gustan las películas"],
          ["(a él / ella / usted)", "le", "le gusta la música", "le gustan los deportes"],
          ["(a nosotros)", "nos", "nos gusta viajar", "nos gustan las playas"],
          ["(a vosotros)", "os", "os gusta el fútbol", "os gustan los conciertos"],
          ["(a ellos / ustedes)", "les", "les gusta cocinar", "les gustan los libros"],
        ],
      ),
      examples: [
        ex("Me encanta el chocolate.", "Uwielbiam czekoladę."),
        ex(
          "Me duelen los pies.",
          "Bolą mnie stopy.",
          "Doler działa tak samo: me duele la cabeza / me duelen los pies.",
        ),
        ex("—No me gusta el café. —A mí tampoco.", "—Nie lubię kawy. —Ja też nie."),
      ],
    },
  ],
);

topic(
  "ir-a-hay",
  "verbs",
  "Ir a + bezokolicznik; hay czy está",
  "Plany na przyszłość i mówienie o tym, co gdzie jest.",
  [
    {
      heading: "Ir a + bezokolicznik",
      text: "Plany i zamiary wyrażamy konstrukcją ir (w odpowiedniej osobie) + a + bezokolicznik — jak polskie „zamierzam”, „będę robić”.",
      examples: [
        ex("Este verano voy a viajar a Andalucía.", "Tego lata pojadę do Andaluzji."),
        ex("¿Qué vais a hacer el sábado?", "Co będziecie robić w sobotę?"),
      ],
    },
    {
      heading: "Hay czy está?",
      text: "Hay (jest, są — forma stała) mówi, że coś istnieje, i łączy się z un/una, liczbami lub rzeczownikiem bez rodzajnika. Está / están mówi, gdzie znajduje się rzecz znana, i łączy się z el/la/los/las lub imieniem.",
      table: table(
        ["hay", "está / están"],
        [
          ["Hay una farmacia cerca.", "La farmacia está cerca."],
          ["Hay dos bancos en la calle.", "Los bancos están en la calle Mayor."],
          ["¿Hay leche?", "¿Dónde está la leche?"],
        ],
      ),
    },
  ],
);

topic("imperative", "verbs", "Tryb rozkazujący (tú, usted)", "Wskazówki, prośby i instrukcje.", [
  {
    text: "Twierdzący tryb rozkazujący dla tú ma zwykle formę 3. osoby czasu teraźniejszego (habla, come, escribe). Dla usted zamieniamy samogłoskę końcówki: -ar → -e, -er/-ir → -a (hable, coma, escriba). Zaimki dołączamy na końcu: siéntate, dígame.",
    table: table(
      ["Bezokolicznik", "tú", "usted"],
      [
        ["girar — skręcać", "gira", "gire"],
        ["tomar — brać", "toma", "tome"],
        ["seguir — iść dalej", "sigue", "siga"],
        ["cruzar — przechodzić przez", "cruza", "cruce"],
        ["venir — przyjść", "ven", "venga"],
        ["ir — iść", "ve", "vaya"],
        ["hacer — robić", "haz", "haga"],
        ["poner — kłaść", "pon", "ponga"],
        ["salir — wyjść", "sal", "salga"],
        ["decir — powiedzieć", "di", "diga"],
        ["tener — mieć", "ten", "tenga"],
      ],
    ),
    examples: [ex("Siga todo recto y gire a la derecha.", "Proszę iść prosto i skręcić w prawo.")],
  },
]);

topic(
  "pronouns",
  "pronouns",
  "Zaimki osobowe, zwrotne i dzierżawcze",
  "Wszystkie zaimki potrzebne na poziomie A1 w jednym miejscu.",
  [
    {
      table: table(
        ["Podmiot", "Zwrotny", "Po przyimku", "Dzierżawczy (przed rzeczownikiem)"],
        [
          ["yo — ja", "me", "mí (conmigo)", "mi, mis"],
          ["tú — ty", "te", "ti (contigo)", "tu, tus"],
          ["él / ella — on / ona", "se", "él / ella", "su, sus"],
          ["usted — Pan / Pani", "se", "usted", "su, sus"],
          ["nosotros / nosotras — my", "nos", "nosotros / nosotras", "nuestro/a, nuestros/as"],
          ["vosotros / vosotras — wy", "os", "vosotros / vosotras", "vuestro/a, vuestros/as"],
          ["ellos / ellas — oni / one", "se", "ellos / ellas", "su, sus"],
          ["ustedes — Państwo", "se", "ustedes", "su, sus"],
        ],
      ),
      examples: [
        ex("¿Vienes conmigo?", "Pójdziesz ze mną?", "Con + mí / ti = conmigo, contigo."),
        ex(
          "Este regalo es para ti.",
          "Ten prezent jest dla ciebie.",
          "Po przyimku: mí z kreską (ja), mi bez kreski znaczy „mój”.",
        ),
      ],
    },
    {
      heading: "Kiedy dodajemy zaimek podmiotu?",
      text: "Zaimek podmiotu (yo, tú…) zwykle pomijamy, bo osobę pokazuje końcówka czasownika. Dodajemy go dla kontrastu (Yo soy de Polonia, ¿y tú?), dla podkreślenia albo gdy forma czasownika mogłaby być niejasna (él / ella / usted mają tę samą formę).",
    },
  ],
);

topic(
  "question-words",
  "pronouns",
  "Słowa pytające",
  "Qué, quién, dónde, cuándo, cuánto, cómo, cuál, por qué.",
  [
    {
      text: "Słowa pytające zawsze mają kreskę (tilde) i stoją na początku pytania, po odwróconym pytajniku ¿.",
      table: table(
        ["Hiszpański", "Polski", "Przykład"],
        [
          ["¿Qué?", "Co? Jaki?", "¿Qué quieres tomar?"],
          ["¿Quién? / ¿Quiénes?", "Kto?", "¿Quién es ese chico?"],
          ["¿Dónde? / ¿Adónde?", "Gdzie? / Dokąd?", "¿Dónde vives? ¿Adónde vas?"],
          ["¿De dónde?", "Skąd?", "¿De dónde eres?"],
          ["¿Cuándo?", "Kiedy?", "¿Cuándo es tu cumpleaños?"],
          ["¿Cuánto / Cuánta / Cuántos / Cuántas?", "Ile?", "¿Cuántos años tienes?"],
          ["¿Cómo?", "Jak?", "¿Cómo te llamas?"],
          ["¿Cuál? / ¿Cuáles?", "Który? Jaki?", "¿Cuál es tu número?"],
          ["¿Por qué?", "Dlaczego?", "¿Por qué estudias español?"],
        ],
      ),
      examples: [
        ex(
          "¿Por qué estudias español? — Porque me gusta España.",
          "Dlaczego uczysz się hiszpańskiego? — Bo lubię Hiszpanię.",
          "¿Por qué? (pytanie) — porque (odpowiedź), razem i bez kreski.",
        ),
      ],
    },
  ],
);

topic(
  "articles-gender",
  "nouns",
  "Rodzajniki, rodzaj i liczba mnoga",
  "El, la, un, una i reguły rodzaju rzeczowników.",
  [
    {
      table: table(
        ["Rodzajnik", "męski", "żeński", "męski mn.", "żeński mn."],
        [
          ["określony", "el", "la", "los", "las"],
          ["nieokreślony", "un", "una", "unos", "unas"],
        ],
      ),
      text: "Po a i de rodzajnik el łączy się z przyimkiem: a + el = al, de + el = del (Voy al cine. Vengo del trabajo).",
    },
    {
      heading: "Reguły rodzaju",
      table: table(
        ["Zwykle męskie", "Zwykle żeńskie", "Wyjątki do zapamiętania"],
        [
          ["-o: el libro", "-a: la casa", "el día, el mapa, el sofá"],
          ["-or: el color", "-ción, -sión: la canción", "la mano, la foto, la moto"],
          ["-aje: el viaje", "-dad, -tad: la ciudad", "el problema, el idioma, el tema"],
          ["dni, miesiące, języki", "-umbre: la costumbre", "la radio, la flor"],
        ],
      ),
    },
    {
      heading: "Liczba mnoga",
      table: table(
        ["Zakończenie", "Reguła", "Przykład"],
        [
          ["samogłoska", "+ s", "la casa → las casas"],
          ["spółgłoska", "+ es", "la ciudad → las ciudades"],
          ["-z", "z → ces", "el lápiz → los lápices"],
          ["-s bez akcentu", "bez zmian", "el lunes → los lunes"],
        ],
      ),
    },
  ],
);

topic(
  "adjectives",
  "adjectives",
  "Przymiotniki: zgoda, miejsce, kolory",
  "Jak przymiotnik zmienia się z rzeczownikiem.",
  [
    {
      text: "Przymiotnik zgadza się z rzeczownikiem w rodzaju i liczbie i zwykle stoi po nim: un coche rojo, una casa roja, unos coches rojos, unas casas rojas. Przymiotniki na -e i na spółgłoskę mają jedną formę dla obu rodzajów (grande, azul, joven).",
      table: table(
        ["Forma podstawowa", "Męski", "Żeński", "Męski mn.", "Żeński mn."],
        [
          ["-o", "alto", "alta", "altos", "altas"],
          ["-e", "grande", "grande", "grandes", "grandes"],
          ["spółgłoska", "azul", "azul", "azules", "azules"],
          ["-or (narodowości, -dor)", "trabajador", "trabajadora", "trabajadores", "trabajadoras"],
        ],
      ),
    },
    {
      heading: "Kolory",
      table: table(
        ["Hiszpański", "Polski", "Hiszpański", "Polski"],
        [
          ["blanco/a", "biały", "rojo/a", "czerwony"],
          ["negro/a", "czarny", "amarillo/a", "żółty"],
          ["gris", "szary", "verde", "zielony"],
          ["azul", "niebieski", "naranja", "pomarańczowy"],
          ["marrón", "brązowy", "rosa", "różowy"],
        ],
      ),
      examples: [
        ex(
          "Hoy es un buen día.",
          "Dziś jest dobry dzień.",
          "Bueno → buen, malo → mal przed rzeczownikiem męskim.",
        ),
        ex(
          "Madrid es una gran ciudad.",
          "Madryt to wielkie miasto.",
          "Grande → gran przed rzeczownikiem znaczy „wielki”.",
        ),
      ],
    },
  ],
);

topic(
  "time-adverbs",
  "adverbs",
  "Przysłówki i wyrażenia czasu",
  "Kiedy i jak często: hoy, siempre, a veces, todavía…",
  [
    {
      heading: "Kiedy?",
      table: table(
        ["Hiszpański", "Polski", "Hiszpański", "Polski"],
        [
          ["hoy", "dziś", "ahora", "teraz"],
          ["mañana", "jutro", "luego / después", "potem"],
          ["ayer", "wczoraj", "antes", "wcześniej, przedtem"],
          ["pasado mañana", "pojutrze", "pronto", "wkrótce"],
          ["anteayer", "przedwczoraj", "temprano", "wcześnie"],
          ["esta semana", "w tym tygodniu", "tarde", "późno"],
          ["el lunes", "w poniedziałek", "ya", "już"],
          ["los lunes", "w poniedziałki", "todavía", "jeszcze, wciąż"],
        ],
      ),
    },
    {
      heading: "Jak często?",
      table: table(
        ["Hiszpański", "Polski"],
        [
          ["siempre", "zawsze"],
          ["casi siempre", "prawie zawsze"],
          ["normalmente / generalmente", "zwykle"],
          ["a menudo / muchas veces", "często"],
          ["a veces", "czasami"],
          ["pocas veces", "rzadko"],
          ["casi nunca", "prawie nigdy"],
          ["nunca", "nigdy"],
          ["todos los días / cada día", "codziennie"],
          ["una vez a la semana", "raz w tygodniu"],
          ["dos veces al mes", "dwa razy w miesiącu"],
        ],
      ),
      examples: [
        ex(
          "Nunca bebo café por la noche.",
          "Nigdy nie piję kawy wieczorem.",
          "Nunca przed czasownikiem bez no; po czasowniku z no: No bebo nunca café.",
        ),
        ex(
          "Mañana por la mañana tengo clase.",
          "Jutro rano mam zajęcia.",
          "Mañana = jutro; la mañana = ranek.",
        ),
      ],
    },
  ],
);

topic(
  "manner-adverbs",
  "adverbs",
  "Przysłówki sposobu i ilości",
  "Bien, mal, despacio i przysłówki na -mente.",
  [
    {
      table: table(
        ["Hiszpański", "Polski", "Hiszpański", "Polski"],
        [
          ["bien", "dobrze", "mal", "źle"],
          ["mejor", "lepiej", "peor", "gorzej"],
          ["despacio", "wolno", "rápido", "szybko"],
          ["así", "tak, w ten sposób", "regular", "tak sobie"],
          ["muy", "bardzo (+ przymiotnik)", "mucho", "dużo, bardzo (+ czasownik)"],
          ["poco", "mało", "bastante", "dość"],
          ["demasiado", "za bardzo, za dużo", "casi", "prawie"],
        ],
      ),
    },
    {
      heading: "Przysłówki na -mente",
      text: "Wiele przysłówków tworzymy od żeńskiej formy przymiotnika + -mente (jak polskie -nie, -wie): rápida → rápidamente. Przymiotniki z jedną formą dostają -mente bez zmian: fácil → fácilmente, normal → normalmente. Kreska zostaje tam, gdzie była w przymiotniku.",
      table: table(
        ["Przymiotnik", "Przysłówek", "Polski"],
        [
          ["rápido/a", "rápidamente", "szybko"],
          ["tranquilo/a", "tranquilamente", "spokojnie"],
          ["fácil", "fácilmente", "łatwo"],
          ["normal", "normalmente", "zwykle, normalnie"],
          ["general", "generalmente", "ogólnie, zazwyczaj"],
          ["perfecto/a", "perfectamente", "doskonale"],
        ],
      ),
      examples: [
        ex(
          "Hablas muy bien español.",
          "Bardzo dobrze mówisz po hiszpańsku.",
          "Muy przed przymiotnikiem/przysłówkiem, mucho po czasowniku: Trabajo mucho.",
        ),
      ],
    },
  ],
);

topic(
  "place-prepositions",
  "prepositions",
  "Przysłówki miejsca i przyimki",
  "Aquí, allí, cerca de, al lado de, a, en, de, con, para.",
  [
    {
      heading: "Gdzie?",
      table: table(
        ["Hiszpański", "Polski", "Hiszpański", "Polski"],
        [
          ["aquí", "tutaj", "allí / ahí", "tam"],
          ["cerca (de)", "blisko", "lejos (de)", "daleko"],
          ["al lado (de)", "obok", "enfrente (de)", "naprzeciwko"],
          ["delante (de)", "przed", "detrás (de)", "za"],
          ["encima (de)", "na, nad", "debajo (de)", "pod"],
          ["dentro (de)", "wewnątrz", "fuera (de)", "na zewnątrz"],
          ["a la derecha (de)", "na prawo", "a la izquierda (de)", "na lewo"],
          ["entre", "między", "todo recto", "prosto"],
        ],
      ),
    },
    {
      heading: "Najważniejsze przyimki",
      table: table(
        ["Przyimek", "Użycie", "Przykład"],
        [
          ["a", "kierunek, godzina", "Voy a Madrid. A las tres."],
          ["en", "miejsce, środek transportu", "Estoy en casa. Voy en tren."],
          ["de", "pochodzenie, przynależność, materiał", "Soy de Polonia. El libro de Ana."],
          ["con", "z (kim, czym)", "Café con leche. Vivo con mi novia."],
          ["sin", "bez", "Agua sin gas."],
          ["para", "dla, aby (cel)", "Es para ti. Estudio para trabajar en España."],
          ["por", "przez, z powodu, po (pora dnia)", "Por la mañana. Gracias por todo."],
          ["desde … hasta", "od … do", "Desde las nueve hasta las cinco."],
        ],
      ),
      examples: [
        ex(
          "Voy en autobús, pero vuelvo a pie.",
          "Jadę autobusem, a wracam pieszo.",
          "Środek transportu z en; ale a pie (pieszo).",
        ),
      ],
    },
  ],
);

topic(
  "numbers",
  "numbers",
  "Liczebniki, godziny i daty",
  "Od 0 do 1000, liczebniki porządkowe, godzina i data.",
  [
    {
      table: table(
        ["0–9", "10–19", "20–29", "dziesiątki"],
        [
          ["0 cero", "10 diez", "20 veinte", "30 treinta"],
          ["1 uno", "11 once", "21 veintiuno", "40 cuarenta"],
          ["2 dos", "12 doce", "22 veintidós", "50 cincuenta"],
          ["3 tres", "13 trece", "23 veintitrés", "60 sesenta"],
          ["4 cuatro", "14 catorce", "24 veinticuatro", "70 setenta"],
          ["5 cinco", "15 quince", "25 veinticinco", "80 ochenta"],
          ["6 seis", "16 dieciséis", "26 veintiséis", "90 noventa"],
          ["7 siete", "17 diecisiete", "27 veintisiete", "100 cien"],
          ["8 ocho", "18 dieciocho", "28 veintiocho", "101 ciento uno"],
          ["9 nueve", "19 diecinueve", "29 veintinueve", "31 treinta y uno"],
        ],
      ),
    },
    {
      heading: "Setki i tysiące",
      table: table(
        ["Liczba", "Hiszpański", "Liczba", "Hiszpański"],
        [
          ["200", "doscientos/as", "600", "seiscientos/as"],
          ["300", "trescientos/as", "700", "setecientos/as"],
          ["400", "cuatrocientos/as", "800", "ochocientos/as"],
          ["500", "quinientos/as", "900", "novecientos/as"],
          ["1000", "mil", "2026", "dos mil veintiséis"],
        ],
      ),
      text: "Setki zgadzają się w rodzaju: doscientas personas, quinientos euros.",
    },
    {
      heading: "Liczebniki porządkowe",
      table: table(
        ["1.", "2.", "3.", "4.", "5."],
        [
          ["primero", "segundo", "tercero", "cuarto", "quinto"],
          ["6. sexto", "7. séptimo", "8. octavo", "9. noveno", "10. décimo"],
        ],
      ),
      text: "Primero i tercero tracą -o przed rzeczownikiem męskim: el primer piso, el tercer día.",
    },
    {
      heading: "Godzina",
      table: table(
        ["Godzina", "Po hiszpańsku"],
        [
          ["1:00", "Es la una."],
          ["3:00", "Son las tres."],
          ["3:15", "Son las tres y cuarto."],
          ["3:30", "Son las tres y media."],
          ["3:45", "Son las cuatro menos cuarto."],
          ["3:50", "Son las cuatro menos diez."],
        ],
      ),
      examples: [
        ex(
          "¿A qué hora empieza la clase? — A las nueve y media.",
          "O której zaczynają się zajęcia? — O wpół do dziesiątej.",
        ),
      ],
    },
  ],
);

topic(
  "connectors",
  "connectors",
  "Spójniki i słowa łączące",
  "Y, o, pero, porque, también, tampoco, primero, luego…",
  [
    {
      table: table(
        ["Hiszpański", "Polski", "Uwaga"],
        [
          ["y (e przed i-, hi-)", "i", "padres e hijos"],
          ["o (u przed o-, ho-)", "lub", "siete u ocho"],
          ["pero", "ale", "Es caro, pero bueno."],
          ["porque", "ponieważ, bo", "Estudio porque me gusta."],
          ["también", "też (w zdaniu twierdzącym)", "Yo también."],
          ["tampoco", "też nie", "Yo tampoco."],
          ["entonces", "więc, w takim razie", "Entonces, ¿vamos?"],
          [
            "primero … luego … después … al final",
            "najpierw … potem … następnie … na końcu",
            "do opisu kolejności",
          ],
          ["por eso", "dlatego", "Llueve, por eso no salgo."],
        ],
      ),
      examples: [
        ex(
          "—Me gusta el cine. —A mí también. —No me gusta el fútbol. —A mí tampoco.",
          "—Lubię kino. —Ja też. —Nie lubię piłki nożnej. —Ja też nie.",
        ),
      ],
    },
  ],
);

topic(
  "word-formation",
  "word-formation",
  "Słowotwórstwo: końcówki, które warto znać",
  "-ción, -dad, -mente, -ero, -ito i przedrostki.",
  [
    {
      text: "Wiele hiszpańskich słów rozpoznasz dzięki typowym końcówkom — często odpowiadają polskim.",
      table: table(
        ["Końcówka", "Znaczenie", "Przykłady", "Polski odpowiednik"],
        [
          [
            "-ción",
            "czynność, wynik (ż.)",
            "la información, la estación",
            "-cja: informacja, stacja",
          ],
          [
            "-dad / -tad",
            "cecha, stan (ż.)",
            "la ciudad, la libertad, la universidad",
            "-ość: wolność",
          ],
          ["-mente", "przysłówek", "rápidamente, normalmente", "-nie / -wo"],
          [
            "-ero / -era",
            "zawód, pojemnik",
            "el panadero, la cocinera, el azucarero",
            "-arz: piekarz",
          ],
          ["-ista", "zawód, zwolennik", "el / la dentista, el / la taxista", "-ista: dentysta"],
          ["-ería", "sklep, miejsce", "la panadería, la librería", "-arnia: piekarnia"],
          ["-ito / -ita", "zdrobnienie", "un momentito, la casita", "-ek / -ka: chwileczka"],
          ["-ísimo", "bardzo", "carísimo, buenísimo", "bardzo drogi, świetny"],
        ],
      ),
    },
    {
      heading: "Przedrostki",
      table: table(
        ["Przedrostek", "Znaczenie", "Przykład"],
        [
          ["des-", "przeciwieństwo", "hacer → deshacer, conocido → desconocido"],
          ["in- / im-", "nie-", "posible → imposible, útil → inútil"],
          ["re-", "ponownie", "leer → releer, hacer → rehacer"],
        ],
      ),
      examples: [
        ex(
          "La librería no es una biblioteca.",
          "Librería to księgarnia, a nie biblioteka.",
          "Fałszywy przyjaciel: biblioteka = la biblioteca.",
        ),
      ],
    },
  ],
);

for (const t of topics) fs.writeFileSync(`${DIR}/${t.id}.json`, `${JSON.stringify(t, null, 2)}\n`);
fs.writeFileSync(
  `${DIR}/README.md`,
  "# Español — referencia gramatical\n\nTemas de consulta rápida para hablantes de polaco (explicaciones en polaco), nivel A1. Generados con `infrastructure/content-authoring/es-grammar-a1.mjs`; se muestran en la web (Gramática) y como apéndice del Podręcznik.\n",
);
console.log("wrote", topics.length, "topics");
