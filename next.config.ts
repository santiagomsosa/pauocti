import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Probar desde el celu con `next dev`: por la red de casa (la IP de la Mac cambia) o por Tailscale
  // (IP 100.x o el nombre *.ts.net). Sin esto el dev server le niega el JavaScript al celu y la página
  // se ve pero no responde a los toques. Solo aplica en desarrollo.
  allowedDevOrigins: ["192.168.1.*", "100.*.*.*", "**.ts.net"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
