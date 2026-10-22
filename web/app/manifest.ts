import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI 余额显示器',
    short_name: 'Balance',
    description: 'AI API 余额显示器控制台',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f6f4',
    theme_color: '#f6f6f4',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
