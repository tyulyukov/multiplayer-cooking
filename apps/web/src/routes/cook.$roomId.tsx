import type { FC } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { CookingRoomPage } from "@/pages/cooking-room/cooking-room-page";

const CookingRoomRoute: FC = () => {
  const { roomId } = Route.useParams();
  return <CookingRoomPage roomId={roomId} />;
};

export const Route = createFileRoute("/cook/$roomId")({
  component: CookingRoomRoute,
});
