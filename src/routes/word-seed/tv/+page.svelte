<script lang="ts">
	import { onMount } from 'svelte';
	import Entry from '#lib/word-seed/tv/Entry.svelte';
	import Lobby from '#lib/word-seed/tv/Lobby.svelte';
	import Match from '#lib/word-seed/tv/Match.svelte';
	import Results from '#lib/word-seed/tv/Results.svelte';
	import { Tv } from '#lib/word-seed/tv/tv.svelte.ts';
	import { duckLobbyMusic, preloadMusic, startLobbyMusic, stopLobbyMusic } from '#lib/word-seed/music.ts';
	import { preload } from '#lib/word-seed/sound.ts';

	// WORD SEED TV: shows a multiplayer room on a big screen. The app links here as
	// press-green.github.io/word-seed/tv. Everything below runs in the browser only.
	let tv = $state<Tv>();
	let idle = $state(false);

	onMount(() => {
		tv = new Tv();
		// Ready before the results, and listening for the first click or key that unlocks audio.
		for (const name of ['countdown', 'tile', 'found', 'tick', 'timesUp', 'winner', 'cheer'] as const) preload(name);
		preloadMusic();
		document.documentElement.lang = tv.lang;
		const stop = tv.start();

		// The button and the pointer hide when nobody touches anything.
		let idleTimer = 0;
		const wake = () => {
			idle = false;
			clearTimeout(idleTimer);
			idleTimer = window.setTimeout(() => (idle = true), 4000);
		};
		const events = ['mousemove', 'keydown', 'pointerdown'] as const;
		for (const type of events) addEventListener(type, wake);
		wake();

		return () => {
			stop();
			clearTimeout(idleTimer);
			for (const type of events) removeEventListener(type, wake);
		};
	});

	$effect(() => {
		document.body.classList.toggle('idle', idle);
	});

	// The lobby's music between matches: softer under the results' sounds, gone for the match
	// (its own music starts after the countdown) and when no room shows.
	$effect(() => {
		const kind = tv?.screen === 'room' ? tv.view.kind : 'none';
		if (kind === 'lobby' || kind === 'results') {
			duckLobbyMusic(kind === 'results' ? 0.35 : 1);
			startLobbyMusic();
		} else stopLobbyMusic();
	});

	function toggleFullscreen() {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else document.documentElement.requestFullscreen?.().catch(() => {});
	}
</script>

<svelte:head>
	<title>WORD SEED TV</title>
	<meta
		name="description"
		content="Show a WORD SEED multiplayer room on a TV: the board, the clock, the scores and every word found."
	/>
</svelte:head>

{#if tv}
	{#if tv.screen === 'entry'}
		<Entry {tv} />
	{:else}
		<main class="room">
			<header class="topbar">
				<div class="brand">WORD <b>SEED</b></div>
				<div class="status muted" aria-live="polite">{tv.statusLine}</div>
				<div>
					{#if tv.code}<span class="muted">{tv.t.codeLabel}</span>
						<span class="code">{tv.code}</span>{/if}
				</div>
			</header>
			<section class="stage">
				{#key tv.view.key}
					{#if tv.state && tv.view.kind === 'lobby'}
						<Lobby {tv} state={tv.state} />
					{:else if tv.state && tv.match && tv.view.kind === 'match'}
						<Match {tv} state={tv.state} match={tv.match} />
					{:else if tv.state?.results && tv.view.kind === 'results'}
						<Results {tv} state={tv.state} results={tv.state.results} />
					{/if}
				{/key}
			</section>
		</main>
	{/if}
	<button class="fullscreen" type="button" onclick={toggleFullscreen}>{tv.t.fullscreen}</button>
{/if}

<style>
	:global(html),
	:global(body) {
		height: 100%;
	}
	:global(body) {
		overflow: hidden;
		cursor: default;
	}
	:global(body.idle) {
		cursor: none;
	}
	.room {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2vw;
		padding: 1.6vh 3vw;
		font-size: clamp(16px, 2.2vw, 40px);
		flex: none;
	}
	.code {
		font-weight: 700;
		letter-spacing: 0.12em;
	}
	.status {
		font-size: 0.8em;
	}
	.stage {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 2vw;
		padding: 0 3vw 3vh;
	}
	.fullscreen {
		position: fixed;
		right: 1.5vw;
		bottom: 1.5vh;
		font-size: clamp(12px, 1.3vw, 22px);
		padding: 0.45em 1em;
		background: var(--surface);
		color: var(--muted);
		border-radius: 999px;
		border: 0;
		cursor: pointer;
		transition: opacity 400ms;
	}
	:global(body.idle) .fullscreen {
		opacity: 0;
		pointer-events: none;
	}
	@media (max-width: 720px) {
		:global(body) {
			overflow: auto;
		}
	}
</style>
