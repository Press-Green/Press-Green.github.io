<script lang="ts">
	import '#lib/word-seed/theme.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#1C2E1A" />
	<link rel="icon" href="/assets/word-seed-icon.png" type="image/png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="word-seed">{@render children()}</div>
