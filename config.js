/* Todos os textos e os principais tempos ficam aqui. Tempos em milissegundos. */
window.GARDEN_CONFIG = {
  apologyText: `Antes de terminar isso, eu queria falar uma coisa direito.

Eu sei que as coisas ficaram estranhas entre a gente depois de tudo que aconteceu, e eu sei que eu tive parte nisso.

Eu deveria ter parado um pouco e pensado no seu lado também. Você já estava com a cabeça cheia e não precisava ter que lidar com uma fofoca mal contada, muito menos ter seu nome envolvido nisso e acabar ficando no meio de uma confusão que eu nunca quis criar.

Talvez eu tenha me preocupado tanto com o que eu estava ouvindo e sentindo naquele momento que não pensei no peso que aquilo também teria pra você.

E eu me arrependo disso.

Não estou te falando isso esperando que você simplesmente esqueça o que aconteceu ou deixe de estar chateada comigo. Só não queria deixar passar sem reconhecer que eu poderia ter lidado muito melhor com tudo.

Nunca foi minha intenção te colocar nessa situação, te machucar ou fazer você carregar mais uma coisa quando sua cabeça já estava cheia.

Então, de verdade:

me desculpa.

Eu sinto falta de como as coisas estavam entre a gente antes disso.

E, independentemente do que acontecer daqui pra frente, eu queria pelo menos conseguir te dizer isso direito.`,
  declarationText: `Eu pensei em um monte de formas de terminar isso.

Pensei em escrever alguma coisa bonita, fazer alguma piada, talvez fingir que tudo acabava por aqui.

Mas acho que, depois de tudo isso, eu prefiro só falar a verdade.

Eu amo você.

E dessa vez eu não quero precisar me embriagar pra criar coragem e conseguir dizer isso.

Quero falar sabendo exatamente o que estou dizendo.

Eu amo você.

Gosto de você de um jeito que às vezes nem sei colocar direito em palavras. Gosto de conversar com você, de ouvir você, das pequenas coisas que eu acabo guardando sem nem perceber.

Talvez por isso eu tenha feito tudo isso.

Porque quando eu não sei muito bem como dizer alguma coisa, eu tento construir.

E foi assim que eu consegui chegar até aqui.

Não sei o que vai acontecer depois que você terminar de ler esse arquivo.

Só sei que eu queria que você soubesse.

Sem desculpa.
Sem coragem emprestada.
Sem esconder atrás de brincadeira.

Eu te amo.

E acho que já estava na hora de eu conseguir dizer isso direito.`,
  timing: {
    bootLine: 115,
    ah: 850,
    phrase: 1800,
    regrowth: 4700,
    bouquet: 5800,
    cover: 4200,
    darkPause: 900,
    endingLine: 360,
    fileClose: 280,
    shutdownPause: 760,
    crt: 760,
    crtReduced: 420,
    blackPause: 1950,
    hesitationStep: 410,
    hesitationPause: 760,
    lilyGrowth: 5000,
    lilyGrowthReduced: 1900,
    rootRelease: 880,
    folderSettle: 250,
  },
  interaction: { commonBeforeRegrowth: 2, cordThreshold: 62, maxPetals: 44 },
  audio: {
    enabledInitially: false,
    masterVolume: 0.17,
    ambienceUrl: null /* Ex.: 'assets/campo.mp3' (loop opcional) */,
  },
  boot: [
    "initializing personal build...",
    "mounting /a_small_place",
    "loading sky.palette     [ok]",
    "loading soil.physics    [ok]",
    "reading roses.json      12 KB",
    "reading tulips.json     08 KB",
    "compiling soft_light.glsl",
    "planting a few exceptions...",
    "warning: flowers have opinions",
    "calibrating wind        0.3 m/s",
    "starting renderer...",
    "unexpected visitor detected",
    "identifying...",
    "...",
    "ah.",
  ],
  ending: [
    "closing garden...",
    "slowing down the wind...",
    "stopping renderer...",
    "freeing memory...",
    "deleting temporary files...",
    "clearing cache...",
    "keeping one file...",
  ],
  shutdown: [
    "closing para_ela.txt...",
    "saving changes...",
    "closing garden...",
    "stopping renderer...",
    "releasing memory...",
    "session finished.",
  ],
  rose: ["Ei.", "Essa não.", "Essa é importante pra uma pessoa."],
  tulip: ["Você é insistente, hein?"],
  common: [
    ["Essa gosta de atenção.", "Pronto. Agora ela se acha a favorita."],
    ["Essa eu deixo você pegar.", "Ela decidiu ficar. Raízes, sabe?"],
    [
      "Bonitinha. Mas você escolheu justamente essa?",
      "Tá bom. Ela também gostou de você.",
    ],
  ],
  regrowth: ["Tem uma coisa acontecendo aqui embaixo."],
  darkness: ["acho que exagerei um pouquinho.", "pera.", "cadê a luz?"],
  light: ["pronto.", "agora pode mexer nelas."],
  playground: [
    "Ela precisava de um empurrãozinho.",
    "Essa acordou agora.",
    "Não estava no código. Juro.",
    "Um pouco dramática, essa.",
    "Tem espaço pra mais uma.",
    "Uma pétala. Por conta da casa.",
    "Pode ficar. Aqui o tempo é mais lento.",
    "Ela está tentando parecer ocupada.",
    "Botânica não é uma ciência exata por aqui.",
    "Acho que ela reconheceu você.",
  ],
  secrets: [
    ["Guardei um lugar tranquilo pra você."],
    ["Você encontrou o botão de vento. Segura o cabelo."],
    [
      "Você realmente clicou em flor por flor procurando alguma coisa?",
      "...",
      "eu faria o mesmo.",
    ],
  ],
};
