import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { league_id, page_id = 1, phase = 1 } = req.query;

  if (!league_id) {
    return res.status(400).json({ error: 'Missing league_id' });
  }

  const url = `https://fantasy.premierleague.com/api/leagues-classic/${league_id}/standings/?page_standings=${page_id}&phase=${phase}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
}
