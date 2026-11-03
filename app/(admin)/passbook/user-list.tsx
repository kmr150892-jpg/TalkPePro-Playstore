import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';

/* ============================================================
   🎬 3D POP-IN WRAPPER - cards flip up in 3D, staggered
   ============================================================ */
const Pop = ({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: any }) => {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(v, { toValue: 1, friction: 7, tension: 45, delay: 60 + Math.min(index, 8) * 90, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                    transform: [
                        { perspective: 900 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [55, 0] }) },
                        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

/* ============================================================
   💎 USER CARD - gradient border, orbit avatar ring, shine button
   ============================================================ */
const UserCard = ({ item, index, onOpen, loop, pulse, shine }: any) => {
    const press = useRef(new Animated.Value(1)).current;

    const spin = loop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const badgeScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-70, 220] });

    return (
        <Pop index={index} style={styles.cardWrap}>
            <Animated.View style={{ transform: [{ scale: press }] }}>
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={onOpen}
                    onPressIn={() => Animated.spring(press, { toValue: 0.97, friction: 6, tension: 120, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start()}
                >
                    <LinearGradient
                        colors={['#6366F1', '#3B82F6', '#6366F1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userCard}
                    >
                        <View style={styles.cardInner}>
                            <LinearGradient
                                colors={['rgba(99,102,241,0.18)', 'transparent', 'rgba(59,130,246,0.14)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <MaterialCommunityIcons name="shield-check" size={110} color="rgba(129,140,248,0.06)" style={styles.cardWatermark} />

                            <View style={styles.cardHeader}>
                                <View style={styles.avatarWrap}>
                                    <Animated.View style={[styles.avatarOrbit, { transform: [{ rotate: spin }] }]}>
                                        <View style={styles.avatarOrbitDot} />
                                    </Animated.View>
                                    <View style={styles.avatarBox}>
                                        {item.profilePic || item.photoURL ? (
                                            <Image source={{ uri: item.profilePic || item.photoURL }} style={styles.avatar} />
                                        ) : (
                                            <Text style={styles.avatarText}>{item.name?.[0] || 'C'}</Text>
                                        )}
                                    </View>
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.userName}>{item.name || 'Platform User'}</Text>
                                    <Text style={styles.userId} numberOfLines={1}>REF: {String(item.id).toUpperCase()}</Text>
                                </View>
                                <Animated.View style={[styles.viewBtn, { transform: [{ scale: badgeScale }] }]}>
                                    <MaterialCommunityIcons name="shield-check" size={16} color="#818CF8" />
                                </Animated.View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statLabel}>ALLOCATED BALANCE</Text>
                                    <Text style={[styles.statValue, { color: '#3B82F6' }]}>{item.balance || 0} 💎</Text>
                                </View>
                                
                                <View style={styles.statLine} />

                                {/* 🔥 SYSTEM ACTION: LEDGER AUDIT INTERFACE 🔥 */}
                                <TouchableOpacity 
                                    style={styles.actionBtn}
                                    onPress={onOpen}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#818CF8', '#6366F1', '#4F46E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Animated.View pointerEvents="none" style={[styles.btnShine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                                        <LinearGradient
                                            colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{ flex: 1 }}
                                        />
                                    </Animated.View>
                                    <Text style={styles.actionBtnText}>AUDIT LEDGER</Text>
                                    <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </Pop>
    );
};

// 🌌 floating particles config (background depth)
const particles = [
    { left: '8%', top: '30%', size: 3, range: -150 },
    { left: '24%', top: '70%', size: 2, range: -110 },
    { left: '45%', top: '40%', size: 4, range: -190 },
    { left: '63%', top: '78%', size: 3, range: -130 },
    { left: '80%', top: '32%', size: 2, range: -170 },
    { left: '93%', top: '60%', size: 3, range: -120 },
];

export default function UserPassbookList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [usersList, setUsersList] = useState<any[]>([]);
    const [searchFocused, setSearchFocused] = useState(false);

    /* ---------- 🎞️ ANIMATION VALUES ---------- */
    const loop = useRef(new Animated.Value(0)).current;       // linear 0→1 (orbit, particles)
    const pulse = useRef(new Animated.Value(0)).current;      // yoyo pulse (badges, live dot)
    const shine = useRef(new Animated.Value(0)).current;      // button shine sweep
    const heroTilt = useRef(new Animated.Value(0)).current;   // summary card 3D tilt
    const orbA = useRef(new Animated.Value(0)).current;       // floating orb A
    const orbB = useRef(new Animated.Value(0)).current;       // floating orb B

    useEffect(() => {
        const yoyo = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );

        const l1 = Animated.loop(Animated.timing(loop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true }));
        const l2 = yoyo(pulse, 1100);
        const l3 = Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(shine, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const l4 = yoyo(heroTilt, 3600);
        const l5 = yoyo(orbA, 6000);
        const l6 = yoyo(orbB, 7500, 800);

        [l1, l2, l3, l4, l5, l6].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5, l6].forEach(l => l.stop());
    }, []);

    useEffect(() => {
        // Synchronizing strictly with User-role profiles
        const q = query(collection(db, 'users'), where('role', '==', 'user'));
        
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(fetched);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const filteredList = usersList.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.id && u.id.includes(searchQuery)) ||
        (u.phone && u.phone.includes(searchQuery))
    );

    // 🆕 summary values for the hero card
    const totalAllocated = usersList.reduce((sum, u) => sum + (Number(u.balance) || 0), 0);

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const tiltY = heroTilt.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
    const tiltX = heroTilt.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '-3deg'] });
    const liveOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
    const ringScale = loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const ringOpacity = loop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    const heroShineX = loop.interpolate({ inputRange: [0, 1], outputRange: [-140, 420] });

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <UserCard
            item={item}
            index={index}
            loop={loop}
            pulse={pulse}
            shine={shine}
            onOpen={() => router.push(`/(admin)/passbook/user-detail/${item.id}` as any)}
        />
    );

    // 🆕 3D summary hero (scrolls with the list)
    const renderSummary = () => (
        <Pop index={0} style={{ marginBottom: 20 }}>
            <Animated.View style={{ transform: [{ perspective: 1100 }, { rotateY: tiltY }, { rotateX: tiltX }] }}>
                <LinearGradient colors={['#6366F1', '#3B82F6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBorder}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={['rgba(99,102,241,0.24)', 'transparent', 'rgba(59,130,246,0.2)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <Animated.View pointerEvents="none" style={[styles.heroShine, { transform: [{ translateX: heroShineX }, { rotate: '20deg' }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>

                        <View style={styles.heroTop}>
                            <View style={styles.heroBrand}>
                                <MaterialCommunityIcons name="shield-account" size={14} color="#818CF8" />
                                <Text style={styles.heroBrandText}>TALKPE • USER VAULT</Text>
                            </View>
                            <View style={styles.heroLivePill}>
                                <Animated.View style={[styles.heroLiveDot, { opacity: liveOpacity }]} />
                                <Text style={styles.heroLiveText}>LIVE</Text>
                            </View>
                        </View>

                        <View style={styles.heroBody}>
                            <View style={styles.heroIconWrap}>
                                <Animated.View style={[styles.heroRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                                <View style={styles.heroIconOrb}>
                                    <MaterialCommunityIcons name="account-group" size={30} color="#818CF8" />
                                </View>
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 }}>
                                <Text style={styles.heroLabel}>TOTAL ALLOCATED</Text>
                                <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{totalAllocated.toLocaleString()} 💎</Text>
                            </View>
                        </View>

                        <View style={styles.heroStatsRow}>
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatV}>{usersList.length}</Text>
                                <Text style={styles.heroStatL}>REGISTERED USERS</Text>
                            </View>
                            <View style={styles.heroStatDivider} />
                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatV, { color: '#3B82F6' }]}>{filteredList.length}</Text>
                                <Text style={styles.heroStatL}>SHOWING</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        </Pop>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 🌌 BACKGROUND DEPTH: gradient + aurora orbs + particles */}
            <LinearGradient colors={['#020617', '#080B20', '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={[
                        styles.particle,
                        {
                            left: p.left as any,
                            top: p.top as any,
                            width: p.size,
                            height: p.size,
                            borderRadius: p.size,
                            opacity: loop.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.8, 0] }),
                            transform: [{ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, p.range] }) }],
                        },
                    ]}
                />
            ))}
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>User Ledger</Text>
                    <View style={styles.headerSubRow}>
                        <Animated.View style={[styles.liveDot, { opacity: liveOpacity }]} />
                        <Text style={styles.headerSub}>Total Registered Users: {usersList.length}</Text>
                    </View>
                </View>
            </View>

            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
                <Ionicons name="search" size={20} color={searchFocused ? '#818CF8' : '#64748B'} style={{ marginLeft: 15 }} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search by Name, Ref or Contact..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingRight: 15 }}>
                        <Ionicons name="close-circle" size={18} color="#64748B" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>
            ) : (
                <FlatList 
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderSummary}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
                                <MaterialCommunityIcons name="account-search" size={48} color="#334155" />
                            </Animated.View>
                            <Text style={styles.emptyText}>No Discovering user profiles found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    /* background */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -60, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 460, left: -110, backgroundColor: 'rgba(59,130,246,0.14)' },
    particle: { position: 'absolute', backgroundColor: '#818CF8' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
    backBtn: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    headerSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 0 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.85)', marginHorizontal: 20, borderRadius: 18, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
    searchContainerFocused: { borderColor: '#818CF8', shadowColor: '#818CF8', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    searchInput: { flex: 1, height: 50, color: '#FFF', paddingHorizontal: 15, fontWeight: '600' },

    /* summary hero */
    heroBorder: { borderRadius: 28, padding: 1.3, shadowColor: '#6366F1', shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    heroCard: { borderRadius: 27, backgroundColor: '#080B18', padding: 20, overflow: 'hidden' },
    heroShine: { position: 'absolute', top: -60, bottom: -60, width: 80 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroBrandText: { color: '#818CF8', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    heroLivePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.1)' },
    heroLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    heroLiveText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    heroBody: { flexDirection: 'row', alignItems: 'center' },
    heroIconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
    heroRing: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: '#818CF8' },
    heroIconOrb: { width: 54, height: 54, borderRadius: 20, backgroundColor: 'rgba(99,102,241,0.14)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.45)', alignItems: 'center', justifyContent: 'center' },
    heroLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    heroValue: { color: '#FFF', fontSize: 30, fontWeight: '900' },
    heroStatsRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatV: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    heroStatL: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 1.5 },
    heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
    
    /* user card */
    cardWrap: { marginBottom: 14 },
    userCard: { padding: 1.2, borderRadius: 26, elevation: 8, shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    cardInner: { backgroundColor: '#0B1020', padding: 18, borderRadius: 25, overflow: 'hidden' },
    cardWatermark: { position: 'absolute', right: -14, top: -10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 15, marginBottom: 15 },
    
    avatarWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
    avatarOrbit: { position: 'absolute', width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(129,140,248,0.4)', alignItems: 'center' },
    avatarOrbitDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#818CF8', marginTop: -3.5, shadowColor: '#818CF8', shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
    avatarBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
    avatar: { width: '100%', height: '100%' },
    avatarText: { color: '#818CF8', fontWeight: '900', fontSize: 18 },
    
    userName: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    userId: { color: '#64748B', fontSize: 10, marginTop: 4, fontWeight: '700' },
    
    viewBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flex: 1 },
    statLine: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 15 },
    statLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '900' },
    
    actionBtn: { flex: 1.2, backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 14, gap: 8, overflow: 'hidden', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 },
    btnShine: { position: 'absolute', top: -20, bottom: -20, width: 34 },
    actionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', marginTop: 60, opacity: 0.7 },
    emptyText: { color: '#64748B', textAlign: 'center', marginTop: 10, fontWeight: '600', fontSize: 12 }
});
