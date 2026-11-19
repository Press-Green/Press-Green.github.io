import type { HiveSize } from '../protocol.ts';

export type Lang = 'pt-BR' | 'en';

const duration = (s: number) => (s % 60 === 0 ? `${s / 60} min` : `${s} s`);

const ptBR = {
	intro:
		'Mostre uma sala de multijogador na TV: o tabuleiro, o tempo, os pontos e, no fim, todas as palavras.',
	go: 'Mostrar',
	codeLabel: 'Sala',
	create: 'Abrir uma sala nesta TV',
	or: 'ou mostre uma sala que já existe:',
	opening: 'Abrindo uma sala…',
	createFailed: 'Não deu para abrir uma sala. Confira a internet e tente de novo.',
	firstHosts: 'Quem entrar primeiro comanda a sala.',
	badCode: 'O código tem 4 letras, como no app.',
	notFound: 'Sala não encontrada. Confira o código no app.',
	closed: 'A sala foi fechada.',
	full: 'Esta sala já tem TVs demais.',
	outdated: 'O servidor ainda não aceita TVs. Tente mais tarde.',
	connecting: 'Conectando…',
	reconnecting: 'Reconectando…',
	joinHow:
		'Aponte a câmera do celular para o QR code, ou abra Multijogador no app e digite o código.',
	joinLater: 'Para entrar na sala:',
	qrA11y: 'QR code para entrar na sala',
	players: (n: number) => `Jogadores (${n}/8)`,
	nobody: 'Ninguém na sala ainda.',
	waitingHost: (nick?: string) =>
		nick ? `Esperando ${nick} começar` : 'Esperando o anfitrião começar',
	minutes: duration,
	hive: { small: 'Colmeia pequena', medium: 'Colmeia média', large: 'Colmeia grande' } as Record<
		HiveSize,
		string
	>,
	grows: (s: number) => (s === 0 ? 'Não cresce' : `Cresce a cada ${duration(s)}`),
	playing: 'Valendo!',
	starting: 'Preparar…',
	words: (n: number) => (n === 1 ? '1 palavra' : `${n} palavras`),
	results: 'Resultado',
	counting: 'Contando os pontos…',
	winner: (nick: string) => `${nick} venceu!`,
	tie: 'Empate!',
	wordsFound: 'Palavras encontradas',
	noWords: 'Ninguém encontrou palavras.',
	letters: (n: number) => `${n} letras`,
	nextMatch: 'O anfitrião começa a próxima partida pelo app.',
	fullscreen: 'Tela cheia',
	away: 'saiu',
	lastWinner: 'venceu a última partida'
};

export type Strings = typeof ptBR;

const en: Strings = {
	intro:
		'Show a multiplayer room on the TV: the board, the clock, the scores and, at the end, every word.',
	go: 'Show',
	codeLabel: 'Room',
	create: 'Open a room on this TV',
	or: 'or show a room that already exists:',
	opening: 'Opening a room…',
	createFailed: 'Couldn’t open a room. Check the internet and try again.',
	firstHosts: 'The first player to join runs the room.',
	badCode: 'The code has 4 letters, as in the app.',
	notFound: 'Room not found. Check the code in the app.',
	closed: 'The room closed.',
	full: 'This room has too many TVs already.',
	outdated: 'The server doesn’t take TVs yet. Try again later.',
	connecting: 'Connecting…',
	reconnecting: 'Reconnecting…',
	joinHow:
		'Point your phone’s camera at the QR code, or open Multiplayer in the app and type the code.',
	joinLater: 'To join the room:',
	qrA11y: 'QR code to join the room',
	players: (n) => `Players (${n}/8)`,
	nobody: 'Nobody in the room yet.',
	waitingHost: (nick) => (nick ? `Waiting for ${nick} to start` : 'Waiting for the host to start'),
	minutes: duration,
	hive: { small: 'Small hive', medium: 'Medium hive', large: 'Large hive' },
	grows: (s) => (s === 0 ? 'Never grows' : `Grows every ${duration(s)}`),
	playing: 'Go!',
	starting: 'Get ready…',
	words: (n) => (n === 1 ? '1 word' : `${n} words`),
	results: 'Results',
	counting: 'Counting the points…',
	winner: (nick) => `${nick} wins!`,
	tie: 'It’s a tie!',
	wordsFound: 'Words found',
	noWords: 'Nobody found a word.',
	letters: (n) => `${n} letters`,
	nextMatch: 'The host starts the next match from the app.',
	fullscreen: 'Full screen',
	away: 'left',
	lastWinner: 'won the last match'
};

export const STRINGS: Record<Lang, Strings> = { 'pt-BR': ptBR, en };

/** A language tag as the TV shows it: Portuguese or else English. */
export const langOf = (tag: string | undefined): Lang =>
	(tag || '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
