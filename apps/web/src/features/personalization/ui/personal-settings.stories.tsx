import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fireEvent, fn, screen, waitFor } from "storybook/test";
import type { PersonalSettingsProps } from "../model/personal-settings-types";
import { PersonalSettings } from "./personal-settings";

const meta = {
  title: "Features/Personalization/Settings",
  component: PersonalSettings,
  args: {
    open: true,
    initialTab: "settings",
    memories: [],
    settings: { tone: "friendly", customInstructions: "", about: "" },
    onOpenChange: fn(),
    onDelete: fn(async () => {}),
    onSave: fn(async () => {}),
  },
  render: function InteractiveSettings(args) {
    const [open, setOpen] = useState(args.open);

    return <PersonalSettings {...args} open={open} onOpenChange={setOpen} />;
  },
} satisfies Meta<typeof PersonalSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Agent: Story = {};

export const Memories: Story = { args: { initialTab: "memories" } };

export const Interface: Story = { args: { initialTab: "interface" } };

const queuedSave = fn<PersonalSettingsProps["onSave"]>(async () => {});

export const EditWhileSaving: Story = {
  args: { onSave: queuedSave },
  play: async () => {
    let finishSave = () => {};

    const firstSave = new Promise<void>((resolve) => {
      finishSave = resolve;
    });

    queuedSave.mockImplementationOnce(() => firstSave);
    const about = await screen.findByRole("textbox", { name: /Розкажи про себе/ });
    fireEvent.input(about, { target: { value: "Готую для двох" } });
    await waitFor(() => expect(queuedSave).toHaveBeenCalledTimes(1));
    fireEvent.input(about, { target: { value: "Готую для трьох" } });
    finishSave();
    await waitFor(() => expect(queuedSave).toHaveBeenCalledTimes(2));
    expect(queuedSave).toHaveBeenLastCalledWith({
      tone: "friendly",
      customInstructions: "",
      about: "Готую для трьох",
    });
    await waitFor(() => expect(screen.getByText("Збережено")).toBeVisible());
    expect(about).toHaveValue("Готую для трьох");
  },
};

const retrySave = fn<PersonalSettingsProps["onSave"]>(async () => {});

export const RetrySaving: Story = {
  args: { onSave: retrySave },
  play: async ({ userEvent }) => {
    retrySave.mockRejectedValueOnce(new Error("offline"));
    const about = await screen.findByRole("textbox", { name: /Розкажи про себе/ });
    fireEvent.input(about, { target: { value: "Готую без перцю" } });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Не вдалося зберегти"));
    expect(about).toHaveValue("Готую без перцю");
    await userEvent.click(screen.getByRole("button", { name: "Повторити" }));
    await waitFor(() => expect(screen.getByText("Збережено")).toBeVisible());
    expect(retrySave).toHaveBeenCalledTimes(2);
  },
};
