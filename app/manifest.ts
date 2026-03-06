import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FPL Vntrip - Fantasy Premier League Leaderboard',
    short_name: 'FPL Vntrip',
    description:
      'Theo dõi bảng xếp hạng Fantasy Premier League của nhóm Vntrip',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
