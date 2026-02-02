import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "intro",
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      items: [
        "concepts/mediasoup",
        "concepts/quickrtc-architecture",
        "concepts/network-configuration",
      ],
    },
    {
      type: "category",
      label: "Client SDK",
      collapsed: false,
      items: ["client/overview"],
    },
    {
      type: "category",
      label: "Server SDK",
      collapsed: false,
      items: ["server/overview"],
    },
    {
      type: "category",
      label: "React",
      collapsed: false,
      items: ["react/overview"],
    },
    {
      type: "category",
      label: "Flutter SDK",
      collapsed: false,
      items: [
        "flutter/getting-started",
        "flutter/controller",
        "flutter/media",
        "flutter/widgets",
        "flutter/platform-setup",
        "flutter/screen-sharing",
        "flutter/state-management",
      ],
    },
    // {
    //   type: "category",
    //   label: "Deployment",
    //   collapsed: false,
    //   items: [
    //     "deployment/overview",
    //     "deployment/docker",
    //     "deployment/gcp",
    //     "deployment/aws",
    //     "deployment/manual",
    //   ],
    // },
  ],
};

export default sidebars;
