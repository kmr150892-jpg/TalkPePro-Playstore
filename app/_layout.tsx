import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as KeepAwake from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications'; // 🔔 NEW: notification tap listener
import { Redirect, Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router'; // 🔥 SATTI UPDATE: Imported Redirect
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, LogBox, Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaintenanceScreen from '../components/.MaintenanceScreen';
import UpdateAlert from '../components/UpdateAlert';
import { auth, db } from '../firebaseConfig';
import { BlockProvider } from '../utils/context/BlockContext';
import { CustomAlertHost, installCustomAlert } from '../utils/CustomAlert'; // 🔥 NEW: custom designed system messages
import { getAcceptingCallId } from '../utils/incomingCall'; // 📞 NEW: Notifee Accept press aana call ah skip panna
import { sendNotificationToUser } from '../utils/notificationHelper'; // 🔥 NEW: missed call notification
import { registerForPushNotifications } from '../utils/pushNotifications'; // 🔔 NEW: push token register
import { playMessageSound, playNotificationSound, startRingtone, stopRingtone } from '../utils/sounds';
import { useCallNotificationEvents } from '../utils/useCallNotificationEvents'; // 📞 NEW: Notifee Accept / Decline button handling

// 🔔 NEW: last handled notification tap key (module level - RootLayout remount aanaalum duplicate navigate aagaadhu)
let lastHandledNotifKey: string | null = null;

// 🔥 NEW: Replaces every native white Alert.alert box with the custom designed alert (runs once at app start)
installCustomAlert();

LogBox.ignoreLogs([
  'BloomFilter error',
  '@firebase/firestore:',
  'Missing or insufficient permissions',
]);

const CURRENT_APP_VERSION = "1.0.5";

if (Platform.OS === 'android' && (LayoutAnimation as any).configureNext) {
  (LayoutAnimation as any).configureNext = () => {}; 
}

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2 - DIAMONDS ONLY)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000'] as const
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000'] as const
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000'] as const
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000'] as const
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000'] as const
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000'] as const
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000'] as const
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000'] as const
  };
};

// 🔥 NEW: Original RootLayout renamed to RootLayoutInner (body is 100% unchanged).
// The default export below wraps it so the custom alert host is ALWAYS mounted
// (even during maintenance / update / loading / ejecting screens).
function RootLayoutInner() {
  const [initializing, setInitializing] = useState(true);
  const [isEjecting, setIsEjecting] = useState(false); 
  const [user, setUser] = useState<User | null>(null); 
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Expert');
  const [isExpertLive, setIsExpertLive] = useState<boolean>(false); 
  
  const [registrationInProgress, setRegistrationInProgress] = useState<boolean>(false);
  const [isClientMode, setIsClientMode] = useState<boolean>(false);
  // 🔥 NEW: holds routing while an email-signup account is waiting for email verification
  const [unverifiedHold, setUnverifiedHold] = useState<boolean>(false); 
  
  const router = useRouter();
  const segments = useSegments() as string[];
  const rootNavigationState = useRootNavigationState();

  const isNavigatingToCall = useRef(false);
  const hasShownLogoutAlert = useRef(false);
  const notifiedCallsRef = useRef<Set<string>>(new Set()); // 🔥 NEW: prevents duplicate missed/cancelled call notification
  const segmentsRef = useRef<string>(''); // 🔔 latest screen path (sound listeners ku)
  segmentsRef.current = segments.join('/');
  const chatUnreadRef = useRef<Record<string, number>>({}); // 🔔 chat wise unread count
  const notifCountRef = useRef<number | null>(null); // 🔔 bell notification count (sound ku)

  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const [incomingTimer, setIncomingTimer] = useState(20); // Default to 20 seconds

  useEffect(() => {
    const wipeSession = async () => {
       await AsyncStorage.removeItem('@intended_role');
       await AsyncStorage.removeItem('@expert_draft');
       await AsyncStorage.removeItem('@is_logging_in'); // 🔥 NEW: clear stuck login flag from a killed app
    };
    wipeSession();
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "system", "app_settings"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsMaintenance(data.isMaintenance || false);
        let serverVersion = data.minVersion;
        if (Array.isArray(serverVersion)) serverVersion = serverVersion[0];
        
        const cleanServerVer = String(serverVersion || "1.0.5").replace(/["']/g, "").trim();
        setNeedsUpdate(cleanServerVer !== CURRENT_APP_VERSION.trim());
      }
    }, (error) => {
      if (error.code === 'permission-denied') console.log("System settings sync detached.");
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
    }
    return () => { 
      if (Platform.OS !== 'web') {
        try {
          const deactivatePromise = KeepAwake.deactivateKeepAwake();
          if (deactivatePromise && typeof deactivatePromise.catch === 'function') {
            deactivatePromise.catch(() => {});
          }
        } catch (e) { }
      }
    };
  }, []);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      setUser(u);
      notifCountRef.current = null; // 🔔 account maarina baseline reset

      // 🔥 NEW: Email/password accounts that are NOT verified yet are held (no routing into the app)
      // until the profile tells us whether verification is actually required (emailVerifyRequired flag).
      const needsVerifyCheck = !!u && !u.emailVerified && u.providerData.some((p) => p.providerId === 'password');
      setUnverifiedHold(needsVerifyCheck);

      if (u) {
        unsubUser = onSnapshot(doc(db, "users", u.uid), { includeMetadataChanges: true }, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.isBlocked === true) {
                if (docSnap.metadata.fromCache) {
                    console.log("Cached block detected, waiting for server to confirm...");
                    return; 
                }

                if (!hasShownLogoutAlert.current) {
                    hasShownLogoutAlert.current = true;
                    Alert.alert(
                        "Account Suspended",
                        "Your account has been restricted by the administrator. Please contact support for further assistance.",
                        [
                            {
                                text: "OK",
                                onPress: () => {
                                    auth.signOut().then(() => {
                                        hasShownLogoutAlert.current = false; 
                                    }).catch(console.error);
                                }
                            }
                        ],
                        { cancelable: false } 
                    );
                }
                return; 
            }

            // 🔔 NEW: puthu bell notification vandha sound
            const notifLen = Array.isArray(data.notifications) ? data.notifications.length : 0;
            if (!docSnap.metadata.fromCache) {
                if (notifCountRef.current !== null && notifLen > notifCountRef.current) {
                    playNotificationSound();
                }
                notifCountRef.current = notifLen;
            }

            if (needsVerifyCheck) {
                setUnverifiedHold(data.emailVerifyRequired === true);
            }

            setUserRole(data.role || 'user');
            setUserStatus(data.status || '');
            setUserName(data.name || 'Expert');
            setIsExpertLive(data.isLive || false); 
            setRegistrationInProgress(data.registrationInProgress || false);
            setIsClientMode(data.isClient || false);
          }
          setInitializing(false);
        }, (error) => {
          if (error.code === 'permission-denied') console.log("User profile sync detached.");
        });
      } else {
        setUserRole(null);
        setUserStatus(null);
        setIsExpertLive(false); 
        setRegistrationInProgress(false);
        setIsClientMode(false);
        setInitializing(false);
        setIsEjecting(false);
        setUnverifiedHold(false); 
        
        // 🔥 SATTI UPDATE 1: Removed manual router.replace() here.
        // It was causing a "Navigation Deadlock". We now let <Redirect /> handle it flawlessly below.
      }
    });

    return () => {
      if (unsubUser) unsubUser();
      unsubscribeAuth();
    };
  }, []);

  // 🔔 Push token register (app close la irundhaalum notification varanum)
  useEffect(() => {
    if (!user?.uid || initializing) return;
    registerForPushNotifications(user.uid);
  }, [user?.uid, initializing]);

  // 📞 NEW: Notifee call notification Accept / Decline buttons (app killed / background / foreground)
  useCallNotificationEvents({
    uid: user?.uid,
    userName,
    enabled: userRole === 'expert' && !initializing && !!rootNavigationState?.key,
  });

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    const handle = (response: Notifications.NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const key = `${response.notification.request.identifier}_${response.notification.date}`;
      if (lastHandledNotifKey === key) return;
      lastHandledNotifKey = key;

      const d: any = response.notification.request.content.data || {};
      if (d.type === 'message' && d.chatId && d.senderId) {
        router.push({
          pathname: '/chat/ChatScreen',
          params: { chatId: d.chatId, receiverId: d.senderId, receiverName: d.senderName || '' }
        } as any);
      }
      if (d.type === 'host_online' && d.hostId) {
        router.push({ pathname: '/expert-detail', params: { id: d.hostId } } as any);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handle);

    Promise.resolve(Notifications.getLastNotificationResponse())
      .then((r) => { if (r) handle(r); })
      .catch(() => {});

    return () => sub.remove();
  }, [rootNavigationState?.key]);

  useEffect(() => {
  if (!user?.uid || userRole !== 'expert' || initializing || !rootNavigationState?.key) return;

  const callsQuery = query(
    collection(db, "calls"),
    where("expertId", "==", user.uid),
    where("status", "==", "ringing"),
    limit(1)
  );

  let navTimeout: ReturnType<typeof setTimeout>;

  const unsubCalls = onSnapshot(callsQuery, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.fromCache || !auth.currentUser) return;

    const currentPath = segments.join('/');
    const inVideoCall = currentPath.includes('videocall');
    const inLiveMode = currentPath.includes('live') || isExpertLive; 
    const inPartyMode = currentPath.includes('Session');
    const inForum = currentPath.includes('forum'); 

    if (!snap.empty && !inVideoCall && !inLiveMode && !inPartyMode && !inForum && !isNavigatingToCall.current) {
      const callDoc = snap.docs[0];
      if (callDoc.id === getAcceptingCallId()) return;
      const callData = callDoc.data();

      if (callData.endedAt || callData.status !== 'ringing') return;

      const now = Date.now();
      const callTime = callData.createdAt?.toMillis ? callData.createdAt.toMillis() : now;
      if (now - callTime > 10000) return;

      isNavigatingToCall.current = true;
      
      router.push({
        pathname: '/videocall',
        params: { 
          expertId: user.uid, 
          expertName: userName,
          callId: callDoc.id,
          role: 'expert'
        }
      });

      navTimeout = setTimeout(() => { isNavigatingToCall.current = false; }, 10000); 
    }
  }, (error) => {
      if (error.code === 'permission-denied') console.log("Call monitor sync detached safely.");
  });

  return () => {
    unsubCalls();
    if (navTimeout) clearTimeout(navTimeout); 
  };
}, [user?.uid, userRole, userName, isExpertLive, segments.join('/'), initializing, rootNavigationState?.key]);

  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const currentPath = segments.join('/');
    const inVideoCall = currentPath.includes('videocall');
    const inLiveMode = currentPath.includes('live') || isExpertLive;

    if (!inVideoCall && !inLiveMode) {
      updateDoc(doc(db, "users", user.uid), { isBusy: false }).catch(() => {});
    }
  }, [user?.uid, userRole, isExpertLive, segments.join('/'), initializing]);

  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const currentPath = segments.join('/');
    const inForum = currentPath.includes('forum');
    const inLiveMode = currentPath.includes('live') || isExpertLive;
    const inVideoCall = currentPath.includes('videocall');
    const inPartyMode = currentPath.includes('Session');
    
    if (inForum || inLiveMode || inVideoCall || inPartyMode) return;

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('expertId', '==', user.uid), where('status', '==', 'calling'));

    const unsubIncomingCall = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const callData = change.doc.data();
                const callId = change.doc.id;
                if (callId === getAcceptingCallId()) return;
                
                setIncomingCallData(callData);
                setIncomingCallId(callId);
                setIncomingTimer(20); // Reset to 20 seconds for each new incoming call

                if (callData.callerId) {
                    getDoc(doc(db, 'users', callData.callerId)).then((uDoc) => {
                        if (uDoc.exists()) {
                            const uData = uDoc.data();
                            const actualPic = uData.profilePic || uData.photoURL || callData.callerImage;
                            const actualName = uData.name || uData.displayName || callData.callerName;
                            
                            const callerDiamonds = uData.totalSpentDiamonds || 0;

                            setIncomingCallData((prev: any) => 
                                prev && prev.callerId === callData.callerId 
                                ? { ...prev, callerImage: actualPic, callerName: actualName, callerDiamonds } 
                                : prev
                            );
                        }
                    }).catch(() => {});
                }
            }
            if (change.type === 'modified') {
                const callData = change.doc.data();
                if (callData.status === 'cancelled' || callData.status === 'missed') {
                    setIncomingCallData(null);
                    setIncomingCallId(null);
                }
            }
            if (change.type === 'removed') {
                setIncomingCallData(null);
                setIncomingCallId(null);
            }
        });
    }, (error) => {
        if (error.code === 'permission-denied') console.log("Incoming call sync detached.");
    });

    return () => {
        if (unsubIncomingCall) unsubIncomingCall();
    };
  }, [user?.uid, userRole, initializing, segments.join('/'), isExpertLive]); 

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (incomingCallId && incomingCallData) {
        interval = setInterval(() => {
            setIncomingTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    updateDoc(doc(db, 'calls', incomingCallId), {
                        status: 'missed',
                        endedAt: serverTimestamp()
                    }).catch(() => {});
                    setIncomingCallData(null);
                    setIncomingCallId(null);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [incomingCallId, incomingCallData]);

  // 🔔 Ring sound while host's incoming call popup is visible
  const isIncomingRinging = !!(incomingCallId && incomingCallData);
  useEffect(() => {
    if (isIncomingRinging) startRingtone();
    else stopRingtone();
    return () => stopRingtone();
  }, [isIncomingRinging]);

  // 🔔 Host live / forum / party la irukkumbodhu vara call ku ring sound
  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const currentPath = segments.join('/');
    const busyScreen =
      currentPath.includes('forum') ||
      currentPath.includes('live') ||
      currentPath.includes('Session') ||
      isExpertLive;
    if (!busyScreen) return;

       const q = query(
      collection(db, 'calls'),
      where('expertId', '==', user.uid),
      where('status', 'in', ['calling', 'ringing', 'pending', 'Discover_dialing'])
    );

    let stopTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = onSnapshot(q, (snapshot) => {
      const hasFreshCall = snapshot.docs.some((d) => {
        const c: any = d.data();
        const ts = c.createdAt?.toMillis ? c.createdAt.toMillis() : Date.now();
        return Date.now() - ts < 15000;
      });
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      if (hasFreshCall) {
        startRingtone();
        stopTimer = setTimeout(() => stopRingtone(), 20000); // 20 sec ku mela ring venaam
      } else {
        stopRingtone();
      }
    }, (error) => {
      if (error.code === 'permission-denied') console.log("Busy-mode ring listener detached.");
    });

    return () => {
      unsub();
      if (stopTimer) clearTimeout(stopTimer);
      stopRingtone();
    };
  }, [user?.uid, userRole, initializing, isExpertLive, segments.join('/')]);

  // 🔔 Chat screen ku veliya irukkumbodhu message sound (user + host rendu perukkum)
  useEffect(() => {
    if (!user?.uid || initializing) return;

    chatUnreadRef.current = {};
    let firstSnapshot = true;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
      let shouldPlay = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          delete chatUnreadRef.current[change.doc.id];
          return;
        }
        const d: any = change.doc.data();
        const unread = Number(d.unreadCount?.[user.uid] || 0);
        const prev = chatUnreadRef.current[change.doc.id] ?? 0;
        chatUnreadRef.current[change.doc.id] = unread;

        if (firstSnapshot) return;                         // old history ku sound illa
        if (change.doc.metadata.hasPendingWrites) return;  // naan anuppinadhu
        if (unread > prev) shouldPlay = true;              // puthu message vandhirukku
      });

      firstSnapshot = false;

      if (shouldPlay) {
        const p = segmentsRef.current;
        // Chat screen kulla irundha, ChatScreen thaane sound podum (double sound varaadhu)
        if (!p.includes('chat') && !p.includes('videocall')) playMessageSound();
      }
    }, (error) => {
      if (error.code === 'permission-denied') console.log("Chat sound listener detached.");
    });

    return () => unsubChats();
  }, [user?.uid, initializing]);

  // 🔥 NEW: GLOBAL MISSED / CANCELLED CALL NOTIFIER
  // Runs on EVERY screen (live, forum, quick connect, videocall...). Whenever a call to this host
  // becomes 'missed' or 'cancelled', one notification (with caller id + photo) is saved in the host's list.
  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const missedQuery = query(
      collection(db, 'calls'),
      where('expertId', '==', user.uid),
      where('status', 'in', ['missed', 'cancelled', 'rejected', 'declined'])
    );

    const toMs = (t: any): number | null =>
      t?.toMillis ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : null);

    const unsubMissed = onSnapshot(missedQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;

        const callId = change.doc.id;
        const d: any = change.doc.data();

        if (d.hostNotified === true) return;                          // already notified earlier
        if (notifiedCallsRef.current.has(callId)) return;             // already notified in this session
        if (d.acceptedAt || d.connectedAt || (d.finalDuration || 0) > 0) return; // call actually connected -> not a missed call

        const ts = toMs(d.endedAt) ?? toMs(d.updatedAt) ?? toMs(d.createdAt) ?? Date.now();
        if (Date.now() - ts > 10 * 60 * 1000) return;                 // ignore old history

        const callerId = d.callerId || d.userId;
        if (!callerId) return;

        notifiedCallsRef.current.add(callId);

        const callerName = d.callerName || d.userName || 'A user';
        const callerImage = d.callerImage || d.userImage || undefined;
        let notifTitle = "Call Cancelled 📵";
        let notifMessage = `${callerName} cancelled the call`;
        if (d.status === 'missed') {
          notifTitle = "Missed Call 📞";
          notifMessage = `${callerName} called you`;
        } else if (d.status === 'rejected' || d.status === 'declined') {
          notifTitle = "Call Declined 🚫";
          notifMessage = `You declined a call from ${callerName}`;
        }

        sendNotificationToUser(
          user.uid,
          notifTitle,
          notifMessage,
          'call',
          { callerId, callerImage }
        );

        updateDoc(change.doc.ref, { hostNotified: true }).catch(() => {});
      });
    }, (error) => {
      if (error.code === 'permission-denied') console.log("Missed call notifier detached.");
    });

    return () => unsubMissed();
  }, [user?.uid, userRole, initializing]);

  const acceptIncomingCall = async () => {
      if (!incomingCallId) return;
      try {
          await updateDoc(doc(db, 'calls', incomingCallId), { 
              status: 'accepted', 
              acceptedAt: serverTimestamp(),
              connectedAt: serverTimestamp() 
          });
          router.push({
              pathname: '/videocall',
              params: { 
                  expertId: user!.uid, 
                  expertName: userName,
                  callId: incomingCallId,
                  role: 'expert'
              }
          });
      } catch(e) {
          console.error("Accept call error:", e);
      }
      setIncomingCallData(null);
      setIncomingCallId(null);
  };

  const rejectIncomingCall = async () => {
      if (!incomingCallId) return;
      try {
          await updateDoc(doc(db, 'calls', incomingCallId), { 
              status: 'rejected', 
              endedAt: serverTimestamp() 
          });
      } catch(e) {
          console.error("Reject call error:", e);
      }
      setIncomingCallData(null);
      setIncomingCallId(null);
  };

  useEffect(() => {
    const gateKeeper = async () => {
        if (initializing || !rootNavigationState?.key) return;
        
        const isRealAdmin = userRole === 'admin' && user?.email === 'kmr150892@gmail.com';
        if ((isMaintenance || needsUpdate) && !isRealAdmin) return; 

        const firstSegment = segments[0] || '';
        const inAuthGroup = segments[0] === '(tabs)' || segments[0] === '(admin)' || segments.includes('expert');
        const inExpertPath = segments.includes('expert');
        const inVideoCall = segments.includes('videocall');
        const inTabs = segments.includes('(tabs)'); 
        const inChatPath = segments.includes('chat'); 
        const inHistoryPath = segments.includes('expert-history');
        const inBlockedUsersPath = segments.includes('blocked-users');
        const inUserDetailPath = segments.includes('user-detail');

        if (inVideoCall) return;

        // 🔥 NEW: while index.tsx is handling a login (role lock + routing + alerts), GateKeeper stays silent.
        // This stops the spinner/eject race that wiped the login screen before the Access Denied alert could show.
        const loggingIn = await AsyncStorage.getItem('@is_logging_in');
        if (loggingIn === 'true') return;

        if (!user) {
          // 🔥 SATTI UPDATE 2: Removed imperative logic here to prevent deadlock.
          // <Redirect /> below takes care of everything when user is null.
          return;
        }

        // 🔥 NEW: unverified email-signup account -> do NOT send into the app
        if (unverifiedHold) return;

        if (userRole === 'admin') {
          if (isRealAdmin) {
            if (firstSegment !== '(admin)') router.replace('/(admin)' as any);
          } else {
            if (firstSegment !== '(tabs)') router.replace('/(tabs)' as any);
          }
          return;
        }

        const currentIntendedRole = await AsyncStorage.getItem('@intended_role');
        const isAnyExpertState = userRole === 'expert' || userStatus === 'Pending' || userStatus === 'Active' || registrationInProgress === true;

        if (isAnyExpertState) {
            if (currentIntendedRole === 'user' && !isRealAdmin) {
                setIsEjecting(true);
                await AsyncStorage.removeItem('@intended_role');
                await auth.signOut();
                Alert.alert("Access Denied", "This account is for Hosts only. You cannot login as a User.");
                return;
            }

            if (userRole === 'expert') {
                if (!inExpertPath && !inVideoCall && !inChatPath && !inHistoryPath && !inBlockedUsersPath && !inUserDetailPath && firstSegment !== 'expert-register') {
                    router.replace('/expert/dashboard' as any);
                }
                return;
            }
            if (userStatus === 'Pending') {
                if (firstSegment !== 'waiting-approval') router.replace('/waiting-approval' as any);
                return;
            }
            if (registrationInProgress === true) {
                if (firstSegment !== 'expert-register') router.replace('/expert-register' as any);
                return;
            }
        }

        if (!isAnyExpertState && isClientMode === true) {
            if (currentIntendedRole === 'expert' && !isRealAdmin) {
                setIsEjecting(true);
                await AsyncStorage.removeItem('@intended_role');
                await auth.signOut();
                Alert.alert("Access Denied", "This account is for Users only. You cannot switch to Host.");
                return;
            }

            if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
                router.replace('/(tabs)' as any);
            }
            return;
        }

        if (!isAnyExpertState && isClientMode === false) {
            if (currentIntendedRole === 'expert') {
                if (firstSegment !== 'expert-register') router.replace('/expert-register' as any);
            } else if (currentIntendedRole === 'user') {
                updateDoc(doc(db, "users", user.uid), { isClient: true }).catch(() => {});
                
                if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
                    router.replace('/(tabs)' as any);
                }
            }
        }
    };

    gateKeeper();
  }, [user, userRole, userStatus, registrationInProgress, isClientMode, unverifiedHold, initializing, segments.join('/'), isMaintenance, needsUpdate, rootNavigationState?.key]);

  const isGlobalAdmin = userRole === 'admin' && user?.email === 'kmr150892@gmail.com';
  if (isMaintenance && !isGlobalAdmin) return <MaintenanceScreen />;
  if (needsUpdate && !isGlobalAdmin) return <UpdateAlert />;
  
  if (initializing || isEjecting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // 🔥 SATTI ULTIMATE FIX 3: DECLARATIVE AUTH EJECTION 🔥
  // Ithu thaan magic! User null aagitta, entha function-ukkum wait pannama direct-ah DOM reset aagi '/' (Login) ku thooki potrum.
  // Ithu Expo Router deadlock-ah permanently solve pannidum.
  if (!user) {
      const firstSegment = segments[0] || '';
      if (firstSegment !== '' && firstSegment !== 'index' && firstSegment !== 'expert-register') {
          console.log("🔥 FORCE EJECT: Declarative Redirect to Login triggered.");
          return <Redirect href="/" />;
      }
  }

  const userTheme = incomingCallData ? calculateUserLevel(incomingCallData.callerDiamonds || 0) : calculateUserLevel(0);

  return (
    <BlockProvider>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="user-detail" options={{ presentation: 'modal' }} />
        <Stack.Screen name="expert/dashboard" />
        <Stack.Screen name="expert/notifications" />
        <Stack.Screen name="expert-register" /> 
        <Stack.Screen name="waiting-approval" /> 
        <Stack.Screen name="chat/ChatScreen" /> 
        <Stack.Screen name="videocall" options={{ gestureEnabled: false }} />
        <Stack.Screen name="expert-history" />
        <Stack.Screen name="blocked-users" /> 
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      {incomingCallData && incomingCallId && (
        <Modal visible={true} transparent animationType="fade">
            <View style={styles.incomingCallOverlay}>
                <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={[styles.glowOrb, { backgroundColor: userTheme.color }]} />

                <View style={[styles.incomingCallCard, { borderColor: userTheme.secondaryColor }]}>
                   <LinearGradient colors={userTheme.themeBg} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
                    
                    <View style={styles.callHeaderBadge}>
                        <View style={[styles.pulsingDot, {backgroundColor: userTheme.color, shadowColor: userTheme.color}]} />
                        <Text style={[styles.incomingCallTitle, {color: userTheme.color}]}>{userTheme.status}</Text>
                    </View>
                    
                    <View style={styles.callerAvatarContainer}>
                        <LinearGradient colors={[userTheme.color, userTheme.secondaryColor]} style={styles.avatarRing}>
                            <Image 
                                source={{ uri: incomingCallData.callerImage || 'https://ui-avatars.com/api/?name=User&background=0F172A&color=fff' }} 
                                style={[styles.incomingAvatar, { borderColor: userTheme.secondaryColor }]} 
                            />
                        </LinearGradient>
                        <LinearGradient colors={[userTheme.color, userTheme.secondaryColor]} style={styles.userLevelBadge}>
                             <Text style={styles.userLevelText}>{userTheme.label} L{userTheme.lvl}</Text>
                        </LinearGradient>
                    </View>
                    
                    <Text style={styles.incomingCallerName} numberOfLines={1} adjustsFontSizeToFit>
                        {incomingCallData.callerName || 'A User'}
                    </Text>
                    
                    <View style={styles.sessionTypeBadge}>
                        <Text style={styles.incomingSubText}>
                            {incomingCallData.isFreeTrial ? '🎁 Complimentary Session' : '💎 Premium Private Call'}
                        </Text>
                    </View>

                    <Text style={[styles.incomingTimerText, { textShadowColor: userTheme.secondaryColor }]}>
                        00:{incomingTimer.toString().padStart(2, '0')}
                    </Text>
                    
                    <View style={styles.incomingActionRow}>
                        <TouchableOpacity style={styles.actionBtnWrapper} onPress={rejectIncomingCall}>
                            <LinearGradient colors={['#EF4444', '#991B1B']} style={styles.incomingBtn}>
                                <MaterialCommunityIcons name="phone-hangup" size={26} color="#FFF" />
                                <Text style={styles.incomingBtnText}>Decline</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.actionBtnWrapper} onPress={acceptIncomingCall}>
                            <LinearGradient colors={['#10B981', '#047857']} style={styles.incomingBtn}>
                                <MaterialCommunityIcons name="phone" size={26} color="#FFF" />
                                <Text style={styles.incomingBtnText}>Accept</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      )}
    </BlockProvider>
  );
}

// 🔥 NEW: Default export (required by Expo Router). Keeps the custom alert host mounted on EVERY state.
export default function RootLayout() {
  return (
    <>
      <RootLayoutInner />
      <CustomAlertHost />
    </>
  );
}

const styles = StyleSheet.create({
    incomingCallOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 },
    glowOrb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.25, filter: 'blur(70px)' },
    incomingCallCard: { width: '85%', borderRadius: 30, padding: 25, alignItems: 'center', borderWidth: 1.5, elevation: 25, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30 },
    callHeaderBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pulsingDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, shadowOpacity: 0.8, shadowRadius: 5 },
    incomingCallTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    callerAvatarContainer: { position: 'relative', marginBottom: 25, alignItems: 'center' },
    avatarRing: { padding: 4, borderRadius: 65, elevation: 15 },
    incomingAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4 },
    userLevelBadge: { position: 'absolute', bottom: -12, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, borderWidth: 2, borderColor: '#020617', elevation: 10 },
    userLevelText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    incomingCallerName: { color: '#FFF', fontSize: 26, fontWeight: '900', marginBottom: 10, textAlign: 'center', letterSpacing: -0.5 },
    sessionTypeBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 20 },
    incomingSubText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
    incomingTimerText: { color: '#F87171', fontSize: 32, fontWeight: '900', letterSpacing: 3, marginBottom: 30, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
    incomingActionRow: { flexDirection: 'row', gap: 15, width: '100%', justifyContent: 'space-between' },
    actionBtnWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', elevation: 10 },
    incomingBtn: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    incomingBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }
});
