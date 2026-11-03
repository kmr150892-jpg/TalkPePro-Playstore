import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

// 🔥 NEW: A call still marked "active" but with no activity for this long is treated as stuck/ended (zombie doc)
const STALE_AFTER_MINUTES = 60;

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
            delay: index * 90,
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

// Smooth number count-up (display only)
const CountUp = ({ value, style, suffix = '' }: { value: number; style?: any; suffix?: string }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
        Animated.timing(anim, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => anim.removeListener(id);
    }, [value]);
    return <Text style={style}>{display.toLocaleString()}{suffix}</Text>;
};

// Expanding radar rings (live feel)
const RadarRings = ({ color = '#6366F1', size = 120 }: { color?: string; size?: number }) => {
    const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        const loops = rings.map((r, i) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 700),
                    Animated.timing(r, { toValue: 1, duration: 2100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            );
            l.start();
            return l;
        });
        return () => loops.forEach(l => l.stop());
    }, []);
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            {rings.map((r, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute', width: size, height: size, borderRadius: size / 2,
                        borderWidth: 1.5, borderColor: color,
                        opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                        transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.25] }) }]
                    }}
                />
            ))}
            <View style={[styles.radarCore, { backgroundColor: `${color}22`, borderColor: `${color}77`, shadowColor: color }]}>
                <MaterialCommunityIcons name="access-point" size={26} color={color} />
            </View>
        </View>
    );
};

// Equalizer-style live bars
const LiveBars = ({ color = '#6366F1' }: { color?: string }) => {
    const bars = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        const loops = bars.map((b, i) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.timing(b, { toValue: 1, duration: 500 + i * 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(b, { toValue: 0, duration: 500 + i * 140, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
                ])
            );
            l.start();
            return l;
        });
        return () => loops.forEach(l => l.stop());
    }, []);
    return (
        <View style={styles.liveBarsWrap}>
            {bars.map((b, i) => (
                <Animated.View
                    key={i}
                    style={{
                        width: 4, height: 22, borderRadius: 2, marginHorizontal: 2, backgroundColor: color,
                        transform: [{ scaleY: b.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }]
                    }}
                />
            ))}
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
            <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#6366F1', opacity: 0.14, transform: [{ translateY: aY }, { translateX: aX }] }]} />
            <Animated.View style={[styles.orb, { bottom: 100, left: -120, width: 320, height: 320, backgroundColor: '#A855F7', opacity: 0.09, transform: [{ translateY: bY }, { translateX: bX }] }]} />
        </View>
    );
};

// Section heading with accent bar
const SectionHeader = ({ title, right }: any) => (
    <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitleInline}>{title}</Text>
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
);

// Animated horizontal gauge for success rate
const RateGauge = ({ rate, color }: { rate: number; color: string }) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: rate, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [rate]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return (
        <View>
            <View style={styles.gaugeTrack}>
                <Animated.View style={[styles.gaugeFill, { width: w as any, backgroundColor: color, shadowColor: color }]} />
                {[25, 50, 75].map(t => (
                    <View key={t} style={[styles.gaugeTick, { left: `${t}%` }]} />
                ))}
            </View>
            <View style={styles.gaugeScale}>
                <Text style={styles.gaugeScaleText}>0</Text>
                <Text style={styles.gaugeScaleText}>50</Text>
                <Text style={styles.gaugeScaleText}>100</Text>
            </View>
        </View>
    );
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

const CallAnalytics = () => {
    const [liveCount, setLiveCount] = useState(0);
    const [successRate, setSuccessRate] = useState(0);
    
    // 🔥 NEW: Platform Session States
    const [totalTalktime, setTotalTalktime] = useState(0);
    const [todayTalktime, setTodayTalktime] = useState(0);
    
    const [loading, setLoading] = useState(true);
    
    // System Session Logs state
    const [callLogs, setCallLogs] = useState<any[]>([]);

    // 🔥 NEW: raw "active-status" call docs from Firestore (before stale filtering)
    const liveDocsRef = useRef<any[]>([]);

    // 🔥 NEW: Counts ONLY genuinely live calls (ignores ended + stuck/zombie docs)
    const recomputeLive = () => {
        const cutoff = Date.now() - STALE_AFTER_MINUTES * 60 * 1000;
        const count = liveDocsRef.current.filter((data: any) => {
            // already ended → not live
            if (data.endedAt) return false;

            // last known activity time (latest of all available timestamps)
            const stamps = [data.connectedAt, data.createdAt, data.startedAt, data.timestamp]
                .map((t: any) => {
                    if (!t) return 0;
                    try {
                        const ms = t.toDate ? t.toDate().getTime() : new Date(t).getTime();
                        return isNaN(ms) ? 0 : ms;
                    } catch (e) {
                        return 0;
                    }
                });
            const lastActivity = Math.max(0, ...stamps);

            // no timestamp or too old → stuck call, not live
            return lastActivity >= cutoff;
        }).length;
        setLiveCount(count);
    };

    useEffect(() => {
        // 1. Live Sessions Monitor - Added "connected" status as requested
        const qLive = query(
            collection(db, "calls"), 
            where("status", "in", ["ongoing", "active", "connecting", "ONGOING", "Active", "connected", "CONNECTED"])
        );
        const unsubLive = onSnapshot(qLive, (snap) => {
            // 🔥 FIX: don't blindly use snap.size (it includes stuck/ended calls) – filter real live calls
            liveDocsRef.current = snap.docs.map(d => d.data());
            recomputeLive();
            setLoading(false);
        });

        // 🔥 NEW: re-check every 30s so calls that go stale drop out of the count automatically
        const liveTicker = setInterval(recomputeLive, 30000);

        // 2. Success Rate & 🔥 Platform Session Calculation
        const unsubAll = onSnapshot(collection(db, "calls"), (snap) => {
            if (!snap.empty) {
                const total = snap.size;
                let completedCount = 0;
                let totalSecs = 0;
                let todaySecs = 0;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                snap.docs.forEach(d => {
                    const data = d.data();
                    
                    // Session Success Verification
                    if (data.status === 'completed' || data.status === 'SUCCESS') {
                        completedCount++;
                    }

                    // 🔥 Session Duration Logic (convert all to seconds first)
                    const durationSecs = Number(data.finalDuration || data.duration || data.callDuration || data.time || 0);
                    totalSecs += durationSecs;

                    // Verify if session was executed today
                    const timeData = data.createdAt || data.timestamp || data.connectedAt || data.endedAt;
                    if (timeData) {
                        try {
                            const callDate = timeData.toDate ? timeData.toDate() : new Date(timeData);
                            if (callDate >= today) {
                                todaySecs += durationSecs;
                            }
                        } catch(e) {}
                    }
                });

                setSuccessRate(Math.round((completedCount / total) * 100));
                // Convert total seconds to minutes for dashboard metrics
                setTotalTalktime(Math.floor(totalSecs / 60));
                setTodayTalktime(Math.floor(todaySecs / 60));
            }
        });

        // 3. System Session Logs - Fetching latest operational data
        const qLogs = query(
            collection(db, "calls"), 
            orderBy("createdAt", "desc"), 
            limit(15) 
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            const logs: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
            
            // Validating recognized user/host sessions only
            const validLogs = logs.filter((log: any) => {
                const eName = log.expertName || log.expert_name || log.receiverName;
                const uName = log.callerName || log.userName || log.user_name;
                return (eName && eName.trim() !== '') && (uName && uName.trim() !== '');
            });
            
            setCallLogs(validLogs.slice(0, 10));
        });

        return () => { 
            unsubLive(); 
            unsubAll(); 
            unsubLogs();
            clearInterval(liveTicker);
        };
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <BackgroundOrbs />
                <View style={styles.loaderRing}>
                    <ActivityIndicator color="#6366F1" size="large" />
                </View>
                <Text style={styles.loaderText}>SYNCING LIVE DATA...</Text>
            </View>
        );
    }

    // 🆕 visual-only: gauge colour based on rate
    const rateColor = successRate >= 80 ? '#10B981' : successRate >= 50 ? '#F59E0B' : '#F43F5E';
    const rateLabel = successRate >= 80 ? 'EXCELLENT' : successRate >= 50 ? 'MODERATE' : 'NEEDS ATTENTION';

    return (
        <View style={styles.container}>
            <BackgroundOrbs />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* --- Page title --- */}
            <Reveal index={0}>
                <View style={styles.pageHeader}>
                    <View>
                        <Text style={styles.pageTitle}>OPERATIONAL PULSE</Text>
                        <Text style={styles.pageSub}>Real-time system health metrics</Text>
                    </View>
                    <View style={styles.liveChip}>
                        <LiveBars color="#10B981" />
                        <Text style={styles.liveChipText}>LIVE</Text>
                    </View>
                </View>
            </Reveal>

            {/* --- Live Sessions Operations --- */}
            <Reveal index={1}>
                <View style={styles.heroCard}>
                    <View style={styles.heroOrbA} />
                    <View style={styles.heroOrbB} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroLabel}>ACTIVE SESSIONS</Text>
                        <View style={styles.row}>
                            <View style={styles.pulseIndicator} />
                            <CountUp value={liveCount} style={styles.value} />
                        </View>
                        <Text style={styles.heroFoot}>
                            {liveCount === 0 ? 'No live sessions right now' : `${liveCount} session${liveCount > 1 ? 's' : ''} in progress`}
                        </Text>
                    </View>
                    <RadarRings color="#818CF8" size={118} />
                </View>
            </Reveal>

            {/* 🔥 NEW: Platform Usage Metrics */}
            <SectionHeader title="PLATFORM USAGE" />
            <Reveal index={2}>
                <View style={styles.statsRow}>
                    <Press3D style={[styles.statCard, { backgroundColor: '#1E1B4B', borderColor: '#312E81', borderBottomColor: '#4338CA', shadowColor: '#6366F1' }]}>
                        <View style={[styles.statGlow, { backgroundColor: '#6366F1' }]} />
                        <View style={[styles.statIcon, { backgroundColor: '#6366F133', borderColor: '#6366F177' }]}>
                            <MaterialCommunityIcons name="timer-sand" size={18} color="#818CF8" />
                        </View>
                        <Text style={styles.cardLabel}>SYSTEM USAGE (MINS)</Text>
                        <CountUp value={totalTalktime} style={[styles.cardValue, { color: '#818CF8' }]} />
                    </Press3D>
                    <Press3D style={[styles.statCard, { backgroundColor: '#422006', borderColor: '#713F12', borderBottomColor: '#A16207', shadowColor: '#F59E0B' }]}>
                        <View style={[styles.statGlow, { backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.statIcon, { backgroundColor: '#F59E0B33', borderColor: '#F59E0B77' }]}>
                            <MaterialCommunityIcons name="calendar-today" size={18} color="#FBBF24" />
                        </View>
                        <Text style={styles.cardLabel}>TODAY'S USAGE (MINS)</Text>
                        <CountUp value={todayTalktime} style={[styles.cardValue, { color: '#FBBF24' }]} />
                    </Press3D>
                </View>
            </Reveal>
            
            {/* --- Platform Health Section --- */}
            <SectionHeader title="PLATFORM HEALTH" />
            <Reveal index={3}>
                <View style={[styles.healthCard, { shadowColor: rateColor, borderColor: `${rateColor}40` }]}>
                    <View style={styles.healthTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>OPERATIONAL SUCCESS RATE</Text>
                            <View style={styles.healthValueRow}>
                                <CountUp value={successRate} suffix="%" style={[styles.value, { color: rateColor }]} />
                            </View>
                        </View>
                        <View style={[styles.rateBadge, { backgroundColor: `${rateColor}1F`, borderColor: `${rateColor}55` }]}>
                            <MaterialCommunityIcons name="shield-check" size={14} color={rateColor} style={{ marginRight: 6 }} />
                            <Text style={[styles.rateBadgeText, { color: rateColor }]}>{rateLabel}</Text>
                        </View>
                    </View>
                    <RateGauge rate={successRate} color={rateColor} />
                </View>
            </Reveal>

            {/* --- System Activity Logs --- */}
            <SectionHeader
                title="SYSTEM ACTIVITY LOGS"
                right={
                    <View style={styles.countPill}>
                        <Text style={styles.countPillText}>{callLogs.length}</Text>
                    </View>
                }
            />
            <View style={styles.card}>
                {callLogs.length === 0 ? (
                    <Reveal index={4}>
                        <View style={styles.emptyBox}>
                            <View style={styles.emptyRing}>
                                <MaterialCommunityIcons name="text-box-search-outline" size={34} color="#6366F1" />
                            </View>
                            <Text style={{color: '#475569', marginTop: 14, fontWeight: '700'}}>No recent operational logs found</Text>
                        </View>
                    </Reveal>
                ) : (
                    callLogs.map((log: any, idx: number) => {
                        // Operational Time Parsing
                        let formattedDate = "Processing Timestamp...";
                        const timeData = log.createdAt || log.timestamp || log.connectedAt;
                        if (timeData) {
                            try {
                                const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                                formattedDate = dateObj.toLocaleString('en-IN', { 
                                    day: 'numeric', month: 'short', year: 'numeric', 
                                    hour: '2-digit', minute: '2-digit', hour12: true 
                                });
                            } catch (e) {
                                formattedDate = "Timestamp Verification Error";
                            }
                        }

                        // Host/User Mapping (Keys strictly preserved)
                        const expertName = log.expertName || log.expert_name || 'Host';
                        const userName = log.callerName || log.userName || 'User';

                        // Duration Analytics
                        const durationSecs = Number(log.finalDuration || log.duration || 0);
                        const displayMins = Math.floor(durationSecs / 60);
                        const displaySecs = durationSecs % 60;
                        const timeText = displayMins > 0 ? `${displayMins}m ${displaySecs}s` : `${displaySecs}s`;

                        const unitsAllocated = Number(log.totalDiamonds || log.diamonds || 0);
                        const unitsRewarded = Number(log.expertEarnings || log.beans || 0);

                        const isSuccess = log.status === 'completed' || log.status === 'SUCCESS';
                        const statusColor = isSuccess ? '#10B981' : '#F59E0B';

                        return (
                            <Reveal key={log.id} index={Math.min(idx + 4, 12)}>
                                <View style={[styles.logItem, { borderLeftColor: statusColor }]}>
                                    {/* Header with UI Fix for Overflow */}
                                    <View style={styles.logHeader}>
                                        <View style={[styles.logAvatar, { backgroundColor: `${statusColor}1F`, borderColor: `${statusColor}55` }]}>
                                            <Text style={[styles.logAvatarText, { color: statusColor }]}>{String(userName).trim().charAt(0).toUpperCase() || 'U'}</Text>
                                        </View>
                                        <Text style={styles.logText} numberOfLines={1} ellipsizeMode="tail">
                                            {userName}  ➔  {expertName}
                                        </Text>
                                        <View style={[styles.statusBox, { backgroundColor: `${statusColor}1A`, borderColor: `${statusColor}45` }]}>
                                            <Text style={[styles.logStatus, isSuccess ? {} : {color: '#F59E0B'}]}>
                                                {String(log.status || 'UNVERIFIED').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {/* Analytics Output Section */}
                                    <View style={styles.metricRow}>
                                        <View style={styles.metricChip}>
                                            <Text style={styles.logSubText}>⏱ {timeText}</Text>
                                        </View>
                                        <View style={styles.metricChip}>
                                            <Text style={styles.logSubText}>💎 {unitsAllocated} Units</Text>
                                        </View>
                                        <View style={styles.metricChip}>
                                            <Text style={styles.logSubText}>🫘 {unitsRewarded} Rewards</Text>
                                        </View>
                                    </View>
                                    
                                    <Text style={styles.logDateText}>
                                        📅 {formattedDate}
                                    </Text>
                                </View>
                            </Reveal>
                        );
                    })
                )}
            </View>
            
            <View style={{height: 40}} />
        </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    // 🔥 FIX: paddingTop 24 → 60 so the page no longer sticks to the very top
    scrollContent: { padding: 20, paddingTop: 60 },
    center: { alignItems: 'center', justifyContent: 'center' },
    orb: { position: 'absolute', borderRadius: 999 },

    loaderRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#312E81', backgroundColor: '#6366F112', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    loaderText: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 20 },

    pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    pageTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 2, textShadowColor: '#6366F1', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
    pageSub: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 4 },
    liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B9811A', borderWidth: 1, borderColor: '#10B98155', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
    liveChipText: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginLeft: 6 },
    liveBarsWrap: { flexDirection: 'row', alignItems: 'center', height: 22 },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 14 },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: '#6366F1', marginRight: 10 },
    sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    countPill: { minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F122' },
    countPillText: { color: '#818CF8', fontSize: 11, fontWeight: '900' },

    heroCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 32, padding: 24, borderWidth: 1, borderBottomWidth: 5, borderColor: '#1E293B', borderBottomColor: '#312E81', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    heroOrbA: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: '#6366F1', opacity: 0.18 },
    heroOrbB: { position: 'absolute', bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#A855F7', opacity: 0.1 },
    heroLabel: { color: '#64748B', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    heroFoot: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginTop: 6 },
    radarCore: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 8 },

    card: { marginVertical: 0 },
    row: { flexDirection: 'row', alignItems: 'center' },
    pulseIndicator: { 
        width: 12, height: 12, borderRadius: 6, 
        backgroundColor: '#6366F1', marginRight: 15,
        shadowColor: '#6366F1', shadowRadius: 10, shadowOpacity: 0.9, shadowOffset: { width: 0, height: 0 }, elevation: 5
    },
    label: { color: '#64748B', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    value: { color: '#fff', fontSize: 72, fontWeight: '900', marginTop: 5, textShadowColor: '#6366F1', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 },
    divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 40, opacity: 0.5 },
    
    // 🔥 NEW STYLES FOR PLATFORM USAGE CARDS
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statCard: { width: (width - 52) / 2, padding: 18, borderRadius: 26, borderWidth: 1, borderBottomWidth: 5, overflow: 'hidden', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    statGlow: { position: 'absolute', top: -40, right: -40, width: 110, height: 110, borderRadius: 55, opacity: 0.2 },
    statIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    cardValue: { fontSize: 32, fontWeight: '900', marginTop: 8 },
    minText: { fontSize: 14, fontWeight: '700', color: '#64748B' }, // Kept for safety, though removed from UI text above

    healthCard: { backgroundColor: '#0B1224', borderRadius: 30, padding: 22, borderWidth: 1, borderBottomWidth: 4, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    healthTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    healthValueRow: { flexDirection: 'row', alignItems: 'center' },
    rateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    rateBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    gaugeTrack: { height: 14, borderRadius: 7, backgroundColor: '#111B33', overflow: 'hidden' },
    gaugeFill: { height: '100%', borderRadius: 7, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    gaugeTick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#020617', opacity: 0.6 },
    gaugeScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    gaugeScaleText: { color: '#475569', fontSize: 10, fontWeight: '800' },

    logItem: {
        backgroundColor: '#0F172A', padding: 16, borderRadius: 20,
        marginTop: 12, borderWidth: 1, borderColor: '#1E293B', borderLeftWidth: 4, borderBottomWidth: 3,
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5
    },
    logHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', 
        alignItems: 'center', gap: 10 
    },
    logAvatar: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    logAvatarText: { fontSize: 14, fontWeight: '900' },
    logText: { 
        color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 
    },
    statusBox: { flexShrink: 0, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, borderWidth: 1 },
    logStatus: { color: '#10B981', fontSize: 10, fontWeight: '900', textAlign: 'right' },
    metricRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
    metricChip: { backgroundColor: '#020617', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#1E293B' },
    logSubText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
    logDateText: { color: '#64748B', fontSize: 11, marginTop: 12, fontWeight: '500' },

    emptyBox: { alignItems: 'center', padding: 36 },
    emptyRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: '#312E81', backgroundColor: '#6366F112', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 6 }
});

export default CallAnalytics;