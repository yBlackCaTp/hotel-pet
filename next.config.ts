import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Desativado porque o Strict Mode do React renderiza componentes 2x em dev,
  // o que faz o Payment Brick do Mercado Pago tentar inicializar duas vezes
  // no mesmo lugar e quebrar com "Bricks.create: initialization failed".
  reactStrictMode: false,
};

export default nextConfig;
