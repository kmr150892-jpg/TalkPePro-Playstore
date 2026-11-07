import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { getSoundSettings, setMessageEnabled, setNotifSoundEnabled, setRingEnabled } from '../utils/sounds';

export default function SettingsButton({ size = 22, color = '#FFF' }: { size?: number; color?: string }) {
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(true);
  const [message, setMessage] = useState(true);
  const [notif, setNotif] = useState(true);

  const openModal = async () => {
    setOpen(true);
    try {
      const s = await getSoundSettings();
      setRing(s.ring);
      setMessage(s.message);
      setNotif(s.notif);
    } catch (e) {}
  };

  const toggleNotif = (v: boolean) => {
    setNotif(v);
    setNotifSoundEnabled(v);
    const uid = auth.currentUser?.uid;
    if (uid) updateDoc(doc(db, 'users', uid), { pushEnabled: v }).catch(() => {});
  };

  return (
    <>
      <TouchableOpacity onPress={openModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="settings-outline" size={size} color={color} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Call ringtone</Text>
              <Switch value={ring} onValueChange={(v) => { setRing(v); setRingEnabled(v); }} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Message sound</Text>
              <Switch value={message} onValueChange={(v) => { setMessage(v); setMessageEnabled(v); }} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Notifications sound </Text>
              <Switch value={notif} onValueChange={toggleNotif} />
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>DONE</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: '#0A0F22', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 12, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  label: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  closeBtn: { marginTop: 14, padding: 14, alignItems: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  closeText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});