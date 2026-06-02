import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    LayoutAnimation,
    Linking,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

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

export default function SupportScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userData, setUserData] = useState<any>(null);

    const scrollY = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

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

    const toggleFAQ = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const faqs = [
        { 
            id: 1, 
            q: "Diamond recharge not reflected?", 
            a: "Recharge status usually synchronizes within 2-5 minutes. If your balance hasn't updated after a successful transaction, please contact our support team via email for manual verification." 
        },
        { 
            id: 2, 
            q: "Experiencing call disconnections?", 
            a: "Our system is optimized for low-latency connections. Please ensure you are on a stable 4G/5G or Wi-Fi network. We monitor link stability to ensure your diamonds are only utilized for active call time." 
        },
        { 
            id: 3, 
            q: "How to locate specific hosts?", 
            a: "You can find verified hosts by using the search feature on the home screen. Filter by expertise tags to find the professional best suited for your requirements." 
        },
        { 
            id: 4, 
            q: "Is my privacy protected?", 
            a: "TalkPe Pro utilizes end-to-end encryption protocols. Your private calls are secured, ensuring that no third party, including TalkPe Pro, can access or record your sessions." 
        },
        { 
            id: 5, 
            q: "What is the Refund Policy for Diamonds?", 
            a: "All digital diamond purchases are final and non-refundable as per Play Store guidelines. However, if a transaction fails or a call drops due to our server error, please contact Support within 24 hours for a review." 
        },
        { 
            id: 6, 
            q: "How to report abusive behavior?", 
            a: "User safety is our top priority. You can use the 'Report' button during any active session or email our Trust & Safety Desk directly. We take strict administrative action within 24 hours against any policy violations." 
        },
        { 
            id: 7, 
            q: "How can I delete my account & data?", 
            a: "You have full control over your data. To permanently delete your account and wipe all personal data from our servers, navigate to Profile > Edit Profile > Delete Account Permanently." 
        },
        { 
            id: 8, 
            q: "How can I use my Diamonds?", 
            a: "Diamonds act as your premium digital access keys. You can use them exclusively within the app to initiate live 1-on-1 video/audio calls with verified hosts, engage in premium live & forum activities, and unlock exclusive platform features." 
        }
    ];

    const SupportCard = ({ icon, title, sub, onPress, color }: any) => (
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
            <LinearGradient 
                colors={[`${color}30`, 'rgba(255,255,255,0.02)']}
                start={{x:0, y:0}} end={{x:1, y:1}} 
                style={styles.cardGradient}
            >
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={32} color="#FFF" />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSub}>{sub}</Text>
                </View>
                <View style={styles.chevronBox}>
                    <Ionicons name="chevron-forward" size={22} color={color} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />

            {/* 🌌 Animated Parallax Auras synced with tier color accents */}
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>SUPPORT HUB</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <MaterialCommunityIcons name="shield-sync-outline" size={26} color={userTier.color} />
                    </TouchableOpacity>
                </View>

                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    scrollEventThrottle={16}
                >
                    <View style={styles.heroSection}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor || '#D946EF']} style={styles.supportIconBg}>
                            <MaterialCommunityIcons name="frequently-asked-questions" size={65} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>How can we help?</Text>
                        <Text style={styles.heroSub}>24/7 Professional customer assistance for the TalkPe Pro network.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: userTier.color }]}>DIRECT ASSISTANCE</Text>
                        
                        <SupportCard 
                            icon="mail" 
                            title="Official Email Support" 
                            sub="support@talkpepro.com" 
                            color="#6366F1" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20User%20Support')} 
                        />

                        <SupportCard 
                            icon="shield-checkmark" 
                            title="Trust & Safety Desk" 
                            sub="Report abusive behavior or scams" 
                            color="#F43F5E" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=URGENT:%20Trust%20&%20Safety%20Report')} 
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: userTier.color }]}>KNOWLEDGE BASE</Text>
                        <View style={styles.faqContainer}>
                            {faqs.map((item) => (
                                <View key={item.id} style={styles.faqWrapper}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        style={styles.faqHeader} 
                                        onPress={() => toggleFAQ(item.id)}
                                    >
                                        <Text style={[styles.faqText, expandedId === item.id && { color: userTier.color }]}>{item.q}</Text>
                                        <View style={[styles.plusBox, expandedId === item.id && { backgroundColor: userTier.color + '20' }]}>
                                            <Ionicons 
                                                name={expandedId === item.id ? "remove-circle" : "add-circle"}
                                                size={26} 
                                                color={expandedId === item.id ? userTier.color : "#475569"} 
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {expandedId === item.id && (
                                        <BlurView intensity={20} tint="dark" style={styles.answerContainer}>
                                            <Text style={styles.answerText}>{item.a}</Text>
                                        </BlurView>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.footerLine} />
                        <Text style={styles.footerText}>TALKPE PRO SECURE SYSTEM • v1.0.5</Text>
                        <View style={styles.devRow}>
                            <Text style={styles.devText}>Developed with 💎 by </Text>
                            <Text style={[styles.devName, { color: userTier.color }]}>TALKPE TEAM</Text>
                        </View>
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerIcon: { padding: 12 },
    scrollContent: { padding: 22 },
    
    heroSection: { alignItems: 'center', marginBottom: 45, marginTop: 15 },
    supportIconBg: { width: 130, height: 130, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 14, fontWeight: '600', lineHeight: 24 },
    
    section: { marginBottom: 40 },
    sectionLabel: { fontSize: 13, fontWeight: '900', marginBottom: 20, letterSpacing: 3 },
    
    card: { marginBottom: 20, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 24 },
    iconContainer: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 20 },
    cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
    cardSub: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    chevronBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16 },
    
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 28 },
    faqText: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 24 },
    plusBox: { padding: 6, borderRadius: 12 },
    answerContainer: { paddingHorizontal: 28, paddingBottom: 28, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 15, lineHeight: 24, fontWeight: '600' },
    
    footer: { marginTop: 30, alignItems: 'center', paddingBottom: 60 },
    footerLine: { width: '40%', height: 3, borderRadius: 2, marginBottom: 25 },
    footerText: { color: '#334155', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    devRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    devText: { color: '#475569', fontSize: 13, fontWeight: '700' },
    devName: { fontSize: 13, fontWeight: '900' }
});