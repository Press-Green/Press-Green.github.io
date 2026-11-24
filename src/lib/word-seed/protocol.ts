// What a room's socket says to a screen that watches it: the parts of
// word-seed-api/src/rooms/protocol.ts the TV reads. Keep in step with that file.

export type BoardCell = { column: number; y: number; letter: string };

export type HiveSize = 'small' | 'medium' | 'large';

export type RoomConfig = {
	language: string;
	/** Seconds. */
	duration: number;
	hive: HiveSize;
	/** Seconds between growths, or 0 for a board that never grows. */
	growEvery: number;
};

export type PlayerView = {
	id: string;
	nick: string;
	connected: boolean;
	score: number;
	words: number;
};

export type MatchResult = {
	round: number;
	/** The board at the end (start cells, then each growth's). An API from before it sends none. */
	cells?: BoardCell[];
	players: {
		id: string;
		nick: string;
		score: number;
		/** `display` is the word's real spelling, when the app sent it ("caçador" for "cacador"). */
		words: { key: string; points: number; display?: string }[];
	}[];
};

export type RoomState = {
	code: string;
	hostId: string;
	status: 'lobby' | 'countdown' | 'playing';
	config: RoomConfig;
	/** In join order. */
	players: PlayerView[];
	round: number;
	/** The last match's scores, until the next one starts. */
	results: MatchResult | null;
	/**
	 * The round whose results a TV is still playing back, or 0: the apps wait for it. An API from
	 * before it sends none.
	 */
	reviewing?: number;
	/** The round whose results the host closed: the podium stays up until then. Older APIs send none. */
	resultsClosed?: number;
};

export type ServerMessage =
	| { type: 'state'; state: RoomState }
	| { type: 'match'; round: number; cells: BoardCell[]; startsInMs: number; endsInMs: number }
	| { type: 'grow'; round: number; cells: BoardCell[] }
	| { type: 'error'; code: string };

export const cellKey = (cell: BoardCell) => `${cell.column},${cell.y}`;
