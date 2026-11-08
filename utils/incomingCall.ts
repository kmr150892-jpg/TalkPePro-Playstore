import notifee, {
    AndroidCategory,
    AndroidImportance,
    AndroidVisibility,
    Event,
    EventType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export const CALL_CHANNEL_V3 = 'incoming_call_v3';

// _layout.tsx la rejectIncomingCall use panra same status
export const DECLINE_STATUS = 'rejected';

// Accept button press aana callId inga save aagum, app open aanadhum useCallNotificationEvents edukkum
export const PENDING_ACCEPT_KEY = '@pending_call_accept';

const notifId = (callId: string) => `call_${callId}`;

export async function showIncomingCall(data: Record<string, any>) {
  const callId = String(data.callId || '');
  if (!callId) return;

  const channelId = await notifee.createChannel({
    id: CALL_CHANNEL_V3,
    name: 'Incoming calls',
    importance: AndroidImportance.HIGH,
    sound: 'ringtone', // res/raw/ringtone.mp3 (extension illa)
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    visibility: AndroidVisibility.PUBLIC,
  });

  await notifee.displayNotification({
    id: notifId(callId),
    title: 'Incoming call 📞',
    body: `${data.callerName || 'A user'} is calling you`,
    data,
    android: {
      channelId,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      timeoutAfter: 30000, // missed call na 30 sec la auto-remove
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: 'Accept', pressAction: { id: 'accept', launchActivity: 'default' } },
        { title: 'Decline', pressAction: { id: 'decline' } },
      ],
    },
  });
}

export async function cancelIncomingCall(callId: string) {
  if (!callId) return;
  await notifee.cancelNotification(notifId(callId));
}

// Foreground + background rendulayum idhaiye use pannalaam
export async function handleCallEvent({ type, detail }: Event) {
  if (type !== EventType.ACTION_PRESS) return;

  const actionId = detail.pressAction?.id;
  const callId = String(detail.notification?.data?.callId || '');
  if (!callId) return;

  if (actionId === 'decline') {
    await cancelIncomingCall(callId);
    try {
      // App killed la irundhaa Firebase login restore aaga wait pannu
      if ((auth as any).authStateReady) await (auth as any).authStateReady();
      await updateDoc(doc(db, 'calls', callId), {
        status: DECLINE_STATUS,
        endedAt: serverTimestamp(),
      });
    } catch (e) {
      console.log('Decline update error:', e);
    }
  }

  if (actionId === 'accept') {
    await cancelIncomingCall(callId);
    try {
      await AsyncStorage.setItem(
        PENDING_ACCEPT_KEY,
        JSON.stringify({ callId, ts: Date.now() })
      );
    } catch (e) {
      console.log('Pending accept save error:', e);
    }
    // Firestore accept + /videocall navigation: useCallNotificationEvents hook (app open aanadhum)
  }
}