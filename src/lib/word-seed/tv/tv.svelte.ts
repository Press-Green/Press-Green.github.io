import { goto } from '$app/navigation';
import { CODE_PATTERN, DEFAULT_API, PLAYER_COLORS } from '../config.ts';
import { cellKey, type BoardCell, type RoomState, type ServerMessage } from '../protocol.ts';
import { play } from '../sound.ts';
import { STRINGS, langOf, type Lang } from './strings.ts';

/** The match on screen: its cells and its times on this TV's clock (`performance.now()`). */
export type Match = {
	round: number;
	cells: BoardCell[];
	/** Cells of the last growth: they pop in. */
	fresh: Set<string>;
	startsAt: number;
	endsAt: number;
};

/** What the room view shows; a new key starts that view afresh. */
export type View =
	| { kind: 'none'; key: 'none' }
	| { kind: 'lobby'; key: 'lobby' }
	| { kind: 'match'; key: string }
	| { kind: 'results'; key: string };

/**
 * The TV page's state: the entry screen, or a room it watches through the room's socket. Made in
 * the browser only (it reads the address and the TV's language).
 */
export class Tv {
	/** Before a room says its language, the TV's own. */
	lang = $state<Lang>(langOf(navigator.language));
	t = $derived(STRINGS[this.lang]);

	screen = $state<'entry' | 'room'>('entry');
	entryError = $state('');
	/** Connection news for the top bar ("Reconnecting…"). */
	status = $state('');
	code = $state('');
	state = $state.raw<RoomState | null>(null);
	match = $state.raw<Match | null>(null);
	/** The last match's board as it ended: the results replay its words on it. */
	lastBoard = $state.raw<{ round: number; cells: BoardCell[] } | null>(null);
	/** `performance.now()`, a few times a second: the clock and the countdown follow it. */
	now = $state(performance.now());

	view: View = $derived.by(() => {
		const { state, match } = this;
		if (!state) return { kind: 'none', key: 'none' };
		if (state.status !== 'lobby' && match && match.round === state.round) {
			return { kind: 'match', key: `match:${match.round}` };
		}
		if (state.results) return { kind: 'results', key: `results:${state.results.round}` };
		return { kind: 'lobby', key: 'lobby' };
	});

	/** True while the match on screen hasn't started yet. */
	countingDown = $derived(
		this.view.kind === 'match' && !!this.match && this.match.startsAt > this.now
	);

	statusLine = $derived(this.status || (this.countingDown ? this.t.starting : ''));

	/** `?api=` from the address, kept in every address the page writes. */
	readonly apiParam: string | null;
	readonly api: string;
	readonly httpApi: string;

	/** When this TV opened the room itself: it opens a new one if this one closes. */
	private own = false;
	private socket: WebSocket | null = null;
	private tries = 0;
	private retryTimer = 0;
	private pingTimer = 0;
	private clockTimer = 0;
	/** Time's up for the match on screen. */
	private timesUpTimer = 0;
	/** Each player keeps one color, by their place in the room. */
	private colors = new Map<string, string>();
	private wakeLock: WakeLockSentinel | null = null;

	constructor() {
		this.apiParam = new URLSearchParams(location.search).get('api');
		this.api = this.apiParam || DEFAULT_API;
		this.httpApi = this.api.replace(/^ws/, 'http');
	}

	/** Shows the room in the address, or opens one of the TV's own. Returns a cleanup. */
	start() {
		const params = new URLSearchParams(location.search);
		this.clockTimer = window.setInterval(() => (this.now = performance.now()), 200);
		const onVisible = () => {
			if (document.visibilityState === 'visible' && this.code) this.keepAwake();
		};
		document.addEventListener('visibilitychange', onVisible);

		const startCode = (params.get('code') || '').toUpperCase();
		// A code in the address (a refresh, or a room picked by hand) is shown; otherwise the TV opens one.
		if (CODE_PATTERN.test(startCode)) this.openRoom(startCode, params.get('own') === '1');
		else this.createRoom();

		return () => {
			clearInterval(this.clockTimer);
			document.removeEventListener('visibilitychange', onVisible);
			this.close();
		};
	}

	colorOf(id: string) {
		let color = this.colors.get(id);
		if (!color) {
			color = PLAYER_COLORS[this.colors.size % PLAYER_COLORS.length];
			this.colors.set(id, color);
		}
		return color;
	}

	// ---- Entry ----------------------------------------------------------------------------------
	showEntry(error = '') {
		this.close();
		this.code = '';
		this.state = null;
		this.match = null;
		this.status = '';
		this.screen = 'entry';
		this.entryError = error;
		this.setAddress(this.apiParam ? new URLSearchParams({ api: this.apiParam }) : null);
	}

	/**
	 * Opens a room of the TV's own (no sign-in): its code and QR code show right away, and the
	 * first player to join hosts it. Played in the TV's language until the host picks another.
	 */
	async createRoom() {
		this.close();
		this.screen = 'room';
		this.code = '';
		this.state = null;
		this.match = null;
		this.status = this.t.opening;
		try {
			const response = await fetch(`${this.httpApi}/rooms/screen`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ language: this.lang })
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const { code } = (await response.json()) as { code: string };
			this.openRoom(code, true);
		} catch {
			this.showEntry(this.t.createFailed);
		}
	}

	/** Shows a room; `own` when this TV opened it. */
	openRoom(code: string, own = false) {
		this.close();
		const query = new URLSearchParams({ code });
		if (own) query.set('own', '1');
		if (this.apiParam) query.set('api', this.apiParam);
		this.setAddress(query);
		this.screen = 'room';
		this.entryError = '';
		this.code = code;
		this.own = own;
		this.state = null;
		this.match = null;
		this.tries = 0;
		this.connect();
		this.keepAwake();
	}

	private setAddress(query: URLSearchParams | null) {
		// Shallow: the address changes, the page stays (a refresh comes back to the same room).
		goto(`${location.pathname}${query ? `?${query}` : ''}`, {
			state: {},
			shallow: true,
			replace: true
		}).catch(() => {});
	}

	// ---- The room's socket ----------------------------------------------------------------------
	private connect() {
		this.status = this.tries ? this.t.reconnecting : this.t.connecting;
		const socket = new WebSocket(`${this.api}/rooms/${this.code}/socket`);
		this.socket = socket;
		socket.onopen = () => {
			socket.send(JSON.stringify({ type: 'watch' }));
			clearInterval(this.pingTimer);
			this.pingTimer = window.setInterval(
				() => socket.readyState === WebSocket.OPEN && socket.send('{"type":"ping"}'),
				20000
			);
		};
		socket.onmessage = (event) => {
			let message: ServerMessage;
			try {
				message = JSON.parse(event.data);
			} catch {
				return;
			}
			this.receive(message);
		};
		socket.onclose = (event) => {
			if (this.socket !== socket) return;
			clearInterval(this.pingTimer);
			this.socket = null;
			// This TV's own room closed (nobody played for a while): a fresh one takes its place.
			if ((event.code === 4004 || event.code === 1001) && this.own) return void this.createRoom();
			if (event.code === 4004) return this.showEntry(this.state ? this.t.closed : this.t.notFound);
			if (event.code === 1001) return this.showEntry(this.t.closed);
			if (event.code === 4009) return this.showEntry(this.t.full);
			// Dropped (Wi-Fi, a sleeping TV): back in a moment, sooner at first.
			this.tries++;
			this.status = this.t.reconnecting;
			this.retryTimer = window.setTimeout(
				() => this.connect(),
				Math.min(10000, 500 * 2 ** this.tries)
			);
		};
	}

	private close() {
		clearTimeout(this.retryTimer);
		clearTimeout(this.timesUpTimer);
		clearInterval(this.pingTimer);
		const socket = this.socket;
		this.socket = null;
		if (socket) socket.close(1000);
	}

	private receive(message: ServerMessage) {
		switch (message.type) {
			case 'state': {
				this.tries = 0;
				const { state } = message;
				if (state.config) {
					this.lang = state.config.language === 'pt-BR' ? 'pt-BR' : 'en';
					document.documentElement.lang = this.lang;
				}
				// Colors go by join order; players who left keep theirs from the match.
				for (const player of state.players) this.colorOf(player.id);
				for (const player of state.results?.players ?? []) this.colorOf(player.id);
				// A new round's match comes before its state; an older match is gone.
				let match = this.match;
				// A match back in the lobby without its results was called off: no time's up. A
				// finished one keeps it (its results can arrive just before this TV's clock ends).
				if (match && state.status === 'lobby' && state.results?.round !== match.round) {
					clearTimeout(this.timesUpTimer);
				}
				if (match && state.results?.round === match.round) {
					this.lastBoard = { round: match.round, cells: match.cells };
				}
				if (match && match.round !== state.round) match = null;
				if (state.status === 'lobby') match = null;
				this.match = match;
				this.state = state;
				this.status = '';
				break;
			}
			case 'match': {
				const now = performance.now();
				this.now = now;
				this.match = {
					round: message.round,
					cells: message.cells,
					fresh: new Set(),
					startsAt: now + message.startsInMs,
					endsAt: now + message.endsInMs
				};
				// Time's up sounds at the match's end, whatever the screen shows by then.
				clearTimeout(this.timesUpTimer);
				if (message.endsInMs > 0) {
					this.timesUpTimer = window.setTimeout(() => {
						this.now = performance.now(); // the clock shows 0:00 with the sound
						play('timesUp', 0.8);
					}, message.endsInMs);
				}
				break;
			}
			case 'grow': {
				const match = this.match;
				if (!match || match.round !== message.round) return;
				this.match = {
					...match,
					cells: [...match.cells, ...message.cells],
					fresh: new Set(message.cells.map(cellKey))
				};
				break;
			}
			case 'error':
				// An API from before TVs answers a screen's "watch" with unauthorized.
				if (message.code === 'unauthorized' || message.code === 'bad_request') {
					this.showEntry(this.t.outdated);
				}
				break;
		}
	}

	// ---- TV comforts ----------------------------------------------------------------------------
	private async keepAwake() {
		try {
			if ('wakeLock' in navigator && !this.wakeLock) {
				this.wakeLock = await navigator.wakeLock.request('screen');
				this.wakeLock.addEventListener('release', () => (this.wakeLock = null));
			}
		} catch {
			// Not allowed here: the TV may dim.
		}
	}
}
