<script lang="ts">
	import qrcode from 'qrcode-generator';

	/** A QR code for `text`, as crisp SVG squares on the theme's light color. */
	let { text, label, class: className = '' }: { text: string; label: string; class?: string } =
		$props();

	const QUIET = 2;
	const qr = $derived.by(() => {
		const code = qrcode(0, 'M');
		code.addData(text);
		code.make();
		const count = code.getModuleCount();
		let path = '';
		for (let row = 0; row < count; row++) {
			for (let col = 0; col < count; col++) {
				if (code.isDark(row, col)) path += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
			}
		}
		return { path, size: count + QUIET * 2 };
	});
</script>

<svg
	class="qr {className}"
	viewBox="0 0 {qr.size} {qr.size}"
	role="img"
	aria-label={label}
	shape-rendering="crispEdges"
>
	<rect width={qr.size} height={qr.size} fill="#FBF4E6" />
	<path d={qr.path} fill="#1C2E1A" />
</svg>

<style>
	.qr {
		display: block;
		height: auto;
		border-radius: 1.2vw;
	}
</style>
