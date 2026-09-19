import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /home was removed — predictions is the landing page after login. Kept
  // as a redirect so old bookmarks and home-screen shortcuts still work.
  async redirects() {
    return [{ source: "/home", destination: "/predictions", permanent: false }];
  },
};

export default nextConfig;
