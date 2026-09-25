import type { FC } from "react";
import { HistoryPanel } from "@/features/history/ui/history-panel";
import { ProfileMenu } from "@/features/silpo/ui/silpo-connect";
import { PersonalSettings } from "@/features/personalization/ui/personal-settings";
import { isConvexConfigured } from "@/app/providers/convex-provider";
import { useHomePageModel, useMissingConvexHomeModel } from "@/pages/home/model/use-home-page";

import { ConnectScreen } from "./ui/connect-screen";
import { HomeScreen } from "./ui/home-screen";
import { ChatScreen } from "./ui/chat-screen";

const ConnectedHome: FC = () => {
  const model = useHomePageModel();

  if (model.screen === "loading") {
    return null;
  }

  if (model.screen === "connect") {
    return <ConnectScreen backendReady={model.backendReady} {...model.props} />;
  }

  const menu = (
    <>
      <HistoryPanel {...model.menu.history} />
      <PersonalSettings {...model.menu.personal} />
      <ProfileMenu {...model.menu.profile} />
    </>
  );

  if (model.screen === "home") {
    return <HomeScreen backendReady={model.backendReady} menu={menu} {...model.props} />;
  }

  return (
    <ChatScreen
      key={model.threadId}
      backendReady={model.backendReady}
      menu={menu}
      {...model.props}
    />
  );
};

const MissingConvexHome: FC = () => {
  const model = useMissingConvexHomeModel();

  return <HomeScreen backendReady={false} {...model} />;
};

export const HomePage: FC = () => {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
};
