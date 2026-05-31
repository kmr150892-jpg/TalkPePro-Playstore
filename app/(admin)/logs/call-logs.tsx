import { Feather } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const CallLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 🔥 SYSTEM STATE: Tab state to toggle between ACTIVE and ARCHIVED sessions
    const [activeTab, setActiveTab] = useState<'LIVE' | 'RECENT'>('RECENT');

    useEffect(() => {
        // 📞 Fetching Last 50 Platform Sessions
        // 🔥 SYSTEM LOGIC: Using 'createdAt' for precise chronological synchronization
        const q = query(collection(db, "calls"), orderBy("createdAt", "desc"), limit(50));
        
        const unsubscribe = onSnapshot(q, (snap) => {
            const callData = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(callData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 🔥 SYSTEM FILTER: Show only ACTIVE sessions or ALL recent history
    const displayData = logs.filter(log => {
        if (activeTab === 'RECENT') return true;
        
        // If ACTIVE tab is selected, only show ongoing platform connections
        const status = log.status ? String(log.status).toLowerCase() : '';
        return status === 'ongoing' || status === 'active' || status === 'connecting' || status === 'connected';
    });

    const renderCallItem = ({ item }: any) => {
        // 🔥 DATE SYNCHRONIZATION
        let formattedDate = "Timestamp Unknown";
        const timeData = item.createdAt || item.timestamp || item.connectedAt || item.startTime;
        if (timeData) {
            try {
                formattedDate = timeData.toDate ? timeData.toDate().toLocaleString('en-IN') : new Date(timeData).toLocaleString('en-IN');
            } catch (e) {}
        }

        // 🔥 SESSION DURATION ANALYTICS
        const durationSecs = Number(item.finalDuration || item.duration || item.callDuration || item.time || 0);
        const displayMins = Math.floor(durationSecs / 60);
        const displaySecs = durationSecs % 60;
        const timeText = displayMins > 0 ? `${displayMins}m ${displaySecs}s` : `${displaySecs}s`;

        // 🔥 UNIT ALLOCATION ANALYTICS (Service Units instead of Currency)
        const unitsAllocated = Number(item.totalDiamonds || item.diamonds || item.amount || item.coins || item.cost || item.spentDiamonds || 0);

        const isLive = ['ongoing', 'active', 'connecting', 'connected'].includes(String(item.status || '').toLowerCase());

        return (
            <View style={[styles.logCard, isLive && { borderColor: '#6366F1' }]}>
                <View style={[styles.iconBox, isLive && { backgroundColor: '#6366F120' }]}>
                    <Feather 
                        name={isLive ? "phone-call" : (item.status === 'completed' || item.status === 'SUCCESS' ? "phone-incoming" : "phone-missed")} 
                        size={20} 
                        color={isLive ? "#6366F1" : (item.status === 'completed' || item.status === 'SUCCESS' ? "#10B981" : "#EF4444")} 
                    />
                </View>
                
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.userText}>{item.callerName || item.userName || item.user_name || 'User'} ↔ {item.expertName || item.expert_name || item.receiverName || 'Host'}</Text>
                    <Text style={styles.subText}>
                        {timeText} • {formattedDate}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.costText, isLive && { color: '#6366F1' }]}>
                        {isLive ? 'Active' : `- 💎${unitsAllocated}`}
                    </Text>
                    <Text style={[styles.statusTag, isLive && { color: '#6366F1' }]}>
                        {String(item.status || 'UNVERIFIED').toUpperCase()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.title}>SESSION & AUDIT LOGS</Text>
                <Text style={styles.subtitle}>Real-time monitoring of system connections</Text>
            </View>

            {/* 🔥 TAB INTERFACE: ACTIVE vs ARCHIVED */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'RECENT' && styles.tabActive]}
                    onPress={() => setActiveTab('RECENT')}
                >
                    <Text style={[styles.tabText, activeTab === 'RECENT' && styles.tabTextActive]}>ARCHIVED SESSIONS</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'LIVE' && styles.tabActive]}
                    onPress={() => setActiveTab('LIVE')}
                >
                    <Text style={[styles.tabText, activeTab === 'LIVE' && styles.tabTextActive]}>🔴 ACTIVE NOW</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={displayData}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCallItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>{activeTab === 'LIVE' ? 'No active sessions monitored.' : 'No session history found.'}</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 15 },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#475569', fontSize: 12, marginTop: 4 },
    
    tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#1E293B' },
    tabActive: { borderBottomColor: '#6366F1' },
    tabText: { color: '#475569', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    tabTextActive: { color: '#6366F1', fontWeight: '900' },

    logCard: { 
        backgroundColor: '#0F172A', 
        padding: 18, 
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    iconBox: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
    userText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    subText: { color: '#64748B', fontSize: 11, marginTop: 4 },
    costText: { color: '#EF4444', fontWeight: '900', fontSize: 14 },
    statusTag: { color: '#475569', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
    empty: { color: '#475569', textAlign: 'center', marginTop: 100 }
});

export default CallLogs;