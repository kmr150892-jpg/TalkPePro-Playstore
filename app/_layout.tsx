import * as KeepAwake from 'expo-keep-awake';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, StatusBar, View } from 'react-native';
import MaintenanceScreen from '../components/.MaintenanceScreen';
import UpdateAlert from '../components/UpdateAlert';
import { auth, db } from '../firebaseConfig';

// 🚀 APP-ODA CURRENT VERSION
const CURRENT_APP_VERSION = "1.0.5";

// Android LayoutAnimation fix
if (Platform.OS === 'android' && (LayoutAnimation as any).configureNext) {
  (LayoutAnimation as any).configureNext = () => {}; 
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Expert');
  
  const router = useRouter();
  const segments = useSegments() as string[];
  
  // 🔥 Loop-ah thadukka intha Ref mukhkiyam
  const isNavigatingToCall = useRef(false);

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

  // 🔐 3. AUTH & ROLE LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const unsubUser = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role || 'user');
            setUserStatus(data.status || '');
            setUserName(data.name || 'Expert');
          }
          setInitializing(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setUserRole(null);
        setUserStatus(null);
        setInitializing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔥 4. GLOBAL CALL MONITOR (FIXED: DOUBLE NAVIGATION BLOCK)
  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const callsQuery = query(
      collection(db, "calls"),
      where("expertId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubCalls = onSnapshot(callsQuery, (snap) => {
      const inVideoCall = segments.includes('videocall');
      
      if (!snap.empty && !inVideoCall && !isNavigatingToCall.current) {
        const callDoc = snap.docs[0];
        
        isNavigatingToCall.current = true;
        console.log("🚀 [GLOBAL] NAVIGATING TO CALL:", callDoc.id);

        router.push({
          pathname: '/videocall',
          params: { 
            expertId: user.uid, 
            expertName: userName,
            callId: callDoc.id,
            role: 'expert'
          }
        });

        setTimeout(() => {
          isNavigatingToCall.current = false;
        }, 3000);
      }
    });

    return () => unsubCalls();
  }, [user?.uid, userRole, userName, segments, initializing]);

  // 🗺️ 5. AUTO-NAVIGATION & REDIRECTS (FIXED FOR TABS)
  useEffect(() => {
    if (initializing) return;
    
    if ((isMaintenance || needsUpdate) && userRole !== 'admin') return; 

    const firstSegment = segments[0] || '';
    const inAdminGroup = firstSegment === '(admin)';
    const inExpertPath = segments.includes('expert');
    const inVideoCall = segments.includes('videocall');
    const inTabs = segments.includes('(tabs)'); 
    const inChatPath = segments.includes('chat'); // ✅ NEW CHECK FOR CHAT PATH

    // 🛑 CRITICAL: Stop all redirects if the user is in a call
    if (inVideoCall) return;

    // Guest User Handling
    if (!user) {
      if (firstSegment !== '' && firstSegment !== 'index' && firstSegment !== 'expert-register') {
        router.replace('/'); 
      }
      return;
    }

    // Admin Redirect
    if (userRole === 'admin') {
      if (!inAdminGroup) router.replace('/(admin)');
      return;
    }

    // Pending User Approval
    if (userRole === 'user' && userStatus === 'Pending') {
      if (firstSegment !== 'waiting-approval') {
        router.replace('/waiting-approval');
      }
      return;
    }

    // Expert Dashboard Redirect
    if (userRole === 'expert') {
      // ✅ MODIFIED: Added !inChatPath so it doesn't redirect when in chat
      if (!inExpertPath && !inVideoCall && !inChatPath && firstSegment !== 'expert-register') {
        router.replace('/expert/dashboard');
      }
      return;
    }

    // ✅ MASS UPDATE: User Redirect Fix
    if (userRole === 'user' && userStatus !== 'Pending') {
      if (!inTabs && (firstSegment === '' || firstSegment === 'index')) {
        router.replace('/(tabs)');
      }
    }

  }, [user, userRole, userStatus, initializing, segments, isMaintenance, needsUpdate]);

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
        <Stack.Screen name="expert/dashboard" />
        <Stack.Screen name="expert/notifications" />
        <Stack.Screen name="expert-register" /> 
        <Stack.Screen name="waiting-approval" /> 
        {/* ✅ ADDED CHATSCREEN TO STACK SO ROUTER RECOGNIZES THE PATH */}
        <Stack.Screen name="chat/ChatScreen" /> 
        <Stack.Screen name="videocall" options={{ gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}