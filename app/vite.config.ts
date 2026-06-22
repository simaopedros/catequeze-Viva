import { wasp } from "wasp/client/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

function gtmPlugin(): Plugin {
  const gtmId = "GTM-MTGNTJG6";
  return {
    name: "inject-gtm",
    transformIndexHtml(html) {
      const headScript = `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>\n<!-- End Google Tag Manager -->`;
      return html.replace("</head>", `  ${headScript}\n  </head>`);
    },
  };
}

function patchWaspUseIsClientPlugin(): Plugin {
  return {
    name: "patch-wasp-use-is-client",
    enforce: "pre",
    transform(_code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");

      if (
        !normalizedId.endsWith(
          "/.wasp/out/sdk/wasp/dist/client/app/hooks/useIsClient.js",
        )
      ) {
        return null;
      }

      return {
        code: `import { useEffect, useState } from "react";

export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    wasp({
      reactOptions: {
        exclude: [/\.wasp\/out\/sdk\/wasp\/dist\/client\/app\/.*/],
      },
    }),
    patchWaspUseIsClientPlugin(),
    tailwindcss(),
    gtmPlugin(),
  ],
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/")) {
            if (
              id.includes("recharts") ||
              id.includes("apexcharts") ||
              id.includes("react-apexcharts")
            ) {
              return "charts";
            }
          }
        },
      },
    },
  },
  server: {
    open: true,
    allowedHosts: [
      "call-burner-alaska-vital.trycloudflare.com",
      ".trycloudflare.com",
    ],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
