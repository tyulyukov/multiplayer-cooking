import * as Haptics from "expo-haptics";

const play = (feedback: () => Promise<void>) => {
  feedback().catch(() => undefined);
};

const timerFiredFollowUpMs = 400;

export const haptics = {
  selection: () => play(Haptics.selectionAsync),
  send: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  commit: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  timerFired: () => {
    haptics.warning();
    setTimeout(
      () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
      timerFiredFollowUpMs,
    );
  },
};

export type HapticKind = Exclude<keyof typeof haptics, "timerFired">;
