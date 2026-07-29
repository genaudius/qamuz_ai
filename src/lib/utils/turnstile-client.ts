const TURNSTILE_SCRIPT_ID = "cf-turnstile-api-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileRenderOptions {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement | string, options: TurnstileRenderOptions): string;
  remove(widgetId: string): void;
}

let scriptLoadPromise: Promise<TurnstileApi> | null = null;

export function getTurnstileApi(): TurnstileApi | null {
  if (typeof window === "undefined") {
    return null;
  }

  const turnstileWindow = window as Window & { turnstile?: TurnstileApi };
  return turnstileWindow.turnstile ?? null;
}

export function loadTurnstileApi(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile can only be loaded in a browser."));
  }

  const existingApi = getTurnstileApi();
  if (existingApi) {
    return Promise.resolve(existingApi);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const resolveApi = (): boolean => {
      const api = getTurnstileApi();
      if (!api) {
        return false;
      }

      resolve(api);
      return true;
    };

    if (resolveApi()) {
      return;
    }

    let scriptElement = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;

    const cleanupListeners = () => {
      if (!scriptElement) {
        return;
      }

      scriptElement.removeEventListener("load", handleLoad);
      scriptElement.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanupListeners();
      if (resolveApi()) {
        return;
      }

      scriptLoadPromise = null;
      reject(new Error("Turnstile API loaded but failed to initialize."));
    };

    const handleError = () => {
      cleanupListeners();
      scriptLoadPromise = null;
      reject(new Error("Failed to load Turnstile API script."));
    };

    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = TURNSTILE_SCRIPT_ID;
      scriptElement.src = TURNSTILE_SCRIPT_SRC;
      document.head.appendChild(scriptElement);
    }

    scriptElement.addEventListener("load", handleLoad, { once: true });
    scriptElement.addEventListener("error", handleError, { once: true });

    window.setTimeout(() => {
      if (resolveApi()) {
        cleanupListeners();
      }
    }, 0);
  });

  return scriptLoadPromise;
}
