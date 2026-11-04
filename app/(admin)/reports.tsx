import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { sendNotificationToUser } from '../../utils/notificationHelper';

// ✅ Admin identify panna: UID (pazhaya) + Email (pudhusu) rendum work aagum
const ADMIN_UID = "jOQ0LxpaFkhuqIiMtOcYCGb3nEf2";
const ADMIN_EMAILS = ["kmr150892@gmail.com"];

const FILTERS = ['unread', 'reviewing', 'resolved', 'dismissed'] as const;
const STATUS_COLOR: any = { unread: '#F43F5E', reviewing: '#F59E0B', resolved: '#10B981', dismissed: '#64748B' };

// admin status maathina reporter-ku (host / user) pogum notification messages (neutral wording - reported user pathi sollala)
const STATUS_MESSAGES: any = {
    reviewing: { title: "Report Under Review 🔍", body: "Your Trust & Safety report is now being reviewed by our team." },
    resolved:  { title: "Report Reviewed ✅", body: "Our team has reviewed your report and taken the appropriate action. Thank you for helping keep TalkPe Pro safe." },
    dismissed: { title: "Report Reviewed", body: "Our team has reviewed your report and found no policy violation at this time. You can submit a new report if the issue continues." },
};

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
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

/* ============================================================
   🧊 FILTER TILE - 3D lift when active
   ============================================================ */
const FilterTile = ({ f, active, count, onPress }: { f: string; active: boolean; count: number; onPress: () => void }) => {
    const a = useRef(new Animated.Value(active ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(a, { toValue: active ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
    }, [active]);

    const color = STATUS_COLOR[f];

    return (
        <Animated.View
            style={{
                flex: 1,
                transform: [
                    { perspective: 700 },
                    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                    { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] }) },
                    { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
                ],
            }}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                style={[
                    styles.tab,
                    active && { backgroundColor: color + '33', borderColor: color, shadowColor: color, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
                ]}
            >
                <Text style={[styles.tabCount, { color: active ? '#FFF' : color }]}>{count}</Text>
                <Text style={[styles.tabText, active && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{f.toUpperCase()}</Text>
                <View style={[styles.tabBar, { backgroundColor: color, opacity: active ? 1 : 0.25 }]} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const ReportCard = ({ item, index, loop, pulse, shine, onStatus, onOpenUser, onRestrict, onOpenLedger }: any) => {
    const [reported, setReported] = useState<any>(null);
    const [reporter, setReporter] = useState<any>(null);
    const press = useRef(new Animated.Value(1)).current;

    // 🆕 reporter = host (pazhaya reports: expertId) illa user (pudhu reports: reporterId + reporterRole 'user')
    const reporterId: string = item.reporterId || item.expertId || '';
    const reporterIsUser = String(item.reporterRole || 'expert').toLowerCase() === 'user';
    const reporterName = item.reporterName || item.expertName;

    useEffect(() => {
        const load = async () => {
            try {
                if (item.reportedUserId) {
                    const s = await getDoc(doc(db, "users", item.reportedUserId));
                    if (s.exists()) setReported(s.data());
                }
                if (reporterId) {
                    const s = await getDoc(doc(db, "users", reporterId));
                    if (s.exists()) setReporter(s.data());
                }
            } catch (e) { console.log(e); }
        };
        load();
    }, [item.reportedUserId, reporterId]);

    const color = STATUS_COLOR[item.status] || '#F43F5E';
    // timestamp pending-ah irundha createdAt (number) use pannum
    const when = item.timestamp?.toDate
        ? item.timestamp.toDate().toLocaleString('en-IN')
        : typeof item.createdAt === 'number' ? new Date(item.createdAt).toLocaleString('en-IN') : '';
    const pic = (u: any, n: string) => u?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(n || 'U')}&background=0F172A&color=fff`;

    // reported user details (ledger routing + flags + typed name)
    const typedName = String(item.reportedUser || '').trim();
    const reportedRole = reported?.role ? String(reported.role).toLowerCase() : 'user';
    // 🆕 user, host-a report pannina reported side "HOST" nu kaattum
    const reportedIsHost = reportedRole === 'expert' || reportedRole === 'host';
    const blockCount = reported?.expertBlockCount || 0;
    const done = item.status === 'resolved' || item.status === 'dismissed';

    // card tap -> REPORTED user-oda ledger
    const handleCardPress = () => {
        if (!item.reportedUserId) {
            Alert.alert(
                "No user selected",
                typedName
                    ? `The reporter did not pick a ${reporterIsUser ? 'host' : 'user'} from the list. Typed name: "${typedName}".`
                    : `The ${reporterIsUser ? 'user' : 'host'} did not mention any specific person in this report.`
            );
            return;
        }
        onOpenLedger(item.reportedUserId, reportedRole);
    };

    // 🆕 animation derivations
    const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
    const haloScale = loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
    const haloOpacity = loop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    const arrowX = pulse.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-90, 320] });
    const restrictScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });

    return (
        <Pop index={index} style={styles.cardWrap}>
            <Animated.View style={{ transform: [{ scale: press }] }}>
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={handleCardPress}
                    onPressIn={() => Animated.spring(press, { toValue: 0.98, friction: 6, tension: 120, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start()}
                    style={[{ shadowColor: color, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }, done && { opacity: 0.7 }]}
                >
                    <LinearGradient
                        colors={[color, color + '33', color]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardBorder}
                    >
                        <View style={styles.card}>
                            <LinearGradient
                                colors={[color + '1F', 'transparent', 'rgba(99,102,241,0.1)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <MaterialCommunityIcons name="shield-alert" size={120} color={color + '0D'} style={styles.cardWatermark} />

                            <View style={styles.rowBetween}>
                                <View style={styles.chipGroup}>
                                    <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color + '88', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                        <Animated.View style={[styles.statusDot, { backgroundColor: color, opacity: item.status === 'unread' || !item.status ? dotOpacity : 1 }]} />
                                        <Text style={[styles.chipText, { color }]}>{String(item.status || 'unread').toUpperCase()}</Text>
                                    </View>
                                    {/* 🆕 evaru report pannaanga - HOST / USER */}
                                    <View style={[
                                        styles.chip,
                                        { flexDirection: 'row', alignItems: 'center', gap: 5 },
                                        reporterIsUser
                                            ? { backgroundColor: 'rgba(14,165,233,0.15)', borderColor: '#0EA5E9' }
                                            : { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: '#6366F1' }
                                    ]}>
                                        <MaterialCommunityIcons
                                            name={reporterIsUser ? 'account-outline' : 'headset'}
                                            size={11}
                                            color={reporterIsUser ? '#38BDF8' : '#A5B4FC'}
                                        />
                                        <Text style={[styles.chipText, { color: reporterIsUser ? '#38BDF8' : '#A5B4FC' }]}>{reporterIsUser ? 'FROM USER' : 'FROM HOST'}</Text>
                                    </View>
                                </View>
                                {item.priority === 'high' && (
                                    <Animated.View style={[styles.chip, { backgroundColor: '#EF444422', borderColor: '#EF4444', transform: [{ scale: restrictScale }] }]}>
                                        <Text style={[styles.chipText, { color: '#EF4444' }]}>HIGH PRIORITY</Text>
                                    </Animated.View>
                                )}
                            </View>

                            <Text style={styles.category}>{item.categoryLabel || item.category}</Text>
                            <Text style={styles.time}>{when}  •  Ref {String(item.id).slice(0, 8).toUpperCase()}</Text>

                            {/* FORM DETAILS - reporter form-la enna problem solli report pannaanga */}
                            <View style={styles.formBox}>
                                <View style={styles.formHead}>
                                    <MaterialCommunityIcons name="text-box-outline" size={14} color="#A5B4FC" />
                                    <Text style={styles.formLabel}>{reporterIsUser ? "USER'S REPORT FORM" : "HOST'S REPORT FORM"}</Text>
                                </View>
                                <View style={styles.formRow}>
                                    <Text style={styles.formKey}>CATEGORY</Text>
                                    <Text style={styles.formVal}>{item.categoryLabel || item.category || '-'}</Text>
                                </View>
                                <View style={styles.formRow}>
                                    <Text style={styles.formKey}>PRIORITY</Text>
                                    <Text style={[styles.formVal, item.priority === 'high' && { color: '#EF4444' }]}>{String(item.priority || 'normal').toUpperCase()}</Text>
                                </View>
                                {!!typedName && (
                                    <View style={styles.formRow}>
                                        <Text style={styles.formKey}>USER TYPED</Text>
                                        <Text style={styles.formVal}>{typedName}</Text>
                                    </View>
                                )}
                                <Text style={styles.formKey}>DESCRIPTION</Text>
                                <Text style={styles.desc}>{item.description || 'No description provided.'}</Text>
                            </View>

                            <View style={styles.peopleRow}>
                                <View style={styles.person}>
                                    <Text style={styles.pLabel}>REPORTED BY</Text>
                                    <Image source={{ uri: pic(reporter, reporterName) }} style={styles.avatar} />
                                    <Text style={styles.pName} numberOfLines={1}>{reporter?.name || reporterName || (reporterIsUser ? 'User' : 'Host')}</Text>
                                </View>
                                <Animated.View style={{ transform: [{ translateX: arrowX }] }}>
                                    <MaterialCommunityIcons name="arrow-right-bold" size={20} color="#475569" />
                                </Animated.View>
                                <View style={styles.person}>
                                    <Text style={styles.pLabel}>{reportedIsHost ? 'REPORTED HOST' : 'REPORTED USER'}</Text>
                                    <View style={styles.avatarHaloWrap}>
                                        <Animated.View style={[styles.avatarHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                                        <Image source={{ uri: pic(reported, item.reportedUserName) }} style={[styles.avatar, { borderColor: '#F43F5E' }]} />
                                    </View>
                                    <Text style={styles.pName} numberOfLines={1}>{reported?.name || item.reportedUserName || item.reportedUser || 'Not specified'}</Text>
                                    {item.reportedUserId ? (
                                        <>
                                            <Text style={styles.pId} numberOfLines={1}>ID: {item.reportedUserId.slice(0, 10)}...</Text>
                                            <Text style={[styles.pId, { color: blockCount > 0 ? '#F87171' : '#64748B' }]}>FLAGS: {blockCount}</Text>
                                        </>
                                    ) : (
                                        <Text style={[styles.pId, { color: '#F59E0B' }]}>No ID (typed name)</Text>
                                    )}
                                </View>
                            </View>

                            {/* ledger buttons (reported user + reporter) */}
                            <View style={styles.actions}>
                                {!!item.reportedUserId && (
                                    <TouchableOpacity style={[styles.btn, { borderColor: '#F43F5E', backgroundColor: 'rgba(244,63,94,0.1)' }]} onPress={() => onOpenLedger(item.reportedUserId, reportedRole)}>
                                        <MaterialCommunityIcons name="book-account-outline" size={14} color="#F87171" />
                                        <Text style={[styles.btnText, { color: '#F87171' }]}>REPORTED LEDGER</Text>
                                    </TouchableOpacity>
                                )}
                                {!!reporterId && (
                                    <TouchableOpacity style={[styles.btn, { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }]} onPress={() => onOpenLedger(reporterId, reporterIsUser ? 'user' : 'expert')}>
                                        <MaterialCommunityIcons name="book-account-outline" size={14} color="#A5B4FC" />
                                        <Text style={[styles.btnText, { color: '#A5B4FC' }]}>{reporterIsUser ? 'USER LEDGER' : 'HOST LEDGER'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.actions}>
                                {!!item.reportedUserId && (
                                    <TouchableOpacity style={[styles.btn, { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.1)' }]} onPress={() => onOpenUser(item.reportedUserId)}>
                                        <Ionicons name="person-outline" size={14} color="#A5B4FC" />
                                        <Text style={[styles.btnText, { color: '#A5B4FC' }]}>PROFILE</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={[styles.btn, { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' }]} onPress={() => onStatus(item, 'reviewing')}>
                                    <Text style={[styles.btnText, { color: '#F59E0B' }]}>REVIEWING</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }]} onPress={() => onStatus(item, 'resolved')}>
                                    <Text style={[styles.btnText, { color: '#10B981' }]}>RESOLVE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, { borderColor: '#64748B', backgroundColor: 'rgba(100,116,139,0.1)' }]} onPress={() => onStatus(item, 'dismissed')}>
                                    <Text style={[styles.btnText, { color: '#94A3B8' }]}>DISMISS</Text>
                                </TouchableOpacity>
                            </View>

                            {!!item.reportedUserId && item.status !== 'resolved' && (
                                <TouchableOpacity style={styles.restrictBtn} onPress={() => onRestrict(item)} activeOpacity={0.85}>
                                    <LinearGradient
                                        colors={['#EF4444', '#B91C1C', '#7F1D1D']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Animated.View pointerEvents="none" style={[styles.btnShine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                                        <LinearGradient
                                            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{ flex: 1 }}
                                        />
                                    </Animated.View>
                                    <MaterialCommunityIcons name="account-cancel-outline" size={16} color="#FFF" />
                                    <Text style={styles.restrictText}>RESTRICT REPORTED USER</Text>
                                </TouchableOpacity>
                            )}
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

export default function AdminReportsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<typeof FILTERS[number]>('unread');

    // ✅ FIX: null = innum check panra, true = admin, false = admin illa
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    /* ---------- 🎞️ ANIMATION VALUES ---------- */
    const loop = useRef(new Animated.Value(0)).current;       // linear 0→1 (halo, particles)
    const pulse = useRef(new Animated.Value(0)).current;      // yoyo pulse (dots, arrows, buttons)
    const shine = useRef(new Animated.Value(0)).current;      // button shine sweep
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

        const l1 = Animated.loop(Animated.timing(loop, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        const l2 = yoyo(pulse, 1100);
        const l3 = Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(shine, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const l4 = yoyo(orbA, 6000);
        const l5 = yoyo(orbB, 7500, 800);

        [l1, l2, l3, l4, l5].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5].forEach(l => l.stop());
    }, []);

    // ✅ FIX: auth load aagura varaikkum wait pannum, appuram UID / Email / role check pannum
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) { setIsAdmin(false); return; }

            const email = (user.email || '').toLowerCase();
            if (user.uid === ADMIN_UID || ADMIN_EMAILS.includes(email)) {
                setIsAdmin(true);
                return;
            }

            // fallback: users collection-la role check
            try {
                const s = await getDoc(doc(db, "users", user.uid));
                const data: any = s.data() || {};
                const role = String(data.role || '').toLowerCase();
                setIsAdmin(role === 'admin' || data.isAdmin === true);
            } catch {
                setIsAdmin(false);
            }
        });
        return () => unsubAuth();
    }, []);

    useEffect(() => {
        if (isAdmin !== true) {
            if (isAdmin === false) setLoading(false);
            return;
        }
        const q = query(collection(db, "admin_alerts"), where("type", "==", "TRUST_SAFETY_REPORT"));
        const unsub = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            // 🆕 HOST queue: user reports inga theriyaadhu (pazhaya host reports-la reporterRole illa, adhunaala !== 'user')
            setReports(rows.filter((r) => String(r.reporterRole || 'expert').toLowerCase() !== 'user'));
            setLoading(false);
        }, (error) => {
            console.log("Reports listener error:", error?.code);
            setLoading(false);
        });
        return () => unsub();
    }, [isAdmin]);

    // status update + reporter-ku (host / user) notification (same status thirumba thottaa duplicate notification pogaadhu)
    const setStatus = async (item: any, status: string) => {
        try {
            await updateDoc(doc(db, "admin_alerts", item.id), {
                status,
                reviewedBy: auth.currentUser?.uid,
                reviewedAt: serverTimestamp()
            });
            // 🆕 reporter-ku notification (user report-na reporterId, host report-na expertId)
            const notifyId = item.reporterId || item.expertId;
            const msg = STATUS_MESSAGES[status];
            if (msg && notifyId && item.status !== status) {
                await sendNotificationToUser(
                    notifyId,
                    msg.title,
                    `${msg.body}\n\nRef: ${String(item.id).slice(0, 8).toUpperCase()}`,
                    "system"
                ).catch(() => {});
            }
        } catch (e) { Alert.alert("Error", "Could not update status."); }
    };

    // user-oda ledger (passbook detail) open panna - host-na expert-detail, user-na user-detail
    const openLedger = (userId: string, role?: string) => {
        if (!userId) {
            Alert.alert("Error", "User ID not found for this report.");
            return;
        }
        try {
            if (role === 'expert' || role === 'host') {
                router.push(`/(admin)/passbook/expert-detail/${userId}` as any);
            } else {
                router.push(`/(admin)/passbook/user-detail/${userId}` as any);
            }
        } catch (e) {
            console.log("Routing Error: ", e);
        }
    };

    // management/reports.tsx-la work aagura same fields (isBlocked / status / forceLogout) + pazhaya isBanned fields
    const restrictUser = (item: any) => {
        Alert.alert("Restrict User", "This will restrict the reported user's account. Continue?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Restrict", style: "destructive",
                onPress: async () => {
                    try {
                        await updateDoc(doc(db, "users", item.reportedUserId), {
                            isBanned: true,
                            bannedAt: serverTimestamp(),
                            bannedReason: item.categoryLabel || 'Policy violation',
                            isBlocked: true,
                            status: 'Blocked',
                            forceLogout: true
                        });
                        await setStatus(item, 'resolved');
                        Alert.alert("Done", "User restricted and report resolved.");
                    } catch (e) { Alert.alert("Error", "Action failed."); }
                }
            }
        ]);
    };

    // ✅ FIX: auth check mudiyara varaikkum loader kaattum (denied flash aagaadhu)
    if (isAdmin === null) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#F43F5E" />
            </View>
        );
    }

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }}>
                    <MaterialCommunityIcons name="shield-lock" size={50} color="#F43F5E" />
                </Animated.View>
                <Text style={styles.denied}>ADMIN ACCESS ONLY</Text>
            </View>
        );
    }

    const list = reports.filter((r) => (r.status || 'unread') === filter);
    const count = (s: string) => reports.filter((r) => (r.status || 'unread') === s).length;

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const liveOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
    const shieldHaloScale = loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
    const shieldHaloOpacity = loop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0B0A24', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🌌 BACKGROUND DEPTH: aurora orbs + particles */}
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
                            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
                            transform: [{ translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, p.range / 6] }) }],
                        },
                    ]}
                />
            ))}

            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.back}>
                        <Ionicons name="chevron-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <View style={styles.hLabelRow}>
                            <Animated.View style={[styles.liveDot, { opacity: liveOpacity }]} />
                            <Text style={styles.hLabel}>TRUST & SAFETY</Text>
                        </View>
                        <Text style={styles.hTitle}>HOST REPORT QUEUE</Text>
                    </View>
                    <View style={styles.shieldWrap}>
                        <Animated.View style={[styles.shieldHalo, { opacity: shieldHaloOpacity, transform: [{ scale: shieldHaloScale }] }]} />
                        <MaterialCommunityIcons name="shield-alert" size={24} color="#F43F5E" />
                    </View>
                </View>
                <View style={styles.tabs}>
                    {FILTERS.map((f) => (
                        <FilterTile key={f} f={f} active={filter === f} count={count(f)} onPress={() => setFilter(f)} />
                    ))}
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#F43F5E" /></View>
            ) : (
                <FlatList
                    data={list}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Animated.View style={{ transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
                                <MaterialCommunityIcons name="shield-check-outline" size={48} color="#334155" />
                            </Animated.View>
                            <Text style={styles.empty}>No reports in this list.</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <ReportCard
                            item={item}
                            index={index}
                            loop={loop}
                            pulse={pulse}
                            shine={shine}
                            onStatus={setStatus}
                            onRestrict={restrictUser}
                            onOpenLedger={openLedger}
                            onOpenUser={(id: string) => router.push({ pathname: '/user-detail', params: { userId: id } } as any)}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    denied: { color: '#F43F5E', fontWeight: '900', letterSpacing: 3, marginTop: 12 },

    /* background */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -60, right: -90, backgroundColor: 'rgba(244,63,94,0.15)' },
    orbB: { width: 240, height: 240, top: 460, left: -110, backgroundColor: 'rgba(99,102,241,0.16)' },
    particle: { position: 'absolute', backgroundColor: '#F43F5E' },

    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    back: { padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    hLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F43F5E' },
    hLabel: { color: '#F43F5E', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    hTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    shieldWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(244,63,94,0.1)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.35)', alignItems: 'center', justifyContent: 'center' },
    shieldHalo: { position: 'absolute', width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, borderColor: '#F43F5E' },

    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6 },
    tab: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(15,23,42,0.7)' },
    tabCount: { fontSize: 20, fontWeight: '900' },
    tabText: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
    tabBar: { width: 20, height: 3, borderRadius: 2, marginTop: 8 },

    empty: { color: '#64748B', textAlign: 'center', marginTop: 12, fontWeight: '700' },
    emptyWrap: { alignItems: 'center', marginTop: 60 },

    cardWrap: { marginBottom: 14 },
    cardBorder: { borderRadius: 24, padding: 1.2 },
    card: { padding: 16, borderRadius: 23, backgroundColor: 'rgba(10,6,28,0.97)', overflow: 'hidden' },
    cardWatermark: { position: 'absolute', right: -16, top: 30 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
    chipGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, borderWidth: 1 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    chipText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
    category: { color: '#FFF', fontSize: 17, fontWeight: '900', marginTop: 12 },
    time: { color: '#64748B', fontSize: 10.5, fontWeight: '700', marginTop: 4 },
    desc: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginTop: 6, fontWeight: '600' },
    peopleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 16, padding: 12, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    person: { alignItems: 'center', flex: 1 },
    pLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    avatarHaloWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    avatarHalo: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#F43F5E' },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#6366F1', backgroundColor: '#0F172A' },
    pName: { color: '#FFF', fontSize: 12.5, fontWeight: '800', marginTop: 6, maxWidth: 120 },
    pId: { color: '#64748B', fontSize: 9.5, fontWeight: '700', marginTop: 2 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    btnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    restrictBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: '#B91C1C', overflow: 'hidden', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    btnShine: { position: 'absolute', top: -20, bottom: -20, width: 36 },
    restrictText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

    // reporter report form details box
    formBox: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
    formHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    formLabel: { color: '#A5B4FC', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
    formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    formKey: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
    formVal: { color: '#E2E8F0', fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right', marginLeft: 12 }
});
