import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { storyIdea, storyIdeaVersions, storyIdeaWithProducts } from "../testing/fixtures";
import { IdeaPane } from "./idea-card";

const meta = {
  title: "Features/Ideas/IdeaPane",
  component: IdeaPane,
  tags: ["autodocs"],
  args: {
    idea: storyIdea,
    canAddToCart: false,
    versions: storyIdeaVersions,
    onAddToCart: fn(),
    onCookCount: fn(),
    profileName: "Аня",
  },
  argTypes: { idea: { control: false }, versions: { control: false } },
  render: (args) => (
    <div className="w-full max-w-2xl">
      <IdeaPane {...args} />
    </div>
  ),
} satisfies Meta<typeof IdeaPane>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProductsUnavailable: Story = {};

export const MatchedProducts: Story = {
  args: { idea: storyIdeaWithProducts, canAddToCart: true },
};

export const CartReady: Story = {
  args: {
    idea: {
      ...storyIdeaWithProducts,
      cart: {
        itemCount: 2,
        productsTotal: 113.9,
        deliveryTotal: 39,
        total: 152.9,
        warnings: [],
        addedAt: storyIdea._creationTime,
      },
    },
    canAddToCart: true,
  },
};

export const PhotoFailed: Story = {
  args: {
    idea: {
      ...storyIdea,
      imageError: "Зображення не вдалося створити. Спробуй відкрити ідею ще раз.",
    },
  },
};

export const OlderVersion: Story = {
  args: {
    versions: { ...storyIdeaVersions, index: 0, count: 2 },
  },
};
