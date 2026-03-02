import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Static adapter for GitHub Pages deployment.
		// fallback: '404.html' enables client-side routing on GitHub Pages.
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			// In production the app is served at /omop-link/app on GitHub Pages.
			// In development (npm run dev) the base is empty so relative paths work.
			base: process.env.NODE_ENV === 'production' ? '/omop-link/app' : ''
		}
	}
};

export default config;
