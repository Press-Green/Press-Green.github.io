<script lang="ts">
	import { CODE_LETTERS, CODE_PATTERN } from '../config.ts';
	import type { Tv } from './tv.svelte.ts';

	/** Open a room on this TV, or type the code of one that exists. */
	let { tv }: { tv: Tv } = $props();

	let code = $state('');
	let error = $state('');
	$effect.pre(() => {
		error = tv.entryError;
	});

	function typed(event: Event & { currentTarget: HTMLInputElement }) {
		code = [...event.currentTarget.value.toUpperCase()]
			.filter((c) => CODE_LETTERS.includes(c))
			.join('')
			.slice(0, 4);
		event.currentTarget.value = code;
		error = '';
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!CODE_PATTERN.test(code)) error = tv.t.badCode;
		else tv.openRoom(code);
	}

	const focus = (node: HTMLElement) => node.focus();
</script>

<main class="entry">
	<h1 class="brand">WORD <b>SEED</b> TV</h1>
	<p>{tv.t.intro}</p>
	<button class="button" type="button" onclick={() => tv.createRoom()} {@attach focus}>
		{tv.t.create}
	</button>
	<p class="muted">{tv.t.or}</p>
	<form autocomplete="off" onsubmit={submit}>
		<input
			class="code"
			value={code}
			oninput={typed}
			maxlength="4"
			inputmode="text"
			autocapitalize="characters"
			spellcheck="false"
			aria-label="Room code"
			placeholder="ABCD"
		/>
		<button class="button secondary" type="submit">{tv.t.go}</button>
	</form>
	<p class="error" role="alert">{error}</p>
</main>

<style>
	.entry {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3vh;
		padding: 16px;
		text-align: center;
	}
	h1 {
		font-size: clamp(32px, 6vw, 96px);
		margin: 0;
	}
	p {
		font-size: clamp(16px, 2vw, 32px);
		margin: 0;
		max-width: 36ch;
	}
	form {
		display: flex;
		gap: 2vw;
		flex-wrap: wrap;
		justify-content: center;
	}
	.code {
		width: 5.2ch;
		padding: 0.15em 0.3em;
		border-radius: 0.3em;
		border: 0.06em solid var(--surface-2);
		background: var(--surface);
		color: var(--text);
		font-size: clamp(48px, 9vw, 160px);
		font-weight: 700;
		letter-spacing: 0.2em;
		text-align: center;
		text-transform: uppercase;
	}
	.code:focus {
		outline: 0.05em solid var(--primary);
		outline-offset: 0.04em;
	}
	.button {
		border: 0;
		border-radius: 999px;
		padding: 0.5em 1.4em;
		cursor: pointer;
		background: var(--primary);
		color: var(--on-primary);
		font-weight: 700;
		font-size: clamp(20px, 2.6vw, 44px);
	}
	.button:focus-visible {
		outline: 0.15em solid var(--text);
		outline-offset: 0.15em;
	}
	.button.secondary {
		background: var(--surface-2);
		color: var(--text);
	}
	.error {
		color: var(--error);
		min-height: 1.6em;
	}
</style>
