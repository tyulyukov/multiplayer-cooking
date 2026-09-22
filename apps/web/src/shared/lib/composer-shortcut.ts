export type ComposerSendShortcut = "enter" | "shift-enter";

export type ComposerKeyboardEvent = Readonly<{
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  isComposing: boolean;
  metaKey: boolean;
  repeat: boolean;
  shiftKey: boolean;
}>;

export function shouldSubmitComposerShortcut(
  event: ComposerKeyboardEvent,
  shortcut: ComposerSendShortcut,
  desktop: boolean,
) {
  if (
    !desktop ||
    event.key !== "Enter" ||
    event.isComposing ||
    event.repeat ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return false;
  }

  return shortcut === "enter" ? !event.shiftKey : event.shiftKey;
}
