<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import Qr from '../Qr.svelte';
	import { play } from '../sound.ts';
	import type { MatchResult, RoomState } from '../protocol.ts';
	import { joinLink } from './join-link.ts';
	import type { Tv } from './tv.svelte.ts';

	/**
	 * After a match, the words found are reviewed one by one, shortest first, each new word below the others. Each word adds its
	 * points to the players who found it, and the ranking reorders as the scores grow. The winner's
	 * headline and gold star wait for the last word.
	 */
	let { tv, state: room, results }: { tv: Tv; state: RoomState; results: MatchResult } = $props();

	type Word = { key: string; display: string; players: { id: string; points: number }[] };

	const t = $derived(tv.t);
	const locale = $derived(tv.lang);
	// The review plays once per match: later states (a player leaving) don't restart it.
	const match = untrack(() => results);
	const players = match.players;
	const nickOf = (id: string) => players.find((p) => p.id === id)?.nick ?? '';

	/** Every word found, once, shortest first (then A–Z), with who found it and their points. */
	const words: Word[] = untrack(() => {
		const byKey = new Map<string, Word>();
		for (const player of players) {
			for (const word of player.words) {
				const entry = byKey.get(word.key) ?? { key: word.key, display: word.display || word.key, players: [] };
				if (word.display && entry.display === entry.key) entry.display = word.display;
				entry.players.push({ id: player.id, points: word.points });
				byKey.set(word.key, entry);
			}
		}
		const collator = new Intl.Collator(tv.lang);
		return [...byKey.values()].sort(
			(a, b) => a.key.length - b.key.length || collator.compare(a.display, b.display)
		);
	});
	// Fewer words, bigger type: the list should fit the screen when it can.
	const wordSize =
		words.length <= 12 ? 2.6 : words.length <= 30 ? 2.1 : words.length <= 60 ? 1.7 : 1.35;

	// ---- The review -----------------------------------------------------------------------------
	/** Words on screen so far. */
	/** Longest review, first word to last: time to read along without the room waiting. */
	const REVIEW_MS = 7500;
	/** Slowest pace, for a short list: about one word per beat. */
	const MAX_STEP = 800;
	const FIRST_WORD_DELAY = 800;
	let shown = $state(0);
	const done = $derived(shown >= words.length);
	/** A beat after the last word: the headline and the gold star. */
	let crowned = $state(false);

	$effect(() => {
		// From the first word to the last: at most REVIEW_MS, so a long list plays faster. A short
		// one keeps an easy pace instead of stretching to fill the time.
		const step = Math.min(MAX_STEP, REVIEW_MS / Math.max(1, words.length - 1));
		const crown = () =>
			(timer = window.setTimeout(() => {
				crowned = true;
				// With the star: no star (nobody scored), no sound.
				if (best > 0) play('winner', 0.9);
			}, 900));
		let timer = window.setTimeout(function next() {
			shown++;
			play('word', 0.7);
			if (shown < words.length) timer = window.setTimeout(next, step);
			else crown();
		}, FIRST_WORD_DELAY);
		if (!words.length) {
			clearTimeout(timer);
			crown();
		}
		return () => clearTimeout(timer);
	});

	/** Scores so far; at the end, the match's own scores. */
	const scores = $derived.by(() => {
		const sums = new Map(players.map((p) => [p.id, 0]));
		for (const word of words.slice(0, shown)) {
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
		words.slice(0, shown).forEach((word, i) => {
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

	/**
	 * While the words come in, the list follows the newest one, at the bottom. Afterwards, a list taller than the
	 * screen scrolls by itself, slowly, pausing at both ends: nobody holds a remote to scroll it.
	 */
	function autoScroll(box: HTMLElement) {
		let frame = 0;
		let direction = 1;
		let pauseUntil = 0;
		let reviewing = true;
		// Kept here, not read back from scrollTop: some browsers round it to whole pixels.
		let position = 0;
		let last = performance.now();
		const step = (now: number) => {
			const room = box.scrollHeight - box.clientHeight;
			if (reviewing) {
				if (room > 0) position += (room - position) * 0.15;
				if (done && room - position < 1) {
					reviewing = false;
					position = Math.max(0, room);
					direction = -1;
					pauseUntil = now + 4000;
				}
			} else if (room > 2 && now > pauseUntil) {
				position += direction * Math.max(0.5, (now - last) * 0.03);
				if (position >= room || position <= 0) {
					position = Math.min(room, Math.max(0, position));
					direction = -direction;
					pauseUntil = now + 4000;
				}
			}
			box.scrollTop = position;
			last = now;
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}
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
		<p class="waiting muted">{t.nextMatch}</p>
		<div class="qr-small">
			<Qr class="results-qr" text={joinLink(room.code)} label={t.qrA11y} />
			<div>
				<div class="muted">{t.joinLater}</div>
				<div class="code">{room.code}</div>
			</div>
		</div>
	</div>
	<div class="words-box">
		<h2>{t.wordsFound}</h2>
		<div class="words-scroll" {@attach autoScroll}>
			{#if words.length}
				<ul class="words" style:--word-size="{wordSize}vw" style:--word-col="{wordSize * 11}vw">
					{#each words.slice(0, shown) as word (word.key)}
						<li class:shared={word.players.length > 1} in:fade={{ duration: reduceMotion ? 0 : 250 }}>
							<span class="word">{word.display.toLocaleUpperCase(locale)}</span>
							<span class="len">{t.letters(word.key.length)}</span>
							<span class="who" aria-label={word.players.map(({ id }) => nickOf(id)).join(', ')}>
								{#each word.players as { id } (id)}
									<span class="dot" style:background={tv.colorOf(id)}></span>
								{/each}
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty muted">{t.noWords}</p>
			{/if}
		</div>
		<div class="legend">
			{#each players as p (p.id)}
				<span><span class="dot" style:background={tv.colorOf(p.id)}></span>{p.nick}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.results {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(24vw, 30vw) 1fr;
		gap: 3vw;
		min-height: 0;
	}
	h2 {
		margin: 0 0 1.5vh;
		font-size: clamp(20px, 2.8vw, 52px);
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
	@media (prefers-reduced-motion: reduce) {
		.dot.ring {
			animation: none;
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
	@media (prefers-reduced-motion: reduce) {
		.star.crowned {
			animation: none;
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
	.waiting {
		margin-top: 2vh;
		font-size: clamp(14px, 1.8vw, 32px);
	}
	.qr-small {
		display: flex;
		align-items: center;
		gap: 1.2vw;
		margin-top: 3vh;
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
	.words-box {
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.words-scroll {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}
	.words {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--word-col, 24vw), 1fr));
		gap: 0.6vh 1.5vw;
		font-size: var(--word-size, 2vw);
	}
	.words li {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.25em 0.6em;
		border-radius: 0.5em;
		background: var(--surface);
		min-width: 0;
	}
	.words li.shared {
		background: var(--surface-2);
	}
	.word {
		font-weight: 700;
		text-transform: uppercase;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.len {
		font-size: 0.7em;
		color: var(--muted);
		white-space: nowrap;
	}
	.who {
		margin-left: auto;
		display: flex;
		gap: 0.2em;
		flex: none;
	}
	.who .dot {
		width: 0.55em;
		height: 0.55em;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4em 1.2em;
		margin-top: 1.2vh;
		font-size: clamp(12px, 1.5vw, 28px);
	}
	.legend > span {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
	}
	.empty {
		font-size: clamp(18px, 2.4vw, 44px);
	}
	@media (max-width: 720px) {
		.results {
			grid-template-columns: 1fr;
			overflow: auto;
		}
	}
</style>
