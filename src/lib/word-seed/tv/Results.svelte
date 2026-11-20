<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import Qr from '../Qr.svelte';
	import { play } from '../sound.ts';
	import { cellKey, type BoardCell, type MatchResult, type RoomState } from '../protocol.ts';
	import Board, { type ShownWord } from './Board.svelte';
	import { joinLink } from './join-link.ts';
	import type { Tv } from './tv.svelte.ts';

	/**
	 * After a match, every word found is played back on the final board, one by one, as the app
	 * shows a word found: its tiles are pressed one after another (with the app's tile sound) and
	 * join with honey, then the word turns green with the app's found chime. The word and its
	 * points show above the board. Each word adds its points to the players who found it, and the
	 * ranking reorders as the scores grow. The winner's headline and gold star wait for the last word.
	 *
	 * The words found by everyone come first, then those found by fewer and fewer players, down to
	 * the ones a single player found; within each group, longest first.
	 */
	let { tv, state: room, results }: { tv: Tv; state: RoomState; results: MatchResult } = $props();

	type Word = {
		key: string;
		display: string;
		players: { id: string; points: number }[];
		points: number;
		/** Cell indexes that spell it on the final board; empty if it can't be found there. */
		path: number[];
	};

	const t = $derived(tv.t);
	const locale = $derived(tv.lang);
	// The review plays once per match: later states (a player leaving) don't restart it.
	const match = untrack(() => results);
	const players = match.players;
	const nickOf = (id: string) => players.find((p) => p.id === id)?.nick ?? '';

	/** The final board: from the results, or kept from the match by an API that doesn't send it. */
	const cells: BoardCell[] = untrack(
		() => match.cells ?? (tv.lastBoard?.round === match.round ? tv.lastBoard.cells : [])
	);

	const words: Word[] = untrack(() => {
		const byKey = new Map<string, Word>();
		for (const player of players) {
			for (const word of player.words) {
				const entry =
					byKey.get(word.key) ??
					({ key: word.key, display: word.display || word.key, players: [], points: 0, path: [] } as Word);
				if (word.display && entry.display === entry.key) entry.display = word.display;
				entry.players.push({ id: player.id, points: word.points });
				entry.points = Math.max(entry.points, word.points);
				byKey.set(word.key, entry);
			}
		}
		const collator = new Intl.Collator(tv.lang);
		const sorted = [...byKey.values()].sort(
			(a, b) =>
				b.players.length - a.players.length ||
				b.key.length - a.key.length ||
				collator.compare(a.display, b.display)
		);
		for (const word of sorted) word.path = pathOf(word.key, cells);
		return sorted;
	});

	/** A path through touching cells that spells `key`, each cell used once ([] if none). */
	function pathOf(key: string, board: BoardCell[]): number[] {
		const at = new Map(board.map((cell, i) => [cellKey(cell), i]));
		// Flat-top hexagons in columns: above, below, and the four half a row up or down beside.
		const STEPS = [
			[0, -1],
			[0, 1],
			[-1, -0.5],
			[-1, 0.5],
			[1, -0.5],
			[1, 0.5]
		];
		const path: number[] = [];
		const used = new Set<number>();
		const walk = (index: number, i: number): boolean => {
			if (used.has(index) || board[index].letter !== key[i]) return false;
			path.push(index);
			used.add(index);
			if (i === key.length - 1) return true;
			const { column, y } = board[index];
			for (const [dc, dy] of STEPS) {
				const next = at.get(cellKey({ column: column + dc, y: y + dy, letter: '' }));
				if (next !== undefined && walk(next, i + 1)) return true;
			}
			path.pop();
			used.delete(index);
			return false;
		};
		for (let i = 0; i < board.length; i++) if (walk(i, 0)) return path;
		return [];
	}

	// ---- The review -----------------------------------------------------------------------------
	/** The whole review, first word to last, at most: a long list plays faster. */
	const REVIEW_MS = 30000;
	/** Each word's time on screen: never so quick it can't be read, never so slow it drags. */
	const MIN_STEP = 750;
	const MAX_STEP = 2000;
	/** A tile pressed after the last one, at most: about a finger's pace in the app. */
	const MAX_PRESS_MS = 110;
	const FIRST_WORD_DELAY = 900;
	/** The app's FOUND_TILES_FADE_MS: a found word's tiles turn back to plain over this long. */
	const FADE_MS = 150;
	/** A plain board between two words. */
	const PAUSE_MS = 120;

	/** Index of the word on the board, or -1. */
	let current = $state(-1);
	/** How many of its tiles are pressed. */
	let pressed = $state(0);
	let tone = $state<'active' | 'found'>('active');
	let fading = $state(false);
	/** Words whose points have counted: each one's, as it turns green. */
	let scored = $state(0);
	const done = $derived(scored >= words.length);
	/** A beat after the last word: the headline and the gold star. */
	let crowned = $state(false);

	$effect(() => {
		const timers: number[] = [];
		const at = (ms: number, run: () => void) => timers.push(window.setTimeout(run, ms));
		const step = Math.max(MIN_STEP, Math.min(MAX_STEP, REVIEW_MS / Math.max(1, words.length)));
		let time = FIRST_WORD_DELAY;
		words.forEach((word, index) => {
			const length = word.key.length;
			// The tiles take at most 40% of the word's time, so its green has time to show.
			const press = Math.min(MAX_PRESS_MS, (step * 0.4) / length);
			at(time, () => {
				current = index;
				tone = 'active';
				fading = false;
				pressed = 0;
			});
			for (let k = 1; k <= length; k++) {
				at(time + (k - 1) * press, () => {
					pressed = k;
					play('tile', 0.5);
				});
			}
			at(time + length * press + 40, () => {
				tone = 'found';
				scored = index + 1;
				play('found', 0.55);
			});
			at(time + step - FADE_MS - PAUSE_MS, () => (fading = true));
			time += step;
		});
		// The last word's bubble stays up; its tiles are plain again by now.
		at(time - PAUSE_MS + 900, () => {
			crowned = true;
			// With the star: no star (nobody scored), no sound.
			if (best > 0) play('winner', 0.9);
		});
		return () => timers.forEach(clearTimeout);
	});

	const shown = $derived(current >= 0 ? words[current] : null);
	const board: ShownWord | null = $derived(
		shown && shown.path.length ? { path: shown.path, pressed, tone, fading } : null
	);
	/** The word in the bubble: the letters pressed so far, then all of it, in its real spelling. */
	const bubbleText = $derived.by(() => {
		if (!shown) return '';
		const spelling = shown.display.length === shown.key.length ? shown.display : shown.key;
		const text = tone === 'found' ? shown.display : spelling.slice(0, pressed);
		return text.toLocaleUpperCase(locale);
	});
	const everyone = $derived(!!shown && players.length > 1 && shown.players.length === players.length);

	/** Scores so far; at the end, the match's own scores. */
	const scores = $derived.by(() => {
		const sums = new Map(players.map((p) => [p.id, 0]));
		for (const word of words.slice(0, scored)) {
			for (const { id, points } of word.players) sums.set(id, (sums.get(id) ?? 0) + points);
		}
		if (done) for (const p of players) sums.set(p.id, p.score);
		return sums;
	});
	const scoreOf = (id: string) => scores.get(id) ?? 0;

	/** Highest score first; a tie keeps the match's order. */
	const ranking = $derived(
		players.map((p, i) => ({ p, i })).sort((a, b) => scoreOf(b.p.id) - scoreOf(a.p.id) || a.i - b.i).map(({ p }) => p)
	);
	const place = (id: string) => 1 + players.filter((p) => scoreOf(p.id) > scoreOf(id)).length;

	/** Index of the last word that gave each player points: its dot rings once for each one. */
	const lastHit = $derived.by(() => {
		const hits = new Map<string, number>();
		words.slice(0, scored).forEach((word, i) => {
			for (const { id, points } of word.players) if (points > 0) hits.set(id, i);
		});
		return hits;
	});

	const best = players.length ? Math.max(...players.map((p) => p.score)) : 0;
	const isWinner = (id: string) => crowned && best > 0 && players.find((p) => p.id === id)?.score === best;
	const headline = $derived.by(() => {
		if (!crowned) return t.counting;
		const winners = players.filter((p) => p.score === best);
		return best === 0 || winners.length !== 1 ? t.tie : t.winner(winners[0].nick);
	});

	const reduceMotion =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="results">
	<div>
		<h2 class:winner={crowned}>{headline}</h2>
		<ol class="ranking">
			{#each ranking as p (p.id)}
				<li animate:flip={{ duration: reduceMotion ? 0 : 450 }}>
					<span class="place">{place(p.id)}</span>
					{#key lastHit.get(p.id) ?? -1}
						<span
							class="dot"
							class:ring={lastHit.has(p.id)}
							style:background={tv.colorOf(p.id)}
							style:--ring={tv.colorOf(p.id)}
						></span>
					{/key}
					<span class="nick"
						>{p.nick}{#if isWinner(p.id)}&nbsp;<span class="star crowned" aria-label={t.lastWinner}
								>★</span
							>{/if}</span
					>
					<span class="pts">{scoreOf(p.id)}</span>
				</li>
			{/each}
		</ol>
	</div>
	<div class="stage">
		<div class="word-top" aria-live="polite">
			{#if shown}
				{#key current}
					<div class="bubble-row">
						<div class="bubble" class:found={tone === 'found'}>
							{#key bubbleText.length}
								<span class="word">{bubbleText}</span>
							{/key}
							<span class="badge" class:on={tone === 'found'} aria-label={t.pointsA11y(shown.points)}
								>{shown.points}</span
							>
						</div>
						<div class="finders" aria-label={t.foundBy(shown.players.map(({ id }) => nickOf(id)).join(', '))}>
							{#if everyone}
								<span class="all">{t.everyone}</span>
								{#each shown.players as { id } (id)}
									<span class="dot" style:background={tv.colorOf(id)}></span>
								{/each}
							{:else}
								{#each shown.players as { id } (id)}
									<span class="finder"
										><span class="dot" style:background={tv.colorOf(id)}></span>{nickOf(id)}</span
									>
								{/each}
							{/if}
						</div>
					</div>
				{/key}
			{:else if !words.length}
				<p class="empty muted">{t.noWords}</p>
			{/if}
		</div>
		<div class="hive-box">
			<Board {cells} word={board} />
		</div>
	</div>
	<div class="join">
		<p class="waiting muted">{t.nextMatch}</p>
		<div class="qr-small">
			<Qr class="results-qr" text={joinLink(room.code)} label={t.qrA11y} />
			<div>
				<div class="muted">{t.joinLater}</div>
				<div class="code">{room.code}</div>
			</div>
		</div>
	</div>
</div>

<style>
	.results {
		flex: 1;
		display: grid;
		/* Ranking, the word and the hive in the middle of the screen, how to join. */
		grid-template-columns: 26vw 1fr 26vw;
		gap: 2vw;
		min-height: 0;
	}
	h2 {
		margin: 0 0 1.5vh;
		font-size: clamp(18px, 2.2vw, 42px);
		font-weight: 700;
	}
	.winner {
		color: var(--gold);
	}
	.ranking {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1vh;
		font-size: clamp(16px, 2.1vw, 40px);
	}
	.ranking li {
		display: grid;
		grid-template-columns: 1.4em auto 1fr auto;
		align-items: center;
		gap: 0.5em;
		background: var(--surface);
		border-radius: 0.6em;
		padding: 0.4em 0.7em;
	}
	/* A player who just scored: their dot rings once in their color. */
	.dot.ring {
		animation: ring 700ms ease-out;
	}
	@keyframes ring {
		0%,
		100% {
			box-shadow:
				0 0 0 0.12em transparent,
				0 0 0 0.26em transparent;
		}
		35%,
		60% {
			box-shadow:
				0 0 0 0.12em var(--surface),
				0 0 0 0.26em var(--ring);
		}
	}
	/* The winner's star: from a speck to full size, spinning twice on the way. */
	.star.crowned {
		display: inline-block;
		animation: crown 1400ms both;
	}
	@keyframes crown {
		from {
			transform: scale(0.05) rotate(-720deg);
			animation-timing-function: cubic-bezier(0.45, 0, 0.3, 1);
		}
		80% {
			transform: scale(1.2) rotate(10deg);
			animation-timing-function: ease-out;
		}
		to {
			transform: scale(1) rotate(0);
		}
	}
	.place {
		font-weight: 700;
		color: var(--muted);
		text-align: center;
	}
	.nick {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		/* Room for the star to grow past its size without being clipped. */
		padding-block: 0.2em;
		margin-block: -0.2em;
	}
	.pts {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.join {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: flex-end;
		text-align: right;
	}
	.waiting {
		margin: 0;
		font-size: clamp(14px, 1.8vw, 32px);
	}
	.qr-small {
		display: flex;
		align-items: center;
		flex-direction: row-reverse;
		gap: 1.2vw;
		margin-top: 2vh;
		font-size: clamp(14px, 1.6vw, 30px);
	}
	.qr-small :global(.results-qr) {
		margin: 0;
		width: min(20vh, 12vw);
		flex: none;
	}
	.code {
		color: var(--gold);
		font-weight: 700;
		letter-spacing: 0.12em;
		font-size: 1.6em;
	}

	/* The word on top, with room to breathe; the hive fills the rest, centered. */
	.stage {
		min-height: 0;
		display: grid;
		grid-template-rows: minmax(26vh, auto) 1fr;
		gap: 2vh;
	}
	.word-top {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}
	.bubble-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.4vh;
		max-width: 100%;
	}
	/* The app's word bubble (word-bubble.tsx): brown while traced, green once found. */
	.bubble {
		--border: #9b6a3f;
		position: relative;
		max-width: 100%;
		padding: 0.15em 0.6em;
		border: 0.08em solid var(--border);
		border-radius: 0.3em;
		background: var(--tile);
		color: var(--tile-text);
		font-size: clamp(32px, 5.6vw, 120px);
		font-weight: 700;
		line-height: 1.2;
		transition: border-color 220ms cubic-bezier(0.35, 0, 0.15, 1);
		/* Settles in like a drop of honey: a little squashed, then round. */
		animation: drop 220ms ease-out both;
	}
	.bubble.found {
		--border: #4e8a35;
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: scale(1.08, 0.8);
		}
		to {
			opacity: 1;
			transform: scale(1, 1);
		}
	}
	.word {
		display: block;
		letter-spacing: 0.06em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		/* Each new letter slides down into place. */
		animation: letter-in 140ms ease-out both;
		/* The bubble keeps its height before the first letter. */
		min-height: 1.2em;
		min-width: 0.6em;
	}
	@keyframes letter-in {
		from {
			opacity: 0.5;
			transform: translateY(-0.05em);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	/* The points, in a badge hanging off the corner: swells in when the word turns green. */
	.badge {
		position: absolute;
		right: -0.45em;
		bottom: -0.45em;
		min-width: 0.9em;
		height: 0.9em;
		padding: 0 0.15em;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 0.06em solid var(--bg);
		background: var(--border);
		color: #fbf4e6;
		font-size: 0.55em;
		font-variant-numeric: tabular-nums;
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity 200ms ease-out,
			transform 200ms ease-out,
			background-color 200ms ease-out;
	}
	.badge.on {
		opacity: 1;
		transform: scale(1);
	}
	.finders {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.4em 1.1em;
		font-size: clamp(14px, 1.9vw, 36px);
	}
	.finder {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
	}
	.finders .all {
		font-weight: 700;
		color: var(--gold);
		margin-right: 0.2em;
	}
	.hive-box {
		position: relative;
		min-height: 0;
	}
	.empty {
		font-size: clamp(18px, 2.4vw, 44px);
	}
	@media (prefers-reduced-motion: reduce) {
		.dot.ring,
		.star.crowned,
		.bubble,
		.word {
			animation: none;
		}
		.badge {
			transform: none;
		}
	}
	@media (max-width: 720px) {
		.results {
			grid-template-columns: 1fr;
			overflow: auto;
		}
		.stage {
			min-height: 70vh;
		}
	}
</style>
