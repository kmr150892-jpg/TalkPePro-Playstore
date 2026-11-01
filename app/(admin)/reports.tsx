import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { sendNotificationToUser } from '../../utils/notificationHelper';

// ✅ Admin identify panna: UID (pazhaya) + Email (pudhusu) rendum work aagum
const ADMIN_UID = "jOQ0LxpaFkhuqIiMtOcYCGb3nEf2";
const ADMIN_EMAILS = ["kmr150892@gmail.com"];

const FILTERS = ['unread', 'reviewing', 'resolved', 'dismissed'] as const;
const STATUS_COLOR: any = { unread: '#F43F5E', reviewing: '#F59E0B', resolved: '#10B981', dismissed: '#64748B' };

// admin status maathina host-ku pogum notification messages (neutral wording - reported user pathi sollala)
const STATUS_MESSAGES: any = {
    reviewing: { title: "Report Under Review 🔍", body: "Your Trust & Safety report is now being reviewed by our team." },
    resolved:  { title: "Report Reviewed ✅", body: "Our team has reviewed your report and taken the appropriate action. Thank you for helping keep TalkPe Pro safe." },
    dismissed: { title: "Report Reviewed", body: "Our team has reviewed your report and found no policy violation at this time. You can submit a new report if the issue continues." },
};

const ReportCard = ({ item, onStatus, onOpenUser, onRestrict, onOpenLedger }: any) => {
    const [reported, setReported] = useState<any>(null);
    const [reporter, setReporter] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                if (item.reportedUserId) {
                    const s = await getDoc(doc(db, "users", item.reportedUserId));
                    if (s.exists()) setReported(s.data());
                }
                if (item.expertId) {
                    const s = await getDoc(doc(db, "users", item.expertId));
                    if (s.exists()) setReporter(s.data());
                }
            } catch (e) { console.log(e); }
        };
        load();
    }, [item.reportedUserId, item.expertId]);

    const color = STATUS_COLOR[item.status] || '#F43F5E';
    // timestamp pending-ah irundha createdAt (number) use pannum
    const when = item.timestamp?.toDate
        ? item.timestamp.toDate().toLocaleString('en-IN')
        : typeof item.createdAt === 'number' ? new Date(item.createdAt).toLocaleString('en-IN') : '';
    const pic = (u: any, n: string) => u?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(n || 'U')}&background=0F172A&color=fff`;

    // reported user details (ledger routing + flags + typed name)
    const typedName = String(item.reportedUser || '').trim();
    const reportedRole = reported?.role ? String(reported.role).toLowerCase() : 'user';
    const blockCount = reported?.expertBlockCount || 0;
    const done = item.status === 'resolved' || item.status === 'dismissed';

    // card tap -> REPORTED user-oda ledger
    const handleCardPress = () => {
        if (!item.reportedUserId) {
            Alert.alert(
                "No user selected",
                typedName
                    ? `The host did not pick a user from the list. Typed name: "${typedName}".`
                    : "The host did not mention any specific user in this report."
            );
            return;
        }
        onOpenLedger(item.reportedUserId, reportedRole);
    };

    return (
        <TouchableOpacity activeOpacity={0.92} onPress={handleCardPress} style={[styles.card, { borderColor: color + '66' }, done && { opacity: 0.7 }]}>
            <View style={styles.rowBetween}>
                <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color + '88' }]}>
                    <Text style={[styles.chipText, { color }]}>{String(item.status || 'unread').toUpperCase()}</Text>
                </View>
                {item.priority === 'high' && (
                    <View style={[styles.chip, { backgroundColor: '#EF444422', borderColor: '#EF4444' }]}>
                        <Text style={[styles.chipText, { color: '#EF4444' }]}>HIGH PRIORITY</Text>
                    </View>
                )}
            </View>

            <Text style={styles.category}>{item.categoryLabel || item.category}</Text>
            <Text style={styles.time}>{when}  •  Ref {String(item.id).slice(0, 8).toUpperCase()}</Text>

            {/* FORM DETAILS - host form-la enna problem solli report pannaanga */}
            <View style={styles.formBox}>
                <View style={styles.formHead}>
                    <MaterialCommunityIcons name="text-box-outline" size={14} color="#A5B4FC" />
                    <Text style={styles.formLabel}>HOST'S REPORT FORM</Text>
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
                    <Image source={{ uri: pic(reporter, item.expertName) }} style={styles.avatar} />
                    <Text style={styles.pName} numberOfLines={1}>{reporter?.name || item.expertName || 'Host'}</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right-bold" size={20} color="#475569" />
                <View style={styles.person}>
                    <Text style={styles.pLabel}>REPORTED USER</Text>
                    <Image source={{ uri: pic(reported, item.reportedUserName) }} style={[styles.avatar, { borderColor: '#F43F5E' }]} />
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

            {/* ledger buttons (reported user + host) */}
            <View style={styles.actions}>
                {!!item.reportedUserId && (
                    <TouchableOpacity style={[styles.btn, { borderColor: '#F43F5E' }]} onPress={() => onOpenLedger(item.reportedUserId, reportedRole)}>
                        <MaterialCommunityIcons name="book-account-outline" size={14} color="#F87171" />
                        <Text style={[styles.btnText, { color: '#F87171' }]}>REPORTED LEDGER</Text>
                    </TouchableOpacity>
                )}
                {!!item.expertId && (
                    <TouchableOpacity style={[styles.btn, { borderColor: '#6366F1' }]} onPress={() => onOpenLedger(item.expertId, 'expert')}>
                        <MaterialCommunityIcons name="book-account-outline" size={14} color="#A5B4FC" />
                        <Text style={[styles.btnText, { color: '#A5B4FC' }]}>HOST LEDGER</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.actions}>
                {!!item.reportedUserId && (
                    <TouchableOpacity style={[styles.btn, { borderColor: '#6366F1' }]} onPress={() => onOpenUser(item.reportedUserId)}>
                        <Ionicons name="person-outline" size={14} color="#A5B4FC" />
                        <Text style={[styles.btnText, { color: '#A5B4FC' }]}>PROFILE</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.btn, { borderColor: '#F59E0B' }]} onPress={() => onStatus(item, 'reviewing')}>
                    <Text style={[styles.btnText, { color: '#F59E0B' }]}>REVIEWING</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { borderColor: '#10B981' }]} onPress={() => onStatus(item, 'resolved')}>
                    <Text style={[styles.btnText, { color: '#10B981' }]}>RESOLVE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { borderColor: '#64748B' }]} onPress={() => onStatus(item, 'dismissed')}>
                    <Text style={[styles.btnText, { color: '#94A3B8' }]}>DISMISS</Text>
                </TouchableOpacity>
            </View>

            {!!item.reportedUserId && item.status !== 'resolved' && (
                <TouchableOpacity style={styles.restrictBtn} onPress={() => onRestrict(item)}>
                    <MaterialCommunityIcons name="account-cancel-outline" size={16} color="#FFF" />
                    <Text style={styles.restrictText}>RESTRICT REPORTED USER</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};

export default function AdminReportsScreen() {
    const router = useRouter();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<typeof FILTERS[number]>('unread');

    // ✅ FIX: null = innum check panra, true = admin, false = admin illa
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
            setReports(rows);
            setLoading(false);
        }, (error) => {
            console.log("Reports listener error:", error?.code);
            setLoading(false);
        });
        return () => unsub();
    }, [isAdmin]);

    // status update + host-ku notification (same status thirumba thottaa duplicate notification pogaadhu)
    const setStatus = async (item: any, status: string) => {
        try {
            await updateDoc(doc(db, "admin_alerts", item.id), {
                status,
                reviewedBy: auth.currentUser?.uid,
                reviewedAt: serverTimestamp()
            });
            // host-ku notification
            const msg = STATUS_MESSAGES[status];
            if (msg && item.expertId && item.status !== status) {
                await sendNotificationToUser(
                    item.expertId,
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
                <MaterialCommunityIcons name="shield-lock" size={50} color="#F43F5E" />
                <Text style={styles.denied}>ADMIN ACCESS ONLY</Text>
            </View>
        );
    }

    const list = reports.filter((r) => (r.status || 'unread') === filter);
    const count = (s: string) => reports.filter((r) => (r.status || 'unread') === s).length;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0B0A24', '#020617']} style={StyleSheet.absoluteFill} />
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.back}>
                        <Ionicons name="chevron-back" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.hLabel}>TRUST & SAFETY</Text>
                        <Text style={styles.hTitle}>REPORT QUEUE</Text>
                    </View>
                </View>
                <View style={styles.tabs}>
                    {FILTERS.map((f) => (
                        <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.tab, filter === f && { backgroundColor: STATUS_COLOR[f] + '33', borderColor: STATUS_COLOR[f] }]}>
                            <Text style={[styles.tabText, filter === f && { color: '#FFF' }]}>{f.toUpperCase()} ({count(f)})</Text>
                        </TouchableOpacity>
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
                    ListEmptyComponent={<Text style={styles.empty}>No reports in this list.</Text>}
                    renderItem={({ item }) => (
                        <ReportCard
                            item={item}
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    back: { padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    hLabel: { color: '#F43F5E', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    hTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
    tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    tabText: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    empty: { color: '#64748B', textAlign: 'center', marginTop: 60, fontWeight: '700' },
    card: { padding: 16, borderRadius: 22, borderWidth: 1, backgroundColor: 'rgba(10,6,28,0.95)', marginBottom: 14 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9, borderWidth: 1 },
    chipText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
    category: { color: '#FFF', fontSize: 17, fontWeight: '900', marginTop: 12 },
    time: { color: '#64748B', fontSize: 10.5, fontWeight: '700', marginTop: 4 },
    desc: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginTop: 6, fontWeight: '600' },
    peopleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 16, padding: 12, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)' },
    person: { alignItems: 'center', flex: 1 },
    pLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#6366F1', backgroundColor: '#0F172A' },
    pName: { color: '#FFF', fontSize: 12.5, fontWeight: '800', marginTop: 6, maxWidth: 120 },
    pId: { color: '#64748B', fontSize: 9.5, fontWeight: '700', marginTop: 2 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    btnText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    restrictBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: '#B91C1C' },
    restrictText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

    // host report form details box
    formBox: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
    formHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    formLabel: { color: '#A5B4FC', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5 },
    formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    formKey: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
    formVal: { color: '#E2E8F0', fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right', marginLeft: 12 }
});
 