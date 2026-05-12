import * as KeepAwake from 'expo-keep-awake';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth'; // ✅ Added User type
import { collection, doc, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutAnimation, LogBox, Platform, StatusBar, View } from 'react-native';
import MaintenanceScreen from '../components/.MaintenanceScreen';
import UpdateAlert from '../components/UpdateAlert';
import { auth, db } from '../firebaseConfig';

// 🔥 Firestore BloomFilter warning-a hide panna
LogBox.ignoreLogs([
  'BloomFilter error',
  '@firebase/firestore:',
]);

// 🚀 APP-ODA CURRENT VERSION
const CURRENT_APP_VERSION = "1.0.5";

// Android LayoutAnimation fix
if (Platform.OS === 'android' && (LayoutAnimation as any).configureNext) {
  (LayoutAnimation as any).configureNext = () => {}; 
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null); // ✅ Fixed type
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Expert');
  const [isExpertLive, setIsExpertLive] = useState<boolean>(false); // 🔥 NEW: Track Live Status
  
  const router = useRouter();
  const segments = useSegments() as string[];
  const rootNavigationState = useRootNavigationState();

  const isNavigatingToCall = useRef(false);
  
  // 🔥 SATTI FIX: Prevent infinite alert loops 🔥
  const hasShownLogoutAlert = useRef(false);

  // 🛠️ 1. VERSION & MAINTENANCE SYNC
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
      // 🔥 SILENT ERROR HANDLER: Logout appuramPermission Denied thadukkum
      if (error.code === 'permission-denied') console.log("System settings sync detached.");
    });
    return () => unsubSettings();
  }, []);

  // 🚀 2. KEEP AWAKE (Global)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
    }
    return () => { KeepAwake.deactivateKeepAwake(); };
  }, []);

  // 🔐 3. AUTH & ROLE LISTENER (THE MASTER FIX)
  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      // 🚨 TERMINAL CLEANUP: Logout aanal profile listener-ai udane manual-ah disconnect pannu
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      setUser(u);

      if (u) {
        unsubUser = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // 🔥 SATTI FIX: POLITE KICK-OUT PROTOCOL 🔥
            if (data.forceLogout === true || data.status === 'Blocked' || data.isBlocked === true) {
                console.log("Security Protocol: Unauthorized access detected. Prompting user.");
                
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
                                        hasShownLogoutAlert.current = false; // Reset after kicking out
                                    }).catch(console.error);
                                }
                            }
                        ],
                        { cancelable: false } // Force them to click OK
                    );
                }
                return; // Stop processing profile info
            }

            setUserRole(data.role || 'user');
            setUserStatus(data.status || '');
            setUserName(data.name || 'Expert');
            setIsExpertLive(data.isLive || false); // 🔥 Check if expert is currently LIVE
          }
          setInitializing(false);
        }, (error) => {
          if (error.code === 'permission-denied') console.log("User profile sync detached.");
        });
      } else {
        // 🔥 LOGOUT LOGIC: Everything reset
        setUserRole(null);
        setUserStatus(null);
        setIsExpertLive(false); // 🔥 Reset live status
        setInitializing(false);
        
        // 🚀 NAVIGATION SYNC: Kill background navigation ghost loops
        // User logout aanal udane router-ai root-ku thallanum, illa-na tabs load aaga muyarchi pannum
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

  // 🔥 4. GLOBAL CALL MONITOR (Play Store Memory Leak Fix Added Here)
  useEffect(() => {
  // 🚨 SESSION GUARD: Auth illana intha monitoring odathathu
  if (!user?.uid || userRole !== 'expert' || initializing || !rootNavigationState?.key) return;

  const callsQuery = query(
    collection(db, "calls"),
    where("expertId", "==", user.uid),
    where("status", "==", "ringing"),
    limit(1)
  );

  let navTimeout: ReturnType<typeof setTimeout>;// 🔥 MEMORY LEAK FIX FOR PLAY STORE TESTING BOTS

  const unsubCalls = onSnapshot(callsQuery, { includeMetadataChanges: true }, (snap) => {
    if (snap.metadata.fromCache || !auth.currentUser) return;

    const currentPath = segments.join('/');
    const inVideoCall = currentPath.includes('videocall');
    const inLiveMode = currentPath.includes('live') || isExpertLive; 
    
    // 🔥 SATTI FIX: Added inPartyMode check to prevent kickouts during party! 🔥
    const inPartyMode = currentPath.includes('party');

    // 🔥 PAUSE GLOBAL ROUTING IF EXPERT IS LIVE OR IN PARTY (Let those screens handle it via local popup)
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
    if (navTimeout) clearTimeout(navTimeout); // 🔥 CLEARS TIMEOUT TO PREVENT CRASHES ON BACKGROUNDING
  };
}, [user?.uid, userRole, userName, isExpertLive, segments.join('/'), initializing, rootNavigationState?.key]);

  // 🔥 4.5 SATTI FIX: GLOBAL BUSY STATE RECOVERY 🔥
  // Veliya vanthachu na (Dashboard), kandippa isBusy false aagidanum!
  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const currentPath = segments.join('/');
    const inVideoCall = currentPath.includes('videocall');
    const inLiveMode = currentPath.includes('live') || isExpertLive;

    if (!inVideoCall && !inLiveMode) {
      updateDoc(doc(db, "users", user.uid), { isBusy: false }).catch(() => {});
    }
  }, [user?.uid, userRole, isExpertLive, segments.join('/'), initializing]);

  // 🗺️ 5. AUTO-NAVIGATION & REDIRECTS (STRICT GATEKEEPER)
  useEffect(() => {
    if (initializing || !rootNavigationState?.key) return;
    
    if ((isMaintenance || needsUpdate) && userRole !== 'admin') return; 

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

    // 🚨 SCENARIO: LOGOUT
    if (!user) {
      // User auth illama tabs stack load panna paarthaal prevent pannu
      if (inAuthGroup || firstSegment !== '' && firstSegment !== 'index' && firstSegment !== 'expert-register') {
        router.replace('/' as any); 
      }
      return;
    }

    // SCENARIO: ADMIN
    if (userRole === 'admin') {
      if (firstSegment !== '(admin)') router.replace('/(admin)' as any);
      return;
    }

    // SCENARIO: PENDING USER
    if (userRole === 'user' && userStatus === 'Pending') {
      if (firstSegment !== 'waiting-approval') {
        router.replace('/waiting-approval' as any);
      }
      return;
    }

    // SCENARIO: EXPERT
    if (userRole === 'expert') {
      if (!inExpertPath && !inVideoCall && !inChatPath && !inHistoryPath && !inBlockedUsersPath && !inUserDetailPath && firstSegment !== 'expert-register') {
        router.replace('/expert/dashboard' as any);
      }
      return;
    }

    // SCENARIO: ACTIVE USER
    if (userRole === 'user' && userStatus !== 'Pending') {
      if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
        router.replace('/(tabs)' as any);
      }
    }

  }, [user, userRole, userStatus, initializing, segments.join('/'), isMaintenance, needsUpdate, rootNavigationState?.key]);

  // 🎨 UI RENDERING
  if (isMaintenance && userRole !== 'admin') return <MaintenanceScreen />;
  if (needsUpdate && userRole !== 'admin') return <UpdateAlert />;
  
  if (initializing) {
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
        
        {/* 🔥 MASS UPDATE: user-detail Screen Registered */}
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
    </>
  );
}