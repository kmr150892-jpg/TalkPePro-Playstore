import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router'; // 🔥 SATTI UPDATE: Imported Router
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react'; // 🔥 SYSTEM LOGIC: Reference hook for animations
import {
    ActivityIndicator,
    Alert,
    Animated, // 🔥 SYSTEM LOGIC: Animation engine for risk alerts
    Dimensions,
    Easing,
    Image, // 🔥 SATTI UPDATE: Imported Image component
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

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

// Animated aurora background with parallax on scroll (teal / indigo roster mood)
const AuroraBackground = ({ scrollY }: { scrollY: Animated.Value }) => {
    const shiftA = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -90], extrapolate: 'clamp' });
    const shiftB = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -150], extrapolate: 'clamp' });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={['#020A0F', '#06121F', '#080B1E']} style={StyleSheet.absoluteFill} />
            <Animated.View style={{ position: 'absolute', top: -120, left: -150, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={430} color="#14B8A6" drift={26} duration={7600} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: height * 0.4, right: -200, transform: [{ translateY: shiftB }] }}>
                <GlowOrb size={400} color="#6366F1" drift={30} duration={9000} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', bottom: -170, left: -40, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={340} color="#3B82F6" drift={20} duration={8300} />
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
                onPressIn={() => to(0.93)}
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
        <View style={styles.indicatorWrap}>
            <Animated.View style={[styles.pulseRing, { backgroundColor: color, opacity, transform: [{ scale }] }]} />
            <View style={[styles.indicator, { backgroundColor: color }]} />
        </View>
    );
};

/* ───────────────────────── USER CARD (3D) ───────────────────────── */

const UserCard = ({
    item,
    index,
    onPress,
    onToggle,
}: {
    item: any;
    index: number;
    onPress: () => void;
    onToggle: () => void;
}) => {
    const isBlocked = item.isBlocked || item.status === 'Blocked' || item.forceLogout === true;

    // 🔥 SYSTEM LOGIC: Global Trust-Score Verification 🔥
    const blockCount = item.expertBlockCount || 0;
    const isHighRisk = blockCount >= 5;

    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;
    // 🔥 SYSTEM LOGIC: Dynamic Blinking Animation for High-Priority Alerts 🔥
    const blinkOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 6) * 110,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
        }).start();
    }, []);

    useEffect(() => {
        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(blinkOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                Animated.timing(blinkOpacity, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        );
        blink.start();
        return () => blink.stop();
    }, []);

    useEffect(() => {
        if (!(isHighRisk && !isBlocked)) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isHighRisk, isBlocked]);

    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['38deg', '0deg'] });
    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });
    const scaleEnter = enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
    const opacity = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });

    const tiltX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    const tiltScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
    const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 8 }).start();

    const accent = isBlocked ? '#EF4444' : isHighRisk ? '#EF4444' : '#14B8A6';
    const borderColors: [string, string, string] = isBlocked
        ? ['#7F1D1D', '#334155', '#7F1D1D']
        : isHighRisk
            ? ['#EF4444', '#F97316', '#EF4444']
            : ['#14B8A6', '#6366F1', '#3B82F6'];

    const hasImage = !!(item.profileImage || item.image);
    const statusColor = isBlocked ? '#EF4444' : (isHighRisk ? '#EF4444' : '#10B981');

    return (
        <Animated.View
            style={[
                styles.cardWrap,
                {
                    opacity: isBlocked ? Animated.multiply(opacity, 0.7) : opacity,
                    transform: [{ perspective: 900 }, { translateY }, { rotateX: rotateXEnter }, { scale: scaleEnter }],
                },
            ]}
        >
            {/* stacked depth layers underneath */}
            <View style={[styles.depthLayer, { bottom: -9, left: 26, right: 26, backgroundColor: accent, opacity: 0.18 }]} />
            <View style={[styles.depthLayer, { bottom: -4.5, left: 14, right: 14, backgroundColor: accent, opacity: 0.3 }]} />

            <Animated.View
                style={[
                    styles.cardShadow,
                    { shadowColor: accent },
                    { transform: [{ perspective: 900 }, { rotateX: tiltX }, { scale: tiltScale }] },
                ]}
            >
                <LinearGradient colors={borderColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                    {/* 🔥 SATTI UPDATE: card is tappable → user detail */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={onPress}
                        onPressIn={() => pressTo(1)}
                        onPressOut={() => pressTo(0)}
                        style={styles.card}
                    >
                        <LinearGradient
                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                            style={styles.sheen}
                            pointerEvents="none"
                        />

                        <View style={styles.cardHeader}>
                            {/* Normalized Profile Avatar Component */}
                            <View style={styles.avatarContainer}>
                                <LinearGradient
                                    colors={isBlocked ? ['#7F1D1D', '#334155'] : isHighRisk ? ['#EF4444', '#F97316'] : ['#14B8A6', '#6366F1']}
                                    style={styles.avatarRing}
                                >
                                    {/* 🔥 SATTI UPDATE: Added Profile Picture Logic */}
                                    {hasImage ? (
                                        <Image
                                            source={{ uri: item.profileImage || item.image }}
                                            style={styles.avatarGradient}
                                        />
                                    ) : (
                                        <LinearGradient
                                            colors={isHighRisk && !isBlocked ? ['#EF4444', '#7F1D1D'] : ['#1E293B', '#0F172A']}
                                            style={styles.avatarGradient}
                                        >
                                            <Text style={[styles.avatarText, isHighRisk && !isBlocked && { color: '#FFF' }]}>{item.name?.[0] || 'C'}</Text>
                                        </LinearGradient>
                                    )}
                                </LinearGradient>
                                <PulseDot color={statusColor} />
                            </View>

                            <View style={styles.userInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{item.name || 'Platform User'}</Text>
                                <View style={styles.detailRow}>
                                    <Feather name="phone" size={10} color="#64748B" />
                                    <Text style={styles.userPhone}> {item.phoneNumber || 'Verification Encrypted'}</Text>
                                </View>

                                {/* 🔥 Display total safety flags from hosts 🔥 */}
                                {blockCount > 0 && (
                                    <View style={styles.detailRow}>
                                        <MaterialCommunityIcons name="account-cancel-outline" size={12} color="#EF4444" />
                                        <Text style={[styles.userPhone, { color: '#EF4444', fontWeight: 'bold' }]}>
                                            {' '}Flagged by {blockCount} Hosts
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.badge, { backgroundColor: isBlocked ? '#EF444415' : (isHighRisk ? '#EF444430' : '#10B98115'), borderColor: isBlocked || isHighRisk ? '#EF444440' : '#10B98140' }]}>
                                <Text style={[styles.badgeText, { color: isBlocked ? '#EF4444' : (isHighRisk ? '#EF4444' : '#10B981') }]}>
                                    {isBlocked ? 'RESTRICTED' : (isHighRisk ? 'REVIEW' : 'ACTIVE')}
                                </Text>
                            </View>
                        </View>

                        {/* Operational Footer */}
                        <View style={styles.cardFooter}>
                            <View style={styles.refPill}>
                                <MaterialCommunityIcons name="fingerprint" size={12} color="#475569" />
                                <Text style={styles.idLabel}>REF: {item.id.substring(0, 18).toUpperCase()}...</Text>
                            </View>

                            <PressableScale onPress={onToggle} style={styles.actionBtnWrap}>
                                <LinearGradient
                                    colors={isBlocked ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.actionBtn, { shadowColor: isBlocked ? '#10B981' : '#EF4444' }]}
                                >
                                    <MaterialCommunityIcons
                                        name={isBlocked ? "account-check" : "account-off"}
                                        size={18}
                                        color="#fff"
                                    />
                                    <Text style={styles.actionBtnText}>{isBlocked ? ' RESTORE' : ' RESTRICT'}</Text>
                                </LinearGradient>
                            </PressableScale>
                        </View>
                    </TouchableOpacity>
                </LinearGradient>

                {/* pulsing red glow for high risk */}
                {isHighRisk && !isBlocked && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.criticalGlow,
                            { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.9] }) },
                        ]}
                    />
                )}

                {/* 🔥 SYSTEM ALARM: HIGH-RISK INDICATOR 🔥 */}
                {isHighRisk && !isBlocked && (
                    <Animated.View style={[styles.criticalAlertBadge, { opacity: blinkOpacity }]}>
                        <MaterialCommunityIcons name="alert-octagram" size={14} color="#FFF" />
                        <Text style={styles.criticalAlertText}>CRITICAL REVIEW REQUIRED</Text>
                    </Animated.View>
                )}
            </Animated.View>
        </Animated.View>
    );
};

/* ───────────────────────── MAIN SCREEN ───────────────────────── */

export default function UserControl() {
    const router = useRouter(); // 🔥 SATTI UPDATE: Initialized Router
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollY = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const swing = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const floatY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 🔍 Synchronizing user-role profiles only
        const q = query(collection(db, "users"), where("role", "==", "user"));
        
        // ✅ OPERATIONAL UPDATE: Error handling for secure database synchronization
        const unsub = onSnapshot(q, (snap) => {
            // 🔥 SYSTEM LOGIC: Mapping data nodes with extended attribute support 🔥
            const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            
            // 🔥 SYSTEM LOGIC: Prioritizing high-risk profiles for administrative review 🔥
            list.sort((a, b) => {
                const countA = a.expertBlockCount || 0;
                const countB = b.expertBlockCount || 0;
                return countB - countA;
            });

            setUsers(list);
            setLoading(false);
        }, (error) => {
            // Internal error handling for credential-restricted nodes
            if (error.code === 'permission-denied') {
                console.log("Access restricted for specific data nodes.");
            } else {
                console.error("Profile Synchronization Error:", error);
            }
            setLoading(false);
        });

        return () => unsub();
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

    // Summary numbers for the stats strip
    const stats = useMemo(() => {
        let active = 0, restricted = 0, flagged = 0;
        users.forEach(u => {
            const blocked = u.isBlocked || u.status === 'Blocked' || u.forceLogout === true;
            if (blocked) restricted++; else active++;
            if ((u.expertBlockCount || 0) > 0) flagged++;
        });
        return { total: users.length, active, restricted, flagged };
    }, [users]);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean, name: string) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "⚠️ RESTRICT ACCESS?" : "✅ RESTORE ACCESS?",
            `Are you sure you want to ${newStatus ? 'restrict' : 'restore'} platform access for ${name || 'this user'}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm Action", 
                    onPress: async () => {
                        try {
                            // Synchronizing access status across global platform nodes
                            await updateDoc(doc(db, "users", userId), {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "User", // Ensuring field consistency
                                forceLogout: newStatus, // 🔥 SATTI FIX: Added this single line to clear the logout flag
                                lastAdminAction: new Date()
                            });
                            
                            Alert.alert("Success", `User access has been ${newStatus ? 'restricted' : 'restored'} successfully.`);
                        } catch (err: any) {
                            if (err.code === 'permission-denied') {
                                Alert.alert("Security Alert", "Administrative credentials insufficient for this modification.");
                            } else {
                                Alert.alert("Error", "Ledger synchronization failed. Verify network stability.");
                            }
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item, index }: any) => {
        const isBlocked = item.isBlocked || item.status === 'Blocked' || item.forceLogout === true;

        // 🔥 SATTI UPDATE: Navigation function added
        const handleCardPress = () => {
            router.push(`/(admin)/passbook/user-detail/${item.id}` as any);
        };

        return (
            <UserCard
                item={item}
                index={index}
                onPress={handleCardPress}
                onToggle={() => toggleBlockStatus(item.id, isBlocked, item.name)}
            />
        );
    };

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
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>USER ROSTER</Text>
                        <Text style={styles.subtitle}>Registered accounts on TalkPe secure network</Text>
                    </View>

                    {/* 3D swinging count badge */}
                    <Animated.View style={{ transform: [{ perspective: 600 }, { rotateY: swingY }, { rotateX: swingX }] }}>
                        <LinearGradient colors={['#14B8A6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.countRing}>
                            <View style={styles.statsBadge}>
                                <Text style={styles.statsCount}>{users.length}</Text>
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
                <View style={styles.loader}>
                    <View style={styles.loaderWrap}>
                        <Animated.View style={[styles.loaderRing, { transform: [{ rotate: spinDeg }] }]} />
                        <ActivityIndicator color="#6366F1" size="small" />
                    </View>
                </View>
            ) : (
                <Animated.FlatList
                    data={users}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderUser as any}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyView}>
                            <Animated.View style={{ transform: [{ translateY: floatTranslate }] }}>
                                <MaterialCommunityIcons name="account-search-outline" size={64} color="#334155" />
                            </Animated.View>
                            <Text style={styles.emptyText}>No registered profiles in current database.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020A0F' },

    /* header */
    header: { 
        paddingTop: 60, 
        paddingHorizontal: 22, 
        paddingBottom: 18, 
        flexDirection: 'row', 
        alignItems: 'center',
        gap: 14
    },
    title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
    subtitle: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
    countRing: { padding: 2, borderRadius: 18, shadowColor: '#14B8A6', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
    statsBadge: { backgroundColor: '#06121F', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, minWidth: 50, alignItems: 'center' },
    statsCount: { color: '#5EEAD4', fontWeight: '900', fontSize: 18 },

    /* stats strip */
    statsStrip: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, paddingVertical: 14, borderRadius: 22, backgroundColor: 'rgba(6,18,31,0.7)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.18)' },
    statChip: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
    statDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.14)', marginVertical: 4 },
    
    listContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },

    /* card */
    cardWrap: { marginBottom: 28 },
    depthLayer: { position: 'absolute', height: 40, borderRadius: 30 },
    cardShadow: { shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
    cardBorder: { borderRadius: 30, padding: 1.5 },
    card: { backgroundColor: '#07101C', borderRadius: 28.5, padding: 20, overflow: 'hidden' },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
    criticalGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 30, borderWidth: 2.5, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)' },
    
    criticalAlertBadge: { position: 'absolute', top: -10, right: 20, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 10, shadowColor: '#EF4444', shadowRadius: 8, shadowOpacity: 0.8 },
    criticalAlertText: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatarRing: { width: 63, height: 63, borderRadius: 23, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
    avatarGradient: { 
        width: 58, 
        height: 58, 
        borderRadius: 20.5, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#1E293B'
    },
    avatarText: { color: '#5EEAD4', fontSize: 22, fontWeight: '900' },
    indicatorWrap: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    pulseRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
    indicator: { 
        width: 16, 
        height: 16, 
        borderRadius: 8, 
        borderWidth: 3, 
        borderColor: '#07101C' 
    },
    
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { color: '#fff', fontSize: 18, fontWeight: '800' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    userPhone: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
    
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    
    cardFooter: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 20, 
        paddingTop: 15, 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(148,163,184,0.14)' 
    },
    refPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(148,163,184,0.07)' },
    idLabel: { color: '#475569', fontSize: 9, fontFamily: 'monospace' },
    actionBtnWrap: { borderRadius: 15 },
    actionBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 10, 
        paddingHorizontal: 18, 
        borderRadius: 15,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6
    },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
    loaderRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(30,41,59,0.9)', borderTopColor: '#14B8A6', borderRightColor: '#6366F1' },
    emptyView: { alignItems: 'center', marginTop: 90 },
    emptyText: { color: '#475569', marginTop: 18, fontWeight: '700' }
});