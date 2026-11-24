<script lang="ts">
	import { play } from '../sound.ts';
	import Confetti from './Confetti.svelte';

	export type Tier = { players: { id: string; nick: string; score: number }[] };

	/**
	 * The end of the results: a podium for the three best scores (players tied share a step).
	 * The steps rise one by one, third, second, then first, each with a tile's knock; then the
	 * winner drops onto the top step under a golden star, light turns behind them, confetti flies and
	 * the crowd cheers.
	 */
	let {
		tiers,
		colorOf,
		title,
		reduceMotion
	}: { tiers: Tier[]; colorOf: (id: string) => string; title: string; reduceMotion: boolean } = $props();

	/** Second on the left, first in the middle, third on the right. */
	const slots = $derived(
		[1, 0, 2].filter((i) => i < tiers.length).map((i) => ({ place: i + 1, tier: tiers[i] }))
	);

	/** When each step rises, from the podium's start (ms): third first, the winner last. */
	const RISE_AT = [1000, 500, 0];
	const WINNER_AT = 1600;

	let celebrating = $state(false);
	$effect(() => {
		const timers: number[] = [];
		const at = (ms: number, run: () => void) => timers.push(window.setTimeout(run, reduceMotion ? 0 : ms));
		for (let i = 0; i < tiers.length; i++) at(RISE_AT[i] + 250, () => play('tile', 0.8));
		at(WINNER_AT, () => {
			celebrating = true;
			play('cheer', 0.9);
		});
		return () => timers.forEach(clearTimeout);
	});

	const initial = (nick: string) => [...nick.trim()][0]?.toLocaleUpperCase() ?? '?';
	const confettiColors = $derived([
		'#f7c548',
		'#fbf4e6',
		...tiers[0].players.map((p) => colorOf(p.id)),
		'#8fd46a',
		'#f29bc0',
		'#7ec8f2'
	]);
</script>

<div class="podium" class:still={reduceMotion}>
	<h3 class="title" class:on={celebrating}>{title}</h3>
	<div class="steps">
		{#each slots as { place, tier } (place)}
			<div
				class="slot"
				class:first={place === 1}
				style:--rise={`${RISE_AT[place - 1]}ms`}
				style:--land={`${place === 1 ? WINNER_AT - 400 : RISE_AT[place - 1] + 350}ms`}
			>
				<div class="people">
					{#each tier.players as p (p.id)}
						<div class="person">
							{#if place === 1}
								<span class="winner-star" aria-hidden="true">★</span>
							{/if}
							<span class="avatar" style:background={colorOf(p.id)}>{initial(p.nick)}</span>
							<span class="nick">{p.nick}</span>
							<span class="score">{p.score}</span>
						</div>
					{/each}
				</div>
				<div class="step">
					<span class="number">{place}</span>
				</div>
				{#if place === 1}
					<div class="rays" class:on={celebrating} aria-hidden="true"></div>
				{/if}
			</div>
		{/each}
	</div>
</div>

{#if celebrating && !reduceMotion}
	<Confetti colors={confettiColors} />
{/if}

<style>
	.podium {
		height: 100%;
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 2vh;
		min-height: 0;
	}
	.title {
		margin: 0;
		text-align: center;
		color: var(--gold);
		font-size: clamp(32px, 5vw, 110px);
		font-weight: 700;
		line-height: 1.1;
		opacity: 0;
		transform: scale(0.6);
	}
	.title.on {
		animation: title-in 700ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	@keyframes title-in {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.steps {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 1vw;
		min-height: 0;
		padding-bottom: 1vh;
	}
	.slot {
		position: relative;
		flex: 0 1 13vw;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		height: 100%;
	}
	.slot.first {
		flex-basis: 15vw;
		z-index: 1;
	}

	/* The steps: wood-and-honey blocks, rising from the floor. */
	.step {
		width: 100%;
		display: flex;
		justify-content: center;
		padding-top: 0.15em;
		border-radius: 0.25em 0.25em 0 0;
		background: linear-gradient(180deg, var(--tile) 0, var(--tile) 18%, var(--tile-edge) 18.1%, #8a5d33 100%);
		box-shadow: inset 0 -0.4em 0.8em rgb(0 0 0 / 25%);
		color: var(--tile-text);
		font-size: clamp(40px, 6vw, 130px);
		font-weight: 700;
		transform-origin: bottom;
		animation: rise 600ms cubic-bezier(0.25, 1.4, 0.5, 1) var(--rise) both;
	}
	.slot:nth-child(1) .step {
		height: 34%;
	}
	.slot.first .step {
		height: 48%;
	}
	.slot:nth-child(3) .step {
		height: 24%;
	}
	/* A single player: just the top step, in the middle. */
	.slot.first:only-child .step {
		height: 42%;
	}
	.number {
		line-height: 1;
	}
	@keyframes rise {
		from {
			transform: scaleY(0);
		}
		to {
			transform: scaleY(1);
		}
	}

	.people {
		display: flex;
		justify-content: center;
		gap: 0.8vw;
		width: 100%;
		margin-bottom: 1vh;
	}
	.person {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 0;
		font-size: clamp(14px, 1.7vw, 34px);
		/* Drops onto the step once it has risen, with a little squash. */
		animation: land 650ms var(--land) both;
	}
	.first .person {
		font-size: clamp(16px, 2.2vw, 44px);
	}
	@keyframes land {
		0% {
			opacity: 0;
			transform: translateY(-60vh);
			animation-timing-function: cubic-bezier(0.5, 0, 1, 0.6);
		}
		60% {
			opacity: 1;
			transform: translateY(0) scale(1.15, 0.85);
			animation-timing-function: ease-out;
		}
		80% {
			transform: translateY(-4%) scale(0.95, 1.05);
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}
	.avatar {
		width: 2.6em;
		height: 2.6em;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--on-primary);
		font-weight: 700;
		font-size: 1.3em;
		border: 0.12em solid var(--bg);
		box-shadow: 0 0 0 0.1em var(--gold);
	}
	.first .avatar {
		width: 3.2em;
		height: 3.2em;
		box-shadow:
			0 0 0 0.12em var(--gold),
			0 0 1.2em rgb(247 197 72 / 60%);
	}
	.nick {
		margin-top: 0.3em;
		font-weight: 700;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.score {
		color: var(--gold);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	/* The winner's golden star (the winner's mark on every screen): comes down a beat after them, then rocks gently. */
	.winner-star {
		position: absolute;
		top: -1.1em;
		left: 50%;
		translate: -50% 0;
		color: var(--gold);
		font-size: 1.6em;
		line-height: 1;
		text-shadow: 0 0.05em 0.3em rgb(0 0 0 / 40%);
		animation:
			star-in 700ms cubic-bezier(0.3, 1.6, 0.5, 1) calc(var(--land) + 500ms) both,
			rock 2.4s ease-in-out calc(var(--land) + 1200ms) infinite;
	}
	@keyframes star-in {
		from {
			opacity: 0;
			transform: translateY(-1.5em) scale(0.3) rotate(-30deg);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes rock {
		0%,
		100% {
			transform: rotate(-8deg);
		}
		50% {
			transform: rotate(8deg) translateY(-0.08em);
		}
	}

	/* Light turning behind the winner. */
	.rays {
		position: absolute;
		left: 50%;
		bottom: 30%;
		width: 42vw;
		aspect-ratio: 1;
		translate: -50% 50%;
		z-index: -1;
		pointer-events: none;
		background: repeating-conic-gradient(rgb(247 197 72 / 22%) 0 10deg, transparent 10deg 24deg);
		mask: radial-gradient(circle, #000 0, #000 15%, transparent 65%);
		opacity: 0;
		transition: opacity 800ms ease-out;
		animation: turn 24s linear infinite;
	}
	.rays.on {
		opacity: 1;
	}
	@keyframes turn {
		to {
			rotate: 360deg;
		}
	}

	.still .step,
	.still .person,
	.still .winner-star,
	.still .rays,
	.still .title.on {
		animation: none;
	}
	.still .title {
		opacity: 1;
		transform: none;
	}
</style>
