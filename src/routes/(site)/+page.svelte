<script lang="ts">
	import {
		CNPJ,
		EMAIL,
		GITHUB,
		LEGAL_NAME,
		SITE,
		STUDIO,
		WORD_SEED_STORE
	} from '#lib/site/company.ts';

	const title = 'Press Green — independent game studio';
	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Organization',
				'@id': `${SITE}/#org`,
				name: STUDIO,
				legalName: LEGAL_NAME,
				taxID: CNPJ,
				url: `${SITE}/`,
				logo: `${SITE}/assets/icon-512.png`,
				email: EMAIL,
				address: { '@type': 'PostalAddress', addressCountry: 'BR' },
				sameAs: [GITHUB]
			},
			{
				'@type': 'MobileApplication',
				name: 'Word Seed: Jogo de Palavras',
				alternateName: 'WORD SEED',
				url: WORD_SEED_STORE,
				installUrl: WORD_SEED_STORE,
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
				operatingSystem: 'Android',
				applicationCategory: 'GameApplication',
				inLanguage: ['pt-BR'],
				description:
					'A cozy word game. Find words in honeycomb letter tiles; every level won grows your tree.',
				publisher: { '@id': `${SITE}/#org` }
			}
		]
	};
	// `<` can't close the script tag early once escaped.
	const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</` + 'script>';
</script>

<svelte:head>
	<title>{title}</title>
	<meta
		name="description"
		content="Press Green is an independent game studio from Brazil. We make cozy mobile games, starting with WORD SEED, a word game where every level grows a tree. Out now on Google Play."
	/>
	<link rel="canonical" href="{SITE}/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={STUDIO} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content="Cozy mobile games from Brazil. WORD SEED is out now on Google Play." />
	<meta property="og:url" content="{SITE}/" />
	<meta property="og:image" content="{SITE}/assets/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:locale:alternate" content="pt_BR" />
	<meta name="twitter:card" content="summary_large_image" />
	{@html jsonLdTag}
</svelte:head>

<main class="wrap">
	<div class="hero">
		<img class="logo" src="/assets/logo.png" alt={STUDIO} width="680" height="731" />
		<p>An independent game studio from Brazil, making cozy mobile games.</p>
	</div>

	<section aria-labelledby="games">
		<h2 id="games">Games</h2>
		<div class="card">
			<img src="/assets/word-seed-icon.png" alt="WORD SEED app icon" width="88" height="88" />
			<div>
				<h3>WORD SEED <span class="badge">Out now</span></h3>
				<p>
					A cozy word game. Trace words across honeycomb letter tiles; every level you win grows your
					tree, and finished trees are planted in your grove. Plus a new themed daily challenge every
					day. In Brazilian Portuguese, free on Android.
				</p>
				<p class="store"><a class="button" href={WORD_SEED_STORE}>Get it on Google Play</a></p>
			</div>
		</div>
	</section>

	<section aria-labelledby="company">
		<h2 id="company">Company</h2>
		<dl class="facts">
			<dt>Studio</dt>
			<dd>{STUDIO}</dd>
			<dt>Legal name</dt>
			<dd>{LEGAL_NAME}</dd>
			<dt>CNPJ</dt>
			<dd>{CNPJ}</dd>
			<dt>Country</dt>
			<dd>Brazil</dd>
			<dt>Contact</dt>
			<dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd>
			<dt>GitHub</dt>
			<dd><a href={GITHUB} rel="me">github.com/Press-Green</a></dd>
		</dl>
	</section>

	<section aria-labelledby="legal">
		<h2 id="legal">Players</h2>
		<p>
			Read how our games handle your data in the <a href="/privacy.html">privacy policy</a>, or
			<a href="/delete-account.html">ask us to delete your account</a> and all its data.
		</p>
	</section>
</main>
