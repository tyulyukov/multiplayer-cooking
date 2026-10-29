import { colors, radii } from "@multiplayer-cooking/theme";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { entering, exiting, layout } from "@/shared/lib/motion";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { InlineAlert } from "@/shared/ui/inline-alert";
import { Text } from "@/shared/ui/text";

import type { HelperChatModel } from "../model/use-helper-chat";
import { ToolsField } from "./tools-field";

const noteTime = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" });

const noteMaxLength = 1000;

type HelperNotesProps = { model: HelperChatModel };

export function HelperNotes({ model }: HelperNotesProps) {
  const { notes, note, disabled } = model;

  return (
    <View style={styles.notes}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
      >
        {notes.length === 0 ? (
          <EmptyState
            illustration="notes-clip"
            size={96}
            message="Збережи тут те, що варто пам’ятати під час готування."
          />
        ) : (
          <View accessibilityLabel="Нотатки кухні" style={styles.list}>
            {notes.map((item) => (
              <Animated.View
                key={item._id}
                entering={entering.fadeIn}
                exiting={exiting.fadeOut}
                layout={layout.morph}
                style={styles.note}
              >
                <Text selectable>{item.text}</Text>
                <View style={styles.noteFooter}>
                  <Text variant="meta" color={colors.mutedForeground} style={styles.meta}>
                    {item.author} · {noteTime.format(item.createdAt)}
                  </Text>
                  {item.canDelete ? (
                    <Button
                      variant="text"
                      compact
                      label="Прибрати"
                      accessibilityLabel={`Прибрати нотатку: ${item.text}`}
                      disabled={disabled}
                      onPress={() => model.deleteNote(item._id)}
                    />
                  ) : null}
                </View>
              </Animated.View>
            ))}
          </View>
        )}
        {model.error ? <InlineAlert message={model.error} /> : null}
        <Animated.View layout={layout.morph} style={styles.form}>
          <ToolsField
            label="Нотатка для кухні"
            value={note}
            onChangeText={model.setNote}
            maxLength={noteMaxLength}
            multiline
            placeholder="Наприклад, наступного разу менше солі"
          />
          {note.length >= noteMaxLength * 0.8 ? (
            <Text variant="meta" color={colors.mutedForeground}>
              {note.length}/{noteMaxLength}
            </Text>
          ) : null}
          <Button
            label="Зберегти нотатку"
            busy={model.pending && note.trim().length > 0}
            busyLabel="Зберігаємо…"
            disabled={disabled || !note.trim()}
            onPress={() => void model.saveNote()}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  notes: { flex: 1 },
  content: { gap: 16, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  list: { gap: 12 },
  note: {
    gap: 4,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 4,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  noteFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { flex: 1, paddingVertical: 10 },
  form: { gap: 8 },
});
