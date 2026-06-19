import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/aggregation-layers",
    "@deck.gl/geo-layers",
    "@deck.gl/mesh-layers",
    "@luma.gl/core",
    "@luma.gl/webgl",
    "@luma.gl/shadertools",
    "@math.gl/core",
    "@math.gl/geospatial",
    "@math.gl/web-mercator",
    "@loaders.gl/core",
    "@loaders.gl/loader-utils",
  ],
};

export default nextConfig;
