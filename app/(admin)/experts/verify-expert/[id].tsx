import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function VerifyExpertDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [expert, setExpert] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const expertId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (!expertId) return;
        
        const unsub = onSnapshot(doc(db, "users", expertId), 
            (snapshot) => {
                if (snapshot.exists()) {
                    setExpert({ id: snapshot.id, ...snapshot.data() });
                }
                setLoading(false);
            }, (err) => {
                console.error("Sync Error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [expertId]);

    const handleVerification = async (action: 'APPROVE' | 'REJECT') => {
        const isApprove = action === 'APPROVE';
        setProcessing(true);
        try {
            const userRef = doc(db, "users", expertId as string);
            const updateData: any = {
                status: isApprove ? "Active" : "Rejected", 
                role: isApprove ? "expert" : "user", 
                isApplying: false, 
                isVerified: isApprove,
                lastAdminAction: serverTimestamp(),
            };

            if (isApprove) {
                updateData.verifiedAt = serverTimestamp();
                updateData.walletBalance = expert?.walletBalance || 0; 
                updateData.totalBeansEarned = expert?.totalBeansEarned || 0;
                
                // 🔥 THE FIX: Start at Level 0 (Beginner) instead of 1 🔥
                updateData.currentLevel = 0;
                updateData.levelTitle = "BEGINNER";
                
                updateData.beansPerMin = 1000; 
                updateData.userPrice = 2000;   
            }

            await updateDoc(userRef, updateData);
            Alert.alert("SYSTEM UPDATED", `Host access is now ${isApprove ? 'Authorized' : 'Declined'}.`);
            router.back();
        } catch (err) {
            Alert.alert("ERROR", "System update failed.");
        } finally {
            setProcessing(false);
        }
    };

    const toggleBlockStatus = async () => {
        const isCurrentlyBlocked = expert?.isBlocked || expert?.status === 'Blocked';
        const nextStatus = !isCurrentlyBlocked;

        Alert.alert(
            nextStatus ? "RESTRICT HOST?" : "RESTORE ACCESS?",
            `Are you sure you want to ${nextStatus ? 'restrict' : 'restore'} platform access for ${expert?.name}?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM", 
                    style: nextStatus ? "destructive" : "default",
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const userRef = doc(db, "users", expertId as string);
                            await updateDoc(userRef, {
                                isBlocked: nextStatus,
                                status: nextStatus ? "Blocked" : "Active"
                            });
                        } catch (err) {
                            Alert.alert("ERROR", "Access modification failed.");
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    // Helper to open ID Proof
    const openIdProof = () => {
        if (expert?.idProof) {
            Linking.openURL(expert.idProof);
        } else {
            Alert.alert("Not Found", "Identity document not uploaded yet.");
        }
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator color="#6366F1" size="large" />
        </View>
    );

    const isPending = expert?.status === 'Pending' || expert?.isApplying === true;
    const isBlocked = expert?.status === 'Blocked' || expert?.isBlocked;
    const expertPhoto = expert?.profilePic || expert?.photoURL || expert?.image;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{isPending ? 'ONBOARDING REVIEW' : 'HOST CONSOLE'}</Text>
                    <Text style={styles.headerSub}>SYSTEM ID: {String(expertId || '').toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.imageContainer}>
                        {expertPhoto ? (
                            <Image source={{ uri: expertPhoto }} style={styles.selfie} resizeMode="cover" />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Feather name="user" size={60} color="#1E293B" />
                            </View>
                        )}
                        <LinearGradient colors={['transparent', 'rgba(2,6,23,0.95)']} style={styles.imageOverlay} />
                    </View>
                    <View style={styles.infoOverlay}>
                        <Text style={styles.name}>{expert?.name || 'ARUVI MULTIVERSE'}</Text>
                        <View style={[styles.statusBadge, { borderColor: isPending ? '#F59E0B' : (isBlocked ? '#EF4444' : '#10B981') }]}>
                            <View style={[styles.dot, { backgroundColor: isPending ? '#F59E0B' : (isBlocked ? '#EF4444' : '#10B981') }]} />
                            <Text style={[styles.statusText, { color: isPending ? '#F59E0B' : (isBlocked ? '#EF4444' : '#10B981') }]}>
                                {isPending ? 'PENDING VERIFICATION' : (isBlocked ? 'ACCESS RESTRICTED' : 'ACTIVE HOST')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* METRICS & ANALYTICS */}
               {!isPending && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="finance" size={14} color="#6366F1" />
                            <Text style={styles.sectionTitle}>OPERATIONAL METRICS</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>REWARDS</Text>
                                <View style={styles.currencyRow}>
                                    {/* 🔥 SATTI UPDATE: REPLACED LEAF WITH MEDAL 🎖️ */}
                                    <Text style={{ fontSize: 16 }}>🎖️</Text>
                                    <Text style={styles.statValue}> {expert?.walletBalance || 0}</Text>
                                </View>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>BALANCE (RS)</Text>
                                <View style={styles.currencyRow}>
                                    <FontAwesome5 name="wallet" size={14} color="#10B981" />
                                    <Text style={styles.statValue}> ₹{Math.floor((expert?.walletBalance || 0) / 100)}</Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* ✅ TIER BOX */}
                        <View style={[styles.statBox, { marginTop: 15, width: '100%', flexDirection: 'row', justifyContent: 'space-between' }]}>
                             <Text style={styles.statLabel}>HOST TIER</Text>
                             <Text style={[styles.statValue, { fontSize: 14, color: '#6366F1' }]}>{expert?.levelTitle || 'BEGINNER L0'}</Text>
                        </View>
                    </View>
                )}

                {/* HOST CREDENTIALS */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Feather name="shield" size={14} color="#6366F1" />
                        <Text style={styles.sectionTitle}>HOST CREDENTIALS</Text>
                    </View>
                    <View style={styles.glassBox}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>NAME:</Text>
                            <Text style={styles.infoValue}>{expert?.name || 'ARUVI MULTIVERSE'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>GENDER:</Text>
                            <Text style={styles.infoValue}>{expert?.gender || 'Female'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>BASE RATE:</Text>
                            <View style={styles.valRow}>
                                {/* 🔥 SATTI UPDATE: REPLACED LEAF WITH MEDAL 🎖️ */}
                                <Text style={{ fontSize: 14, marginRight: 4 }}>🎖️</Text>
                                <Text style={styles.infoValue}>{expert?.pricePerMin || 1000} /min</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>LOCATION:</Text>
                            <Text style={styles.infoValue}>{expert?.location || 'Chennai'}</Text>
                        </View>
                    </View>
                </View>

                {/* FINANCIAL & ID CONFIGURATION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <FontAwesome5 name="university" size={12} color="#6366F1" />
                        <Text style={styles.sectionTitle}>FINANCIAL & ID CONFIGURATION</Text>
                    </View>
                    <View style={styles.glassBox}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>HOLDER NAME:</Text>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.holderName || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>ACCOUNT NO:</Text>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.accountNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>IFSC CODE:</Text>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.ifsc || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>KYC DOCUMENT:</Text>
                            {expert?.idProof ? (
                                <TouchableOpacity onPress={openIdProof}>
                                    <Image source={{ uri: expert.idProof }} style={styles.idThumb} />
                                    <Text style={{color: '#6366F1', fontSize: 10, marginTop: 5, fontWeight: '900'}}>TAP TO VIEW</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[styles.infoValue, { color: '#EF4444' }]}>NOT UPLOADED</Text>
                            )}
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* ACTION FOOTER */}
            <View style={styles.footerContainer}>
                <BlurView intensity={80} tint="dark" style={styles.footerBlur}>
                    {isPending ? (
                        <>
                            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleVerification('REJECT')} disabled={processing}>
                                <Text style={styles.rejectBtnText}>DECLINE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleVerification('APPROVE')} disabled={processing}>
                                {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveBtnText}>AUTHORIZE</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.actionBtn, isBlocked ? styles.unblockBtn : styles.blockBtn]} 
                            onPress={toggleBlockStatus}
                            disabled={processing}
                        >
                            <Feather name={isBlocked ? "unlock" : "slash"} size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>{isBlocked ? 'RESTORE ACCESS' : 'RESTRICT HOST'}</Text>
                        </TouchableOpacity>
                    )}
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
    headerText: { marginLeft: 15 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    headerSub: { color: '#475569', fontSize: 9, fontWeight: '800', marginTop: 2 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },
    profileCard: { height: 380, borderRadius: 35, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B', backgroundColor: '#0F172A', marginBottom: 25 },
    imageContainer: { flex: 1 },
    selfie: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    infoOverlay: { position: 'absolute', bottom: 25, left: 25 },
    name: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10, borderWidth: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: '#6366F1', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 1.5 },
    glassBox: { backgroundColor: '#0F172A', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    valRow: { flexDirection: 'row', alignItems: 'center' },
    infoLabel: { color: '#475569', fontSize: 10, fontWeight: '900' },
    infoValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 15 },
    statsRow: { flexDirection: 'row', gap: 15 },
    statBox: { flex: 1, backgroundColor: '#0F172A', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
    statLabel: { color: '#475569', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    currencyRow: { flexDirection: 'row', alignItems: 'center' },
    footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    footerBlur: { paddingHorizontal: 20, paddingVertical: 35, flexDirection: 'row', gap: 15 },
    actionBtn: { flex: 1, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    rejectBtn: { backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF4444' },
    rejectBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    approveBtn: { backgroundColor: '#6366F1' },
    approveBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    blockBtn: { backgroundColor: '#EF4444' },
    unblockBtn: { backgroundColor: '#10B981' },
    idThumb: { width: 120, height: 70, borderRadius: 12, backgroundColor: '#1E293B', marginTop: 5 }
});