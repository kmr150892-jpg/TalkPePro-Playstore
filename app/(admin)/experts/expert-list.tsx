import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, or, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

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
    isApplying?: boolean;
}

export default function ExpertControl() {
    const router = useRouter();
    const [experts, setExperts] = useState<ExpertData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, "users"), 
            or(
                where("role", "==", "expert"),
                where("isApplying", "==", true)
            )
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpertData));
            const sortedList = list.sort((a, b) => {
                const statusA = a.status === 'Pending' ? 1 : 0;
                const statusB = b.status === 'Pending' ? 1 : 0;
                return statusB - statusA;
            });

            setExperts(sortedList);
            setLoading(false);
        }, (error) => {
            console.error("Firebase Sync Error:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "RESTRICT ACCOUNT ACCESS?" : "RESTORE ACCOUNT ACCESS?",
            `Are you sure you want to ${newStatus ? 'suspend' : 'reinstate'} this host's credentials?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM ACTION", 
                    style: newStatus ? "destructive" : "default",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, "users", userId);
                            await updateDoc(userRef, {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "Active"
                            });
                        } catch (err) {
                            Alert.alert("SYSTEM ERROR", "Unable to update account status.");
                        }
                    }
                }
            ]
        );
    };

    const renderExpert = ({ item }: { item: ExpertData }) => {
        const isBlocked = item.status === 'Blocked' || item.isBlocked;
        const isPending = item.status === 'Pending' || item.isApplying === true;

        return (
            <View style={[styles.card, isPending && styles.pendingCard]}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        {item.photoURL ? (
                            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text>
                            </View>
                        )}
                        <View style={[styles.statusDot, { backgroundColor: isPending ? '#FBBF24' : (isBlocked ? '#EF4444' : '#10B981') }]} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
                        <Text style={styles.idText}>SYSTEM ID: {item.uid?.slice(0, 12) || item.id.slice(0, 12)}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { 
                        backgroundColor: isPending ? '#FBBF2415' : (isBlocked ? '#EF444415' : '#10B98115'),
                        borderColor: isPending ? '#FBBF2430' : (isBlocked ? '#EF444430' : '#10B98130') 
                    }]}>
                        <Text style={[styles.statusText, { color: isPending ? '#FBBF24' : (isBlocked ? '#EF4444' : '#10B981') }]}>
                            {(item.status || 'ACTIVE').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {!isPending && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>TIER LEVEL</Text>
                            <Text style={styles.statValue}>{item.currentLevel ?? 0}</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>REWARD /MIN</Text>
                            <View style={styles.currencyRow}>
                                <MaterialCommunityIcons name="leaf" size={12} color="#FBBF24" />
                                <Text style={styles.statValue}> {item.beansPerMin || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>USER RATE</Text>
                            <View style={styles.currencyRow}>
                                <FontAwesome5 name="gem" size={10} color="#6366F1" />
                                <Text style={styles.statValue}> {item.userPrice ?? 0}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    {!isPending && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.secondaryAction, { borderColor: isBlocked ? '#10B98150' : '#EF444430' }]} 
                            onPress={() => toggleBlockStatus(item.id, !!isBlocked)}
                        >
                            <Feather name={isBlocked ? "unlock" : "user-x"} size={16} color={isBlocked ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.actionBtnText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                                {isBlocked ? 'RESTORE' : 'RESTRICT'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                         style={[styles.actionBtn, isPending ? styles.primaryActionPending : styles.primaryAction, { flex: 1.2 }]}
                         onPress={() => router.push(`/(admin)/experts/verify-expert/${item.id}`)} 
                    >
                        <MaterialCommunityIcons name={isPending ? "file-find-outline" : "shield-account-outline"} size={18} color="#fff" />
                        <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                            {isPending ? 'REVIEW ONBOARDING' : 'MANAGE'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>HOST HUB</Text>
                    <Text style={styles.subtitle}>Administrative Terminal • TalkPe OS</Text>
                </View>
                <View style={styles.countContainer}>
                    <Text style={styles.countText}>{experts.length}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={experts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpert}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
    subtitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
    countContainer: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#6366F115', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6366F130' },
    countText: { color: '#6366F1', fontWeight: '900', fontSize: 16 },
    loader: { flex: 1, justifyContent: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 150 },
    card: { backgroundColor: '#0F172A', padding: 22, borderRadius: 28, marginBottom: 18, borderWidth: 1, borderColor: '#1E293B' },
    pendingCard: { borderColor: '#FBBF2460', borderLeftWidth: 4, borderLeftColor: '#FBBF24' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatarImage: { width: 55, height: 55, borderRadius: 16, borderWidth: 1, borderColor: '#6366F130' },
    avatarPlaceholder: { width: 55, height: 55, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    avatarText: { color: '#6366F1', fontWeight: '900', fontSize: 22 },
    statusDot: { position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#0F172A' },
    name: { color: '#fff', fontSize: 18, fontWeight: '900' },
    idText: { color: '#475569', fontSize: 9, marginTop: 4, letterSpacing: 1 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20, backgroundColor: '#02061790', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginBottom: 5, letterSpacing: 0.8 },
    statValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
    currencyRow: { flexDirection: 'row', alignItems: 'center' },
    vDivider: { width: 1, height: '50%', backgroundColor: '#1E293B', alignSelf: 'center' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    actionBtn: { flex: 1, height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    secondaryAction: { backgroundColor: 'transparent', borderWidth: 1 },
    primaryAction: { backgroundColor: '#6366F1' },
    primaryActionPending: { backgroundColor: '#FBBF24' },
    actionBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});