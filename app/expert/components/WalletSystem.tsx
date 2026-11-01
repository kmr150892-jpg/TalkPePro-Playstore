import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../../firebaseConfig';
import { sendNotificationToUser } from '../../../utils/notificationHelper'; // 🔥 NOTIFICATION IMPORT

const { width, height } = Dimensions.get('window');

// 🎨 IMAGES (neenga eppo venumnaalum unga brand images-a maathikalam)
const HEADER_BG = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1600&auto=format&fit=crop';
const CARD_BG = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop';
const BANK_BG = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';

const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 264;

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

// ✨ LEVEL START POINTS (used only for the level progress bar on the rewards card)
const LEVEL_FLOORS = [0, 30000, 100000, 300000, 1000000, 3000000, 5000000, 10000000, 30000000, 50000000, 100000000];

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

// 📄 FULL-SCREEN FORM PAGE (replaces bottom sheets)
// Nothing here moves when the keyboard opens: header stays on top, the form scrolls, and extra scroll room is added at the bottom
// so the last buttons can always be scrolled above the keyboard.
// 🔧 KEYBOARD FIX: no statusBarTranslucent on the Modal (it makes Android pan the whole window), no focus timers,
// no dismiss-on-drag. Auto-scroll of the focused field is controlled by the AUTO_SCROLL switch below.
const ScrollCtx = createContext<(y: number) => void>(() => {});

// 🔧 AUTO_SCROLL = false  -> keyboard open-a irukkum pothu screen thaana scroll aagaadhu (jump illa, safe)
// 🔧 AUTO_SCROLL = true   -> focus pannina field-a keyboard-ku mela thookum (jump aana thirumba false pannunga)
const AUTO_SCROLL = true;

const FormPage = ({ visible, onClose, theme, header, children }: any) => {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const [kb, setKb] = useState(0);
    const kbRef = useRef(0);
    const focusY = useRef(0);

    const doScroll = () => {
        scrollRef.current?.scrollTo({ y: Math.max(0, focusY.current - 110), animated: true });
    };

    useEffect(() => {
        if (!visible || Platform.OS !== 'android') return;
        const s = Keyboard.addListener('keyboardDidShow', (e: any) => {
            const h = e?.endCoordinates?.height || 0;
            kbRef.current = h;
            setKb(h);
            // padding set aana APRAM scroll (only when AUTO_SCROLL is on)
            if (AUTO_SCROLL) setTimeout(doScroll, 60);
        });
        const h = Keyboard.addListener('keyboardDidHide', () => { kbRef.current = 0; setKb(0); });
        return () => { s.remove(); h.remove(); kbRef.current = 0; setKb(0); };
    }, [visible]);

    // focus-la timer illa: field position-a mattum note panrom, keyboard already open-a irundha mattum udane scroll
    const scrollToY = useCallback((y: number) => {
        focusY.current = y;
        if (AUTO_SCROLL && (Platform.OS === 'ios' || kbRef.current > 0)) doScroll();
    }, []);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.pageRoot}>
                <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={[theme.primary + '22', 'transparent']} style={styles.sheetGlow} pointerEvents="none" />

                <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 24, paddingBottom: 6 }}>
                    {header}
                </View>

                <ScrollView
                    ref={scrollRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 16,
                        paddingBottom: insets.bottom + 40 + (Platform.OS === 'android' ? kb : 0)
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="none"
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    showsVerticalScrollIndicator={false}
                >
                    <ScrollCtx.Provider value={scrollToY}>
                        {children}
                    </ScrollCtx.Provider>
                </ScrollView>
            </View>
        </Modal>
    );
};

// ✨ PRESS-SCALE BUTTON (ovvoru tap-kum springy premium feel)
const ScaleBtn = ({ children, onPress, style, wrapStyle, disabled }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={wrapStyle}
            onPressIn={() => Animated.spring(s, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
        >
            <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
        </Pressable>
    );
};

// ✨ FLOATING GLOW PARTICLE (card ulla magic dust)
const FloatingDot = ({ delay, left, size, color, duration }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                bottom: 14,
                left,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.85, 0] }),
                transform: [
                    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) },
                    { translateX: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, -8] }) }
                ]
            }}
        />
    );
};

// ✨ 3D TILT CARD: sways on its own, follows your finger on horizontal drag, glare shine
const Tilt3D = ({ children, style, radius = 28, max = 10 }: any) => {
    const rx = useRef(new Animated.Value(0)).current;
    const ry = useRef(new Animated.Value(0)).current;
    const sw = useRef(new Animated.Value(0)).current;
    const dims = useRef({ w: 300, h: 160 });

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(sw, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sw, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const release = () => {
        Animated.parallel([
            Animated.spring(rx, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
            Animated.spring(ry, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
        ]).start();
    };

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderMove: (_, g) => {
                ry.setValue(clamp(g.dx / (dims.current.w / 2)));
                rx.setValue(clamp(g.dy / dims.current.h));
            },
            onPanResponderRelease: release,
            onPanResponderTerminate: release,
        })
    ).current;

    const rotateX = rx.interpolate({ inputRange: [-1, 1], outputRange: [`${max}deg`, `-${max}deg`] });
    const rotateY = ry.interpolate({ inputRange: [-1, 1], outputRange: [`-${max}deg`, `${max}deg`] });
    const swayY = sw.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
    const swayX = sw.interpolate({ inputRange: [0, 1], outputRange: ['2.5deg', '-2.5deg'] });
    const glareX = Animated.add(
        ry.interpolate({ inputRange: [-1, 1], outputRange: [-130, 130] }),
        sw.interpolate({ inputRange: [0, 1], outputRange: [-70, 70] })
    );

    return (
        <Animated.View
            {...pan.panHandlers}
            onLayout={(e) => { dims.current = { w: e.nativeEvent.layout.width || 300, h: e.nativeEvent.layout.height || 160 }; }}
            style={[
                style,
                { transform: [{ perspective: 900 }, { rotateX }, { rotateY }, { rotateY: swayY }, { rotateX: swayX }] }
            ]}
        >
            {children}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
                <Animated.View style={[styles.glareStrip, { transform: [{ translateX: glareX }, { rotate: '18deg' }] }]} />
            </View>
        </Animated.View>
    );
};

// ✨ 3D SPINNING REWARD COIN (front = star, back = your level)
const RewardCoin = ({ lvl, c1, c2 }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(a, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const frontRot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const backRot = a.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '540deg'] });
    return (
        <View style={styles.coinWrap}>
            <Animated.View style={[styles.coinFace, { transform: [{ perspective: 500 }, { rotateY: frontRot }] }]}>
                <LinearGradient colors={[c1, c2] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinGrad}>
                    <MaterialCommunityIcons name="star-four-points" size={26} color="#000" />
                </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.coinFace, { transform: [{ perspective: 500 }, { rotateY: backRot }] }]}>
                <LinearGradient colors={[c2, c1] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinGrad}>
                    <Text style={styles.coinText}>L{lvl}</Text>
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

// ✨ 3D FLOATING SHIELD ORB (payout details hero)
const ShieldOrb = ({ c1, c2 }: any) => {
    const sway = useRef(new Animated.Value(0)).current;
    const bob = useRef(new Animated.Value(0)).current;
    const ring = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const l1 = Animated.loop(
            Animated.sequence([
                Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sway, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const l2 = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const l3 = Animated.loop(
            Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        l1.start(); l2.start(); l3.start();
        return () => { l1.stop(); l2.stop(); l3.stop(); };
    }, []);

    const rotY = sway.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '28deg'] });
    const rotX = sway.interpolate({ inputRange: [0, 1], outputRange: ['8deg', '-8deg'] });
    const ty = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
    const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

    return (
        <View style={styles.orbWrap}>
            <Animated.View pointerEvents="none" style={[styles.orbRing, { borderColor: c1, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <Animated.View style={{ transform: [{ translateY: ty }, { perspective: 600 }, { rotateY: rotY }, { rotateX: rotX }] }}>
                <LinearGradient colors={[c1, c2] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orbCore}>
                    <Ionicons name="shield-checkmark" size={34} color="#FFF" />
                </LinearGradient>
            </Animated.View>
            <FloatingDot delay={0} left={8} size={4} color="#FFF" duration={3200} />
            <FloatingDot delay={900} left={60} size={3} color={c1} duration={3600} />
            <FloatingDot delay={1500} left={96} size={4} color="#FFF" duration={3000} />
        </View>
    );
};

// ✨ DISPLAY-ONLY STATUS LABELS (database values stay exactly the same)
const getStatusLabel = (status: string) => {
    if (status === 'PENDING') return 'IN REVIEW';
    if (status === 'REJECTED') return 'DECLINED';
    return status;
};

// ✨ LEDGER ROW (slide-in animation, status accent bar, status chip)
const LedgerRow = ({ tx, index, theme, borderStyle }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(a, { toValue: 1, duration: 520, delay: index * 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    const isRejected = tx.status === 'REJECTED';
    const isPending = tx.status === 'PENDING';
    const statusColor = isRejected ? '#EF4444' : isPending ? '#F59E0B' : theme.primary;

    return (
        <Animated.View
            style={{
                marginBottom: 12,
                opacity: a,
                transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
            }}
        >
            {/* 🔥 DYNAMIC DUAL-TONE LEDGER ITEMS WITH REJECT FIX */}
            <View style={[styles.ledgerItem, borderStyle]}>
                <View style={[styles.ledgerAccent, { backgroundColor: statusColor }]} />
                <View style={[styles.ledgerIcon, { backgroundColor: isRejected ? '#EF444420' : isPending ? '#F59E0B20' : `${theme.primary}20` }]}>
                    <MaterialCommunityIcons
                        name={isRejected ? "close-circle" : isPending ? "clock-fast" : "check-circle"}
                        size={22} color={statusColor}
                    />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.ledgerType}>{!tx.type || tx.type === 'Redeem' ? 'Reward Redemption' : tx.type}</Text>
                    <Text style={styles.ledgerDate}>{tx.createdAt?.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) || 'RECENT'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {/* 🔥 Strikethrough if rejected to show amount wasn't deducted permanently */}
                    <Text style={[styles.ledgerAmount, isRejected && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                        - ₹{tx.amountRupee || tx.amount}
                    </Text>
                    <View style={[styles.ledgerStatusChip, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                        <Text style={[styles.ledgerStatus, { color: statusColor }]}>{getStatusLabel(tx.status)}</Text>
                    </View>
                </View>
            </View>

            {/* 🔥 REJECTION REASON DISPLAY BOX */}
            {isRejected && tx.rejectReason && (
                <View style={[styles.rejectReasonBox, { marginTop: 8 }]}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.rejectLabel}>REVIEW NOTE</Text>
                        <Text style={styles.rejectReasonText}>{tx.rejectReason}</Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

// 🎁 REDEEM FORM (local state: typing never re-renders the big Rewards screen)
const RedeemBody = ({ theme, borderType1, availableRupees, loading, onSubmit }: any) => {
    const [amount, setAmount] = useState('');
    return (
        <>
            <View style={styles.inputArea}>
                <Text style={styles.currencyLabel}>ENTER REDEEM AMOUNT</Text>
                <TextInput 
                    style={styles.giantInput} 
                    placeholder="0" 
                    placeholderTextColor="rgba(255,255,255,0.1)" 
                    keyboardType="numeric" 
                    value={amount} 
                    onChangeText={(t: string) => setAmount(t)}
                />

                {/* ⚡ QUICK AMOUNT CHIPS */}
                <View style={styles.quickRow}>
                    {QUICK_AMOUNTS.map((v) => {
                        const active = amount === String(v);
                        return (
                            <TouchableOpacity
                                key={v}
                                onPress={() => setAmount(String(v))}
                                style={[styles.quickChip, active && { backgroundColor: theme.primary + '30', borderColor: theme.primary }]}
                            >
                                <Text style={[styles.quickChipText, active && { color: '#FFF' }]}>₹{v.toLocaleString()}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 🔥 DUAL TONE INFO BOX (TYPE 1) */}
                <View style={[styles.feeInfoBox, borderType1]}>
                    <Text style={styles.feeText}>PROCESSING FEE: <Text style={{color: '#FFF'}}>₹100</Text></Text>
                    <View style={styles.feeDot} />
                    <Text style={styles.feeText}>TOTAL REWARDS USED: <Text style={{color: '#FFF'}}>₹{(Number(amount) || 0) + 100}</Text></Text>
                </View>
                <Text style={styles.availableHint}>Available: ₹{availableRupees.toLocaleString()}</Text>
                <Text style={styles.reviewNote}>Redemption requests are subject to review and verification before processing.</Text>
            </View>

            <ScaleBtn style={styles.finalSubmitBtn} onPress={() => onSubmit(amount)} disabled={loading}>
                <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.finalSubmitGrad}>
                    {loading ? <ActivityIndicator color="#FFF" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="paper-plane" size={16} color="#FFF" />
                            <Text style={styles.finalSubmitText}>SUBMIT REQUEST</Text>
                        </View>
                    )}
                </LinearGradient>
            </ScaleBtn>
        </>
    );
};

// 🛡️ PAYOUT FORM (local state: typing never re-renders the big Rewards screen)
const PayoutFormBody = ({ initial, idProofImage, loading, theme, borderType1, borderType2, onPickId, onCancel, onSubmit }: any) => {
    const [details, setDetails] = useState({
        holderName: initial?.holderName || '',
        accountNumber: initial?.accountNumber || '',
        ifsc: initial?.ifsc || '',
        upiId: initial?.upiId || ''
    });

    return (
        <>
            {/* 🔐 TRUST CHIPS */}
            <View style={styles.trustRow}>
                <View style={styles.trustChip}>
                    <Ionicons name="lock-closed" size={13} color={theme.primary} />
                    <Text style={styles.trustChipText}>PRIVATE</Text>
                </View>
                <View style={styles.trustChip}>
                    <MaterialCommunityIcons name="file-search-outline" size={14} color={theme.primary} />
                    <Text style={styles.trustChipText}>TEAM REVIEWED</Text>
                </View>
                <View style={styles.trustChip}>
                    <Ionicons name="checkmark-done" size={14} color={theme.primary} />
                    <Text style={styles.trustChipText}>APPROVAL BASED</Text>
                </View>
            </View>

            {/* 🔥 DUAL TONE INPUT NODES (ALTERNATING) */}
            <InputNode label="ACCOUNT HOLDER" icon="person-outline" accent={theme.primary} value={details.holderName} onChange={(t: string) => setDetails((d) => ({ ...d, holderName: t }))} borderStyle={borderType1} />
            <InputNode label="ACCOUNT NUMBER" icon="card-outline" accent={theme.primary} value={details.accountNumber} onChange={(t: string) => setDetails((d) => ({ ...d, accountNumber: t }))} keyboard="numeric" borderStyle={borderType2} />
            <InputNode label="IFSC CODE" icon="business-outline" accent={theme.primary} value={details.ifsc} onChange={(t: string) => setDetails((d) => ({ ...d, ifsc: t }))} autoCap="characters" borderStyle={borderType1} />
            <InputNode label="UPI ID / VPA" icon="at-outline" accent={theme.primary} value={details.upiId} onChange={(t: string) => setDetails((d) => ({ ...d, upiId: t }))} borderStyle={borderType2} />

            <Text style={styles.nodeLabel}>ID VERIFICATION DOCUMENT</Text>
            <TouchableOpacity style={[styles.uploadNode, borderType1]} onPress={onPickId}>
                {loading ? (
                    <ActivityIndicator color={theme.primary} />
                ) : idProofImage ? (
                    <View style={styles.uploadSuccess}>
                        <Ionicons name="checkmark-done-circle" size={24} color="#10B981" />
                        <Text style={styles.uploadSuccessText}>SECURELY ATTACHED</Text>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <Ionicons name="cloud-upload" size={28} color={theme.primary} />
                        <Text style={styles.uploadHint}>Upload Aadhaar or PAN Card</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* 🔒 PRIVACY NOTE */}
            <View style={styles.privacyNote}>
                <MaterialCommunityIcons name="lock-outline" size={14} color="#64748B" />
                <Text style={styles.privacyNoteText}>Your details are used only to verify your identity and process approved reward redemptions. They are submitted for review by our team.</Text>
            </View>

            <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelNode} onPress={onCancel}>
                    <Text style={styles.cancelNodeText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveNode} onPress={() => onSubmit(details)} disabled={loading}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.saveNodeGrad}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveNodeText}>SUBMIT FOR VERIFICATION</Text>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </>
    );
};

export default function WalletSystem({ expertData }: any) {
    const [user, setUser] = useState(auth.currentUser); 
    const [modalVisible, setModalVisible] = useState(false);
    const [editBankVisible, setEditBankVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    
    const [bankDetails, setBankDetails] = useState({
        holderName: expertData?.bankDetails?.holderName || '',
        accountNumber: expertData?.bankDetails?.accountNumber || '',
        ifsc: expertData?.bankDetails?.ifsc || '',
        upiId: expertData?.bankDetails?.upiId || ''
    });

    const [idProofImage, setIdProofImage] = useState(expertData?.idProof || null);

    // keeps track of whether the payout page is open so background data refreshes never overwrite what the user is typing
    const editOpenRef = useRef(false);
    useEffect(() => { editOpenRef.current = editBankVisible; }, [editBankVisible]);

    // 🔥 ANIMATION REFS
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;       // card floating
    const sweepAnim = useRef(new Animated.Value(0)).current;       // card light sweep
    const pulseAnim = useRef(new Animated.Value(0)).current;       // ACTIVE badge pulse
    const balanceAnim = useRef(new Animated.Value(0)).current;     // balance count-up
    const progressAnim = useRef(new Animated.Value(0)).current;    // min-redeem progress bar
    const levelAnim = useRef(new Animated.Value(0)).current;       // level progress bar on card
    const sectionAnims = useRef(Array.from({ length: 7 }, () => new Animated.Value(0))).current; // staggered entrance
    const [balanceShown, setBalanceShown] = useState(0);

    // 🔥 DYNAMIC THEME CALCULATION
    const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0;
    const config = getLevelConfig(totalBeans);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        // DYNAMIC DESIGNED BACKGROUND GRADIENT
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A', 
            '#020617'
        ] as const 
    };

    const isBankVerified = expertData?.isBankVerified || false; 
    const walletBalanceBeans = expertData?.walletBalance || 0; 
    const availableRupees = Math.floor(walletBalanceBeans / 100); 
    const pendingACTIVITY_REWARD = expertData?.pendingACTIVITY_REWARD || 0;

    // ✨ level progress (0-100)
    const levelFloor = LEVEL_FLOORS[config.lvl] || 0;
    const levelPct = config.next === 0
        ? 100
        : Math.max(0, Math.min(((totalBeans - levelFloor) / Math.max(1, config.next - levelFloor)) * 100, 100));

    useEffect(() => {
        const authUnsub = auth.onAuthStateChanged((u:any) => setUser(u));
        // Start Ambient Animation
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        // ✨ NEW: card floating loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // ✨ NEW: card light sweep loop
        Animated.loop(
            Animated.sequence([
                Animated.delay(1600),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

        // ✨ NEW: ACTIVE badge pulse
        Animated.loop(
            Animated.timing(pulseAnim, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: true })
        ).start();

        // ✨ NEW: staggered 3D entrance of every section
        Animated.stagger(
            110,
            sectionAnims.map((a) =>
                Animated.timing(a, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            )
        ).start();

        return () => authUnsub();
    }, []);

    // ✨ NEW: balance count-up animation
    useEffect(() => {
        const id = balanceAnim.addListener(({ value }) => setBalanceShown(Math.round(value)));
        Animated.timing(balanceAnim, {
            toValue: availableRupees,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
        return () => balanceAnim.removeListener(id);
    }, [availableRupees]);

    // ✨ NEW: min-redeem progress bar fill
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: Math.max(0, Math.min((availableRupees / 500) * 100, 100)),
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
    }, [availableRupees]);

    // ✨ NEW: level progress bar fill
    useEffect(() => {
        Animated.timing(levelAnim, {
            toValue: levelPct,
            duration: 1300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
    }, [levelPct]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "withdrawals"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!auth.currentUser) return;
            const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(txList);
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.log("WalletSystem: Sync detached safely.");
            }
        });

        return () => unsubscribe();
    }, [user]);

    // 🔧 never overwrite details while the payout page is open
    useEffect(() => {
        if (editOpenRef.current) return;
        if (expertData?.bankDetails) {
            setBankDetails({
                holderName: '',
                accountNumber: '',
                ifsc: '',
                upiId: '',
                ...expertData.bankDetails
            });
        }
        if (expertData?.idProof) {
            setIdProofImage(expertData.idProof);
        }
    }, [expertData]);

    const uploadToCloudinary = async (imageUri: string) => {
        const data = new FormData();
        const filename = imageUri.split('/').pop();
        const Discover = /\.(\w+)$/.exec(filename || '');
        const type = Discover ? `image/${Discover[1]}` : `image`;

        // @ts-ignore
        data.append('file', {
            uri: imageUri,
            name: filename || 'id_proof.jpg',
            type: type || 'image/jpeg',
        });
        
        data.append('upload_preset', 'talkpe'); 

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload', {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' },
            });
            
            const result = await response.json();
            return result.secure_url || null;
        } catch (error) {
            return null;
        }
    };

    const pickIdProof = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Needed", "We need access to your gallery to upload your ID for verification.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            setLoading(true); 
            const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
            if (uploadedUrl) {
                setIdProofImage(uploadedUrl); 
                Alert.alert("Success", "ID uploaded for verification!");
            } else {
                Alert.alert("Error", "Upload failed. Please try again.");
            }
            setLoading(false);
        }
    };

    const handleWithdrawal = async (amountStr: string) => {
        if (!bankDetails.accountNumber || !isBankVerified) {
            Alert.alert("Payout Details Required", "Please add and verify your payout details first.");
            return;
        }

        // 🔥 MASTER UPDATE: CHANGED MINIMUM FROM 3000 TO 500
        if (availableRupees < 500) {
            Alert.alert("Insufficient Rewards", "Minimum ₹500 reward balance required to redeem.");
            return;
        }

        const numAmtRupee = Number(amountStr);
        
        if (numAmtRupee > 5000 && !expertData?.idProof) {
            Alert.alert("Identity Verification Required", "Redemptions above ₹5,000 require ID verification.");
            return;
        }

        const transactionCharge = 100; 
        const totalDeductionRupee = numAmtRupee + transactionCharge;
        const requiredBeans = totalDeductionRupee * 100;
        
        // 🔥 MASTER UPDATE: CHANGED MINIMUM AMOUNT CHECK FROM 3000 TO 500
        if (!amountStr || isNaN(numAmtRupee) || numAmtRupee < 500) {
            Alert.alert("Minimum Limit", "Minimum redemption is ₹500.");
            return;
        }

        if (requiredBeans > walletBalanceBeans) {
            Alert.alert("Error", `Required: ₹${totalDeductionRupee} in rewards (includes ₹${transactionCharge} processing fee).`);
            return;
        }

        setLoading(true);
        try {
            if (user?.uid && auth.currentUser) {
                await addDoc(collection(db, "withdrawals"), {
                    userId: user.uid,
                    expertName: expertData?.name || 'Host',
                    amount: numAmtRupee,
                    amountRupee: numAmtRupee,
                    transactionCharge: transactionCharge,
                    totalDeductedRupee: totalDeductionRupee,
                    beansDeducted: requiredBeans,
                    status: 'PENDING', 
                    type: 'Redeem',
                    createdAt: serverTimestamp(),
                    bankDetails: bankDetails 
                });

                await updateDoc(doc(db, "users", user.uid), {
                    walletBalance: increment(-requiredBeans),
                    pendingACTIVITY_REWARD: increment(numAmtRupee),
                    lastWithdrawalAt: serverTimestamp()
                });

                // 🔥 NOTIFICATION TRIGGER 1: Redeem Request Update
                await sendNotificationToUser(
                    user.uid,
                    "Redemption Requested 🎁",
                    `Your reward redemption request for ₹${numAmtRupee} is under review. We will update you once it is processed.`,
                    "payment"
                );

                Keyboard.dismiss();
                Alert.alert("Success ✅", "Redemption request sent for review!");
                setModalVisible(false);
            }
        } catch (e) {
            Alert.alert("Error", "Redemption request failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const saveBankDetails = async (details: any) => {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!details.holderName || details.accountNumber.length < 9) {
            Alert.alert("Invalid Input", "Check account holder name and account number.");
            return;
        }
        if (!ifscRegex.test(details.ifsc.toUpperCase())) {
            Alert.alert("Invalid IFSC", "Enter valid 11-digit IFSC.");
            return;
        }

        setLoading(true);
        try {
            if (user?.uid && auth.currentUser) {
                await updateDoc(doc(db, "users", user.uid), { 
                    bankDetails: details,
                    idProof: idProofImage, 
                    isBankVerified: false 
                });

                await addDoc(collection(db, "adminNotifications"), {
                    type: 'BANK_VERIFICATION',
                    expertId: user.uid,
                    expertName: expertData?.name || 'Host',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    details: { ...details, idProof: idProofImage }
                });

                // 🔥 NOTIFICATION TRIGGER 2: Bank Details Saved Update
                await sendNotificationToUser(
                    user.uid,
                    "Payout Details Submitted 🛡️",
                    "Your payout details have been submitted. Waiting for verification.",
                    "system"
                );

                setBankDetails(details);
                Keyboard.dismiss();
                Alert.alert("Updated ✅", "Details submitted for verification.");
                setEditBankVisible(false);
            }
        } catch (e) {
            Alert.alert("Error", "Update failed.");
        } finally {
            setLoading(false);
        }
    };

    const closeEdit = () => { Keyboard.dismiss(); setEditBankVisible(false); };
    const closeRedeem = () => { Keyboard.dismiss(); setModalVisible(false); };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // ✨ derived animation styles
    const cardFloatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
    const cardSweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, CARD_WIDTH + 60] });
    const dotPulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
    const dotPulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const levelWidth = levelAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

    // ✨ 3D flip-up reveal
    const reveal = (i: number) => ({
        opacity: sectionAnims[i],
        transform: [
            { perspective: 1000 },
            { translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) },
            { rotateX: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['28deg', '0deg'] }) }
        ]
    });

    // 🔥 ALTERNATING BORDER STYLES WITH REDUCED THICKNESS (2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary,
        borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80',
        borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const last4 = bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : '';

    return (
        <View style={[styles.mainWrapper, { backgroundColor: '#020617' }]}>
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />

            {/* 🖼️ TOP BANNER IMAGE (fades into the background) */}
            <Image source={{ uri: HEADER_BG }} style={styles.topBgImage} />
            <LinearGradient colors={['rgba(2,6,23,0.25)', '#020617']} style={styles.topBgFade} pointerEvents="none" />
            
            {/* Shimmer Orbs for Animation */}
            <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* 👑 HEADER */}
                <Animated.View style={[styles.headerRow, reveal(0)]}>
                    <View>
                        <Text style={styles.headerEyebrow}>TALKPE PRO CREATOR</Text>
                        <Text style={styles.headerTitle}>Rewards Center</Text>
                    </View>
                    <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.levelPill}>
                        <MaterialCommunityIcons name="crown" size={13} color="#FFF" />
                        <Text style={styles.levelPillText}>{config.label}</Text>
                    </LinearGradient>
                </Animated.View>
                
                {/* 🎁 REWARDS CARD (3D tilt + float) */}
                <Animated.View style={[styles.heroSection, reveal(1)]}>
                    <Animated.View style={{ transform: [{ translateY: cardFloatY }] }}>
                        <Tilt3D radius={32} max={10} style={{ borderRadius: 32 }}>
                            <View style={[styles.premiumCard, { shadowColor: theme.primary, elevation: 20 }]}>
                                <Image source={{ uri: CARD_BG }} style={styles.cardBgImage} />
                                <LinearGradient
                                    colors={[theme.primary + 'CC', '#020617E6', theme.secondary + 'AA']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.cardGlow} />
                                <View style={[styles.cardRingOne, { borderColor: theme.accent + '40' }]} />
                                <View style={[styles.cardRingTwo, { borderColor: theme.primary + '35' }]} />
                                <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: cardSweepX }, { skewX: '-20deg' }] }]} />

                                <FloatingDot delay={0}    left={CARD_WIDTH * 0.10} size={5} color="#FFF"          duration={4200} />
                                <FloatingDot delay={1100} left={CARD_WIDTH * 0.34} size={4} color={theme.accent}  duration={3800} />
                                <FloatingDot delay={600}  left={CARD_WIDTH * 0.58} size={6} color="#FFF"          duration={4600} />
                                <FloatingDot delay={1800} left={CARD_WIDTH * 0.84} size={4} color={theme.primary} duration={4000} />

                                <View style={styles.cardContentHeader}>
                                    <View>
                                        <Text style={styles.cardLabelText}>REWARD BALANCE</Text>
                                        <View style={styles.rupeeRow}>
                                            <Text style={styles.symbolText}>₹</Text>
                                            <Text style={styles.mainBalanceText}>{balanceShown.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.chipWrapper}>
                                        <RewardCoin lvl={config.lvl} c1={theme.primary} c2={theme.accent} />
                                    </View>
                                </View>

                                <View style={styles.cardNumberRow}>
                                    <View style={styles.payoutPill}>
                                        <MaterialCommunityIcons name="shield-check-outline" size={13} color="rgba(255,255,255,0.85)" />
                                        <Text style={styles.payoutPillText}>{last4 ? `PAYOUT •••• ${last4}` : 'PAYOUT NOT LINKED'}</Text>
                                    </View>
                                    <Text style={styles.cardHolderText} numberOfLines={1}>{(bankDetails.holderName || expertData?.name || 'HOST').toUpperCase()}</Text>
                                </View>

                                {/* 📈 LEVEL PROGRESS */}
                                <View>
                                    <View style={styles.levelRowTop}>
                                        <Text style={styles.levelRowLabel}>LEVEL PROGRESS</Text>
                                        <Text style={styles.levelRowValue}>{config.next === 0 ? 'MAX LEVEL' : `${Math.round(levelPct)}% TO NEXT`}</Text>
                                    </View>
                                    <View style={styles.levelTrack}>
                                        <Animated.View style={[styles.levelFillWrap, { width: levelWidth }]}>
                                            <LinearGradient colors={['#FFFFFF', theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                        </Animated.View>
                                    </View>
                                </View>

                                <View style={styles.ACTIVITY_REWARDDetailRow}>
                                    <View>
                                        <Text style={styles.ACTIVITY_REWARDLabel}>UNDER REVIEW</Text>
                                        <Text style={styles.ACTIVITY_REWARDValue}>₹{pendingACTIVITY_REWARD.toLocaleString()}</Text>
                                    </View>
                                    <ScaleBtn
                                        // 🔥 MASTER UPDATE: CHANGED FROM 3000 TO 500 IN DISABLED CHECK
                                        style={[styles.massWithdrawBtn, (availableRupees < 500 || !isBankVerified) && { opacity: 0.5 }]}
                                        onPress={() => setModalVisible(true)}
                                        disabled={availableRupees < 500 || !isBankVerified}
                                    >
                                        <View style={styles.whiteActionBtn}>
                                            <Text style={styles.blackBtnText}>Redeem Rewards</Text>
                                            <Ionicons name="arrow-forward" size={14} color="#020617" style={{ marginLeft: 6 }} />
                                        </View>
                                    </ScaleBtn>
                                </View>
                            </View>
                        </Tilt3D>
                    </Animated.View>

                    {/* 🔥 MASTER UPDATE: CHANGED FROM 3000 TO 500 IN UI WARNING (+ animated progress to unlock) */}
                    {availableRupees < 500 && (
                        <View style={styles.unlockBox}>
                            <View style={styles.limitWarning}>
                                <Ionicons name="information-circle" size={12} color="#FFF" />
                                <Text style={styles.warningText}>MINIMUM ₹500 REQUIRED</Text>
                            </View>
                            <View style={styles.unlockTrack}>
                                <Animated.View style={[styles.unlockFillWrap, { width: progressWidth }]}>
                                    <LinearGradient colors={[theme.primary, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                </Animated.View>
                            </View>
                            <Text style={styles.unlockText}>₹{availableRupees.toLocaleString()} / ₹500 to unlock Redeem Rewards</Text>
                        </View>
                    )}
                </Animated.View>

                {/* 📜 RULES STRIP */}
                <Animated.View style={[styles.rulesRow, reveal(2)]}>
                    <View style={[styles.ruleTile, borderType2]}>
                        <Ionicons name="flash-outline" size={18} color={theme.primary} />
                        <Text style={styles.ruleValue}>₹500</Text>
                        <Text style={styles.ruleLabel}>MIN REDEEM</Text>
                    </View>
                    <View style={[styles.ruleTile, borderType1]}>
                        <Ionicons name="pricetag-outline" size={18} color={theme.primary} />
                        <Text style={styles.ruleValue}>₹100</Text>
                        <Text style={styles.ruleLabel}>PROCESSING FEE</Text>
                    </View>
                    <View style={[styles.ruleTile, borderType2]}>
                        <Ionicons name="swap-horizontal" size={18} color={theme.primary} />
                        <Text style={styles.ruleValue}>100 = ₹1</Text>
                        <Text style={styles.ruleLabel}>REWARD RATE</Text>
                    </View>
                </Animated.View>

                {/* 📘 HOW REWARDS WORK (transparency note) */}
                <Animated.View style={[styles.infoCard, borderType1, reveal(3)]}>
                    <View style={styles.infoHeader}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={theme.primary} />
                        <Text style={[styles.infoTitle, { color: theme.primary }]}>HOW REWARDS WORK</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="star-circle-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>Rewards are earned through your creator activity on TalkPe Pro.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="file-search-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>Every redemption request is reviewed and verified before it is processed.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="lock-outline" size={16} color="#94A3B8" />
                        <Text style={styles.infoText}>Your payout details and ID are used only for verification and for processing approved redemptions.</Text>
                    </View>
                </Animated.View>

                {/* 🛡️ PAYOUT DETAILS */}
                <Animated.View style={reveal(4)}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitleMain}>PAYOUT DETAILS</Text>
                        <TouchableOpacity onPress={() => setEditBankVisible(true)} style={styles.nodeEditBtn}>
                            <Ionicons name="settings-sharp" size={14} color={theme.primary} />
                            <Text style={[styles.nodeEditText, { color: theme.primary }]}>MANAGE</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 🔥 DYNAMIC DUAL-TONE PAYOUT CARD (TYPE 1) */}
                    <ScaleBtn style={[styles.bankDetailCard, borderType1]} onPress={() => setEditBankVisible(true)}>
                        <Image source={{ uri: BANK_BG }} style={styles.bankBgImage} />
                        <View style={styles.bankInner}>
                            <View style={[styles.bankIconContainer, { backgroundColor: `${theme.primary}22` }]}>
                                <Ionicons name="shield-checkmark" size={22} color={theme.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={styles.bankTitleText}>LINKED PAYOUT ACCOUNT</Text>
                                <Text style={styles.bankValueText}>{bankDetails.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : 'NOT LINKED'}</Text>
                                {!!bankDetails.holderName && (
                                    <Text style={styles.bankHolderText} numberOfLines={1}>{bankDetails.holderName}</Text>
                                )}
                            </View>
                            {isBankVerified ? (
                                <View style={styles.statusBadgeGreen}>
                                    <View style={styles.activeDotWrap}>
                                        <Animated.View style={[styles.activeDotPulse, { opacity: dotPulseOpacity, transform: [{ scale: dotPulseScale }] }]} />
                                        <View style={styles.activeDot} />
                                    </View>
                                    <Text style={styles.badgeLabelText}>VERIFIED</Text>
                                </View>
                            ) : expertData?.bankRejectReason ? (
                                <View style={[styles.statusBadgeYellow, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}><Text style={[styles.badgeLabelText, { color: '#EF4444' }]}>ACTION NEEDED</Text></View>
                            ) : (
                                <View style={styles.statusBadgeYellow}><Text style={styles.badgeLabelText}>IN REVIEW</Text></View>
                            )}
                        </View>
                    </ScaleBtn>

                    {/* 🔥 NEW UI: VERIFICATION FEEDBACK DISPLAY BOX 🔥 */}
                    {!isBankVerified && expertData?.bankRejectReason && (
                        <View style={[styles.rejectReasonBox, { marginBottom: 25 }]}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{marginTop: 2}} />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                                <Text style={styles.rejectLabel}>VERIFICATION FEEDBACK</Text>
                                <Text style={styles.rejectReasonText}>{expertData.bankRejectReason}</Text>
                                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800', marginTop: 5 }}>* Tap MANAGE above to fix and resubmit details.</Text>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* 🧾 REDEMPTION HISTORY */}
                <Animated.View style={reveal(5)}>
                    <Text style={styles.sectionTitleMain}>REDEMPTION HISTORY</Text>
                </Animated.View>
                {transactions.length === 0 ? (
                    <Animated.View style={[styles.emptyLedger, reveal(6)]}>
                        <Ionicons name="gift-outline" size={40} color="#1e293b" />
                        <Text style={styles.emptyLedgerText}>No redemptions yet</Text>
                    </Animated.View>
                ) : (
                    transactions.map((tx, index) => (
                        <LedgerRow
                            key={tx.id}
                            tx={tx}
                            index={index}
                            theme={theme}
                            borderStyle={index % 2 === 0 ? borderType2 : borderType1}
                        />
                    ))
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* 🎁 REDEEM REWARDS PAGE */}
            <FormPage
                visible={modalVisible}
                onClose={closeRedeem}
                theme={theme}
                header={
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}> Redeem Rewards</Text>
                        <TouchableOpacity onPress={closeRedeem} style={styles.modalClose}>
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                }
            >
                <RedeemBody
                    theme={theme}
                    borderType1={borderType1}
                    availableRupees={availableRupees}
                    loading={loading}
                    onSubmit={handleWithdrawal}
                />
            </FormPage>

            {/* 🛡️ PAYOUT DETAILS PAGE */}
            <FormPage
                visible={editBankVisible}
                onClose={closeEdit}
                theme={theme}
                header={
                    <View style={styles.editHero}>
                        <ShieldOrb c1={theme.primary} c2={theme.secondary} />
                        <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.modalTitle}>Payout Details</Text>
                            <Text style={styles.editSubtitle}>Secure verification for approved reward redemptions</Text>
                        </View>
                        <TouchableOpacity onPress={closeEdit} style={styles.modalClose}>
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                }
            >
                <PayoutFormBody
                    initial={bankDetails}
                    idProofImage={idProofImage}
                    loading={loading}
                    theme={theme}
                    borderType1={borderType1}
                    borderType2={borderType2}
                    onPickId={pickIdProof}
                    onCancel={closeEdit}
                    onSubmit={saveBankDetails}
                />
            </FormPage>
        </View>
    );
}

// ✨ INPUT NODE (icon + focus glow + auto-scroll into view)
// 🔧 Android-la focus-la elevation/shadow remove (adhu layout-a maathi jump aakkum). iOS-la glow apadiye irukku.
const InputNode = ({ label, value, onChange, keyboard = "default", autoCap = "none", borderStyle, icon, accent }: any) => {
    const [focused, setFocused] = useState(false);
    const scrollTo = useContext(ScrollCtx);
    const yRef = useRef(0);
    return (
        <View style={styles.inputNodeBox} onLayout={(e) => { yRef.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.nodeLabel}>{label}</Text>
            <View
                style={[
                    styles.nodeInputWrap,
                    borderStyle,
                    focused && {
                        borderLeftColor: accent,
                        borderRightColor: accent,
                        borderTopColor: accent,
                        borderBottomColor: accent,
                        ...(Platform.OS === 'ios' ? {
                            shadowColor: accent,
                            shadowOpacity: 0.55,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 0 }
                        } : {})
                    }
                ]}
            >
                <Ionicons name={icon} size={18} color={focused ? accent : '#475569'} style={{ marginRight: 12 }} />
                <TextInput 
                    style={styles.nodeInput} 
                    value={value} 
                    onChangeText={(t: string) => onChange(t)} 
                    keyboardType={keyboard} 
                    autoCapitalize={autoCap} 
                    autoCorrect={false}
                    placeholderTextColor="#334155"
                    onFocus={() => { setFocused(true); scrollTo(yRef.current); }}
                    onBlur={() => setFocused(false)}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: { flex: 1 },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    topBgImage: { position: 'absolute', top: 0, left: 0, right: 0, height: 280, width: '100%', opacity: 0.35, resizeMode: 'cover' },
    topBgFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
    container: { padding: 20 },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, marginTop: 6 },
    headerEyebrow: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
    headerTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 0.5, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    levelPillText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    heroSection: { marginBottom: 22 },
    premiumCard: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 32, padding: 22, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#0F172A', shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
    cardBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.45 },
    cardGlow: { position: 'absolute', top: -100, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.1)' },
    cardRingOne: { position: 'absolute', right: -60, bottom: -70, width: 210, height: 210, borderRadius: 105, borderWidth: 1.5 },
    cardRingTwo: { position: 'absolute', right: -20, bottom: -30, width: 130, height: 130, borderRadius: 65, borderWidth: 1.5 },
    cardSweep: { position: 'absolute', top: -30, bottom: -30, width: 70, backgroundColor: 'rgba(255,255,255,0.16)' },
    glareStrip: { position: 'absolute', top: -40, bottom: -40, width: 90, backgroundColor: 'rgba(255,255,255,0.12)' },
    cardContentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLabelText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    rupeeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    symbolText: { color: '#FFF', fontSize: 24, fontWeight: '400', marginRight: 5 },
    mainBalanceText: { color: '#FFF', fontSize: 46, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
    chipWrapper: { padding: 5, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    coinWrap: { width: 46, height: 46 },
    coinFace: { position: 'absolute', width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backfaceVisibility: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
    coinGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coinText: { color: '#000', fontWeight: '900', fontSize: 14 },
    cardNumberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardNumberText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800', letterSpacing: 2.5 },
    payoutPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    payoutPillText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    cardHolderText: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, maxWidth: CARD_WIDTH * 0.34 },
    levelRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    levelRowLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    levelRowValue: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    levelTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
    levelFillWrap: { height: '100%', borderRadius: 3, overflow: 'hidden' },
    ACTIVITY_REWARDDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    ACTIVITY_REWARDLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800' },
    ACTIVITY_REWARDValue: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 2 },
    massWithdrawBtn: { borderRadius: 18, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
    whiteActionBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    blackBtnText: { color: '#020617', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

    unlockBox: { marginTop: 18, alignItems: 'center' },
    limitWarning: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    warningText: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    unlockTrack: { width: '100%', height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 12 },
    unlockFillWrap: { height: '100%', borderRadius: 4, overflow: 'hidden' },
    unlockText: { color: '#64748B', fontSize: 9, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },

    rulesRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    ruleTile: { flex: 1, borderRadius: 22, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    ruleValue: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 6 },
    ruleLabel: { color: '#64748B', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 3 },

    // 📘 HOW REWARDS WORK
    infoCard: { borderRadius: 24, padding: 18, marginBottom: 26 },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    infoTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
    infoText: { flex: 1, color: '#94A3B8', fontSize: 11, fontWeight: '600', lineHeight: 16 },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
    sectionTitleMain: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 14 },
    nodeEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    nodeEditText: { fontSize: 9, fontWeight: '900' },
    
    // 🔥 ZERO BOX FLUID SHAPES
    bankDetailCard: { borderRadius: 30, overflow: 'hidden', marginBottom: 30 },
    bankBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.12 },
    bankInner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    bankIconContainer: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    bankTitleText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    bankValueText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 3 },
    bankHolderText: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 3 },
    statusBadgeGreen: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#10B98140' },
    statusBadgeYellow: { backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B40' },
    badgeLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    activeDotWrap: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
    activeDotPulse: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    
    emptyLedger: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(30, 41, 59, 0.2)', borderRadius: 25, marginTop: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#1e293b' },
    emptyLedgerText: { color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 10 },
    
    ledgerItem: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingLeft: 22, borderRadius: 30, overflow: 'hidden' },
    ledgerAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    ledgerIcon: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    ledgerType: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    ledgerDate: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 2 },
    ledgerAmount: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    ledgerStatusChip: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    ledgerStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    // 🔥 REJECTION REASON STYLES
    rejectReasonBox: { flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20, padding: 15, marginHorizontal: 10 },
    rejectLabel: { color: '#EF4444', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
    rejectReasonText: { color: '#FFF', fontSize: 11, fontWeight: '700', lineHeight: 16 },
    
    // 📄 FULL-SCREEN FORM PAGE
    pageRoot: { flex: 1, backgroundColor: '#020617' },
    modalBg: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, borderTopWidth: 1.5, overflow: 'hidden', flexShrink: 1 },
    sheetGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
    modalDragger: { width: 50, height: 5, backgroundColor: '#334155', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    inputArea: { marginBottom: 30 },
    currencyLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 15 },
    giantInput: { color: '#FFF', fontSize: 60, fontWeight: '900', textAlign: 'center', paddingVertical: 10 },
    quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 },
    quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(30,41,59,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    quickChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
    feeInfoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 15, paddingVertical: 12, borderRadius: 20 },
    feeText: { color: '#475569', fontSize: 10, fontWeight: '800' },
    feeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155' },
    availableHint: { color: '#64748B', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 12, letterSpacing: 0.5 },
    reviewNote: { color: '#64748B', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 10, lineHeight: 15 },
    finalSubmitBtn: { borderRadius: 25, overflow: 'hidden' },
    finalSubmitGrad: { paddingVertical: 20, alignItems: 'center' },
    finalSubmitText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    inputNodeBox: { marginBottom: 20 },
    nodeLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    nodeInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 18 },
    nodeInput: { flex: 1, paddingVertical: 18, color: '#FFF', fontSize: 15, fontWeight: '700' },
    uploadNode: { height: 100, borderRadius: 25, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    uploadHint: { color: '#475569', fontSize: 11, fontWeight: '800', marginTop: 8 },
    uploadSuccess: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    uploadSuccessText: { color: '#10B981', fontSize: 12, fontWeight: '900' },
    privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 18 },
    privacyNoteText: { flex: 1, color: '#64748B', fontSize: 10, fontWeight: '600', lineHeight: 15 },
    modalActionRow: { flexDirection: 'row', gap: 12, marginTop: 25 },
    cancelNode: { flex: 1, paddingVertical: 18, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 20 },
    cancelNodeText: { color: '#94A3B8', fontWeight: '900', fontSize: 13 },
    saveNode: { flex: 2, borderRadius: 20, overflow: 'hidden' },
    saveNodeGrad: { paddingVertical: 18, alignItems: 'center' },
    saveNodeText: { color: '#FFF', fontWeight: '900', fontSize: 13 },

    // ✨ PAYOUT PAGE: 3D SHIELD HERO + TRUST CHIPS
    editHero: { flexDirection: 'row', alignItems: 'center' },
    editSubtitle: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 3, lineHeight: 14 },
    orbWrap: { width: 84, height: 84, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    orbRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1.5 },
    orbCore: { width: 58, height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
    trustRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
    trustChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(30,41,59,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    trustChipText: { color: '#94A3B8', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }
});
