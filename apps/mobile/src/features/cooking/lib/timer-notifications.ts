import * as Notifications from "expo-notifications";

const timerPrefix = "cooking-timer-";

export const timerNotificationId = (timerId: string) => `${timerPrefix}${timerId}`;

// The room plays its own chime and haptic while open, so timer notifications only surface
// when the app is in the background.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const timer = notification.request.identifier.startsWith(timerPrefix);

    return {
      shouldShowBanner: !timer,
      shouldShowList: true,
      shouldPlaySound: !timer,
      shouldSetBadge: false,
    };
  },
});

export const askTimerNotificationPermission = async () => {
  try {
    const current = await Notifications.getPermissionsAsync();

    if (current.status === "undetermined") await Notifications.requestPermissionsAsync();
  } catch {
    // Notifications stay off; the in-app chime still works.
  }
};

export const scheduleTimerNotification = async (
  timerId: string,
  fireAt: number,
  title: string,
  body: string,
) => {
  await Notifications.scheduleNotificationAsync({
    identifier: timerNotificationId(timerId),
    content: { title, body, sound: "default" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
  });
};

export const cancelTimerNotification = async (timerId: string) => {
  await Notifications.cancelScheduledNotificationAsync(timerNotificationId(timerId));
};
