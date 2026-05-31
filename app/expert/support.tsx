import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

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

// 🔥 MASS FAQ DATABASE FOR HOSTS (PLAY STORE COMPLIANT) 🔥
const FAQS = [
    {
        id: 1,
        question: "When will I receive my Redeem ACTIVITY_REWARD?",
        answer: "Withdrawals are processed manually by our admin team within 5-7 working days. Ensure your bank details in the Wallet System are 100% accurate to avoid payment delays."
    },
    {
        id: 2,
        question: "How does the Premium Spotlight (Algorithm Boost) work?",
        answer: "Activating Premium Spotlight pushes your profile to the top of the user feed. Our algorithm guarantees higher visibility by prioritizing your profile to active users on the platform."
    },
    {
        id: 3,
        question: "What is the minimum Redeem limit?",
        answer: "The minimum limit is set dynamically based on platform rules (e.g., 50,000 Rewards). You can initiate a secure Redeem directly from your Wallet dashboard once this milestone is reached."
    },
    {
        id: 4,
        question: "Why am I not receiving any Discover requests?",
        answer: "1. Check if your status is set to 'ONLINE' in the console.\n2. Ensure you have good lighting and a clear professional picture.\n3. Keep your app updated to the latest Play Store version."
    },
    {
        id: 5,
        question: "How do Broadcast & Forum Activity Platform Share work?",
        answer: "Whenever users participate in digital activities in your Broadcast or Forum room, you earn a platform-defined Platform Share on the total virtual assets they spend, credited as Rewards."
    },
    {
        id: 6,
        question: "My account is showing as restricted. What do I do?",
        answer: "Accounts are restricted automatically for strict policy violations (e.g., sharing personal contact details, off-platform transactions). Contact support immediately via Email to appeal your restriction. Admins review appeals within 24-48 hours."
    },
    {
        id: 7,
        question: "How to handle abusive or misbehaving users?",
        answer: "Your safety is our priority. Disconnect the call immediately and use the 'Block & Report' feature from the Chat screen. Our Trust & Safety team will permanently ban the user within 24 hours."
    },
    {
        id: 8,
        question: "Can I change my Call Rate?",
        answer: "Yes! Based on your Tier Level, you have a maximum allowed rate. You can adjust your 'Rewards per Minute' rate from your Command Center once every 30 minutes."
    }
];

export default function SupportHubScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

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

    // 🔥 AAA DYNAMIC THEME EXTRACTION 🔥
    const themeData = getSmartLevelConfig(userData);
    const primaryColor = themeData.colors[0];
    const secondaryColor = themeData.colors[1] || themeData.colors[2] || primaryColor;
    const tertiaryColor = themeData.colors[2] || secondaryColor;
    const glowColor = themeData.glow !== 'transparent' ? themeData.glow : primaryColor;

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    const toggleExpand = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    // 🔥 SUPPORT EMAIL ACTIONS
    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20Consultant%20General%20Support');
    };

    const handleTrustSafetyReport = () => {
        Linking.openURL('mailto:support@talkpepro.com?subject=URGENT:%20Trust%20&%20Safety%20Violation%20Report');
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
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: primaryColor + '40' }]}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { textShadowColor: glowColor, textShadowRadius: 10 }]}>Support Hub</Text>
                    <Text style={[styles.headerSub, { color: primaryColor }]}>TalkPe Pro Command Center</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}>
                
                {/* 🚀 PREMIUM CONTACT CARDS */}
                <View style={styles.contactContainer}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>24/7 COMMAND RESOLUTION</Text>
                    <Text style={styles.sectionDesc}>Our dedicated administrator team is strictly monitoring platform integrity and is ready to assist you.</Text>

                    <View style={styles.actionColumn}>
                        
                        {/* 🌟 BIG GENERAL SUPPORT BUTTON */}
                        <TouchableOpacity style={styles.actionCardWrapper} onPress={handleEmailSupport} activeOpacity={0.8}>
                            <LinearGradient colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)']} style={styles.actionCardBig}>
                                <View style={[styles.iconCircleBig, { backgroundColor: secondaryColor + '20', borderColor: secondaryColor }]}>
                                    <MaterialCommunityIcons name="email-fast-outline" size={34} color={secondaryColor} />
                                </View>
                                <View style={styles.actionTextContent}>
                                    <Text style={styles.actionTitleBig}>General Support</Text>
                                    <Text style={styles.actionSubBig}>Payouts, Profile Issues & Guidance</Text>
                                    <Text style={[styles.actionEmailHighlight, { color: secondaryColor }]}>support@talkpepro.com</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={secondaryColor} style={styles.forwardIcon} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* 🚨 TRUST & SAFETY REPORT BUTTON (Replaced Live Chat) */}
                        <TouchableOpacity style={styles.actionCardWrapper} onPress={handleTrustSafetyReport} activeOpacity={0.8}>
                            <LinearGradient colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)']} style={[styles.actionCardBig, { borderColor: '#F43F5E40' }]}>
                                <View style={[styles.iconCircleBig, { backgroundColor: '#F43F5E20', borderColor: '#F43F5E' }]}>
                                    <MaterialCommunityIcons name="shield-alert-outline" size={34} color="#F43F5E" />
                                </View>
                                <View style={styles.actionTextContent}>
                                    <Text style={[styles.actionTitleBig, { color: '#FFF' }]}>Trust & Safety Desk</Text>
                                    <Text style={styles.actionSubBig}>Report abusive users or scams</Text>
                                    <Text style={[styles.actionEmailHighlight, { color: '#F43F5E' }]}>Strict 24-Hr Action Policy</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#F43F5E" style={styles.forwardIcon} />
                            </LinearGradient>
                        </TouchableOpacity>

                    </View>
                </View>

                {/* 📖 FAQ SECTION - PREMIUM UPGRADE */}
                <View style={styles.faqContainer}>
                    <View style={styles.faqHeaderRow}>
                        <MaterialCommunityIcons name="frequently-asked-questions" size={26} color={primaryColor} />
                        <Text style={[styles.sectionTitle, { color: primaryColor, marginBottom: 0, fontSize: 14 }]}>KNOWLEDGE BASE</Text>
                    </View>

                    {FAQS.map((faq) => {
                        const isExpanded = expandedId === faq.id;
                        return (
                            <TouchableOpacity 
                                key={faq.id} 
                                style={[styles.faqItem, { borderColor: isExpanded ? primaryColor : 'rgba(255,255,255,0.05)', backgroundColor: isExpanded ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.5)' }]} 
                                onPress={() => toggleExpand(faq.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.faqQuestionRow}>
                                    <Text style={[styles.faqQuestion, { color: isExpanded ? '#FFF' : 'rgba(255,255,255,0.8)' }]}>
                                        {faq.question}
                                    </Text>
                                    <View style={[styles.faqIconContainer, { backgroundColor: isExpanded ? primaryColor + '20' : 'transparent' }]}>
                                        <Ionicons 
                                            name={isExpanded ? "chevron-up" : "add"} 
                                            size={22} 
                                            color={isExpanded ? primaryColor : '#64748B'} 
                                        />
                                    </View>
                                </View>
                                {isExpanded && (
                                    <View style={styles.faqAnswerBox}>
                                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* 🔥 SECURITY BADGE - BIGGER */}
                <View style={[styles.securityBadge, { borderColor: secondaryColor + '50', backgroundColor: secondaryColor + '10' }]}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={32} color={secondaryColor} />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={[styles.securityTitle, { color: secondaryColor }]}>PLATFORM SECURITY PROTOCOL</Text>
                        <Text style={styles.securityDesc}>Never share your OTP, Passwords, or Banking details with anyone. Admins will NEVER ask for your PIN. Avoid all off-platform transactions to prevent permanent bans.</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(90px)' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },

    contactContainer: { marginTop: 15, marginBottom: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    sectionDesc: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 25, lineHeight: 20 },

    actionColumn: { gap: 15, marginBottom: 35 },
    actionCardWrapper: { borderRadius: 24, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12 },
    
    // NEW BIGGER CARD DESIGN
    actionCardBig: { flexDirection: 'row', padding: 22, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    iconCircleBig: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 18 },
    actionTextContent: { flex: 1, justifyContent: 'center' },
    actionTitleBig: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    actionSubBig: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 },
    actionEmailHighlight: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    forwardIcon: { marginLeft: 10, opacity: 0.8 },

    faqContainer: { marginTop: 10 },
    faqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
    faqItem: { borderRadius: 20, marginBottom: 16, borderWidth: 1 },
    faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
    faqQuestion: { fontSize: 15, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 22 },
    faqIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    faqAnswerBox: { paddingHorizontal: 22, paddingBottom: 22, paddingTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    faqAnswer: { color: '#94A3B8', fontSize: 14, fontWeight: '600', lineHeight: 24 },

    securityBadge: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 24, borderWidth: 1, marginTop: 40 },
    securityTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
    securityDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', lineHeight: 18 }
});