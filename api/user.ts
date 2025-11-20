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
  const provider = req.cookies.auth_provider;

  if (provider === 'google' || provider === 'github' || provider === 'discord' || provider === 'twitter') {
    const user = MOCK_USERS[provider as keyof typeof MOCK_USERS];
    return res.status(200).json(user);
  }
  
  return res.status(404).json({ error: 'Not logged in' });
}