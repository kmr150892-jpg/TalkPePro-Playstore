import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { arrayRemove, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🆕 PREMIUM PALETTE
const PAL = {
    bg0: '#020617',
    bg1: '#0A0620',
    indigo: '#6366F1',
    cyan: '#00F2FE',
    violet: '#8B5CF6',
    pink: '#EC4899',
    ruby: '#F43F5E',
    red: '#EF4444',
    gold: '#F5C84C',
    emerald: '#10B981',
    card: 'rgba(10, 6, 28, 0.94)',
};

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
    lock: 'https://img.icons8.com/3d-fluency/512/lock.png',
    key: 'https://img.icons8.com/3d-fluency/512/key.png',
};

const FILTERS: ('ALL' | 'HIGH RISK' | 'NORMAL')[] = ['ALL', 'HIGH RISK', 'NORMAL'];
const FILTER_ICONS = ['view-grid-outline', 'alert-octagon-outline', 'shield-outline'];

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
                Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
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
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }
                    ]
                }
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
                Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
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
                    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
                ]
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
                shadowOpacity: 0.45,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 9
            },
            style
        ]}
    >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
            <View style={[{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: PAL.card }, innerStyle]}>{children}</View>
        </LinearGradient>
    </View>
);

// 🆕 Radar ripple rings
const Ripple = ({ color, size = 220, count = 3 }: any) => {
    const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
    useEffect(() => {
        const loops = vals.map((v, i) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 800),
                    Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            );
            l.start();
            return l;
        });
        return () => loops.forEach(l => l.stop());
    }, []);
    return (
        <>
            {vals.map((v, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 2,
                        borderColor: color,
                        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }]
                    }}
                />
            ))}
        </>
    );
};

// 🆕 Small stat box (hero)
const StatBox = ({ icon, label, value, color }: any) => (
    <View style={[styles.statBox, { borderColor: color + '55' }]}>
        <LinearGradient colors={[color + '33', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <LinearGradient colors={[color, color + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statIcon}>
            <MaterialCommunityIcons name={icon} size={14} color="#FFF" />
        </LinearGradient>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{label}</Text>
    </View>
);

// 🆕 Blocked user card (staggered entrance + press scale + pulse for high risk)
const BlockedCard = ({ item, index, onUnblock }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;

    // 🔥 SATTI FIX: Admin Flag preview logic maintained
    const isHighRisk = (item.expertBlockCount || 0) >= 5;
    const color = isHighRisk ? PAL.red : PAL.ruby;
    const color2 = isHighRisk ? '#7F1D1D' : '#881337';

    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay: Math.min(index, 8) * 70, friction: 7, tension: 55, useNativeDriver: true }).start();
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: isHighRisk ? 800 : 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: isHighRisk ? 800 : 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        pulseLoop.start();
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(1500 + index * 300),
                Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        sweepLoop.start();
        return () => { pulseLoop.stop(); sweepLoop.stop(); };
    }, []);

    const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, 120] });

    return (
        <Animated.View
            style={{
                marginBottom: 16,
                opacity: anim,
                transform: [
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                    { scale: Animated.multiply(anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }), scale) }
                ]
            }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
            >
                <GlowCard colors={[color, color + '22', lighten(color, 0.25) + '88']} radius={28} glow={color}>
                    <BlurView intensity={10} tint="dark" style={[styles.glassCard, isHighRisk && { borderColor: '#EF4444' }]}>
                        <LinearGradient colors={[color + '2E', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <View style={[styles.cardAccent, { backgroundColor: color }]} />
                        <View style={styles.cardWatermark} pointerEvents="none">
                            <MaterialCommunityIcons name={isHighRisk ? 'alert-octagon' : 'lock'} size={110} color={color + '12'} />
                        </View>
                        <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </Animated.View>

                        <View style={styles.cardMain}>
                            <View>
                                <Animated.View
                                    pointerEvents="none"
                                    style={[
                                        styles.avatarPulse,
                                        {
                                            backgroundColor: color,
                                            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, isHighRisk ? 0.5 : 0.3] }),
                                            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }]
                                        }
                                    ]}
                                />
                                <LinearGradient
                                    colors={isHighRisk ? ['#EF4444', '#7F1D1D'] : ['#F43F5E', '#881337']}
                                    style={styles.avatarGlow}
                                >
                                    <Image
                                        source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${item.name || 'User'}&background=0F172A&color=fff` }}
                                        style={styles.userImg}
                                    />
                                </LinearGradient>
                                <View style={[styles.avatarBadge, { backgroundColor: color }]}>
                                    <MaterialCommunityIcons name="lock" size={11} color="#0B1026" />
                                </View>
                            </View>

                            <View style={styles.infoArea}>
                                <Text style={[styles.userNameText, isHighRisk && { color: '#EF4444' }]} numberOfLines={1}>
                                    {item.name || "UNIDENTIFIED"}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color + '66' }]}>
                                    <Animated.View
                                        style={[
                                            styles.offlineDot,
                                            isHighRisk && { backgroundColor: '#EF4444' },
                                            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }
                                        ]}
                                    />
                                    <Text style={[styles.statusLabel, isHighRisk && { color: '#EF4444' }]} numberOfLines={1}>
                                        {isHighRisk ? 'HIGH RISK TARGET' : 'UPLINK SEVERED'}
                                    </Text>
                                </View>
                                {(item.expertBlockCount || 0) > 0 && (
                                    <View style={styles.reportRow}>
                                        <MaterialCommunityIcons name="flag-variant" size={11} color={lighten(color, 0.4)} />
                                        <Text style={[styles.reportText, { color: lighten(color, 0.4) }]}>{item.expertBlockCount} BLOCK REPORTS</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={styles.unblockActionBtn}
                                onPress={onUnblock}
                            >
                                <LinearGradient
                                    colors={['#6366F1', '#4F46E5']}
                                    style={styles.unblockGrad}
                                >
                                    <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.unblockGloss} pointerEvents="none" />
                                    <MaterialCommunityIcons name="lock-open-variant" size={20} color="#FFF" />
                                    <Text style={styles.unblockLabel}>UNBLOCK</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </GlowCard>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function BlockedUsersScreen() {
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // 🆕 filter + hero count
    const [filter, setFilter] = useState<'ALL' | 'HIGH RISK' | 'NORMAL'>('ALL');
    const [filterW, setFilterW] = useState(0);
    const [heroCount, setHeroCount] = useState(0);

    // 🆕 PREMIUM ANIMATION VALUES
    const orbAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const sweepAnim = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;
    const countAnim = useRef(new Animated.Value(0)).current;
    const filterSlide = useRef(new Animated.Value(0)).current;
    const headerAnim = useRef(new Animated.Value(0)).current;
    const particles = useRef(
        Array.from({ length: 14 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 160 + ((i * 59) % 520),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    // 🆕 Ambient animations (orbs, header icon spin, hero shine, glow pulse, particles, header entrance)
    useEffect(() => {
        const orbLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(orbAnim, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(orbAnim, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        orbLoop.start();
        const spinLoop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
        spinLoop.start();
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        sweepLoop.start();
        const glowLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        glowLoop.start();

        particles.forEach((p) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ).start();
        });

        Animated.spring(headerAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();

        return () => {
            orbLoop.stop(); spinLoop.stop(); sweepLoop.stop(); glowLoop.stop();
        };
    }, []);

    // 🆕 Hero count-up
    useEffect(() => {
        const target = blockedUsers.length;
        const id = countAnim.addListener(({ value }) => setHeroCount(Math.floor(target * value)));
        countAnim.setValue(0);
        Animated.timing(countAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setHeroCount(target);
        });
        return () => countAnim.removeListener(id);
    }, [blockedUsers.length]);

    // 🆕 Filter pill slide
    useEffect(() => {
        Animated.spring(filterSlide, { toValue: FILTERS.indexOf(filter), useNativeDriver: true, friction: 8, tension: 70 }).start();
    }, [filter]);

    const fetchBlockedUsers = async () => {
        try {
            if (!auth.currentUser) return;
            const expertSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            const blockedIds = expertSnap.data()?.blockedUsers || [];

            const userDetails = await Promise.all(
                blockedIds.map(async (id: string) => {
                    const uSnap = await getDoc(doc(db, "users", id));
                    return { id, ...uSnap.data() };
                })
            );
            setBlockedUsers(userDetails);
        } catch (e) {
            console.log("Error fetching blocked users:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (userId: string, userName: string) => {
        Alert.alert(
            "RESTORE ACCESS",
            `Do you want to unblock ${userName}?`, // 🔥 SATTI FIX: Clear English for Play Store
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "RESTORE", 
                    style: "default", 
                    onPress: async () => {
                        try {
                            const expertRef = doc(db, "users", auth.currentUser!.uid);
                            await updateDoc(expertRef, {
                                blockedUsers: arrayRemove(userId)
                            });
                            
                            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
                            Alert.alert("SUCCESS", "User link restored!");
                        } catch (e) {
                            Alert.alert("ERROR", "Uplink failed.");
                        }
                    } 
                }
            ]
        );
    };

    // 🆕 derived values
    const totalBlocked = blockedUsers.length;
    const highRiskCount = blockedUsers.filter((u: any) => (u.expertBlockCount || 0) >= 5).length;
    const normalCount = totalBlocked - highRiskCount;
    const listData = blockedUsers.filter((u: any) => {
        const hr = (u.expertBlockCount || 0) >= 5;
        return filter === 'ALL' ? true : filter === 'HIGH RISK' ? hr : !hr;
    });

    const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const heroGlow = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
    const filterSegW = filterW > 0 ? (filterW - 10) / 3 : 0;

    if (loading) return (
        <View style={styles.darkLoader}>
            <View style={styles.loaderBox}>
                <Ripple color={PAL.indigo} size={90} count={2} />
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
            <Text style={styles.loaderText}>DECRYPTING DATABASE...</Text>
        </View>
    );

    // 🆕 list header (hero + filters)
    const listHeader = (
        <View>
            {/* 🏆 HERO SUMMARY */}
            <GlowCard colors={[PAL.ruby, PAL.violet, PAL.indigo]} radius={34} glow={PAL.ruby} style={{ marginBottom: 20 }}>
                <View style={styles.heroInner}>
                    <LinearGradient colors={[PAL.ruby + '30', 'transparent', PAL.indigo + '2A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <Sparkle x={width * 0.5} y={14} size={12} color={PAL.pink} delay={0} />
                    <Sparkle x={width * 0.72} y={80} size={10} color={PAL.indigo} delay={600} />
                    <Sparkle x={20} y={96} size={9} color={PAL.gold} delay={1100} />
                    <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>

                    <View style={styles.heroRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={styles.heroLiveChip}>
                                <Animated.View style={[styles.heroLiveDot, { opacity: heroGlow }]} />
                                <Text style={styles.heroLiveText}>SECURITY SHIELD ACTIVE</Text>
                            </View>
                            <Text style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{heroCount}</Text>
                            <Text style={styles.heroSub}>RESTRICTED NODES</Text>
                        </View>
                        <View style={styles.heroImgBox}>
                            <Animated.View style={[styles.heroImgGlow, { opacity: heroGlow }]} />
                            <FloatBox amp={7} dur={1700}>
                                <Img3D uri={IMG.shield} size={92} fallback="shield-lock" color={PAL.ruby} />
                            </FloatBox>
                        </View>
                    </View>

                    <View style={styles.statRow}>
                        <StatBox icon="lock-outline" label="BLOCKED" value={totalBlocked} color={PAL.indigo} />
                        <StatBox icon="alert-octagon-outline" label="HIGH RISK" value={highRiskCount} color={PAL.red} />
                        <StatBox icon="shield-check-outline" label="NORMAL" value={normalCount} color={PAL.emerald} />
                    </View>
                </View>
            </GlowCard>

            {/* 🎚 FILTER TABS */}
            <View style={styles.filterRow} onLayout={(e) => setFilterW(e.nativeEvent.layout.width)}>
                {filterSegW > 0 && (
                    <Animated.View
                        style={[
                            styles.filterPill,
                            { width: filterSegW, transform: [{ translateX: filterSlide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, filterSegW, filterSegW * 2] }) }] }
                        ]}
                    >
                        <LinearGradient colors={[PAL.indigo + '88', PAL.ruby + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} style={styles.filterGloss} pointerEvents="none" />
                    </Animated.View>
                )}
                {FILTERS.map((f, idx) => {
                    const active = filter === f;
                    return (
                        <TouchableOpacity key={f} style={styles.filterBtn} onPress={() => setFilter(f)} activeOpacity={0.8}>
                            <MaterialCommunityIcons name={FILTER_ICONS[idx] as any} size={15} color={active ? '#FFF' : '#94A3B8'} />
                            <Text style={[styles.filterText, active && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{f}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#020617', '#0B0A24', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🆕 aurora orbs */}
            <Animated.View style={[styles.orb, { top: 80, right: -70, backgroundColor: PAL.ruby, transform: [{ translateY: orbY }] }]} />
            <Animated.View style={[styles.orb, { top: 420, left: -100, backgroundColor: PAL.indigo, transform: [{ translateY: Animated.multiply(orbY, -1) }] }]} />
            <Animated.View style={[styles.orb, { top: 760, right: -90, backgroundColor: PAL.violet, transform: [{ translateY: orbY }] }]} />

            {/* 🆕 floating particles */}
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: p.y,
                        left: p.x,
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: [PAL.ruby, PAL.indigo, PAL.violet, PAL.gold, '#FFFFFF'][i % 5],
                        opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
                        transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                    }}
                />
            ))}

            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <Animated.View
                    style={[
                        styles.headerHud,
                        {
                            opacity: headerAnim,
                            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }]
                        }
                    ]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerLabel}>SECURITY PROTOCOL</Text>
                        <Text style={styles.headerTitle}>BLACKLISTED NODES</Text>
                        <View style={styles.headerUnderline}>
                            <LinearGradient colors={[PAL.indigo, PAL.ruby, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        </View>
                    </View>
                    <View style={styles.shieldBtn}>
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <MaterialCommunityIcons name="shield-sync-outline" size={24} color={PAL.indigo} />
                        </Animated.View>
                        {totalBlocked > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{totalBlocked > 99 ? '99+' : totalBlocked}</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </SafeAreaView>

            {blockedUsers.length === 0 ? (
                <View style={styles.center}>
                    <View style={styles.emptyCircle}>
                        <Ripple color={PAL.indigo} size={120} count={2} />
                        <View style={styles.emptyGlow} />
                        <FloatBox amp={8} dur={1700}>
                            <Img3D uri={IMG.shield} size={84} fallback="shield-check-outline" color="#6366F1" />
                        </FloatBox>
                        <Sparkle x={-8} y={16} size={12} color={PAL.indigo} delay={0} />
                        <Sparkle x={112} y={6} size={10} color={PAL.pink} delay={500} />
                        <Sparkle x={106} y={102} size={11} color={PAL.gold} delay={1000} />
                    </View>
                    <Text style={styles.emptyTitle}>ZONE SECURE</Text>
                    <Text style={styles.emptySub}>No restricted nodes detected in your sector.</Text>
                </View>
            ) : (
                <FlatList
                    data={listData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={listHeader}
                    ListEmptyComponent={
                        <View style={styles.filterEmpty}>
                            <FloatBox amp={6} dur={1600}>
                                <Img3D uri={IMG.key} size={64} fallback="shield-search" color="#6366F1" />
                            </FloatBox>
                            <Text style={styles.filterEmptyTitle}>NO NODES IN THIS FILTER</Text>
                            <Text style={styles.filterEmptySub}>Vera filter select panni paaru.</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <BlockedCard
                            item={item}
                            index={index}
                            onUnblock={() => handleUnblock(item.id, item.name)}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    loaderBox: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: '#6366F1', marginTop: 25, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
    orb: { position: 'absolute', width: 340, height: 340, borderRadius: 170, opacity: 0.14 },
    
    // header
    headerSafe: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    headerHud: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerLabel: { color: '#6366F1', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5, textShadowColor: '#6366F180', textShadowRadius: 10 },
    headerUnderline: { width: 120, height: 2, borderRadius: 1, marginTop: 6, overflow: 'hidden' },
    shieldBtn: { padding: 10, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.25)' },
    countBadge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#F43F5E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    countBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

    // hero
    heroInner: { padding: 20 },
    heroSweep: { position: 'absolute', top: -40, bottom: -40, width: 80 },
    heroRow: { flexDirection: 'row', alignItems: 'center' },
    heroLiveChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
    heroLiveText: { color: '#10B981', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6 },
    heroBig: { color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -1, marginTop: 10, textShadowColor: 'rgba(244,63,94,0.5)', textShadowRadius: 10 },
    heroSub: { color: '#FDA4AF', fontSize: 11, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
    heroImgBox: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
    heroImgGlow: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: '#F43F5E' },
    statRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    statBox: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.28)', overflow: 'hidden', alignItems: 'flex-start' },
    statIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { color: '#FFF', fontSize: 20, fontWeight: '900', maxWidth: '100%' },
    statLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2, maxWidth: '100%' },

    // filter tabs
    filterRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22, padding: 5, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', marginBottom: 18 },
    filterPill: { position: 'absolute', top: 5, left: 5, bottom: 5, borderRadius: 17, borderWidth: 1.2, borderColor: '#6366F1', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    filterGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    filterBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    filterText: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, flexShrink: 1 },

    // empty
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(99, 102, 241, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)', position: 'relative' },
    emptyGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366F1', opacity: 0.12 },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
    emptySub: { color: '#94A3B8', textAlign: 'center', fontSize: 13, marginTop: 12, fontWeight: '600', lineHeight: 20 },
    filterEmpty: { alignItems: 'center', marginTop: 30, paddingHorizontal: 30 },
    filterEmptyTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 3, marginTop: 14 },
    filterEmptySub: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },

    // user card
    glassCard: { 
        borderRadius: 25, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.08)', 
        backgroundColor: 'rgba(255,255,255,0.02)' 
    },
    cardAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardWatermark: { position: 'absolute', right: -16, bottom: -24 },
    cardSweep: { position: 'absolute', top: -40, bottom: -40, width: 60 },
    cardMain: { flexDirection: 'row', alignItems: 'center', padding: 15, paddingLeft: 18 },
    avatarPulse: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 26 },
    avatarGlow: { padding: 2, borderRadius: 22 },
    avatarBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#05030F' },
    userImg: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#020617' },
    
    infoArea: { marginLeft: 15, flex: 1, minWidth: 0 },
    userNameText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 6, gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F43F5E' },
    statusLabel: { color: '#F43F5E', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    reportRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
    reportText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },

    unblockActionBtn: { overflow: 'hidden', borderRadius: 15, marginLeft: 8 },
    unblockGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, overflow: 'hidden' },
    unblockGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 14 },
    unblockLabel: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});