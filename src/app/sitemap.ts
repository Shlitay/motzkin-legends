import type { MetadataRoute } from "next";

const BASE = "https://prediction-legends.com";

// Only the pages a logged-out visitor can read.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/rules", "/privacy"].map((path) => ({ url: BASE + path }));
}
