// The only place that talks to the backend. The admin key is sent in the x-admin-key header.
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body, adminKey } = {}) {
  const headers = { 'x-admin-key': adminKey };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new ApiError(message || 'Something went wrong', res.status);
  }
  return data;
}