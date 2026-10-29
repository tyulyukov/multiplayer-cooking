import { useLocalSearchParams } from "expo-router";

import { IdeaSheet } from "@/features/ideas/ui/idea-sheet";

export default function IdeaRoute() {
  const { threadId, ideaId } = useLocalSearchParams<{ threadId: string; ideaId?: string }>();

  return <IdeaSheet threadId={threadId} ideaId={ideaId} />;
}
