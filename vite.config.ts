import { paraglideVitePlugin } from '@inlang/paraglide-js'
import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const vercelOidcBrowserShim = fileURLToPath(
	new URL('./src/lib/shims/vercel-oidc-browser.ts', import.meta.url)
);

export default defineConfig({
	cacheDir: './.vite-cache',
	optimizeDeps: {
		noDiscovery: true,
		include: ['inline-style-parser', 'style-to-object'],
		exclude: [
			'svelte',
			'svelte/animate',
			'svelte/attachments',
			'svelte/events',
			'svelte/internal',
			'svelte/motion',
			'svelte/reactivity',
			'svelte/store',
			'svelte/transition'
		]
	},
	plugins: [
		{
			name: 'qamuz-vercel-oidc-browser-shim',
			enforce: 'pre',
			resolveId(source, _importer, options) {
				if (source === '@vercel/oidc' && !options?.ssr) return vercelOidcBrowserShim;
			}
		},
		{
			name: 'ignore-broken-svelte-virtual-css',
			enforce: 'pre',
			load(id) {
				const normalized = id.replaceAll('\\', '/');
				if (
					normalized.includes('/node_modules/') &&
					normalized.includes('type=style') &&
					(normalized.includes('svelte-streamdown') || normalized.includes('/bits-ui/'))
				) {
					return '';
				}
			},
			transform(code, id) {
				if (!id.includes('type=style')) return;
				const trimmed = code.trimStart();
				if (trimmed.startsWith('<script') || trimmed.startsWith('<svelte:')) {
					return { code: '/* skipped broken svelte virtual css */', map: null };
				}
			}
		},
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/paraglide',
			strategy: ['cookie', 'baseLocale']
		}),
		tailwindcss(),
		sveltekit(),
		devtoolsJson()
	],
	server: {
		allowedHosts: ['.trycloudflare.com'],
		proxy: {
			'/genaudius': {
				target: 'http://127.0.0.1:42003',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/genaudius/, '') || '/'
			},
			'/health': 'http://127.0.0.1:42003',
			'/api/music-catalog': 'http://127.0.0.1:42003',
			'/api/prompt': 'http://127.0.0.1:42003',
			'/api/generate': 'http://127.0.0.1:42003',
			'/api/codec': 'http://127.0.0.1:42003',
			'/api/mixing': 'http://127.0.0.1:42003',
			'/api/voice-pipeline': 'http://127.0.0.1:42003',
			// WAV/MP3 from GenAudius. Do not swallow the SaaS Create Music page
			// or SvelteKit data requests like /audio/__data.json.
			'/audio': {
				target: 'http://127.0.0.1:42003',
				changeOrigin: true,
				bypass(req) {
					const path = (req.url ?? '').split('?')[0];
					if (path === '/audio' || path === '/audio/' || path.includes('__data.json')) return req.url;
					const accept = String(req.headers.accept ?? '');
					if (accept.includes('text/html')) return req.url;
					return null;
				}
			}
		}
	},
	ssr: {
		noExternal: ['layerchart'],
		external: ['charsiu-js', 'onnxruntime-node', 'charsiu-js/assets-node']
	}
});
