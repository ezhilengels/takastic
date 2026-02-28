/**
 * NotificationService.js
 *
 * Wraps expo-notifications for task reminders.
 * Notification fires exactly AT the due date/time (the moment the task becomes overdue).
 * Requires: npx expo install expo-notifications expo-device
 */

import { Platform } from 'react-native';

let Notifications = null;
let Device = null;

// Lazy-load to avoid crash if not yet installed
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (_) {
  // expo-notifications not yet installed — notifications silently disabled
}

// Show notification while app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,   // replaces deprecated shouldShowAlert
      shouldShowList:   true,   // show in notification centre
      shouldPlaySound:  true,
      shouldSetBadge:   true,
    }),
  });

  // Android requires a notification channel to be created before scheduling
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance?.MAX ?? 5,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00875A',
      sound: true,
    }).catch(() => {
      // Channel setup failure is non-fatal
    });
  }
}

/**
 * Request permission to send push notifications.
 * Call once on app startup (after sign-in).
 * Returns true if permission was granted.
 */
export async function requestNotificationPermissions() {
  if (!Notifications || !Device) return false;
  if (!Device.isDevice) return false; // Physical device required

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (_) {
    return false;
  }
}

/**
 * Schedule a local notification for a task's due date.
 * Fires exactly AT the due date/time — the moment the task becomes overdue.
 * Uses the task ID as the notification identifier so it can be cancelled/updated.
 *
 * SDK 50+ requires trigger.type = 'date'.
 * Android additionally requires a channelId.
 */
export async function scheduleNotification(taskId, taskText, dueDate) {
  if (!Notifications) return;

  try {
    // Cancel any existing notification for this task first
    await cancelNotification(taskId);

    const triggerDate = new Date(dueDate);

    // Only schedule if the due date is still in the future
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      identifier: `task-${taskId}`,
      content: {
        title: '⏰ Task is now due',
        body: taskText,
        sound: true,
        // Android notification channel
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      },
      trigger: {
        type: 'date',           // required in expo-notifications SDK 50+
        date: triggerDate,
        // Android requires channelId in the trigger as well
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      },
    });
  } catch (_) {
    // Scheduling failure is non-fatal — task still saves normally
  }
}

/**
 * Cancel a scheduled notification for a task.
 */
export async function cancelNotification(taskId) {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`);
  } catch (_) {
    // Notification may not exist — ignore
  }
}
