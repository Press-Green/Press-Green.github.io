<script lang="ts" module>
	/**
	 * A word drawn on the board, as in the app: its first `pressed` tiles darken one by one and join
	 * edge to edge with honey, turn green when it's found, then fade back to plain.
	 */
	export type ShownWord = {
		/** Cell indexes, in order. */
		path: number[];
		/** How many of the path's tiles are pressed so far. */
		pressed: number;
		tone: 'active' | 'found';
		/** Turning back to plain. */
		fading: boolean;
	};
</script>

<script lang="ts">
	import { CELL_RATIO } from '../config.ts';
	import { cellKey, type BoardCell } from '../protocol.ts';

	/**
	 * A hive, scaled to fit. Tiles are keyed by cell, so a growth slides the old ones to their new
	 * places while the new ones pop in.
	 */
	let {
		cells,
		fresh = new Set(),
		hidden = false,
		word = null
	}: { cells: BoardCell[]; fresh?: Set<string>; hidden?: boolean; word?: ShownWord | null } = $props();

	let width = $state(0);
	let height = $state(0);

	const layout = $derived.by(() => {
		if (!cells.length || !width || !height) return null;
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
		const tiles = cells.map((cell) => {
			const x = left + (cell.column * 0.75 - minX) * size + gap / 2;
			const y = top + (cell.y * CELL_RATIO - minY) * size + gap / 2;
			const w = size - gap;
			const h = (size - gap) * CELL_RATIO;
			return {
				key: cellKey(cell),
				letter: cell.letter,
				left: x,
				top: y,
				width: w,
				height: h,
				center: { x: x + w / 2, y: y + h / 2 },
				font: size * 0.42
			};
		});
		return { tiles, size, gap };
	});

	/** The word's pressed tiles: they darken (or turn green) and sink a little. */
	const pressed = $derived(new Set(word && !word.fading ? word.path.slice(0, word.pressed) : []));

	/** One join per step of the word, across the gap between the two tiles' facing edges. */
	const bridges = $derived.by(() => {
		if (!layout || !word) return [];
		const { size, gap } = layout;
		const tile = size - gap;
		// As in the app (letter-hive.tsx): a pill across the gap, as wide as the straight part of
		// a tile's edge.
		const length = gap + tile * 0.2;
		const thickness = (tile / 2) * 0.72;
		const steps = [];
		for (let i = 1; i < Math.min(word.pressed, word.path.length); i++) {
			const a = layout.tiles[word.path[i - 1]]?.center;
			const b = layout.tiles[word.path[i]]?.center;
			if (!a || !b) continue;
			steps.push({
				key: `${word.path[i - 1]}-${word.path[i]}`,
				left: (a.x + b.x) / 2 - length / 2,
				top: (a.y + b.y) / 2 - thickness / 2,
				length,
				thickness,
				angle: Math.atan2(b.y - a.y, b.x - a.x),
				rim: tile * 0.06
			});
		}
		return steps;
	});
</script>

{#snippet joins(layer: 'rim' | 'face')}
	{#each bridges as step (step.key)}
		<div
			class="bridge {layer}"
			class:found={word?.tone === 'found'}
			class:fading={word?.fading}
			style:left="{step.left}px"
			style:top="{step.top + (layer === 'rim' ? step.rim : 0)}px"
			style:width="{step.length}px"
			style:height="{step.thickness}px"
			style:transform="rotate({step.angle}rad)"
		>
			<span></span>
		</div>
	{/each}
{/snippet}

<div class="board" bind:clientWidth={width} bind:clientHeight={height}>
	<!-- The joins' rim sits under the tiles, like the tiles' own rim; their face over them. -->
	{@render joins('rim')}
	{#each layout?.tiles ?? [] as tile, index (tile.key)}
		<div
			class="tile"
			class:new={fresh.has(tile.key)}
			class:traced={pressed.has(index)}
			class:found={pressed.has(index) && word?.tone === 'found'}
			style:left="{tile.left}px"
			style:top="{tile.top}px"
			style:width="{tile.width}px"
			style:height="{tile.height}px"
			style:visibility={hidden ? 'hidden' : null}
		>
			<span style:font-size="{tile.font}px">{tile.letter}</span>
		</div>
	{/each}
	{@render joins('face')}
</div>

<style>
	.board {
		position: absolute;
		inset: 0;
		/* The app's traced and found tiles (word-seed-game/src/constants/theme.ts, dark). */
		--tile-active: #9b6a3f;
		--tile-active-edge: #6b4226;
		--tile-found: #4e8a35;
		--tile-found-edge: #2e5a20;
		--tile-active-text: #fbf4e6;
		/* The app's TILE_COLOR_MS. */
		--color-ms: 180ms;
	}
	.tile {
		--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
		--face: var(--tile);
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
			height 420ms var(--ease),
			background-color var(--color-ms) ease-out,
			transform 160ms ease-out;
	}
	.tile::before {
		content: '';
		position: absolute;
		inset: 5% 4% 9%;
		clip-path: inherit;
		background: var(--tile);
		transition: background-color var(--color-ms) ease-out;
	}
	.tile span {
		position: relative;
		color: var(--tile-text);
		font-weight: 700;
		text-transform: uppercase;
		line-height: 1;
		margin-bottom: 4%;
		transition: color var(--color-ms) ease-out;
	}
	/* A pressed tile darkens and sinks a little, as in the app; a found word's turn green. */
	.tile.traced {
		background: var(--tile-active-edge);
		transform: scale(0.94);
	}
	.tile.traced::before {
		background: var(--tile-active);
	}
	.tile.traced span {
		color: var(--tile-active-text);
	}
	.tile.found {
		background: var(--tile-found-edge);
	}
	.tile.found::before {
		background: var(--tile-found);
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

	/* A join: a pill of honey across the gap, with fully rounded ends. */
	.bridge {
		position: absolute;
		transition: opacity 150ms ease-out;
	}
	.bridge.fading {
		opacity: 0;
	}
	.bridge span {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 999px;
		transition: background-color var(--color-ms) ease-out;
		/* Flows in like honey stretching between two spoons: a thin, short thread that thickens. */
		animation: honey 260ms ease-out both;
	}
	.bridge.rim span {
		background: var(--tile-active-edge);
	}
	.bridge.face span {
		background: var(--tile-active);
	}
	.bridge.rim.found span {
		background: var(--tile-found-edge);
	}
	.bridge.face.found span {
		background: var(--tile-found);
	}
	@keyframes honey {
		from {
			transform: scale(0.5, 0.15);
		}
		60% {
			transform: scale(1, 0.6);
		}
		to {
			transform: scale(1, 1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tile,
		.tile.new {
			transition:
				background-color var(--color-ms) ease-out,
				color var(--color-ms) ease-out;
			animation: none;
		}
		.tile.traced {
			transform: none;
		}
		.bridge span {
			animation: none;
		}
	}
</style>
