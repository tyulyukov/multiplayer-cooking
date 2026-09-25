import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "./attachment";
import { Spinner } from "./spinner";

type AttachmentStoryArgs = ComponentProps<typeof Attachment> & {
  title: string;
  description: string;
  image?: boolean;
};

const onAdd = fn();

const onRemove = fn();

const meta = {
  title: "Shared/Attachment",
  component: Attachment,
  tags: ["autodocs"],
  args: {
    state: "done",
    size: "default",
    orientation: "horizontal",
    title: "Фото інгредієнтів",
    description: "Готове до надсилання",
    image: false,
  },
  argTypes: {
    state: {
      control: "select",
      options: ["idle", "uploading", "processing", "error", "done"],
    },
    size: { control: "select", options: ["default", "sm", "xs"] },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    children: { control: false },
  },
  render: ({ title, description, image, ...args }) => (
    <Attachment {...args}>
      <AttachmentMedia variant={image ? "image" : "icon"}>
        {image ? (
          <img src="/images/cooking-prep-photo.webp" alt="" />
        ) : args.state === "uploading" || args.state === "processing" ? (
          <Spinner />
        ) : (
          <HugeiconsIcon
            icon={args.state === "error" ? Alert02Icon : ImageAdd01Icon}
            strokeWidth={1.5}
            aria-hidden
          />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{title}</AttachmentTitle>
        <AttachmentDescription>{description}</AttachmentDescription>
      </AttachmentContent>
      {args.state === "idle" ? (
        <AttachmentTrigger aria-label="Додати фото" onClick={onAdd} />
      ) : (
        <AttachmentActions>
          <AttachmentAction aria-label="Прибрати фото" onClick={onRemove}>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} aria-hidden />
          </AttachmentAction>
        </AttachmentActions>
      )}
    </Attachment>
  ),
} satisfies Meta<AttachmentStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Empty: Story = {
  args: {
    state: "idle",
    title: "Додати фото",
    description: "JPEG, PNG або WebP",
  },
};

export const Uploading: Story = {
  args: {
    state: "uploading",
    title: "Фото інгредієнтів",
    description: "Завантаження…",
  },
};

export const Processing: Story = {
  args: {
    state: "processing",
    description: "Обробка фото…",
  },
};

export const Error: Story = {
  args: {
    state: "error",
    description: "Не вдалося завантажити фото",
  },
};

export const PhotoTile: Story = {
  args: {
    size: "sm",
    orientation: "vertical",
    image: true,
    title: "Фото підготовки",
    description: "Готове",
  },
};
