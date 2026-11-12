import { api } from "@multiplayer-cooking/backend/convex/_generated/api";
import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation, useQuery } from "convex/react";
import { router, Stack } from "expo-router";

// Header items shared by Home and Chat: History and the Profile menu. Glyphs stay system ink.
export function AccountToolbar() {
  const [sessionId] = useSessionId();
  const connection = useQuery(api.silpo.connection, sessionId ? { sessionId } : "skip");
  const forgetAddress = useMutation(api.silpo.forgetAddress);
  const disconnect = useMutation(api.silpo.disconnect);

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon="clock.arrow.circlepath"
        accessibilityLabel="Історія розмов"
        onPress={() => router.push("/history")}
      />
      <Stack.Toolbar.Menu
        icon="person.crop.circle"
        accessibilityLabel="Профіль"
        title={connection?.name ?? "Акаунт Сільпо"}
      >
        <Stack.Toolbar.Menu inline>
          <Stack.Toolbar.MenuAction icon="gearshape" onPress={() => router.push("/settings")}>
            Налаштування
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="mappin.slash"
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
            icon="rectangle.portrait.and.arrow.right"
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
