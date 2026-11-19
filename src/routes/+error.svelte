<script lang="ts">
	import { page } from '$app/state';
	import SiteFrame from '#lib/site/SiteFrame.svelte';

	// GitHub Pages serves build/404.html for every unknown URL; the app then lands here.
	const missing = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{missing ? 'Page not found' : 'Something went wrong'} — Press Green</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<SiteFrame>
	<main class="wrap" style="text-align:center;padding-top:64px">
		<img src="/assets/icon.svg" alt="" width="120" height="120" />
		{#if missing}
			<h1>Page not found</h1>
			<p class="muted">Página não encontrada.</p>
		{:else}
			<h1>Something went wrong</h1>
			<p class="muted">Algo deu errado.</p>
		{/if}
		<p><a href="/">Go to the home page</a></p>
	</main>
</SiteFrame>
