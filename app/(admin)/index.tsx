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

    // 🆕🆕 NEW: Support Hub-la irundhu vara review pannaadha (unread) reports count
    const [supportReportCount, setSupportReportCount] = useState(0);

    const fadeAnim = useRef(new Animated.Value(0)).current;

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

        const qExperts = query(
            collection(db, "users"),
            where("role", "==", "expert"),
            where("status", "==", "Pending")
        );
        const unsubExperts = onSnapshot(qExperts, (snap) => {
            setPendingExperts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Experts listener detached on logout");
            setLoading(false);
        });
        unsubs.push(unsubExperts);

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

        // 🆕🆕 NEW: Support Hub reports (unread) live count - SUPPORT REPORTS button-la badge-ah kaattum
        const qSupport = query(
            collection(db, "admin_alerts"),
            where("type", "==", "TRUST_SAFETY_REPORT"),
            where("status", "==", "unread")
        );
        const unsubSupport = onSnapshot(qSupport, (snap) => {
            setSupportReportCount(snap.size);
        }, (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Support reports listener detached on logout");
        });
        unsubs.push(unsubSupport);

        return () => unsubs.forEach(unsub => unsub());
    }, []);

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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

    const SecurityLink = ({ title, sub, icon, route, color, badge }: any) => (
        <TouchableOpacity
            style={[styles.expertLinkCard, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}
            onPress={() => router.push(route as any)}
        >
            <View style={{ flex: 1 }}>
                <Text style={[styles.linkTitle, { color: color }]}>{title}</Text>
                <Text style={styles.linkSub}>{sub}</Text>
            </View>
            {/* 🆕🆕 NEW: unread count badge (venum-na mattum varum) */}
            {badge > 0 && (
                <View style={styles.linkBadge}>
                    <Text style={styles.linkBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
            )}
            <MaterialCommunityIcons name={icon} size={26} color={color} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>TALKPE OS</Text>
                    <View style={styles.liveIndicator}>
                        <View style={[styles.pulse, { backgroundColor: isMaintenance ? '#F59E0B' : '#10B981' }]} />
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

            <View style={{ height: 50, marginBottom: 20 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                    {['DASHBOARD', 'HOSTS', 'SETTLEMENTS'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.navTab, activeTab === tab && styles.navTabActive]}
                        >
                            <Text style={[styles.navTabText, activeTab === tab && styles.navTabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
                {loading ? <ActivityIndicator color="#6366F1" size="large" style={{marginTop: 50}} /> : (
                <Animated.View style={{ opacity: fadeAnim }}>
                    
                    {activeTab === 'DASHBOARD' && (
                        <View>
                            <Text style={styles.sectionTitle}>MISSION CONTROL</Text>
                            
                            <TouchableOpacity 
                                style={[styles.maintenanceCard, { borderColor: isMaintenance ? '#F59E0B' : '#10B98140' }]}
                                onPress={toggleMaintenance}
                            >
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
                                    size={40} 
                                    color={isMaintenance ? "#F59E0B" : "#475569"} 
                                />
                            </TouchableOpacity>

                            <View style={styles.versionCard}>
                                <View style={{ flex: 1 }}>
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

                            <Text style={styles.sectionTitle}>SYSTEM INSIGHTS</Text>
                            <SecurityLink title="OPERATIONAL PULSE" sub="Real-time system health metrics" icon="chart-timeline-variant" route="/analytics" color="#10B981" />

                            <Text style={styles.sectionTitle}>AUDIT LEDGER</Text>
                            <SecurityLink title="LEDGER VAULT" sub="Account-level history logs" icon="card-account-details-outline" route="/passbook" color="#A855F7" />
                           
                            <SecurityLink title="SYSTEM LEDGER" sub="Financial traceability audit" icon="database-sync" route="/finance/transactions" color="#818CF8" />

                            <Text style={styles.sectionTitle}>SECURITY & COMPLIANCE</Text>
                            <SecurityLink title="REPORTS & FLAGS" sub="Community moderation alerts" icon="alert-octagon" route="/management/reports" color="#F43F5E" />
                            {/* 🆕🆕 NEW: Support Hub-la irundhu host anuppura reports (thaniya) */}
                            <SecurityLink title="SUPPORT REPORTS" sub="Host trust & safety reports from Support Hub" icon="headset" route="/reports" color="#6366F1" badge={supportReportCount} />
                            <SecurityLink title="SESSION LOGS" sub="Interaction monitoring logs" icon="shield-search" route="/logs/call-logs" color="#F59E0B" />
                            <SecurityLink title="ENGINE DIAGNOSTICS" sub="Connectivity performance audit" icon="speedometer" route="/logs/system-latency" color="#10B981" />

                            <Text style={styles.sectionTitle}>ADMINISTRATION</Text>
                            <SecurityLink title="ACCESS CONTROL" sub="Manage profile permissions" icon="account-off" route="/management/user-control" color="#94A3B8" />

                            <TouchableOpacity style={styles.expertHubMainBtn} onPress={() => router.push('/experts/expert-list')}>
                                <View style={styles.expertHubContent}>
                                    <View style={styles.expertHubIconBox}><MaterialCommunityIcons name="account-group" size={24} color="#fff" /></View>
                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                        <Text style={styles.expertHubTitle}>HOST HUB (ACTIVE)</Text>
                                        <Text style={styles.expertHubSub}>Global Management of Authorized Profiles</Text>
                                    </View>
                                    <Entypo name="chevron-right" size={24} color="#6366F1" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'SETTLEMENTS' && (
                        <View>
                            <View style={styles.ACTIVITY_REWARDMainCard}>
                                <Text style={styles.ACTIVITY_REWARDTitle}>TOTAL REWARD GRANTS</Text>
                                <Text style={styles.ACTIVITY_REWARDAmt}>₹{totalACTIVITY_REWARDPool.toLocaleString()}</Text>
                                <TouchableOpacity style={styles.withdrawBtn} onPress={() => router.push('/finance/withdrawals' as any)}>
                                    <Text style={styles.withdrawText}>AUDIT PROCESSED</Text>
                                    <Feather name="arrow-right" size={16} color="#312E81" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {activeTab === 'HOSTS' && (
                        <View>
                            <Text style={styles.sectionTitle}>PROFILE ONBOARDING ({pendingExperts.length})</Text>
                            {pendingExperts.length === 0 && bankRequests.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <MaterialCommunityIcons name="check-all" size={50} color="#1E293B" />
                                    <Text style={{color: '#475569', marginTop: 10}}>Queue cleared.</Text>
                                </View>
                            ) :
                            pendingExperts.map((exp: any) => (
                                <TouchableOpacity key={exp.id} style={styles.expertCard} onPress={() => router.push(`/experts/verify-expert/${exp.id}` as any)}>
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
                                    <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                                        <Text style={[styles.badgeText, { color: '#F59E0B' }]}>AUDIT PROFILE</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {bankRequests.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>KYC VERIFICATION ({bankRequests.length})</Text>
                                    {bankRequests.map((req: any) => (
                                        <TouchableOpacity 
                                            key={req.id} 
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
                                            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                                                <Text style={[styles.badgeText, { color: '#10B981' }]}>KYC REVIEW</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}
                        </View>
                    )}
                </Animated.View>
                )}
            </ScrollView>

            <BlurView intensity={90} tint="dark" style={styles.bottomBar}>
                <TouchableOpacity onPress={() => setActiveTab('DASHBOARD')} style={styles.barIcon}>
                    <MaterialCommunityIcons name="grid-large" size={22} color={activeTab === 'DASHBOARD' ? "#6366F1" : "#475569"} />
                    <Text style={[styles.barLabel, activeTab === 'DASHBOARD' && {color: '#6366F1'}]}>Core</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('HOSTS')} style={styles.barIcon}>
                    <View>
                        <MaterialCommunityIcons name="shield-check" size={22} color={activeTab === 'HOSTS' ? "#F59E0B" : "#475569"} />
                        {(pendingExperts.length > 0 || bankRequests.length > 0) && <View style={styles.notifDot} />}
                    </View>
                    <Text style={[styles.barLabel, activeTab === 'HOSTS' && {color: '#F59E0B'}]}>Audit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/management/reports' as any)} style={styles.barIcon}>
                    <Ionicons name="warning-outline" size={22} color="#F43F5E" />
                    <Text style={styles.barLabel}>Safety</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/finance/transactions' as any)} style={styles.barIcon}>
                    <MaterialCommunityIcons name="script-text-outline" size={22} color="#94A3B8" />
                    <Text style={styles.barLabel}>Ledger</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulse: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    liveText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    profileBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#1E293B' },
    logoutBtn: { backgroundColor: '#4C0519', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#881337' },
    navTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0F172A', marginRight: 10, borderWidth: 1, borderColor: '#1E293B' },
    navTabActive: { backgroundColor: '#6366F1', borderColor: '#818CF8' },
    navTabText: { color: '#475569', fontWeight: 'bold', fontSize: 12 },
    navTabTextActive: { color: '#fff' },
    sectionTitle: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 30, marginBottom: 12 },
    expertLinkCard: { marginTop: 8, padding: 22, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    maintenanceCard: { padding: 22, borderRadius: 28, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', marginBottom: 8 },
    versionCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#1E293B', flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    versionLabel: { color: '#475569', fontSize: 9, fontWeight: '900', marginBottom: 4 },
    versionInput: { color: '#fff', fontSize: 20, fontWeight: '900', padding: 0 },
    saveBtn: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 18, flexDirection: 'row', alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, marginLeft: 8 },
    linkTitle: { fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    linkSub: { color: '#475569', fontSize: 11, marginTop: 2 },
    // 🆕🆕 NEW: unread count badge on SecurityLink
    linkBadge: { backgroundColor: '#F43F5E', minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    linkBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    expertHubMainBtn: { marginTop: 15, padding: 20, borderRadius: 28, borderWidth: 1.5, borderColor: '#6366F180', backgroundColor: '#0F172A' },
    expertHubContent: { flexDirection: 'row', alignItems: 'center' },
    expertHubIconBox: { backgroundColor: '#6366F1', padding: 10, borderRadius: 15 },
    expertHubTitle: { fontWeight: '900', fontSize: 15, color: '#fff', letterSpacing: 0.5 },
    expertHubSub: { color: '#94A3B8', fontSize: 11, marginTop: 3, fontWeight: '600' },
    ACTIVITY_REWARDMainCard: { backgroundColor: '#1E1B4B', padding: 35, borderRadius: 40, borderWidth: 1, borderColor: '#312E81' },
    ACTIVITY_REWARDTitle: { color: '#818CF8', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    ACTIVITY_REWARDAmt: { color: '#fff', fontSize: 40, fontWeight: '900', marginVertical: 15 },
    withdrawBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    withdrawText: { color: '#1E1B4B', fontWeight: '900', marginRight: 10, fontSize: 14 },
    expertCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', padding: 18, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
    expertLead: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarChar: { color: '#818CF8', fontSize: 16, fontWeight: '900' },
    expName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    expCat: { color: '#475569', fontSize: 10, marginTop: 2 },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    badgeText: { fontSize: 9, fontWeight: '900' },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', height: 90, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#1E293B', paddingBottom: 20 },
    barIcon: { alignItems: 'center' },
    barLabel: { color: '#475569', fontSize: 10, fontWeight: '800', marginTop: 6 },
    emptyBox: { alignItems: 'center', padding: 40, opacity: 0.5 },
    notifDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', borderWidth: 1, borderColor: '#020617' }
});

export default AdminPanel;
