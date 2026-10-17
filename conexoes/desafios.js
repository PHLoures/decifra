// Desafios do Conexões: um por dia, em ordem. Cada um tem 4 grupos de 4 palavras,
// do mais fácil (amarelo) ao mais difícil (roxo).
//
// Regra para as "pegadinhas": uma palavra pode parecer de dois grupos, desde que um
// deles só feche com ela (assim a solução é sempre única). Ex.: MANGA é fruta, mas
// "partes da camisa" só tem 4 candidatas se MANGA for uma delas.
window.DESAFIOS = [
  [
    ["Frutas", ["CAJU", "GOIABA", "PITANGA", "ACEROLA"]],
    ["Partes da camisa", ["GOLA", "PUNHO", "BOLSO", "MANGA"]],
    ["Têm teclas", ["PIANO", "TECLADO", "CALCULADORA", "SANFONA"]],
    ["Começam com uma nota musical", ["DOMINÓ", "REMO", "FAROL", "SOLDADO"]],
  ],
  [
    ["Planetas", ["MARTE", "SATURNO", "NETUNO", "MERCÚRIO"]],
    ["Gírias para dinheiro", ["GRANA", "BUFUNFA", "TUTU", "CASCALHO"]],
    ["Têm cauda", ["COMETA", "VESTIDO", "AVIÃO", "PAVÃO"]],
    ["Sem a 1ª letra, viram bicho", ["PRATO", "PORCA", "LEMA", "CURSO"]],
  ],
  [
    ["Instrumentos musicais", ["VIOLÃO", "FLAUTA", "PANDEIRO", "BERIMBAU"]],
    ["Personagens do folclore", ["SACI", "CURUPIRA", "IARA", "BOITATÁ"]],
    ["Têm boca", ["FOGÃO", "TÚNEL", "CALÇA", "SINO"]],
    ["Parecem aumentativo, mas não são", ["CARTÃO", "PORTÃO", "COLCHÃO", "CAMINHÃO"]],
  ],
  [
    ["Animais da fazenda", ["VACA", "PORCO", "CAVALO", "OVELHA"]],
    ["Pé de ___", ["MOLEQUE", "VENTO", "MEIA", "GALINHA"]],
    ["Têm asas", ["XÍCARA", "NARIZ", "ANJO", "BORBOLETA"]],
    ["Iguais de trás pra frente", ["OVO", "RADAR", "OSSO", "REVIVER"]],
  ],
  [
    ["Comidas típicas", ["FEIJOADA", "ACARAJÉ", "COXINHA", "TAPIOCA"]],
    ["Ritmos brasileiros", ["SAMBA", "FORRÓ", "FREVO", "BAIÃO"]],
    ["Capitais que também são palavras comuns", ["NATAL", "PALMAS", "VITÓRIA", "RECIFE"]],
    ["Têm coroa", ["REI", "DENTE", "ABACAXI", "MOEDA"]],
  ],
  [
    ["Cômodos da casa", ["SALA", "COZINHA", "QUARTO", "VARANDA"]],
    ["Partes de um livro", ["CAPA", "ÍNDICE", "LOMBADA", "ORELHA"]],
    ["Têm dentes", ["PENTE", "SERROTE", "ZÍPER", "ALHO"]],
    ["Terminam com nome de bicho", ["SAPATO", "CONTRATO", "RETRATO", "CAMALEÃO"]],
  ],
  [
    ["Esportes", ["VÔLEI", "NATAÇÃO", "JUDÔ", "SURFE"]],
    ["Jeitos de chamar um amigo", ["MANO", "PARÇA", "CHAPA", "CAMARADA"]],
    ["Sinônimos de bagunça", ["BADERNA", "FUZUÊ", "ZONA", "ALVOROÇO"]],
    ["Têm agulha", ["BÚSSOLA", "SERINGA", "VITROLA", "PINHEIRO"]],
  ],
  [
    ["Flores", ["ORQUÍDEA", "GIRASSOL", "TULIPA", "LÍRIO"]],
    ["Utensílios de cozinha", ["PANELA", "CONCHA", "ESPÁTULA", "RALADOR"]],
    ["Coisas de praia", ["AREIA", "CANGA", "PRANCHA", "GUARDA-SOL"]],
    ["Escondem a palavra MAR", ["AMARELO", "MARTELO", "AMARGO", "MARGARIDA"]],
  ],
  [
    ["Peixes", ["SALMÃO", "TILÁPIA", "SARDINHA", "BACALHAU"]],
    ["Ferramentas", ["ALICATE", "TRENA", "LIXA", "FURADEIRA"]],
    ["Gírias para “legal”", ["MASSA", "IRADO", "MANEIRO", "ARRETADO"]],
    ["Signos que também são bichos", ["TOURO", "LEÃO", "ESCORPIÃO", "PEIXES"]],
  ],
  [
    ["Calçados", ["CHINELO", "SANDÁLIA", "BOTA", "TAMANCO"]],
    ["Partes do carro", ["VOLANTE", "PNEU", "CAPÔ", "BUZINA"]],
    ["Brincadeiras de rua", ["AMARELINHA", "QUEIMADA", "BETS", "PIQUE-ESCONDE"]],
    ["Moedas que também são outras coisas", ["REAL", "PESO", "LIBRA", "COROA"]],
  ],
  [
    ["Insetos", ["FORMIGA", "ABELHA", "GRILO", "JOANINHA"]],
    ["Doces brasileiros", ["QUINDIM", "COCADA", "PAÇOCA", "BEIJINHO"]],
    ["Partes de uma música", ["REFRÃO", "ESTROFE", "VERSO", "PONTE"]],
    ["Bichos usados como xingamento", ["ANTA", "MULA", "TOUPEIRA", "LESMA"]],
  ],
  [
    ["Bebidas", ["CAFÉ", "CHÁ", "SUCO", "VITAMINA"]],
    ["Termos de futebol", ["ESCANTEIO", "PÊNALTI", "IMPEDIMENTO", "DRIBLE"]],
    ["Coisas que voam", ["PIPA", "BALÃO", "DRONE", "HELICÓPTERO"]],
    ["Começam com uma nota musical", ["DOCE", "RELÓGIO", "MILHO", "LATA"]],
  ],
  [
    ["Partes do corpo", ["COTOVELO", "OMBRO", "PESCOÇO", "QUEIXO"]],
    ["Tempo e clima", ["GAROA", "GRANIZO", "NEBLINA", "TROVOADA"]],
    ["Sinônimos de cansado", ["EXAUSTO", "ESGOTADO", "MOÍDO", "PREGADO"]],
    ["Iguais de trás pra frente", ["ARARA", "SOMOS", "MIRIM", "SALAS"]],
  ],
  [
    ["Aves", ["TUCANO", "PAPAGAIO", "CORUJA", "PELICANO"]],
    ["Móveis", ["SOFÁ", "ESTANTE", "POLTRONA", "CÔMODA"]],
    ["Têm escamas", ["PEIXE", "COBRA", "JACARÉ", "LAGARTO"]],
    ["Parecem aumentativo, mas não são", ["FOGÃO", "CALÇÃO", "PAPELÃO", "FERRÃO"]],
  ],
  [
    ["Material escolar", ["RÉGUA", "ESTOJO", "APONTADOR", "CADERNO"]],
    ["Personagens do folclore", ["CUCA", "BOTO", "SACI", "LOBISOMEM"]],
    ["Têm pé", ["MESA", "CAMA", "ALFACE", "MONTANHA"]],
    ["Sem a 1ª letra, viram bicho", ["GRATO", "TEMA", "TRATO", "MANTA"]],
  ],
  [
    ["Países", ["CHILE", "PERU", "EGITO", "CANADÁ"]],
    ["Meios de transporte", ["METRÔ", "TREM", "CANOA", "BICICLETA"]],
    ["Expressões de surpresa", ["EITA", "VIXE", "CARAMBA", "NOSSA"]],
    ["Têm ponta", ["LÁPIS", "FACA", "LÍNGUA", "ICEBERG"]],
  ],
  [
    ["Temperos", ["ALHO", "COMINHO", "ALECRIM", "LOURO"]],
    ["Partes da perna", ["COXA", "JOELHO", "CANELA", "TORNOZELO"]],
    ["Jogos de tabuleiro", ["XADREZ", "DAMAS", "LUDO", "GAMÃO"]],
    ["Peças do xadrez", ["TORRE", "BISPO", "PEÃO", "CAVALO"]],
  ],
  [
    ["Roupas", ["BERMUDA", "VESTIDO", "JAQUETA", "MOLETOM"]],
    ["Festas e datas", ["CARNAVAL", "PÁSCOA", "RÉVEILLON", "SÃO JOÃO"]],
    ["Têm casca", ["OVO", "BANANA", "ÁRVORE", "FERIDA"]],
    ["Escondem a palavra SOL", ["GIRASSOL", "CONSOLO", "SOLTEIRO", "SOLUÇO"]],
  ],
  [
    ["Mamíferos marinhos", ["BALEIA", "GOLFINHO", "FOCA", "ORCA"]],
    ["Partes do sapato", ["SOLA", "SALTO", "CADARÇO", "PALMILHA"]],
    ["Jeitos de cozinhar", ["ASSAR", "FRITAR", "REFOGAR", "GRELHAR"]],
    ["Esportes olímpicos de uma palavra", ["REMO", "TIRO", "LUTA", "VELA"]],
  ],
  [
    ["Partes da árvore", ["RAIZ", "TRONCO", "GALHO", "SEMENTE"]],
    ["Naipes do baralho", ["COPAS", "ESPADAS", "OUROS", "PAUS"]],
    ["Têm folhas", ["LIVRO", "ALFACE", "CADERNO", "CALENDÁRIO"]],
    ["Bolo de ___", ["FUBÁ", "ROLO", "CENOURA", "MILHO"]],
  ],
  [
    ["Profissões", ["CARTEIRO", "BOMBEIRO", "PADEIRO", "DENTISTA"]],
    ["Cores", ["BEGE", "LILÁS", "CINZA", "VINHO"]],
    ["Têm tela", ["CELULAR", "CINEMA", "PINTURA", "MONITOR"]],
    ["Terminam em CÃO", ["FALCÃO", "VULCÃO", "BALCÃO", "FACÃO"]],
  ],
  [
    ["Signos", ["GÊMEOS", "LIBRA", "VIRGEM", "SAGITÁRIO"]],
    ["Partes do computador", ["MOUSE", "TECLADO", "PROCESSADOR", "MEMÓRIA"]],
    ["Têm nota", ["PROVA", "MÚSICA", "COMPRA", "REDAÇÃO"]],
    ["Onde vivem peixes", ["AQUÁRIO", "LAGO", "REPRESA", "OCEANO"]],
  ],
  [
    ["Brinquedos antigos", ["PIÃO", "IOIÔ", "PETECA", "BAMBOLÊ"]],
    ["Sinônimos de bonito", ["LINDO", "FORMOSO", "GATO", "GRACIOSO"]],
    ["Comidas de festa junina", ["CANJICA", "CURAU", "PAMONHA", "PIPOCA"]],
    ["Partes da bicicleta", ["GUIDÃO", "SELIM", "PEDAL", "CORRENTE"]],
  ],
  [
    ["Meses", ["MARÇO", "ABRIL", "JUNHO", "AGOSTO"]],
    ["Ritmos brasileiros", ["AXÉ", "PAGODE", "SERTANEJO", "MARACATU"]],
    ["Partes de um castelo", ["TORRE", "MURALHA", "PONTE", "FOSSO"]],
    ["Gírias para carro", ["CARANGO", "POSSANTE", "CALHAMBEQUE", "BANHEIRA"]],
  ],
  [
    ["Animais da floresta", ["ONÇA", "MACACO", "JIBOIA", "TAMANDUÁ"]],
    ["Partes de um avião", ["ASA", "CAUDA", "TURBINA", "CABINE"]],
    ["Têm bateria", ["CELULAR", "CARRO", "BANDA", "NOTEBOOK"]],
    ["Têm casco", ["CAVALO", "NAVIO", "TARTARUGA", "GARRAFA"]],
  ],
  [
    ["Partes da casa", ["TELHADO", "JANELA", "CHAMINÉ", "ESCADA"]],
    ["Massas", ["LASANHA", "NHOQUE", "RAVIÓLI", "CANELONE"]],
    ["Têm pernas", ["MESA", "CADEIRA", "COMPASSO", "TRIPÉ"]],
    ["Bichos que também são objetos", ["MACACO", "PIRANHA", "BORBOLETA", "GATO"]],
  ],
  [
    ["Legumes", ["CENOURA", "ABOBRINHA", "BETERRABA", "CHUCHU"]],
    ["Coisas do circo", ["PALHAÇO", "MALABARISTA", "TRAPÉZIO", "PICADEIRO"]],
    ["Deuses gregos", ["ZEUS", "ATENA", "HERMES", "POSEIDON"]],
    ["Planetas com nome de deus romano", ["MARTE", "VÊNUS", "JÚPITER", "SATURNO"]],
  ],
  [
    ["Cartas do baralho", ["ÁS", "VALETE", "DAMA", "CORINGA"]],
    ["Coisas da escola", ["RECREIO", "LOUSA", "MERENDA", "BOLETIM"]],
    ["Têm fio", ["FACA", "VARAL", "TELEFONE", "NOVELO"]],
    ["Sem o S do começo, viram outra palavra", ["SALTO", "SOBRA", "SANTA", "SALA"]],
  ],
  [
    ["Frutas cítricas", ["LIMÃO", "LARANJA", "TANGERINA", "LIMA"]],
    ["Instrumentos de sopro", ["TROMPETE", "SAXOFONE", "CLARINETE", "FLAUTA"]],
    ["Têm cabo", ["PANELA", "VASSOURA", "FACA", "GUARDA-CHUVA"]],
    ["Partes de um rio", ["FOZ", "NASCENTE", "MARGEM", "LEITO"]],
  ],
  [
    ["Tipos de pão", ["BAGUETE", "CIABATA", "BRIOCHE", "BISNAGA"]],
    ["Festa de aniversário", ["BALÃO", "CHAPÉU", "BRIGADEIRO", "PARABÉNS"]],
    ["Termos do vôlei", ["SAQUE", "CORTADA", "BLOQUEIO", "MANCHETE"]],
    ["Têm vela", ["BARCO", "CARRO", "BOLO", "ALTAR"]],
  ],
];
