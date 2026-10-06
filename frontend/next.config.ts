import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from writing a generated AGENTS.md file into this folder.
  agentRules: false,
  turbopack: {
    rules: {
      // Tailwind CSS runs as a Turbopack loader on every .css file.
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
