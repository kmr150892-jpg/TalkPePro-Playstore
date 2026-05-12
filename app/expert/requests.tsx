import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

export default function ExpertUserList() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const expert = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!expert) return;

    const q = query(
      collection(db, "connections"),
      where("receiverId", "==", expert.uid),
      where("status", "==", "friend") 
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const usersData = await Promise.all(
        snapshot.docs.map(async (connDoc) => {
          const data = connDoc.data();
          if (data.status !== "friend") return null;

          const userId = data.senderId; 
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);

          let userInfo = {
            name: data.senderName || "TALKPE PRO Client",
            image: data.senderImage || null
          };

          if (userSnap.exists()) {
            const uData = userSnap.data();
            userInfo.name = uData.displayName || uData.name || userInfo.name;
            userInfo.image = uData.profilePic || uData.photoURL || userInfo.image;
          }

          return {
            id: connDoc.id,
            ...data,
            userName: userInfo.name,
            userImage: userInfo.image,
            userId: userId 
          };
        })
      );

      const filteredData = usersData.filter(item => item !== null);
      setConnections(filteredData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [expert]);

  const handleChatPress = (userId: string, userName: string) => {
    if (!expert) return;
    const chatId = expert.uid < userId ? `${expert.uid}_${userId}` : `${userId}_${expert.uid}`;
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: userId, receiverName: userName }
    });
  };

  const handleRemoveUser = (connectionId: string, name: string) => {
    Alert.alert(
      "DISCONNECT NODE",
      `Are you sure you want to terminate connection with ${name}?`,
      [
        { text: "ABORT", style: "cancel" },
        { 
          text: "TERMINATE", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "connections", connectionId));
            } catch (error) {
              Alert.alert("System Error", "Uplink termination failed.");
            }
          } 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.darkLoader}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loaderText}>SYNCING NETWORK NODES...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.headerArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerLabel}>TERMINAL ACCESS</Text>
            <Text style={styles.headerTitle}>CLIENTS LIST</Text>
          </View>
        </View>
      </SafeAreaView>

      {connections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="broadcast-off" size={60} color="#1E293B" />
          </View>
          <Text style={styles.emptyText}>NO NODES FOUND</Text>
          <Text style={styles.subEmptyText}>Accept incoming requests to build your secure network.</Text>
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <BlurView intensity={15} tint="dark" style={styles.glassCard}>
              <View style={styles.cardMain}>
                <LinearGradient 
                  colors={['#6366F1', '#A855F7']} 
                  style={styles.avatarGlow}
                >
                  <Image 
                    source={{ uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}&background=0F172A&color=fff` }} 
                    style={styles.userImg} 
                  />
                </LinearGradient>

                <View style={styles.infoArea}>
                  <Text style={styles.userNameText} numberOfLines={1}>{item.userName}</Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.statusLabel}>SECURE LINK ACTIVE</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.chatBtn]}
                  onPress={() => handleChatPress(item.userId, item.userName)}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                  <Text style={styles.btnLabel}>CHAT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionBtn, styles.removeBtn]}
                  onPress={() => handleRemoveUser(item.id, item.userName)}
                >
                  <Ionicons name="person-remove-outline" size={20} color="#FB7185" />
                  <Text style={[styles.btnLabel, { color: '#FB7185' }]}>TERM</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#6366F1', marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  
  headerArea: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerLabel: { color: '#6366F1', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
  subEmptyText: { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 12, fontWeight: '600', lineHeight: 20 },

  glassCard: { 
    borderRadius: 30, 
    marginBottom: 20, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)', 
    backgroundColor: 'rgba(255,255,255,0.02)' 
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  avatarGlow: { padding: 2.5, borderRadius: 22, elevation: 10, shadowColor: '#6366F1', shadowRadius: 10 },
  userImg: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#020617' },
  
  infoArea: { marginLeft: 15, flex: 1 },
  userNameText: { color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusLabel: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', height: 60 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chatBtn: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  removeBtn: { backgroundColor: 'rgba(251, 113, 133, 0.05)', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' },
  btnLabel: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
});