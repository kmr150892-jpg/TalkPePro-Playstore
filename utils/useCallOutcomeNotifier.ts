import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { auth, db } from '../firebaseConfig';
import { sendNotificationToUser } from './notificationHelper';

// 🔔 USER SIDE: call doc status "rejected" / "missed" aana, user-oda own notification log-la entry podum.
// Host side code-ah touch pannala. Oru call-ku oru notification mattum.
const MESSAGES: Record<string, { title: string; body: (n: string) => string }> = {
  rejected: { title: 'Call Declined', body: (n) => `${n} is unavailable right now. Please try again later.` },
  missed: { title: 'Call Not Answered', body: (n) => `${n} did not answer your call.` },
};

export const useCallOutcomeNotifier = (callId?: string) => {
  const done = useRef(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !callId) return;
    done.current = false;

    const unsub = onSnapshot(doc(db, 'calls', callId), async (snap) => {
      if (!snap.exists() || done.current) return;
      const c: any = snap.data();
      const m = MESSAGES[c.status];
      if (!m) return;
      done.current = true;

      let name = c.expertName || 'Host';
      let photo: string | undefined;
      try {
        if (c.expertId) {
          const h = await getDoc(doc(db, 'users', c.expertId));
          if (h.exists()) {
            const d: any = h.data();
            name = d.name || d.userName || name;
            photo = d.profilePic || d.photoURL;
          }
        }
      } catch {}

      await sendNotificationToUser(user.uid, m.title, m.body(name), 'call', {
        callerId: c.expertId,
        callerImage: photo,
      });
    });

    return () => unsub();
  }, [callId]);
};
