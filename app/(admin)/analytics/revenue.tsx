import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

/* ───────────────────────── 3D / ANIMATION BUILDING BLOCKS ───────────────────────── */

// 3D press tilt
const Press3D = ({ children, style, onPress }: any) => {
    const p = useRef(new Animated.Value(0)).current;
    const pressIn = () => Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    const pressOut = () => Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
    const rotateX = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
            <Animated.View style={[style, { transform: [{ perspective: 800 }, { rotateX }, { scale }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

// Staggered entrance (fade + rise + flip-up)
const Reveal = ({ index = 0, children, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, {
            toValue: 1,
            duration: 520,
            delay: Math.min(index, 9) * 80,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
    const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] });
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
            {children}
        </Animated.View>
    );
};

// Money count-up. Final value is ALWAYS shown exactly as the original formatting (en-IN).
const MoneyCount = ({ value, prefix = '₹', decimals, style }: { value: number; prefix?: string; decimals?: number; style?: any }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState(0);
    const fmt = (v: number) =>
        decimals !== undefined
            ? v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            : v.toLocaleString('en-IN');
    useEffect(() => {
        const id = anim.addListener(({ value: v }) => setDisplay(decimals !== undefined ? v : Math.round(v)));
        Animated.timing(anim, { toValue: value, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setDisplay(value); // land on the exact value
        });
        return () => anim.removeListener(id);
    }, [value]);
    return <Text style={style}>{prefix}{fmt(display)}</Text>;
};

// Breathing live dot
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

// Pulsing glow ring with icon (hero decoration)
const GlowCoin = ({ color = '#10B981', icon = 'cash-multiple' }: { color?: string; icon?: any }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        l.start();
        return () => l.stop();
    }, []);
    const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    return (
        <View style={styles.coinWrap}>
            <Animated.View style={{ position: 'absolute', width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: color, opacity, transform: [{ scale }] }} />
            <View style={[styles.coinCore, { backgroundColor: `${color}22`, borderColor: `${color}77`, shadowColor: color }]}>
                <MaterialCommunityIcons name={icon} size={28} color={color} />
            </View>
        </View>
    );
};

// Floating glow orbs background
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
            <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#10B981', opacity: 0.1, transform: [{ translateY: aY }, { translateX: aX }] }]} />
            <Animated.View style={[styles.orb, { bottom: 100, left: -120, width: 320, height: 320, backgroundColor: '#6366F1', opacity: 0.12, transform: [{ translateY: bY }, { translateX: bX }] }]} />
        </View>
    );
};

// Section heading with accent bar
const SectionHeader = ({ title, right, color = '#6366F1' }: any) => (
    <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionAccent, { backgroundColor: color }]} />
        <Text style={styles.sectionTitleInline}>{title}</Text>
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
);

// Animated split bar: how much of allocations went to hosts (derived from real totals)
const FlowBar = ({ pct }: { pct: number }) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: pct, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return (
        <View style={{ width: '100%', marginTop: 22 }}>
            <View style={styles.flowTrack}>
                <Animated.View style={[styles.flowFill, { width: w as any }]} />
            </View>
            <View style={styles.flowLegend}>
                <View style={styles.flowLegendItem}>
                    <View style={[styles.flowDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.flowLegendText}>HOSTS {pct.toFixed(0)}%</Text>
                </View>
                <View style={styles.flowLegendItem}>
                    <View style={[styles.flowDot, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }]} />
                    <Text style={styles.flowLegendText}>PLATFORM {(100 - pct).toFixed(0)}%</Text>
                </View>
            </View>
        </View>
    );
};

// Leaderboard-style row with animated share bar
// 🆕 Optional onPress: when provided the whole row becomes tappable (used to open the Host / User profile)
const RankRow = ({ name, amount, max, index, amountColor, barColor, onPress }: any) => {
    const fill = useRef(new Animated.Value(0)).current;
    const pct = max > 0 ? Math.max(0, Math.min(100, (amount / max) * 100)) : 0;
    useEffect(() => {
        Animated.timing(fill, { toValue: pct, duration: 900, delay: Math.min(index, 9) * 60, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    const medal = index === 0 ? '#FBBF24' : index === 1 ? '#CBD5E1' : index === 2 ? '#D97706' : null;
    const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?';

    const rowContent = (
        <View style={[styles.listItem, { borderBottomWidth: 0.5 }]}>
            <View style={styles.listItemTop}>
                <View style={[styles.rankBadge, medal ? { backgroundColor: `${medal}22`, borderColor: `${medal}77` } : null]}>
                    <Text style={[styles.rankText, medal ? { color: medal } : null]}>{index + 1}</Text>
                </View>
                <View style={[styles.rowAvatar, { backgroundColor: `${barColor}1F`, borderColor: `${barColor}55` }]}>
                    <Text style={[styles.rowAvatarText, { color: barColor }]}>{initial}</Text>
                </View>
                <Text style={styles.listName} numberOfLines={1}>{name}</Text>
                <Text style={[styles.listAmount, { color: amountColor }]}>₹{amount.toLocaleString('en-IN')}</Text>
                {onPress ? (
                    <View style={[styles.chevronWrap, { backgroundColor: `${barColor}1A`, borderColor: `${barColor}44` }]}>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={barColor} />
                    </View>
                ) : null}
            </View>
            <View style={styles.rowTrack}>
                <Animated.View style={[styles.rowFill, { width: w as any, backgroundColor: barColor }]} />
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
                {rowContent}
            </TouchableOpacity>
        );
    }
    return rowContent;
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

const RevenueAnalytics = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    
    // 🔥 UPDATED STATE: Removed User Distribution details for Reward Grants
    const [data, setData] = useState<any>({
        totalRevenue: 0,
        todayRevenue: 0,
        totalPaidOut: 0,
        todayPaidOut: 0,
        userBreakdown: [],
        expertBreakdown: []
    });

    // 🆕 OPEN HOST PROFILE → (admin)/experts/verify-expert/[id].tsx
    const openHostProfile = (hostId: string) => {
        router.push(`/(admin)/experts/verify-expert/${hostId}` as any);
    };

    // 🆕 OPEN USER PROFILE → (admin)/passbook/user-detail/[id].tsx
    const openUserProfile = (userId: string) => {
        router.push(`/(admin)/passbook/user-detail/${userId}` as any);
    };

    useEffect(() => {
        // 🔥 1. Calculate Total & Today's Inflows ONLY from RECHARGE transactions
        const qOrders = query(collection(db, "transactions"), where("status", "in", ["SUCCESS", "success", "COMPLETED", "completed", "PAID", "paid"]));
        const unsubOrders = onSnapshot(qOrders, (snap) => {
            let rev = 0;
            let todayRev = 0;
            let userMap: any = {};
            let userIdMap: any = {}; // 🆕 user name -> user id (for opening profile)
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            snap.docs.forEach(d => {
                const docData = d.data();
                
                // 🔥 FIX 1 & 4: Strictly filter out DISTRIBUTIONS. Only process RECHARGE types.
                if (docData.type && docData.type.toUpperCase() !== 'RECHARGE') {
                    return; // Skip this document
                }
                
                // Safe parsing for amount
                let amt = Number(docData.amount || docData.rechargeAmount || docData.totalAmount || docData.price || 0);
                
                rev += amt;

                // Today's Inflow Calculation
                const timeData = docData.createdAt || docData.timestamp || docData.date;
                if (timeData) {
                    try {
                        const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                        if (dateObj >= today) {
                            todayRev += amt;
                        }
                    } catch(e) {}
                }

                // User Breakdown Calculation
                const uName = docData.userName || docData.user_name || docData.callerName || docData.userId || 'Unknown User';
                if (!userMap[uName]) userMap[uName] = 0;
                userMap[uName] += amt;

                // 🆕 Remember the user id for this user (first valid id found wins)
                const uId = docData.userId || docData.uid || docData.callerId;
                if (uId && !userIdMap[uName]) userIdMap[uName] = String(uId);
            });

            const userArr = Object.keys(userMap).map(k => ({ name: k, amount: userMap[k], id: userIdMap[k] || null })).sort((a,b) => b.amount - a.amount);

            setData((prev: any) => ({ ...prev, totalRevenue: rev, todayRevenue: todayRev, userBreakdown: userArr }));
        });

        // 🔥 2. Calculate Total Distributed, Today's Distributed & Host Breakdown
        const qACTIVITY_REWARDs = query(collection(db, "withdrawals"), where("status", "in", ["PAID", "paid", "SUCCESS", "success", "COMPLETED", "completed"]));
        const unsubACTIVITY_REWARDs = onSnapshot(qACTIVITY_REWARDs, (pSnap) => {
            let paid = 0;
            let todayPaid = 0; // NEW
            let expertMap: any = {};
            let expertIdMap: any = {}; // 🆕 host name -> host id (for opening profile)

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            pSnap.docs.forEach(d => {
                const docData = d.data();
                
                const amt = Number(docData.amountRupee || docData.amount || docData.ACTIVITY_REWARDAmount || docData.transferred || 0);
                paid += amt;

                // 🔥 NEW: Today's Host Distribution Calculation
                const timeData = docData.createdAt || docData.timestamp || docData.processedAt || docData.date;
                if (timeData) {
                    try {
                        const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                        if (dateObj >= today) {
                            todayPaid += amt;
                        }
                    } catch(e) {}
                }

                const eName = docData.expertName || docData.userName || docData.expert_name || docData.receiverName || docData.expertId || 'Unknown Host';
                if (!expertMap[eName]) expertMap[eName] = 0;
                expertMap[eName] += amt;

                // 🆕 Remember the host id for this host (first valid id found wins)
                const eId = docData.expertId || docData.hostId || docData.userId || docData.uid;
                if (eId && !expertIdMap[eName]) expertIdMap[eName] = String(eId);
            });

            const expertArr = Object.keys(expertMap).map(k => ({ name: k, amount: expertMap[k], id: expertIdMap[k] || null })).sort((a,b) => b.amount - a.amount);

            setData((prev: any) => ({ ...prev, totalPaidOut: paid, todayPaidOut: todayPaid, expertBreakdown: expertArr }));
            setLoading(false); 
        });

        return () => {
            unsubOrders();
            unsubACTIVITY_REWARDs();
        };
    }, []);

    // 🆕 visual-only derived values (formulas from original kept exactly)
    const shareTotal = data.totalRevenue - data.totalPaidOut;
    const shareToday = data.todayRevenue - data.todayPaidOut;
    const hostPct = data.totalRevenue > 0 ? Math.max(0, Math.min(100, (data.totalPaidOut / data.totalRevenue) * 100)) : 0;
    const userMax = data.userBreakdown.length > 0 ? data.userBreakdown[0].amount : 0;
    const hostMax = data.expertBreakdown.length > 0 ? data.expertBreakdown[0].amount : 0;

    return (
        <View style={styles.container}>
        <BackgroundOrbs />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            <Reveal index={0}>
                <View style={styles.pageHeader}>
                    <View>
                        <Text style={styles.sectionTitle}>OPERATIONAL OVERVIEW</Text>
                        <Text style={styles.pageSub}>Platform income & distributions</Text>
                    </View>
                    <View style={[styles.liveChip, { backgroundColor: loading ? '#F59E0B1A' : '#10B9811A', borderColor: loading ? '#F59E0B55' : '#10B98155' }]}>
                        <PulseDot color={loading ? '#F59E0B' : '#10B981'} size={6} />
                        <Text style={[styles.liveChipText, { color: loading ? '#F59E0B' : '#10B981' }]}>{loading ? 'SYNCING' : 'LIVE'}</Text>
                    </View>
                </View>
            </Reveal>
            
            {/* HERO: TOTAL ALLOCATIONS */}
            <Reveal index={1}>
                <View style={styles.mainCard}>
                    <View style={styles.heroOrbA} />
                    <View style={styles.heroOrbB} />
                    <View style={styles.heroTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>TOTAL USER ALLOCATIONS (INFLOWS)</Text>
                            <MoneyCount value={data.totalRevenue} style={styles.value} />
                        </View>
                        <GlowCoin color="#10B981" icon="cash-multiple" />
                    </View>
                    
                    <View style={styles.todayBox}>
                        <View style={styles.todayIcon}>
                            <MaterialCommunityIcons name="trending-up" size={16} color="#10B981" />
                        </View>
                        <Text style={styles.todayLabel}>TODAY'S ALLOCATIONS:</Text>
                        <MoneyCount value={data.todayRevenue} prefix="+ ₹" style={styles.todayValue} />
                    </View>
                </View>
            </Reveal>

            {/* HOST DISTRIBUTIONS ROW */}
            <SectionHeader title="HOST DISTRIBUTIONS" color="#10B981" />
            <Reveal index={2}>
                <View style={styles.row}>
                    <Press3D style={[styles.card, { backgroundColor: '#064E3B', borderColor: '#10B98160', borderBottomColor: '#10B981', shadowColor: '#10B981' }]}>
                        <View style={[styles.cardGlow, { backgroundColor: '#10B981' }]} />
                        <View style={[styles.cardIcon, { backgroundColor: '#10B98133', borderColor: '#10B98177' }]}>
                            <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#34D399" />
                        </View>
                        <Text style={styles.cardLabel}>TOTAL PROCESSED TO HOSTS</Text>
                        <MoneyCount value={data.totalPaidOut} style={styles.cardValue} />
                    </Press3D>
                    <Press3D style={[styles.card, { backgroundColor: '#7F1D1D', borderColor: '#F43F5E60', borderBottomColor: '#F43F5E', shadowColor: '#F43F5E' }]}>
                        <View style={[styles.cardGlow, { backgroundColor: '#F43F5E' }]} />
                        <View style={[styles.cardIcon, { backgroundColor: '#F43F5E33', borderColor: '#F43F5E77' }]}>
                            <MaterialCommunityIcons name="calendar-today" size={18} color="#FDA4AF" />
                        </View>
                        <Text style={styles.cardLabel}>TODAY'S HOST PROCESSED</Text>
                        <MoneyCount value={data.todayPaidOut} style={styles.cardValue} />
                    </Press3D>
                </View>
            </Reveal>

            {/* OPERATIONAL SHARE */}
            <SectionHeader title="OPERATIONAL SHARE" color="#818CF8" />
            <Reveal index={3}>
                <View style={[styles.profitCard, { shadowColor: shareTotal >= 0 ? '#10B981' : '#EF4444' }]}>
                    <View style={styles.profitOrbA} />
                    <View style={styles.profitOrbB} />
                    {/* 🔥 FIX 3: EXACT Math Formula (Shows minus if loss) */}
                    <View style={styles.profitIconRing}>
                        <MaterialCommunityIcons name="scale-balance" size={22} color="#C7D2FE" />
                    </View>
                    <Text style={styles.cardLabel}>PLATFORM OPERATIONAL SHARE</Text>
                    <MoneyCount
                        value={Math.abs(shareTotal)}
                        decimals={2}
                        prefix={`${shareTotal < 0 ? '- ' : ''}₹`}
                        style={[styles.profitValue, { color: shareTotal >= 0 ? '#10B981' : '#EF4444' }]}
                    />
                    <Text style={styles.subText}>(Allocations - Host processed)</Text>

                    <FlowBar pct={hostPct} />

                    {/* 🔥 FIX 5: Today's EXACT Formula (Shows minus if loss) */}
                    <View style={styles.todayProfitBox}>
                        <Text style={[styles.cardLabel, {color: '#818CF8'}]}>TODAY'S OPERATIONAL SHARE</Text>
                        <MoneyCount
                            value={Math.abs(shareToday)}
                            decimals={2}
                            prefix={`${shareToday < 0 ? '- ' : ''}₹`}
                            style={[styles.profitValue, {fontSize: 26, marginTop: 5, color: shareToday >= 0 ? '#38BDF8' : '#EF4444'}]}
                        />
                        <Text style={styles.subText}>(Today's Allocations - Today's Hosts)</Text>
                    </View>
                </View>
            </Reveal>

            {/* 🆕 DIAMOND ECONOMY SHORTCUT */}
            <Reveal index={4}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push('/(admin)/diamond-economy' as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 16, borderRadius: 22, backgroundColor: '#0B1224', borderWidth: 1, borderColor: '#38BDF855' }}
                >
                    <MaterialCommunityIcons name="diamond-stone" size={22} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontWeight: '900', fontSize: 13, letterSpacing: 1, marginLeft: 12, flex: 1 }}>DIAMOND ECONOMY</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#38BDF8" />
                </TouchableOpacity>
            </Reveal>

            {/* USER ALLOCATION BREAKDOWN */}
            <SectionHeader
                title="USER ALLOCATION DETAILS"
                color="#38BDF8"
                right={<View style={styles.countPill}><Text style={styles.countPillText}>{data.userBreakdown.length}</Text></View>}
            />
            <Reveal index={4}>
                <View style={styles.listCard}>
                    {data.userBreakdown.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <View style={styles.emptyRing}>
                                <MaterialCommunityIcons name="account-cash-outline" size={30} color="#38BDF8" />
                            </View>
                            <Text style={styles.noDataText}>No allocations found yet.</Text>
                        </View>
                    ) : (
                        data.userBreakdown.map((u: any, index: number) => (
                            <RankRow
                                key={index}
                                index={index}
                                name={u.name}
                                amount={u.amount}
                                max={userMax}
                                amountColor="#38BDF8"
                                barColor="#38BDF8"
                                onPress={u.id ? () => openUserProfile(u.id) : undefined}
                            />
                        ))
                    )}
                </View>
            </Reveal>

            {/* HOST REDEMPTIONS BREAKDOWN */}
            <SectionHeader
                title="HOST REDEMPTIONS DETAILS"
                color="#10B981"
                right={<View style={[styles.countPill, { backgroundColor: '#10B98122' }]}><Text style={[styles.countPillText, { color: '#10B981' }]}>{data.expertBreakdown.length}</Text></View>}
            />
            <Reveal index={5}>
                <View style={styles.listCard}>
                    {data.expertBreakdown.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <View style={[styles.emptyRing, { borderColor: '#065F46', backgroundColor: '#10B98112', shadowColor: '#10B981' }]}>
                                <MaterialCommunityIcons name="bank-transfer-out" size={30} color="#10B981" />
                            </View>
                            <Text style={styles.noDataText}>No redemptions sent yet.</Text>
                        </View>
                    ) : (
                        data.expertBreakdown.map((e: any, index: number) => (
                            <RankRow
                                key={index}
                                index={index}
                                name={e.name}
                                amount={e.amount}
                                max={hostMax}
                                amountColor="#10B981"
                                barColor="#10B981"
                                onPress={e.id ? () => openHostProfile(e.id) : undefined}
                            />
                        ))
                    )}
                </View>
            </Reveal>

            <View style={{height: 50}} />
        </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    // 🔥 FIX: paddingTop 16 → 60 so the page no longer sticks to the very top
    scrollContent: { padding: 20, paddingTop: 60 },
    orb: { position: 'absolute', borderRadius: 999 },

    pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 2, textShadowColor: '#10B981', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
    pageSub: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 4 },
    liveChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
    liveChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 14 },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, marginRight: 10 },
    sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    countPill: { minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#38BDF822' },
    countPillText: { color: '#38BDF8', fontSize: 11, fontWeight: '900' },

    mainCard: { backgroundColor: '#0F172A', padding: 25, borderRadius: 32, marginVertical: 10, borderWidth: 1, borderBottomWidth: 5, borderColor: '#1E293B', borderBottomColor: '#065F46', overflow: 'hidden', shadowColor: '#10B981', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    heroOrbA: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: '#10B981', opacity: 0.14 },
    heroOrbB: { position: 'absolute', bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#6366F1', opacity: 0.1 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    coinWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    coinCore: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    label: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
    value: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 10, textShadowColor: '#10B981', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
    
    todayBox: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', alignItems: 'center' },
    todayIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#10B9811F', borderWidth: 1, borderColor: '#10B98155', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    todayLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: 'bold', marginRight: 10 },
    todayValue: { color: '#10B981', fontSize: 16, fontWeight: '900' },

    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
    card: { width: (width - 52) / 2, padding: 16, borderRadius: 24, borderWidth: 1, borderBottomWidth: 5, overflow: 'hidden', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    cardGlow: { position: 'absolute', top: -40, right: -40, width: 110, height: 110, borderRadius: 55, opacity: 0.18 },
    cardIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    cardValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 6 },

    profitCard: { backgroundColor: '#1E1B4B', padding: 25, borderRadius: 32, marginTop: 0, alignItems: 'center', borderWidth: 1, borderBottomWidth: 5, borderColor: '#312E81', borderBottomColor: '#4338CA', overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    profitOrbA: { position: 'absolute', top: -60, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: '#6366F1', opacity: 0.22 },
    profitOrbB: { position: 'absolute', bottom: -70, left: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: '#A855F7', opacity: 0.14 },
    profitIconRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#4F46E5', backgroundColor: '#312E8180', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    profitValue: { fontSize: 36, fontWeight: '900', marginTop: 10 },
    subText: { color: '#64748B', fontSize: 10, marginTop: 5 },

    flowTrack: { height: 12, borderRadius: 6, backgroundColor: '#111B33', overflow: 'hidden' },
    flowFill: { height: '100%', borderRadius: 6, backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    flowLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    flowLegendItem: { flexDirection: 'row', alignItems: 'center' },
    flowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
    flowLegendText: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

    todayProfitBox: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#312E81', width: '100%', alignItems: 'center' },

    listCard: { backgroundColor: '#0B1224', borderRadius: 26, padding: 15, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    listItem: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1E293B' },
    listItemTop: { flexDirection: 'row', alignItems: 'center' },
    rankBadge: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#111B33', borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    rankText: { color: '#64748B', fontSize: 11, fontWeight: '900' },
    rowAvatar: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowAvatarText: { fontSize: 13, fontWeight: '900' },
    rowTrack: { height: 4, borderRadius: 2, backgroundColor: '#111B33', overflow: 'hidden', marginTop: 10 },
    rowFill: { height: '100%', borderRadius: 2, opacity: 0.85 },
    listName: { color: '#F1F5F9', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 10 },
    listAmount: { color: '#38BDF8', fontSize: 14, fontWeight: '900' },
    chevronWrap: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

    emptyBox: { alignItems: 'center', paddingVertical: 24 },
    emptyRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: '#0C4A6E', backgroundColor: '#38BDF812', alignItems: 'center', justifyContent: 'center', shadowColor: '#38BDF8', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
    noDataText: { color: '#475569', fontSize: 13, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic', marginTop: 6 }
});

export default RevenueAnalytics;
