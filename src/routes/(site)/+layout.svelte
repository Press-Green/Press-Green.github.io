<script lang="ts">
	import SiteFrame from '#lib/site/SiteFrame.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<SiteFrame>{@render children()}</SiteFrame>
