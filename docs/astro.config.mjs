import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://sitharaj88.github.io",
  base: "/android-pilot-mcp",
  integrations: [
    starlight({
      title: "Android Pilot",
      description:
        "39 MCP tools for Android development — build, device management, debugging, scaffolding, APK analysis, intents, and SDK management.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/sitharaj88/android-pilot-mcp",
        },
      ],
      logo: {
        alt: "Android Pilot",
        src: "./src/assets/logo.svg",
      },
      editLink: {
        baseUrl:
          "https://github.com/sitharaj88/android-pilot-mcp/edit/main/docs/",
      },
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            {
              label: "Installation",
              link: "/getting-started/installation/",
            },
            {
              label: "Configuration",
              link: "/getting-started/configuration/",
            },
            {
              label: "Prerequisites",
              link: "/getting-started/prerequisites/",
            },
          ],
        },
        {
          label: "Tools",
          items: [
            { label: "Overview", link: "/tools/overview/" },
            {
              label: "Build & Lint",
              autogenerate: { directory: "tools/build" },
            },
            {
              label: "Device Management",
              autogenerate: { directory: "tools/device" },
            },
            {
              label: "Debugging",
              autogenerate: { directory: "tools/debug" },
            },
            {
              label: "Scaffolding",
              autogenerate: { directory: "tools/scaffold" },
            },
            {
              label: "APK Analysis",
              autogenerate: { directory: "tools/analyze" },
            },
            {
              label: "Intents & Deep Links",
              autogenerate: { directory: "tools/intent" },
            },
            {
              label: "SDK Management",
              autogenerate: { directory: "tools/sdk" },
            },
          ],
        },
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        {
          label: "Prompt Cookbook",
          items: [
            {
              label: "Quick Reference",
              link: "/guides/prompts-quick-reference/",
            },
            {
              label: "Build, Test & Analyze",
              link: "/guides/prompts-build-and-test/",
            },
            {
              label: "Devices & Debugging",
              link: "/guides/prompts-device-and-debug/",
            },
            {
              label: "Scaffolding & SDK",
              link: "/guides/prompts-scaffold-and-deploy/",
            },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});
