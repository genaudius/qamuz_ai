import type { CachedSettings } from '$lib/server/settings-store';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Session {
			user: {
				id: string;
				isAdmin: boolean;
				planTier?: string;
				email?: string | null;
				name?: string | null;
				image?: string | null;
				emailVerified?: Date | null;
				createdAt?: Date;
				marketingConsent?: boolean;
			};
			expires: string;
		}
		interface Locals {
			settings: CachedSettings;
			auth: () => Promise<Session | null>;
			getSession: () => Promise<Session | null>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
