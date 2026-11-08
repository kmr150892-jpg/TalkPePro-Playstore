import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { db } from '../firebaseConfig';
import { ensureCallPermissions } from './callPermissions';
import { DECLINE_STATUS, handleCallEvent, PENDING_ACCEPT_KEY } from './incomingCall';

const ACTIVE_CALL_STATUSES = ['dialing', 'calling', 'ringing', 'pending', 'Discover_dialing'];

type Opts = { uid?: string | null; userName: string; enabled: boolean };

// _layout.tsx la call pannunga. Accept button -> call accept panni /videocall ku poga
export function useCallNotificationEvents({ uid, userName, enabled }: Opts) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !uid) return;

    let busy = false;

    const processPendingAccept = async () => {
      if (busy) return;
      busy = true;
      try {
        const raw = await AsyncStorage.getItem(PENDING_ACCEPT_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(PENDING_ACCEPT_KEY);

        const { callId, ts } = JSON.parse(raw);
        if (!callId || Date.now() - Number(ts) > 60000) return; // pazhaya accept ignore

        const ref = doc(db, 'calls', String(callId));
        const snap = await getDoc(ref);
        if (!snap.exists() || !ACTIVE_CALL_STATUSES.includes(String(snap.data().status))) return; // call already mudinjiduchu

        // Camera + mic permission MUNNADIYE vaangu. Dialog vandhaalum call accepted aagala,
        // so /videocall la dialog vandhu call cut aagaadhu.
        const granted = await ensureCallPermissions();
        if (!granted) {
          // Permission kudukala -> caller hang aagaama call decline pannidu
          await updateDoc(ref, {
            status: DECLINE_STATUS,
            endedAt: serverTimestamp(),
          });
          return;
        }

        await updateDoc(ref, {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          connectedAt: serverTimestamp(),
        });

        router.push({
          pathname: '/videocall',
          params: { expertId: uid, expertName: userName, callId: String(callId), role: 'expert' },
        } as any);
      } catch (e) {
        console.log('Pending accept error:', e);
      } finally {
        busy = false;
      }
    };

    // App killed la irundhu Accept button la open aana
    notifee.getInitialNotification().then(async (initial) => {
      if (initial?.pressAction?.id === 'accept') {
        const callId = String(initial.notification?.data?.callId || '');
        if (callId) {
          await AsyncStorage.setItem(
            PENDING_ACCEPT_KEY,
            JSON.stringify({ callId, ts: Date.now() })
          ).catch(() => {});
        }
      }
      processPendingAccept();
    });

    // App foreground la button press
    const unsubNotifee = notifee.onForegroundEvent(async (event) => {
      await handleCallEvent(event);
      if (event.type === EventType.ACTION_PRESS) processPendingAccept();
    });

    // App background la irundhu Accept la open aana
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') processPendingAccept();
    });

    processPendingAccept();

    return () => {
      unsubNotifee();
      appStateSub.remove();
    };
  }, [enabled, uid, userName]);
}