export const SETTINGS_DEFAULT_PATH = "/settings/profile";

const EXACT_NAVIGATION_PATHS = new Set([
  "/newchat",
  "/image-video",
  "/audio",
  "/projects",
  "/create",
  "/explore",
  "/library",
  "/settings",
  "/pricing",
  "/admin",
]);

const PREFIX_NAVIGATION_PATHS = ["/projects/", "/settings/", "/admin/", "/artist/", "/create-video/"];

export function isNavigationLoadingPath(pathname: string): boolean {
  if (EXACT_NAVIGATION_PATHS.has(pathname)) {
    return true;
  }

  return PREFIX_NAVIGATION_PATHS.some((prefix) => pathname.startsWith(prefix));
}
