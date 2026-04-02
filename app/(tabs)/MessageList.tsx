import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function MessageList() {
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // ✅ Logic: "chats" collection-la user UID irukura threads-ah fetch panrom
    // Inga 'participants' array-la user ID irukanum
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const threads = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          
          // Namaku ethirtharapula irukura Expert ID-ah edukkurum
          const expertId = data.participants.find((id: string) => id !== user.uid);

          // Expert details-ah fetch panrom (Name & Image-kaga)
          const expertRef = doc(db, "users", expertId);
          const expertSnap = await getDoc(expertRef);
          const expertData = expertSnap.exists() ? expertSnap.data() : {};

          return {
            id: chatDoc.id,
            ...data,
            expertName: expertData.displayName || expertData.name || "Expert",
            expertImage: expertData.profilePic || expertData.photoURL || null,
            receiverId: expertId
          };
        })
      );
      setChatThreads(threads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleChatPress = (chatId: string, expertId: string, name: string) => {
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: expertId, receiverName: name }
    });
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {chatThreads.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={60} color="#1E293B" />
          <Text style={styles.emptyText}>No messages yet. Start a conversation with an expert!</Text>
        </View>
      ) : (
        <FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatCard}
              onPress={() => handleChatPress(item.id, item.receiverId, item.expertName)}
            >
              <Image 
                source={{ uri: item.expertImage || `https://ui-avatars.com/api/?name=${item.expertName}` }} 
                style={styles.avatar} 
              />
              <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                  <Text style={styles.nameText}>{item.expertName}</Text>
                  <Text style={styles.timeText}>
                    {item.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.lastMsgText} numberOfLines={1}>
                  {item.lastMessageText || "Sent a message"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#475569" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#0F172A' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  chatCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1E293B', 
    padding: 15, 
    borderRadius: 20, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  avatar: { width: 55, height: 55, borderRadius: 20 },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  nameText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  timeText: { color: '#64748B', fontSize: 11 },
  lastMsgText: { color: '#94A3B8', fontSize: 13 },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 14, marginTop: 15 },
});