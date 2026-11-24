/**
 * The public listening test (Verbysia, phase D): four everyday situations written for Verbysia,
 * spoken in Spanish, with ten questions each in Polish (the learners' language). This is course
 * content, not interface text, so it is not in the i18n catalogs. `audioUrl` points at the
 * recording generated offline with Piper (infrastructure/tts); the browser's Spanish speech
 * synthesis is only a fallback when a recording is missing.
 */
export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface ListeningQuestion {
  prompt: string;
  options: readonly string[];
  correct: number;
}

export interface ListeningSituation {
  id: string;
  title: string;
  audioUrl?: string;
  lines: readonly DialogueLine[];
  questions: readonly ListeningQuestion[];
}

/** The language the conversations are spoken in. */
export const LISTENING_LOCALE = "es-ES";

export const LISTENING_TEST: readonly ListeningSituation[] = [
  {
    id: "airport",
    audioUrl: "/audio/listening/airport.mp3",
    title: "Na lotnisku",
    lines: [
      { speaker: "Empleada", text: "Buenos días. ¿Su pasaporte, por favor?" },
      { speaker: "Pasajero", text: "Aquí tiene. Voy a Valencia." },
      { speaker: "Empleada", text: "Muy bien. ¿Cuántas maletas lleva?" },
      { speaker: "Pasajero", text: "Una maleta y una mochila pequeña." },
      {
        speaker: "Empleada",
        text: "La mochila puede ir con usted en el avión. ¿Prefiere ventana o pasillo?",
      },
      { speaker: "Pasajero", text: "Ventana, por favor." },
      {
        speaker: "Empleada",
        text: "Su asiento es el doce A. El embarque es a las once y cuarto, en la puerta veintidós.",
      },
      { speaker: "Pasajero", text: "¿El vuelo sale a la hora?" },
      { speaker: "Empleada", text: "Sí, sale a las doce menos cuarto. ¡Buen viaje!" },
    ],
    questions: [
      {
        prompt: "Dokąd leci pasażer?",
        options: ["Do Madrytu", "Do Walencji", "Do Sewilli"],
        correct: 1,
      },
      {
        prompt: "O co pracownica prosi na początku?",
        options: ["O paszport", "O bilet", "O kartę pokładową"],
        correct: 0,
      },
      { prompt: "Ile walizek nadaje pasażer?", options: ["Żadnej", "Jedną", "Dwie"], correct: 1 },
      {
        prompt: "Co pasażer może zabrać ze sobą do samolotu?",
        options: ["Walizkę", "Mały plecak", "Nic"],
        correct: 1,
      },
      {
        prompt: "Jakie miejsce wybiera?",
        options: ["Przy oknie", "Przy przejściu", "W środku rzędu"],
        correct: 0,
      },
      { prompt: "Jaki ma numer miejsca?", options: ["2A", "12A", "20A"], correct: 1 },
      {
        prompt: "O której zaczyna się wejście na pokład?",
        options: ["O 11:15", "O 11:45", "O 12:15"],
        correct: 0,
      },
      { prompt: "Przy której bramce?", options: ["2", "12", "22"], correct: 2 },
      {
        prompt: "Czy lot jest opóźniony?",
        options: ["Nie, odlatuje o czasie", "Tak, o godzinę", "Jest odwołany"],
        correct: 0,
      },
      {
        prompt: "O której odlatuje samolot?",
        options: ["O 11:15", "O 11:45", "O 12:45"],
        correct: 1,
      },
    ],
  },
  {
    id: "cafe",
    audioUrl: "/audio/listening/cafe.mp3",
    title: "W kawiarni",
    lines: [
      { speaker: "Camarero", text: "Hola, buenos días. ¿Qué le pongo?" },
      { speaker: "Clienta", text: "Un café con leche y una tostada con tomate, por favor." },
      { speaker: "Camarero", text: "¿El café grande o pequeño?" },
      { speaker: "Clienta", text: "Pequeño. Y también un zumo de naranja." },
      { speaker: "Camarero", text: "Muy bien. ¿Para tomar aquí o para llevar?" },
      { speaker: "Clienta", text: "Para tomar aquí, en la terraza." },
      { speaker: "Camarero", text: "Perfecto. Ahora se lo llevo." },
      { speaker: "Clienta", text: "Perdone, ¿me cobra, por favor?" },
      { speaker: "Camarero", text: "Sí, son cinco euros con veinte." },
      { speaker: "Clienta", text: "¿Puedo pagar con tarjeta?" },
      { speaker: "Camarero", text: "Claro que sí." },
    ],
    questions: [
      {
        prompt: "Co zamawia do picia na początku?",
        options: ["Kawę z mlekiem", "Herbatę", "Czarną kawę"],
        correct: 0,
      },
      {
        prompt: "Co zamawia do jedzenia?",
        options: ["Kanapkę z serem", "Grzankę z pomidorem", "Ciastko"],
        correct: 1,
      },
      { prompt: "Jaką kawę wybiera?", options: ["Dużą", "Małą", "Bez mleka"], correct: 1 },
      {
        prompt: "Jaki sok zamawia?",
        options: ["Jabłkowy", "Pomarańczowy", "Pomidorowy"],
        correct: 1,
      },
      { prompt: "Gdzie będzie jeść?", options: ["Na wynos", "Na miejscu", "W domu"], correct: 1 },
      {
        prompt: "Gdzie siada?",
        options: ["Przy barze", "Na tarasie", "W środku przy oknie"],
        correct: 1,
      },
      { prompt: "Ile płaci?", options: ["2,50 €", "5,20 €", "15,20 €"], correct: 1 },
      { prompt: "Jak płaci?", options: ["Gotówką", "Kartą", "Telefonem"], correct: 1 },
      {
        prompt: "Co znaczy „¿me cobra?”?",
        options: [
          "„Poproszę o rachunek / chcę zapłacić”",
          "„Ile to kosztuje?”",
          "„Czy jest wolne miejsce?”",
        ],
        correct: 0,
      },
      {
        prompt: "Kto mówi „¿Qué le pongo?”?",
        options: ["Klientka", "Kelner", "Kucharz"],
        correct: 1,
      },
    ],
  },
  {
    id: "restaurant",
    audioUrl: "/audio/listening/restaurant.mp3",
    title: "W restauracji",
    lines: [
      { speaker: "Camarera", text: "Buenas noches. ¿Tienen reserva?" },
      { speaker: "Cliente", text: "Sí, a nombre de Nowak, para dos personas." },
      { speaker: "Camarera", text: "Por aquí, por favor. Aquí tienen la carta." },
      { speaker: "Cliente", text: "Gracias. ¿Qué nos recomienda?" },
      {
        speaker: "Camarera",
        text: "Hoy la paella de marisco está muy buena. Es para dos personas.",
      },
      {
        speaker: "Cliente",
        text: "Perfecto, una paella para los dos. Y para beber, una botella de agua y dos copas de vino tinto.",
      },
      { speaker: "Camarera", text: "¿Quieren algo de primero?" },
      { speaker: "Cliente", text: "Sí, una ensalada mixta para compartir." },
      { speaker: "Camarera", text: "Muy bien. ¿Y de postre?" },
      { speaker: "Cliente", text: "Después lo vemos, gracias." },
    ],
    questions: [
      {
        prompt: "Na jakie nazwisko jest rezerwacja?",
        options: ["Kowalski", "Nowak", "Wiśniewski"],
        correct: 1,
      },
      { prompt: "Dla ilu osób?", options: ["Dla jednej", "Dla dwóch", "Dla czterech"], correct: 1 },
      {
        prompt: "O jakiej porze dnia toczy się rozmowa?",
        options: ["Rano", "Po południu", "Wieczorem"],
        correct: 2,
      },
      {
        prompt: "Co poleca kelnerka?",
        options: ["Paellę z owocami morza", "Rybę z grilla", "Zupę dnia"],
        correct: 0,
      },
      {
        prompt: "Dla ilu osób jest paella?",
        options: ["Dla jednej", "Dla dwóch", "Dla trzech"],
        correct: 1,
      },
      {
        prompt: "Co zamawiają do picia?",
        options: ["Wodę i dwa kieliszki czerwonego wina", "Dwa piwa", "Wodę i białe wino"],
        correct: 0,
      },
      {
        prompt: "Co zamawiają na przystawkę?",
        options: ["Zupę", "Sałatkę mieszaną", "Ser"],
        correct: 1,
      },
      {
        prompt: "Co znaczy „para compartir”?",
        options: ["Na wynos", "Do podzielenia się", "Bez sosu"],
        correct: 1,
      },
      {
        prompt: "Co z deserem?",
        options: ["Zamawiają lody", "Zdecydują później", "Nie chcą deseru"],
        correct: 1,
      },
      {
        prompt: "Co to jest „la carta”?",
        options: ["Rachunek", "Karta dań", "Karta płatnicza"],
        correct: 1,
      },
    ],
  },
  {
    id: "clothes-shop",
    audioUrl: "/audio/listening/clothes-shop.mp3",
    title: "W sklepie z odzieżą",
    lines: [
      { speaker: "Dependienta", text: "Hola, ¿le puedo ayudar?" },
      { speaker: "Cliente", text: "Sí, busco una camiseta para mí." },
      { speaker: "Dependienta", text: "¿Qué talla usa?" },
      { speaker: "Cliente", text: "Normalmente la M." },
      { speaker: "Dependienta", text: "Tenemos estas en azul, blanco y negro." },
      { speaker: "Cliente", text: "¿Me puedo probar la azul?" },
      { speaker: "Dependienta", text: "Claro, los probadores están al fondo, a la derecha." },
      { speaker: "Cliente", text: "Me queda un poco pequeña. ¿Tiene una L?" },
      { speaker: "Dependienta", text: "En azul no, solo en negro." },
      { speaker: "Cliente", text: "Vale, me llevo la negra en L. ¿Cuánto cuesta?" },
      {
        speaker: "Dependienta",
        text: "Quince euros. Si compra dos, la segunda es a mitad de precio.",
      },
      { speaker: "Cliente", text: "No, gracias, solo una." },
    ],
    questions: [
      { prompt: "Czego szuka klient?", options: ["Spodni", "Koszulki", "Kurtki"], correct: 1 },
      { prompt: "Jaki rozmiar zwykle nosi?", options: ["S", "M", "L"], correct: 1 },
      {
        prompt: "W jakich kolorach są koszulki?",
        options: ["Niebieskim, białym i czarnym", "Czerwonym i białym", "Tylko w czarnym"],
        correct: 0,
      },
      {
        prompt: "Którą koszulkę przymierza najpierw?",
        options: ["Białą", "Niebieską", "Czarną"],
        correct: 1,
      },
      {
        prompt: "Gdzie są przymierzalnie?",
        options: ["Przy wejściu", "Na końcu, po prawej", "Na piętrze"],
        correct: 1,
      },
      {
        prompt: "Jaki ma problem z koszulką?",
        options: ["Jest za duża", "Jest trochę za mała", "Ma zły kolor"],
        correct: 1,
      },
      {
        prompt: "W jakim kolorze jest rozmiar L?",
        options: ["W niebieskim", "W białym", "W czarnym"],
        correct: 2,
      },
      {
        prompt: "Co w końcu kupuje?",
        options: ["Niebieską M", "Czarną L", "Dwie koszulki"],
        correct: 1,
      },
      { prompt: "Ile kosztuje koszulka?", options: ["5 €", "15 €", "50 €"], correct: 1 },
      {
        prompt: "Jaką promocję proponuje sprzedawczyni?",
        options: ["Druga koszulka za pół ceny", "Darmowa torba", "10% rabatu"],
        correct: 0,
      },
    ],
  },
];

/** Approximate result band — orientation only, never a CEFR certificate. */
export function bandFor(ratio: number): "start" | "a1" | "a1plus" {
  if (ratio >= 0.8) return "a1plus";
  if (ratio >= 0.5) return "a1";
  return "start";
}
