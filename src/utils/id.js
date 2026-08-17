/**
 * Short unique id generator.
 *
 * `crypto.randomUUID()` is only available in secure contexts (HTTPS or
 * localhost). Previewing the dev server over a LAN address — e.g.
 * http://192.168.1.20:5173 while testing on a phone — is not a secure context,
 * so calling it directly would throw. This falls back gracefully.
 */
export function shortId(prefix = '') {
  let core;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    core = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    core = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    core = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-2);
  }

  return prefix ? `${prefix}${core}` : core;
}

export default shortId;
