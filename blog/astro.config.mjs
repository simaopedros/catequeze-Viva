import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightBlog from "starlight-blog";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://catechis.app",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Catequese Viva",
      customCss: ["./src/styles/tailwind.css"],
      description: "Blog e guias da Catequese Viva.",
      logo: {
        src: "./src/assets/mark.svg",
        alt: "Catequese Viva",
      },
      head: [
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap",
          },
        },
        {
          tag: "meta",
          attrs: { name: "theme-color", content: "#071A2D" },
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/simaopedros/catequeze-Viva/edit/main/blog",
      },
      components: {
        SiteTitle: "./src/components/MyHeader.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/MyThemeSelect.astro",
        Head: "./src/components/HeadWithOGImage.astro",
        PageTitle: "./src/components/TitleWithBannerImage.astro",
      },
      social: {
        github: "https://github.com/simaopedros/catequeze-Viva",
      },
      sidebar: [
        {
          label: "Start Here",
          items: [
            {
              label: "Introduction",
              link: "/",
            },
          ],
        },
        {
          label: "Guides",
          items: [
            {
              label: "Example Guide",
              link: "/guides/example/",
            },
          ],
        },
      ],
      plugins: [
        starlightBlog({
          title: "Blog",
          customCss: ["./src/styles/tailwind.css"],
          authors: {
            Dev: {
              name: "Catequese Viva",
              title: "Equipe Catequese Viva",
              picture: "/CRAIG_ROCK.png",
              url: "https://catechis.app",
            },
          },
        }),
      ],
    }),
    tailwind({ applyBaseStyles: false }),
  ],
});
