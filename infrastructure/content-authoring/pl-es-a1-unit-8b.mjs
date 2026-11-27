// Polish for Spanish speakers — A1 unit 8B (Przeprowadzka) exercises, explained in Spanish.
//   node infrastructure/content-authoring/pl-es-a1-unit-8b.mjs
import { kit, planImages, renumber } from "./ex-kit.mjs";

const COURSE = { language: "pl", instruction: "es" };
const k = kit(8, "pl-es-unit-8-moving", 8500, COURSE);
// PERCIBIR
k.mc(
  "pl-es-u8b-listen-tomek",
  "perceive",
  "Diálogo: ¿qué tiene que hacer Tomek primero?",
  "Zanieś te kartony do samochodu.",
  ["Llevar las cajas al coche.", "Colgar el cuadro.", "Hacer café."],
);
k.mc(
  "pl-es-u8b-listen-clothes",
  "perceive",
  "Diálogo: ¿dónde pone Javier la ropa del armario?",
  "Wyjmij ubrania i połóż je na łóżku.",
  ["En la cama.", "En el coche.", "En el suelo."],
);
k.mc(
  "pl-es-u8b-listen-lamp",
  "perceive",
  "Diálogo: ¿dónde deja Javier la lámpara?",
  "Postaw ją przy drzwiach.",
  ["Junto a la puerta.", "Encima del escritorio.", "En la ventana."],
);
k.tf(
  "pl-es-u8b-listen-books",
  "perceive",
  "Diálogo: Tomek coloca los libros en la estantería.",
  "Połóż je na podłodze obok półki — los deja en el suelo; luego Kasia los coloca.",
  false,
);
k.mc(
  "pl-es-u8b-listen-kasia",
  "perceive",
  "Diálogo: ¿qué está haciendo Kasia al final?",
  "Właśnie robię kawę dla was.",
  ["Café para los chicos.", "Las cajas.", "La cena."],
);
// CONECTAR
k.match(
  "pl-es-u8b-match-words",
  "connect",
  "Une cada palabra con su traducción.",
  "Przeprowadzka = mudanza; podłoga = suelo; ściana = pared.",
  [
    ["przeprowadzka", "la mudanza"],
    ["podłoga", "el suelo"],
    ["ściana", "la pared"],
    ["karton", "la caja de cartón"],
    ["ciężki", "pesado"],
    ["właścicielka", "la casera"],
  ],
);
k.match(
  "pl-es-u8b-match-position",
  "connect",
  "Une cada posición con su verbo para colocar.",
  "Stoi → postawić; leży → położyć; wisi → powiesić.",
  [
    ["stoi", "postawić"],
    ["leży", "położyć"],
    ["wisi", "powiesić"],
  ],
);
k.mc("pl-es-u8b-kaucja", "connect", "¿Qué es la kaucja?", "Kaucja = la fianza del alquiler.", [
  "La fianza.",
  "La llave.",
  "El contador.",
]);
k.mc(
  "pl-es-u8b-rozpakowac",
  "connect",
  "¿Qué significa rozpakować?",
  "Pakować = hacer las cajas; rozpakować = desempaquetar.",
  ["Desempaquetar.", "Empaquetar.", "Pagar."],
);
// ESTRUCTURAR
k.gap(
  "pl-es-u8b-gap-put",
  "structure",
  "Completa con postaw, połóż o powieś.",
  "Lámpara de pie → postaw; libros en el suelo → połóż; cuadro → powieś.",
  "___ lampę w kącie, ___ książki na stole i ___ obraz nad kanapą.",
  [["Postaw"], ["Połóż"], ["Powieś"]],
);
k.mc("pl-es-u8b-obraz", "structure", "¿Cuál es correcto?", "El cuadro quedará colgado: powieś.", [
  "Powieś obraz na ścianie.",
  "Postaw obraz na ścianie.",
  "Połóż obraz na ścianie.",
]);
k.match(
  "pl-es-u8b-match-imperative",
  "structure",
  "Une cada infinitivo con su imperativo (ty).",
  "Pomóc → pomóż; wziąć → weź; przynieść → przynieś; odpocząć → odpocznij.",
  [
    ["pomóc", "pomóż"],
    ["wziąć", "weź"],
    ["przynieść", "przynieś"],
    ["odpocząć", "odpocznij"],
    ["uważać", "uważaj"],
  ],
);
k.gap(
  "pl-es-u8b-gap-wy",
  "structure",
  "Completa con el imperativo de wy (+ -cie).",
  "Połóż → połóżcie; odpocznij → odpocznijcie; uważaj → uważajcie.",
  "Chłopaki, ___ (połóż) kartony tutaj, ___ (uważaj) na lampę i potem ___ (odpocznij)!",
  [["połóżcie"], ["uważajcie"], ["odpocznijcie"]],
);
k.mc(
  "pl-es-u8b-order-vs-present",
  "structure",
  "Quieres pedirle a un amigo que te ayude. ¿Qué dices?",
  "Orden: imperativo (o la pregunta amable pomożesz mi?).",
  ["Pomóż mi, proszę!", "Pomagasz mi.", "Pomagać mi."],
);
k.gap(
  "pl-es-u8b-gap-pronouns",
  "structure",
  "Completa con go, ją o je.",
  "Lampa (f) → ją; obraz (m) → go; książki (pl) → je.",
  "Lampa? Postaw ___ przy drzwiach. Obraz? Powieś ___ nad biurkiem. Książki? Połóż ___ na podłodze.",
  [["ją"], ["go"], ["je"]],
);
k.mc(
  "pl-es-u8b-gdzie-mam",
  "structure",
  "¿Cómo preguntas «¿dónde pongo el sillón?» (está de pie)?",
  "Gdzie mam + postawić + acusativo.",
  ["Gdzie mam postawić fotel?", "Gdzie mam powiesić fotel?", "Gdzie stoi mam fotel?"],
);
k.mc(
  "pl-es-u8b-wlasnie",
  "structure",
  "¿Cómo dices «estoy haciendo la cena»?",
  "Presente + właśnie / teraz; no hay forma especial.",
  ["Właśnie robię kolację.", "Jestem robiąc kolację.", "Jestem robię kolację."],
);
k.mc(
  "pl-es-u8b-byc",
  "structure",
  "¿Cómo dices «el piso es precioso y Kasia está cansada»?",
  "Być para los dos: jest piękne, jest zmęczona.",
  [
    "Mieszkanie jest piękne, a Kasia jest zmęczona.",
    "Mieszkanie jest piękne, a Kasia ma zmęczona.",
    "Mieszkanie piękne jest, a Kasia stoi zmęczona.",
  ],
);
k.order(
  "pl-es-u8b-order-boxes",
  "structure",
  "Ordena: Lleva estas cajas al coche.",
  "Zanieś + te kartony + do samochodu.",
  ["Zanieś", "te", "kartony", "do", "samochodu."],
);
k.order(
  "pl-es-u8b-order-books",
  "structure",
  "Ordena: Deja los libros en el suelo junto a la estantería.",
  "Połóż książki na podłodze obok półki.",
  ["Połóż", "książki", "na", "podłodze", "obok", "półki."],
);
// SONAR
k.mc(
  "pl-es-u8b-sound-poloz",
  "sound",
  "¿Cómo termina połóż?",
  "Ż final se ensordece y suena como sz dura: [powusz].",
  ["En sz dura.", "En ś suave.", "En ż sonora."],
);
k.mc(
  "pl-es-u8b-sound-wez",
  "sound",
  "¿Cómo suena weź?",
  "Ź final se ensordece en ś suave: [weś].",
  ["[weś]", "[wesz]", "[wez]"],
);
k.tf(
  "pl-es-u8b-sound-same",
  "sound",
  "Pomóż y powieś terminan con el mismo sonido.",
  "No: pomóż termina en sz dura; powieś, en ś suave.",
  false,
);
// CULTURA
k.mc(
  "pl-es-u8b-reading-small",
  "culture",
  "Lectura: ¿por qué las cajas de la cocina son pequeñas?",
  "Kartony z kuchni są ciężkie, więc są małe.",
  ["Porque pesan mucho.", "Porque no hay más cajas.", "Porque la cocina es pequeña."],
);
k.mc(
  "pl-es-u8b-reading-tomek",
  "culture",
  "Lectura: ¿por qué Kasia pide ayuda a Tomek?",
  "Tomek ma duży samochód.",
  ["Porque tiene un coche grande.", "Porque es muy fuerte.", "Porque vive al lado."],
);
k.tf(
  "pl-es-u8b-reading-pizza",
  "culture",
  "Lectura: quien ayuda en la mudanza recibe comida y algo de beber.",
  "Kto pomaga w przeprowadzce, dostaje jedzenie i coś do picia.",
  true,
);
k.mc(
  "pl-es-u8b-culture-zameldowanie",
  "culture",
  "Cultura: ¿qué es el zameldowanie?",
  "El empadronamiento en la dirección donde vives.",
  ["El empadronamiento.", "La fianza.", "La fiesta del piso nuevo."],
);
// TRANSFORMAR
k.ta(
  "pl-es-u8b-translate-help",
  "transform",
  "Escribe en polaco: ¡Ayúdame, por favor!",
  "Pomóż mi, proszę!",
  ["Pomóż mi, proszę!", "Proszę, pomóż mi!", "Pomóż mi proszę!"],
);
k.ta(
  "pl-es-u8b-translate-lamp",
  "transform",
  "Escribe en polaco: Pon la lámpara junto a la ventana.",
  "Postaw lampę przy oknie.",
  ["Postaw lampę przy oknie.", "Postaw lampę obok okna."],
);
k.ta(
  "pl-es-u8b-translate-hang",
  "transform",
  "Escribe en polaco: Cuélgalo (el cuadro) encima de la cama.",
  "Powieś go nad łóżkiem.",
  ["Powieś go nad łóżkiem."],
);
k.ta(
  "pl-es-u8b-translate-careful",
  "transform",
  "Escribe en polaco: ¡Cuidado, esto pesa!",
  "Uważaj, to jest ciężkie!",
  ["Uważaj, to jest ciężkie!", "Uważaj, to ciężkie!"],
);
k.ta(
  "pl-es-u8b-translate-now",
  "transform",
  "Escribe en polaco: ¿Qué estás haciendo ahora? — Estoy haciendo las cajas.",
  "Co teraz robisz? — Właśnie pakuję kartony.",
  [
    "Co teraz robisz? Właśnie pakuję kartony.",
    "Co teraz robisz? — Właśnie pakuję kartony.",
    "Co teraz robisz? Pakuję kartony.",
  ],
);
// EXPRESAR
k.write(
  "pl-es-u8b-write-instructions",
  "express",
  "Escribe un mensaje a dos amigos que te ayudan con la mudanza: qué tiene que hacer cada uno y dónde poner tres cosas en el piso nuevo.",
  "Revisa: imperativo de ty y de wy, postaw / połóż / powieś con el lugar correcto, go / ją / je.",
  "Cześć, Ania i Piotr! Dziękuję za pomoc! Piotr, zanieś kartony z kuchni do samochodu, są ciężkie. Ania, pomóż mi z szafą. W nowym mieszkaniu połóżcie książki na podłodze, lampę postawcie w salonie, a lustro powieście w przedpokoju. Potem odpocznijcie: pizza jest moja!",
  ["tareas de cada uno", "imperativo ty y wy", "tres cosas y dónde", "agradecimiento"],
  30,
  100,
  7,
);
k.write(
  "pl-es-u8b-write-now",
  "express",
  "Imagina que estás en tu piso nuevo: escribe qué estás haciendo ahora tú y otras personas, cómo es el piso y cómo estás.",
  "Właśnie / teraz + presente; być + adjetivo.",
  "Teraz jestem w nowym mieszkaniu. Właśnie rozpakowuję kartony, a mój brat wiesza obrazy. Mama robi herbatę w kuchni. Mieszkanie jest małe, ale bardzo jasne. Jestem zmęczony, ale szczęśliwy.",
  ["qué haces ahora", "qué hacen otros", "cómo es el piso", "cómo estás"],
  25,
  80,
  6,
);
console.log("saved", k.save(), "unit 8 (pl-es) total", renumber(8, { ...COURSE }));

planImages([
  {
    asset: "a1-pl-u8-moving.png",
    prompt:
      "a young woman points and gives directions to two young men carrying cardboard boxes in an apartment, a floor lamp stands by the door and a framed painting leans against the wall, no text on the boxes, no signs",
  },
]);
