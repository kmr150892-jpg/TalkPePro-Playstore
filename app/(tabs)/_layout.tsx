import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // 🔥 For dynamic AAA button
import { Tabs, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  // ✅ FIXED: Level 1 Secondary Color changed to RED (#6b0402)
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

export default function TabLayout() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  
  // 🔥 Animation Value for Center Button (Pulse Only)
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Dynamic Theme Engine processing
  const totalBeans = userData?.totalBeansEarned || userData?.totalBeans || 0;
  const config = calculateUserLevel(totalBeans);
  
  // Syncing your custom tier engine to the button theme
  const theme = {
      primary: config.color,
      secondary: config.secondaryColor,
      accent: config.color,
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🚀 LOGOUT SYNC PROTECTOR: Global tab session cleanup logic
    const authUnsub = auth.onAuthStateChanged((u) => {
      if (!u) {
        requestAnimationFrame(() => {
          router.replace('/' as any);
        });
      }
    });

    // 🔥 REAL-TIME BLOCK MONITOR WITH SILENT ERROR SHIELD
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (data?.isBlocked === true) {
          Alert.alert(
            "🚨 ACCOUNT SUSPENDED",
            "Your account has been restricted by the platform administrators due to policy violations.",
            [{ 
              text: "ACKNOWLEDGE", 
              onPress: async () => {
                try {
                  await auth.signOut();
                  requestAnimationFrame(() => {
                    router.replace('/' as any); 
                  });
                } catch (e) { console.log("Logout failed during block"); }
              } 
            }],
            { cancelable: false }
          );
        }
      }
    }, (error) => {
      if (error.code === 'permission-denied') console.log("Tab layout sync detached safely.");
    });

    // 🔥 Start Pulse Animation for the Discover Button
    Animated.loop(
      Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    ).start();

    return () => {
      unsub();
      authUnsub();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginBottom: 8 },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.primary, // Make active text Discover dynamic theme
        tabBarInactiveTintColor: '#64748B',
        tabBarHideOnKeyboard: true, 
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="friends"
        options={{
          title: 'Network',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 🔥 THE MASS CENTER DISCOVER TAB (Not Floating, Just Pulsing) */}
      <Tabs.Screen
        name="explore" 
        options={{
          title: 'DISCOVER', 
          tabBarIcon: ({ focused }) => (
            <Animated.View style={[styles.centerIconContainer, { transform: [{ scale: pulseAnim }] }]}>
              {/* Dynamic Gradient Background Discovered with Ultimate Tier Engine */}
              <LinearGradient
                  colors={[theme.primary, theme.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.pulseButton, focused && { shadowColor: theme.accent, elevation: 10 }]}
              >
                  <MaterialCommunityIcons 
                      name="radar" 
                      size={26} 
                      color="#FFF" 
                  />
              </LinearGradient>

              {/* Dynamic Glow Effect */}
              {focused && (
                <View style={[styles.centerGlowEffect, { backgroundColor: theme.accent, shadowColor: theme.accent }]} />
              )}
            </Animated.View>
          ),
        }}
      />

      <Tabs.Screen
        name="MessageList"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="two" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 🔥 HIDDEN LIVE ROUTE */}
      <Tabs.Screen
        name="live/[liveId]"
        options={{
          href: null, 
          tabBarStyle: { display: 'none' }, 
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    // 👇👇 SATTI'S PADDING BOTTOM FIX - Adjusting for Modern Gesture Navigation Bar 👇👇
    bottom: Platform.OS === 'ios' ? 25 : 15, 
    left: 20, 
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    borderRadius: 25, 
    // 👇👇 Increased Height & Padding for better fit 👇👇
    height: Platform.OS === 'ios' ? 85 : 75, 
    borderTopWidth: 0,
    elevation: 10, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, 
    paddingTop: 10,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  // 🔥 NEW IN-TAB PULSE BUTTON STYLES (No longer floating)
  centerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseButton: {
    width: 44, // Fit perfectly inside the tab bar
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  centerGlowEffect: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.25,
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    zIndex: -1,
  }
});