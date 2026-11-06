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
    ImageBackground,
    Linking,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

// 🖼️ PREMIUM IMAGE ASSETS (replace with your own: require('../assets/xxx.jpg') if you like)
const IMG_HERO = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&q=80';
const IMG_CARD_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80';

// ✨ TWINKLING STAR FIELD POSITIONS
const STARS = [
    { top: 70, left: 28, size: 3 }, { top: 140, left: width * 0.82, size: 2 }, { top: 250, left: width * 0.5, size: 3 },
    { top: 360, left: 18, size: 2 }, { top: 470, left: width * 0.9, size: 3 }, { top: 560, left: width * 0.3, size: 2 },
    { top: 680, left: width * 0.7, size: 3 }, { top: 780, left: 40, size: 2 }, { top: 190, left: width * 0.14, size: 2 },
    { top: 610, left: width * 0.58, size: 2 },
];

// 🛡️ SAFE ALPHA HELPER: some tier colors are already 8-digit hex (e.g. '#970d50d4'),
// so adding another alpha creates an INVALID color. This always normalizes first.
const withAlpha = (hex: string, alpha: string = 'FF') => {
    const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
    return base + alpha;
};

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

// 🆕 UPDATED LEGAL CONTENT (aligned with host Terms + support.tsx + real app flow)
// Diamonds = calls & gifts only | Games = free, entertainment only | Hosts = admin reviewed | Screenshots = selected screens
const TERMS_SECTIONS = [
    {
        icon: 'shield-account',
        color: '#6366F1',
        title: 'Eligibility & Community Guidelines (18+ Only)',
        text: 'TalkPe Pro is a live interaction platform restricted to users aged 18 and above. By using the app you confirm that you meet this age requirement. We may terminate any account that we suspect belongs to a minor. All participants must engage with respect. Harassment, abuse, hate speech or any policy violation may lead to a warning, restriction, suspension or permanent ban, depending on the seriousness of the violation.',
    },
    {
        icon: 'diamond-stone',
        color: '#0EA5E9',
        title: 'Digital Assets (Diamonds) & Purchases',
        text: 'Diamonds are virtual in-app credits used only for calls with hosts and for sending virtual gifts to hosts. Gifts you send are credited to hosts as rewards. Diamonds have NO real-world monetary value and cannot be cashed out, transferred or exchanged for real money. When Diamond purchases are available, they are processed only through Google Play Billing and are non-refundable once delivered, except where required by applicable law or Google Play policies. We strictly prohibit gambling of any kind.',
    },
    {
        icon: 'gift',
        color: '#F97316',
        title: 'Welcome Bonus',
        text: 'New users may receive a welcome bonus of up to 3 minutes of free calling. The bonus can be claimed only once per device and may be changed or withdrawn at any time. Calls are video calls; if you turn your camera off, the call continues as an audio call.',
    },
    {
        icon: 'gamepad-variant',
        color: '#22C55E',
        title: 'Free Games (Entertainment Only)',
        text: 'In-app games (Reflex Arena, Memory Match) are completely free to play and provided for entertainment purposes only. No Diamonds are required, spent, won or lost in any game. There are no entry fees, no cash prizes and no real-money or Diamond rewards of any kind.',
    },
    {
        icon: 'account-check',
        color: '#EC4899',
        title: 'Hosts',
        text: 'Every host on TalkPe Pro is reviewed by our admin team before they can receive calls. Hosts must be 18 years or older and must follow our community guidelines. Accounts that violate our policies may be warned, restricted, suspended or permanently removed.',
    },
    {
        icon: 'alert-octagon',
        color: '#F43F5E',
        title: 'Interaction Safety & Reporting',
        text: 'You can block and report profiles, calls, Live and Forum chat messages and Spotlight videos. Our team verifies each report and, where a violation is found, may remove content or warn, restrict, suspend or terminate the account. We aim to resolve reports within 24 hours, but resolution time may vary.',
    },
    {
        icon: 'camera-off',
        color: '#A855F7',
        title: 'Screenshot & Recording Protection',
        text: 'To protect the privacy of users and hosts, screenshots and screen recording are blocked on selected screens (such as live host and videocall) on supported devices. Recording or capturing other people\'s calls, screens or content by any means is prohibited and may result in account suspension or termination.',
    },
    {
        icon: 'security',
        color: '#10B981',
        title: 'User Responsibility',
        text: 'You are responsible for maintaining the confidentiality of your account credentials. TalkPe Pro is not liable for unauthorized access resulting from user negligence or shared sensitive information.',
    },
    {
        icon: 'gavel',
        color: '#F59E0B',
        title: 'Content Moderation & Spotlight',
        text: 'We maintain User-Generated Content (UGC) policies for Spotlight videos, chats and profiles. Reported content is verified by our admin team. If a violation is found, the content may be removed and the account may be warned, restricted, suspended or terminated.',
    },
    {
        icon: 'wifi-off',
        color: '#8B5CF6',
        title: 'Network Disconnection',
        text: 'Call quality and connection depend on the internet connection of both you and the host. TalkPe Pro does not control network conditions, and a call may disconnect if either connection is weak or lost. If you believe you were charged incorrectly, please contact support@talkpepro.com with the date and time of the call. In the event of a disconnection during a free game, the match may end or restart, and no Diamonds are charged or lost.',
    },
    {
         icon: 'account-remove',
        color: '#EF4444',
        title: 'Account Termination & Deletion',
        text: 'We may warn, restrict, suspend or terminate accounts that violate these Terms. You may delete your account and data at any time in the app by going to Profile > Edit Profile and tapping the Delete Account button at the very bottom. You may also request deletion by emailing support@talkpepro.com. Limited transaction records may be kept where required by law.',
    },
    {
        icon: 'email-outline',
        color: '#06B6D4',
        title: 'Contact & Updates',
        text: 'We may update these Terms from time to time to reflect changes in our services or legal requirements. Continued use of the app after an update means you accept the revised Terms. For any questions, contact us at support@talkpepro.com.',
    },
];

const PRIVACY_SECTIONS = [
    {
        icon: 'microphone-off',
        color: '#A855F7',
        title: 'Calls & Recording',
        text: 'Calls and live interactions are secured in transit using industry-standard protection. TalkPe Pro does not record your private calls. Screenshots and screen recording are blocked on selected screens (such as live host and profile screens) on supported devices.',
    },
    {
        icon: 'account-details',
        color: '#6366F1',
        title: 'Information We Collect',
        text: 'We collect the information needed to run the service: your Google Sign-In details (name, email address and profile photo), profile details you choose to add, chat messages you send in Live rooms and Forum, photos and videos you upload to Spotlight, your notification token, reports you submit, call and gift history, wallet and Diamond balance information, and basic device and usage information used for security, fraud prevention and app performance. We do not record the content of your private calls.',
    },
    {
        icon: 'database-lock',
        color: '#EC4899',
        title: 'Information Security & Service Providers',
        text: 'Your account data is stored on secure cloud infrastructure provided by Google Firebase. Photos and videos are stored and delivered through Cloudinary, and live audio and video are delivered through a third-party real-time video provider. These providers process data only to run the service. We do not sell your personal data and do not share it with third-party advertisers for marketing purposes.',
    },
    {
        icon: 'wallet',
        color: '#F59E0B',
        title: 'Transaction Protection',
        text: 'When Diamond purchases are available, they are processed only through Google Play Billing. Sensitive payment information such as card numbers, CVV or banking passwords is handled by Google and never passes through or gets stored within the TalkPe Pro system.',
    },
    {
        icon: 'eye-off',
        color: '#06B6D4',
        title: 'Data Permissions',
        text: 'Camera and Microphone access is used for calls, voice rooms, Live and Spotlight recording. Photo and media access is used to upload your profile picture and Spotlight content. Notification permission is used to send you call, gift and account alerts. You can manage or revoke these permissions via your device settings at any time.',
    },
    {
        icon: 'shield-check',
        color: '#22C55E',
        title: 'Age Restriction',
        text: 'TalkPe Pro is intended only for users aged 18 and above. We do not knowingly collect personal information from anyone under 18. We may terminate any account suspected to belong to a minor, and if we learn that an underage user has registered, the account and its data will be removed.',
    },
    {
        icon: 'delete-sweep',
        color: '#14B8A6',
        title: 'Data Deletion Rights',
        text: 'You can delete your account and associated data at any time in the app by going to Profile > Edit Profile and tapping the Delete Account button at the very bottom. You may also request deletion by emailing support@talkpepro.com. Once processed, your profile and personal data are removed from our systems. Limited transaction records may be kept where required by law.',
    },
    {
        icon: 'email-outline',
        color: '#F43F5E',
        title: 'Contact Us',
        text: 'For any privacy-related questions or data requests, reach our team at support@talkpepro.com. We aim to respond to all privacy requests promptly.',
    },
];

// 🆕 STAGGERED ENTRANCE (each block pops in with its own delay + 3D tilt-in)
const FadeInItem = ({ index, children }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, { toValue: 1, duration: 650, delay: Math.min(index, 8) * 90, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={{
            opacity: v,
            transform: [
                { perspective: 900 },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }) },
            ],
        }}>
            {children}
        </Animated.View>
    );
};

// 🆕 Reusable Content Block (glass card + glowing strip + orbit-ring icon)
const ContentSection = ({ icon, title, text, color, index, orbitRotate }: { icon: any, title: string, text: string, color: string, index: number, orbitRotate: any }) => (
    <FadeInItem index={index}>
        <View style={styles.sectionGlow}>
            <BlurView intensity={25} tint="dark" style={[styles.contentBlock, { borderColor: withAlpha(color, '35') }]}>
                <LinearGradient
                    pointerEvents="none"
                    colors={[withAlpha(color, '1F'), 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                    pointerEvents="none"
                    colors={[withAlpha(color, 'FF'), withAlpha(color, '00')]}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={styles.blockStrip}
                />
                <View style={styles.titleRow}>
                    <View style={styles.iconWrap}>
                        <Animated.View style={[styles.iconRing, { borderColor: withAlpha(color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                        <View style={[styles.iconBox, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                            <MaterialCommunityIcons name={icon} size={20} color={color} />
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.contentIndex, { color: withAlpha(color, 'AA') }]}>{String(index + 1).padStart(2, '0')}</Text>
                        <Text style={[styles.contentTitle, { color: color }]}>{title}</Text>
                    </View>
                </View>
                <View style={styles.textWrapper}>
                    <Text style={styles.contentText}>{text}</Text>
                </View>
            </BlurView>
        </View>
    </FadeInItem>
);

/**
 * TALKPE LEGAL CENTER
 * Professional Play Store Compliant Version
 */
export default function LegalScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
    const [userData, setUserData] = useState<any>(null);

    // 🆕 TAB INDICATOR WIDTH (measured)
    const [tabInnerWidth, setTabInnerWidth] = useState(0);

    // 🆕 ANIMATION ENGINE REFS
    const scrollY = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;  // ambient orbs + stars
    const mainLoop = useRef(new Animated.Value(0)).current;     // rotation loop (orbit rings)
    const pulseAnim = useRef(new Animated.Value(0)).current;    // pulse halos
    const holoAnim = useRef(new Animated.Value(0)).current;     // holographic sweep (hero card)
    const floatAnim = useRef(new Animated.Value(0)).current;    // floating hero
    const tabAnim = useRef(new Animated.Value(0)).current;      // sliding tab indicator
    const headerEnter = useRef(new Animated.Value(0)).current;  // header entrance
    const tiltX = useRef(new Animated.Value(0)).current;        // hero card 3D tilt
    const tiltY = useRef(new Animated.Value(0)).current;

    // 🆕 HERO CARD DRAG-TO-TILT (3D)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
            onPanResponderMove: (_, g) => {
                tiltY.setValue(Math.max(-1, Math.min(1, g.dx / 120)));
                tiltX.setValue(Math.max(-1, Math.min(1, g.dy / 60)));
            },
            onPanResponderRelease: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
        })
    ).current;

    useEffect(() => {
        // Ambient shimmer
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // Orbit rotation loop
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        // Pulse halo loop
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        // Holo sweep loop
        Animated.loop(Animated.sequence([
            Animated.delay(1200),
            Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // Float loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        // Header entrance
        Animated.timing(headerEnter, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

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
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    const userTier = calculateUserLevel(userDiamonds);

    // 🆕 SWITCH TAB WITH SLIDING INDICATOR
    const switchTab = (tab: 'terms' | 'privacy') => {
        setActiveTab(tab);
        Animated.spring(tabAnim, { toValue: tab === 'terms' ? 0 : 1, friction: 7, tension: 70, useNativeDriver: true }).start();
    };

    // 🆕 DERIVED ANIMATION VALUES
    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
    const tabW = tabInnerWidth > 0 ? tabInnerWidth / 2 : 0;
    const tabX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, tabW] });
    const heroTilt = {
        transform: [
            { perspective: 1000 },
            { rotateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] }) },
            { rotateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
        ],
    };
    const headerReveal = {
        opacity: headerEnter,
        transform: [{ translateY: headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
    };

    const heroBorder = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.color,
        borderRightColor: userTier.color,
        borderTopColor: withAlpha(userTier.secondaryColor, '80'),
        borderBottomColor: withAlpha(userTier.secondaryColor, '80'),
        backgroundColor: 'rgba(10, 10, 10, 0.65)',
    };

    // 🆕 KEY HIGHLIGHTS (quick trust summary shown at the top of the policy)
    const highlights = [
        { icon: 'person', label: '18+ ONLY' },
        { icon: 'shield-checkmark', label: 'REVIEWED HOSTS' },
        { icon: 'mic-off', label: 'NO RECORDING' },
        { icon: 'game-controller', label: 'FREE GAMES' },
    ];

    const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient 
                colors={userTier.themeBg as any} 
                style={StyleSheet.absoluteFill} 
            />

            {/* 🆕 HERO IMAGE FADING INTO BACKGROUND */}
            <ImageBackground source={{ uri: IMG_HERO }} style={styles.heroImg} imageStyle={{ opacity: 0.22 }}>
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(2,6,23,0.85)', '#020617']} style={StyleSheet.absoluteFill} />
            </ImageBackground>

            {/* 🆕 TWINKLING STAR FIELD */}
            {STARS.map((st, i) => (
                <Animated.View
                    key={`star-${i}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute', top: st.top, left: st.left, width: st.size, height: st.size, borderRadius: st.size,
                        backgroundColor: '#FFF',
                        opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.1, 0.9] : [0.9, 0.1] }),
                    }}
                />
            ))}

            {/* 🆕 FLOATING SHIMMER ORBS */}
            <Animated.View style={[styles.shimmerOrb, { top: 80, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 🌌 Animated Parallax Auras */}
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                
                {/* --- HEADER HUD --- */}
                <Animated.View style={[styles.header, headerReveal]}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={[styles.backBtn, { borderColor: withAlpha(userTier.color, '40') }]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>LEGAL CENTER</Text>
                        <View style={styles.syncRow}>
                            <View style={styles.pulseDotWrap}>
                                <Animated.View style={[styles.pulseHalo, { backgroundColor: userTier.color, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                <View style={[styles.pulseDot, { backgroundColor: userTier.color }]} />
                            </View>
                            <Text style={styles.headerSub}>LAST UPDATED: NOVEMBER 2026</Text>
                        </View>
                    </View>
                    {/* 🆕 LEVEL BADGE WITH ORBIT RING */}
                    <View style={styles.levelOrbitWrap}>
                        <Animated.View style={[styles.levelOrbitRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
                        <View style={[styles.levelOrbitCore, { borderColor: userTier.color }]}>
                            <Text style={[styles.levelOrbitText, { color: userTier.color }]}>L{userTier.lvl}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* --- TAB SWITCHER (sliding gradient indicator) --- */}
                <Animated.View style={[styles.tabContainer, headerReveal]}>
                    <View style={styles.tabInner} onLayout={(e) => setTabInnerWidth(e.nativeEvent.layout.width)}>
                        {tabW > 0 && (
                            <Animated.View style={[styles.tabIndicator, { width: tabW, transform: [{ translateX: tabX }] }]}>
                                <LinearGradient
                                    colors={[withAlpha(userTier.color, 'FF'), withAlpha(userTier.secondaryColor, 'FF')]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={styles.tabIndicatorGrad}
                                />
                            </Animated.View>
                        )}
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            style={styles.tab} 
                            onPress={() => switchTab('terms')}
                        >
                            <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                                TERMS OF SERVICE
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            style={styles.tab} 
                            onPress={() => switchTab('privacy')}
                        >
                            <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                                PRIVACY POLICY
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    scrollEventThrottle={16}
                >
                    {/* 🆕 3D TILT HERO CARD (drag it!) */}
                    <Animated.View style={[styles.heroSection, { transform: [{ translateY: floatAnim }] }]}>
                        <Animated.View style={heroTilt} {...panResponder.panHandlers}>
                            <View style={[styles.heroGlow, { shadowColor: userTier.color }]}>
                                <View style={[styles.heroCard, heroBorder]}>
                                    <ImageBackground source={{ uri: IMG_CARD_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.35 }} />
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.55)', withAlpha(userTier.color, '30'), 'rgba(0,0,0,0.7)']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Animated.View pointerEvents="none" style={[styles.holoStripe, { transform: [{ translateX: holoX }, { rotate: '25deg' }] }]} />

                                    <View style={styles.heroIconWrap}>
                                        <Animated.View style={[styles.heroRing, { borderColor: withAlpha(userTier.color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                                        <Animated.View style={[styles.heroRingInner, { borderColor: withAlpha(userTier.secondaryColor, 'AA'), transform: [{ rotate: orbitRotateRev }] }]} />
                                        <Animated.View style={[styles.heroPulse, { backgroundColor: withAlpha(userTier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                        <LinearGradient colors={[userTier.color, withAlpha(userTier.secondaryColor, 'FF')]} style={styles.heroIconBg}>
                                            <MaterialCommunityIcons name="scale-balance" size={40} color="#FFF" />
                                        </LinearGradient>
                                    </View>

                                    <Text style={styles.heroTitle}>{activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
                                    <Text style={styles.heroSub}>
                                        {activeTab === 'terms'
                                            ? 'Clear, fair rules that keep our 18+ community safe, respectful and secure.'
                                            : 'Transparent practices that protect your identity, your calls and your data.'}
                                    </Text>

                                    <View style={styles.highlightRow}>
                                        {highlights.map((h) => (
                                            <View key={h.label} style={[styles.highlightChip, { borderColor: withAlpha(userTier.color, '50') }]}>
                                                <Ionicons name={h.icon as any} size={11} color={userTier.color} />
                                                <Text style={styles.highlightText}>{h.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>

                    {/* 🆕 SECTION DIVIDER */}
                    <View style={styles.sectionRow}>
                        <Text style={[styles.sectionLabel, { color: userTier.color }]}>
                            {activeTab === 'terms' ? 'TERMS & CONDITIONS' : 'DATA & PRIVACY'}
                        </Text>
                        <LinearGradient
                            colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.sectionLine}
                        />
                    </View>

                    {/* key={activeTab} re-runs the staggered entrance on every tab switch */}
                    <View key={activeTab}>
                        {sections.map((s, i) => (
                            <ContentSection
                                key={s.title}
                                index={i}
                                icon={s.icon}
                                color={s.color}
                                title={s.title}
                                text={s.text}
                                orbitRotate={i % 2 === 0 ? orbitRotate : orbitRotateRev}
                            />
                        ))}
                    </View>

                    {/* 🆕 CONTACT CARD */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20Legal%20Query')}
                    >
                        <BlurView intensity={25} tint="dark" style={[styles.contactCard, { borderColor: withAlpha(userTier.color, '45') }]}>
                            <LinearGradient
                                pointerEvents="none"
                                colors={[withAlpha(userTier.color, '25'), 'rgba(255,255,255,0)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={[styles.contactIcon, { backgroundColor: withAlpha(userTier.color, '25'), borderColor: withAlpha(userTier.color, '60') }]}>
                                <Ionicons name="mail" size={20} color={userTier.color} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={styles.contactTitle}>Questions about our policies?</Text>
                                <Text style={[styles.contactSub, { color: userTier.color }]}>support@talkpepro.com</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={userTier.color} />
                        </BlurView>
                    </TouchableOpacity>

                    {/* --- FOOTER HUD --- */}
                    <View style={styles.footer}>
                        <View style={styles.shieldWrap}>
                            <Animated.View style={[styles.shieldRing, { borderColor: withAlpha(userTier.color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                            <Animated.View style={[styles.shieldPulse, { backgroundColor: withAlpha(userTier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                            <LinearGradient 
                                colors={[userTier.color, userTier.secondaryColor]} 
                                start={{x:0, y:0}} end={{x:1, y:0}} 
                                style={styles.shieldGlow}
                            >
                                <View style={styles.shieldInner}>
                                    <Ionicons name="shield-checkmark" size={30} color="#FFF" />
                                </View>
                            </LinearGradient>
                        </View>
                        <Text style={styles.footerText}>SECURE PROTOCOL</Text>
                        <View style={styles.brandRow}>
                            <Text style={styles.footerSub}>MANAGED BY </Text>
                            <Text style={[styles.brandHighlight, { color: userTier.color }]}>TALKPE TECHNOLOGIES✨</Text>
                        </View>
                    </View>
                    <View style={{ height: 40 }} />
                </Animated.ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 25 },
    headerTextContainer: { marginLeft: 18, flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulseDotWrap: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    pulseHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    // 🆕 LEVEL ORBIT BADGE
    levelOrbitWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    levelOrbitRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
    levelOrbitCore: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    levelOrbitText: { fontSize: 11, fontWeight: '900' },

    // 🆕 TABS (sliding indicator)
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20, borderRadius: 25, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tabInner: { flex: 1, flexDirection: 'row' },
    tabIndicator: { position: 'absolute', top: 0, bottom: 0, left: 0 },
    tabIndicatorGrad: { flex: 1, borderRadius: 20 },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 20 },
    activeTabTerms: { backgroundColor: '#6366F1' }, 
    activeTabPrivacy: { backgroundColor: '#A855F7' }, 
    tabText: { color: '#475569', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    activeTabText: { color: '#FFF' },
    scrollContent: { padding: 20 },

    // 🆕 3D HERO CARD
    heroSection: { marginBottom: 32, marginTop: 6 },
    heroGlow: { borderRadius: 36 },
    heroCard: { borderRadius: 36, overflow: 'hidden', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
    holoStripe: { position: 'absolute', width: 60, height: '240%', top: '-70%', backgroundColor: 'rgba(255,255,255,0.14)' },
    heroIconWrap: { width: 136, height: 136, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    heroRing: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 1.5, borderStyle: 'dashed' },
    heroRingInner: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderStyle: 'dotted' },
    heroPulse: { position: 'absolute', width: 90, height: 90, borderRadius: 45 },
    heroIconBg: { width: 90, height: 90, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#CBD5E1', fontSize: 13, textAlign: 'center', marginTop: 10, fontWeight: '600', lineHeight: 21 },
    highlightRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18 },
    highlightChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    highlightText: { color: '#E2E8F0', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 4 },
    sectionLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 3 },
    sectionLine: { flex: 1, height: 1, marginLeft: 12 },

    // 🆕 CONTENT CARDS
    sectionGlow: { marginBottom: 20, borderRadius: 30 },
    glassCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 35, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contentBlock: { borderRadius: 30, padding: 22, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(8, 13, 28, 0.92)' },
    blockStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconWrap: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    iconRing: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderStyle: 'dashed' },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    contentIndex: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 3 },
    contentTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, lineHeight: 19 },
    textWrapper: { paddingLeft: 4 },
    contentText: { color: '#94A3B8', fontSize: 13, lineHeight: 22, fontWeight: '600' },

    // 🆕 CONTACT CARD
    contactCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 28, padding: 20, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 4 },
    contactIcon: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    contactTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    contactSub: { fontSize: 12, fontWeight: '800', marginTop: 3 },

    footer: { marginTop: 36, alignItems: 'center' },
    shieldWrap: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    shieldRing: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderStyle: 'dashed' },
    shieldPulse: { position: 'absolute', width: 70, height: 70, borderRadius: 35 },
    shieldGlow: { width: 70, height: 70, borderRadius: 35, padding: 2, justifyContent: 'center', alignItems: 'center' },
    shieldInner: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerSub: { color: '#334155', fontSize: 10, fontWeight: '800' },
    brandHighlight: { color: '#475569', fontSize: 10, fontWeight: '900' }
});
