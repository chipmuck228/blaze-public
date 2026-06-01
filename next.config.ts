import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEGACY_ADMIN_REDIRECTS } from "./src/lib/admin-legacy-redirects";

/** Blaze app root — avoids picking parent `Code/package-lock.json` as Turbopack root. */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const adminLegacyRedirects = Object.entries(LEGACY_ADMIN_REDIRECTS).map(
  ([segment, destination]) => ({
    source: `/admin/${segment}`,
    destination,
    permanent: true,
  })
);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  async redirects() {
    return [
      { source: "/about/faq", destination: "/faq", permanent: true },
      { source: "/about/coaches", destination: "/about/teams", permanent: true },
      { source: "/journey/build", destination: "/journey/learn", permanent: true },
      { source: "/locations", destination: "/?section=locations", permanent: true },

      // Archived V1 catalog & marketing pages → V2 programs / journey
      { source: "/course-catalog", destination: "/programs", permanent: true },
      { source: "/course-catalog/:path*", destination: "/programs", permanent: true },
      { source: "/course", destination: "/programs", permanent: true },
      { source: "/camps", destination: "/programs", permanent: true },
      { source: "/competition", destination: "/journey/compete", permanent: true },
      { source: "/learning-paths", destination: "/programs", permanent: true },
      { source: "/learning-paths/:path*", destination: "/programs", permanent: true },
      {
        source: "/robotics-for-beginners",
        destination: "/programs?category=beginner_robotics",
        permanent: true,
      },

      {
        source: "/settings/notifications",
        destination: "/profile#communications",
        permanent: false,
      },
      { source: "/settings/account", destination: "/profile", permanent: true },
      { source: "/billing", destination: "/portal", permanent: true },

      ...adminLegacyRedirects,
      { source: "/admin/settings", destination: "/admin", permanent: false },
      {
        source: "/admin/newsletter/statistics",
        destination: "/admin/newsletter/subscribers?tab=statistics",
        permanent: false,
      },
      {
        source: "/admin/newsletter/unsubscribe-stats",
        destination: "/admin/newsletter/subscribers?tab=unsubscribe-stats",
        permanent: false,
      },
    ];
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
