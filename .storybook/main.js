

import { mergeConfig } from 'vite';

/** @type { import('@storybook/nextjs-vite').StorybookConfig } */
const config = {
  "stories": [
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/nextjs-vite",
  "docs": {
    "autodocs": "tag"
  },
  "staticDirs": [
    "../public"
  ],
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          '@': new URL('../', import.meta.url).pathname,
        },
      },
      esbuild: {
        loader: 'jsx',
        include: /\/(components|pages|lib)\/.*\.js$/,
      },
      optimizeDeps: {
        esbuildOptions: {
          loader: {
            '.js': 'jsx',
          },
        },
      },
    });
  },
};
export default config;