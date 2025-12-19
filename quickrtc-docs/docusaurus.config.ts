import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "QuickRTC",
  tagline: "Simple WebRTC conferencing built on mediasoup",
  favicon: "img/favicon.svg",

  future: {
    v4: true,
  },

  url: "https://quickrtc.dev",
  baseUrl: "/",

  organizationName: "quickrtc",
  projectName: "quickrtc",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/vidya-hub/QuickRtc/tree/main/docs/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/quickrtc-social-card.jpg",
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "QuickRTC",
      logo: {
        alt: "QuickRTC Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/vidya-hub/QuickRtc",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://www.npmjs.com/package/quickrtc-client",
          label: "npm",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Getting Started",
              to: "/docs/getting-started",
            },
            {
              label: "Client SDK",
              to: "/docs/client/overview",
            },
            {
              label: "Server SDK",
              to: "/docs/server/overview",
            },
            {
              label: "Deployment",
              to: "/docs/deployment/overview",
            },
          ],
        },
        {
          title: "Packages",
          items: [
            {
              label: "quickrtc-client",
              href: "https://www.npmjs.com/package/quickrtc-client",
            },
            {
              label: "quickrtc-server",
              href: "https://www.npmjs.com/package/quickrtc-server",
            },
            {
              label: "quickrtc-react-client",
              href: "https://www.npmjs.com/package/quickrtc-react-client",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/vidya-hub/QuickRtc",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} QuickRTC.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ["bash", "typescript", "json"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
