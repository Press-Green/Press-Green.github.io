<script lang="ts">
	/**
	 * Confetti over the whole screen: two cannons in the bottom corners fire up and in, then a
	 * softer rain from the top. Paper falls with drag and flutters (it turns as it falls, so it
	 * flashes). Stops drawing once every piece is gone.
	 */
	let { colors }: { colors: string[] } = $props();

	let canvas: HTMLCanvasElement;

	type Piece = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		color: string;
		angle: number;
		spin: number;
		/** Phase and speed of the flutter (the piece turning over). */
		flip: number;
		flipSpeed: number;
		round: boolean;
	};

	$effect(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		let width = 0;
		let height = 0;
		const resize = () => {
			width = canvas.clientWidth;
			height = canvas.clientHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		addEventListener('resize', resize);

		const pieces: Piece[] = [];
		const unit = Math.max(6, Math.min(width, height) / 90);
		const add = (x: number, y: number, vx: number, vy: number) =>
			pieces.push({
				x,
				y,
				vx,
				vy,
				size: unit * (0.7 + Math.random() * 0.8),
				color: colors[Math.floor(Math.random() * colors.length)],
				angle: Math.random() * Math.PI * 2,
				spin: (Math.random() - 0.5) * 0.3,
				flip: Math.random() * Math.PI * 2,
				flipSpeed: 0.08 + Math.random() * 0.12,
				round: Math.random() < 0.2
			});
		/** A burst from a corner, aimed up and toward the middle. */
		const cannon = (fromLeft: boolean, count: number) => {
			for (let i = 0; i < count; i++) {
				const angle = -Math.PI / 2 + (fromLeft ? 1 : -1) * (0.15 + Math.random() * 0.55);
				const speed = height * (0.022 + Math.random() * 0.018);
				add(fromLeft ? -10 : width + 10, height * 0.95, Math.cos(angle) * speed, Math.sin(angle) * speed);
			}
		};
		const rain = (count: number) => {
			for (let i = 0; i < count; i++) {
				add(Math.random() * width, -20 - Math.random() * height * 0.4, (Math.random() - 0.5) * 2, Math.random() * 2);
			}
		};

		let frame = 0;
		/** Bursts still to fire: drawing stops once they're out and every piece has landed. */
		let pending = 3;
		const fire = (ms: number, run: () => void) =>
			window.setTimeout(() => {
				run();
				pending--;
				if (!frame) frame = requestAnimationFrame(draw);
			}, ms);
		const timers = [
			fire(0, () => (cannon(true, 90), cannon(false, 90))),
			fire(450, () => (cannon(true, 50), cannon(false, 50))),
			fire(1100, () => rain(120))
		];

		const GRAVITY = unit * 0.035;
		let last = performance.now();
		const draw = (now: number) => {
			// Steps of a 60 Hz frame, whatever the TV's rate (and no jump after a hidden tab).
			const dt = Math.min(3, (now - last) / (1000 / 60));
			last = now;
			ctx.clearRect(0, 0, width, height);
			for (let i = pieces.length - 1; i >= 0; i--) {
				const p = pieces[i];
				p.vx *= Math.pow(0.985, dt);
				p.vy = p.vy * Math.pow(0.985, dt) + GRAVITY * dt;
				// Paper doesn't fall faster than this: it floats down.
				p.vy = Math.min(p.vy, unit * 0.45);
				p.flip += p.flipSpeed * dt;
				p.x += (p.vx + Math.sin(p.flip) * unit * 0.08) * dt;
				p.y += p.vy * dt;
				p.angle += p.spin * dt;
				if (p.y > height + 40) {
					pieces.splice(i, 1);
					continue;
				}
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.angle);
				ctx.scale(1, Math.cos(p.flip));
				ctx.fillStyle = p.color;
				if (p.round) {
					ctx.beginPath();
					ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
					ctx.fill();
				} else {
					ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
				}
				ctx.restore();
			}
			frame = pieces.length || pending ? requestAnimationFrame(draw) : 0;
		};

		return () => {
			cancelAnimationFrame(frame);
			timers.forEach(clearTimeout);
			removeEventListener('resize', resize);
		};
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 10;
	}
</style>
