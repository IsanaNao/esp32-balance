import { ImageResponse } from 'next/og';

// PWA 图标先用代码生成占位，以后有正式图标直接换成 public/ 里的 png
const SIZES = [180, 192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = SIZES.includes(Number(raw)) ? Number(raw) : 192;

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
          fontSize: size * 0.5,
          fontWeight: 700,
        }}
      >
        ¥
      </div>
    ),
    { width: size, height: size },
  );
}
