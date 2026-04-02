import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
        // 🔍 Fetching only 'user' role
        const q = query(collection(db, "users"), where("role", "==", "user"));
        
        // ✅ MASS UPDATE: Error handling added to prevent terminal crashes
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(list);
            setLoading(false);
        }, (error) => {
            // Silently handling permission or fetch errors
            if (error.code === 'permission-denied') {
                console.log("Access restricted for some user documents.");
            } else {
                console.error("User Fetch Error:", error);
            }
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean, name: string) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "⚠️ BLOCK USER?" : "✅ RESTORE ACCESS?",
            `Are you sure you want to ${newStatus ? 'Restrict' : 'Unblock'} ${name || 'this user'}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Confirm Action", 
                    onPress: async () => {
                        try {
                            // Status change updated globally
                            await updateDoc(doc(db, "users", userId), {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "Active", // Syncing status field too
                                lastAdminAction: new Date()
                            });
                            
                            Alert.alert("Success", `User access has been ${newStatus ? 'restricted' : 'restored'}.`);
                        } catch (err: any) {
                            if (err.code === 'permission-denied') {
                                Alert.alert("System Failure", "You don't have permission to modify this user.");
                            } else {
                                Alert.alert("Error", "Update sync failed. Check connection.");
                            }
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item }: any) => {
        const isBlocked = item.isBlocked || item.status === 'Blocked';

        return (
            <View style={[styles.card, isBlocked && styles.blockedCard]}>
                <View style={styles.cardHeader}>
                    {/* Premium Avatar with Initials */}
                    <View style={styles.avatarContainer}>
                        <LinearGradient 
                            colors={['#1E293B', '#0F172A']} 
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>{item.name?.[0] || 'U'}</Text>
                        </LinearGradient>
                        <View style={[styles.indicator, { backgroundColor: isBlocked ? '#EF4444' : '#10B981' }]} />
                    </View>

                    <View style={styles.userInfo}>
                        <Text style={styles.userName} numberOfLines={1}>{item.name || 'TalkPe User'}</Text>
                        <View style={styles.detailRow}>
                            <Feather name="phone" size={10} color="#475569" />
                            <Text style={styles.userPhone}> {item.phoneNumber || 'Hidden'}</Text>
                        </View>
                    </View>

                    <View style={[styles.badge, { backgroundColor: isBlocked ? '#EF444415' : '#10B98115' }]}>
                        <Text style={[styles.badgeText, { color: isBlocked ? '#EF4444' : '#10B981' }]}>
                            {isBlocked ? 'BANNED' : 'ACTIVE'}
                        </Text>
                    </View>
                </View>

                {/* Info Footer */}
                <View style={styles.cardFooter}>
                    <Text style={styles.idLabel}>UID: {item.id.substring(0, 18)}...</Text>
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
                        <Text style={styles.actionBtnText}>{isBlocked ? ' RESTORE' : ' BLOCK'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>USER ROSTER</Text>
                    <Text style={styles.subtitle}>Active accounts on TalkPe Network</Text>
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
                            <Text style={styles.emptyText}>No users in the database.</Text>
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
        elevation: 5
    },
    blockedCard: { borderColor: '#EF444430', backgroundColor: '#EF444405' },
    
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