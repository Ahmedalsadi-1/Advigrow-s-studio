import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Clear the session cookie by setting its expiry date to the past.
  res.setHeader('Set-Cookie', 'auth_provider=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure');
  return res.status(200).json({ status: 'ok' });
}
