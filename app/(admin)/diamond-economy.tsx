import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// 🔥 Adjust this path if you place the file in a deeper folder (e.g. '../../../firebaseConfig')
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

// 🔥 Calls store their diamonds in BOTH "calls" and "transactions" (video_call). Pick ONE to avoid double counting.
const CALL_DIAMOND_SOURCE: 'calls' | 'transactions' = 'calls';

// 🆕 Diamond purchases (Google Play in-app purchase) are NOT live yet → keep this null.
// The day purchases go live, set it to that date (e.g. '2026-12-01').
// From that date onward ONLY new data is counted (purchases + spending), so test / complimentary diamonds before launch never pollute the real numbers.
const PAID_START_DATE: string | null = null;
const PRE_LAUNCH = !PAID_START_DATE;
const START_DATE: Date | null = PAID_START_DATE ? new Date(`${PAID_START_DATE}T00:00:00+05:30`) : null;

const SUCCESS_STATUSES = ["SUCCESS", "success", "COMPLETED", "completed", "PAID", "paid"];
const LIVE_STATUSES = ['ongoing', 'active', 'connecting', 'connected'];
const CALL_TYPES = ['VIDEO_CALL', 'AUDIO_CALL', 'VOICE_CALL', 'CALL'];

const toDateSafe = (t: any): Date | null => {
    if (!t) return null;
    try {
        const d = t.toDate ? t.toDate() : new Date(t);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) {
        return null;
    }
};

// 🆕 Pre-launch: everything is in scope. After PAID_START_DATE: only docs on/after that date.
const inScope = (t: any): boolean => {
    if (!START_DATE) return true;
    const d = toDateSafe(t);
    return !!d && d >= START_DATE;
};

const pctOf = (v: number, total: number) => (total > 0 ? Math.max(0, Math.min(100, (v / total) * 100)) : 0);

/* ───────────────────────── ANIMATION BUILDING BLOCKS ───────────────────────── */

// Staggered entrance (fade + rise + flip-up)
const Reveal = ({ index = 0, children, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, { toValue: 1, duration: 520, delay: Math.min(index, 9) * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
    const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] });
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
            {children}
        </Animated.View>
    );
};

// 🆕 Touch-aware 3D tilt: the card leans toward the exact point you press
const Press3D = ({ children, style }: any) => {
    const rx = useRef(new Animated.Value(0)).current;
    const ry = useRef(new Animated.Value(0)).current;
    const sc = useRef(new Animated.Value(0)).current;
    const size = useRef({ w: 1, h: 1 });
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));

    const pressIn = (e: any) => {
        const { locationX = 0, locationY = 0 } = e?.nativeEvent || {};
        Animated.parallel([
            Animated.spring(rx, { toValue: clamp((locationY / size.current.h - 0.5) * 2), useNativeDriver: true, speed: 30, bounciness: 6 }),
            Animated.spring(ry, { toValue: clamp((locationX / size.current.w - 0.5) * 2), useNativeDriver: true, speed: 30, bounciness: 6 }),
            Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }),
        ]).start();
    };
    const pressOut = () => {
        Animated.parallel([
            Animated.spring(rx, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }),
            Animated.spring(ry, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }),
            Animated.spring(sc, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }),
        ]).start();
    };
    const rotateX = rx.interpolate({ inputRange: [-1, 1], outputRange: ['9deg', '-9deg'] });
    const rotateY = ry.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] });
    const scale = sc.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
    return (
        <TouchableOpacity
            activeOpacity={1}
            onPressIn={pressIn}
            onPressOut={pressOut}
            onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width || 1, h: e.nativeEvent.layout.height || 1 }; }}
        >
            <Animated.View pointerEvents="none" style={[style, { transform: [{ perspective: 800 }, { rotateX }, { rotateY }, { scale }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

// Count-up (en-IN). prefix is used for ₹ / minus sign.
const CountUp = ({ value, style, prefix = '', suffix = '' }: { value: number; style?: any; prefix?: string; suffix?: string }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
        Animated.timing(anim, { toValue: value, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setDisplay(Math.round(value));
        });
        return () => anim.removeListener(id);
    }, [value]);
    return <Text style={style}>{prefix}{display.toLocaleString('en-IN')}{suffix}</Text>;
};

const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const ringScale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] });
    const ringOpacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// 🆕 Spinning 3D diamond: ghost layers give depth, a tilted orbit ring carries a glowing satellite, a pulse ring breathes behind it
const Gem3D = ({ color = '#38BDF8' }: { color?: string }) => {
    const spin = useRef(new Animated.Value(0)).current;
    const orbit = useRef(new Animated.Value(0)).current;
    const bob = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }));
        const o = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }));
        const b = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        const p = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        s.start(); o.start(); b.start(); p.start();
        return () => { s.stop(); o.stop(); b.stop(); p.stop(); };
    }, []);

    const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
    const orbitRot = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
    const layers = [4, 3, 2, 1, 0];

    return (
        <View style={styles.gemWrap}>
            <Animated.View style={{ position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, borderColor: color, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }} />
            <View style={[styles.gemGlow, { backgroundColor: color }]} />
            <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ perspective: 800 }, { rotateX: '68deg' }, { rotateZ: orbitRot }] }]}>
                <View style={[styles.gemRing, { borderColor: `${color}66` }]}>
                    <View style={[styles.gemRingDot, { backgroundColor: color, shadowColor: color }]} />
                </View>
            </Animated.View>
            <Animated.View style={{ transform: [{ translateY: bobY }] }}>
                {layers.map(i => {
                    const rot = spin.interpolate({ inputRange: [0, 1], outputRange: [`${i * 7}deg`, `${360 + i * 7}deg`] });
                    return (
                        <Animated.View
                            key={i}
                            style={{ position: i === 0 ? 'relative' : 'absolute', opacity: i === 0 ? 1 : 0.28 - i * 0.05, transform: [{ perspective: 600 }, { rotateY: rot }] }}
                        >
                            <MaterialCommunityIcons name="diamond-stone" size={54} color={color} />
                        </Animated.View>
                    );
                })}
            </Animated.View>
        </View>
    );
};

// 🆕 Twinkling star particle
const Sparkle = ({ top, left, delay = 0, size = 4, color = '#7DD3FC' }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        l.start();
        return () => l.stop();
    }, []);
    const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] });
    return (
        <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', top, left, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: v, transform: [{ scale }], shadowColor: color, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }}
        />
    );
};

const BackgroundOrbs = () => {
    const a = useRef(new Animated.Value(0)).current;
    const b = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const la = Animated.loop(
            Animated.sequence([
                Animated.timing(a, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        const lb = Animated.loop(
            Animated.sequence([
                Animated.timing(b, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(b, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        la.start(); lb.start();
        return () => { la.stop(); lb.stop(); };
    }, []);
    const aY = a.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
    const aX = a.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
    const bY = b.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
    const bX = b.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#38BDF8', opacity: 0.1, transform: [{ translateY: aY }, { translateX: aX }] }]} />
            <Animated.View style={[styles.orb, { bottom: 100, left: -120, width: 320, height: 320, backgroundColor: '#A855F7', opacity: 0.12, transform: [{ translateY: bY }, { translateX: bX }] }]} />
            <Animated.View style={[styles.orb, { top: 340, right: -140, width: 260, height: 260, backgroundColor: '#10B981', opacity: 0.06, transform: [{ translateY: bY }] }]} />
        </View>
    );
};

const SectionHeader = ({ title, color = '#38BDF8', right }: any) => (
    <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionAccent, { backgroundColor: color, shadowColor: color }]} />
        <Text style={styles.sectionTitleInline}>{title}</Text>
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
);

const GaugeBar = ({ pct, color }: { pct: number; color: string }) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: pct, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return (
        <View style={styles.gaugeTrack}>
            <Animated.View style={[styles.gaugeFill, { width: w as any, backgroundColor: color, shadowColor: color }]} />
            {[25, 50, 75].map(t => <View key={t} style={[styles.gaugeTick, { left: `${t}%` }]} />)}
        </View>
    );
};

// 🆕 One animated share segment of the spend-mix bar
const MixSegment = ({ pct, color, index }: { pct: number; color: string; index: number }) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: pct, duration: 1000, delay: index * 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return <Animated.View style={{ width: w as any, height: '100%', backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }} />;
};

// 🆕 Glass stat card (purchases / spending headline numbers)
const StatCard = ({ icon, label, value, prefix = '💎 ', sub, color, tint }: any) => (
    <Press3D style={[styles.card, { backgroundColor: tint, borderColor: `${color}40`, borderTopColor: `${color}99`, borderBottomColor: color, shadowColor: color }]}>
        <View style={[styles.cardGlow, { backgroundColor: color }]} />
        <View style={[styles.cardIcon, { backgroundColor: `${color}26`, borderColor: `${color}77` }]}>
            <MaterialCommunityIcons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
        <CountUp value={value} prefix={prefix} style={styles.cardValue} />
        <Text style={styles.cardSub}>{sub}</Text>
    </Press3D>
);

// 🆕 Category card (call talk-time / private gifts / broadcast gifts / forum gifts) with animated share bar
const CategoryCard = ({ icon, label, value, share, color, index, caption }: any) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: share, duration: 900, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [share]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return (
        <Press3D style={[styles.card, { backgroundColor: '#0A1122', borderColor: `${color}33`, borderTopColor: `${color}88`, borderBottomColor: color, shadowColor: color }]}>
            <View style={[styles.cardGlow, { backgroundColor: color }]} />
            <View style={[styles.cardIcon, { backgroundColor: `${color}26`, borderColor: `${color}77` }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.cardLabel}>{label}</Text>
            <CountUp value={value} prefix="💎 " style={styles.cardValue} />
            <View style={styles.catTrack}>
                <Animated.View style={[styles.catFill, { width: w as any, backgroundColor: color, shadowColor: color }]} />
            </View>
            <Text style={styles.cardSub}>{share.toFixed(0)}% {caption}</Text>
        </Press3D>
    );
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

const DiamondEconomy = () => {
    const router = useRouter();
    const scrollY = useRef(new Animated.Value(0)).current;

    // transactions: purchases + private call gifts + (optional) call transactions
    const [tx, setTx] = useState({
        rechargeRs: 0, rechargeRsToday: 0,
        rechargeDia: 0, rechargeDiaToday: 0,
        privGift: 0, privGiftToday: 0,
        callTx: 0, callTxToday: 0,
    });
    // calls collection
    const [calls, setCalls] = useState({ total: 0, today: 0 });
    // gifts collection group (broadcast + forum)
    const [gifts, setGifts] = useState({ live: 0, liveToday: 0, forum: 0, forumToday: 0 });

    const [loaded, setLoaded] = useState({ tx: false, calls: false, gifts: false });
    const [giftsError, setGiftsError] = useState(false);

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = (t: any) => {
            const d = toDateSafe(t);
            return !!d && d >= today;
        };

        // 1️⃣ TRANSACTIONS → purchases (₹ + diamonds), private call gifts, call transactions
        const qTx = query(collection(db, "transactions"), where("status", "in", SUCCESS_STATUSES));
        const unsubTx = onSnapshot(qTx, (snap) => {
            const r = { rechargeRs: 0, rechargeRsToday: 0, rechargeDia: 0, rechargeDiaToday: 0, privGift: 0, privGiftToday: 0, callTx: 0, callTxToday: 0 };
            snap.docs.forEach(d => {
                const data: any = d.data();
                const type = String(data.type || '').toUpperCase();
                const t = data.createdAt || data.timestamp || data.date;
                // 🆕 after launch date only count new data
                if (!inScope(t)) return;
                const todayFlag = isToday(t);

                if (!data.type || type === 'RECHARGE') {
                    // 🆕 purchases are not live yet → never count them before PAID_START_DATE is set
                    if (PRE_LAUNCH) return;
                    const rs = Number(data.amount || data.rechargeAmount || data.totalAmount || data.price || 0);
                    const dia = Number(data.diamonds || data.diamondsAdded || data.coins || data.totalDiamonds || 0);
                    r.rechargeRs += rs;
                    r.rechargeDia += dia;
                    if (todayFlag) { r.rechargeRsToday += rs; r.rechargeDiaToday += dia; }
                } else if (type === 'GIFT') {
                    // only private-call gifts here; live/forum gifts are counted from their own subcollections
                    if (!data.source || String(data.source).toLowerCase() === 'call') {
                        const dia = Number(data.diamonds || data.amount || 0);
                        r.privGift += dia;
                        if (todayFlag) r.privGiftToday += dia;
                    }
                } else if (CALL_TYPES.includes(type)) {
                    const dia = Number(data.diamonds || data.amount || 0);
                    r.callTx += dia;
                    if (todayFlag) r.callTxToday += dia;
                }
            });
            setTx(r);
            setLoaded(p => ({ ...p, tx: true }));
        }, (err) => {
            console.log("Diamond Economy tx error:", err);
            setLoaded(p => ({ ...p, tx: true }));
        });

        // 2️⃣ CALLS → talk-time diamonds (live calls not counted, same rule as Call Logs)
        const unsubCalls = onSnapshot(collection(db, "calls"), (snap) => {
            let total = 0, todaySum = 0;
            snap.docs.forEach(d => {
                const data: any = d.data();
                if (LIVE_STATUSES.includes(String(data.status || '').toLowerCase())) return;
                const ct = data.createdAt || data.timestamp || data.connectedAt || data.endedAt;
                // 🆕 after launch date only count new data
                if (!inScope(ct)) return;
                const dia = Number(data.totalDiamonds || data.diamonds || data.amount || data.coins || data.cost || data.spentDiamonds || 0);
                total += dia;
                if (isToday(ct)) todaySum += dia;
            });
            setCalls({ total, today: todaySum });
            setLoaded(p => ({ ...p, calls: true }));
        }, (err) => {
            console.log("Diamond Economy calls error:", err);
            setLoaded(p => ({ ...p, calls: true }));
        });

        // 3️⃣ GIFTS (collection group) → lives/*/gifts = broadcast (amount), forum_rooms/*/gifts = forum (price)
        const unsubGifts = onSnapshot(collectionGroup(db, "gifts"), (snap) => {
            const g = { live: 0, liveToday: 0, forum: 0, forumToday: 0 };
            snap.docs.forEach(d => {
                const path = d.ref.path;
                const data: any = d.data();
                const gt = data.timestamp || data.createdAt;
                // 🆕 after launch date only count new data
                if (!inScope(gt)) return;
                const todayFlag = isToday(gt);
                if (path.startsWith('lives/')) {
                    const dia = Number(data.amount || data.price || 0);
                    g.live += dia;
                    if (todayFlag) g.liveToday += dia;
                } else if (path.startsWith('forum_rooms/')) {
                    const dia = Number(data.price || data.amount || 0);
                    g.forum += dia;
                    if (todayFlag) g.forumToday += dia;
                }
            });
            setGifts(g);
            setGiftsError(false);
            setLoaded(p => ({ ...p, gifts: true }));
        }, (err) => {
            console.log("Diamond Economy gifts error:", err);
            setGiftsError(true);
            setLoaded(p => ({ ...p, gifts: true }));
        });

        return () => {
            unsubTx();
            unsubCalls();
            unsubGifts();
        };
    }, []);

    /* ---------- derived numbers ---------- */
    const synced = loaded.tx && loaded.calls && loaded.gifts;

    const callDia = CALL_DIAMOND_SOURCE === 'calls' ? calls.total : tx.callTx;
    const callDiaToday = CALL_DIAMOND_SOURCE === 'calls' ? calls.today : tx.callTxToday;

    const totalUsed = callDia + tx.privGift + gifts.live + gifts.forum;
    const totalUsedToday = callDiaToday + tx.privGiftToday + gifts.liveToday + gifts.forumToday;
    const totalGifts = tx.privGift + gifts.live + gifts.forum;

    const hasPurchases = tx.rechargeDia > 0;
    const netDiamonds = tx.rechargeDia - totalUsed;
    const usagePct = tx.rechargeDia > 0 ? Math.max(0, Math.min(100, (totalUsed / tx.rechargeDia) * 100)) : 0;
    const avgRsPerDia = tx.rechargeDia > 0 ? tx.rechargeRs / tx.rechargeDia : 0;
    const consumedValueRs = avgRsPerDia > 0 ? totalUsed * avgRsPerDia : 0;
    const usageColor = !hasPurchases ? '#64748B' : usagePct >= 80 ? '#F43F5E' : usagePct >= 50 ? '#F59E0B' : '#10B981';

    const usageRows = [
        { icon: 'phone-in-talk', label: 'CALL TALK-TIME', short: 'CALLS', total: callDia, today: callDiaToday, color: '#6366F1' },
        { icon: 'gift', label: 'PRIVATE CALL GIFTS', short: 'PRIVATE', total: tx.privGift, today: tx.privGiftToday, color: '#F43F5E' },
        { icon: 'broadcast', label: 'BROADCAST GIFTS', short: 'BROADCAST', total: gifts.live, today: gifts.liveToday, color: '#F59E0B' },
        { icon: 'forum', label: 'FORUM GIFTS', short: 'FORUM', total: gifts.forum, today: gifts.forumToday, color: '#A855F7' },
    ];

    // hero parallax: pull-down stretches the card, scroll-up lifts it slightly
    const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.15, 1], extrapolateRight: 'clamp' });
    const heroShift = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -30], extrapolate: 'clamp' });

    const chipColor = !synced ? '#F59E0B' : giftsError ? '#F59E0B' : '#10B981';
    const chipText = !synced ? 'SYNCING' : giftsError ? 'PARTIAL' : 'LIVE';

    return (
        <View style={styles.container}>
            <BackgroundOrbs />
            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            >

                {/* HEADER */}
                <Reveal index={0}>
                    <View style={styles.pageHeader}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="chevron-back" size={24} color="#38BDF8" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.pageTitle}>DIAMOND ECONOMY</Text>
                            <Text style={styles.pageSub}>Diamond purchases vs spending across the app</Text>
                        </View>
                        <View style={[styles.liveChip, { backgroundColor: `${chipColor}1A`, borderColor: `${chipColor}55` }]}>
                            <PulseDot color={chipColor} size={6} />
                            <Text style={[styles.liveChipText, { color: chipColor }]}>{chipText}</Text>
                        </View>
                    </View>
                </Reveal>

                {/* HERO: TOTAL DIAMONDS SPENT */}
                <Reveal index={1}>
                    <Animated.View style={{ transform: [{ scale: heroScale }, { translateY: heroShift }] }}>
                        <View style={styles.mainCard}>
                            <View style={styles.heroOrbA} />
                            <View style={styles.heroOrbB} />
                            <Sparkle top={22} left={width * 0.46} delay={0} />
                            <Sparkle top={64} left={width * 0.58} delay={500} size={3} color="#C4B5FD" />
                            <Sparkle top={110} left={width * 0.5} delay={1000} size={5} />
                            <Sparkle top={34} left={width * 0.7} delay={1500} size={3} color="#F0ABFC" />
                            <View style={styles.heroTop}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>TOTAL DIAMONDS SPENT IN APP</Text>
                                    <CountUp value={totalUsed} prefix="💎 " style={styles.value} />
                                </View>
                                <Gem3D color="#38BDF8" />
                            </View>
                            <View style={styles.heroChips}>
                                <View style={styles.heroChip}>
                                    <MaterialCommunityIcons name="phone-in-talk" size={12} color="#818CF8" />
                                    <Text style={styles.heroChipText}>CALLS 💎 {callDia.toLocaleString('en-IN')}</Text>
                                </View>
                                <View style={styles.heroChip}>
                                    <MaterialCommunityIcons name="gift" size={12} color="#F43F5E" />
                                    <Text style={styles.heroChipText}>GIFTS 💎 {totalGifts.toLocaleString('en-IN')}</Text>
                                </View>
                            </View>
                            <View style={styles.todayBox}>
                                <View style={styles.todayIcon}>
                                    <MaterialCommunityIcons name="trending-up" size={16} color="#38BDF8" />
                                </View>
                                <Text style={styles.todayLabel}>TODAY'S SPENDING:</Text>
                                <CountUp value={totalUsedToday} prefix="+ 💎 " style={styles.todayValue} />
                            </View>
                        </View>
                    </Animated.View>
                </Reveal>

                {/* DIAMONDS PURCHASED (overall + today) */}
                <SectionHeader title="DIAMONDS PURCHASED" color="#10B981" />
                <Reveal index={2}>
                    <View style={styles.row}>
                        <StatCard
                            icon="cash-plus" label="OVERALL PURCHASED" value={tx.rechargeDia} color="#10B981" tint="#06241D"
                            sub={`₹${tx.rechargeRs.toLocaleString('en-IN')} total`}
                        />
                        <StatCard
                            icon="calendar-today" label="TODAY'S PURCHASED" value={tx.rechargeDiaToday} color="#22D3EE" tint="#06222B"
                            sub={`₹${tx.rechargeRsToday.toLocaleString('en-IN')} today`}
                        />
                    </View>
                </Reveal>

                {/* DIAMONDS SPENT (overall + today) */}
                <SectionHeader title="DIAMONDS SPENT" color="#818CF8" />
                <Reveal index={3}>
                    <View style={styles.row}>
                        <StatCard
                            icon="diamond-outline" label="OVERALL SPENT" value={totalUsed} color="#818CF8" tint="#14123A"
                            sub={`Gifts: 💎 ${totalGifts.toLocaleString('en-IN')}`}
                        />
                        <StatCard
                            icon="lightning-bolt" label="TODAY'S SPENT" value={totalUsedToday} color="#F59E0B" tint="#2A1604"
                            sub="Calls + all gifts"
                        />
                    </View>
                </Reveal>

                {/* BALANCE & VALUE */}
                <SectionHeader title="PURCHASED VS SPENT" color="#34D399" />
                <Reveal index={4}>
                    <View style={[styles.corrCard, { shadowColor: usageColor }]}>
                        <View style={styles.corrTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>SPENT OF PURCHASED DIAMONDS</Text>
                                {hasPurchases
                                    ? <CountUp value={Math.round(usagePct)} suffix="%" style={[styles.corrValue, { color: usageColor }]} />
                                    : <Text style={[styles.corrValue, { color: usageColor }]}>—</Text>}
                            </View>
                            <View style={[styles.rateBadge, { backgroundColor: `${usageColor}1F`, borderColor: `${usageColor}55` }]}>
                                <MaterialCommunityIcons name="scale-balance" size={14} color={usageColor} style={{ marginRight: 6 }} />
                                <Text style={[styles.rateBadgeText, { color: usageColor }]}>
                                    {!hasPurchases ? 'AWAITING PURCHASES' : netDiamonds >= 0 ? 'UNUSED STOCK' : 'SPENT > PURCHASED'}
                                </Text>
                            </View>
                        </View>
                        <GaugeBar pct={usagePct} color={usageColor} />

                        <View style={styles.statGrid}>
                            <View style={styles.statCell}>
                                <Text style={styles.statCellLabel}>DIAMONDS LEFT (PURCHASED − SPENT)</Text>
                                {hasPurchases ? (
                                    <CountUp
                                        value={Math.abs(netDiamonds)}
                                        prefix={`${netDiamonds < 0 ? '- ' : ''}💎 `}
                                        style={[styles.statCellValue, { color: netDiamonds >= 0 ? '#10B981' : '#F43F5E' }]}
                                    />
                                ) : (
                                    <Text style={[styles.statCellValue, { color: '#64748B' }]}>—</Text>
                                )}
                            </View>
                            <View style={styles.statCell}>
                                <Text style={styles.statCellLabel}>AVG VALUE PER DIAMOND</Text>
                                <Text style={[styles.statCellValue, { color: '#38BDF8' }]}>
                                    {avgRsPerDia > 0 ? `₹${avgRsPerDia.toFixed(2)}` : '—'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.consumedBox}>
                            <Text style={styles.statCellLabel}>PURCHASE VALUE SPENT (SPENT 💎 × AVG ₹)</Text>
                            <CountUp value={consumedValueRs} prefix="₹" style={[styles.statCellValue, { color: '#FBBF24', fontSize: 26, marginTop: 6 }]} />
                            <Text style={styles.subText}>Estimate: complimentary / bonus diamonds are also included in spending.</Text>
                        </View>
                    </View>
                </Reveal>

                {/* TODAY'S SPENDING BREAKDOWN */}
                <SectionHeader
                    title="TODAY'S SPENDING"
                    color="#F59E0B"
                    right={<View style={[styles.countPill, { backgroundColor: '#F59E0B22' }]}><Text style={[styles.countPillText, { color: '#F59E0B' }]}>💎 {totalUsedToday.toLocaleString('en-IN')}</Text></View>}
                />
                <Reveal index={5}>
                    <View>
                        <View style={[styles.row, { marginBottom: 12 }]}>
                            {usageRows.slice(0, 2).map((r, i) => (
                                <CategoryCard key={`today-${r.label}`} index={i} icon={r.icon} label={r.label} value={r.today} share={pctOf(r.today, totalUsedToday)} color={r.color} caption="of today" />
                            ))}
                        </View>
                        <View style={styles.row}>
                            {usageRows.slice(2, 4).map((r, i) => (
                                <CategoryCard key={`today-${r.label}`} index={i + 2} icon={r.icon} label={r.label} value={r.today} share={pctOf(r.today, totalUsedToday)} color={r.color} caption="of today" />
                            ))}
                        </View>
                    </View>
                </Reveal>

                {/* OVERALL SPENDING BREAKDOWN */}
                <SectionHeader
                    title="OVERALL SPENDING"
                    color="#818CF8"
                    right={<View style={styles.countPill}><Text style={[styles.countPillText, { color: '#818CF8' }]}>💎 {totalUsed.toLocaleString('en-IN')}</Text></View>}
                />
                <Reveal index={6}>
                    <View>
                        {/* 🆕 spend mix bar */}
                        <View style={styles.mixCard}>
                            <Text style={styles.statCellLabel}>SPEND MIX</Text>
                            <View style={styles.mixTrack}>
                                {usageRows.map((r, i) => (
                                    <MixSegment key={`mix-${r.label}`} index={i} pct={pctOf(r.total, totalUsed)} color={r.color} />
                                ))}
                            </View>
                            <View style={styles.mixLegend}>
                                {usageRows.map(r => (
                                    <View key={`leg-${r.label}`} style={styles.mixLegendItem}>
                                        <View style={[styles.flowDot, { backgroundColor: r.color }]} />
                                        <Text style={styles.mixLegendText}>{r.short} {pctOf(r.total, totalUsed).toFixed(0)}%</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        <View style={[styles.row, { marginBottom: 12 }]}>
                            {usageRows.slice(0, 2).map((r, i) => (
                                <CategoryCard key={`all-${r.label}`} index={i} icon={r.icon} label={r.label} value={r.total} share={pctOf(r.total, totalUsed)} color={r.color} caption="of overall" />
                            ))}
                        </View>
                        <View style={styles.row}>
                            {usageRows.slice(2, 4).map((r, i) => (
                                <CategoryCard key={`all-${r.label}`} index={i + 2} icon={r.icon} label={r.label} value={r.total} share={pctOf(r.total, totalUsed)} color={r.color} caption="of overall" />
                            ))}
                        </View>
                    </View>
                </Reveal>

                <View style={{ height: 50 }} />
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#02040F' },
    scrollContent: { padding: 20, paddingTop: 60 },
    orb: { position: 'absolute', borderRadius: 999 },

    pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', borderTopColor: '#38BDF855', shadowColor: '#38BDF8', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    pageTitle: { color: '#fff', fontWeight: '900', fontSize: 20, letterSpacing: 1.5, textShadowColor: '#38BDF8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
    pageSub: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 4 },
    liveChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
    liveChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 14 },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, marginRight: 10, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
    sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    countPill: { minWidth: 26, height: 24, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#818CF822' },
    countPillText: { color: '#38BDF8', fontSize: 11, fontWeight: '900' },

    mainCard: { backgroundColor: '#0A1226', padding: 25, borderRadius: 32, marginVertical: 10, borderWidth: 1, borderBottomWidth: 5, borderColor: '#1E293B', borderTopColor: '#38BDF866', borderBottomColor: '#0C4A6E', overflow: 'hidden', shadowColor: '#38BDF8', shadowOpacity: 0.4, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 16 },
    heroOrbA: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: '#38BDF8', opacity: 0.14 },
    heroOrbB: { position: 'absolute', bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#A855F7', opacity: 0.1 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    heroChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
    heroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FFFFFF0A', borderWidth: 1, borderColor: '#FFFFFF14' },
    heroChipText: { color: '#CBD5E1', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },

    gemWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    gemGlow: { position: 'absolute', width: 70, height: 70, borderRadius: 35, opacity: 0.16 },
    gemRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 1.5 },
    gemRingDot: { position: 'absolute', top: -4, left: 51, width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },

    label: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
    value: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 10, textShadowColor: '#38BDF8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
    todayBox: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', alignItems: 'center' },
    todayIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#38BDF81F', borderWidth: 1, borderColor: '#38BDF855', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    todayLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: 'bold', marginRight: 10 },
    todayValue: { color: '#38BDF8', fontSize: 16, fontWeight: '900' },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { width: (width - 52) / 2, padding: 16, borderRadius: 24, borderWidth: 1, borderBottomWidth: 5, overflow: 'hidden', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    cardGlow: { position: 'absolute', top: -40, right: -40, width: 110, height: 110, borderRadius: 55, opacity: 0.18 },
    cardIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    cardValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 6 },
    cardSub: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 6 },

    catTrack: { height: 4, borderRadius: 2, backgroundColor: '#111B33', overflow: 'hidden', marginTop: 12 },
    catFill: { height: '100%', borderRadius: 2, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },

    corrCard: { backgroundColor: '#0B1224', borderRadius: 30, padding: 22, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', borderTopColor: '#FFFFFF22', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    corrTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    corrValue: { fontSize: 44, fontWeight: '900', marginTop: 6 },
    rateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    rateBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    gaugeTrack: { height: 14, borderRadius: 7, backgroundColor: '#111B33', overflow: 'hidden' },
    gaugeFill: { height: '100%', borderRadius: 7, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    gaugeTick: { position: 'absolute', top: 3, bottom: 3, width: 1, backgroundColor: '#FFFFFF1F' },
    statGrid: { flexDirection: 'row', gap: 12, marginTop: 20 },
    statCell: { flex: 1, backgroundColor: '#020617', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#1E293B' },
    statCellLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    statCellValue: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },
    consumedBox: { marginTop: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E293B' },
    subText: { color: '#64748B', fontSize: 10, marginTop: 6 },

    mixCard: { backgroundColor: '#0B1224', borderRadius: 22, padding: 16, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', borderTopColor: '#FFFFFF1A', marginBottom: 14 },
    mixTrack: { flexDirection: 'row', height: 12, borderRadius: 6, backgroundColor: '#111B33', overflow: 'hidden', marginTop: 12 },
    mixLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
    mixLegendItem: { flexDirection: 'row', alignItems: 'center' },
    mixLegendText: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    flowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
});

export default DiamondEconomy;
