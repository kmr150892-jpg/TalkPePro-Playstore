import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { getSoundSettings, setMessageEnabled, setNotifSoundEnabled, setRingEnabled } from '../utils/sounds';

// 🆕 PREMIUM PALETTE
const PAL = {
  bg1: '#0A0620',
  cyan: '#00F2FE',
  blue: '#4FACFE',
  violet: '#8B5CF6',
  pink: '#EC4899',
  ruby: '#F43F5E',
  gold: '#F5C84C',
  emerald: '#10B981',
  card: 'rgba(10, 6, 28, 0.94)',
};

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
  phone: 'https://img.icons8.com/3d-fluency/512/phone.png',
  chat: 'https://img.icons8.com/3d-fluency/512/chat.png',
  bell: 'https://img.icons8.com/3d-fluency/512/bell.png',
};

// 🆕 color helpers
const hexToRgb = (hex: string) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const blend = (c1: string, c2: string, t: number) => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return c1;
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
};
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
  const [err, setErr] = useState(false);
  if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
  return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating (bob + sway) wrapper
const FloatBox = ({ children, amp = 6, dur = 1800, style }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 🆕 Twinkling sparkle
const Sparkle = ({ x, y, size = 12, color = PAL.gold, delay = 0, dur = 1800 }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
        ],
      }}
    >
      <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
    </Animated.View>
  );
};

// 🆕 Gradient-border glow card
const GlowCard = ({ colors, radius = 24, children, style, innerStyle, glow }: any) => (
  <View
    style={[
      {
        borderRadius: radius,
        backgroundColor: PAL.bg1,
        shadowColor: glow || colors[0],
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
      },
      style,
    ]}
  >
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
      <View style={[{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: PAL.card }, innerStyle]}>{children}</View>
    </LinearGradient>
  </View>
);

// 🆕 Custom animated toggle (sliding knob + glow track)
const PremiumToggle = ({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) => {
  const t = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(t, { toValue: value ? 1 : 0, friction: 6, tension: 90, useNativeDriver: true }).start();
  }, [value]);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onChange(!value)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View style={styles.toggleTrack}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: t }]}>
          <LinearGradient colors={[color, lighten(color, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.Text
          style={[styles.toggleOnText, { opacity: t, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}
        >
          ON
        </Animated.Text>
        <Animated.Text
          style={[styles.toggleOffText, { opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        >
          OFF
        </Animated.Text>
        <Animated.View
          style={[
            styles.toggleKnob,
            {
              shadowColor: value ? color : '#000',
              transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }],
            },
          ]}
        >
          <LinearGradient colors={['#FFFFFF', '#CBD5E1']} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} style={styles.toggleGloss} pointerEvents="none" />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

// 🆕 One setting row (3D icon + title + subtitle + toggle)
const SettingRow = ({ anim, img, fallback, title, subtitle, color, color2, value, onChange }: any) => (
  <Animated.View
    style={{
      marginBottom: 12,
      opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ],
    }}
  >
    <TouchableOpacity activeOpacity={0.9} onPress={() => onChange(!value)}>
      <View style={[styles.rowCard, { borderColor: value ? color + '66' : 'rgba(255,255,255,0.08)' }]}>
        <LinearGradient
          colors={[value ? color + '2E' : 'rgba(255,255,255,0.03)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[styles.rowAccent, { backgroundColor: value ? color : '#334155' }]} />

        <View style={styles.rowIconWrap}>
          <View style={[styles.rowIconGlow, { backgroundColor: color, opacity: value ? 0.4 : 0.12 }]} />
          <LinearGradient
            colors={value ? [color, color + '77'] : ['#334155', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.rowIconBg, { shadowColor: color }]}
          >
            <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.rowIconGloss} pointerEvents="none" />
            <FloatBox amp={3} dur={1500}>
              <Img3D uri={img} size={30} fallback={fallback} color="#FFF" style={{ opacity: value ? 1 : 0.55 }} />
            </FloatBox>
          </LinearGradient>
        </View>

        <View style={styles.rowTextWrap}>
          <Text style={styles.label} numberOfLines={1}>{title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: value ? color2 : '#64748B' }]} />
            <Text style={[styles.subLabel, { color: value ? lighten(color, 0.45) : '#64748B' }]} numberOfLines={1}>
              {value ? subtitle : 'Muted'}
            </Text>
          </View>
        </View>

        <PremiumToggle value={value} onChange={onChange} color={color} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

export default function SettingsButton({ size = 22, color = '#FFF' }: { size?: number; color?: string }) {
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(true);
  const [message, setMessage] = useState(true);
  const [notif, setNotif] = useState(true);

  // 🆕 animation values
  const enter = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const orbAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

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

  const toggleRing = (v: boolean) => { setRing(v); setRingEnabled(v); };
  const toggleMessage = (v: boolean) => { setMessage(v); setMessageEnabled(v); };

  // 🆕 run animations only while the popup is open
  useEffect(() => {
    if (!open) return;

    enter.setValue(0);
    rowAnims.forEach(a => a.setValue(0));
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    Animated.stagger(
      90,
      rowAnims.map(a => Animated.spring(a, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }))
    ).start();

    const spinLoop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    spinAnim.setValue(0);
    spinLoop.start();

    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    orbLoop.start();

    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(sweepAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    sweepLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    glowLoop.start();

    return () => {
      spinLoop.stop(); orbLoop.stop(); sweepLoop.stop(); glowLoop.stop();
    };
  }, [open]);

  const activeCount = [ring, message, notif].filter(Boolean).length;

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const btnSweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 340] });
  const liveGlow = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <>
      <TouchableOpacity onPress={openModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="settings-outline" size={size} color={color} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={() => setOpen(false)}>
          {/* 🆕 blurred glass background + aurora orbs */}
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <LinearGradient
            colors={['rgba(0,242,254,0.10)', 'transparent', 'rgba(236,72,153,0.12)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Animated.View pointerEvents="none" style={[styles.orb, { top: 90, right: -90, backgroundColor: PAL.cyan, transform: [{ translateY: orbY }] }]} />
          <Animated.View pointerEvents="none" style={[styles.orb, { bottom: 80, left: -110, backgroundColor: PAL.violet, transform: [{ translateY: Animated.multiply(orbY, -1) }] }]} />

          <Animated.View
            style={{
              width: '88%',
              opacity: enter,
              transform: [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
            }}
          >
            <TouchableOpacity activeOpacity={1}>
              <GlowCard colors={[PAL.cyan, PAL.violet, PAL.pink]} radius={32} glow={PAL.cyan}>
                <View style={styles.card}>
                  <LinearGradient
                    colors={[PAL.cyan + '26', 'transparent', PAL.pink + '1A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  <Sparkle x={210} y={16} size={12} color={PAL.cyan} delay={0} />
                  <Sparkle x={280} y={70} size={10} color={PAL.pink} delay={600} />
                  <Sparkle x={14} y={84} size={9} color={PAL.gold} delay={1100} />

                  {/* 🏆 HEADER */}
                  <View style={styles.headerRow}>
                    <View style={styles.headerIconBox}>
                      <Animated.View style={[styles.headerIconGlow, { opacity: liveGlow }]} />
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <MaterialCommunityIcons name="cog-outline" size={34} color={PAL.cyan} />
                      </Animated.View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.headerLabel}>CONTROL CENTER</Text>
                      <Text style={styles.title}>Settings</Text>
                      <View style={styles.headerUnderline}>
                        <LinearGradient
                          colors={['transparent', PAL.cyan, PAL.pink, 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>
                    </View>
                  </View>

                  {/* 🆕 live status chip */}
                  <View style={styles.chipRow}>
                    <View style={styles.liveChip}>
                      <Animated.View style={[styles.liveDot, { opacity: liveGlow }]} />
                      <Text style={styles.liveText}>{activeCount}/3 ACTIVE</Text>
                    </View>
                    <Text style={styles.hintText}>Tap a card to switch</Text>
                  </View>

                  {/* 🎚 SETTING ROWS */}
                  <SettingRow
                    anim={rowAnims[0]}
                    img={IMG.phone}
                    fallback="phone-ring-outline"
                    title="Call ringtone"
                    subtitle="Ringing enabled"
                    color={PAL.ruby}
                    color2="#FB7185"
                    value={ring}
                    onChange={toggleRing}
                  />
                  <SettingRow
                    anim={rowAnims[1]}
                    img={IMG.chat}
                    fallback="message-text-outline"
                    title="Message sound"
                    subtitle="Chat tones enabled"
                    color={PAL.violet}
                    color2="#C084FC"
                    value={message}
                    onChange={toggleMessage}
                  />
                  <SettingRow
                    anim={rowAnims[2]}
                    img={IMG.bell}
                    fallback="bell-ring-outline"
                    title="Notifications sound"
                    subtitle="Alerts enabled"
                    color={PAL.cyan}
                    color2={PAL.blue}
                    value={notif}
                    onChange={toggleNotif}
                  />

                  {/* ✅ DONE BUTTON */}
                  <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(false)} style={styles.closeWrap}>
                    <LinearGradient colors={[PAL.cyan, PAL.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.closeBtn}>
                      <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.closeGloss} pointerEvents="none" />
                      <Animated.View pointerEvents="none" style={[styles.closeSweep, { transform: [{ translateX: btnSweepX }, { rotate: '20deg' }] }]}>
                        <LinearGradient
                          colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </Animated.View>
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                      <Text style={styles.closeText}>DONE</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </GlowCard>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.72)', justifyContent: 'center', alignItems: 'center' },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.16 },
  card: { padding: 20 },

  // header
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(0,242,254,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,242,254,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconGlow: { position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: '#00F2FE', opacity: 0.3 },
  headerLabel: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  title: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textShadowColor: '#00F2FE80', textShadowRadius: 10 },
  headerUnderline: { width: 110, height: 2, borderRadius: 1, marginTop: 6, overflow: 'hidden' },

  // status chip
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 16 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { color: '#10B981', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6 },
  hintText: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // setting row
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    overflow: 'hidden',
  },
  rowAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  rowIconWrap: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
  rowIconGlow: { position: 'absolute', width: 42, height: 42, borderRadius: 21 },
  rowIconBg: {
    width: 48,
    height: 48,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowRadius: 12,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  rowIconGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
  rowTextWrap: { flex: 1, marginLeft: 12, marginRight: 8, minWidth: 0 },
  label: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  subLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },

  // custom toggle
  toggleTrack: {
    width: 62,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toggleKnob: {
    position: 'absolute',
    left: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  toggleGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 12 },
  toggleOnText: { position: 'absolute', left: 9, color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  toggleOffText: { position: 'absolute', right: 8, color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // done button
  closeWrap: {
    marginTop: 8,
    borderRadius: 18,
    shadowColor: '#00F2FE',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 18, overflow: 'hidden' },
  closeGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  closeSweep: { position: 'absolute', top: -30, bottom: -30, width: 70 },
  closeText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 3 },
});