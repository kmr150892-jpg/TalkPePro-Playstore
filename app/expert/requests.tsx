import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ExpertUserList() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const expert = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!expert) return;

    // ✅ LOGIC: Status 'friend' ah iruntha mattum thaan fetch pannanum
    // Expert console-la receiverId eppovum expert uid-ah thaan irukkanum
    const q = query(
      collection(db, "connections"),
      where("receiverId", "==", expert.uid),
      where("status", "==", "friend") 
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const usersData = await Promise.all(
        snapshot.docs.map(async (connDoc) => {
          const data = connDoc.data();
          
          // Safety check: Inga status check thirumba panrom overlap aagama eruka
          if (data.status !== "friend") return null;

          const userId = data.senderId; 

          // User details-ah 'users' collection-la irundhu fresh-ah edukrom
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);

          let userInfo = {
            name: data.senderName || "TalkPe User",
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
            userId: userId // For Chat Logic
          };
        })
      );

      // Null values-ah remove pannitu followers list-ah update panrom
      const filteredData = usersData.filter(item => item !== null);
      setConnections(filteredData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [expert]);

  // ✅ CHAT NAVIGATION LOGIC (New Feature added as per User List style)
  const handleChatPress = (userId: string, userName: string) => {
    if (!expert) return;
    const chatId = expert.uid < userId ? `${expert.uid}_${userId}` : `${userId}_${expert.uid}`;
    
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: userId, receiverName: userName }
    });
  };

  // ✅ REMOVE FOLLOWER LOGIC
  const handleRemoveUser = (connectionId: string, name: string) => {
    Alert.alert(
      "Remove Follower",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Document delete aana automatic-ah list refresh aydum (onSnapshot)
              await deleteDoc(doc(db, "connections", connectionId));
            } catch (error) {
              Alert.alert("Error", "User-ah remove panna mudiyala.");
            }
          } 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Followers</Text>
      </View>

      {/* LIST SECTION */}
      {connections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={50} color="#1E293B" />
          <Text style={styles.emptyText}>No followers yet.</Text>
          <Text style={styles.subEmptyText}>When you accept requests, they will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.cardLeft}>
                <Image 
                  source={{ 
                    uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}&background=818CF8&color=fff` 
                  }} 
                  style={styles.userImg} 
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.userName}</Text>
                  <View style={styles.connectedBadge}>
                     <View style={styles.dot} />
                     <Text style={styles.statusLabel}>Connected</Text>
                  </View>
                </View>
              </View>

              {/* ✅ CHAT BUTTON (Matching User Style) */}
              <TouchableOpacity 
                style={styles.chatBtn}
                onPress={() => handleChatPress(item.userId, item.userName)}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#6366F1" />
                <Text style={styles.chatText}>Chat</Text>
              </TouchableOpacity>

              {/* ✅ REMOVE BUTTON */}
              <TouchableOpacity 
                style={styles.removeBtn}
                onPress={() => handleRemoveUser(item.id, item.userName)}
              >
                <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
                <Text style={styles.removeText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, gap: 15 },
  backBtn: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#0F172A', 
    padding: 12, 
    borderRadius: 22, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userImg: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#1E293B' },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusLabel: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  chatBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)'
  },
  chatText: { color: '#6366F1', fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  removeBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)'
  },
  removeText: { color: '#EF4444', fontSize: 10, fontWeight: '900', marginTop: 4, textTransform: 'uppercase' },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 15 },
  subEmptyText: { color: '#475569', textAlign: 'center', fontSize: 12, marginTop: 8, lineHeight: 18 },
});