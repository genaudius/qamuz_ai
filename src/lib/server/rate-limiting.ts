/**
 * Extract client IP address from request headers.
 *
 * This utility is used for passing client IP metadata to downstream
 * security checks (e.g. Turnstile verification).
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')

  if (cfConnectingIP) {
    return cfConnectingIP
  }

  if (realIP) {
    return realIP
  }

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return 'unknown'
}
