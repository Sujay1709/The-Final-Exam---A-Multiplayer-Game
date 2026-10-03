import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localHosts = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address),
);

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  // Allow phones to load dev assets from this computer's actual LAN addresses.
  allowedDevOrigins: localHosts,
  agentRules: false,
};

export default nextConfig;
