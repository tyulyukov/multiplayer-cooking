import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, waitFor } from "storybook/test";
import { cookingActions, cookingRoomFixture } from "../testing/fixtures";
import { CookingTools } from "./cooking-tools";

const meta = {
  title: "Features/Cooking/Tools",
  component: CookingTools,
  parameters: { layout: "fullscreen" },
  args: { data: cookingRoomFixture(), actions: cookingActions, sound: true, onSound: fn() },
  argTypes: { data: { control: false }, actions: { control: false } },
} satisfies Meta<typeof CookingTools>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PreserveForms: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Інструменти" }));
    await userEvent.click(await screen.findByRole("button", { name: "Перевести одиниці" }));
    const amount = screen.getByLabelText("Кількість");
    fireEvent.input(amount, { target: { value: "250" } });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("8,818 унція"));
    await userEvent.click(screen.getByRole("button", { name: "До інструментів" }));
    await userEvent.click(screen.getByRole("button", { name: "Додати таймер" }));
    fireEvent.input(screen.getByLabelText("Назва"), { target: { value: "Перевірити овочі" } });
    const minutes = screen.getByLabelText("Хвилини");
    fireEvent.input(minutes, { target: { value: "12" } });
    await userEvent.click(screen.getByRole("button", { name: "До інструментів" }));
    await userEvent.click(screen.getByRole("button", { name: "Перевести одиниці" }));
    await expect(screen.getByLabelText("Кількість")).toHaveValue("250");
    await userEvent.click(screen.getByRole("button", { name: "До інструментів" }));
    await userEvent.click(screen.getByRole("button", { name: "Додати таймер" }));
    await expect(screen.getByLabelText("Назва")).toHaveValue("Перевірити овочі");
    await expect(screen.getByLabelText("Хвилини")).toHaveValue("12");
  },
};
