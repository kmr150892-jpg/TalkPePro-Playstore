import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const CallAnalytics = () => {
    const [liveCount, setLiveCount] = useState(0);
    const [successRate, setSuccessRate] = useState(0);
    
    // 🔥 NEW: Platform Session States
    const [totalTalktime, setTotalTalktime] = useState(0);
    const [todayTalktime, setTodayTalktime] = useState(0);
    
    const [loading, setLoading] = useState(true);
    
    // System Session Logs state
    const [callLogs, setCallLogs] = useState<any[]>([]);

    useEffect(() => {
        // 1. Live Sessions Monitor - Added "connected" status as requested
        const qLive = query(
            collection(db, "calls"), 
            where("status", "in", ["ongoing", "active", "connecting", "ONGOING", "Active", "connected", "CONNECTED"])
        );
        const unsubLive = onSnapshot(qLive, (snap) => {
            setLiveCount(snap.size);
            setLoading(false);
        });

        // 2. Success Rate & 🔥 Platform Session Calculation
        const unsubAll = onSnapshot(collection(db, "calls"), (snap) => {
            if (!snap.empty) {
                const total = snap.size;
                let completedCount = 0;
                let totalSecs = 0;
                let todaySecs = 0;
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                snap.docs.forEach(d => {
                    const data = d.data();
                    
                    // Session Success Verification
                    if (data.status === 'completed' || data.status === 'SUCCESS') {
                        completedCount++;
                    }

                    // 🔥 Session Duration Logic (convert all to seconds first)
                    const durationSecs = Number(data.finalDuration || data.duration || data.callDuration || data.time || 0);
                    totalSecs += durationSecs;

                    // Verify if session was executed today
                    const timeData = data.createdAt || data.timestamp || data.connectedAt || data.endedAt;
                    if (timeData) {
                        try {
                            const callDate = timeData.toDate ? timeData.toDate() : new Date(timeData);
                            if (callDate >= today) {
                                todaySecs += durationSecs;
                            }
                        } catch(e) {}
                    }
                });

                setSuccessRate(Math.round((completedCount / total) * 100));
                // Convert total seconds to minutes for dashboard metrics
                setTotalTalktime(Math.floor(totalSecs / 60));
                setTodayTalktime(Math.floor(todaySecs / 60));
            }
        });

        // 3. System Session Logs - Fetching latest operational data
        const qLogs = query(
            collection(db, "calls"), 
            orderBy("createdAt", "desc"), 
            limit(15) 
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            const logs: any[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
            
            // Validating recognized user/host sessions only
            const validLogs = logs.filter((log: any) => {
                const eName = log.expertName || log.expert_name || log.receiverName;
                const uName = log.callerName || log.userName || log.user_name;
                return (eName && eName.trim() !== '') && (uName && uName.trim() !== '');
            });
            
            setCallLogs(validLogs.slice(0, 10));
        });

        return () => { 
            unsubLive(); 
            unsubAll(); 
            unsubLogs();
        };
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color="#6366F1" size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* --- Live Sessions Operations --- */}
            <View style={styles.card}>
                <Text style={styles.label}>ACTIVE SESSIONS</Text>
                <View style={styles.row}>
                    <View style={styles.pulseIndicator} />
                    <Text style={styles.value}>{liveCount}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />

            {/* 🔥 NEW: Platform Usage Metrics */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, {backgroundColor: '#1E1B4B', borderColor: '#312E81'}]}>
                    <Text style={styles.cardLabel}>SYSTEM USAGE (MINS)</Text>
                    <Text style={[styles.cardValue, {color: '#818CF8'}]}>{totalTalktime.toLocaleString()}</Text>
                </View>
                <View style={[styles.statCard, {backgroundColor: '#422006', borderColor: '#713F12'}]}>
                    <Text style={styles.cardLabel}>TODAY'S USAGE (MINS)</Text>
                    <Text style={[styles.cardValue, {color: '#FBBF24'}]}>{todayTalktime.toLocaleString()}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            {/* --- Platform Health Section --- */}
            <View style={styles.card}>
                <Text style={styles.label}>OPERATIONAL SUCCESS RATE</Text>
                <Text style={[styles.value, { color: '#10B981' }]}>{successRate}%</Text>
            </View>

            <View style={styles.divider} />

            {/* --- System Activity Logs --- */}
            <View style={styles.card}>
                <Text style={styles.label}>SYSTEM ACTIVITY LOGS</Text>
                {callLogs.length === 0 ? (
                    <Text style={{color: '#475569', marginTop: 10}}>No recent operational logs found</Text>
                ) : (
                    callLogs.map((log: any) => {
                        // Operational Time Parsing
                        let formattedDate = "Processing Timestamp...";
                        const timeData = log.createdAt || log.timestamp || log.connectedAt;
                        if (timeData) {
                            try {
                                const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                                formattedDate = dateObj.toLocaleString('en-IN', { 
                                    day: 'numeric', month: 'short', year: 'numeric', 
                                    hour: '2-digit', minute: '2-digit', hour12: true 
                                });
                            } catch (e) {
                                formattedDate = "Timestamp Verification Error";
                            }
                        }

                        // Host/User Mapping (Keys strictly preserved)
                        const expertName = log.expertName || log.expert_name || 'Host';
                        const userName = log.callerName || log.userName || 'User';

                        // Duration Analytics
                        const durationSecs = Number(log.finalDuration || log.duration || 0);
                        const displayMins = Math.floor(durationSecs / 60);
                        const displaySecs = durationSecs % 60;
                        const timeText = displayMins > 0 ? `${displayMins}m ${displaySecs}s` : `${displaySecs}s`;

                        const unitsAllocated = Number(log.totalDiamonds || log.diamonds || 0);
                        const unitsRewarded = Number(log.expertEarnings || log.beans || 0);

                        return (
                            <View key={log.id} style={styles.logItem}>
                                {/* Header with UI Fix for Overflow */}
                                <View style={styles.logHeader}>
                                    <Text style={styles.logText} numberOfLines={1} ellipsizeMode="tail">
                                        {userName}  ➔  {expertName}
                                    </Text>
                                    <View style={styles.statusBox}>
                                        <Text style={[styles.logStatus, log.status === 'completed' || log.status === 'SUCCESS' ? {} : {color: '#F59E0B'}]}>
                                            {String(log.status || 'UNVERIFIED').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                
                                {/* Analytics Output Section */}
                                <Text style={styles.logSubText}>
                                    ⏱ {timeText}  |  💎 {unitsAllocated} Units  |  🫘 {unitsRewarded} Rewards
                                </Text>
                                
                                <Text style={styles.logDateText}>
                                    📅 {formattedDate}
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
            
            <View style={{height: 40}} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 30 },
    center: { alignItems: 'center', justifyContent: 'center' },
    card: { marginVertical: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    pulseIndicator: { 
        width: 12, height: 12, borderRadius: 6, 
        backgroundColor: '#6366F1', marginRight: 15,
        shadowColor: '#6366F1', shadowRadius: 10, elevation: 5
    },
    label: { color: '#475569', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    value: { color: '#fff', fontSize: 80, fontWeight: '900', marginTop: 5 },
    divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 40, opacity: 0.5 },
    
    // 🔥 NEW STYLES FOR PLATFORM USAGE CARDS
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statCard: { width: '48%', padding: 20, borderRadius: 20, borderWidth: 1 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    cardValue: { fontSize: 32, fontWeight: '900', marginTop: 8 },
    minText: { fontSize: 14, fontWeight: '700', color: '#64748B' }, // Kept for safety, though removed from UI text above

    logItem: {
        backgroundColor: '#0F172A', padding: 15, borderRadius: 16,
        marginTop: 12, borderWidth: 1, borderColor: '#1E293B'
    },
    logHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', 
        alignItems: 'center', gap: 10 
    },
    logText: { 
        color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 
    },
    statusBox: { flexShrink: 0 },
    logStatus: { color: '#10B981', fontSize: 10, fontWeight: '900', textAlign: 'right' },
    logSubText: { color: '#CBD5E1', fontSize: 13, marginTop: 8, fontWeight: '600' },
    logDateText: { color: '#64748B', fontSize: 11, marginTop: 8, fontWeight: '500' } 
});

export default CallAnalytics;