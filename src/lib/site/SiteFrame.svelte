<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { CNPJ, GITHUB, LEGAL_NAME, STUDIO } from './company.ts';
	import './site.css';

	/** The studio pages' header and footer, around `children`. */
	let { children }: { children: Snippet } = $props();

	const pages = [
		{ href: '/', label: 'Home' },
		{ href: '/privacy.html', label: 'Privacy' },
		{ href: '/delete-account.html', label: 'Delete account' }
	];
	const here = $derived(page.url.pathname);
</script>

<svelte:head>
	<meta name="theme-color" content="#121614" />
	<link rel="icon" href="/assets/icon.svg" type="image/svg+xml" />
	<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png" />
	<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png" />
	<link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<div class="press-green">
<header class="site">
	<div class="wrap">
		<a class="brand" href="/"
			><img src="/assets/icon.svg" alt="" width="36" height="36" /><span>{STUDIO}</span></a
		>
		<nav aria-label="Main">
			{#each pages as link (link.href)}
				<a href={link.href} aria-current={link.href === here ? 'page' : undefined}>{link.label}</a>
			{/each}
		</nav>
	</div>
</header>

{@render children()}

<footer class="site">
	<div class="wrap">
		<span>© 2026 {STUDIO} · {LEGAL_NAME} · CNPJ {CNPJ}</span>
		<span>
			{#each pages.filter((link) => link.href !== here) as link (link.href)}
				<a href={link.href}>{link.label}</a>{' · '}
			{/each}
			<a href={GITHUB}>GitHub</a>
		</span>
	</div>
</footer>
</div>
