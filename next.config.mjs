/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor를 위한 정적 익스포트 옵션 (필요시 활성화)
  // output: 'export',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
