<script lang="ts">
	import { onMount } from 'svelte';
	import { PACKAGE, STORE } from '#lib/word-seed/config.ts';
	import { langOf } from '#lib/word-seed/tv/strings.ts';

	// The TV's QR code lands here (see word-seed-game/src/app/+native-intent.tsx). On Android, once
	// this site's assetlinks.json lists the app, the link opens the app before this page loads.
	const STRINGS = {
		'pt-BR': {
			title: 'Entrar na sala',
			open: 'Abrir no WORD SEED',
			store: 'Baixar no Google Play',
			how: (c: string) => `Ou abra o app, toque em Multijogador e entre com o código ${c}.`,
			none: 'Abra o app e toque em Multijogador.'
		},
		en: {
			title: 'Join the room',
			open: 'Open in WORD SEED',
			store: 'Get it on Google Play',
			how: (c: string) => `Or open the app, tap Multiplayer and join with code ${c}.`,
			none: 'Open the app and tap Multiplayer.'
		}
	};

	/** Filled in the browser: the address has the code, the browser the language. */
	let page = $state<{ t: (typeof STRINGS)['en']; code: string; openLink: string }>();

	onMount(() => {
		const lang = langOf(navigator.language);
		document.documentElement.lang = lang;
		const raw = new URLSearchParams(location.search).get('code') || '';
		const code = /^[A-Za-z]{4}$/.test(raw) ? raw.toUpperCase() : '';
		const android = /android/i.test(navigator.userAgent);
		// Chrome on Android opens the app from an intent link, or the store when it isn't installed.
		const intentLink =
			`intent://join?code=${code}#Intent;scheme=wordseed;package=${PACKAGE};` +
			`S.browser_fallback_url=${encodeURIComponent(STORE)};end`;
		page = { t: STRINGS[lang], code, openLink: android ? intentLink : `wordseed://join?code=${code}` };
		// Straight to the app when the browser lets a page do that without a tap.
		if (code && android) location.href = intentLink;
	});
</script>

<svelte:head>
	<title>Join a room · WORD SEED</title>
	<meta name="description" content="Join a WORD SEED multiplayer room." />
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
<main>
	<img src="/assets/word-seed-icon.png" alt="" width="88" height="88" />
	{#if page}
		<h1>{page.t.title}</h1>
		<div class="code" aria-live="polite">{page.code}</div>
		{#if page.code}<a class="button" href={page.openLink}>{page.t.open}</a>{/if}
		<a class="button secondary" href={STORE}>{page.t.store}</a>
		<p>{page.code ? page.t.how(page.code) : page.t.none}</p>
	{/if}
</main>
</div>

<style>
	.page {
		min-height: 100vh;
		font: 500 18px/1.5 Fredoka, system-ui, sans-serif;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
	}
	main {
		width: 100%;
		max-width: 420px;
		text-align: center;
		display: grid;
		gap: 20px;
	}
	img {
		width: 88px;
		height: 88px;
		border-radius: 22px;
		margin: 0 auto;
	}
	h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 700;
	}
	.code {
		font-size: 64px;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--gold);
		line-height: 1.1;
	}
	p {
		margin: 0;
		color: var(--muted);
	}
	.button {
		display: block;
		padding: 14px 20px;
		border-radius: 999px;
		text-decoration: none;
		font-weight: 700;
		background: var(--primary);
		color: var(--on-primary);
		font-size: 20px;
	}
	.button.secondary {
		background: var(--surface);
		color: var(--text);
		font-weight: 600;
		font-size: 17px;
	}
	.button:focus-visible {
		outline: 3px solid var(--text);
		outline-offset: 3px;
	}
</style>
