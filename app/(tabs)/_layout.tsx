import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function TabLayout() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (data?.isBlocked === true) {
          Alert.alert(
            "🚨 ACCOUNT SUSPENDED",
            "TalkPe team-aal unga account block seiyappattathu.",
            [{ 
              text: "OK", 
              onPress: async () => {
                await auth.signOut();
                // ✅ FIXED: Using root path as login page
                router.replace('/'); 
              } 
            }],
            { cancelable: false }
          );
        }
      }
    });

    return () => unsub();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginBottom: 8 },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3B82F6', 
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

      {/* ✅ NEW TAB: FRIENDS */}
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* ✅ NEW TAB: MESSAGES */}
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20, left: 20, right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    borderRadius: 25, height: 65, borderTopWidth: 0,
    elevation: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});