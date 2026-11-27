// Writes the Polish A1 grammar reference for Spanish speakers (content/languages/pl/grammar/pl-es-ref-*.json),
// explained in Spanish. Used by the web's grammar section of the pl-es course and printed as the
// textbook's grammar appendix.
//   node infrastructure/content-authoring/pl-es-grammar-a1.mjs
import fs from "node:fs";

const DIR = "content/languages/pl/grammar";
const topics = [];
let order = 1000;
const P = ["ja", "ty", "on / ona / ono", "my", "wy", "oni / one"];
const ex = (text, translation, note) => ({ text, translation, ...(note ? { note } : {}) });
const table = (columns, rows, caption) => ({ ...(caption ? { caption } : {}), columns, rows });
const conj = (verbs, caption) =>
  table(
    ["Persona", ...verbs.map((v) => v[0])],
    P.map((p, i) => [p, ...verbs.map((v) => v[1][i])]),
    caption,
  );
function topic(id, category, title, description, sections) {
  order += 10;
  topics.push({
    schemaVersion: 1,
    id: `pl-es-ref-${id}`,
    languageId: "pl",
    status: "published",
    order,
    category,
    levelId: "a1",
    instructionLanguage: "es",
    title,
    description,
    sections,
  });
}

topic("pronouns-byc", "verbs", "Los pronombres y el verbo być", "Ser y estar en un solo verbo.", [
  {
    text: "Być significa a la vez «ser» y «estar»: Jestem z Hiszpanii (soy de España), jestem w domu (estoy en casa), jestem zmęczony (estoy cansado). Los pronombres personales casi nunca hacen falta, porque la terminación del verbo indica la persona, como en español. Se usan para contrastar: Ja jestem z Madrytu, a ty?",
    table: conj([["być", ["jestem", "jesteś", "jest", "jesteśmy", "jesteście", "są"]]]),
  },
  {
    heading: "Usted: pan, pani, państwo",
    text: "El trato formal se hace con pan (a un hombre), pani (a una mujer) y państwo (a un grupo mixto o a una pareja), con el verbo en tercera persona, como «usted»: Skąd pan jest? (¿de dónde es usted?), Czy pani mówi po angielsku? Oni se usa para grupos con al menos un hombre; one, para grupos sin hombres, y también para cosas y animales.",
    examples: [
      ex("Jestem Javier. Jestem z Hiszpanii.", "Soy Javier. Soy de España."),
      ex("Gdzie pani mieszka?", "¿Dónde vive usted? (a una mujer)"),
      ex("Czy państwo są z Polski?", "¿Son ustedes de Polonia?"),
    ],
  },
]);

topic(
  "present-tense",
  "verbs",
  "El presente: los tres modelos",
  "Cómo se conjugan los verbos regulares.",
  [
    {
      text: "Casi todos los verbos polacos siguen uno de tres modelos en presente. Se reconocen por las formas de ja y ty, que conviene aprender siempre juntas: mieszkam / mieszkasz, mówię / mówisz, pracuję / pracujesz. Una vez conocidas, el resto de personas sale solo.",
      table: conj(
        [
          [
            "mieszkać (-am)",
            ["mieszkam", "mieszkasz", "mieszka", "mieszkamy", "mieszkacie", "mieszkają"],
          ],
          ["mówić (-ę / -isz)", ["mówię", "mówisz", "mówi", "mówimy", "mówicie", "mówią"]],
          [
            "pracować (-uję)",
            ["pracuję", "pracujesz", "pracuje", "pracujemy", "pracujecie", "pracują"],
          ],
        ],
        "Los tres modelos",
      ),
    },
    {
      heading: "Qué verbos siguen cada modelo",
      table: table(
        ["Modelo", "Verbos de la unidad 1–6"],
        [
          [
            "-am, -asz",
            "mieszkać, czytać, mieć (mam), sprzątać, odkurzać, zmywać, oglądać, wracać, biegać",
          ],
          [
            "-ę, -isz / -ysz",
            "mówić, lubić, robić, płacić, kończyć (kończę), uczyć się (uczę się, uczysz się)",
          ],
          [
            "-uję, -ujesz",
            "pracować, gotować, prasować, podróżować, spacerować, kosztować, smakować",
          ],
        ],
      ),
      text: "Los verbos en -ować hacen casi siempre -uję: pracować → pracuję, gotować → gotuję. Los verbos en -ać suelen hacer -am: czytać → czytam. Los verbos en -ić / -yć suelen hacer -ę / -isz: lubić → lubię, lubisz.",
    },
  ],
);

topic(
  "irregular-verbs",
  "verbs",
  "Verbos irregulares frecuentes",
  "Diez verbos que hay que saber de memoria.",
  [
    {
      text: "Estos verbos aparecen en casi todas las conversaciones del nivel A1. Fíjate en que muchos son irregulares solo en ja y oni (chcę, chcą; mogę, mogą) y regulares en el resto.",
      table: conj(
        [
          ["mieć", ["mam", "masz", "ma", "mamy", "macie", "mają"]],
          ["chcieć", ["chcę", "chcesz", "chce", "chcemy", "chcecie", "chcą"]],
          ["móc", ["mogę", "możesz", "może", "możemy", "możecie", "mogą"]],
          ["musieć", ["muszę", "musisz", "musi", "musimy", "musicie", "muszą"]],
          ["wiedzieć", ["wiem", "wiesz", "wie", "wiemy", "wiecie", "wiedzą"]],
        ],
        "Tener, querer, poder, tener que, saber",
      ),
    },
    {
      table: conj(
        [
          ["jeść", ["jem", "jesz", "je", "jemy", "jecie", "jedzą"]],
          ["pić", ["piję", "pijesz", "pije", "pijemy", "pijecie", "piją"]],
          ["iść", ["idę", "idziesz", "idzie", "idziemy", "idziecie", "idą"]],
          ["jechać", ["jadę", "jedziesz", "jedzie", "jedziemy", "jedziecie", "jadą"]],
          ["umieć", ["umiem", "umiesz", "umie", "umiemy", "umiecie", "umieją"]],
        ],
        "Comer, beber, ir a pie, ir en vehículo, saber hacer",
      ),
      examples: [
        ex("Jem zupę i piję kompot.", "Como sopa y bebo compota.", "La sopa se come (jeść)."),
        ex(
          "Idę do pracy pieszo, ale jadę do Krakowa pociągiem.",
          "Voy al trabajo andando, pero voy a Cracovia en tren.",
        ),
        ex(
          "Nie umiem pływać, ale wiem, gdzie jest basen.",
          "No sé nadar, pero sé dónde está la piscina.",
        ),
      ],
    },
  ],
);

topic(
  "reflexive-sie",
  "verbs",
  "Los verbos con się",
  "Despertarse, lavarse, quedar: el pronombre invariable.",
  [
    {
      text: "Muchos verbos llevan się, como los españoles llevan «se»: budzić się (despertarse), myć się (lavarse), spotykać się (quedar, verse), podobać się (gustar). Się no cambia con la persona y no puede abrir la frase: Budzę się o szóstej o O szóstej się budzę, pero nunca Się budzę.",
      table: conj([
        [
          "budzić się",
          ["budzę się", "budzisz się", "budzi się", "budzimy się", "budzicie się", "budzą się"],
        ],
        [
          "myć się",
          ["myję się", "myjesz się", "myje się", "myjemy się", "myjecie się", "myją się"],
        ],
        [
          "kłaść się",
          [
            "kładę się",
            "kładziesz się",
            "kładzie się",
            "kładziemy się",
            "kładziecie się",
            "kładą się",
          ],
        ],
      ]),
    },
    {
      heading: "Con se en español, sin się en polaco (y al revés)",
      examples: [
        ex("Wstaję o siódmej.", "Me levanto a las siete.", "Wstawać no lleva się."),
        ex("Mam na imię Ola.", "Me llamo Ola.", "También: Nazywam się Ola."),
        ex("Uczę się polskiego.", "Aprendo polaco.", "Uczyć się = aprender, estudiar."),
      ],
    },
  ],
);

topic(
  "aspect",
  "verbs",
  "El aspecto: primer contacto",
  "Por qué hay dos verbos para «pagar» o «jugar».",
  [
    {
      text: "Casi todos los verbos polacos tienen pareja: uno imperfectivo, para acciones en curso, repetidas o en general (płacić, grać, robić), y uno perfectivo, para una acción concreta y completa (zapłacić, zagrać, zrobić). En el nivel A1 basta con reconocerlos: el presente de un perfectivo tiene valor de futuro (zapłacę = pagaré), y detrás de chcieć, móc o musieć se oye a menudo el perfectivo para una acción única: Chcemy zapłacić. Mogę zapłacić kartą?",
      table: table(
        ["Imperfectivo (en general, repetido)", "Perfectivo (una vez, completo)", "Español"],
        [
          ["płacić", "zapłacić", "pagar"],
          ["grać", "zagrać", "jugar"],
          ["robić", "zrobić", "hacer"],
          ["kupować", "kupić", "comprar"],
          ["jechać", "pojechać", "ir (en vehículo)"],
          ["pić", "wypić", "beber"],
        ],
      ),
      examples: [
        ex("Zawsze płacę kartą.", "Siempre pago con tarjeta.", "Repetido: imperfectivo."),
        ex("Mogę zapłacić kartą?", "¿Puedo pagar con tarjeta?", "Una vez, ahora: perfectivo."),
      ],
    },
  ],
);

topic(
  "gender",
  "nouns",
  "El género de los sustantivos",
  "Masculino, femenino y neutro por la terminación.",
  [
    {
      text: "Todos los sustantivos tienen género, y casi siempre se reconoce por la última letra. El género decide la forma de los adjetivos, los posesivos y los demostrativos (ten pan, ta pani, to dziecko). No hay artículos: dom es «casa», «la casa» y «una casa».",
      table: table(
        ["Género", "Terminación típica", "Ejemplos"],
        [
          ["masculino", "consonante", "brat, syn, dom, sklep, tramwaj"],
          ["femenino", "-a (y algunos en -i o consonante blanda)", "mama, kawa, ulica, pani, noc"],
          ["neutro", "-o, -e, -ę, -um", "dziecko, piwo, zdjęcie, imię, muzeum"],
        ],
      ),
    },
    {
      heading: "Excepciones que conviene recordar",
      examples: [
        ex(
          "mój tata, mój kolega",
          "mi padre, mi compañero",
          "Hombres terminados en -a: masculinos.",
        ),
        ex("ta noc, ta rzecz", "esta noche, esta cosa", "Femeninos terminados en consonante."),
        ex(
          "rodzice, urodziny, drzwi",
          "los padres, el cumpleaños, la puerta",
          "Solo existen en plural.",
        ),
      ],
    },
  ],
);

topic(
  "cases-overview",
  "nouns",
  "Los casos: para qué sirve cada uno",
  "Las siete terminaciones del sustantivo en el nivel A1.",
  [
    {
      text: "En polaco el sustantivo cambia de terminación según su función en la frase: son los casos. El español lo hace con preposiciones y con el orden de las palabras; el polaco, con terminaciones. En el A1 no hace falta dominarlos: basta con reconocer cada caso y aprender de memoria las expresiones más frecuentes.",
      table: table(
        ["Caso", "Preguntas", "Usos en las unidades 1–6", "Ejemplo"],
        [
          [
            "nominativo",
            "kto? co?",
            "sujeto, forma del diccionario, después de to jest",
            "To jest Kasia.",
          ],
          [
            "genitivo",
            "kogo? czego?",
            "nie ma, nie mam, verbo negativo, do, z (origen), bez, obok, cantidades",
            "Nie mam brata.",
          ],
          ["dativo", "komu? czemu?", "a quién gusta algo: mi, ci, panu", "Smakuje mi zupa."],
          [
            "acusativo",
            "kogo? co?",
            "complemento directo: mam, poproszę, lubię; w + día",
            "Poproszę kawę.",
          ],
          [
            "instrumental",
            "kim? czym?",
            "z (con), jestem + profesión o nacionalidad, transporte",
            "Jadę tramwajem.",
          ],
          [
            "locativo",
            "o kim? o czym?",
            "dónde: w, na, przy; la hora con o",
            "Mieszkam w Krakowie.",
          ],
          ["vocativo", "—", "llamar a alguien", "Kasiu! Panie Marku!"],
        ],
      ),
    },
  ],
);

topic(
  "accusative",
  "nouns",
  "El acusativo singular",
  "Mam, poproszę, lubię, chcę: el complemento directo.",
  [
    {
      text: "El acusativo marca el complemento directo, lo que se tiene, se pide, se quiere o se ve. Es el caso más fácil: solo cambian los femeninos en -a y los masculinos de persona o animal. Lo pide también la preposición w con los días (w środę) y na para la dirección (idę na basen).",
      table: table(
        ["Género", "Nominativo", "Acusativo", "Regla"],
        [
          ["femenino en -a", "kawa, siostra", "kawę, siostrę", "-a → -ę"],
          ["femenino en -i", "pani", "panią", "-i → -ą"],
          ["masculino de persona / animal", "brat, kot, Tomek", "brata, kota, Tomka", "+ -a"],
          ["masculino de cosa", "sok, sernik, dom", "sok, sernik, dom", "no cambia"],
          ["neutro", "piwo, dziecko", "piwo, dziecko", "no cambia"],
        ],
      ),
    },
    {
      heading: "El adjetivo también cambia",
      table: table(
        ["Género", "Ejemplo en acusativo"],
        [
          ["femenino", "Poproszę dużą kawę. (-ą)"],
          ["masculino de persona", "Mam starszego brata. (-ego)"],
          ["masculino de cosa", "Lubię polski ser. (no cambia)"],
          ["neutro", "Poproszę zimne piwo. (no cambia)"],
        ],
      ),
    },
  ],
);

topic("genitive", "nouns", "El genitivo singular", "No hay, no tengo, de, sin, al lado de…", [
  {
    text: "El genitivo es el caso más frecuente después del nominativo. Lo piden: nie ma (no hay) y cualquier verbo en negativo (nie mam brata, nie lubię kawy, nie jem mięsa); las preposiciones do, od, z (procedencia), bez, obok, naprzeciwko, koło, u y dla; las cantidades (kawałek sernika, butelka wody); y la posesión (brat mamy, el hermano de mamá).",
    table: table(
      ["Género", "Nominativo", "Genitivo", "Regla"],
      [
        ["femenino", "kawa, poczta, siostra", "kawy, poczty, siostry", "-a → -y"],
        [
          "femenino tras k, g, l, j o blanda",
          "apteka, córka, piekarnia, ulica",
          "apteki, córki, piekarni, ulicy",
          "-a → -i (-y tras c)",
        ],
        [
          "masculino (personas, animales y muchas cosas)",
          "brat, kot, szpital, kościół",
          "brata, kota, szpitala, kościoła",
          "+ -a",
        ],
        [
          "masculino (muchas cosas)",
          "bank, sklep, park, czas",
          "banku, sklepu, parku, czasu",
          "+ -u",
        ],
        ["neutro", "kino, mięso, dziecko", "kina, mięsa, dziecka", "-o / -e → -a"],
        ["adjetivos", "duży / duża", "dużego / dużej", "-ego (m, n) / -ej (f)"],
      ],
    ),
  },
  {
    examples: [
      ex("W okolicy nie ma apteki.", "En la zona no hay farmacia."),
      ex("Jestem z Polski, z Krakowa.", "Soy de Polonia, de Cracovia."),
      ex("Idę do banku, a potem do apteki.", "Voy al banco y luego a la farmacia."),
      ex("Kawa bez cukru, poproszę.", "Un café sin azúcar, por favor."),
    ],
  },
]);

topic("locative", "nouns", "El locativo singular", "Dónde: w, na, przy y la hora con o.", [
  {
    text: "El locativo solo aparece detrás de preposiciones: w y na para decir dónde está algo, przy (junto a), po (después de) y o (la hora: o ósmej; hablar de algo). La terminación más frecuente es -e, que suele cambiar la consonante anterior (sklep → sklepie, Kraków → Krakowie, apteka → aptece). Detrás de k, g, ch y de consonantes blandas se usa -u o -i.",
    table: table(
      ["Nominativo", "Locativo", "Nominativo", "Locativo"],
      [
        ["sklep", "w sklepie", "apteka", "w aptece"],
        ["Kraków", "w Krakowie", "Warszawa", "w Warszawie"],
        ["kino", "w kinie", "poczta", "na poczcie"],
        ["bank", "w banku", "kawiarnia", "w kawiarni"],
        ["rynek", "na rynku", "ulica", "na ulicy"],
        ["dworzec", "na dworcu", "restauracja", "w restauracji"],
        ["dom", "w domu", "siostra", "o siostrze"],
      ],
    ),
  },
  {
    heading: "¿W o na?",
    text: "W es «dentro de»; na, «sobre» o en lugares abiertos, eventos y algunos edificios que hay que memorizar: na ulicy, na rynku, na placu, na dworcu, na przystanku, na poczcie, na uniwersytecie, na basenie, na koncercie. Los adjetivos en locativo terminan en -ym / -im (m, n) y -ej (f): w małym sklepie, na ulicy Długiej.",
  },
]);

topic(
  "instrumental",
  "nouns",
  "El instrumental singular",
  "Con quién, con qué, en qué medio y qué eres.",
  [
    {
      text: "El instrumental responde a «¿con quién?» y «¿con qué?» (z bratem, kawa z mlekiem), al medio de transporte sin preposición (jadę tramwajem) y a lo que alguien es, detrás de być (jestem Hiszpanem, jest lekarką). Lo piden también przed (delante de) y za (detrás de) cuando indican lugar.",
      table: table(
        ["Género", "Nominativo", "Instrumental", "Regla"],
        [
          ["masculino y neutro", "brat, autobus, metro", "bratem, autobusem, metrem", "+ -em"],
          ["tras k, g", "Polak, pociąg, mleko", "Polakiem, pociągiem, mlekiem", "+ -iem"],
          ["femenino", "siostra, kawa, taksówka", "siostrą, kawą, taksówką", "-a → -ą"],
          ["adjetivos", "dobry / dobra", "dobrym / dobrą", "-ym (m, n) / -ą (f)"],
        ],
      ),
      examples: [
        ex("Jestem Hiszpanką, a mój mąż jest Polakiem.", "Soy española y mi marido es polaco."),
        ex("Herbata z cytryną i kawa z mlekiem.", "Té con limón y café con leche."),
        ex("Spotykamy się przed kinem.", "Quedamos delante del cine."),
      ],
    },
  ],
);

topic(
  "adjectives",
  "adjectives",
  "Los adjetivos: concordancia",
  "Terminaciones del adjetivo en los casos del A1.",
  [
    {
      text: "El adjetivo concuerda en género, número y caso con el sustantivo. En el diccionario aparece en masculino (-y o -i tras k, g). Puede ir delante del sustantivo, como lo más neutro en polaco (mała córka, polska kuchnia), o detrás de być (Mój brat jest wysoki).",
      table: table(
        ["Caso", "Masculino", "Femenino", "Neutro"],
        [
          ["nominativo", "duży, wysoki", "duża, wysoka", "duże, wysokie"],
          ["genitivo", "dużego", "dużej", "dużego"],
          ["acusativo", "duży (cosa) / dużego (persona)", "dużą", "duże"],
          ["instrumental", "dużym", "dużą", "dużym"],
          ["locativo", "dużym", "dużej", "dużym"],
        ],
      ),
    },
    {
      heading: "Plural de personas masculinas",
      text: "En plural, los grupos con al menos un hombre tienen su propia forma: moi rodzice, nasi koledzy, ci panowie. Para el resto se usa la forma en -e: moje siostry, duże miasta. En el A1 basta con reconocerla en moi rodzice y Polacy.",
    },
  ],
);

topic(
  "possessives",
  "pronouns",
  "Posesivos y demostrativos",
  "Mój, twój, jego, jej; ten, ta, to.",
  [
    {
      text: "Mój, twój, nasz y wasz concuerdan con lo que se posee, como los adjetivos. Jego (de él), jej (de ella) e ich (de ellos) no cambian nunca y dependen del poseedor: el «su» español queda claro en polaco.",
      table: table(
        ["Persona", "Masculino", "Femenino", "Neutro", "Plural (personas masc.)", "Plural (resto)"],
        [
          ["mi", "mój", "moja", "moje", "moi", "moje"],
          ["tu", "twój", "twoja", "twoje", "twoi", "twoje"],
          ["nuestro", "nasz", "nasza", "nasze", "nasi", "nasze"],
          ["vuestro", "wasz", "wasza", "wasze", "wasi", "wasze"],
          [
            "su (de él / ella / ellos)",
            "jego / jej / ich",
            "jego / jej / ich",
            "jego / jej / ich",
            "jego / jej / ich",
            "jego / jej / ich",
          ],
        ],
      ),
    },
    {
      heading: "Este, esta, esto",
      table: table(
        ["Masculino", "Femenino", "Neutro", "Plural"],
        [["ten pan", "ta pani", "to dziecko", "te zdjęcia / ci panowie"]],
      ),
      examples: [
        ex("To jest mój brat, a to jego żona.", "Este es mi hermano, y esta, su mujer."),
        ex("Kasia i jej brat mieszkają w Krakowie.", "Kasia y su hermano viven en Cracovia."),
      ],
    },
  ],
);

topic(
  "dative-likes",
  "pronouns",
  "Gustos: lubić, podobać się, smakować",
  "Tres maneras de decir «me gusta».",
  [
    {
      text: "Lubić es un verbo normal (el sujeto es quien gusta) y pide acusativo o infinitivo: lubię jazz, lubię gotować. Podobać się (impresión, aspecto) y smakować (sabor de la comida) funcionan como «gustar»: lo que gusta es el sujeto y la persona va en dativo.",
      table: table(
        ["Persona", "Dativo", "Ejemplo"],
        [
          ["ja", "mi (mnie)", "Podoba mi się Kraków."],
          ["ty", "ci (tobie)", "Smakuje ci zupa?"],
          ["on", "mu (jemu)", "Podobają mu się zdjęcia."],
          ["ona", "jej", "Smakują jej pierogi."],
          ["my / wy / oni", "nam / wam / im", "Podoba nam się to miasto."],
          ["pan / pani / państwo", "panu / pani / państwu", "Smakuje państwu?"],
        ],
      ),
    },
    {
      examples: [
        ex("Lubię koty.", "Me gustan los gatos.", "Lubić no cambia con el plural de lo que gusta."),
        ex("Nie lubię piłki nożnej.", "No me gusta el fútbol.", "Negación + genitivo."),
        ex("Te zdjęcia bardzo mi się podobają.", "Me gustan mucho estas fotos."),
      ],
    },
  ],
);

topic("negation", "adverbs", "La negación", "Nie, nigdy nie, nikt, nic y el genitivo.", [
  {
    text: "Nie va delante del verbo, como «no»: nie mówię po angielsku. Con nigdy (nunca), nikt (nadie) y nic (nada) el verbo lleva también nie: la doble negación es obligatoria. Y si el verbo negativo tiene complemento directo, este pasa al genitivo.",
    table: table(
      ["Afirmativo", "Negativo"],
      [
        ["Mam brata.", "Nie mam brata."],
        ["Lubię kawę.", "Nie lubię kawy."],
        ["Jem mięso.", "Nie jem mięsa."],
        ["Jest tu bank.", "Nie ma tu banku."],
        ["Zawsze jem śniadanie.", "Nigdy nie jem śniadania."],
        ["Ktoś dzwoni.", "Nikt nie dzwoni."],
      ],
    ),
  },
]);

topic("questions", "adverbs", "Las preguntas", "Czy y las palabras interrogativas.", [
  {
    text: "Las preguntas de sí o no empiezan a menudo por czy, que no se traduce, y suben al final. Las preguntas con palabra interrogativa la ponen al principio y bajan al final. El orden del resto de la frase no cambia.",
    table: table(
      ["Polaco", "Español", "Ejemplo"],
      [
        ["czy", "(pregunta de sí o no)", "Czy mówisz po polsku?"],
        ["kto? / co?", "¿quién? / ¿qué?", "Kto to jest? Co to jest?"],
        ["gdzie?", "¿dónde?", "Gdzie jest apteka?"],
        ["dokąd?", "¿adónde?", "Dokąd idziesz?"],
        ["skąd?", "¿de dónde?", "Skąd jesteś?"],
        ["kiedy?", "¿cuándo?", "Kiedy masz urodziny?"],
        ["o której?", "¿a qué hora?", "O której się spotykamy?"],
        ["ile?", "¿cuánto? ¿cuántos?", "Ile kosztuje? Ile masz lat?"],
        ["jak?", "¿cómo?", "Jak masz na imię?"],
        ["który? / jaki?", "¿cuál? / ¿qué tipo de?", "Który tramwaj? Jaki masz rozmiar?"],
        ["dlaczego?", "¿por qué?", "Dlaczego tak wcześnie?"],
      ],
    ),
  },
]);

topic(
  "numbers",
  "numbers",
  "Los números y lo que va detrás",
  "Cardinales, rok / lata / lat, złoty / złote / złotych.",
  [
    {
      table: table(
        ["Nº", "Polaco", "Nº", "Polaco", "Nº", "Polaco"],
        [
          ["1", "jeden", "11", "jedenaście", "20", "dwadzieścia"],
          ["2", "dwa (dwie)", "12", "dwanaście", "30", "trzydzieści"],
          ["3", "trzy", "13", "trzynaście", "40", "czterdzieści"],
          ["4", "cztery", "14", "czternaście", "50", "pięćdziesiąt"],
          ["5", "pięć", "15", "piętnaście", "60", "sześćdziesiąt"],
          ["6", "sześć", "16", "szesnaście", "70", "siedemdziesiąt"],
          ["7", "siedem", "17", "siedemnaście", "80", "osiemdziesiąt"],
          ["8", "osiem", "18", "osiemnaście", "90", "dziewięćdziesiąt"],
          ["9", "dziewięć", "19", "dziewiętnaście", "100", "sto"],
          ["10", "dziesięć", "200", "dwieście", "1000", "tysiąc"],
        ],
      ),
    },
    {
      heading: "El sustantivo después del número",
      text: "Con 1 va en singular (jeden rok, jeden złoty). Con 2, 3 y 4, y con los números terminados en 2, 3, 4 (salvo 12, 13, 14), en nominativo plural (dwa lata, trzy złote, dwadzieścia dwa lata). Con todos los demás, en genitivo plural (pięć lat, dwanaście złotych, dwadzieścia jeden lat). Con sustantivos femeninos, «dos» es dwie: dwie kawy, dwie siostry.",
      table: table(
        ["Número", "Años", "Dinero", "Café (f)"],
        [
          ["1", "rok", "złoty", "kawa"],
          ["2, 3, 4, 22…", "lata", "złote", "kawy (dwie kawy)"],
          ["5–21, 25…", "lat", "złotych", "kaw"],
        ],
      ),
    },
  ],
);

topic("time-dates", "numbers", "La hora y las fechas", "Ordinales para la hora y el día del mes.", [
  {
    text: "La hora se dice con ordinales en femenino (godzina es femenino) y la fecha con ordinales en masculino (dzień). Para «a las…» se usa o + locativo; para «el día…», el genitivo sin preposición. El mes va en genitivo.",
    table: table(
      ["Nº", "Es la… (hora)", "A la… (o + locativo)", "Hoy es… (fecha)", "El día… (genitivo)"],
      [
        ["1", "pierwsza", "o pierwszej", "pierwszy maja", "pierwszego maja"],
        ["2", "druga", "o drugiej", "drugi maja", "drugiego maja"],
        ["3", "trzecia", "o trzeciej", "trzeci maja", "trzeciego maja"],
        ["5", "piąta", "o piątej", "piąty maja", "piątego maja"],
        ["8", "ósma", "o ósmej", "ósmy maja", "ósmego maja"],
        ["12", "dwunasta", "o dwunastej", "dwunasty maja", "dwunastego maja"],
        ["20", "dwudziesta", "o dwudziestej", "dwudziesty maja", "dwudziestego maja"],
      ],
    ),
  },
  {
    heading: "Fórmulas de la hora",
    examples: [
      ex("ósma piętnaście / kwadrans po ósmej", "las ocho y cuarto"),
      ex(
        "ósma trzydzieści / wpół do dziewiątej",
        "las ocho y media",
        "Wpół do mira a la hora siguiente.",
      ),
      ex("ósma czterdzieści pięć / za kwadrans dziewiąta", "las nueve menos cuarto"),
      ex("Mam urodziny dwudziestego marca.", "Mi cumpleaños es el veinte de marzo."),
    ],
  },
]);

topic(
  "prepositions",
  "prepositions",
  "Las preposiciones y su caso",
  "Cada preposición pide un caso.",
  [
    {
      text: "En polaco la preposición decide el caso del sustantivo. Algunas piden dos casos con significados distintos: w + locativo (dónde) y w + acusativo (días); z + genitivo (de dónde) y z + instrumental (con).",
      table: table(
        ["Preposición", "Caso", "Significado", "Ejemplo"],
        [
          ["w / we", "locativo", "en, dentro de", "w Krakowie, we Wrocławiu"],
          ["w", "acusativo", "días de la semana", "w środę, we wtorek"],
          ["na", "locativo", "en, sobre (lugares abiertos, eventos)", "na poczcie, na rynku"],
          ["na", "acusativo", "a (dirección, actividades)", "idę na basen, na mecz"],
          ["do", "genitivo", "a, hasta (dirección)", "do banku, do Krakowa"],
          ["z / ze", "genitivo", "de (procedencia)", "z Hiszpanii, ze Stanów"],
          ["z / ze", "instrumental", "con", "z mlekiem, z bratem"],
          ["bez", "genitivo", "sin", "bez cukru"],
          ["obok, koło, naprzeciwko", "genitivo", "al lado de, junto a, enfrente de", "obok parku"],
          ["u", "genitivo", "en casa de", "u babci"],
          ["dla", "genitivo", "para", "dla mnie"],
          ["od … do …", "genitivo", "desde … hasta …", "od poniedziałku do piątku"],
          ["przy", "locativo", "junto a", "przy przystanku"],
          ["po", "locativo", "después de", "po obiedzie"],
          ["o", "locativo", "a (la hora)", "o ósmej"],
          ["przed, za", "instrumental", "delante de, detrás de", "przed kinem, za kościołem"],
        ],
      ),
    },
  ],
);

topic(
  "word-formation",
  "word-formation",
  "Diminutivos, apellidos y nacionalidades",
  "Cómo se forman algunas palabras.",
  [
    {
      heading: "Diminutivos de nombres",
      text: "Entre familia, amigos y compañeros se usan casi siempre los diminutivos. Al llamar a alguien se usa además el vocativo: Kasia → Kasiu!, Tomek → Tomku!, Piotr → Piotrze!",
      table: table(
        ["Nombre", "Diminutivo", "Nombre", "Diminutivo"],
        [
          ["Katarzyna", "Kasia", "Piotr", "Piotrek"],
          ["Zofia", "Zosia", "Tomasz", "Tomek"],
          ["Aleksandra", "Ola", "Krzysztof", "Krzysiek"],
          ["Małgorzata", "Gosia", "Jakub", "Kuba"],
        ],
      ),
    },
    {
      heading: "Sufijos útiles",
      table: table(
        ["Sufijo", "Valor", "Ejemplos"],
        [
          ["-ek, -ka, -ko", "diminutivo de cosas", "kot → kotek, kawa → kawka, piwo → piwko"],
          [
            "-ski / -ska, -cki / -cka",
            "apellidos que concuerdan",
            "Kowalski / Kowalska, Nowicki / Nowicka",
          ],
          ["-arnia", "tienda, lugar", "piekarnia, kawiarnia, księgarnia"],
          [
            "-ak, -anin / -anka, -czyk / -ka",
            "nacionalidades",
            "Polak / Polka, Meksykanin / Meksykanka, Argentyńczyk / Argentynka",
          ],
          ["po … -sku / -cku", "idiomas (adverbio)", "po polsku, po hiszpańsku, po niemiecku"],
        ],
      ),
    },
  ],
);

for (const t of topics) fs.writeFileSync(`${DIR}/${t.id}.json`, `${JSON.stringify(t, null, 2)}\n`);
console.log("wrote", topics.length, "topics");
