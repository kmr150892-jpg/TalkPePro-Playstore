import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Btn = { text?: string; onPress?: (value?: any) => void; style?: 'default' | 'cancel' | 'destructive' };
// 🔥 NEW: options added so { cancelable: false } (e.g. Account Suspended alert) is respected
type Item = { title: string; message?: string; buttons: Btn[]; options?: { cancelable?: boolean } };

let enqueue: ((i: Item) => void) | null = null;

// Fast refresh la double-patch aagaama irukka native ah save pannikkirom
const g = Alert as any;
if (!g.__nativeAlert) g.__nativeAlert = Alert.alert.bind(Alert);

// 🔥 NEW: 4th parameter (options) now supported and forwarded
export function installCustomAlert() {
  Alert.alert = (title: string, message?: string, buttons?: Btn[], options?: { cancelable?: boolean }) => {
    if (!enqueue) return g.__nativeAlert(title, message, buttons, options); // host mount aagala na native fallback
    enqueue({
      title: title ?? '',
      message: message ?? undefined,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      options,
    });
  };
}

const tone = (title: string) => {
  if (/error|fail|denied|locked|invalid|restricted|blocked|critical|declined|❌/i.test(title)) return '#FF5A6E';
  if (/success|✅|updated|copied|restored|congrat|sent|deleted|done/i.test(title)) return '#2ECC8F';
  return '#7C5CFF';
};

export function CustomAlertHost() {
  const [queue, setQueue] = useState<Item[]>([]);
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const cur = queue[0];

  useEffect(() => {
    enqueue = (i) => setQueue((q) => [...q, i]);
    return () => { enqueue = null; };
  }, []);

  useEffect(() => {
    if (!cur) return;
    scale.setValue(0.9);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [cur]);

  const finish = (b?: Btn) => {
    setQueue((q) => q.slice(1));
    setTimeout(() => b?.onPress?.(), 0);
  };

  if (!cur) return null;
  const accent = tone(cur.title);
  const stacked = cur.buttons.length > 2;
  const cancelBtn = cur.buttons.find((b) => b.style === 'cancel');
  // 🔥 NEW: back button dismisses only when cancelable: true (same as native Android behaviour)
  const canDismiss = cur.options?.cancelable === true;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent
      onRequestClose={() => canDismiss && finish(cancelBtn)}>
      <Animated.View style={[s.backdrop, { opacity: fade }]}>
        <Animated.View style={[s.card, { transform: [{ scale }] }]}>
          <View style={[s.accent, { backgroundColor: accent }]} />
          <Text style={s.title}>{cur.title}</Text>
          {!!cur.message && (
            <ScrollView style={{ maxHeight: 220 }}>
              <Text style={s.body}>{cur.message}</Text>
            </ScrollView>
          )}
          <View style={[s.row, stacked && { flexDirection: 'column' }]}>
            {cur.buttons.map((b, i) => {
              const isCancel = b.style === 'cancel';
              const isDanger = b.style === 'destructive';
              return (
                <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => finish(b)}
                  style={[
                    s.btn,
                    stacked && { marginLeft: 0, marginTop: 8 },
                    isCancel
                      ? s.btnGhost
                      : { backgroundColor: isDanger ? '#FF5A6E' : accent },
                  ]}>
                  <Text style={[s.btnText, isCancel && { color: 'rgba(255,255,255,0.75)' }]}>
                    {b.text || 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 28 },
  card: {
    backgroundColor: '#14141F', borderRadius: 24, padding: 22, paddingTop: 26,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  body: { color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  btn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, marginLeft: 10, alignItems: 'center' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.08)' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});