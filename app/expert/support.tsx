import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// 🔥 MASS FAQ DATABASE FOR CONSULTANTS 🔥
const FAQS = [
    {
        id: 1,
        question: "When will I receive my withdrawal payout?",
        answer: "Withdrawals are processed quickly, usually between 30 Mins to 24 Hrs. Ensure your bank details in the Wallet System are 100% accurate to avoid payment bounces."
    },
    {
        id: 2,
        question: "How does the Premium Spotlight (Algorithm Boost) work?",
        answer: "Activating Premium Spotlight pushes your profile to the top of the client feed. Our algorithm guarantees up to 300% more visibility by prioritizing your profile to active clients."
    },
    {
        id: 3,
        question: "What is the minimum withdrawal limit?",
        answer: "The minimum withdrawal limit is 50,000 Rewards (₹500). You can initiate a secure withdrawal directly from your Wallet dashboard once this milestone is reached."
    },
    {
        id: 4,
        question: "Why am I not receiving any match requests?",
        answer: "1. Check if your status is set to 'ONLINE' in the console.\n2. Ensure you have good lighting and a clear professional picture.\n3. Using Premium Spotlight drastically increases your network visibility."
    },
    {
        id: 5,
        question: "How do Broadcast & Forum Activity commissions work?",
        answer: "Whenever clients participate in the 'Fortune Clash' activity in your Broadcast or Forum room, you earn an instant 10% commission on the total diamonds they spend, directly credited as Rewards!"
    },
    {
        id: 6,
        question: "My account is showing as restricted. What do I do?",
        answer: "Accounts are restricted automatically for policy violations (e.g., nudity, abuse, sharing personal contact details). Contact support immediately via Email or WhatsApp to appeal your restriction."
    },
    {
        id: 7,
        question: "How to handle abusive or misbehaving clients?",
        answer: "Your safety is our priority. Disconnect the consultation immediately and use the 'Block User' feature from the Chat screen. The client will be permanently banned from matching with you again."
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

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20Consultant%20Support%20Request');
    };

    const handleWhatsAppSupport = () => {
        // REPLACE WITH ACTUAL ADMIN WHATSAPP NUMBER INCL COUNTRY CODE (e.g., 91 for India)
        const adminNumber = "919999999999"; 
        const message = "Hi TalkPe Pro Admin, I need help with my Consultant Account.";
        Linking.openURL(`https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`);
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}>
                
                {/* 🚀 CONTACT CARDS */}
                <View style={styles.contactContainer}>
                    <Text style={[styles.sectionTitle, { color: primaryColor }]}>DIRECT CONTACT CHANNELS</Text>
                    <Text style={styles.sectionDesc}>Our admin team is available 24/7 to resolve your issues.</Text>

                    <View style={styles.actionRow}>
                        {/* EMAIL BUTTON */}
                        <TouchableOpacity style={styles.actionCardWrapper} onPress={handleEmailSupport} activeOpacity={0.8}>
                            <LinearGradient colors={['rgba(15, 23, 42, 0.8)', 'rgba(2, 6, 23, 0.9)']} style={styles.actionCard}>
                                <View style={[styles.iconCircle, { backgroundColor: secondaryColor + '20', borderColor: secondaryColor }]}>
                                    <MaterialCommunityIcons name="email-fast-outline" size={28} color={secondaryColor} />
                                </View>
                                <Text style={styles.actionTitle}>Email Admin</Text>
                                <Text style={styles.actionSub}>talkpe.admin@gmail.com</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* WHATSAPP BUTTON */}
                        <TouchableOpacity style={styles.actionCardWrapper} onPress={handleWhatsAppSupport} activeOpacity={0.8}>
                            <LinearGradient colors={['rgba(15, 23, 42, 0.8)', 'rgba(2, 6, 23, 0.9)']} style={[styles.actionCard, { borderColor: tertiaryColor + '40' }]}>
                                <View style={[styles.iconCircle, { backgroundColor: tertiaryColor + '20', borderColor: tertiaryColor }]}>
                                    <FontAwesome5 name="whatsapp" size={28} color={tertiaryColor} />
                                </View>
                                <Text style={styles.actionTitle}>Live Chat</Text>
                                <Text style={styles.actionSub}>Instant Resolution</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 📖 FAQ SECTION */}
                <View style={styles.faqContainer}>
                    <View style={styles.faqHeaderRow}>
                        <MaterialCommunityIcons name="frequently-asked-questions" size={22} color={primaryColor} />
                        <Text style={[styles.sectionTitle, { color: primaryColor, marginBottom: 0 }]}>FREQUENTLY ASKED QUESTIONS</Text>
                    </View>

                    {FAQS.map((faq) => {
                        const isExpanded = expandedId === faq.id;
                        return (
                            <TouchableOpacity 
                                key={faq.id} 
                                style={[styles.faqItem, { borderColor: isExpanded ? primaryColor : 'rgba(255,255,255,0.05)' }]} 
                                onPress={() => toggleExpand(faq.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.faqQuestionRow}>
                                    <Text style={[styles.faqQuestion, { color: isExpanded ? '#FFF' : 'rgba(255,255,255,0.8)' }]}>
                                        {faq.question}
                                    </Text>
                                    <Ionicons 
                                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                                        size={20} 
                                        color={isExpanded ? primaryColor : '#64748B'} 
                                    />
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

                {/* 🔥 SECURITY BADGE */}
                <View style={[styles.securityBadge, { borderColor: secondaryColor + '50', backgroundColor: secondaryColor + '10' }]}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={24} color={secondaryColor} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[styles.securityTitle, { color: secondaryColor }]}>TALKPE PRO SECURITY PROTOCOL</Text>
                        <Text style={styles.securityDesc}>Never share your OTP, Passwords, or Banking details with anyone. Admins will never ask for your PIN.</Text>
                    </View>
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
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

    contactContainer: { marginTop: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginBottom: 5 },
    sectionDesc: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 20, lineHeight: 18 },

    actionRow: { flexDirection: 'row', gap: 15, marginBottom: 35 },
    actionCardWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
    actionCard: { padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1 },
    actionTitle: { color: '#FFF', fontSize: 15, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    actionSub: { color: '#94A3B8', fontSize: 10, fontWeight: '700', textAlign: 'center' },

    faqContainer: { marginTop: 10 },
    faqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    faqItem: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
    faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
    faqQuestion: { fontSize: 13, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 20 },
    faqAnswerBox: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    faqAnswer: { color: '#94A3B8', fontSize: 12, fontWeight: '500', lineHeight: 22 },

    securityBadge: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginTop: 30 },
    securityTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    securityDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', lineHeight: 16 }
});