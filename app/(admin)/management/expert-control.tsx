import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

interface ExpertData {
    id: string;
    name?: string;
    status?: string;
    isBlocked?: boolean;
    currentLevel?: number;
    beansPerMin?: number; 
    userPrice?: number;
    role?: string;
    uid?: string;
    photoURL?: string;
    expertBlockCount?: number; 
}

/* ───────────────────────── 3D / ANIMATION HELPERS ───────────────────────── */

// Soft glowing orb (concentric circles fake a blur) that slowly floats around
const GlowOrb = ({ size, color, drift = 24, duration = 7000 }: { size: number; color: string; drift?: number; duration?: number }) => {
    const t = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] });
    const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] });
    const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });

    return (
        <Animated.View
            pointerEvents="none"
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateX }, { translateY }, { scale }] }}
        >
            {[1, 0.78, 0.56, 0.36].map((k, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: size * k,
                        height: size * k,
                        borderRadius: (size * k) / 2,
                        backgroundColor: color,
                        opacity: 0.07 + i * 0.03,
                    }}
                />
            ))}
        </Animated.View>
    );
};

// Animated aurora background with parallax on scroll
const AuroraBackground = ({ scrollY }: { scrollY: Animated.Value }) => {
    const shiftA = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -90], extrapolate: 'clamp' });
    const shiftB = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -150], extrapolate: 'clamp' });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={['#04030F', '#0A0B24', '#070B1C']} style={StyleSheet.absoluteFill} />
            <Animated.View style={{ position: 'absolute', top: -120, left: -140, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={440} color="#6366F1" drift={26} duration={7500} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: height * 0.38, right: -190, transform: [{ translateY: shiftB }] }}>
                <GlowOrb size={400} color="#22D3EE" drift={30} duration={9000} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', bottom: -160, left: -60, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={360} color="#A78BFA" drift={20} duration={8200} />
            </Animated.View>
        </View>
    );
};

// Button with a springy press (scale) animation
const PressableScale = ({ children, onPress, style, containerStyle }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

    return (
        <Animated.View style={[{ transform: [{ scale: s }] }, containerStyle]}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                onPressIn={() => to(0.94)}
                onPressOut={() => to(1)}
                style={style}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

// Status dot with a radar-like pulse ring
const PulseDot = ({ color }: { color: string }) => {
    const p = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(p, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
    const opacity = p.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

    return (
        <View style={styles.statusDot}>
            <Animated.View style={[styles.pulseRing, { backgroundColor: color, opacity, transform: [{ scale }] }]} />
            <View style={[styles.dotCore, { backgroundColor: color }]} />
        </View>
    );
};

/* ───────────────────────── EXPERT CARD (3D) ───────────────────────── */

const ExpertCard = ({
    item,
    index,
    blockCount,
    onToggleBlock,
    onManage,
}: {
    item: ExpertData;
    index: number;
    blockCount: number;
    onToggleBlock: (id: string, current: boolean) => void;
    onManage: (id: string) => void;
}) => {
    const isBlocked = item.isBlocked || item.status === 'Blocked';
    const isCriticalRisk = blockCount >= 5;

    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;

    // Entrance: card flips up from the floor in 3D
    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 6) * 110,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
        }).start();
    }, []);

    // Critical risk: pulsing red glow border
    useEffect(() => {
        if (!isCriticalRisk) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isCriticalRisk]);

    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['38deg', '0deg'] });
    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });
    const scaleEnter = enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
    const opacity = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });

    // Press: card tilts back like a physical glass slab
    const tiltX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    const tiltScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.972] });

    const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 8 }).start();

    const borderColors: [string, string, string] = isCriticalRisk
        ? ['#EF4444', '#F97316', '#EF4444']
        : isBlocked
            ? ['#334155', '#1E293B', '#334155']
            : ['#6366F1', '#22D3EE', '#A78BFA'];

    const accent = isCriticalRisk ? '#EF4444' : isBlocked ? '#475569' : '#6366F1';

    return (
        <Animated.View
            style={[
                styles.cardWrap,
                isBlocked && styles.blockedCard,
                {
                    opacity,
                    transform: [
                        { perspective: 900 },
                        { translateY },
                        { rotateX: rotateXEnter },
                        { scale: scaleEnter },
                    ],
                },
            ]}
        >
            {/* stacked depth layers underneath the card (fake 3D thickness) */}
            <View style={[styles.depthLayer, { bottom: -9, left: 26, right: 26, backgroundColor: accent, opacity: 0.18 }]} />
            <View style={[styles.depthLayer, { bottom: -4.5, left: 14, right: 14, backgroundColor: accent, opacity: 0.3 }]} />

            <Pressable onPressIn={() => pressTo(1)} onPressOut={() => pressTo(0)}>
                <Animated.View
                    style={[
                        { shadowColor: accent },
                        styles.cardShadow,
                        { transform: [{ perspective: 900 }, { rotateX: tiltX }, { scale: tiltScale }] },
                    ]}
                >
                    <LinearGradient colors={borderColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                        <View style={styles.card}>
                            {/* glass highlight on top edge */}
                            <LinearGradient
                                colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
                                style={styles.sheen}
                                pointerEvents="none"
                            />

                            <View style={styles.cardHeader}>
                                <View style={styles.avatarWrapper}>
                                    <LinearGradient
                                        colors={isBlocked ? ['#475569', '#1E293B'] : ['#6366F1', '#22D3EE']}
                                        style={styles.avatarRing}
                                    >
                                        <Image
                                            source={{ uri: item.photoURL || 'https://via.placeholder.com/150' }}
                                            style={styles.avatarImage}
                                        />
                                    </LinearGradient>
                                    <PulseDot color={isBlocked ? '#EF4444' : '#10B981'} />
                                </View>

                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.name} numberOfLines={1}>{item.name || 'AUTHORIZED HOST'}</Text>
                                    <Text style={styles.idText}>
                                        SYSTEM ID: {item.uid?.slice(0, 15).toUpperCase() || item.id.slice(0, 15).toUpperCase()}
                                    </Text>
                                </View>

                                {/* Status + permanent report count badges */}
                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                    <View style={[styles.statusBadge, { backgroundColor: isBlocked ? '#EF444415' : '#10B98115', borderColor: isBlocked ? '#EF444440' : '#10B98140' }]}>
                                        <Text style={[styles.statusText, { color: isBlocked ? '#EF4444' : '#10B981' }]}>
                                            {isBlocked ? 'RESTRICTED' : 'ACTIVE'}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: blockCount > 0 ? '#EF444420' : '#1E293B',
                                                borderColor: blockCount > 0 ? '#EF444440' : 'transparent',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                            },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name="flag-variant"
                                            size={10}
                                            color={blockCount > 0 ? '#EF4444' : '#64748B'}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[styles.statusText, { color: blockCount > 0 ? '#EF4444' : '#64748B' }]}>
                                            {blockCount} REPORTS
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* RED ALERT SAFETY WARNING FOR HOSTS */}
                            {isCriticalRisk && (
                                <View style={styles.sirenBox}>
                                    <Text style={styles.sirenText}>
                                        🚨 SAFETY WARNING: THIS HOST HAS BEEN BLOCKED/REPORTED {blockCount} TIMES BY USERS. REVIEW REQUIRED.
                                    </Text>
                                </View>
                            )}
                            {!isCriticalRisk && blockCount > 0 && (
                                <View style={styles.warnBox}>
                                    <Text style={styles.warningText}>⚠️ Note: This host has {blockCount} block reports.</Text>
                                </View>
                            )}

                            {/* PERFORMANCE METRICS – 3 floating tiles */}
                            <View style={styles.metricsGrid}>
                                <LinearGradient colors={['rgba(99,102,241,0.16)', 'rgba(99,102,241,0.03)']} style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>TIER LEVEL</Text>
                                    <View style={styles.metricRow}>
                                        <MaterialCommunityIcons name="shield-star" size={13} color="#A5B4FC" />
                                        <Text style={styles.metricValue}>{item.currentLevel ?? 0}</Text>
                                    </View>
                                </LinearGradient>

                                <LinearGradient colors={['rgba(251,191,36,0.16)', 'rgba(251,191,36,0.03)']} style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>REWARD /MIN</Text>
                                    <View style={styles.metricRow}>
                                        <Text style={{ fontSize: 13 }}>🎖️</Text>
                                        <Text style={styles.metricValue}>{item.beansPerMin || 0}</Text>
                                    </View>
                                </LinearGradient>

                                <LinearGradient colors={['rgba(34,211,238,0.16)', 'rgba(34,211,238,0.03)']} style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>USER RATE</Text>
                                    <View style={styles.metricRow}>
                                        <MaterialCommunityIcons name="diamond" size={13} color="#818CF8" />
                                        <Text style={styles.metricValue}>{item.userPrice || 0}</Text>
                                    </View>
                                </LinearGradient>
                            </View>

                            <View style={styles.actions}>
                                <PressableScale
                                    containerStyle={{ flex: 1 }}
                                    style={[
                                        styles.actionBtn,
                                        {
                                            borderColor: isBlocked ? '#10B981' : '#EF444430',
                                            backgroundColor: isBlocked ? '#10B98112' : '#EF444410',
                                        },
                                    ]}
                                    onPress={() => onToggleBlock(item.id, !!isBlocked)}
                                >
                                    <Feather name={isBlocked ? 'refresh-cw' : 'user-x'} size={16} color={isBlocked ? '#10B981' : '#EF4444'} />
                                    <Text style={[styles.btnText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                                        {isBlocked ? 'RESTORE' : 'RESTRICT'}
                                    </Text>
                                </PressableScale>

                                <PressableScale containerStyle={{ flex: 1.25 }} style={styles.primaryWrap} onPress={() => onManage(item.id)}>
                                    <LinearGradient
                                        colors={['#6366F1', '#8B5CF6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.actionBtn, styles.primaryBtn]}
                                    >
                                        <MaterialCommunityIcons name="account-cog-outline" size={18} color="#fff" />
                                        <Text style={[styles.btnText, { color: '#fff' }]}>MANAGE PROFILE</Text>
                                    </LinearGradient>
                                </PressableScale>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* pulsing red glow for critical hosts */}
                    {isCriticalRisk && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.criticalGlow,
                                { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.9] }) },
                            ]}
                        />
                    )}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

/* ───────────────────────── MAIN SCREEN ───────────────────────── */

export default function ExpertControl() {
    const router = useRouter();
    const [experts, setExperts] = useState<ExpertData[]>([]);
    const [adminAlerts, setAdminAlerts] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);

    const scrollY = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const swing = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const floatY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setLoading(true);
        
        // Only fetch users who are authorized hosts
        const q = query(
            collection(db, "users"), 
            where("role", "==", "expert")
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpertData));
            
            // Sorting: Active hosts first, Restricted profiles at the bottom
            const sortedList = list.sort((a, b) => {
                if (a.isBlocked === b.isBlocked) return 0;
                return a.isBlocked ? 1 : -1;
            });
            
            setExperts(sortedList);
            setLoading(false);
        }, (err) => {
            console.error("Hub Sync Error:", err);
            setLoading(false);
        });

        // Fetching ALL Admin Alerts to dynamically count flags per host
        const alertsQuery = query(collection(db, "admin_alerts"));
        const unsubAlerts = onSnapshot(alertsQuery, (snap) => {
            setAdminAlerts(snap.docs.map(d => d.data()));
        });

        return () => {
            unsub();
            unsubAlerts();
        };
    }, []);

    // Ambient animations: header entrance, 3D swinging count badge, loader spin, empty-state float
    useEffect(() => {
        Animated.spring(headerIn, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();

        const swingLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(swing, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(swing, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const spinLoop = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true })
        );
        const floatLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatY, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatY, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        swingLoop.start();
        spinLoop.start();
        floatLoop.start();
        return () => {
            swingLoop.stop();
            spinLoop.stop();
            floatLoop.stop();
        };
    }, []);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "RESTRICT PROFILE?" : "RESTORE ACCESS?",
            `Confirming credential modification for this host. Proceed?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM", 
                    onPress: async () => {
                        try {
                            const userRef = doc(db, "users", userId);
                            // forceLogout flag instantly synchronizes status across platform nodes
                            await updateDoc(userRef, {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "Active",
                                forceLogout: newStatus ? true : false,
                                updatedAt: new Date().toISOString()
                            });
                        } catch (err) {
                            Alert.alert("SYSTEM ERROR", "Configuration failed. Verify database permissions.");
                        }
                    }
                }
            ]
        );
    };

    // DYNAMIC REPORT COUNT: checks admin_alerts directly. If an alert has this expert's ID, it counts it!
    const getBlockCount = (item: ExpertData) => {
        const dynamicFlags = adminAlerts.filter(alert => alert.expertId === item.id || alert.hostId === item.id).length;
        return Math.max(dynamicFlags, item.expertBlockCount || 0); // Takes the highest accurate number
    };

    // Summary numbers for the stats strip
    const stats = useMemo(() => {
        let active = 0, restricted = 0, flagged = 0;
        experts.forEach(e => {
            const blocked = e.isBlocked || e.status === 'Blocked';
            if (blocked) restricted++; else active++;
            const flags = Math.max(
                adminAlerts.filter(a => a.expertId === e.id || a.hostId === e.id).length,
                e.expertBlockCount || 0
            );
            if (flags > 0) flagged++;
        });
        return { total: experts.length, active, restricted, flagged };
    }, [experts, adminAlerts]);

    const renderExpert = ({ item, index }: { item: ExpertData; index: number }) => (
        <ExpertCard
            item={item}
            index={index}
            blockCount={getBlockCount(item)}
            onToggleBlock={toggleBlockStatus}
            onManage={(id) => router.push(`/(admin)/experts/verify-expert/${id}`)}
        />
    );

    const headerTranslate = headerIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
    const swingY = swing.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '22deg'] });
    const swingX = swing.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '-10deg'] });
    const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const floatTranslate = floatY.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

    const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
        <View style={styles.statChip}>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <AuroraBackground scrollY={scrollY} />

            <Animated.View style={{ opacity: headerIn, transform: [{ translateY: headerTranslate }] }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <Feather name="settings" size={22} color="#94A3B8" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>HOST HUB</Text>
                        <Text style={styles.subtitle}>Administrative Terminal • TalkPe OS</Text>
                    </View>

                    {/* 3D swinging count badge */}
                    <Animated.View style={{ transform: [{ perspective: 600 }, { rotateY: swingY }, { rotateX: swingX }] }}>
                        <LinearGradient colors={['#6366F1', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.countRing}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{experts.length}</Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* live stats strip */}
                <View style={styles.statsStrip}>
                    <StatChip label="TOTAL" value={stats.total} color="#E2E8F0" />
                    <View style={styles.statDivider} />
                    <StatChip label="ACTIVE" value={stats.active} color="#10B981" />
                    <View style={styles.statDivider} />
                    <StatChip label="RESTRICTED" value={stats.restricted} color="#EF4444" />
                    <View style={styles.statDivider} />
                    <StatChip label="FLAGGED" value={stats.flagged} color="#F59E0B" />
                </View>
            </Animated.View>

            {loading ? (
                <View style={styles.loaderArea}>
                    <View style={styles.loaderWrap}>
                        <Animated.View style={[styles.loaderRing, { transform: [{ rotate: spinDeg }] }]} />
                        <ActivityIndicator size="small" color="#6366F1" />
                    </View>
                    <Text style={styles.loaderText}>SYNCHRONIZING...</Text>
                </View>
            ) : (
                <Animated.FlatList
                    data={experts}
                    keyExtractor={(item: ExpertData) => item.id}
                    renderItem={renderExpert as any}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Animated.View style={{ transform: [{ translateY: floatTranslate }] }}>
                                <MaterialCommunityIcons name="account-off-outline" size={64} color="#334155" />
                            </Animated.View>
                            <Text style={styles.emptyText}>NO AUTHORIZED PROFILES</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#04030F' },

    /* header */
    header: { paddingTop: 60, paddingHorizontal: 22, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    backBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(148,163,184,0.10)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 2 },
    countRing: { padding: 2, borderRadius: 18, shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
    countBadge: { backgroundColor: '#0B1120', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16, minWidth: 50, alignItems: 'center' },
    countText: { color: '#A5B4FC', fontWeight: '900', fontSize: 18 },

    /* stats strip */
    statsStrip: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 18, paddingVertical: 14, borderRadius: 22, backgroundColor: 'rgba(15,23,42,0.65)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.14)' },
    statChip: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
    statDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.14)', marginVertical: 4 },

    /* loader / empty */
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
    loaderRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(30,41,59,0.9)', borderTopColor: '#6366F1', borderRightColor: '#22D3EE' },
    loaderText: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 20, letterSpacing: 3 },
    list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 120 },
    emptyContainer: { alignItems: 'center', marginTop: 90 },
    emptyText: { color: '#334155', fontSize: 12, fontWeight: '900', marginTop: 18, letterSpacing: 1.5 },

    /* card */
    cardWrap: { marginBottom: 30 },
    blockedCard: { opacity: 0.55 },
    depthLayer: { position: 'absolute', height: 40, borderRadius: 30 },
    cardShadow: { shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 14 }, elevation: 14 },
    cardBorder: { borderRadius: 32, padding: 1.5 },
    card: { backgroundColor: '#0B1120', padding: 22, borderRadius: 30.5, overflow: 'hidden' },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
    criticalGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 32, borderWidth: 2.5, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarWrapper: { position: 'relative' },
    avatarRing: { width: 74, height: 74, borderRadius: 25, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
    avatarImage: { width: 69, height: 69, borderRadius: 22.5, backgroundColor: '#1E293B' },
    statusDot: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
    dotCore: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#0B1120' },
    name: { color: '#fff', fontSize: 19, fontWeight: '900' },
    idText: { color: '#64748B', fontSize: 10, marginTop: 4, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    /* warnings */
    sirenBox: { marginTop: 18, padding: 12, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
    sirenText: { color: '#F87171', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, lineHeight: 15 },
    warnBox: { marginTop: 18, padding: 12, borderRadius: 16, backgroundColor: 'rgba(245,158,11,0.09)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
    warningText: { color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    /* metrics */
    metricsGrid: { flexDirection: 'row', gap: 10, marginVertical: 20 },
    metricItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(148,163,184,0.12)' },
    metricRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metricLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', marginBottom: 7, letterSpacing: 0.4 },
    metricValue: { color: '#fff', fontSize: 17, fontWeight: '900' },

    /* actions */
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { height: 54, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryWrap: { borderRadius: 20, shadowColor: '#6366F1', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    primaryBtn: { borderColor: 'rgba(255,255,255,0.18)' },
    btnText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});
