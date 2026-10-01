# Um pequeno jardim

Experiência narrativa em português, mobile-first, em HTML, CSS e JavaScript puro. Sem framework, bundler ou imagens de banco. As flores são desenhadas proceduralmente em Canvas; a cordinha é SVG e as áreas de interação são botões HTML acessíveis.

## Executar

Com Node.js instalado, execute na pasta do projeto:

```sh
npm start
```

Abra **http://localhost:4173**. Não é necessário `npm install` para executar o projeto. Alternativa: `python -m http.server 4173`. Também é possível abrir `index.html` diretamente. As fontes são locais e não há requisições externas: a experiência funciona sem internet.

## Arquivos

- `index.html`: estrutura semântica, terminal, interruptor, controles e epílogo botânico em SVG.
- `styles.css`: interface responsiva, cores, tipografia e adaptações para movimento reduzido.
- `config.js`: falas, configurações, tempos principais e mensagem final.
- `garden.js`: desenho das flores, iluminação, terreno, perspectiva, crescimento, partículas e renderização.
- `app.js`: máquina de cenas, linha do tempo cancelável, regras do jogo e Pointer Events.
- `audio.js`: ambiente e pequenos efeitos sintetizados com Web Audio, além do suporte a arquivo de ambiente.
- `server.mjs`: servidor local, usando somente módulos nativos do Node.
- `tests/experience.cjs`: teste de ponta a ponta com Playwright.
- `artifacts/`: capturas da verificação visual.

## Editar textos e mensagem final

Em `config.js`, altere os arrays `boot`, `rose`, `tulip`, `common`, `darkness`, `light`, `playground`, `secrets` e `ending`.

O pedido de desculpas exibido em `para_ela.txt` fica em `GARDEN_CONFIG.apologyText`; a declaração do arquivo secreto fica em `GARDEN_CONFIG.declarationText`. Edite esses campos em `config.js`. Quebras de linha são preservadas, e o conteúdo é tratado como texto, não HTML.

Os títulos e rótulos estáticos da interface ficam no HTML e nas chamadas `header()` de `app.js`. O objeto `timing` controla os tempos principais; pausas curtas de coreografia ficam próximas à respectiva cena em `app.js`.

## Percurso e regras

`BOOT → SMALL_GARDEN → REGROWTH → BOUQUET → CAMERA_COVER → DARKNESS → LIGHT_PULL → BIG_GARDEN → EXPLORATION → ENDING → APOLOGY_FILE → FAKE_SHUTDOWN → CRT_SHUTDOWN → BLACK_SCREEN → HESITATION → LILY_GROWTH → HIDDEN_FOLDER → DECLARATION_FILE → FINAL_END`

- O boot demora aproximadamente três segundos.
- Toque na rosa; a tulipa exige três tentativas. Explore pelo menos duas flores comuns. A transição começa automaticamente depois disso.
- Durante as falas da rosa e o desaparecimento final da tulipa, novas ações narrativas são bloqueadas para preservar a sequência.
- No escuro, puxe a cordinha pelo menos 62 pixels. Uma puxada menor não acende. Por teclado, o interruptor aceita Enter ou Espaço.
- No campo, há 14 flores interativas, além das flores de cenário. Experimente repetir os toques.
- As três flores escondidas ocupam posições diferentes no campo. A descoberta das três libera `ENDING`; depois do pedido de desculpas e do falso encerramento, um lírio guarda a pasta do segundo arquivo.
- Recarregar a página reinicia tudo. Não há cookies, armazenamento persistente ou coleta de dados.

## Animação e desempenho

O caule é uma curva Bézier cuja extensão cresce ao longo do tempo. Folhas se desdobram em momentos diferentes; botões precedem pétalas, desenhadas em camadas. O buquê usa caules independentes, com alturas, curvaturas e atrasos distintos. Na invasão da câmera, plantas procedurais crescem em profundidades e tempos diferentes; folhas e pétalas cruzam a lente antes da transição para o escuro.

O campo usa flores distantes em cache, flores próximas animadas e vegetação cortada pelas bordas para marcar o primeiro plano. A luz se propaga em aproximadamente um segundo. A densidade é determinística: redimensionar não sorteia outro jardim nem muda os segredos. DPR limitado a 2, partículas limitadas a 44, áreas clicáveis mínimas de 44px e nenhuma biblioteca de animação. A renderização para no terminal e na escuridão; o tempo narrativo pausa com a aba oculta.

`prefers-reduced-motion` desativa vento cíclico, parallax, tremor, partículas ambientes e balanço da corda. O crescimento permanece legível; a cobertura da câmera usa pétalas estáticas que aparecem gradualmente. Interações também funcionam por Tab + Enter/Espaço. Mensagens usam região `aria-live`.

## Áudio

O áudio começa desligado. O contexto de áudio só é criado após uma interação válida. O botão discreto permite ativar/desativar vento sintetizado e pequenos sons.

Para adicionar uma gravação, crie `assets/`, copie seu arquivo e configure:

```js
audio: {
  enabledInitially: false,
  masterVolume: 0.17,
  ambienceUrl: 'assets/campo.mp3'
}
```

O arquivo é opcional. Uma falha ao carregá-lo não interrompe a experiência. Efeitos adicionais podem ser implementados no método `GardenAudio.note()` em `audio.js`.

## Testes

O teste usa Playwright, somente como ferramenta de desenvolvimento. Se necessário, instale com `npm install --no-save playwright` e `npx playwright install chromium`. Com o servidor rodando, execute `npm test`. Alternativamente, `PLAYWRIGHT_MODULE` pode apontar para uma instalação já existente.

O roteiro cobre o fluxo completo, rosa, três toques rápidos na tulipa, toque real emulado pelo protocolo Chromium na cordinha, puxada insuficiente, descoberta de todos os segredos, os dois arquivos, CRT, hesitação, lírio, pasta por mouse/toque/teclado, movimento reduzido e larguras de 320, 390 e 430px, além de paisagem e desktop. As capturas são salvas em `artifacts/`, incluindo cada etapa principal do epílogo e da câmera.

## Próximos refinamentos possíveis

- Gravar uma paisagem sonora própria e pequenos foleys de folhas e terra.
- Personalizar a mensagem final e as falas para a destinatária.
- Refinar ainda mais a botânica das pétalas e acrescentar variações laterais de rosas.
- Validar em aparelhos físicos iOS/Android: emulação de toque não substitui medições reais de GPU, bateria ou Safari móvel.

Para publicar, basta servir os arquivos estáticos. O servidor incluído é destinado à prévia local.
