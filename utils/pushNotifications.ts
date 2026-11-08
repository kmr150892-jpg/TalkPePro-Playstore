import notifee from '@notifee/react-native';
import * as Notifications from 'expo-notifications';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../firebaseConfig';

// Call channel ippo Notifee (incoming_call_v3) la create aagum - utils/incomingCall.ts
// Message channel mattum expo-notifications la irukku
export const MESSAGE_CHANNEL_ID = 'chat_messages_v2';

// App open la irukkumbodhu in-app sound already irukku, so system banner / sound vendaam
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function setupChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(MESSAGE_CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'message.mp3',
    vibrationPattern: [0, 250, 150, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function registerForPushNotifications(uid: string) {
  if (Platform.OS !== 'android') return;
  try {
    await setupChannels();

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    // Notifee permission (Android 13+ ku)
    await notifee.requestPermission();

    // Native FCM token (google-services.json already irukku)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = String(tokenData.data || '');
    if (!token) return;

    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
  } catch (e) {
    console.log('Push register error:', e);
  }
}