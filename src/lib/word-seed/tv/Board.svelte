<script lang="ts">
	import { CELL_RATIO } from '../config.ts';
	import { cellKey } from '../protocol.ts';
	import type { Match } from './tv.svelte.ts';

	/**
	 * The match's hive, scaled to fit. Tiles are keyed by cell, so a growth slides the old ones to
	 * their new places while the new ones pop in.
	 */
	let { match, hidden }: { match: Match; hidden: boolean } = $props();

	let width = $state(0);
	let height = $state(0);

	const tiles = $derived.by(() => {
		const cells = match.cells;
		if (!cells.length || !width || !height) return [];
		// Bounds in tile widths.
		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		for (const cell of cells) {
			const x = cell.column * 0.75, y = cell.y * CELL_RATIO;
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x + 1);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y + CELL_RATIO);
		}
		const size = Math.min(width / (maxX - minX), height / (maxY - minY), height / 3);
		const gap = size * 0.04;
		const left = (width - (maxX - minX) * size) / 2;
		const top = (height - (maxY - minY) * size) / 2;
		return cells.map((cell) => ({
			key: cellKey(cell),
			letter: cell.letter,
			left: left + (cell.column * 0.75 - minX) * size + gap / 2,
			top: top + (cell.y * CELL_RATIO - minY) * size + gap / 2,
			width: size - gap,
			height: (size - gap) * CELL_RATIO,
			font: size * 0.42
		}));
	});
</script>

<div class="board" bind:clientWidth={width} bind:clientHeight={height}>
	{#each tiles as tile (tile.key)}
		<div
			class="tile"
			class:new={match.fresh.has(tile.key)}
			style:left="{tile.left}px"
			style:top="{tile.top}px"
			style:width="{tile.width}px"
			style:height="{tile.height}px"
			style:visibility={hidden ? 'hidden' : null}
		>
			<span style:font-size="{tile.font}px">{tile.letter}</span>
		</div>
	{/each}
</div>

<style>
	.board {
		position: absolute;
		inset: 0;
	}
	.tile {
		--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
		background: var(--tile-edge);
		transition:
			left 420ms var(--ease),
			top 420ms var(--ease),
			width 420ms var(--ease),
			height 420ms var(--ease);
	}
	.tile::before {
		content: '';
		position: absolute;
		inset: 5% 4% 9%;
		clip-path: inherit;
		background: var(--tile);
	}
	.tile span {
		position: relative;
		color: var(--tile-text);
		font-weight: 700;
		text-transform: uppercase;
		line-height: 1;
		margin-bottom: 4%;
	}
	.tile.new {
		animation: pop 520ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
	}
	@keyframes pop {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tile,
		.tile.new {
			transition: none;
			animation: none;
		}
	}
</style>
