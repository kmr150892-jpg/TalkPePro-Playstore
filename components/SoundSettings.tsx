import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { getSoundSettings, setMessageEnabled, setRingEnabled } from '../utils/sounds';

export default function SoundSettings() {
  const [ring, setRing] = useState(true);
  const [message, setMessage] = useState(true);

  useEffect(() => {
    getSoundSettings().then((s) => { setRing(s.ring); setMessage(s.message); });
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Call ringtone</Text>
        <Switch value={ring} onValueChange={(v) => { setRing(v); setRingEnabled(v); }} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Message sound</Text>
        <Switch value={message} onValueChange={(v) => { setMessage(v); setMessageEnabled(v); }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});