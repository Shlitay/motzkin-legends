import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/manager", "/auth", "/onboarding"] },
    sitemap: "https://prediction-legends.com/sitemap.xml",
  };
}
