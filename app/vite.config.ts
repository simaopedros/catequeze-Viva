import { wasp } from "wasp/client/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

function patchWaspUseIsClientPlugin(): Plugin {
  const supportedSuffixes = [
    "/.wasp/out/sdk/wasp/dist/client/app/hooks/useIsClient.js",
    "/.wasp/out/sdk/wasp/client/app/hooks/useIsClient.ts",
  ];

  return {
    name: "patch-wasp-use-is-client",
    enforce: "pre",
    transform(_code, id) {
      const normalizedId = id.split("?")[0].replace(/\\/g, "/");

      if (!supportedSuffixes.some((suffix) => normalizedId.endsWith(suffix))) {
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
          if (!id.includes("node_modules/")) return;
          // React core always lives in its own long-lived chunk so it is never
          // hoisted into a feature chunk (which would make landings preload it).
          // Tiny helpers shared by several libraries ride along, otherwise
          // Rollup may park them inside `charts` and force that chunk to preload.
          if (
            /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|use-sync-external-store|react-is|clsx|tiny-invariant|tslib)\//.test(
              id,
            )
          ) {
            return "react-vendor";
          }
          if (
            /node_modules\/(recharts|recharts-scale|react-smooth|victory-vendor|d3-[a-z-]+|@reduxjs|immer|react-redux|reselect|redux|es-toolkit|decimal\.js-light|fast-equals|eventemitter3|internmap)\//.test(
              id,
            )
          ) {
            return "charts";
          }
          if (/node_modules\/(@tiptap|prosemirror-[a-z-]+)\//.test(id)) {
            return "editor";
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
