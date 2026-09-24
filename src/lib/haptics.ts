import * as Haptics from "expo-haptics";

export const haptics = {
  // Gentle tap for UI navigation, button clicks, tab switching
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },
  // Medium feedback for actions like checking an episode or long press
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  },
  // Firm feedback for prominent actions
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
  },
  // Tick sensation when selecting
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch {}
  },
  // Success sensation (e.g. marking watched)
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },
  // Warning sensation
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },
  // Error sensation
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  },
};
