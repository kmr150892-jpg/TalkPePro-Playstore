import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react'; // 🔥 SYSTEM LOGIC: Reference hook for animations
import {
    ActivityIndicator,
    Alert,
    Animated, // 🔥 SYSTEM LOGIC: Animation engine for risk alerts
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function UserControl() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🔍 Synchronizing client-role profiles only
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

    const toggleBlockStatus = async (userId: string, currentStatus: boolean, name: string) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "⚠️ RESTRICT ACCESS?" : "✅ RESTORE ACCESS?",
            `Are you sure you want to ${newStatus ? 'restrict' : 'restore'} platform access for ${name || 'this client'}?`,
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
                            
                            Alert.alert("Success", `Client access has been ${newStatus ? 'restricted' : 'restored'} successfully.`);
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

    // 🔥 SYSTEM LOGIC: Dynamic Blinking Animation for High-Priority Alerts 🔥
    const useBlinkAnimation = () => {
        const anim = useRef(new Animated.Value(1)).current;
        useEffect(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();
        }, []);
        return anim;
    };

    const renderUser = ({ item }: any) => {
        const isBlocked = item.isBlocked || item.status === 'Blocked' || item.forceLogout === true;
        
        // 🔥 SYSTEM LOGIC: Global Trust-Score Verification 🔥
        const blockCount = item.expertBlockCount || 0;
        const isHighRisk = blockCount >= 5;

        // Condition-safe internal renderer for animation synchronization
        const BlinkRenderer = () => {
            const blinkOpacity = useBlinkAnimation();
            
            return (
                <View style={[styles.card, isBlocked ? styles.blockedCard : (isHighRisk ? styles.highRiskCard : {})]}>
                    
                    {/* 🔥 SYSTEM ALARM: HIGH-RISK INDICATOR 🔥 */}
                    {isHighRisk && !isBlocked && (
                        <Animated.View style={[styles.criticalAlertBadge, { opacity: blinkOpacity }]}>
                            <MaterialCommunityIcons name="alert-octagram" size={14} color="#FFF" />
                            <Text style={styles.criticalAlertText}>CRITICAL REVIEW REQUIRED</Text>
                        </Animated.View>
                    )}

                    <View style={styles.cardHeader}>
                        {/* Normalized Profile Avatar Component */}
                        <View style={styles.avatarContainer}>
                            <LinearGradient 
                                colors={isHighRisk && !isBlocked ? ['#EF4444', '#7F1D1D'] : ['#1E293B', '#0F172A']} 
                                style={styles.avatarGradient}
                            >
                                <Text style={[styles.avatarText, isHighRisk && !isBlocked && { color: '#FFF' }]}>{item.name?.[0] || 'C'}</Text>
                            </LinearGradient>
                            <View style={[styles.indicator, { backgroundColor: isBlocked ? '#EF4444' : (isHighRisk ? '#EF4444' : '#10B981') }]} />
                        </View>

                        <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>{item.name || 'Platform Client'}</Text>
                            <View style={styles.detailRow}>
                                <Feather name="phone" size={10} color="#475569" />
                                <Text style={styles.userPhone}> {item.phoneNumber || 'Verification Encrypted'}</Text>
                            </View>
                            
                            {/* 🔥 Display total safety flags from consultants 🔥 */}
                            {blockCount > 0 && (
                                <View style={styles.detailRow}>
                                    <MaterialCommunityIcons name="account-cancel-outline" size={12} color="#EF4444" />
                                    <Text style={[styles.userPhone, { color: '#EF4444', fontWeight: 'bold' }]}>
                                        {' '}Flagged by {blockCount} Consultants
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={[styles.badge, { backgroundColor: isBlocked ? '#EF444415' : (isHighRisk ? '#EF444430' : '#10B98115') }]}>
                            <Text style={[styles.badgeText, { color: isBlocked ? '#EF4444' : (isHighRisk ? '#EF4444' : '#10B981') }]}>
                                {isBlocked ? 'RESTRICTED' : (isHighRisk ? 'REVIEW' : 'ACTIVE')}
                            </Text>
                        </View>
                    </View>

                    {/* Operational Footer */}
                    <View style={styles.cardFooter}>
                        <Text style={styles.idLabel}>REF: {item.id.substring(0, 18).toUpperCase()}...</Text>
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: isBlocked ? '#10B981' : '#EF4444' }]} 
                            onPress={() => toggleBlockStatus(item.id, isBlocked, item.name)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons 
                                name={isBlocked ? "account-check" : "account-off"} 
                                size={18} 
                                color="#fff" 
                            />
                            <Text style={styles.actionBtnText}>{isBlocked ? ' RESTORE' : ' RESTRICT'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        };

        return <BlinkRenderer />;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>CLIENT ROSTER</Text>
                    <Text style={styles.subtitle}>Registered accounts on TalkPe secure network</Text>
                </View>
                <View style={styles.statsBadge}>
                    <Text style={styles.statsCount}>{users.length}</Text>
                </View>
            </View>
            
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator color="#6366F1" size="large" />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUser}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyView}>
                            <MaterialCommunityIcons name="account-search-outline" size={60} color="#1E293B" />
                            <Text style={styles.emptyText}>No registered profiles in current database.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { 
        paddingTop: 60, 
        paddingHorizontal: 25, 
        paddingBottom: 20, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
    subtitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
    statsBadge: { 
        backgroundColor: '#6366F120', 
        paddingVertical: 10, 
        paddingHorizontal: 15, 
        borderRadius: 15, 
        borderWidth: 1, 
        borderColor: '#6366F140' 
    },
    statsCount: { color: '#6366F1', fontWeight: '900', fontSize: 16 },
    
    listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
    card: { 
        backgroundColor: '#0F172A70', 
        borderRadius: 30, 
        padding: 20, 
        marginBottom: 15, 
        borderWidth: 1, 
        borderColor: '#1E293B',
        elevation: 5,
        position: 'relative' 
    },
    blockedCard: { borderColor: '#EF444430', backgroundColor: '#EF444405' },
    highRiskCard: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 1.5 }, 
    
    criticalAlertBadge: { position: 'absolute', top: -8, right: 20, backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4, elevation: 10, shadowColor: '#EF4444', shadowRadius: 8, shadowOpacity: 0.8 },
    criticalAlertText: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatarGradient: { 
        width: 55, 
        height: 55, 
        borderRadius: 20, 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    avatarText: { color: '#6366F1', fontSize: 22, fontWeight: '900' },
    indicator: { 
        position: 'absolute', 
        bottom: -2, 
        right: -2, 
        width: 14, 
        height: 14, 
        borderRadius: 7, 
        borderWidth: 3, 
        borderColor: '#0F172A' 
    },
    
    userInfo: { flex: 1, marginLeft: 15 },
    userName: { color: '#fff', fontSize: 18, fontWeight: '800' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    userPhone: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
    
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    
    cardFooter: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: 20, 
        paddingTop: 15, 
        borderTopWidth: 1, 
        borderTopColor: '#1E293B' 
    },
    idLabel: { color: '#334155', fontSize: 9, fontFamily: 'monospace' },
    actionBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 10, 
        paddingHorizontal: 18, 
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5
    },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    
    loader: { flex: 1, justifyContent: 'center' },
    emptyView: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#475569', marginTop: 15, fontWeight: '700' }
});