import { ImageResponse } from 'next/og';

// iOS「添加到主屏幕」用的图标
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#171717',
          color: '#4ade80',
          fontSize: 90,
          fontWeight: 700,
        }}
      >
        ¥
      </div>
    ),
    size,
  );
}
