import { useLocalSearchParams } from "expo-router";

import { CookingRoomScreen } from "@/features/cooking/ui/cooking-room-screen";

export default function CookingRoomRoute() {
  const { invite } = useLocalSearchParams<{ roomId: string; invite?: string }>();

  return <CookingRoomScreen inviteToken={invite || undefined} />;
}
