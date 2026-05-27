import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    LayoutAnimation,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// Enable LayoutAnimation for Android

const { width } = Dimensions.get('window');

// 🔥 AAA SMART DYNAMIC TIER ENGINE 🔥
const getSmartLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
    };

    const lvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (lvl !== undefined && lvl !== null) return getObj(Number(lvl));
    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title.includes('L10') || title.includes('LEGEND')) return getObj(10);
    if (title.includes('L9') || title.includes('MYTHIC')) return getObj(9);
    if (title.includes('L8') || title.includes('ELITE')) return getObj(8);
    if (title.includes('L7') || title.includes('MASTER')) return getObj(7);
    if (title.includes('L6') || title.includes('DIAMOND')) return getObj(6);
    if (title.includes('L5') || title.includes('PLATINUM')) return getObj(5);
    if (title.includes('L4') || title.includes('GOLD')) return getObj(4);
    if (title.includes('L3') || title.includes('SILVER')) return getObj(3);
    if (title.includes('L2') || title.includes('BRONZE')) return getObj(2);
    if (title.includes('L1') || title.includes('ROOKIE')) return getObj(1);
    return getObj(0);
};

// 🔥 MASS LEGAL DATABASE (ZERO LIABILITY FOR TALKPE PRO & PLAY STORE COMPLIANT) 🔥
const LEGAL_DOCS = [
    {
        id: 'tos',
        title: 'TERMS OF SERVICE',
        icon: 'file-document-outline',
        color: '#3B82F6',
        content: `1. ACCEPTANCE OF TERMS\nBy accessing TalkPe Pro, you agree to be bound by these Terms. You must be at least 18 years old to use this platform.\n\n2. PLATFORM ROLE\nTalkPe Pro acts solely as an intermediary connecting Clients and Consultants. We do not guarantee the accuracy, reliability, or success of any advice or consultation provided.\n\n3. PROHIBITED CONDUCT\nClients and Consultants are strictly prohibited from:\n- Sharing explicit, Policy Violation, or pornographic content.\n- Engaging in financial fraud, extortion, or blackmail.\n- Sharing personal contact information (Phone numbers, Social Media, UPI IDs) to bypass app protocols.\n\n4. PAYOUTS & WITHDRAWALS\nPayouts are processed manually within 5-7 working days after strict admin verification. Any errors in bank details provided by the Consultant will lead to payment delays or loss; the platform is not responsible. Admin holds the right to verify Consultant's identity and transactions before releasing payments.\n\n5. ADMIN ACTION & ENFORCEMENT\nPlatform administrators actively monitor user reports. Any user or consultant found violating these terms will face manual review and account suspension/ban within 24 hours of a verified report.`
    },
    {
        id: 'privacy',
        title: 'PRIVACY POLICY',
        icon: 'shield-account-outline',
        color: '#10B981',
        content: `1. DATA COLLECTION\nWe collect essential data (Name, Phone/Email, App Usage) to provide seamless Discovermaking and secure transactions.\n\n2. COMMUNICATION SECURITY\nFor safety and quality assurance, TalkPe Pro reserves the right to monitor, log, or record audio/video calls and chat messages through our secure servers.\n\n3. THIRD-Session SHARING\nYour payment and streaming data are processed securely via our trusted partners. We never sell your personal data to advertisers.\n\n4. DATA DELETION\nYou reserve the right to request account deletion. Upon request, all personal data will be wiped from our servers within 30 days.\n\n5. FINANCIAL DATA & PAYOUT SECURITY\nWe collect bank account information solely for the purpose of facilitating the payout of earned rewards to Consultants. These details are stored securely and encrypted in our database, accessible only by authorized platform administrators. Your financial data is strictly confidential and is not shared with any third-party marketing services.`
    },
    {
        id: 'expert_safety',
        title: 'CONSULTANT PROTECTION PROTOCOL',
        icon: 'security',
        color: '#F59E0B',
        content: `1. ZERO TOLERANCE FOR ABUSE\nTalkPe Pro ensures a safe working environment for all Consultants. Any user found harassing, stalking, or using abusive language will face an instant IP & Device Ban.\n\n2. FINANCIAL SECURITY\nConsultants are guaranteed their ACTIVITY_REWARDs for successfully completed calls. In cases of user chargebacks or disputes, TalkPe Pro will independently investigate to protect the Consultant's legitimate earnings.\n\n3. ANONYMITY & BLOCKING\nConsultants have full rights to disconnect calls immediately if they feel uncomfortable and can use the 'Block' feature to permanently prevent specific users from Discovering with them.`
    },
    {
        id: 'user_safety',
        title: 'CLIENT SAFETY GUIDELINES',
        icon: 'account-hard-hat',
        color: '#8B5CF6',
        content: `1. SECURE TRANSACTIONS\nAll transactions must happen within the TalkPe Pro app. Never transfer money directly to a Consultant's bank account or UPI. TalkPe Pro is not liable for off-platform scams.\n\n2. REPORTING MECHANISM & ADMIN ACTION\nIf a Consultant behaves unprofessionally or demands direct payments, use the 'Report' button immediately. Our moderation team reviews reports and takes definitive admin action (including permanent account suspension or ban) within 24 hours to maintain platform integrity.\n\n3. CONTENT WARNING\nConsultations (Astrology, Tarot, Coaching) are for entertainment and guidance purposes only. They do not substitute professional medical, psychological,financial or legal advice.`
    },
    {
        id: 'disclaimer',
        title: 'LIABILITY DISCLAIMER',
        icon: 'gavel',
        color: '#EF4444',
        content: `1. NO MEDICAL,FINANCIAL OR LEGAL ADVICE\nTalkPe Pro and its Consultants do not provide certified medical diagnoses, psychological therapies, or legal counsel. Always seek advice from licensed professionals for serious matters.\n\n2. INDEMNIFICATION\nYou agree to indemnify and hold TalkPe Pro, its founders, and employees harmless from any claims, damages, or losses arising from your use of the app or interactions with other users/consultants.\n\n3. SERVICE AVAILABILITY\nTalkPe Pro reserves the right to modify, suspend, or terminate services at any time without prior notice.`
    }
];

export default function LegalProtocolScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>('tos');

    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
            }
            setLoading(false);
        });

        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true
            })
        ).start();

        return () => unsub();
    }, [user?.uid]);

    const themeData = getSmartLevelConfig(userData);
    const primaryColor = themeData.colors[0];
    const secondaryColor = themeData.colors[1] || themeData.colors[2] || primaryColor;
    const tertiaryColor = themeData.colors[2] || secondaryColor;
    const glowColor = themeData.glow !== 'transparent' ? themeData.glow : primaryColor;

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* 🔥 DYNAMIC BACKGROUND WITH 3 COLORS 🔥 */}
            <LinearGradient colors={[`${primaryColor}30`, '#020617', '#000000']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: primaryColor, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: tertiaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 🛡️ HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: primaryColor + '40' }]} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { textShadowColor: glowColor, textShadowRadius: 10 }]}>Legal & Security</Text>
                    <Text style={[styles.headerSub, { color: primaryColor }]}>TalkPe Pro Compliance Hub</Text>
                </View>
                <MaterialCommunityIcons name="scale-balance" size={26} color={secondaryColor} style={{ marginLeft: 'auto' }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                <View style={[styles.introBox, { backgroundColor: secondaryColor + '10', borderColor: secondaryColor + '30' }]}>
                    <MaterialCommunityIcons name="shield-check" size={32} color={secondaryColor} />
                    <View style={{ marginLeft: 15, flex: 1 }}>
                        <Text style={[styles.introTitle, { color: secondaryColor }]}>100% SECURE NETWORK</Text>
                        <Text style={styles.introDesc}>
                            By using TalkPe Pro, you are protected by and bound to our strict legal protocols. We ensure absolute safety for both Clients and Consultants.
                        </Text>
                    </View>
                </View>

                <View style={styles.docsContainer}>
                    {LEGAL_DOCS.map((doc) => {
                        const isExpanded = expandedId === doc.id;
                        return (
                            <TouchableOpacity 
                                key={doc.id} 
                                style={[styles.docCard, { borderColor: isExpanded ? doc.color : 'rgba(255,255,255,0.05)' }]} 
                                onPress={() => toggleExpand(doc.id)}
                                activeOpacity={0.8}
                            >
                                <LinearGradient 
                                    colors={isExpanded ? [doc.color + '20', 'transparent'] : ['rgba(255,255,255,0.02)', 'transparent']}
                                    style={styles.docHeader}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: isExpanded ? doc.color : 'rgba(255,255,255,0.05)' }]}>
                                        <MaterialCommunityIcons name={doc.icon as any} size={20} color={isExpanded ? '#FFF' : doc.color} />
                                    </View>
                                    <Text style={[styles.docTitle, { color: isExpanded ? '#FFF' : 'rgba(255,255,255,0.8)' }]}>
                                        {doc.title}
                                    </Text>
                                    <Ionicons 
                                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                                        size={20} 
                                        color={isExpanded ? doc.color : '#64748B'} 
                                    />
                                </LinearGradient>
                                
                                {isExpanded && (
                                    <BlurView intensity={20} tint="dark" style={styles.docContentBox}>
                                        <Text style={styles.docContentText}>{doc.content}</Text>
                                    </BlurView>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 🔥 COPYRIGHT FOOTER */}
                <View style={styles.footer}>
                    <Ionicons name="finger-print-outline" size={30} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.footerText}>© {new Date().getFullYear()} TalkPe Inc. All Rights Reserved.</Text>
                    <Text style={styles.footerSubText}>Legally bound & encrypted protocols.</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#94A3B8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

    scrollContent: { padding: 20, paddingBottom: 50 },

    introBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: 25 },
    introTitle: { color: '#10B981', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 5 },
    introDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', lineHeight: 18 },

    docsContainer: { gap: 15 },
    
    docCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    docHeader: { flexDirection: 'row', alignItems: 'center', padding: 18 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    docTitle: { flex: 1, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginLeft: 15 },
    
    docContentBox: { padding: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    docContentText: { color: '#94A3B8', fontSize: 13, fontWeight: '500', lineHeight: 22 },

    footer: { alignItems: 'center', marginTop: 50, opacity: 0.6 },
    footerText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 },
    footerSubText: { color: '#64748B', fontSize: 9, fontWeight: '600', marginTop: 4, letterSpacing: 1 }
});