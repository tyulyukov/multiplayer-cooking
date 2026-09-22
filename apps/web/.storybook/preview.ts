import type { Preview } from "@storybook/react-vite";

import "../src/app/styles/globals.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    a11y: { test: "error" },
  },
};

export default preview;
