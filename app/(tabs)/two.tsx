import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // DATABASE CONNECTION
  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, [user]);

  // ✅ Fixed Navigation Helper
  const navigateTo = (route: string, title: string) => {
    try {
      router.push(route as any);
    } catch (e) {
      console.log("Nav Error:", e);
      Alert.alert("TalkPe Update", `${title} screen missing or route error!`);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out 🚶‍♂️", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive",
        onPress: async () => {
          try {
            await auth.signOut();
            router.replace('/');
          } catch (error) {
            Alert.alert("Error", "Logout panna mudiyala.");
          }
        }
      }
    ]);
  };

  // ✅ Menu items array - Added "My Friends" to the list
  const menuItems = [
    { id: '1', title: 'Edit Profile', icon: 'person-outline', color: '#3B82F6', route: '/edit-profile' },
    { id: 'friends', title: 'My Friends', icon: 'people-outline', color: '#A855F7', route: '/friends' }, // ✅ NEW FRIENDS TAB
    { id: '2', title: 'My Consultations', icon: 'videocam-outline', color: '#10B981', route: '/history' },
    { id: '3', title: 'Wallet Balance', icon: 'wallet-outline', color: '#F59E0B', route: '/recharge' },
    { id: '4', title: 'Help & Support', icon: 'headset-outline', color: '#EC4899', route: '/support' },
    { id: '5', title: 'Terms & Privacy', icon: 'shield-checkmark-outline', color: '#94A3B8', route: '/legal' },
  ];

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <SafeAreaView edges={['top']}>
          
          {/* MASS USER CARD SECTION */}
          <View style={styles.profileCard}>
            <LinearGradient 
              colors={['rgba(59, 130, 246, 0.25)', 'rgba(30, 41, 59, 0.8)']} 
              style={styles.cardInner}
            >
              <View style={styles.avatarContainer}>
                <View style={styles.avatarRing}>
                  <Image 
                    source={{ uri: userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=3B82F6&color=fff` }} 
                    style={styles.avatarImg} 
                  />
                </View>
                <TouchableOpacity 
                  style={styles.editBadge} 
                  onPress={() => navigateTo('/edit-profile', 'Edit Profile')}
                >
                  <Ionicons name="pencil" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{userData?.name || user?.displayName || 'TalkPe User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{userData?.chatsCount || '0'}</Text>
                  <Text style={styles.statLabel}>Chats</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.statItem, styles.statBorder]} 
                  onPress={() => navigateTo('/recharge', 'Wallet')}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Text style={[styles.statVal, { color: '#F59E0B' }]}>
                      {(userData?.balance || 0).toLocaleString()}
                    </Text>
                  )}
                  <Text style={styles.statLabel}>Diamonds</Text>
                </TouchableOpacity>

                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{userData?.rating || '5.0'}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </SafeAreaView>

        {/* INTERACTIVE MENU SECTION */}
        <View style={styles.menuBox}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuRow} 
              onPress={() => navigateTo(item.route, item.title)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutWrapper} onPress={handleLogout} activeOpacity={0.8}>
          <LinearGradient 
            colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']} 
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out" size={22} color="#EF4444" />
            <Text style={styles.logoutLabel}>Sign Out From TalkPe</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.4 (Beta)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  scrollPadding: { paddingBottom: 120 },
  profileCard: { margin: 20, borderRadius: 35, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardInner: { alignItems: 'center', paddingVertical: 35, paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatarRing: { padding: 4, borderRadius: 100, borderWidth: 2, borderColor: '#3B82F6', borderStyle: 'dashed' },
  avatarImg: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1E293B' },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#3B82F6', padding: 6, borderRadius: 10, borderWidth: 2, borderColor: '#0F172A' },
  userName: { fontSize: 26, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  userEmail: { fontSize: 14, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  statsRow: { flexDirection: 'row', marginTop: 30, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statVal: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#64748B', fontSize: 11, marginTop: 5, fontWeight: '700', textTransform: 'uppercase' },
  menuBox: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  menuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.4)', padding: 16, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, color: '#F1F5F9', fontSize: 16, fontWeight: '700', marginLeft: 15 },
  logoutWrapper: { marginHorizontal: 20, marginTop: 15, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18 },
  logoutLabel: { color: '#EF4444', fontWeight: '900', fontSize: 16, marginLeft: 10 },
  versionText: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 25, fontWeight: '600' }
});