import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Every page is prerendered to plain HTML for GitHub Pages. GitHub Pages serves
			// `404.html` for any unknown URL; there the app shows src/routes/+error.svelte.
			adapter: adapter({ fallback: '404.html' }),
			paths: { origin: 'https://press-green.github.io' }
		})
	]
});
