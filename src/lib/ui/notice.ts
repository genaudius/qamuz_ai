import { toast } from 'svelte-sonner';

/** Compact helpers so call sites stay consistent and styled. */
export const notice = {
	info(title: string, description?: string) {
		toast(title, {
			description,
			duration: 4500,
			class: 'qamuz-toast'
		});
	},
	success(title: string, description?: string) {
		toast.success(title, {
			description,
			duration: 4200,
			class: 'qamuz-toast qamuz-toast-success'
		});
	},
	warning(title: string, description?: string) {
		toast.warning(title, {
			description,
			duration: 5200,
			class: 'qamuz-toast qamuz-toast-warning'
		});
	},
	error(title: string, description?: string) {
		toast.error(title, {
			description,
			duration: 5500,
			class: 'qamuz-toast qamuz-toast-error'
		});
	},
	message(title: string, description?: string) {
		toast.message(title, {
			description,
			duration: 4000,
			class: 'qamuz-toast'
		});
	}
};
