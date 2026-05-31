import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { arrayRemove, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

export default function BlockedUsersScreen() {
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            if (!auth.currentUser) return;
            const expertSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            const blockedIds = expertSnap.data()?.blockedUsers || [];

            const userDetails = await Promise.all(
                blockedIds.map(async (id: string) => {
                    const uSnap = await getDoc(doc(db, "users", id));
                    return { id, ...uSnap.data() };
                })
            );
            setBlockedUsers(userDetails);
        } catch (e) {
            console.log("Error fetching blocked users:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = async (userId: string, userName: string) => {
        Alert.alert(
            "RESTORE ACCESS",
            `Do you want to unblock ${userName}?`, // 🔥 SATTI FIX: Clear English for Play Store
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "RESTORE", 
                    style: "default", 
                    onPress: async () => {
                        try {
                            const expertRef = doc(db, "users", auth.currentUser!.uid);
                            await updateDoc(expertRef, {
                                blockedUsers: arrayRemove(userId)
                            });
                            
                            setBlockedUsers(prev => prev.filter(u => u.id !== userId));
                            Alert.alert("SUCCESS", "User link restored!");
                        } catch (e) {
                            Alert.alert("ERROR", "Uplink failed.");
                        }
                    } 
                }
            ]
        );
    };

    if (loading) return (
        <View style={styles.darkLoader}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loaderText}>DECRYPTING DATABASE...</Text>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerHud}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>SECURITY PROTOCOL</Text>
                        <Text style={styles.headerTitle}>BLACKLISTED NODES</Text>
                    </View>
                </View>
            </SafeAreaView>

            {blockedUsers.length === 0 ? (
                <View style={styles.center}>
                    <View style={styles.emptyCircle}>
                        <MaterialCommunityIcons name="shield-check-outline" size={60} color="#6366F1" />
                    </View>
                    <Text style={styles.emptyTitle}>ZONE SECURE</Text>
                    <Text style={styles.emptySub}>No restricted nodes detected in your sector.</Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    renderItem={({ item }) => {
                        // 🔥 SATTI FIX: Admin Flag preview logic maintained
                        const isHighRisk = (item.expertBlockCount || 0) >= 5;

                        return (
                            <BlurView intensity={10} tint="dark" style={[styles.glassCard, isHighRisk && { borderColor: '#EF4444' }]}>
                                <View style={styles.cardMain}>
                                    <LinearGradient 
                                        colors={isHighRisk ? ['#EF4444', '#7F1D1D'] : ['#F43F5E', '#881337']} 
                                        style={styles.avatarGlow}
                                    >
                                        <Image 
                                            source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${item.name || 'User'}&background=0F172A&color=fff` }} 
                                            style={styles.userImg} 
                                        />
                                    </LinearGradient>

                                    <View style={styles.infoArea}>
                                        <Text style={[styles.userNameText, isHighRisk && { color: '#EF4444' }]} numberOfLines={1}>
                                            {item.name || "UNIDENTIFIED"}
                                        </Text>
                                        <View style={styles.statusBadge}>
                                            <View style={[styles.offlineDot, isHighRisk && { backgroundColor: '#EF4444' }]} />
                                            <Text style={[styles.statusLabel, isHighRisk && { color: '#EF4444' }]}>
                                                {isHighRisk ? 'HIGH RISK TARGET' : 'UPLINK SEVERED'}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        style={styles.unblockActionBtn}
                                        onPress={() => handleUnblock(item.id, item.name)}
                                    >
                                        <LinearGradient 
                                            colors={['#6366F1', '#4F46E5']} 
                                            style={styles.unblockGrad}
                                        >
                                            <MaterialCommunityIcons name="lock-open-variant" size={20} color="#FFF" />
                                            <Text style={styles.unblockLabel}>UNBLOCK</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: '#6366F1', marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
    
    headerSafe: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    headerHud: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerLabel: { color: '#6366F1', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(99, 102, 241, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 4 },
    emptySub: { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 12, fontWeight: '600', lineHeight: 20 },

    glassCard: { 
        borderRadius: 25, 
        marginBottom: 15, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.08)', 
        backgroundColor: 'rgba(255,255,255,0.02)' 
    },
    cardMain: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    avatarGlow: { padding: 2, borderRadius: 22 },
    userImg: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#020617' },
    
    infoArea: { marginLeft: 15, flex: 1 },
    userNameText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F43F5E' },
    statusLabel: { color: '#F43F5E', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

    unblockActionBtn: { overflow: 'hidden', borderRadius: 15 },
    unblockGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    unblockLabel: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }
});