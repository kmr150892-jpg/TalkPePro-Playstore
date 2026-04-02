import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ExpertMessages() {
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const expert = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!expert) return;

    // ✅ FEATURE: Fetching chats where expert is a participant, ordered by latest message
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", expert.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const threads = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          
          // User details-ah edukkurum (Intha chat-la irukura user yaaru?)
          // participants array-la expert UID illatha matthoru ID thaan User ID
          const userId = data.participants?.find((id: string) => id !== expert.uid);

          if (!userId) return null;

          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};

          return {
            id: chatDoc.id,
            ...data,
            userName: userData.displayName || userData.name || "User",
            userImage: userData.profilePic || userData.photoURL || null,
            receiverId: userId
          };
        })
      );
      
      // Filter out nulls if any
      setChatThreads(threads.filter(t => t !== null));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [expert]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Messages</Text>
      </View>

      {chatThreads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No messages from users yet.</Text>
        </View>
      ) : (
        <FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatCard}
              onPress={() => {
                // ✅ ULTIMATE FIX: Explicitly forcing the path with leading slash
                // Based on your screenshot: app -> chat -> ChatScreen.tsx
                router.push({
                  pathname: "/chat/ChatScreen" as any,
                  params: { 
                    chatId: item.id, 
                    receiverId: item.receiverId, 
                    receiverName: item.userName 
                  }
                });
              }}
            >
              <Image 
                source={{ uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}` }} 
                style={styles.avatar} 
              />
              <View style={styles.chatInfo}>
                <Text style={styles.nameText}>{item.userName}</Text>
                <Text style={styles.lastMsgText} numberOfLines={1}>
                  {item.lastMessageText || "New conversation started"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#334155" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, gap: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  chatCard: { 
    flexDirection: 'row', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1E293B', 
    alignItems: 'center' 
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  chatInfo: { marginLeft: 15, flex: 1 },
  nameText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  lastMsgText: { color: '#94A3B8', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748B' }
});