import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function FriendsList() {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "connections"),
      where("senderId", "==", user.uid),
      where("status", "==", "friend")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsData = await Promise.all(
        snapshot.docs.map(async (connectionDoc) => {
          const data = connectionDoc.data();
          const expertId = data.receiverId;

          const expertRef = doc(db, "users", expertId);
          const expertSnap = await getDoc(expertRef);

          let expertInfo = {
            name: data.receiverName || "Expert",
            image: data.receiverImage || null
          };

          if (expertSnap.exists()) {
            const expertData = expertSnap.data();
            expertInfo.name = expertData.displayName || expertData.name || expertInfo.name;
            expertInfo.image = expertData.profilePic || expertData.photoURL || expertInfo.image;
          }

          return {
            id: connectionDoc.id, // Firestore Document ID for deletion
            ...data,
            realName: expertInfo.name,
            realImage: expertInfo.image
          };
        })
      );
      setFriends(friendsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ✅ CHAT NAVIGATION LOGIC
  const handleChatPress = (expertId: string, expertName: string) => {
    if (!user) return;
    // Unique Chat ID generation (Alphabetical order logic)
    const chatId = user.uid < expertId ? `${user.uid}_${expertId}` : `${expertId}_${user.uid}`;
    
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: expertId, receiverName: expertName }
    });
  };

  // ✅ UNFOLLOW LOGIC
  const handleUnfollow = (connectionId: string, name: string) => {
    Alert.alert(
      "Unfollow Expert",
      `Are you sure you want to unfollow ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Unfollow", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "connections", connectionId));
              // Snapshot automatic-ah update aagidum, so list-la irundhu poiyidum.
            } catch (error) {
              Alert.alert("Error", "Unfollow panna mudiyala.");
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Friends</Text>
      </View>

      {friends.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No friends added yet. Follow experts to see them here!</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.friendCard}>
              <TouchableOpacity 
                style={styles.cardLeft}
                onPress={() => router.push(`/expert-detail?id=${item.receiverId}` as any)}
              >
                <Image 
                  source={{ 
                    uri: item.realImage || `https://ui-avatars.com/api/?name=${item.realName}&background=3B82F6&color=fff` 
                  }} 
                  style={styles.friendImg} 
                />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{item.realName}</Text>
                  <Text style={styles.statusLabel}>Connected</Text>
                </View>
              </TouchableOpacity>

              {/* ✅ CHAT BUTTON (NEW) */}
              <TouchableOpacity 
                style={styles.chatBtn}
                onPress={() => handleChatPress(item.receiverId, item.realName)}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#3B82F6" />
                <Text style={styles.chatText}>Chat</Text>
              </TouchableOpacity>

              {/* ✅ UNFOLLOW BUTTON */}
              <TouchableOpacity 
                style={styles.unfollowBtn}
                onPress={() => handleUnfollow(item.id, item.realName)}
              >
                <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
                <Text style={styles.unfollowText}>Remove</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, gap: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  friendCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#1E293B', 
    padding: 12, 
    borderRadius: 20, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  friendImg: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#334155' },
  friendInfo: { marginLeft: 12, flex: 1 },
  friendName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusLabel: { color: '#10B981', fontSize: 12, marginTop: 2 },
  chatBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)'
  },
  chatText: { color: '#3B82F6', fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  unfollowBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)'
  },
  unfollowText: { color: '#EF4444', fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 14 },
});