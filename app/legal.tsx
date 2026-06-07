import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC FROM MEMORY V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#FF0033', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

/**
 * TALKPE LEGAL CENTER
 * Professional Play Store Compliant Version
 */
export default function LegalScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
            }
        });
        return () => unsubscribe();
    }, [user]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = Math.max(
        userData?.totalDiamonds || 0,
        userData?.walletBalance || 0,
        userData?.balance || 0
    );
    const userTier = calculateUserLevel(userDiamonds);

    // Reusable Content Block for cleaner code
    const ContentSection = ({ icon, title, text, color }: { icon: any, title: string, text: string, color: string }) => (
        <View style={styles.contentBlock}>
            <View style={styles.titleRow}>
                <View style={[styles.iconBox, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.contentTitle, { color: color }]}>{title}</Text>
            </View>
            <View style={styles.textWrapper}>
                <Text style={styles.contentText}>{text}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient 
                colors={userTier.themeBg as any} 
                style={StyleSheet.absoluteFill} 
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                
                {/* --- HEADER HUD --- */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={[styles.backBtn, { borderColor: userTier.color + '40' }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>LEGAL CENTER</Text>
                        <View style={styles.syncRow}>
                            <View style={[styles.pulseDot, { backgroundColor: userTier.color }]} />
                            <Text style={styles.headerSub}>LAST UPDATED: MARCH 2026</Text>
                        </View>
                    </View>
                </View>

                {/* --- TAB SWITCHER --- */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'terms' && { backgroundColor: userTier.color }]} 
                        onPress={() => setActiveTab('terms')}
                    >
                        <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                            TERMS OF SERVICE
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'privacy' && { backgroundColor: userTier.secondaryColor }]} 
                        onPress={() => setActiveTab('privacy')}
                    >
                        <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                            PRIVACY POLICY
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {activeTab === 'terms' ? (
                        <View style={styles.glassCard}>
                            <ContentSection 
                                icon="shield-account"
                                color="#6366F1"
                                title="1. Community Guidelines (18+ ONLY)" 
                                text="TalkPe Pro is a premium live interaction platform strictly restricted to users aged 18 and above. All participants must engage with respect. Any form of harassment or policy violation will lead to immediate account suspension under our zero-tolerance policy." 
                            />
                            <ContentSection 
                                icon="gamepad-variant"
                                color="#0EA5E9"
                                title="2. Digital Assets & Skill Games" 
                                text="Diamonds are virtual in-app assets used to connect with hosts and as Entry Fees for skill-based games (Reflex Arena, Memory Match). Diamonds have NO real-world monetary value and cannot be cashed out. We strictly prohibit gambling. All purchases are non-refundable." 
                            />
                            <ContentSection 
                                icon="alert-octagon"
                                color="#F43F5E"
                                title="3. Interaction Safety & Reporting" 
                                text="Users and Hosts have access to immediate 'Block' and 'Report' functions during Video Calls, Quick Connect sessions, and on profiles. All user reports are reviewed by our moderation team within 24 hours to ensure platform integrity." 
                            />
                            <ContentSection 
                                icon="security"
                                color="#10B981"
                                title="4. User Responsibility" 
                                text="You are responsible for maintaining the confidentiality of your account credentials. TalkPe Pro is not liable for unauthorized access resulting from user negligence or shared sensitive information." 
                            />
                            <ContentSection 
                                icon="gavel"
                                color="#F59E0B"
                                title="5. Content Moderation & Spotlight" 
                                text="We maintain strict User-Generated Content (UGC) policies. Spotlight videos can be reported and will be hidden pending a 24-hour administrator review. Violating content will result in permanent account termination without refunds." 
                            />
                            <ContentSection 
                                icon="wifi-off"
                                color="#8B5CF6"
                                title="6. Game Disconnect Policy" 
                                text="In the event of a network disconnection during skill-based games, our system evaluates the match state to prevent unfair Diamond loss. Validated disconnections or server errors will be resolved automatically to protect your digital assets." 
                            />
                        </View>
                    ) : (
                        <View style={styles.glassCard}>
                            <ContentSection 
                                icon="microphone-off"
                                color="#A855F7"
                                title="1. Communication Privacy & No Recording" 
                                text="All live interactions (Quick Connect, Live Rooms) utilize industry-standard encryption. We operate under a strict zero-knowledge framework; your private video and audio calls are NEVER recorded, stored, or monitored by TalkPe Pro." 
                            />
                            <ContentSection 
                                icon="database-lock"
                                color="#EC4899"
                                title="2. Information Security" 
                                text="Your profile and identity data are secured within Firebase encrypted clusters. We maintain a strict policy against selling or sharing your personal data with third-party advertisers for marketing purposes." 
                            />
                            <ContentSection 
                                icon="credit-card-chip"
                                color="#F59E0B"
                                title="3. Transaction Protection" 
                                text="Financial details are processed exclusively via secure Google Play Billing and verified payment vaults. Sensitive information like CVV or banking passwords never pass through or get stored within the TalkPe Pro local system." 
                            />
                            <ContentSection 
                                icon="eye-off"
                                color="#06B6D4"
                                title="4. Data Permissions" 
                                text="Camera and Microphone access is strictly requested for live call durations only. Any media access is limited to profile personalization. You can manage or revoke these permissions via your device settings at any time." 
                            />
                            <ContentSection 
                                icon="delete-sweep"
                                color="#14B8A6"
                                title="5. Data Deletion Rights" 
                                text="In strict compliance with Google Play Developer Policies, users retain full rights over their data. You can request complete deletion of your account and associated data through the app settings at any time, which will permanently wipe your identity from our servers." 
                            />
                        </View>
                    )}

                    {/* --- FOOTER HUD --- */}
                    <View style={styles.footer}>
                        <LinearGradient 
                            colors={[userTier.color, userTier.secondaryColor]} 
                            start={{x:0, y:0}} end={{x:1, y:0}} 
                            style={styles.shieldGlow}
                        >
                            <View style={styles.shieldInner}>
                                <Ionicons name="shield-checkmark" size={30} color="#FFF" />
                            </View>
                        </LinearGradient>
                        <Text style={styles.footerText}>SECURE PROTOCOL v1.0.5</Text>
                        <View style={styles.brandRow}>
                            <Text style={styles.footerSub}>MANAGED BY </Text>
                            <Text style={[styles.brandHighlight, { color: userTier.color }]}>TALKPE TECHNOLOGIES✨</Text>
                        </View>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 25 },
    headerTextContainer: { marginLeft: 18 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 },
    headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20, borderRadius: 25, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 20 },
    activeTabTerms: { backgroundColor: '#6366F1' }, 
    activeTabPrivacy: { backgroundColor: '#A855F7' }, 
    tabText: { color: '#475569', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    activeTabText: { color: '#FFF' },
    scrollContent: { padding: 20 },
    glassCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 35, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contentBlock: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 15 },
    contentTitle: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
    textWrapper: { paddingLeft: 53 },
    contentText: { color: '#94A3B8', fontSize: 13, lineHeight: 22, fontWeight: '600' },
    footer: { marginTop: 30, alignItems: 'center' },
    shieldGlow: { width: 70, height: 70, borderRadius: 35, padding: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    shieldInner: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerSub: { color: '#334155', fontSize: 10, fontWeight: '800' },
    brandHighlight: { color: '#475569', fontSize: 10, fontWeight: '900' }
});