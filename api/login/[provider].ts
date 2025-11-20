import type { VercelRequest, VercelResponse } from '@vercel/node';

const MOCK_USERS = {
  google: {
    username: 'Advigrow G.',
    email: 'advigrow.google@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=g-advigrow&backgroundColor=transparent,b6e3f4`,
    provider: 'google',
  },
  github: {
    username: 'advigrow-dev',
    email: 'advigrow.github@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=gh-advigrow`,
    provider: 'github',
  },
  discord: {
    username: 'advigrow.gg',
    email: 'advigrow.discord@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=d-advigrow&backgroundColor=5865F2,FFFFFF`,
    provider: 'discord',
  },
  twitter: {
    username: '@advigrow',
    email: 'advigrow.twitter@example.com',
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=t-advigrow&backgroundColor=000000,FFFFFF`,
    provider: 'twitter',
  }
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { provider } = req.query;
  const userProvider = Array.isArray(provider) ? provider[0] : provider;

  if (userProvider === 'google' || userProvider === 'github' || userProvider === 'discord' || userProvider === 'twitter') {
    const user = MOCK_USERS[userProvider as keyof typeof MOCK_USERS];
    console.log(`[Notification] User '${user.username}' just signed in via ${userProvider}!`);
    
    // Set a simple session cookie. Vercel automatically handles the `res.setHeader('Set-Cookie', ...)` array.
    res.setHeader('Set-Cookie', `auth_provider=${userProvider}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure`); // 1 day expiry, Secure for production
    
    return res.status(200).json(user);
  }
  
  return res.status(400).json({ error: 'Invalid provider' });
}