/**
 * Elegant in-app notices and confirms (replaces window.alert / window.confirm).
 */

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export type NoticeRequest = {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string | null;
	tone?: NoticeTone;
	/** If false, only primary action (alert style). Default true when cancelLabel set. */
	showCancel?: boolean;
};

type Pending = NoticeRequest & { resolve: (ok: boolean) => void };

class AppNoticeStore {
	open = $state(false);
	request = $state<NoticeRequest | null>(null);
	#resolve: ((ok: boolean) => void) | null = null;

	confirm(input: NoticeRequest): Promise<boolean> {
		return new Promise((resolve) => {
			this.#resolve?.(false);
			this.#resolve = resolve;
			this.request = {
				tone: 'info',
				confirmLabel: 'Continuar',
				cancelLabel: 'Cancelar',
				showCancel: true,
				...input
			};
			this.open = true;
		});
	}

	/** Single-button notice. */
	alert(input: Omit<NoticeRequest, 'cancelLabel' | 'showCancel'>): Promise<void> {
		return this.confirm({
			...input,
			confirmLabel: input.confirmLabel ?? 'Entendido',
			cancelLabel: null,
			showCancel: false
		}).then(() => undefined);
	}

	settle(ok: boolean): void {
		this.open = false;
		const resolve = this.#resolve;
		this.#resolve = null;
		this.request = null;
		resolve?.(ok);
	}
}

export const appNotice = new AppNoticeStore();
