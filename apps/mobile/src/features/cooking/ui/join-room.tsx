import { colors, radii } from "@multiplayer-cooking/theme";
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { fonts } from "@/shared/fonts";
import { maxFontScale } from "@/shared/lib/type-scale";
import { Button } from "@/shared/ui/button";
import { CheckerBand } from "@/shared/ui/checker-band";
import { Illustration } from "@/shared/ui/illustration";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { SignPlate } from "@/shared/ui/sign-plate";
import { Text } from "@/shared/ui/text";

import { useCookingRoom } from "../model/room-context";
import { useJoinRoom } from "../model/use-join-room";

type JoinRoomProps = { inviteToken?: string };

export function JoinRoom({ inviteToken }: JoinRoomProps) {
  const { online } = useCookingRoom();
  const { name, setName, error, busy, enter } = useJoinRoom(inviteToken);

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <CheckerBand />
      <View style={styles.content}>
        <SignPlate title="Приєднатися до кухні" />
        <Illustration name="apron-hook" size={112} style={styles.art} />
        <View style={styles.field}>
          <Text variant="label" nativeID="join-name-label">
            Твоє ім’я
          </Text>
          <TextInput
            accessibilityLabelledBy="join-name-label"
            accessibilityLabel="Твоє ім’я"
            autoFocus={!name}
            value={name}
            maxLength={80}
            autoComplete="name"
            textContentType="givenName"
            returnKeyType="join"
            placeholder="Наприклад, Аня"
            placeholderTextColor={colors.mutedForeground}
            editable={!busy}
            maxFontSizeMultiplier={maxFontScale.body}
            onChangeText={setName}
            onSubmitEditing={() => void enter()}
            style={styles.input}
          />
        </View>
        {error ? <InlineAlert message={error} /> : null}
        <Button
          variant="lime"
          label="Приєднатися"
          busy={busy}
          busyLabel="Заходимо…"
          disabled={!online}
          onPress={() => void enter()}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 20 },
  art: { alignSelf: "center" },
  field: { gap: 6 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fonts.sans,
    fontSize: 17,
  },
});
