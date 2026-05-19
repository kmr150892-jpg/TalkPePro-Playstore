import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../firebaseConfig';

export default function UserPassbookList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [usersList, setUsersList] = useState<any[]>([]);

    useEffect(() => {
        // Synchronizing strictly with Client-role profiles
        const q = query(collection(db, 'users'), where('role', '==', 'user'));
        
        const unsub = onSnapshot(q, (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsersList(fetched);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const filteredList = usersList.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.id && u.id.includes(searchQuery)) ||
        (u.phone && u.phone.includes(searchQuery))
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.userCard}
            onPress={() => router.push(`/(admin)/passbook/user-detail/${item.id}` as any)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarBox}>
                    {item.profilePic || item.photoURL ? (
                        <Image source={{ uri: item.profilePic || item.photoURL }} style={styles.avatar} />
                    ) : (
                        <Text style={styles.avatarText}>{item.name?.[0] || 'C'}</Text>
                    )}
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.userName}>{item.name || 'Platform Client'}</Text>
                    <Text style={styles.userId} numberOfLines={1}>REF: {String(item.id).toUpperCase()}</Text>
                </View>
                <View style={styles.viewBtn}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#818CF8" />
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statLabel}>ALLOCATED BALANCE</Text>
                    <Text style={[styles.statValue, { color: '#3B82F6' }]}>{item.balance || 0} 💎</Text>
                </View>
                
                <View style={styles.statLine} />

                {/* 🔥 SYSTEM ACTION: LEDGER AUDIT INTERFACE 🔥 */}
                <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push(`/(admin)/passbook/user-detail/${item.id}` as any)}
                >
                    <Text style={styles.actionBtnText}>AUDIT LEDGER</Text>
                    <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Client Ledger</Text>
                    <Text style={styles.headerSub}>Total Registered Clients: {usersList.length}</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#64748B" style={{ marginLeft: 15 }} />
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search by Name, Ref or Contact..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>
            ) : (
                <FlatList 
                    data={filteredList}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="account-search" size={48} color="#334155" />
                            <Text style={styles.emptyText}>No Discovering client profiles found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
    backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 2 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', marginHorizontal: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
    searchInput: { flex: 1, height: 50, color: '#FFF', paddingHorizontal: 15, fontWeight: '600' },
    
    userCard: { backgroundColor: '#0F172A', padding: 18, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B', elevation: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 15, marginBottom: 15 },
    
    avatarBox: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    avatarText: { color: '#818CF8', fontWeight: '900', fontSize: 18 },
    
    userName: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    userId: { color: '#64748B', fontSize: 10, marginTop: 4, fontWeight: '700' },
    
    viewBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flex: 1 },
    statLine: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 15 },
    statLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '900' },
    
    actionBtn: { flex: 1.2, backgroundColor: '#6366F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 14, gap: 8, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    actionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', marginTop: 60, opacity: 0.7 },
    emptyText: { color: '#64748B', textAlign: 'center', marginTop: 10, fontWeight: '600', fontSize: 12 }
});