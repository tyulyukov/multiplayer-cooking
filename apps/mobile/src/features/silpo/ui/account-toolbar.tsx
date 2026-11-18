import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { router, Stack } from "expo-router";

import { barIconsReady, useBarIcon } from "@/shared/hooks/use-bar-icon";

// Header items shared by Home and Chat: History and the Profile menu. Glyphs stay system ink.
export function AccountToolbar() {
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const forgetAddress = useMutation(api.silpo.forgetAddress);
  const disconnect = useMutation(api.silpo.disconnect);
  const historyIcon = useBarIcon("clock.arrow.circlepath", "history");
  const profileIcon = useBarIcon("person.crop.circle", "account_circle");
  const settingsIcon = useBarIcon("gearshape", "settings");
  const forgetIcon = useBarIcon("mappin.slash", "location_off");
  const logoutIcon = useBarIcon("rectangle.portrait.and.arrow.right", "logout");

  if (!barIconsReady(historyIcon, profileIcon, settingsIcon, forgetIcon, logoutIcon)) return null;

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={historyIcon}
        accessibilityLabel="Історія розмов"
        onPress={() => router.push("/history")}
      />
      <Stack.Toolbar.Menu
        icon={profileIcon}
        accessibilityLabel="Профіль"
        title={connection?.name ?? "Акаунт Сільпо"}
      >
        <Stack.Toolbar.Menu inline>
          <Stack.Toolbar.MenuAction icon={settingsIcon} onPress={() => router.push("/settings")}>
            Налаштування
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon={forgetIcon}
            disabled={!connection?.hasAddress}
            onPress={() => {
              if (sessionId) void forgetAddress({ sessionId }).catch(() => undefined);
            }}
          >
            Забути адресу
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu inline>
          <Stack.Toolbar.MenuAction
            icon={logoutIcon}
            destructive
            onPress={() => {
              if (sessionId) void disconnect({ sessionId }).catch(() => undefined);
            }}
          >
            Вийти
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
