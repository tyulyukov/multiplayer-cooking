import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";
import type { CookingCredential } from "@/features/cooking/lib/cooking-session";
import { cookingRoomFixture } from "@/features/cooking/testing/fixtures";
import { useRoomInvite } from "../model/use-room-invite";
import { CookingInvite } from "./cooking-invite";

type RotateInvite = Parameters<typeof useRoomInvite>[0]["roomApi"]["rotateInvite"];

const read = cookingRoomFixture();

const InteractiveInvite = ({ rotateInvite }: { rotateInvite: RotateInvite }) => {
  // These credentials only belong to the local fixture; no backend is called.
  const [credential, setCredential] = useState<CookingCredential | null>({
    participantToken: "storybook-participant",
    inviteToken: "storybook-invite",
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = useRoomInvite({
    roomId: read.room._id,
    credential,
    setCredential,
    roomApi: { rotateInvite },
    online: true,
    pending,
    setPending,
    setError,
  });

  return (
    <CookingInvite {...invite} inviteOpen read={read} online pending={pending} error={error} />
  );
};

const meta = {
  title: "Pages/CookingRoom/Invite",
  component: InteractiveInvite,
  args: { rotateInvite: fn<RotateInvite>(async () => true) },
} satisfies Meta<typeof InteractiveInvite>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

const rotation = fn<RotateInvite>(async () => true);

export const RotateAndRetry: Story = {
  args: { rotateInvite: rotation },
  play: async ({ userEvent }) => {
    let failRotation = () => {};

    const firstRotation = new Promise<boolean>((_resolve, reject) => {
      failRotation = () => reject(new Error("offline"));
    });

    rotation.mockImplementationOnce(() => firstRotation);
    const link = await screen.findByRole("textbox", { name: "Посилання на кухню" });
    const originalLink = link.getAttribute("value");
    await userEvent.click(screen.getByText("Замінити посилання"));
    const rotate = screen.getByRole("button", { name: "Створити нове посилання" });
    await userEvent.click(rotate);
    await waitFor(() => expect(rotate).toBeDisabled());
    expect(screen.getByRole("button", { name: "Скопіювати посилання" })).toBeDisabled();
    failRotation();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Не вдалося створити"));
    expect(link).toHaveValue(originalLink);
    await waitFor(() => expect(rotate).toBeEnabled());
    await userEvent.click(rotate);
    await waitFor(() => expect(link).not.toHaveValue(originalLink));
    expect(rotation).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(rotate).toBeEnabled();
  },
};
