import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function UserHome() {
  const router = useRouter();
  const user = auth.currentUser;

  const [experts, setExperts] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ 1. REAL-TIME DATA SYNC
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'expert'));
    
    const unsubscribeExperts = onSnapshot(q, (snapshot) => {
      const expertList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setExperts(expertList);
      setLoading(false);
    });

    let unsubscribeUser: () => void;
    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) setUserData(docSnap.data());
      });
    }

    return () => {
      unsubscribeExperts();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [user]);

  // 🔥 UPDATE: Passing caller details to Profile/Detail screen for seamless call integration
  const navigateToExpertProfile = (expert: any) => {
    if (!user) {
      Alert.alert("TalkPe Pro", "Please login to view profile.");
      return;
    }
    
    router.push({
      pathname: '/expert-detail',
      params: { 
        id: expert.id,
        callerName: userData?.name || user?.displayName || "TalkPe User",
        callerImage: userData?.profilePic || userData?.profileImage || user?.photoURL || ""
      }
    } as any);
  };

  const spotlightExperts = experts.filter(e => (e.rating || 5.0) >= 4.0);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.topSection} edges={['top']}>
        {/* --- HEADER --- */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>Hey {userData?.name?.split(' ')[0] || 'User'}! ✨</Text>
            <Text style={styles.subGreeting}>Expert consultation at your fingertips</Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/two' as any)}>
            <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.profileGlow}>
              <Image 
                source={{ uri: userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=3B82F6&color=fff` }} 
                style={styles.avatarImg} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* --- WALLET CARD --- */}
        <View style={styles.walletContainer}>
          <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.walletGlass}>
            <View style={styles.walletMain}>
                <View style={styles.diamondCircle}>
                   <Ionicons name="diamond" size={18} color="#3B82F6" />
                </View>
                <View style={{marginLeft: 12}}>
                   <Text style={styles.balanceTitle}>Available Balance</Text>
                   <Text style={styles.balanceValue}>{(userData?.balance || 0).toLocaleString()} <Text style={styles.unitText}>Diamonds</Text></Text>
                </View>
            </View>
            <TouchableOpacity style={styles.glassRecharge} onPress={() => router.push('/recharge' as any)}>
                <Text style={styles.rechargeTxt}>+ Add</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* --- SEARCH --- */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput 
              placeholder="Search experts..." 
              placeholderTextColor="#64748B" 
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- 🔥 CIRCULAR SPOTLIGHT --- */}
        <View style={styles.sectionArea}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Experts ⚡</Text>
            <TouchableOpacity><Text style={styles.seeAll}>View all</Text></TouchableOpacity>
          </View>
          
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={spotlightExperts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingLeft: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.spotlightCircleCard, !item.isOnline && { opacity: 0.7 }]}
                onPress={() => navigateToExpertProfile(item)}
              >
                <View style={[styles.circleImageContainer, {borderColor: item.isOnline ? '#10B981' : '#334155'}]}>
                   <Image source={{ uri: item.profilePic || item.photoURL || 'https://i.pravatar.cc/150?u=expert' }} style={styles.circleImage} />
                   {item.isOnline && <View style={styles.onlinePing} />}
                </View>
                <Text style={styles.circleName} numberOfLines={1}>{item.name || 'Expert'}</Text>
                <Text style={styles.circleTag}>{item.isOnline ? (item.hobbies || 'Consultant') : 'OFFLINE'}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* --- RECOMMENDED LIST --- */}
        <View style={styles.listArea}>
          <Text style={styles.sectionTitle}>Top Recommended</Text>
          {loading ? (
            <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
          ) : (
            experts
              .filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
              .map((expert) => {
                // 🔥 LOGIC: Diamond rate = pricePerMin (which is Rupee * 100)
                const diamondRate = Number(expert.userPrice || (expert.pricePerMin * 2) || 1000);

                return (
                  <TouchableOpacity 
                    key={expert.id} 
                    style={[styles.premiumRow, !expert.isOnline && { opacity: 0.6 }]}
                    onPress={() => navigateToExpertProfile(expert)}
                  >
                    <Image source={{ uri: expert.profilePic || expert.photoURL || `https://i.pravatar.cc/150?u=${expert.id}` }} style={styles.rowImg} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName}>{expert.name}</Text>
                      <Text style={styles.rowSub}>{expert.isOnline ? (expert.hobbies || 'Expert') : 'Currently Offline'} • ⭐ {expert.rating || '5.0'}</Text>
                      
                      <View style={styles.priceBadge}>
                         <Text style={styles.priceTxt}>💎 {diamondRate.toLocaleString()}/min</Text>
                      </View>
                    </View>
                    <View style={[styles.callCircle, { backgroundColor: expert.isOnline ? '#3B82F6' : '#475569' }]}>
                      <Ionicons name={expert.isOnline ? "videocam" : "videocam-off"} size={18} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Designed for TalkPe Pro</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  topSection: { paddingBottom: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10 },
  greetingText: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subGreeting: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  profileGlow: { padding: 2, borderRadius: 16 },
  avatarImg: { width: 44, height: 44, borderRadius: 14, borderWidth: 2, borderColor: '#0F172A' },
  walletContainer: { paddingHorizontal: 20, marginTop: 20 },
  walletGlass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  walletMain: { flexDirection: 'row', alignItems: 'center' },
  diamondCircle: { width: 35, height: 35, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
  balanceTitle: { color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  balanceValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  unitText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  glassRecharge: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  rechargeTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  searchContainer: { paddingHorizontal: 20, marginTop: 20 },
  searchBar: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 18, padding: 14, alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 15 },
  scrollContent: { paddingBottom: 120 },
  sectionArea: { marginTop: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  seeAll: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  spotlightCircleCard: { alignItems: 'center', marginRight: 20, width: 85 },
  circleImageContainer: { width: 75, height: 75, borderRadius: 37.5, borderWidth: 2.5, padding: 3, marginBottom: 8, position: 'relative' },
  circleImage: { width: '100%', height: '100%', borderRadius: 35 },
  onlinePing: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0F172A' },
  circleName: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  circleTag: { color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 2 },
  listArea: { marginTop: 30, paddingHorizontal: 20 },
  premiumRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 12, borderRadius: 24, marginBottom: 15 },
  rowImg: { width: 65, height: 65, borderRadius: 20 },
  rowBody: { flex: 1, marginLeft: 15 },
  rowName: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  rowSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  priceBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  priceTxt: { color: '#3B82F6', fontSize: 11, fontWeight: '800' },
  callCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  footer: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#334155', fontSize: 11, fontWeight: '700', letterSpacing: 1 }
});