import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { glassHeaderOptions } from "@/features/chat/lib/header-options";
import { useChatComposer } from "@/features/chat/model/use-chat-composer";
import { useChatNavigation } from "@/features/chat/model/use-chat-navigation";
import { useOffline } from "@/shared/hooks/use-offline";
import { AccountToolbar } from "@/features/silpo/ui/account-toolbar";
import { CheckerBand } from "@/shared/ui/checker-band";
import { Composer } from "@/shared/ui/composer";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SignPlate } from "@/shared/ui/sign-plate";

import { QuickPrompts } from "./quick-prompts";

const offlineMessage = "Немає зв’язку. Напиши ідею, вона надішлеться після підключення.";

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const offline = useOffline();
  const { draft, attachments, sending, error, submit } = useChatComposer(null);
  const navigation = useChatNavigation(draft.reroll);
  const alert = offline ? offlineMessage : (error ?? navigation.error);

  return (
    <>
      <Stack.Screen options={glassHeaderOptions} />
      <AccountToolbar />
      <KeyboardAwareScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <CheckerBand />
        <View style={styles.body}>
          <SignPlate title="Що готуємо сьогодні?" />
          <Composer
            mode="home"
            value={draft.request}
            busy={sending}
            disabled={offline}
            attachments={attachments.items}
            onChange={draft.change}
            onSubmit={(text) => {
              navigation.clearError();
              void submit(text);
            }}
            onAttach={(source) => void attachments.add(source)}
            onRemoveAttachment={attachments.remove}
          />
          {alert ? <InlineAlert message={alert} /> : null}
          <QuickPrompts
            prompts={draft.quickPrompts}
            selectedId={draft.selection?.promptId}
            disabled={sending}
            onToggle={draft.togglePrompt}
          />
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
});
