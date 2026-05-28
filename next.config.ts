import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/about/faq', destination: '/faq', permanent: true },
      { source: '/about/coaches', destination: '/about/teams', permanent: true },
      { source: '/journey/build', destination: '/journey/learn', permanent: true },
    ]
  },
  // 注意：静态导出配置暂时注释，因为 API Routes 需要先迁移
  // 开发阶段使用 Live Reload 模式（连接到本地开发服务器）
  // 生产阶段需要先迁移 API Routes 到独立后端，然后启用静态导出
  // output: 'export',
  images: {
    // unoptimized: true, // 静态导出时需要启用
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      // Amilia / camp offering posters (RackCDN per-tenant subdomains)
      {
        protocol: "https",
        hostname: "**.ssl.cf2.rackcdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.ssl.cf2.rackcdn.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
