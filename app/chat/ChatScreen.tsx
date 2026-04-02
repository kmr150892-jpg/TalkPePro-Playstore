import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function ChatScreen() {
  const { chatId, receiverId } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const user = auth.currentUser;

  // 1. Fetch Messages in Real-time
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId as string, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId]);

  // 2. Send Message Function
  const sendMessage = async () => {
    if (message.trim().length === 0) return;

    try {
      // ✅ FEATURE 1: Add the actual message to sub-collection
      await addDoc(collection(db, "chats", chatId as string, "messages"), {
        text: message,
        senderId: user?.uid,
        createdAt: serverTimestamp(),
      });

      // ✅ FEATURE 2: Update the Main Chat Document (SYNC WITH EXPERT/USER LIST)
      // Ithuthaan MessageList-la sync aaga kaaranam. Participants array-ah update panrom.
      await setDoc(doc(db, "chats", chatId as string), {
        lastMessageText: message,
        lastMessageTime: serverTimestamp(),
        participants: [user?.uid, receiverId], 
      }, { merge: true });

      setMessage('');
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted // New messages mela vara
        renderItem={({ item }) => (
          <View style={[styles.msgBubble, item.senderId === user?.uid ? styles.myMsg : styles.theirMsg]}>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor="#475569"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 10 },
  msgBubble: { padding: 12, borderRadius: 15, marginVertical: 5, maxWidth: '80%' },
  myMsg: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
  theirMsg: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
  msgText: { color: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  input: { flex: 1, backgroundColor: '#1E293B', color: '#FFF', borderRadius: 20, paddingHorizontal: 15, height: 45 },
  sendBtn: { marginLeft: 10, backgroundColor: '#3B82F6', padding: 10, borderRadius: 25 }
});