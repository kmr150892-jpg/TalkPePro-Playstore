import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router'; // 🔥 SATTI UPDATE: Router imported
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { height } = Dimensions.get('window');

/* ───────────────────────── 🔥 NEW: LIVE USER HELPERS ───────────────────────── */

// Picks the best available image from a users/{id} document
const getUserImage = (u: any): string => {
    if (!u) return '';
    const candidates = [
        u.photoURL,
        u.profilePic,
        u.profileImage,
        u.avatar,
        u.image,
        u.coverPhoto,
        Array.isArray(u.gallery) ? u.gallery[0] : '',
        u.liveSelfie,
    ];
    const found = candidates.find((c) => typeof c === 'string' && c.trim().length > 0);
    return found ? String(found) : '';
};

// Always prefers the LIVE `name` field from users collection, falls back to old saved name
const getUserName = (u: any, fallback: any): string => {
    const live = u?.name ? String(u.name).trim() : '';
    if (live) return live;
    return fallback ? String(fallback) : '';
};

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

// Animated aurora background with parallax on scroll (rose / violet moderation mood)
const AuroraBackground = ({ scrollY }: { scrollY: Animated.Value }) => {
    const shiftA = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -90], extrapolate: 'clamp' });
    const shiftB = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -150], extrapolate: 'clamp' });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={['#05020A', '#12061C', '#080714']} style={StyleSheet.absoluteFill} />
            <Animated.View style={{ position: 'absolute', top: -130, right: -150, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={430} color="#F43F5E" drift={26} duration={7800} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: height * 0.42, left: -200, transform: [{ translateY: shiftB }] }}>
                <GlowOrb size={400} color="#8B5CF6" drift={30} duration={9200} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', bottom: -170, right: -40, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={340} color="#F59E0B" drift={20} duration={8400} />
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

// Little avatar chip: shows the profile image, falls back to the first letter of the name
const InitialChip = ({ label, colors, image }: { label: any; colors: [string, string]; image?: string }) => {
    const [imgFailed, setImgFailed] = useState(false);

    // reset the failed flag whenever a new image url comes in
    useEffect(() => { setImgFailed(false); }, [image]);

    const showImage = !!image && !imgFailed;

    return (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.initialChip}>
            {showImage ? (
                <Image
                    source={{ uri: image }}
                    style={styles.initialImage}
                    resizeMode="cover"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <Text style={styles.initialText}>{String(label || '?').trim().charAt(0).toUpperCase()}</Text>
            )}
        </LinearGradient>
    );
};

/* ───────────────────────── REPORT CARD (3D) ───────────────────────── */

type ReportCardProps = {
    item: any;
    index: number;
    isAlert: boolean;
    isCriticalRisk: boolean;
    blockCount: number;
    reporterLabel: string;
    reporterRoleLabel: string;
    reportedLabel: string;
    targetUserId: string;
    timeSecs?: number;
    reporterImage?: string; // 🔥 NEW
    reportedImage?: string; // 🔥 NEW
    onCardPress: () => void;
    onResolve: () => void;
    onRestrict: () => void;
};

const ReportCard = ({
    item,
    index,
    isAlert,
    isCriticalRisk,
    blockCount,
    reporterLabel,
    reporterRoleLabel,
    reportedLabel,
    timeSecs,
    reporterImage,
    reportedImage,
    onCardPress,
    onResolve,
    onRestrict,
}: ReportCardProps) => {
    const isResolved = item.status === 'resolved';
    const isHigh = item.priority === 'HIGH' || isAlert;

    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;

    // Entrance: card swings up from the floor in 3D
    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 6) * 110,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
        }).start();
    }, []);

    // Critical risk: pulsing red siren glow
    useEffect(() => {
        if (!isCriticalRisk) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isCriticalRisk]);

    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['38deg', '0deg'] });
    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] });
    const scaleEnter = enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
    const opacity = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });

    const tiltX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    const tiltScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
    const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 8 }).start();

    const accent = isCriticalRisk ? '#EF4444' : isHigh ? '#F43F5E' : '#F59E0B';
    const borderColors: [string, string, string] = isCriticalRisk
        ? ['#EF4444', '#F97316', '#EF4444']
        : isHigh
            ? ['#F43F5E', '#8B5CF6', '#F43F5E']
            : ['#F59E0B', '#F43F5E', '#F59E0B'];

    const badgeBg = isCriticalRisk ? '#EF4444' : (isHigh ? '#EF444420' : '#F59E0B20');
    const badgeFg = isCriticalRisk ? '#FFF' : (isHigh ? '#EF4444' : '#F59E0B');

    return (
        <Animated.View
            style={[
                styles.cardWrap,
                isResolved && { opacity: 0.6 },
                { opacity: isResolved ? Animated.multiply(opacity, 0.6) : opacity },
                { transform: [{ perspective: 900 }, { translateY }, { rotateX: rotateXEnter }, { scale: scaleEnter }] },
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
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={onCardPress}
                        onPressIn={() => pressTo(1)}
                        onPressOut={() => pressTo(0)}
                        style={styles.reportCard}
                    >
                        {/* glass highlight */}
                        <LinearGradient
                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                            style={styles.sheen}
                            pointerEvents="none"
                        />

                        <View style={styles.cardHeader}>
                            <View style={[styles.severityBadge, { backgroundColor: badgeBg }]}>
                                <View style={[styles.dot, { backgroundColor: isCriticalRisk ? '#FFF' : (isHigh ? '#EF4444' : '#F59E0B') }]} />
                                <Text style={[styles.badgeText, { color: badgeFg }]}>
                                    {isCriticalRisk ? `CRITICAL: ${blockCount} FLAGS` : (item.priority || (isAlert ? 'SERVICE ALERT' : 'STANDARD'))}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {isResolved && <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" />}
                                <Text style={styles.timeText}>{timeSecs ? new Date(timeSecs * 1000).toLocaleDateString() : 'Recent'}</Text>
                            </View>
                        </View>

                        {/* 🔥 RED ALERT SAFETY WARNING 🔥 */}
                        {isCriticalRisk && (
                            <View style={styles.sirenBox}>
                                <Text style={styles.sirenText}>
                                    🚨 SAFETY WARNING: THIS TARGET HAS BEEN RESTRICTED {blockCount} TIMES. IMMEDIATE REVIEW REQUIRED.
                                </Text>
                            </View>
                        )}

                        <Text style={styles.reportReason}>{item.reason || 'No specific reason documented'}</Text>

                        {/* SOURCE → TARGET flow */}
                        <View style={styles.flowRow}>
                            <View style={styles.flowPanel}>
                                <InitialChip label={reporterLabel} colors={['#8B5CF6', '#6366F1']} image={reporterImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>SOURCE:</Text>
                                    <Text style={styles.value} numberOfLines={2}>{reporterLabel} ({reporterRoleLabel})</Text>
                                </View>
                            </View>

                            <View style={styles.arrowWrap}>
                                <Feather name="arrow-right" size={14} color="#F43F5E" />
                            </View>

                            <View style={[styles.flowPanel, styles.flowPanelTarget]}>
                                <InitialChip label={reportedLabel} colors={['#F43F5E', '#F97316']} image={reportedImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>TARGET:</Text>
                                    <Text style={styles.value} numberOfLines={2}>{reportedLabel}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <PressableScale
                                style={[styles.btn, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}
                                onPress={onResolve}
                            >
                                <Feather name="check-circle" size={14} color="#10B981" />
                                <Text style={[styles.btnText, { color: '#10B981' }]}>RESOLVE</Text>
                            </PressableScale>

                            <PressableScale
                                style={[styles.btn, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}
                                onPress={onRestrict}
                            >
                                <MaterialCommunityIcons name="account-cancel" size={14} color="#EF4444" />
                                <Text style={[styles.btnText, { color: '#EF4444' }]}>RESTRICT</Text>
                            </PressableScale>

                            <View style={{ flex: 1 }} />
                            <View style={styles.openHint}>
                                <Feather name="chevron-right" size={16} color="#64748B" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </LinearGradient>

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
        </Animated.View>
    );
};

/* ───────────────────────── MAIN SCREEN ───────────────────────── */

const ReportedUsers = () => {
    const router = useRouter(); 
    const [reports, setReports] = useState<any[]>([]);
    const [adminAlerts, setAdminAlerts] = useState<any[]>([]); 
    const [usersMap, setUsersMap] = useState<Record<string, any>>({}); 
    const [loading, setLoading] = useState(true);

    const scrollY = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const sirenSwing = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const floatY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 🔥 SYSTEM LOGIC: Monitoring User Nodes for Safety Compliance (Red Siren Protocol)
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const map: Record<string, any> = {};
            snap.docs.forEach(d => { map[d.id] = d.data(); });
            setUsersMap(map);
        });

        // 🚨 LIVE AUDIT: Community generated reports synchronized by timestamp
        const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setReports(snap.docs.map(d => ({ id: d.id, _collection: 'reports', ...d.data() })));
            setLoading(false);
        });

        // 🔥 SYSTEM LOGIC: Fetching Internal Host Safety Alerts
        const qAlerts = query(collection(db, "admin_alerts"), orderBy("timestamp", "desc"));
        const unsubAlerts = onSnapshot(qAlerts, (snap) => {
           setAdminAlerts(
    snap.docs
        .filter(d => d.data().type !== 'TRUST_SAFETY_REPORT')
        .map(d => ({ id: d.id, _collection: 'admin_alerts', ...d.data() }))
);
        });

        return () => { 
            unsubscribe(); 
            unsubAlerts(); 
            unsubUsers(); 
        };
    }, []);

    // Ambient animations: header entrance, swinging siren icon, loader spin, empty-state float
    useEffect(() => {
        Animated.spring(headerIn, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();

        const swingLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(sirenSwing, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sirenSwing, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

    // 🔥 SYSTEM LOGIC: Synchronizing dual moderation streams into chronological sequence
    const combinedData = [...reports, ...adminAlerts].sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.timestamp?.seconds || 0;
        const timeB = b.createdAt?.seconds || b.timestamp?.seconds || 0;
        return timeB - timeA;
    });

    // Summary numbers for the stats strip
    const stats = useMemo(() => {
        const all = [...reports, ...adminAlerts];
        const resolved = all.filter(r => r.status === 'resolved').length;
        return {
            total: all.length,
            open: all.length - resolved,
            resolved,
            alerts: adminAlerts.length,
        };
    }, [reports, adminAlerts]);

    const handleAction = async (reportId: string, status: string, collectionName: string = "reports") => {
        try {
            await updateDoc(doc(db, collectionName, reportId), { status: status });
            Alert.alert("Success", `Audit record marked as ${status}`);
        } catch (error) {
            console.error(error);
        }
    };

    // 🔥 SYSTEM LOGIC: Permanent Access Restriction Protocol
    const handleBanUser = async (targetUserId: string | undefined, reportId: string, collectionName: string) => {
        Alert.alert("Confirm Restriction", "Permanently restrict this user's platform access?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "RESTRICT ACCESS", 
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (targetUserId) {
                            // Triggers instantaneous credential synchronization and session termination
                            await updateDoc(doc(db, "users", targetUserId), {
                                isBlocked: true,
                                status: 'Blocked',
                                forceLogout: true 
                            });
                        }
                        await updateDoc(doc(db, collectionName, reportId), { status: 'resolved' });
                        Alert.alert("RESTRICTED", "User has been permanently restricted from the platform.");
                    } catch (e) {
                        Alert.alert("Error", "Failed to modify user access.");
                    }
                }
            }
        ]);
    };

    const renderReportItem = ({ item, index }: any) => {
        const isAlert = item._collection === 'admin_alerts';
        
        // 🔥 SATTI FIX: Dynamic mapping for precise Source and Target attribution
        let reporterLabel = "Unknown Source";
        let reporterRoleLabel = "USER";
        let reportedLabel = "Unknown Target";
        let targetUserId = "";
        let reporterUserId = ""; // 🔥 NEW: needed to fetch the reporter's live name + image

        if (isAlert) {
            if (item.type === 'USER_BLOCKED_EXPERT') {
                // User reported the Host
                reporterLabel = item.userName || "User";
                reporterRoleLabel = "USER";
                reportedLabel = item.expertName || "Host";
                targetUserId = item.expertId;
                reporterUserId = item.userId || "";
            } else if (item.type === 'EXPERT_BLOCKED_USER') {
                // Host reported the User
                reporterLabel = item.expertName || "Host";
                reporterRoleLabel = "HOST";
                reportedLabel = item.userName || "User";
                targetUserId = item.userId;
                reporterUserId = item.expertId || "";
            } else {
                // Fallback for older admin alerts
                reporterLabel = item.expertName || "System";
                reporterRoleLabel = "HOST";
                reportedLabel = item.userName || "Target";
                targetUserId = item.userId || item.expertId;
                reporterUserId = item.expertId || "";
            }
        } else {
            // Standard Reports Collection
            reporterLabel = item.reporterName;
            reporterRoleLabel = item.reporterRole;
            reportedLabel = item.reportedName;
            targetUserId = item.reportedId;
            reporterUserId = item.reporterId || item.reporterUid || "";
        }

        // 🔥 NEW: LIVE NAME (from users `name` field) + PROFILE IMAGE for both SOURCE and TARGET
        const reporterDoc = usersMap[reporterUserId || ''];
        const reportedDoc = usersMap[targetUserId || ''];
        reporterLabel = getUserName(reporterDoc, reporterLabel);
        reportedLabel = getUserName(reportedDoc, reportedLabel);
        const reporterImage = getUserImage(reporterDoc);
        const reportedImage = getUserImage(reportedDoc);

        const timeSecs = item.createdAt?.seconds || item.timestamp?.seconds;

        // 🔥 CRITICAL COMPLIANCE CHECK (Red Siren)
        const targetUser = usersMap[targetUserId || ''];
        const blockCount = targetUser?.expertBlockCount || 0;
        const isCriticalRisk = blockCount >= 5;

        // 🔥 SATTI UPDATE: BULLETPROOF TARGET ROUTING 🔥
        // Explicitly defining role based on alert type to prevent missing map data bugs
        let finalTargetRole = 'user';
        if (isAlert) {
            if (item.type === 'USER_BLOCKED_EXPERT') finalTargetRole = 'expert';
            else if (item.type === 'EXPERT_BLOCKED_USER') finalTargetRole = 'user';
            else finalTargetRole = targetUser?.role || 'user';
        } else {
            finalTargetRole = targetUser?.role || (item.reportedRole ? item.reportedRole.toLowerCase() : 'user');
        }

        const handleCardPress = () => {
    if (!targetUserId) {
        Alert.alert("Error", "Target ID not found in database.");
        return;
    }
    
    try {
        // Checks if the TARGET is Expert/Host and sends exactly to their passbook
        if (finalTargetRole === 'expert' || finalTargetRole === 'host') {
            // 🔥 SATTI FIX: Added parenthesis around (admin)
            router.push(`/(admin)/passbook/expert-detail/${targetUserId}` as any);
        } else {
            // 🔥 SATTI FIX: Added parenthesis around (admin)
            router.push(`/(admin)/passbook/user-detail/${targetUserId}` as any);
        }
    } catch (e) {
        console.log("Routing Error: ", e);
    }
};
        return (
            <ReportCard
                item={item}
                index={index}
                isAlert={isAlert}
                isCriticalRisk={isCriticalRisk}
                blockCount={blockCount}
                reporterLabel={reporterLabel}
                reporterRoleLabel={reporterRoleLabel}
                reportedLabel={reportedLabel}
                targetUserId={targetUserId}
                timeSecs={timeSecs}
                reporterImage={reporterImage}
                reportedImage={reportedImage}
                onCardPress={handleCardPress}
                onResolve={() => handleAction(item.id, 'resolved', item._collection)}
                onRestrict={() => handleBanUser(targetUserId, item.id, item._collection)}
            />
        );
    };

    const headerTranslate = headerIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] });
    const swingY = sirenSwing.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '24deg'] });
    const swingX = sirenSwing.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '-10deg'] });
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
                        <Text style={styles.title}>PLATFORM MODERATION</Text>
                        <Text style={styles.subtitle}>Community safety and compliance terminal</Text>
                    </View>

                    {/* 3D swinging shield badge */}
                    <Animated.View style={{ transform: [{ perspective: 600 }, { rotateY: swingY }, { rotateX: swingX }] }}>
                        <LinearGradient colors={['#F43F5E', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shieldRing}>
                            <View style={styles.shieldInner}>
                                <MaterialCommunityIcons name="shield-alert" size={24} color="#FB7185" />
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* live stats strip */}
                <View style={styles.statsStrip}>
                    <StatChip label="TOTAL" value={stats.total} color="#E2E8F0" />
                    <View style={styles.statDivider} />
                    <StatChip label="OPEN" value={stats.open} color="#F43F5E" />
                    <View style={styles.statDivider} />
                    <StatChip label="RESOLVED" value={stats.resolved} color="#10B981" />
                    <View style={styles.statDivider} />
                    <StatChip label="ALERTS" value={stats.alerts} color="#F59E0B" />
                </View>
            </Animated.View>

            {loading ? (
                <View style={styles.loaderArea}>
                    <View style={styles.loaderWrap}>
                        <Animated.View style={[styles.loaderRing, { transform: [{ rotate: spinDeg }] }]} />
                        <ActivityIndicator color="#F43F5E" size="small" />
                    </View>
                </View>
            ) : (
                <Animated.FlatList
                    data={combinedData}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderReportItem as any}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Animated.View style={{ transform: [{ translateY: floatTranslate }] }}>
                                <MaterialCommunityIcons name="shield-check-outline" size={64} color="#334155" />
                            </Animated.View>
                            <Text style={styles.empty}>System clear. No safety reports documented.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05020A' },

    /* header */
    header: { paddingTop: 60, paddingHorizontal: 22, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#F43F5E', fontSize: 10, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
    shieldRing: { padding: 2, borderRadius: 18, shadowColor: '#F43F5E', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
    shieldInner: { backgroundColor: '#12061C', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

    /* stats strip */
    statsStrip: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, paddingVertical: 14, borderRadius: 22, backgroundColor: 'rgba(20,10,30,0.7)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.18)' },
    statChip: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
    statDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.14)', marginVertical: 4 },

    /* loader / empty */
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
    loaderRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: 'rgba(30,41,59,0.9)', borderTopColor: '#F43F5E', borderRightColor: '#8B5CF6' },
    emptyContainer: { alignItems: 'center', marginTop: 90 },
    empty: { color: '#475569', textAlign: 'center', marginTop: 18, fontWeight: '600' },

    /* card */
    cardWrap: { marginBottom: 28 },
    depthLayer: { position: 'absolute', height: 40, borderRadius: 28 },
    cardShadow: { shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
    cardBorder: { borderRadius: 28, padding: 1.5 },
    reportCard: { backgroundColor: '#0C0A18', padding: 20, borderRadius: 26.5, overflow: 'hidden' },
    sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
    criticalGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 28, borderWidth: 2.5, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    badgeText: { fontSize: 10, fontWeight: '900' },
    timeText: { color: '#64748B', fontSize: 10, fontWeight: '600' },
    sirenBox: { marginBottom: 14, padding: 12, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
    sirenText: { color: '#F87171', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, lineHeight: 15 },
    reportReason: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 16, lineHeight: 22 },

    /* source → target */
    flowRow: { flexDirection: 'row', alignItems: 'center' },
    flowPanel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 18, backgroundColor: 'rgba(139,92,246,0.08)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
    flowPanelTarget: { backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.22)' },
    arrowWrap: { width: 26, height: 26, borderRadius: 13, marginHorizontal: -3, zIndex: 2, backgroundColor: '#12061C', borderWidth: 1, borderColor: 'rgba(244,63,94,0.4)', alignItems: 'center', justifyContent: 'center' },
    initialChip: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    initialImage: { width: 34, height: 34, borderRadius: 12 }, // 🔥 NEW
    initialText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    label: { color: '#64748B', fontSize: 9, fontWeight: '900', marginBottom: 2 },
    value: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },

    /* actions */
    actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.14)', paddingTop: 15, gap: 10 },
    btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
    btnText: { fontSize: 11, fontWeight: '900', marginLeft: 6 },
    openHint: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center' },
});

export default ReportedUsers;