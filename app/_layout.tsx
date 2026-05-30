import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as KeepAwake from 'expo-keep-awake';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, LogBox, Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaintenanceScreen from '../components/.MaintenanceScreen';
import UpdateAlert from '../components/UpdateAlert';
import { auth, db } from '../firebaseConfig';

LogBox.ignoreLogs([
  'BloomFilter error',
  '@firebase/firestore:',
  'Missing or insufficient permissions',
]);

const CURRENT_APP_VERSION = "1.0.5";

if (Platform.OS === 'android' && (LayoutAnimation as any).configureNext) {
  (LayoutAnimation as any).configureNext = () => {}; 
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [isEjecting, setIsEjecting] = useState(false); // 🔥 SATTI FIX: The Iron Curtain state
  const [user, setUser] = useState<User | null>(null); 
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Expert');
  const [isExpertLive, setIsExpertLive] = useState<boolean>(false); 
  
  const [registrationInProgress, setRegistrationInProgress] = useState<boolean>(false);
  const [isClientMode, setIsClientMode] = useState<boolean>(false); 
  
  const router = useRouter();
  const segments = useSegments() as string[];
  const rootNavigationState = useRootNavigationState();

  const isNavigatingToCall = useRef(false);
  const hasShownLogoutAlert = useRef(false);

  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const [incomingTimer, setIncomingTimer] = useState(12); 

  // 🔥 SATTI FIX: WIPE MEMORY ON APP STARTUP ONCE 🔥
  useEffect(() => {
    const wipeSession = async () => {
       await AsyncStorage.removeItem('@intended_role');
       await AsyncStorage.removeItem('@expert_draft');
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

      if (u) {
        // 🔥 SATTI FIX: Added { includeMetadataChanges: true } here
        unsubUser = onSnapshot(doc(db, "users", u.uid), { includeMetadataChanges: true }, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.forceLogout === true || data.status === 'Blocked' || data.isBlocked === true) {
                // 🔥 SATTI FIX: THE MAGIC LINE 🔥
                // Cache-la irundhu 'blocked' nu vantha, action edukkaatha, Server update-ku wait pannu!
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
        setIsEjecting(false); // 🔥 SATTI FIX: Lift the curtain safely after logout is complete
        
        setTimeout(() => {
            router.replace('/' as any);
        }, 0);
      }
    });

    return () => {
      if (unsubUser) unsubUser();
      unsubscribeAuth();
    };
  }, []);

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

    if (!snap.empty && !inVideoCall && !inLiveMode && !inPartyMode && !isNavigatingToCall.current) {
      const callDoc = snap.docs[0];
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

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('expertId', '==', user.uid), where('status', '==', 'calling'));

    const unsubIncomingCall = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const callData = change.doc.data();
                const callId = change.doc.id;
                
                setIncomingCallData(callData);
                setIncomingCallId(callId);
                setIncomingTimer(12); 

                if (callData.callerId) {
                    getDoc(doc(db, 'users', callData.callerId)).then((uDoc) => {
                        if (uDoc.exists()) {
                            const uData = uDoc.data();
                            const actualPic = uData.profilePic || uData.photoURL || callData.callerImage;
                            const actualName = uData.name || uData.displayName || callData.callerName;
                            setIncomingCallData((prev: any) => 
                                prev && prev.callerId === callData.callerId 
                                ? { ...prev, callerImage: actualPic, callerName: actualName } 
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

    return () => unsubIncomingCall();
  }, [user?.uid, userRole, initializing]);

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

  // 🔥 SATTI FIX: THE ULTIMATE STRICT IDENTITY GATEKEEPER 🔥
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

        if (!user) {
          if (inAuthGroup || (firstSegment !== '' && firstSegment !== 'index' && firstSegment !== 'expert-register')) {
            router.replace('/' as any); 
          }
          return;
        }

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

        // 🔥 SCENARIO 1: EXPERT IDENTITY (Draft, Pending, or Active) 🔥
        if (isAnyExpertState) {
            // STRICT LOCK: Consultant can NEVER login as Client!
            if (currentIntendedRole === 'user' && !isRealAdmin) {
                // 🔥 SATTI FIX: INSTANT EJECT! Throw the loading curtain down, sign out securely, then alert.
                setIsEjecting(true);
                await AsyncStorage.removeItem('@intended_role');
                await auth.signOut();
                Alert.alert("Access Denied", "This account is for Consultants only. You cannot login as a Client.");
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

        // 🔥 SCENARIO 2: CONFIRMED CLIENT IDENTITY 🔥
        if (!isAnyExpertState && isClientMode === true) {
            // STRICT LOCK: Client can NEVER login as Consultant!
            if (currentIntendedRole === 'expert' && !isRealAdmin) {
                // 🔥 SATTI FIX: INSTANT EJECT! Same curtain drop logic for safety.
                setIsEjecting(true);
                await AsyncStorage.removeItem('@intended_role');
                await auth.signOut();
                Alert.alert("Access Denied", "This account is for Clients only. You cannot switch to Consultant.");
                return;
            }

            if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
                router.replace('/(tabs)' as any);
            }
            return;
        }

        // 🔥 SCENARIO 3: BRAND NEW USER (Choosing Identity for the FIRST TIME) 🔥
        if (!isAnyExpertState && isClientMode === false) {
            if (currentIntendedRole === 'expert') {
                if (firstSegment !== 'expert-register') router.replace('/expert-register' as any);
            } else if (currentIntendedRole === 'user') {
                // 🔥 LOCK THEM AS CLIENT FOREVER IN DATABASE 🔥
                updateDoc(doc(db, "users", user.uid), { isClient: true }).catch(() => {});
                
                if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
                    router.replace('/(tabs)' as any);
                }
            }
        }
    };

    gateKeeper();
  }, [user, userRole, userStatus, registrationInProgress, isClientMode, initializing, segments.join('/'), isMaintenance, needsUpdate, rootNavigationState?.key]);

  // 🔥 GLOBAL LOCK: Safeguarding maintenance triggers from fake admins
  const isGlobalAdmin = userRole === 'admin' && user?.email === 'kmr150892@gmail.com';
  if (isMaintenance && !isGlobalAdmin) return <MaintenanceScreen />;
  if (needsUpdate && !isGlobalAdmin) return <UpdateAlert />;
  
  // 🔥 SATTI FIX: Keep the loading spinner up if we are ejecting the user (prevents 3 second flash!)
  if (initializing || isEjecting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <>
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
        <Modal visible={true} transparent animationType="slide">
            <View style={styles.incomingCallOverlay}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.incomingCallCard}>
                    <Text style={styles.incomingCallTitle}>📞 INCOMING CALL</Text>
                    
                    <Image 
                        source={{ uri: incomingCallData.callerImage || 'https://ui-avatars.com/api/?name=User&background=0F172A&color=fff' }} 
                        style={styles.incomingAvatar} 
                    />
                    
                    <Text style={styles.incomingCallerName} numberOfLines={1} adjustsFontSizeToFit>
                        {incomingCallData.callerName || 'A User'}
                    </Text>
                    
                    <Text style={styles.incomingSubText}>
                        {incomingCallData.isFreeTrial ? '🎁 Free Trial Call' : '💎 Premium Masterclass'}
                    </Text>

                    <Text style={styles.incomingTimerText}>
                        00:{incomingTimer.toString().padStart(2, '0')}
                    </Text>
                    
                    <View style={styles.incomingActionRow}>
                        <TouchableOpacity style={[styles.incomingBtn, { backgroundColor: '#EF4444' }]} onPress={rejectIncomingCall}>
                            <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFF" />
                            <Text style={styles.incomingBtnText}>Decline</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.incomingBtn, { backgroundColor: '#10B981' }]} onPress={acceptIncomingCall}>
                            <MaterialCommunityIcons name="phone" size={28} color="#FFF" />
                            <Text style={styles.incomingBtnText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
    incomingCallOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 },
    incomingCallCard: { width: '85%', backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 25, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: '#38BDF8', elevation: 20, shadowColor: '#38BDF8', shadowOpacity: 0.5, shadowRadius: 20 },
    incomingCallTitle: { color: '#38BDF8', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
    incomingAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#10B981', marginBottom: 15 },
    incomingCallerName: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
    incomingSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 15 },
    incomingTimerText: { color: '#EF4444', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: 25 },
    incomingActionRow: { flexDirection: 'row', gap: 20, width: '100%', justifyContent: 'space-around' },
    incomingBtn: { flex: 1, paddingVertical: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 5 },
    incomingBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});