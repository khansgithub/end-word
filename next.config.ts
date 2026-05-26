import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  /* config options here */
  // distDir: ".next",
  serverExternalPackages: ["node-wordnet", "wndb-with-exceptions"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/wndb-with-exceptions/dict/**/*"],
  },
  turbopack: {
    resolveAlias: {
      "@": path.join(projectRoot, "src"),
      "@tests": path.join(projectRoot, "tests"),
      "@scripts": path.join(projectRoot, "scripts"),
      "@root": projectRoot,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.join(projectRoot, "src"),
      "@tests": path.join(projectRoot, "tests"),
      "@scripts": path.join(projectRoot, "scripts"),
      "@root": projectRoot,
    };
    return config;
  },
};

export default nextConfig;
