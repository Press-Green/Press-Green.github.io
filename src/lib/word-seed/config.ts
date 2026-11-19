/** The Android app (word-seed-game/app.json). */
export const PACKAGE = 'com.pressgreen.wordseed';
export const STORE = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

/** The API's socket origin. `?api=ws://localhost:3000` on the TV page points a test at a local API. */
export const DEFAULT_API = 'wss://word-seed-api.pressgreen420.workers.dev';

/** Room codes: 4 consonants (word-seed-api/src/rooms/service.ts). */
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
export const CODE_PATTERN = new RegExp('^[' + CODE_LETTERS + ']{4}$');

export const PLAYER_COLORS = [
	'#8FD46A',
	'#F7C548',
	'#7EC8F2',
	'#F29BC0',
	'#E8957A',
	'#C9A6F5',
	'#5ED6C2',
	'#F2E07E'
];

/** Height of a tile per unit of width (flat-top hexagon). */
export const CELL_RATIO = Math.sqrt(3) / 2;
