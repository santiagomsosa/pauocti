import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Probar desde el celu en la red de casa con `next dev`: la IP de la Mac cambia (antes .11, ahora .13).
  // Sin esto el dev server le niega el JavaScript al celu y la página no responde a los toques.
  allowedDevOrigins: ["192.168.1.*"],
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
