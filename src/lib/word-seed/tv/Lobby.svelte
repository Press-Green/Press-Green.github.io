<script lang="ts">
	import Qr from '../Qr.svelte';
	import type { RoomState } from '../protocol.ts';
	import { joinLink } from './join-link.ts';
	import type { Tv } from './tv.svelte.ts';

	/** Before a match: the code and QR code to join, who's in, and the room's rules. */
	let { tv, state }: { tv: Tv; state: RoomState } = $props();

	const t = $derived(tv.t);
	// The last match's winners (ties included) wear a star until the next match starts.
	const winners = $derived.by(() => {
		const players = state.results?.players ?? [];
		const best = Math.max(0, ...players.map((p) => p.score));
		return new Set(best > 0 ? players.filter((p) => p.score === best).map((p) => p.id) : []);
	});
	const host = $derived(state.players.find((p) => p.id === state.hostId));
</script>

<div class="lobby">
	<div class="join-card">
		<div class="label muted">{t.codeLabel}</div>
		<div class="big-code">{state.code}</div>
		<Qr class="lobby-qr" text={joinLink(state.code)} label={t.qrA11y} />
		<p class="how muted">{t.joinHow}</p>
	</div>
	<div class="panel">
		<h2>{t.players(state.players.length)}</h2>
		<ul class="players">
			{#each state.players as p (p.id)}
				<li class:away={!p.connected}>
					<span class="crown" aria-hidden="true">{p.id === state.hostId ? '♛' : ''}</span>
					<span class="dot" style:background={tv.colorOf(p.id)}></span>
					<span>{p.nick}</span>
					{#if winners.has(p.id)}
						<span class="star" title={t.lastWinner} aria-label={t.lastWinner}>★</span>
					{/if}
				</li>
			{:else}
				<li class="muted">{t.nobody}</li>
			{/each}
		</ul>
		<div class="rules">
			<span class="chip">{t.minutes(state.config.duration)}</span>
			<span class="chip">{t.hive[state.config.hive] || state.config.hive}</span>
			<span class="chip">{t.grows(state.config.growEvery)}</span>
		</div>
		<div class="waiting muted">
			{state.players.length ? t.waitingHost(host?.nick) : t.firstHosts}
		</div>
	</div>
</div>

<style>
	.lobby {
		flex: 1;
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 3vw;
		align-items: center;
	}
	.join-card {
		text-align: center;
	}
	.label {
		font-size: clamp(18px, 2.6vw, 48px);
	}
	.big-code {
		font-size: clamp(56px, 10vw, 200px);
		font-weight: 700;
		letter-spacing: 0.12em;
		line-height: 1.1;
		color: var(--gold);
	}
	.how {
		font-size: clamp(16px, 2vw, 36px);
		max-width: 26ch;
		margin: 1vh auto 0;
	}
	.join-card :global(.lobby-qr) {
		margin: 2vh auto 0;
		width: min(30vh, 22vw);
	}
	.panel {
		background: var(--surface);
		border-radius: 2vw;
		padding: 2.5vw;
	}
	h2 {
		margin: 0 0 1.5vh;
		font-size: clamp(20px, 2.6vw, 48px);
		font-weight: 600;
	}
	.players {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 1vh;
		font-size: clamp(18px, 2.4vw, 44px);
	}
	.players li {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
	.players li.away {
		opacity: 0.45;
	}
	.crown {
		color: var(--gold);
		width: 1.1em;
		flex: none;
		text-align: center;
	}
	.rules {
		margin-top: 2.5vh;
		display: flex;
		flex-wrap: wrap;
		gap: 1vw;
		font-size: clamp(14px, 1.8vw, 32px);
	}
	.chip {
		background: var(--surface-2);
		border-radius: 999px;
		padding: 0.25em 0.8em;
	}
	.waiting {
		margin-top: 2vh;
		font-size: clamp(14px, 1.8vw, 32px);
	}
	@media (max-width: 720px) {
		.lobby {
			grid-template-columns: 1fr;
			overflow: auto;
		}
	}
</style>
