import { Entypo, Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { collection, doc, increment, onSnapshot, query, serverTimestamp, Unsubscribe, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

const TABS = ['DASHBOARD', 'HOSTS', 'SETTLEMENTS'];
const TAB_CONTAINER_WIDTH = width - 40;
const TAB_WIDTH = (TAB_CONTAINER_WIDTH - 8) / TABS.length;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 🆕🆕 NEW: Onboarding queue - host register aagumbothu role / status eppadi save aanaalum queue-la varum
// (pudhu status vera maadhiri irundha inga serthukko)
const HOST_ROLES = ['expert', 'host'];
const PENDING_STATUSES = [
    'Pending', 'pending', 'PENDING',
    'Under Review', 'under_review', 'UNDER_REVIEW',
    'Submitted', 'submitted',
    'Pending Review', 'pending_review',
    'In Review', 'in_review'
];

// 🆕🆕 NEW: Firestore Timestamp / millis / Date - edhaa irundhalum millis-aa maathum (newest application mela kaata)
const toMillis = (ts: any): number => {
    try {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        const t = new Date(ts).getTime();
        return isNaN(t) ? 0 : t;
    } catch (e) {
        return 0;
    }
};

const getGreeting = (d: Date) => {
    const h = d.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const formatClock = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m < 10 ? '0' + m : m} ${ampm}`;
};

/* ───────────────────────── REUSABLE BUILDING BLOCKS ───────────────────────── */

// 3D press: card tilts back + scales down when touched
const Press3D = ({ children, onPress, style, disabled }: any) => {
    const p = useRef(new Animated.Value(0)).current;
    const pressIn = () => Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    const pressOut = () => Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
    const rotateX = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
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
            duration: 500,
            delay: index * 70,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
            {children}
        </Animated.View>
    );
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
            <Animated.View
                style={{
                    position: 'absolute', width: size, height: size, borderRadius: size / 2,
                    backgroundColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }]
                }}
            />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// Floating glow orbs in background (depth feel)
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
            <Animated.View style={[styles.orb, { bottom: 120, left: -120, width: 320, height: 320, backgroundColor: '#A855F7', opacity: 0.09, transform: [{ translateY: bY }, { translateX: bX }] }]} />
        </View>
    );
};

// Section heading with thin accent bar (dashboard style)
const SectionHeader = ({ title, right }: any) => (
    <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitleInline}>{title}</Text>
        {right ? <View style={{ marginLeft: 'auto' }}>{right}</View> : null}
    </View>
);

// KPI card (horizontal strip)
const KpiCard = ({ label, value, color, icon, caption, onPress }: any) => (
    <Press3D onPress={onPress} style={[styles.kpiCard, { borderColor: `${color}40`, shadowColor: color }]}>
        <View style={[styles.kpiGlow, { backgroundColor: color }]} />
        <View style={styles.kpiTop}>
            <View style={[styles.kpiIcon, { backgroundColor: `${color}1F`, borderColor: `${color}50` }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <View style={[styles.kpiChip, { backgroundColor: `${color}1A` }]}>
                <Text style={[styles.kpiChipText, { color }]}>{caption}</Text>
            </View>
        </View>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
    </Press3D>
);

// Animated workload distribution bar (uses REAL pending counts)
const WorkloadBar = ({ hosts, kyc, support }: { hosts: number; kyc: number; support: number }) => {
    const grow = useRef(new Animated.Value(0)).current;
    const total = hosts + kyc + support;
    useEffect(() => {
        grow.setValue(0);
        Animated.timing(grow, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [hosts, kyc, support]);

    const seg = (count: number) => grow.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', `${total === 0 ? 0 : (count / total) * 100}%`]
    });

    const legend = [
        { label: 'Host audits', count: hosts, color: '#F59E0B' },
        { label: 'KYC reviews', count: kyc, color: '#10B981' },
        { label: 'Support reports', count: support, color: '#6366F1' }
    ];

    return (
        <View>
            <View style={styles.workloadTrack}>
                {total === 0 ? (
                    <View style={styles.workloadEmpty} />
                ) : (
                    <>
                        <Animated.View style={{ width: seg(hosts) as any, height: '100%', backgroundColor: '#F59E0B' }} />
                        <Animated.View style={{ width: seg(kyc) as any, height: '100%', backgroundColor: '#10B981' }} />
                        <Animated.View style={{ width: seg(support) as any, height: '100%', backgroundColor: '#6366F1' }} />
                    </>
                )}
            </View>
            <View style={styles.legendRow}>
                {legend.map((l) => (
                    <View key={l.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                        <View>
                            <Text style={styles.legendCount}>{l.count}</Text>
                            <Text style={styles.legendLabel}>{l.label}</Text>
                        </View>
                    </View>
                ))}
            </View>
            <Text style={styles.workloadFoot}>
                {total === 0 ? 'No pending workload right now.' : `${total} open item${total > 1 ? 's' : ''} across all queues`}
            </Text>
        </View>
    );
};

// Row inside a grouped module panel
const ModuleRow = ({ title, sub, icon, route, color, badge, router, last }: any) => (
    <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.moduleRow, !last && styles.moduleRowBorder]}
        onPress={() => router.push(route as any)}
    >
        <View style={[styles.linkIconTile, { backgroundColor: `${color}1F`, borderColor: `${color}50` }]}>
            <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.moduleTitle}>{title}</Text>
            <Text style={styles.linkSub}>{sub}</Text>
        </View>
        {/* unread count badge (venum-na mattum varum) */}
        {badge > 0 && (
            <View style={styles.linkBadge}>
                <Text style={styles.linkBadgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
        )}
        <Entypo name="chevron-right" size={18} color="#475569" />
    </TouchableOpacity>
);

// Grouped panel container
const Panel = ({ children, style }: any) => <View style={[styles.panel, style]}>{children}</View>;

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

const AdminPanel = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const [loading, setLoading] = useState(true);
    const [pendingExperts, setPendingExperts] = useState<any[]>([]);
    const [bankRequests, setBankRequests] = useState<any[]>([]); 
    const [totalACTIVITY_REWARDPool, setTotalACTIVITY_REWARDPool] = useState(0);
    
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [minVersion, setMinVersion] = useState("1.0.5");
    const [savingVersion, setSavingVersion] = useState(false);

    // 🆕🆕 NEW: Support Hub-la irundhu vara review pannaadha (unread) HOST reports count
    const [supportReportCount, setSupportReportCount] = useState(0);

    // 🆕🆕 NEW: Support Hub-la irundhu USER anuppina review pannaadha (unread) reports count (thaniya)
    const [userReportCount, setUserReportCount] = useState(0);

    // 🆕 NEW: live clock for welcome banner
    const [now, setNow] = useState(new Date());

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const tabAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let unsubs: Unsubscribe[] = [];

        const unsubSettings = onSnapshot(doc(db, "system", "app_settings"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setIsMaintenance(data.isMaintenance || false);
                setMinVersion(data.minVersion ? data.minVersion.toString().trim() : "1.0.5");
            }
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Settings listener detached on logout");
        });
        unsubs.push(unsubSettings);

        const qWithdrawals = query(
            collection(db, "withdrawals"), 
            where("status", "in", ["Pending", "pending", "PENDING"])
        );
        const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
            let pendingSum = 0;
            snap.docs.forEach(d => { 
                const amt = d.data().amountRupee || d.data().amount || 0;
                pendingSum += Number(amt); 
            });
            setTotalACTIVITY_REWARDPool(pendingSum);
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Withdrawals listener detached on logout");
        });
        unsubs.push(unsubWithdrawals);

        // 🔧 FIX: Onboarding queue - role (expert / host) + status (ella pending variants) rendum accept pannum
        // 🆕🆕 NEW: Ippo rendu listener irukku -> (1) role+status match, (2) isApplying == true (pudhusa apply panra hosts)
        // rendayum merge panni (duplicate illama) Pending Hosts-la kaattum
        let roleList: any[] = [];
        let applyingList: any[] = [];
        const mergeExperts = () => {
            const map = new Map<string, any>();
            [...roleList, ...applyingList].forEach((e) => map.set(e.id, e));
            const merged = Array.from(map.values()).sort(
                (a, b) => toMillis(b.appliedAt || b.createdAt) - toMillis(a.appliedAt || a.createdAt)
            );
            setPendingExperts(merged);
            setLoading(false);
        };

        const qExperts = query(
            collection(db, "users"),
            where("role", "in", HOST_ROLES),
            where("status", "in", PENDING_STATUSES)
        );
        const unsubExperts = onSnapshot(qExperts, (snap) => {
            console.log("Onboarding queue:", snap.size, snap.docs.map(d => ({ id: d.id, role: d.data().role, status: d.data().status })));
            roleList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            mergeExperts();
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Experts listener detached on logout");
            // 🆕 vera error (index illa, etc.) varumbothu silent-aa vizhungaama log pannum
            else console.log("Experts listener error:", error.code, error.message);
            setLoading(false);
        });
        unsubs.push(unsubExperts);

        // 🆕🆕 NEW: Pudhusa onboarding apply panra hosts (isApplying == true) - role "user" ah irundhaalum queue-la varum
        const qApplying = query(
            collection(db, "users"),
            where("isApplying", "==", true)
        );
        const unsubApplying = onSnapshot(qApplying, (snap) => {
            console.log("New applications:", snap.size, snap.docs.map(d => ({ id: d.id, role: d.data().role, status: d.data().status })));
            applyingList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            mergeExperts();
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Applications listener detached on logout");
            else console.log("Applications listener error:", error.code, error.message);
            setLoading(false);
        });
        unsubs.push(unsubApplying);

        const qBank = query(
            collection(db, "adminNotifications"), 
            where("type", "==", "BANK_VERIFICATION"),
            where("status", "==", "pending")
        );
        const unsubBank = onSnapshot(qBank, (snap) => {
            setBankRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Bank requests listener detached on logout");
        });
        unsubs.push(unsubBank);

        // 🆕🆕 NEW: Support Hub reports (unread) live count - ore listener-la HOST / USER rendum thaniya pirichu count pannum
        // (reporterRole == 'user' na USER report, matha ellam (pazhaya host reports-um serthu) HOST report)
        const qSupport = query(
            collection(db, "admin_alerts"),
            where("type", "==", "TRUST_SAFETY_REPORT"),
            where("status", "==", "unread")
        );
        const unsubSupport = onSnapshot(qSupport, (snap) => {
            let hostCount = 0;
            let userCount = 0;
            snap.docs.forEach((d) => {
                if (String(d.data().reporterRole || '').toLowerCase() === 'user') userCount++;
                else hostCount++;
            });
            setSupportReportCount(hostCount);
            setUserReportCount(userCount);
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Support reports listener detached on logout");
        });
        unsubs.push(unsubSupport);

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        Animated.spring(tabAnim, {
            toValue: TABS.indexOf(activeTab),
            useNativeDriver: true,
            speed: 14,
            bounciness: 9
        }).start();
    }, [activeTab]);

    // ✅ SECURE ADMIN LOGOUT LOGIC (ABSOLUTE ROUTER FLUSH)
    const handleAdminLogout = () => {
        Alert.alert(
            "System Logout",
            "Are you sure you want to terminate the admin session?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Terminate", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // 1. Background-la memory clear panrom
                            await AsyncStorage.clear();
                            
                            // 2. Google session-ah safe-ah close panrom
                            try {
                                await GoogleSignin.signOut();
                            } catch (e) {
                                console.log("Google sign out skipped");
                            }
                            
                            // 3. Kadasiya Firebase Logout pandrom
                            await signOut(auth);

                            // 🔥 SATTI'S MASTER FIX: Stack wipe & proper redirect delay
                            setTimeout(() => {
                                if (router.canDismiss()) {
                                    router.dismissAll();
                                }
                                router.replace('/'); // auth-guard will push to login automatically from '/'
                            }, 300);

                        } catch (error) {
                            console.error("Logout Error:", error);
                            // Fallback Force Eject
                            if (router.canDismiss()) {
                                router.dismissAll();
                            }
                            router.replace('/');
                        }
                    } 
                }
            ]
        );
    };

    // ✅ OPERATIONAL SYNC: Redemptions logic synchronized with professional ledger standards
    const handleMarkAsPaid = async (withdrawalRequest: any) => {
        try {
            const userRef = doc(db, "users", withdrawalRequest.userId);
            const withdrawalRef = doc(db, "withdrawals", withdrawalRequest.id);
            const amountToProcess = Number(withdrawalRequest.amountRupee || withdrawalRequest.amount || 0);

            // 1. Update User Node - Synchronizing allocated balances
            await updateDoc(userRef, {
                pendingACTIVITY_REWARD: increment(-amountToProcess), 
                totalWithdrawnRs: increment(amountToProcess) 
            });

            // 2. Finalize Redemptions Status
            await updateDoc(withdrawalRef, {
                status: 'SUCCESS',
                paidAt: serverTimestamp()
            });

            Alert.alert("Success", "Operational Redemptions finalized.");
        } catch (error) {
            console.error("Ledger Sync Error:", error);
            Alert.alert("Error", "System failed to update Grant records.");
        }
    };

    const toggleMaintenance = async () => {
        const newStatus = !isMaintenance;
        Alert.alert(
            newStatus ? "⚠️ Enable Optimization Mode?" : "✅ Restore Live Access?",
            newStatus ? "This will restrict platform access for system maintenance." : "This will enable platform access for all users.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm", 
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, "system", "app_settings"), { isMaintenance: newStatus });
                        } catch (e) { console.log("System update failed", e); }
                    } 
                }
            ]
        );
    };

    const updateVersion = async () => {
        const cleanVersion = minVersion.trim();
        if (!cleanVersion) {
            Alert.alert("Error", "Version string cannot be null.");
            return;
        }
        setSavingVersion(true);
        try {
            await updateDoc(doc(db, "system", "app_settings"), { minVersion: cleanVersion });
            Alert.alert("Success ✅", `System baseline set to version ${cleanVersion}`);
        } catch (e) {
            Alert.alert("Error", "Configuration update failure.");
        } finally {
            setSavingVersion(false);
        }
    };

    const indicatorX = tabAnim.interpolate({
        inputRange: TABS.map((_, i) => i),
        outputRange: TABS.map((_, i) => i * TAB_WIDTH)
    });

    // 🆕 NEW: "Needs attention" queue built from REAL state
    const attentionItems: any[] = [];
    if (pendingExperts.length > 0) {
        attentionItems.push({
            key: 'hosts', color: '#F59E0B', icon: 'account-clock', priority: 'HIGH',
            title: `${pendingExperts.length} host profile${pendingExperts.length > 1 ? 's' : ''} awaiting audit`,
            sub: 'Review onboarding submissions',
            onPress: () => setActiveTab('HOSTS')
        });
    }
    if (bankRequests.length > 0) {
        attentionItems.push({
            key: 'kyc', color: '#10B981', icon: 'bank-check', priority: 'HIGH',
            title: `${bankRequests.length} KYC verification${bankRequests.length > 1 ? 's' : ''} pending`,
            sub: 'Bank details need review',
            onPress: () => setActiveTab('HOSTS')
        });
    }
    if (supportReportCount > 0) {
        attentionItems.push({
            key: 'support', color: '#6366F1', icon: 'headset', priority: 'MEDIUM',
            title: `${supportReportCount} unread host support report${supportReportCount > 1 ? 's' : ''}`,
            sub: 'Trust & safety reports from hosts (Support Hub)',
            onPress: () => router.push('/reports' as any)
        });
    }
    // 🆕🆕 NEW: user anuppina support reports (thaniya)
    if (userReportCount > 0) {
        attentionItems.push({
            key: 'usersupport', color: '#0EA5E9', icon: 'account-alert', priority: 'MEDIUM',
            title: `${userReportCount} unread user support report${userReportCount > 1 ? 's' : ''}`,
            sub: 'Trust & safety reports from users (Support Hub)',
            onPress: () => router.push('/user-reports' as any)
        });
    }
    if (totalACTIVITY_REWARDPool > 0) {
        attentionItems.push({
            key: 'rewards', color: '#A855F7', icon: 'cash-multiple', priority: 'MEDIUM',
            title: `₹${totalACTIVITY_REWARDPool.toLocaleString()} reward grants pending`,
            sub: 'Open settlements to audit',
            onPress: () => setActiveTab('SETTLEMENTS')
        });
    }
    if (isMaintenance) {
        attentionItems.push({
            key: 'maint', color: '#F43F5E', icon: 'wrench-clock', priority: 'ALERT',
            title: 'Platform is in optimization mode',
            sub: 'User access is currently restricted',
            onPress: toggleMaintenance
        });
    }

    const totalOpen = pendingExperts.length + bankRequests.length + supportReportCount + userReportCount;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <BackgroundOrbs />
            
            {/* ───── HEADER ───── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>TALKPE OS</Text>
                    <View style={styles.liveIndicator}>
                        <PulseDot color={isMaintenance ? '#F59E0B' : '#10B981'} size={6} />
                        <Text style={styles.liveText}>
                            {isMaintenance ? 'SYSTEM STATUS: OPTIMIZING' : 'SYSTEM MONITOR: OPERATIONAL'}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.profileBtn}>
                        <FontAwesome5 name="user-shield" size={18} color="#6366F1" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleAdminLogout}>
                        <MaterialCommunityIcons name="logout" size={18} color="#F43F5E" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ───── SEGMENTED TABS ───── */}
            <View style={styles.tabWrap}>
                <Animated.View style={[styles.tabIndicator, { width: TAB_WIDTH, transform: [{ translateX: indicatorX }] }]} />
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={styles.navTab}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.navTabText, activeTab === tab && styles.navTabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}>
                {loading ? <ActivityIndicator color="#6366F1" size="large" style={{marginTop: 50}} /> : (
                <Animated.View style={{ opacity: fadeAnim }} key={activeTab}>
                    
                    {activeTab === 'DASHBOARD' && (
                        <View>
                            {/* ───── WELCOME / OVERVIEW BANNER ───── */}
                            <Reveal index={0}>
                                <View style={styles.welcomeCard}>
                                    <View style={styles.welcomeOrbA} />
                                    <View style={styles.welcomeOrbB} />
                                    <View style={styles.welcomeTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.welcomeDate}>
                                                {DAYS[now.getDay()].toUpperCase()} · {now.getDate()} {MONTHS[now.getMonth()].toUpperCase()} {now.getFullYear()}
                                            </Text>
                                            <Text style={styles.welcomeGreeting}>{getGreeting(now)}, Admin</Text>
                                            <Text style={styles.welcomeSub}>
                                                {totalOpen === 0 ? 'All queues are clear. Platform is running smoothly.' : `You have ${totalOpen} open item${totalOpen > 1 ? 's' : ''} that need${totalOpen > 1 ? '' : 's'} review.`}
                                            </Text>
                                        </View>
                                        <View style={styles.clockBox}>
                                            <Text style={styles.clockText}>{formatClock(now)}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.welcomeChips}>
                                        <View style={[styles.statusChip, { backgroundColor: isMaintenance ? '#F59E0B22' : '#10B98122', borderColor: isMaintenance ? '#F59E0B55' : '#10B98155' }]}>
                                            <PulseDot color={isMaintenance ? '#F59E0B' : '#10B981'} size={6} />
                                            <Text style={[styles.statusChipText, { color: isMaintenance ? '#F59E0B' : '#10B981' }]}>
                                                {isMaintenance ? 'OPTIMIZING' : 'LIVE'}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusChip, { backgroundColor: '#6366F122', borderColor: '#6366F155' }]}>
                                            <MaterialCommunityIcons name="source-branch" size={12} color="#818CF8" style={{ marginRight: 6 }} />
                                            <Text style={[styles.statusChipText, { color: '#818CF8' }]}>MIN v{minVersion}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Reveal>

                            {/* ───── KPI STRIP ───── */}
                            <SectionHeader title="KEY METRICS" />
                            <Reveal index={1}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }} style={{ marginHorizontal: -20, paddingLeft: 20 }}>
                                    <KpiCard label="PENDING HOSTS" value={pendingExperts.length} color="#F59E0B" icon="account-clock" caption={pendingExperts.length > 0 ? 'ACTION' : 'CLEAR'} onPress={() => setActiveTab('HOSTS')} />
                                    <KpiCard label="KYC QUEUE" value={bankRequests.length} color="#10B981" icon="bank-check" caption={bankRequests.length > 0 ? 'ACTION' : 'CLEAR'} onPress={() => setActiveTab('HOSTS')} />
                                    <KpiCard label="HOST REPORTS" value={supportReportCount} color="#6366F1" icon="headset" caption={supportReportCount > 0 ? 'UNREAD' : 'CLEAR'} onPress={() => router.push('/reports' as any)} />
                                    {/* 🆕🆕 NEW: user reports KPI (thaniya) */}
                                    <KpiCard label="USER REPORTS" value={userReportCount} color="#0EA5E9" icon="account-alert" caption={userReportCount > 0 ? 'UNREAD' : 'CLEAR'} onPress={() => router.push('/user-reports' as any)} />
                                    <KpiCard label="REWARD GRANTS" value={`₹${totalACTIVITY_REWARDPool.toLocaleString()}`} color="#A855F7" icon="cash-multiple" caption={totalACTIVITY_REWARDPOOL_CAPTION(totalACTIVITY_REWARDPool)} onPress={() => setActiveTab('SETTLEMENTS')} />
                                </ScrollView>
                            </Reveal>

                            {/* ───── WORKLOAD OVERVIEW ───── */}
                            <SectionHeader title="WORKLOAD OVERVIEW" />
                            <Reveal index={2}>
                                <Panel style={{ padding: 20 }}>
                                    {/* 🆕 support = host reports + user reports (rendum serthu) */}
                                    <WorkloadBar hosts={pendingExperts.length} kyc={bankRequests.length} support={supportReportCount + userReportCount} />
                                </Panel>
                            </Reveal>

                            {/* ───── NEEDS ATTENTION ───── */}
                            <SectionHeader
                                title="NEEDS ATTENTION"
                                right={
                                    <View style={[styles.countPill, { backgroundColor: attentionItems.length > 0 ? '#F43F5E22' : '#10B98122' }]}>
                                        <Text style={[styles.countPillText, { color: attentionItems.length > 0 ? '#F43F5E' : '#10B981' }]}>{attentionItems.length}</Text>
                                    </View>
                                }
                            />
                            <Reveal index={3}>
                                <Panel>
                                    {attentionItems.length === 0 ? (
                                        <View style={styles.allClear}>
                                            <View style={styles.allClearRing}>
                                                <MaterialCommunityIcons name="check-all" size={26} color="#10B981" />
                                            </View>
                                            <Text style={styles.allClearTitle}>Everything is under control</Text>
                                            <Text style={styles.linkSub}>No pending actions in any queue.</Text>
                                        </View>
                                    ) : attentionItems.map((it, i) => (
                                        <TouchableOpacity
                                            key={it.key}
                                            activeOpacity={0.7}
                                            onPress={it.onPress}
                                            style={[styles.moduleRow, i < attentionItems.length - 1 && styles.moduleRowBorder]}
                                        >
                                            <View style={[styles.linkIconTile, { backgroundColor: `${it.color}1F`, borderColor: `${it.color}50` }]}>
                                                <MaterialCommunityIcons name={it.icon} size={22} color={it.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.moduleTitle}>{it.title}</Text>
                                                <Text style={styles.linkSub}>{it.sub}</Text>
                                            </View>
                                            <View style={[styles.priorityChip, { backgroundColor: `${it.color}1A`, borderColor: `${it.color}45` }]}>
                                                <Text style={[styles.priorityText, { color: it.color }]}>{it.priority}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </Panel>
                            </Reveal>

                            {/* ───── QUICK ACTIONS ───── */}
                            <SectionHeader title="QUICK ACTIONS" />
                            <Reveal index={4}>
                                <View style={styles.quickGrid}>
                                    <Press3D style={styles.quickTile} onPress={() => setActiveTab('HOSTS')}>
                                        <MaterialCommunityIcons name="shield-check" size={22} color="#F59E0B" />
                                        <Text style={styles.quickText}>Audit Hosts</Text>
                                    </Press3D>
                                    <Press3D style={styles.quickTile} onPress={() => router.push('/finance/withdrawals' as any)}>
                                        <MaterialCommunityIcons name="cash-check" size={22} color="#A855F7" />
                                        <Text style={styles.quickText}>Withdrawals</Text>
                                    </Press3D>
                                    <Press3D style={styles.quickTile} onPress={() => router.push('/management/reports' as any)}>
                                        <MaterialCommunityIcons name="alert-octagon" size={22} color="#F43F5E" />
                                        <Text style={styles.quickText}>Reports</Text>
                                    </Press3D>
                                    <Press3D style={styles.quickTile} onPress={() => router.push('/experts/expert-list')}>
                                        <MaterialCommunityIcons name="account-group" size={22} color="#6366F1" />
                                        <Text style={styles.quickText}>Host Hub</Text>
                                    </Press3D>
                                </View>
                            </Reveal>

                            {/* ───── SYSTEM CONTROLS ───── */}
                            <SectionHeader title="SYSTEM CONTROLS" />
                            <Reveal index={5}>
                                <Press3D
                                    style={[
                                        styles.maintenanceCard,
                                        {
                                            borderColor: isMaintenance ? '#F59E0B' : '#10B98140',
                                            shadowColor: isMaintenance ? '#F59E0B' : '#10B981'
                                        }
                                    ]}
                                    onPress={toggleMaintenance}
                                >
                                    <View style={[styles.linkIconTile, { backgroundColor: isMaintenance ? '#F59E0B22' : '#10B98122', borderColor: isMaintenance ? '#F59E0B55' : '#10B98155' }]}>
                                        <MaterialCommunityIcons name={isMaintenance ? 'wrench-clock' : 'shield-check'} size={24} color={isMaintenance ? '#F59E0B' : '#10B981'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.linkTitle, { color: isMaintenance ? '#F59E0B' : '#10B981' }]}>
                                            {isMaintenance ? 'OPTIMIZATION: ACTIVE 🛠️' : 'PLATFORM STATUS: LIVE ✅'}
                                        </Text>
                                        <Text style={styles.linkSub}>
                                            {isMaintenance ? 'System access restricted' : 'All systems operational'}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons 
                                        name={isMaintenance ? "toggle-switch" : "toggle-switch-off"} 
                                        size={44} 
                                        color={isMaintenance ? "#F59E0B" : "#475569"} 
                                    />
                                </Press3D>
                            </Reveal>

                            <Reveal index={6}>
                                <View style={styles.versionCard}>
                                    <View style={styles.versionIconTile}>
                                        <MaterialCommunityIcons name="source-branch" size={22} color="#818CF8" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.versionLabel}>MINIMUM SYSTEM VERSION</Text>
                                        <TextInput 
                                            style={styles.versionInput}
                                            value={minVersion}
                                            onChangeText={setMinVersion}
                                            placeholder="1.0.5"
                                            placeholderTextColor="#475569"
                                        />
                                    </View>
                                    <TouchableOpacity 
                                        style={[styles.saveBtn, { opacity: savingVersion ? 0.6 : 1 }]} 
                                        onPress={updateVersion}
                                        disabled={savingVersion}
                                    >
                                        {savingVersion ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="cloud-upload" size={20} color="#fff" />}
                                        <Text style={styles.saveBtnText}>COMMIT</Text>
                                    </TouchableOpacity>
                                </View>
                            </Reveal>

                            {/* ───── MODULE PANELS ───── */}
                            <SectionHeader title="SYSTEM INSIGHTS" />
                            <Reveal index={7}>
                                <Panel>
                                    <ModuleRow router={router} last title="OPERATIONAL PULSE" sub="Real-time system health metrics" icon="chart-timeline-variant" route="/analytics" color="#10B981" />
                                </Panel>
                            </Reveal>

                            <SectionHeader title="AUDIT LEDGER" />
                            <Reveal index={8}>
                                <Panel>
                                    <ModuleRow router={router} title="LEDGER VAULT" sub="Account-level history logs" icon="card-account-details-outline" route="/passbook" color="#A855F7" />
                                    <ModuleRow router={router} last title="SYSTEM LEDGER" sub="Financial traceability audit" icon="database-sync" route="/finance/transactions" color="#818CF8" />
                                </Panel>
                            </Reveal>

                            <SectionHeader title="SECURITY & COMPLIANCE" />
                            <Reveal index={9}>
                                <Panel>
                                    <ModuleRow router={router} title="REPORTS & FLAGS" sub="Community moderation alerts" icon="alert-octagon" route="/management/reports" color="#F43F5E" />
                                    {/* 🆕🆕 NEW: Support Hub-la irundhu host anuppura reports (thaniya) */}
                                    <ModuleRow router={router} title="HOST SUPPORT REPORTS" sub="Host trust & safety reports from Support Hub" icon="headset" route="/reports" color="#6366F1" badge={supportReportCount} />
                                    {/* 🆕🆕 NEW: Support Hub-la irundhu user anuppura reports (thaniya) */}
                                    <ModuleRow router={router} title="USER SUPPORT REPORTS" sub="User trust & safety reports from Support Hub" icon="account-alert-outline" route="/user-reports" color="#0EA5E9" badge={userReportCount} />
                                    <ModuleRow router={router} title="SESSION LOGS" sub="Interaction monitoring logs" icon="shield-search" route="/logs/call-logs" color="#F59E0B" />
                                    <ModuleRow router={router} last title="ENGINE DIAGNOSTICS" sub="Connectivity performance audit" icon="speedometer" route="/logs/system-latency" color="#10B981" />
                                </Panel>
                            </Reveal>

                            <SectionHeader title="ADMINISTRATION" />
                            <Reveal index={10}>
                                <Panel>
                                    <ModuleRow router={router} last title="ACCESS CONTROL" sub="Manage profile permissions" icon="account-off" route="/management/user-control" color="#94A3B8" />
                                </Panel>
                            </Reveal>

                            <Reveal index={11}>
                                <Press3D style={styles.expertHubMainBtn} onPress={() => router.push('/experts/expert-list')}>
                                    <View style={styles.expertHubGlow} />
                                    <View style={styles.expertHubContent}>
                                        <View style={styles.expertHubIconBox}><MaterialCommunityIcons name="account-group" size={24} color="#fff" /></View>
                                        <View style={{ flex: 1, marginLeft: 15 }}>
                                            <Text style={styles.expertHubTitle}>HOST HUB (ACTIVE)</Text>
                                            <Text style={styles.expertHubSub}>Global Management of Authorized Profiles</Text>
                                        </View>
                                        <Entypo name="chevron-right" size={24} color="#6366F1" />
                                    </View>
                                </Press3D>
                            </Reveal>
                        </View>
                    )}

                    {activeTab === 'SETTLEMENTS' && (
                        <View>
                            <Reveal index={0}>
                                <View style={styles.ACTIVITY_REWARDMainCard}>
                                    <View style={styles.rewardOrbA} />
                                    <View style={styles.rewardOrbB} />
                                    <View style={styles.rewardIconRing}>
                                        <MaterialCommunityIcons name="treasure-chest" size={26} color="#C7D2FE" />
                                    </View>
                                    <Text style={styles.ACTIVITY_REWARDTitle}>TOTAL REWARD GRANTS</Text>
                                    <Text style={styles.ACTIVITY_REWARDAmt}>₹{totalACTIVITY_REWARDPool.toLocaleString()}</Text>
                                    <Press3D style={styles.withdrawBtn} onPress={() => router.push('/finance/withdrawals' as any)}>
                                        <Text style={styles.withdrawText}>AUDIT PROCESSED</Text>
                                        <Feather name="arrow-right" size={16} color="#312E81" />
                                    </Press3D>
                                </View>
                            </Reveal>
                        </View>
                    )}

                    {activeTab === 'HOSTS' && (
                        <View>
                            <SectionHeader title={`PROFILE ONBOARDING (${pendingExperts.length})`} />
                            {pendingExperts.length === 0 && bankRequests.length === 0 ? (
                                <Reveal index={0}>
                                    <View style={styles.emptyBox}>
                                        <View style={styles.emptyRing}>
                                            <MaterialCommunityIcons name="check-all" size={46} color="#6366F1" />
                                        </View>
                                        <Text style={{color: '#64748B', marginTop: 14, fontWeight: '800', letterSpacing: 1}}>Queue cleared.</Text>
                                    </View>
                                </Reveal>
                            ) :
                            pendingExperts.map((exp: any, i: number) => (
                                <Reveal key={exp.id} index={i}>
                                    <Press3D style={styles.expertCard} onPress={() => router.push(`/experts/verify-expert/${exp.id}` as any)}>
                                        <View style={styles.expertLead}>
                                            <View style={styles.avatar}>
                                                {(exp.profilePic || exp.photoURL) ? (
                                                    <Image source={{ uri: exp.profilePic || exp.photoURL }} style={styles.avatarImage} />
                                                ) : (
                                                    <Text style={styles.avatarChar}>{exp.name?.[0] || 'C'}</Text>
                                                )}
                                            </View>
                                            <View style={{ marginLeft: 15, flex: 1 }}>
                                                <Text style={styles.expName}>{exp.name || 'User ID'}</Text>
                                                <Text style={styles.expCat}>{exp.category || 'Professional'}</Text>
                                            </View>
                                        </View>
                                        {/* 🆕🆕 NEW: pudhusa apply panna host-ku "NEW APPLICATION" badge */}
                                        <View style={[styles.badge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B55' }]}>
                                            <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{exp.isApplying ? 'NEW APPLICATION' : 'AUDIT PROFILE'}</Text>
                                        </View>
                                    </Press3D>
                                </Reveal>
                            ))}

                            {bankRequests.length > 0 && (
                                <>
                                    <SectionHeader title={`KYC VERIFICATION (${bankRequests.length})`} />
                                    {bankRequests.map((req: any, i: number) => (
                                        <Reveal key={req.id} index={i}>
                                            <Press3D 
                                                style={[styles.expertCard, { borderColor: '#10B98140' }]} 
                                                onPress={() => router.push(`/experts/verify-bank/${req.expertId || req.id}` as any)}
                                            >
                                                <View style={styles.expertLead}>
                                                    <View style={[styles.avatar, { backgroundColor: '#10B98120' }]}>
                                                        <FontAwesome5 name="university" size={16} color="#10B981" />
                                                    </View>
                                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                                        <Text style={styles.expName}>{req.expertName || 'Profile ID'}</Text>
                                                        <Text style={styles.expCat}>Ledger: {req.details?.accountNumber?.slice(-4).padStart(8, '*') || 'Data Syncing'}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.badge, { backgroundColor: '#10B98120', borderColor: '#10B98155' }]}>
                                                    <Text style={[styles.badgeText, { color: '#10B981' }]}>KYC REVIEW</Text>
                                                </View>
                                            </Press3D>
                                        </Reveal>
                                    ))}
                                </>
                            )}
                        </View>
                    )}
                </Animated.View>
                )}
            </ScrollView>

            {/* ───── FLOATING GLASS DOCK ───── */}
            <BlurView intensity={90} tint="dark" style={styles.bottomBar}>
                <TouchableOpacity onPress={() => setActiveTab('DASHBOARD')} style={styles.barIcon}>
                    <View style={[styles.barIconBubble, activeTab === 'DASHBOARD' && styles.barIconBubbleActiveIndigo]}>
                        <MaterialCommunityIcons name="grid-large" size={22} color={activeTab === 'DASHBOARD' ? "#6366F1" : "#475569"} />
                    </View>
                    <Text style={[styles.barLabel, activeTab === 'DASHBOARD' && {color: '#6366F1'}]}>Core</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('HOSTS')} style={styles.barIcon}>
                    <View style={[styles.barIconBubble, activeTab === 'HOSTS' && styles.barIconBubbleActiveAmber]}>
                        <MaterialCommunityIcons name="shield-check" size={22} color={activeTab === 'HOSTS' ? "#F59E0B" : "#475569"} />
                        {(pendingExperts.length > 0 || bankRequests.length > 0) && <View style={styles.notifDot} />}
                    </View>
                    <Text style={[styles.barLabel, activeTab === 'HOSTS' && {color: '#F59E0B'}]}>Audit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/management/reports' as any)} style={styles.barIcon}>
                    <View style={styles.barIconBubble}>
                        <Ionicons name="warning-outline" size={22} color="#F43F5E" />
                    </View>
                    <Text style={styles.barLabel}>Safety</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/finance/transactions' as any)} style={styles.barIcon}>
                    <View style={styles.barIconBubble}>
                        <MaterialCommunityIcons name="script-text-outline" size={22} color="#94A3B8" />
                    </View>
                    <Text style={styles.barLabel}>Ledger</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
    );
};

// small helper for the reward KPI caption
function totalACTIVITY_REWARDPOOL_CAPTION(amount: number) {
    return amount > 0 ? 'PENDING' : 'CLEAR';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    orb: { position: 'absolute', borderRadius: 999 },

    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 2, textShadowColor: '#6366F1', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    pulse: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    liveText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    profileBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#1E293B', borderBottomWidth: 3, borderBottomColor: '#312E81', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    logoutBtn: { backgroundColor: '#4C0519', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#881337', borderBottomWidth: 3, shadowColor: '#F43F5E', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },

    tabWrap: { marginHorizontal: 20, marginBottom: 6, height: 52, flexDirection: 'row', backgroundColor: '#0B1224', borderRadius: 18, padding: 4, borderWidth: 1, borderColor: '#1E293B' },
    tabIndicator: { position: 'absolute', top: 4, left: 4, bottom: 4, borderRadius: 14, backgroundColor: '#6366F1', borderBottomWidth: 3, borderBottomColor: '#4338CA', shadowColor: '#6366F1', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    navTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navTabActive: { backgroundColor: '#6366F1', borderColor: '#818CF8' },
    navTabText: { color: '#475569', fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
    navTabTextActive: { color: '#fff' },

    sectionTitle: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginTop: 30, marginBottom: 12 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 12 },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: '#6366F1', marginRight: 10 },
    sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    countPill: { minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
    countPillText: { fontSize: 11, fontWeight: '900' },

    /* welcome banner */
    welcomeCard: { backgroundColor: '#0F172A', borderRadius: 30, padding: 22, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', borderBottomColor: '#312E81', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    welcomeOrbA: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#6366F1', opacity: 0.18 },
    welcomeOrbB: { position: 'absolute', bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#A855F7', opacity: 0.1 },
    welcomeTop: { flexDirection: 'row', alignItems: 'flex-start' },
    welcomeDate: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    welcomeGreeting: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 8 },
    welcomeSub: { color: '#94A3B8', fontSize: 12, marginTop: 6, lineHeight: 18, fontWeight: '600' },
    clockBox: { backgroundColor: '#020617AA', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#1E293B', marginLeft: 12 },
    clockText: { color: '#E2E8F0', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    welcomeChips: { flexDirection: 'row', marginTop: 18, gap: 10 },
    statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    statusChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

    /* KPI strip */
    kpiCard: { width: 158, backgroundColor: '#0B1224', borderRadius: 24, borderWidth: 1, borderBottomWidth: 4, padding: 16, marginRight: 12, overflow: 'hidden', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    kpiGlow: { position: 'absolute', top: -35, right: -35, width: 100, height: 100, borderRadius: 50, opacity: 0.16 },
    kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kpiIcon: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    kpiChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    kpiChipText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
    kpiValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 16 },
    kpiLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 4 },

    /* panels */
    panel: { backgroundColor: '#0B1224', borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
    moduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    moduleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#111B33' },
    moduleTitle: { color: '#E2E8F0', fontWeight: '800', fontSize: 13, letterSpacing: 0.4 },
    priorityChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginRight: 4 },
    priorityText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

    /* workload */
    workloadTrack: { height: 14, borderRadius: 7, backgroundColor: '#111B33', overflow: 'hidden', flexDirection: 'row' },
    workloadEmpty: { flex: 1, backgroundColor: '#10B98133' },
    legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    legendCount: { color: '#fff', fontSize: 16, fontWeight: '900' },
    legendLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginTop: 1 },
    workloadFoot: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 16 },

    /* all clear */
    allClear: { alignItems: 'center', paddingVertical: 28 },
    allClearRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B9811A', borderWidth: 1, borderColor: '#10B98155', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    allClearTitle: { color: '#E2E8F0', fontWeight: '900', fontSize: 14, marginBottom: 4 },

    /* quick actions */
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    quickTile: { width: (width - 52) / 2, flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B1224', borderRadius: 20, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
    quickText: { color: '#E2E8F0', fontWeight: '800', fontSize: 12, marginLeft: 12 },

    linkIconTile: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    maintenanceCard: { padding: 18, borderRadius: 28, borderWidth: 1.5, borderBottomWidth: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', marginBottom: 8, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    versionCard: { backgroundColor: '#0F172A', padding: 18, borderRadius: 28, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', borderBottomColor: '#312E81', flexDirection: 'row', alignItems: 'center', marginTop: 5, shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    versionIconTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#6366F122', borderWidth: 1, borderColor: '#6366F155', alignItems: 'center', justifyContent: 'center' },
    versionLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', marginBottom: 4, letterSpacing: 1 },
    versionInput: { color: '#fff', fontSize: 20, fontWeight: '900', padding: 0 },
    saveBtn: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#4338CA', shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, marginLeft: 8 },
    linkTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    linkSub: { color: '#64748B', fontSize: 11, marginTop: 2 },

    // 🆕🆕 NEW: unread count badge on SecurityLink
    linkBadge: { backgroundColor: '#F43F5E', minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10, shadowColor: '#F43F5E', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    linkBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },

    expertHubMainBtn: { marginTop: 22, padding: 20, borderRadius: 28, borderWidth: 1.5, borderBottomWidth: 4, borderColor: '#6366F180', backgroundColor: '#0F172A', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    expertHubGlow: { position: 'absolute', top: -50, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#6366F1', opacity: 0.14 },
    expertHubContent: { flexDirection: 'row', alignItems: 'center' },
    expertHubIconBox: { backgroundColor: '#6366F1', padding: 10, borderRadius: 15, borderBottomWidth: 3, borderBottomColor: '#4338CA' },
    expertHubTitle: { fontWeight: '900', fontSize: 15, color: '#fff', letterSpacing: 0.5 },
    expertHubSub: { color: '#94A3B8', fontSize: 11, marginTop: 3, fontWeight: '600' },

    ACTIVITY_REWARDMainCard: { backgroundColor: '#1E1B4B', padding: 35, borderRadius: 40, borderWidth: 1, borderBottomWidth: 5, borderColor: '#312E81', borderBottomColor: '#4338CA', overflow: 'hidden', marginTop: 10, shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    rewardOrbA: { position: 'absolute', top: -60, right: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: '#6366F1', opacity: 0.25 },
    rewardOrbB: { position: 'absolute', bottom: -70, left: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: '#A855F7', opacity: 0.18 },
    rewardIconRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: '#4F46E5', backgroundColor: '#312E8180', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    ACTIVITY_REWARDTitle: { color: '#818CF8', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    ACTIVITY_REWARDAmt: { color: '#fff', fontSize: 42, fontWeight: '900', marginVertical: 15, textShadowColor: '#818CF8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
    withdrawBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#C7D2FE' },
    withdrawText: { color: '#1E1B4B', fontWeight: '900', marginRight: 10, fontSize: 14 },

    expertCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', padding: 18, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    expertLead: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarChar: { color: '#818CF8', fontSize: 16, fontWeight: '900' },
    expName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    expCat: { color: '#64748B', fontSize: 10, marginTop: 2 },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    badgeText: { fontSize: 9, fontWeight: '900' },

    bottomBar: { position: 'absolute', bottom: 18, left: 16, right: 16, height: 74, borderRadius: 30, overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', borderTopColor: '#334155' },
    barIcon: { alignItems: 'center' },
    barIconBubble: { width: 42, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    barIconBubbleActiveIndigo: { backgroundColor: '#6366F11F', borderWidth: 1, borderColor: '#6366F155' },
    barIconBubbleActiveAmber: { backgroundColor: '#F59E0B1F', borderWidth: 1, borderColor: '#F59E0B55' },
    barLabel: { color: '#475569', fontSize: 10, fontWeight: '800', marginTop: 3 },

    emptyBox: { alignItems: 'center', padding: 40 },
    emptyRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: '#312E81', backgroundColor: '#6366F112', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    notifDot: { position: 'absolute', top: 2, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#020617' }
});

export default AdminPanel;
