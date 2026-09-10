import starlightPlugin from "@astrojs/starlight-tailwind";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#071A2D",
        midnight: "#153A63",
        gold: "#D39A2B",
        paper: "#FFF7E7",
        accent: {
          50: "#FFF7E7",
          100: "#F8E8C4",
          200: "#F4CF7A",
          300: "#E8B94A",
          400: "#D39A2B",
          500: "#D39A2B",
          600: "#8A6418",
          700: "#153A63",
          800: "#0a2540",
          900: "#071A2D",
          950: "#071A2D",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [starlightPlugin()],
};
