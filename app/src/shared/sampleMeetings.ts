export type SampleMeeting = {
  id: string;
  title: string;
  theme: string;
  pastoralObjective: string;
  biblicalRef: string;
  catechismRef: string;
  openingPrayer: string;
  dynamic: string;
  mainContent: string;
  activity: string;
  familyTask: string;
  closingPrayer: string;
  materials: string;
  estimatedTime: number;
  tags: string;
};

type SampleLocale = "pt-BR" | "en" | "es";

const SAMPLES: Record<SampleLocale, SampleMeeting[]> = {
  "pt-BR": [
    {
      id: "creation",
      title: "Deus nos criou por amor",
      theme: "A criação e a dignidade de cada pessoa",
      pastoralObjective:
        "Ajudar os catequizandos a reconhecer que foram criados por amor, à imagem e semelhança de Deus, e a agradecer pelo dom da vida.",
      biblicalRef: "Gn 1,26-31",
      catechismRef: "CIC 355-361",
      openingPrayer:
        "Sinal da cruz. Cada um diz uma coisa pela qual quer agradecer a Deus hoje. Todos: Glória ao Pai.",
      dynamic:
        "Mostre fotos ou objetos da natureza (folha, pedra, água). Pergunte: quem fez isso? O que existe de mais bonito que Deus criou? Conclua: o mais bonito somos nós, criados à imagem de Deus.",
      mainContent:
        'Leia Gn 1,26-31 com calma. Converse: o que Deus disse depois de criar o homem e a mulher? ("Era muito bom".) Explique que cada pessoa tem um valor imenso porque é amada por Deus, e que cuidar de si, dos outros e da criação é uma forma de responder a esse amor.',
      activity:
        'Cada catequizando desenha a si mesmo cercado das coisas que Deus criou e escreve embaixo: "Deus me fez por amor".',
      familyTask:
        "Durante a semana, em uma refeição, a família faz uma oração de agradecimento por algo da criação.",
      closingPrayer: "Pai-Nosso, de mãos dadas.",
      materials: "Bíblia, fotos ou objetos da natureza, papel e lápis de cor.",
      estimatedTime: 60,
      tags: "criação, gratidão, exemplo",
    },
    {
      id: "good-shepherd",
      title: "Jesus, o Bom Pastor",
      theme: "Jesus conhece e cuida de cada um",
      pastoralObjective:
        "Apresentar Jesus como o Bom Pastor que conhece cada ovelha pelo nome e dá a vida por ela.",
      biblicalRef: "Jo 10,11-16",
      catechismRef: "CIC 754",
      openingPrayer:
        'Sinal da cruz. Cante ou reze juntos o Salmo 23 (22): "O Senhor é meu pastor, nada me faltará".',
      dynamic:
        "Esconda na sala ovelhinhas de papel, uma com o nome de cada catequizando. Cada um procura a sua. Converse: como foi procurar e encontrar?",
      mainContent:
        "Leia Jo 10,11-16. Explique o trabalho de um pastor: conhecer, guiar, proteger. Jesus diz que conhece cada um de nós pelo nome e nunca desiste de quem se perde. Pergunte: quando você se sentiu cuidado? Como podemos cuidar uns dos outros na turma?",
      activity:
        "Montar um mural com as ovelhinhas ao redor da imagem do Bom Pastor. Cada um escreve na sua ovelha uma forma de cuidar de alguém nesta semana.",
      familyTask:
        "Conversar em família sobre alguém que precisa de cuidado e fazer um gesto concreto (visita, ligação, ajuda).",
      closingPrayer: "Ave-Maria e bênção final.",
      materials:
        "Bíblia, ovelhinhas de papel com os nomes, imagem do Bom Pastor, cola.",
      estimatedTime: 60,
      tags: "Jesus, cuidado, exemplo",
    },
    {
      id: "our-father",
      title: "Aprendendo o Pai-Nosso",
      theme: "A oração que Jesus nos ensinou",
      pastoralObjective:
        "Ajudar os catequizandos a compreender e rezar com o coração cada parte do Pai-Nosso.",
      biblicalRef: "Mt 6,9-13",
      catechismRef: "CIC 2759-2865",
      openingPrayer:
        'Sinal da cruz. Momento de silêncio de um minuto para "entrar" na oração.',
      dynamic:
        "Pergunte: com quem você gosta de conversar? Como é conversar com quem nos ama? Ligue a resposta à oração como conversa com Deus, que é Pai.",
      mainContent:
        "Leia Mt 6,9-13. Divida o Pai-Nosso em partes (Pai nosso; santificado seja; venha o vosso Reino; seja feita a vossa vontade; o pão de cada dia; perdoai; não nos deixeis cair em tentação; livrai-nos do mal) e explique cada uma com exemplos do dia a dia.",
      activity:
        "Em pequenos grupos, cada grupo ilustra uma parte do Pai-Nosso. No fim, montam juntos o cartaz da oração completa.",
      familyTask:
        "Rezar o Pai-Nosso em família antes de dormir, ao menos três noites na semana.",
      closingPrayer: "Pai-Nosso rezado devagar, com o cartaz da turma.",
      materials: "Bíblia, cartolina, canetinhas.",
      estimatedTime: 60,
      tags: "oração, Pai-Nosso, exemplo",
    },
  ],
  en: [
    {
      id: "creation",
      title: "God created us out of love",
      theme: "Creation and the dignity of every person",
      pastoralObjective:
        "Help catechumens recognize that they were created out of love, in the image and likeness of God, and give thanks for the gift of life.",
      biblicalRef: "Gn 1:26-31",
      catechismRef: "CCC 355-361",
      openingPrayer:
        "Sign of the cross. Each person names one thing they want to thank God for today. All: Glory Be.",
      dynamic:
        "Show photos or objects from nature (a leaf, a stone, water). Ask: who made this? What is the most beautiful thing God created? Conclude: we are, created in God's image.",
      mainContent:
        'Read Gn 1:26-31 slowly. Talk about it: what did God say after creating man and woman? ("It was very good.") Explain that every person has immense worth because God loves them, and that caring for ourselves, others and creation is a way of answering that love.',
      activity:
        'Each catechumen draws themselves surrounded by things God created and writes underneath: "God made me out of love".',
      familyTask:
        "During the week, at a meal, the family prays a thanksgiving for something in creation.",
      closingPrayer: "Our Father, holding hands.",
      materials:
        "Bible, photos or objects from nature, paper and colored pencils.",
      estimatedTime: 60,
      tags: "creation, gratitude, sample",
    },
    {
      id: "good-shepherd",
      title: "Jesus, the Good Shepherd",
      theme: "Jesus knows and cares for each of us",
      pastoralObjective:
        "Present Jesus as the Good Shepherd who knows each sheep by name and lays down his life for them.",
      biblicalRef: "Jn 10:11-16",
      catechismRef: "CCC 754",
      openingPrayer:
        'Sign of the cross. Sing or pray Psalm 23 together: "The Lord is my shepherd, there is nothing I shall want".',
      dynamic:
        "Hide paper sheep around the room, one with each catechumen's name. Everyone looks for theirs. Ask: how did it feel to search and find?",
      mainContent:
        "Read Jn 10:11-16. Explain a shepherd's work: knowing, guiding, protecting. Jesus says he knows each of us by name and never gives up on anyone who is lost. Ask: when have you felt cared for? How can we care for each other in this class?",
      activity:
        "Build a wall display with the sheep around a picture of the Good Shepherd. On each sheep, write one way to care for someone this week.",
      familyTask:
        "Talk as a family about someone who needs care and do something concrete (a visit, a call, help).",
      closingPrayer: "Hail Mary and final blessing.",
      materials:
        "Bible, paper sheep with names, picture of the Good Shepherd, glue.",
      estimatedTime: 60,
      tags: "Jesus, care, sample",
    },
    {
      id: "our-father",
      title: "Learning the Our Father",
      theme: "The prayer Jesus taught us",
      pastoralObjective:
        "Help catechumens understand and pray each part of the Our Father from the heart.",
      biblicalRef: "Mt 6:9-13",
      catechismRef: "CCC 2759-2865",
      openingPrayer:
        "Sign of the cross. One minute of silence to settle into prayer.",
      dynamic:
        "Ask: who do you like talking to? What is it like to talk with someone who loves us? Connect the answers to prayer as a conversation with God our Father.",
      mainContent:
        "Read Mt 6:9-13. Split the Our Father into parts (Our Father; hallowed be thy name; thy kingdom come; thy will be done; our daily bread; forgive us; lead us not into temptation; deliver us from evil) and explain each with everyday examples.",
      activity:
        "In small groups, each group illustrates one part of the Our Father. At the end, put together a poster of the whole prayer.",
      familyTask:
        "Pray the Our Father as a family before bed at least three nights this week.",
      closingPrayer:
        "The Our Father, prayed slowly in front of the class poster.",
      materials: "Bible, poster board, markers.",
      estimatedTime: 60,
      tags: "prayer, Our Father, sample",
    },
  ],
  es: [
    {
      id: "creation",
      title: "Dios nos creó por amor",
      theme: "La creación y la dignidad de cada persona",
      pastoralObjective:
        "Ayudar a los catequizandos a reconocer que fueron creados por amor, a imagen y semejanza de Dios, y a agradecer el don de la vida.",
      biblicalRef: "Gn 1,26-31",
      catechismRef: "CEC 355-361",
      openingPrayer:
        "Señal de la cruz. Cada uno dice algo por lo que quiere dar gracias a Dios hoy. Todos: Gloria al Padre.",
      dynamic:
        "Muestre fotos u objetos de la naturaleza (hoja, piedra, agua). Pregunte: ¿quién hizo esto? ¿Qué es lo más bonito que Dios creó? Concluya: lo más bonito somos nosotros, creados a imagen de Dios.",
      mainContent:
        "Lea Gn 1,26-31 con calma. Conversen: ¿qué dijo Dios después de crear al hombre y a la mujer? («Era muy bueno»). Explique que cada persona tiene un valor inmenso porque es amada por Dios, y que cuidar de uno mismo, de los demás y de la creación es una forma de responder a ese amor.",
      activity:
        "Cada catequizando se dibuja rodeado de las cosas que Dios creó y escribe debajo: «Dios me hizo por amor».",
      familyTask:
        "Durante la semana, en una comida, la familia hace una oración de agradecimiento por algo de la creación.",
      closingPrayer: "Padre Nuestro, tomados de la mano.",
      materials:
        "Biblia, fotos u objetos de la naturaleza, papel y lápices de colores.",
      estimatedTime: 60,
      tags: "creación, gratitud, ejemplo",
    },
    {
      id: "good-shepherd",
      title: "Jesús, el Buen Pastor",
      theme: "Jesús conoce y cuida a cada uno",
      pastoralObjective:
        "Presentar a Jesús como el Buen Pastor que conoce a cada oveja por su nombre y da la vida por ella.",
      biblicalRef: "Jn 10,11-16",
      catechismRef: "CEC 754",
      openingPrayer:
        "Señal de la cruz. Canten o recen juntos el Salmo 23 (22): «El Señor es mi pastor, nada me falta».",
      dynamic:
        "Esconda en la sala ovejitas de papel, una con el nombre de cada catequizando. Cada uno busca la suya. Pregunte: ¿cómo fue buscar y encontrar?",
      mainContent:
        "Lea Jn 10,11-16. Explique el trabajo de un pastor: conocer, guiar, proteger. Jesús dice que nos conoce a cada uno por nuestro nombre y nunca se rinde con quien se pierde. Pregunte: ¿cuándo te sentiste cuidado? ¿Cómo podemos cuidarnos unos a otros en el grupo?",
      activity:
        "Armar un mural con las ovejitas alrededor de la imagen del Buen Pastor. Cada uno escribe en su oveja una forma de cuidar a alguien esta semana.",
      familyTask:
        "Conversar en familia sobre alguien que necesita cuidado y hacer un gesto concreto (visita, llamada, ayuda).",
      closingPrayer: "Ave María y bendición final.",
      materials:
        "Biblia, ovejitas de papel con los nombres, imagen del Buen Pastor, pegamento.",
      estimatedTime: 60,
      tags: "Jesús, cuidado, ejemplo",
    },
    {
      id: "our-father",
      title: "Aprendiendo el Padre Nuestro",
      theme: "La oración que Jesús nos enseñó",
      pastoralObjective:
        "Ayudar a los catequizandos a comprender y rezar de corazón cada parte del Padre Nuestro.",
      biblicalRef: "Mt 6,9-13",
      catechismRef: "CEC 2759-2865",
      openingPrayer:
        "Señal de la cruz. Un minuto de silencio para «entrar» en la oración.",
      dynamic:
        "Pregunte: ¿con quién te gusta conversar? ¿Cómo es conversar con quien nos ama? Relacione las respuestas con la oración como conversación con Dios, que es Padre.",
      mainContent:
        "Lea Mt 6,9-13. Divida el Padre Nuestro en partes (Padre nuestro; santificado sea; venga tu Reino; hágase tu voluntad; el pan de cada día; perdona; no nos dejes caer en la tentación; líbranos del mal) y explique cada una con ejemplos de la vida diaria.",
      activity:
        "En grupos pequeños, cada grupo ilustra una parte del Padre Nuestro. Al final, arman juntos el cartel de la oración completa.",
      familyTask:
        "Rezar el Padre Nuestro en familia antes de dormir, al menos tres noches por semana.",
      closingPrayer:
        "Padre Nuestro rezado despacio, frente al cartel del grupo.",
      materials: "Biblia, cartulina, marcadores.",
      estimatedTime: 60,
      tags: "oración, Padre Nuestro, ejemplo",
    },
  ],
};

export function sampleMeetingsFor(
  locale: string | null | undefined,
): SampleMeeting[] {
  if (locale?.startsWith("es")) return SAMPLES.es;
  if (locale?.startsWith("en")) return SAMPLES.en;
  return SAMPLES["pt-BR"];
}
