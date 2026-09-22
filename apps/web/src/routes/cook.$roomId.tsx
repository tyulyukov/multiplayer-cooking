import { createFileRoute } from "@tanstack/react-router";

import { CookingRoomPage } from "@/pages/cooking-room/cooking-room-page";

export const Route = createFileRoute("/cook/$roomId")({
  component: CookingRoomRoute,
});

function CookingRoomRoute() {
  const { roomId } = Route.useParams();
  return <CookingRoomPage roomId={roomId} />;
}
