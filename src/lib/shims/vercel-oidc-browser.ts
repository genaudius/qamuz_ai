// The real package is CommonJS and Vite cannot expose its named exports in the
// browser when dependency discovery is disabled. OIDC tokens are server-only;
// these browser-safe equivalents match the package's own documented behavior.
export function getContext() {
	return { headers: {} };
}

export async function getVercelOidcToken() {
	return '';
}

export function getVercelOidcTokenSync() {
	return '';
}
