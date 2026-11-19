<script lang="ts">
	import { untrack } from 'svelte';
	import type { RoomState } from '../protocol.ts';
	import { duckMusic, startMusic, stopMusic } from '../music.ts';
	import { play } from '../sound.ts';
	import Board from './Board.svelte';
	import type { Match, Tv } from './tv.svelte.ts';

	/** A match: the countdown, then the board, the clock and the live scores. */
	let { tv, state, match }: { tv: Tv; state: RoomState; match: Match } = $props();

	const toStart = $derived(match.startsAt - tv.now);
	const seconds = $derived(
		Math.max(0, Math.ceil(Math.min(match.endsAt - tv.now, match.endsAt - Math.max(tv.now, match.startsAt)) / 1000))
	);
	const clock = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
	const ending = $derived(toStart <= 0 && seconds <= 10 && seconds > 0);
	// Each number of the countdown before the match ticks as it shows, the first one included.
	const countdownNumber = $derived(toStart > 0 ? Math.ceil(toStart / 1000) : 0);
	let countdownHeard = 0;
	$effect(() => {
		const n = countdownNumber;
		if (n === countdownHeard) return;
		countdownHeard = n;
		if (n > 0) play('countdown', 0.8);
	});

	// The last seconds count out loud: a tick at 5, 4, 3, 2 and 1, when the clock reaches each
	// number (a TV that joins at 3 seconds left doesn't play it late). Time's up has its own
	// sound, played by the room (tv.svelte.ts): the results may replace this screen right at 0.
	let secondHeard = untrack(() => seconds);
	$effect(() => {
		const now = seconds;
		if (now === secondHeard) return;
		secondHeard = now;
		if (toStart > 0) return;
		if (now >= 1 && now <= 5) play('tick', 0.7);
	});

	/**
	 * The music: from the end of the countdown, lower for the last seconds so the ticks come
	 * through, out at 0. A TV that joins mid-match starts it where it joins.
	 */
	const phase = $derived(toStart > 0 ? 'countdown' : seconds > 5 ? 'playing' : seconds > 0 ? 'ending' : 'over');
	let musicOn = false;
	$effect(() => {
		if (phase === 'playing' || phase === 'ending') {
			if (!musicOn) {
				musicOn = true;
				startMusic();
			}
			duckMusic(phase === 'ending' ? 0.45 : 1);
		} else if (phase === 'over' && musicOn) {
			musicOn = false;
			stopMusic();
		}
	});
	// Leaving the match screen (results, a dropped room) ends the music too.
	$effect(() => () => stopMusic());

	const players = $derived([...state.players].sort((a, b) => b.score - a.score));
</script>

<div class="match">
	<div class="board-box">
		<Board {match} hidden={toStart > 0} />
		<div class="countdown" aria-live="assertive">
			{#if toStart > 0}
				{#key Math.ceil(toStart / 1000)}
					<span>{Math.ceil(toStart / 1000)}</span>
				{/key}
			{/if}
		</div>
	</div>
	<div class="side">
		<div class="clock" class:ending role="timer">{clock}</div>
		<ol class="scores">
			{#each players as p (p.id)}
				<li class:away={!p.connected}>
					<span class="dot" style:background={tv.colorOf(p.id)}></span>
					<span class="nick">{p.nick}</span>
					<span class="pts">{p.score}</span>
					<span class="count muted">{tv.t.words(p.words)}</span>
				</li>
			{/each}
		</ol>
	</div>
</div>

<style>
	.match {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr minmax(22vw, 28vw);
		gap: 3vw;
		min-height: 0;
	}
	.board-box {
		position: relative;
		min-height: 0;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 2.5vh;
		min-height: 0;
	}
	.clock {
		text-align: center;
		font-weight: 700;
		font-size: clamp(48px, 9vw, 180px);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.clock.ending {
		color: var(--error);
		animation: beat 1s ease-in-out infinite;
	}
	@keyframes beat {
		50% {
			transform: scale(1.06);
		}
	}
	.scores {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1.2vh;
		font-size: clamp(16px, 2.2vw, 40px);
		overflow: hidden;
	}
	.scores li {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.6em;
		background: var(--surface);
		border-radius: 0.6em;
		padding: 0.4em 0.7em;
		transition: transform 300ms;
	}
	.nick {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pts {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.count {
		grid-column: 2 / 4;
		font-size: 0.65em;
		margin-top: -0.3em;
	}
	.countdown {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: clamp(120px, 30vw, 520px);
		color: var(--gold);
		pointer-events: none;
	}
	.countdown span {
		animation: pop 500ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	@keyframes pop {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}
	@media (max-width: 720px) {
		.match {
			grid-template-columns: 1fr;
			overflow: auto;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.countdown span,
		.clock.ending {
			animation: none;
		}
	}
</style>
