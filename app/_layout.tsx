import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as KeepAwake from 'expo-keep-awake';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth'; // ✅ Added User type
// 🔥 SATTI FIX: Added getDoc to fetch accurate user profile pic
import { collection, doc, getDoc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, LogBox, Modal, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  // 🔥 SATTI FIX: GLOBAL INCOMING CALL STATE FOR EXPERT 🔥
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const [incomingTimer, setIncomingTimer] = useState(12); // 🔥 SATTI FIX: 12s Timer State

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
    return () => { 
      if (Platform.OS !== 'web') {
        try {
          // 🔥 SATTI FIX: Catch the promise rejection silently when activity is destroyed
          const deactivatePromise = KeepAwake.deactivateKeepAwake();
          if (deactivatePromise && typeof deactivatePromise.catch === 'function') {
            deactivatePromise.catch(() => {});
          }
        } catch (e) {
          // Ignore sync errors
        }
      }
    };
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
    
    // 🔥 SATTI FIX: Added inPartyMode check to prevent kickouts during Session! 🔥
    const inPartyMode = currentPath.includes('Session');

    // 🔥 PAUSE GLOBAL ROUTING IF EXPERT IS LIVE OR IN Session (Let those screens handle it via local popup)
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

  // 🔥 4.8 SATTI FIX: NEW GLOBAL INCOMING CALL LISTENER FOR EXPERT (FROM ANY SCREEN) 🔥
  useEffect(() => {
    if (!user?.uid || userRole !== 'expert' || initializing) return;

    const callsRef = collection(db, 'calls');
    // Listen for 'calling' status exactly matching the screenshot details
    const q = query(callsRef, where('expertId', '==', user.uid), where('status', '==', 'calling'));

    const unsubIncomingCall = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const callData = change.doc.data();
                const callId = change.doc.id;
                
                // Show global notification modal immediately
                setIncomingCallData(callData);
                setIncomingCallId(callId);
                setIncomingTimer(12); // 🔥 Reset timer on new call

                // 🔥 SATTI FIX: Fetch real profile pic dynamically from User collection (Fixes Profile Pic Issue)
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
                // If caller cancels or misses the call, close the modal instantly to avoid ghost rings
                if (callData.status === 'cancelled' || callData.status === 'missed') {
                    setIncomingCallData(null);
                    setIncomingCallId(null);
                }
            }
            // 🔥 SATTI FIX: When user cancels, it leaves the 'calling' query causing a 'removed' event. (Fixes 1 time show issue)
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

  // 🔥 SATTI FIX: 12 SECONDS TIMER ENGINE FOR GLOBAL INCOMING CALL 🔥
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (incomingCallId && incomingCallData) {
        interval = setInterval(() => {
            setIncomingTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Auto miss the call when timer ends
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

  // 🔥 ACCEPT / REJECT HANDLERS 🔥
  const acceptIncomingCall = async () => {
      if (!incomingCallId) return;
      try {
          await updateDoc(doc(db, 'calls', incomingCallId), { 
              status: 'accepted', 
              acceptedAt: serverTimestamp(),
              connectedAt: serverTimestamp() // Added to match your screenshot standard
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
              status: 'rejected', // 🔥 SATTI FIX: Changed to 'rejected' for instant user side sync
              endedAt: serverTimestamp() 
          });
      } catch(e) {
          console.error("Reject call error:", e);
      }
      setIncomingCallData(null);
      setIncomingCallId(null);
  };

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

      {/* 🔥 SATTI FIX: GLOBAL INCOMING CALL UI 🔥 */}
      {incomingCallData && incomingCallId && (
        <Modal visible={true} transparent animationType="slide">
            <View style={styles.incomingCallOverlay}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.incomingCallCard}>
                    <Text style={styles.incomingCallTitle}>📞 INCOMING CALL</Text>
                    
                    {/* 🔥 SATTI FIX: Map User's Caller Image 🔥 */}
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

                    {/* 🔥 SATTI FIX: 12s Countdown Timer Display 🔥 */}
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

// 🔥 SATTI FIX: ADDED STYLES FOR THE INCOMING CALL MODAL 🔥
const styles = StyleSheet.create({
    incomingCallOverlay: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 9999 
    },
    incomingCallCard: { 
        width: '85%', 
        backgroundColor: 'rgba(15,23,42,0.95)', 
        borderRadius: 25, 
        padding: 25, 
        alignItems: 'center', 
        borderWidth: 2, 
        borderColor: '#38BDF8', 
        elevation: 20, 
        shadowColor: '#38BDF8', 
        shadowOpacity: 0.5, 
        shadowRadius: 20 
    },
    incomingCallTitle: { 
        color: '#38BDF8', 
        fontSize: 18, 
        fontWeight: '900', 
        letterSpacing: 2, 
        marginBottom: 20 
    },
    incomingAvatar: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        borderWidth: 3, 
        borderColor: '#10B981', 
        marginBottom: 15 
    },
    incomingCallerName: { 
        color: '#FFF', 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 5, 
        textAlign: 'center' 
    },
    incomingSubText: { 
        color: '#94A3B8', 
        fontSize: 14, 
        fontWeight: '600', 
        marginBottom: 15 
    },
    incomingTimerText: {
        color: '#EF4444',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 25
    },
    incomingActionRow: { 
        flexDirection: 'row', 
        gap: 20, 
        width: '100%', 
        justifyContent: 'space-around' 
    },
    incomingBtn: { 
        flex: 1, 
        paddingVertical: 15, 
        borderRadius: 15, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 10,
        elevation: 5
    },
    incomingBtnText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: 'bold' 
    }
});