const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const SESSION_KEY = 'daymark-supabase-session';

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}
async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'Authentication request failed');
  return data;
}
export async function getSession() {
  if (!cloudConfigured) return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hash.get('type') === 'recovery' && hash.get('access_token')) {
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` } });
    if (userResponse.ok) {
      const user = await userResponse.json();
      const recovered = { access_token, refresh_token, user, expires_at: Number(hash.get('expires_at')) || Math.floor(Date.now()/1000) + Number(hash.get('expires_in') || 3600) };
      saveSession(recovered); return recovered;
    }
  }
  let session;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
  if (!session?.access_token) return null;
  if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
    try {
      const fresh = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
      session = { ...fresh, expires_at: Math.floor(Date.now() / 1000) + (fresh.expires_in || 3600) };
      saveSession(session);
    } catch { saveSession(null); return null; }
  }
  return session;
}
export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password });
  const session = { ...data, expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600) };
  saveSession(session); return session;
}
export async function signUp(email, password) {
  const data = await authRequest('signup', { email, password });
  if (data.access_token) {
    const session = { ...data, expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600) };
    saveSession(session); return { session, confirmationRequired: false };
  }
  return { session: null, confirmationRequired: true };
}
export async function sendPasswordReset(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(window.location.origin)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email })
  });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.msg || data.message || 'Could not send reset email'); }
}
export async function updatePassword(password, session) {
  const activeSession = await getSession() || session;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${activeSession.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.msg || data.message || 'Password update failed'); }
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
}
export function signOut() { saveSession(null); }
export async function cloudRead(session) {
  const activeSession = await getSession() || session;
  const url = `${SUPABASE_URL}/rest/v1/daymark_user_data?select=data,updated_at&user_id=eq.${encodeURIComponent(activeSession.user.id)}`;
  const response = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${activeSession.access_token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.hint || 'Could not load cloud data');
  return data[0] ?? null;
}
export async function cloudWrite(session, data) {
  const activeSession = await getSession() || session;
  const updatedAt = new Date().toISOString();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/daymark_user_data?on_conflict=user_id`, {
    method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${activeSession.access_token}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: activeSession.user.id, data, updated_at: updatedAt })
  });
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || error.hint || 'Cloud save failed'); }
  localStorage.setItem(`daymark-cloud-updated-${activeSession.user.id}`, String(Date.parse(updatedAt)));
}
