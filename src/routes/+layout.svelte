<script lang="ts">
	import type { LayoutProps } from './$types';

	// Each part of the site brings its own look: (site)/+layout.svelte for the studio pages,
	// word-seed/ for the game's pages.
	let { children }: LayoutProps = $props();
</script>

{@render children()}
