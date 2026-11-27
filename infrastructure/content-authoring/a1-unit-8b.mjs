// Spanish for Polish speakers — A1 unit 8B (¿Qué estás haciendo?) exercises.
//   node infrastructure/content-authoring/a1-unit-8b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const b = kit(8, "es-unit-8-moving-in", 300);
// PERCIBIR
b.mc(
  "es-u8b-listen-marek",
  "perceive",
  "Dialog: co robi Marek, gdy dzwoni Lucía?",
  "Estoy montando una estantería.",
  ["Skręca regał.", "Maluje salon.", "Gotuje tortillę."],
);
b.mc(
  "es-u8b-listen-pablo",
  "perceive",
  "Dialog: co robi Pablo?",
  "Está en la cocina. Está haciendo una tortilla.",
  ["Robi tortillę w kuchni.", "Śpi w sypialni.", "Ogląda telewizję."],
);
b.tf(
  "es-u8b-listen-wardrobe",
  "perceive",
  "Dialog: szafa Marka jest już pełna.",
  "El armario todavía está vacío.",
  false,
);
b.mc(
  "es-u8b-listen-job",
  "perceive",
  "Dialog: kim z zawodu jest Pablo?",
  "Es de Granada y es enfermero.",
  ["Pielęgniarzem.", "Nauczycielem.", "Kucharzem."],
);
b.mc(
  "es-u8b-listen-saturday",
  "perceive",
  "Dialog: co będą robić w sobotę?",
  "El sábado pintamos el salón. ¡Trae ropa vieja!",
  ["Malować salon.", "Kupować meble.", "Robić parapetówkę."],
);
// CONECTAR
b.match(
  "es-u8b-match-moving",
  "connect",
  "Połącz słowa z tłumaczeniem.",
  "La mudanza = przeprowadzka; la caja = karton; montar = składać.",
  [
    ["la mudanza", "przeprowadzka"],
    ["la caja", "karton"],
    ["montar", "składać, montować"],
    ["pintar", "malować"],
    ["colgar", "wieszać"],
    ["el compañero de piso", "współlokator"],
  ],
);
b.match(
  "es-u8b-match-opposites",
  "connect",
  "Połącz przeciwieństwa.",
  "Lleno ↔ vacío; limpio ↔ sucio; abierto ↔ cerrado.",
  [
    ["lleno", "vacío"],
    ["limpio", "sucio"],
    ["abierto", "cerrado"],
    ["ordenado", "desordenado"],
  ],
);
b.mc("es-u8b-mudarse", "connect", "Co znaczy mudarse?", "Mudarse = przeprowadzać się.", [
  "Przeprowadzać się.",
  "Malować.",
  "Zmywać.",
]);
// ESTRUCTURAR
b.gap(
  "es-u8b-gap-gerund",
  "structure",
  "Uzupełnij estar + gerundio.",
  "-ar → -ando; -er / -ir → -iendo.",
  "Yo estoy ___ (pintar), tú estás ___ (comer) y ellos están ___ (escribir).",
  [["pintando"], ["comiendo"], ["escribiendo"]],
);
b.match(
  "es-u8b-match-irregular",
  "structure",
  "Połącz bezokolicznik z nieregularnym gerundio.",
  "Leer → leyendo; dormir → durmiendo; pedir → pidiendo; decir → diciendo.",
  [
    ["leer", "leyendo"],
    ["dormir", "durmiendo"],
    ["pedir", "pidiendo"],
    ["decir", "diciendo"],
  ],
);
b.gap(
  "es-u8b-gap-estar",
  "structure",
  "Uzupełnij formą estar.",
  "Yo estoy, nosotros estamos, ellas están.",
  "Yo ___ cocinando, nosotros ___ ordenando y las chicas ___ durmiendo.",
  [["estoy"], ["estamos"], ["están"]],
);
b.mc(
  "es-u8b-habit",
  "structure",
  "Które zdanie jest poprawne (zwyczaj)?",
  "Zwyczaj: zwykły czas teraźniejszy.",
  [
    "Normalmente ceno a las nueve.",
    "Normalmente estoy cenando a las nueve.",
    "Normalmente estoy cenar a las nueve.",
  ],
);
b.gap(
  "es-u8b-gap-ser-estar",
  "structure",
  "Uzupełnij ser albo estar (es / está).",
  "Pochodzenie i zawód: ser; położenie i stan: estar.",
  "Pablo ___ de Granada, ___ enfermero y ahora ___ en la cocina. Hoy ___ cansado.",
  [["es"], ["es"], ["está"], ["está"]],
);
b.mc("es-u8b-cansado", "structure", "Jak powiesz „Jestem zmęczona”?", "Samopoczucie: estar.", [
  "Estoy cansada.",
  "Soy cansada.",
  "Tengo cansada.",
]);
b.mc("es-u8b-location", "structure", "Uzupełnij: El piso ___ en el centro.", "Położenie: estar.", [
  "está",
  "es",
  "hay",
]);
b.mc(
  "es-u8b-fiesta",
  "structure",
  "Uzupełnij: La fiesta ___ en mi casa.",
  "Wydarzenia „odbywają się” z ser.",
  ["es", "está", "hay"],
);
b.mc(
  "es-u8b-rica",
  "structure",
  "Chcesz pochwalić smak tortilli, którą jesz. Co mówisz?",
  "Smak teraz: estar rico.",
  ["¡Está muy rica!", "¡Es muy rica!", "¡Hay muy rica!"],
);
b.match(
  "es-u8b-match-meaning",
  "structure",
  "Połącz wyrażenie ze znaczeniem.",
  "Ser listo = bystry; estar listo = gotowy; estar aburrido = nudzić się.",
  [
    ["ser listo", "być bystrym"],
    ["estar listo", "być gotowym"],
    ["ser aburrido", "być nudnym"],
    ["estar aburrido", "nudzić się"],
  ],
);
b.order("es-u8b-order-doing", "structure", "Ułóż: Co teraz robisz?", "¿Qué estás haciendo ahora?", [
  "¿Qué",
  "estás",
  "haciendo",
  "ahora?",
]);
b.order(
  "es-u8b-order-room",
  "structure",
  "Ułóż: Salon jest mały, ale teraz jest w bałaganie.",
  "Ser (cecha) + estar (stan).",
  ["El", "salón", "es", "pequeño,", "pero", "ahora", "está", "desordenado."],
);
// SONAR
b.mc(
  "es-u8b-sound-que",
  "sound",
  "Jak poprawnie zapisać wykrzyknienie?",
  "Dwa wykrzykniki i akcent na qué.",
  ["¡Qué bonito!", "Que bonito!", "¡Que bonito!"],
);
b.tf(
  "es-u8b-sound-intonation",
  "sound",
  "W ¡Qué suerte! głos wznosi się na suerte i opada na końcu.",
  "Tak: wykrzyknienia mają mocny wznoszący akcent na słowie po qué.",
  true,
);
b.mc(
  "es-u8b-sound-tan",
  "sound",
  "Uzupełnij: ¡Qué piso ___ luminoso!",
  "¡Qué + rzeczownik + tan + przymiotnik!",
  ["tan", "muy", "más"],
);
// CULTURA
b.mc(
  "es-u8b-reading-where",
  "culture",
  "Lectura: gdzie wieszają zasady?",
  "Las cuelgan en la puerta de la nevera.",
  ["Na drzwiach lodówki.", "W łazience.", "Na klatce schodowej."],
);
b.tf(
  "es-u8b-reading-food",
  "culture",
  "Lectura: wszystkie produkty kupują razem.",
  "Cada uno compra su comida; solo aceite, sal y papel higiénico son de los dos.",
  false,
);
b.mc(
  "es-u8b-reading-midnight",
  "culture",
  "Lectura: dlaczego o północy w salonie ma być cicho?",
  "Pablo a veces trabaja de noche y está durmiendo por el día.",
  ["Bo Pablo czasem pracuje w nocy.", "Bo sąsiedzi są starsi.", "Bo tak mówi umowa najmu."],
);
b.mc(
  "es-u8b-culture-comunidad",
  "culture",
  "Kultura: co to jest la comunidad de vecinos?",
  "Wspólnota mieszkaniowa w bloku, z prezesem i zebraniami.",
  ["Wspólnota mieszkaniowa.", "Grupa przyjaciół z dzielnicy.", "Agencja nieruchomości."],
);
// TRANSFORMAR
b.ta(
  "es-u8b-translate-doing",
  "transform",
  "Napisz po hiszpańsku: (Właśnie) maluję sypialnię.",
  "Estoy pintando el dormitorio.",
  ["Estoy pintando el dormitorio.", "Estoy pintando mi dormitorio."],
);
b.ta(
  "es-u8b-translate-sleeping",
  "transform",
  "Napisz po hiszpańsku: Pablo śpi.",
  "Pablo está durmiendo (o → u).",
  ["Pablo está durmiendo.", "Pablo duerme."],
);
b.ta(
  "es-u8b-translate-empty",
  "transform",
  "Napisz po hiszpańsku: Szafa jest pusta.",
  "Stan: el armario está vacío.",
  ["El armario está vacío."],
);
b.ta(
  "es-u8b-translate-nurse",
  "transform",
  "Napisz po hiszpańsku: Ona jest pielęgniarką i jest z Sewilli.",
  "Es enfermera y es de Sevilla.",
  ["Es enfermera y es de Sevilla.", "Ella es enfermera y es de Sevilla."],
);
b.ta(
  "es-u8b-translate-what",
  "transform",
  "Napisz po hiszpańsku: Co za bałagan!",
  "¡Qué desorden!",
  ["¡Qué desorden!"],
);
// EXPRESAR
b.write(
  "es-u8b-write-call",
  "express",
  "Napisz wiadomość do przyjaciela w trakcie przeprowadzki: co teraz robisz ty i inni, jakie jest mieszkanie i w jakim jest stanie, i jak się czujesz.",
  "Sprawdź: estar + gerundio, ser (cechy) / estar (stan, miejsce), przymiotniki zgodne z rzeczownikiem.",
  "¡Hola, Ana! Estoy en mi piso nuevo. Ahora estoy colgando unos cuadros y mi hermano está montando la cama. El piso es pequeño, pero es muy bonito y está cerca del centro. Ahora la cocina está muy sucia y hay cajas por todas partes. Estoy cansada, pero muy contenta. ¡Ven el sábado!",
  ["estar + gerundio", "jakie jest mieszkanie", "w jakim jest stanie", "samopoczucie"],
  35,
  100,
  8,
);
b.write(
  "es-u8b-write-flatmate",
  "express",
  "Opisz swojego idealnego współlokatora (albo prawdziwego): skąd jest, czym się zajmuje, jaki jest i co zwykle robi w domu.",
  "Ser na cechy i zawód; czas teraźniejszy na zwyczaje.",
  "Mi compañera de piso ideal es de Polonia, de Cracovia. Es médica y trabaja mucho. Es muy ordenada, tranquila y simpática. Cocina muy bien y los domingos hacemos la comida juntas. No es ruidosa y nunca está enfadada.",
  ["pochodzenie", "zawód", "charakter", "zwyczaje"],
  25,
  80,
  6,
);
console.log("8B", b.save(), "unit 8 total", renumber(8));

planImages([
  {
    asset: "a1-u8-moving.png",
    prompt:
      "a young man surrounded by cardboard boxes assembles a bookshelf while talking on a video call with a smiling young woman whose face is on a smartphone propped up on a box, in the background another young man cooks in an open kitchen, no text on boxes or screens",
  },
]);
