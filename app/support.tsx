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
    LayoutAnimation,
    Linking,
    PanResponder,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🛠️ Android: enable LayoutAnimation so FAQ expand/collapse animates smoothly
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// 🆕 PREMIUM SUPPORT CARD (glass + glowing strip + icon with orbit ring)
const SupportCard = ({ icon, title, sub, onPress, color, index, orbitRotate }: any) => (
    <FadeInItem index={index}>
        <TouchableOpacity activeOpacity={0.9} style={[styles.card, { shadowColor: color }]} onPress={onPress}>
            <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <LinearGradient 
                    colors={[withAlpha(color, '30'), 'rgba(255,255,255,0.02)']}
                    start={{x:0, y:0}} end={{x:1, y:1}} 
                    style={styles.cardGradient}
                >
                    <LinearGradient
                        pointerEvents="none"
                        colors={[withAlpha(color, 'FF'), withAlpha(color, '00')]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={styles.cardStrip}
                    />
                    <View style={styles.iconWrap}>
                        <Animated.View style={[styles.iconRing, { borderColor: withAlpha(color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                        <View style={[styles.iconContainer, { backgroundColor: color }]}>
                            <Ionicons name={icon} size={28} color="#FFF" />
                        </View>
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardSub}>{sub}</Text>
                    </View>
                    <View style={[styles.chevronBox, { borderColor: withAlpha(color, '40') }]}>
                        <Ionicons name="chevron-forward" size={22} color={color} />
                    </View>
                </LinearGradient>
            </BlurView>
        </TouchableOpacity>
    </FadeInItem>
);

// 🆕 TRUST TILE (Play Store friendly safety highlights)
const TrustTile = ({ icon, title, sub, tier, index, pulseScale, pulseOpacity }: any) => (
    <FadeInItem index={index}>
        <BlurView intensity={25} tint="dark" style={[styles.trustTile, { borderColor: withAlpha(tier.color, '35') }]}>
            <LinearGradient
                pointerEvents="none"
                colors={[withAlpha(tier.color, '22'), 'rgba(255,255,255,0.0)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.trustIconWrap}>
                <Animated.View style={[styles.trustPulse, { backgroundColor: withAlpha(tier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                <View style={[styles.trustIconCore, { borderColor: withAlpha(tier.color, '70') }]}>
                    <Ionicons name={icon} size={18} color={tier.color} />
                </View>
            </View>
            <Text style={styles.trustTitle}>{title}</Text>
            <Text style={styles.trustSub}>{sub}</Text>
        </BlurView>
    </FadeInItem>
);

export default function SupportScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userData, setUserData] = useState<any>(null);

    const scrollY = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🆕 NEW ANIMATION VALUES
    const mainLoop = useRef(new Animated.Value(0)).current;     // rotation loop (orbit rings)
    const pulseAnim = useRef(new Animated.Value(0)).current;    // pulse halos
    const holoAnim = useRef(new Animated.Value(0)).current;     // holographic sweep (hero card)
    const floatAnim = useRef(new Animated.Value(0)).current;    // floating hero
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
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // 🆕 ORBIT ROTATION LOOP
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        // 🆕 PULSE HALO LOOP
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        // 🆕 HOLO SWEEP LOOP
        Animated.loop(Animated.sequence([
            Animated.delay(1200),
            Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // 🆕 FLOAT LOOP
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        // 🆕 HEADER ENTRANCE
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

    const toggleFAQ = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    // 🆕 UPDATED FAQ WORDING (Play Store review friendly: diamonds = calls & gifts only, games free, hosts admin-verified, screenshots blocked)
    const faqs = [
        { 
            id: 1, 
            q: "Diamond recharge not reflected?", 
            a: "Recharge status usually synchronizes within 2-5 minutes. If your diamonds haven't updated, please contact our support team with your Google Play order details. Note: Diamonds are virtual in-app credits with no real-world monetary value." 
        },
        { 
            id: 2, 
            q: "Experiencing call disconnections?", 
            a: "If a network disconnect occurs during a live audio or video call, our system automatically evaluates the session state to ensure fair usage and protect your diamond balance from unfair deduction. If you still notice an issue, please contact support." 
        },
        { 
            id: 3, 
            q: "How to locate specific hosts?", 
            a: "You can find verified, strictly 18+ compliant hosts by using the search feature. Every host is reviewed and verified by our admin team before going live. Filter by expertise tags to find the professional best suited for your conversation." 
        },
        { 
            id: 4, 
            q: "Is my privacy protected?", 
            a: "TalkPe Pro strictly enforces a Zero Recording Policy. Your private audio and video calls are secured in transit and are NEVER recorded, monitored, or stored by us. Screenshots and screen recording are also blocked inside live audio and video calls for your safety." 
        },
        { 
            id: 5, 
            q: "What is the Refund Policy for Diamonds?", 
            a: "All diamond purchases are final once delivered to your account. Diamonds are virtual in-app credits used only for calls and for sending gifts to hosts. They cannot be cashed out, transferred, or exchanged for real money. TalkPe Pro is a strictly no-gambling platform." 
        },
        { 
            id: 6, 
            q: "How to report abusive behavior?", 
            a: "Safety is our priority. Use the 'Block & Report' button immediately during any active session or profile visit. Our team reviews all reports and takes definitive admin action within 24 hours." 
        },
        { 
            id: 7, 
            q: "How can I delete my account & data?", 
            a: "In strict compliance with Data Safety policies, you have full control. To permanently wipe your identity and delete your account from our servers, navigate to Profile > Edit Profile > Delete Account." 
        },
        { 
            id: 8, 
            q: "How can I use my Diamonds?", 
            a: "Diamonds are used only for live 1-on-1 audio and video calls with hosts, and for sending gifts to hosts within the app. Diamonds are never required for games, and nothing in the app involves gambling or real-money rewards." 
        },
        { 
            id: 9, 
            q: "Are the in-app games free?", 
            a: "Yes. All games in TalkPe Pro are 100% free and provided for entertainment purposes only. No diamonds are spent, won, or lost in any game, and there are no cash prizes or real-money rewards of any kind." 
        },
        { 
            id: 10, 
            q: "Are all hosts verified?", 
            a: "Yes. Every host is manually reviewed and verified by our admin team before they can receive calls. Hosts must meet our 18+ age requirement and community guidelines, and accounts that violate them are removed." 
        },
        { 
            id: 11, 
            q: "Can screenshots be taken during calls?", 
            a: "No. For your privacy and safety, screenshots and screen recording are blocked during live audio and video calls. This protects both users and hosts from unauthorized capture of private conversations." 
        }
    ];

    // 🆕 TRUST HIGHLIGHTS
    const trustTiles = [
        { icon: 'shield-checkmark', title: 'VERIFIED HOSTS', sub: 'Every host is verified by our admin team' },
        { icon: 'eye-off', title: 'SCREENSHOT BLOCK', sub: 'Disabled in live audio & video calls' },
        { icon: 'mic-off', title: 'ZERO RECORDING', sub: 'Calls are never recorded or stored' },
        { icon: 'game-controller', title: 'FREE GAMES', sub: 'Entertainment only, no diamonds involved' },
    ];

    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    // 🆕 DERIVED ANIMATION VALUES
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
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

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />

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

            {/* 🌌 Animated Parallax Auras synced with tier color accents */}
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <Animated.View style={[styles.header, headerReveal]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: withAlpha(userTier.color, '40') }]}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>SUPPORT HUB</Text>
                        <Text style={[styles.headerSubTitle, { color: userTier.color }]}>Trust & Safety Center</Text>
                    </View>
                    <TouchableOpacity style={styles.headerIcon}>
                        <View style={styles.headerIconWrap}>
                            <Animated.View style={[styles.headerIconRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
                            <MaterialCommunityIcons name="shield-sync-outline" size={24} color={userTier.color} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    scrollEventThrottle={16}
                >
                    {/* 🆕 3D TILT HERO CARD (drag it!) */}
                    <Animated.View style={[styles.heroSection, headerReveal, { transform: [{ translateY: floatAnim }] }]}>
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
                                        <LinearGradient colors={[userTier.color, withAlpha(userTier.secondaryColor || '#D946EF', 'FF')]} style={styles.supportIconBg}>
                                            <MaterialCommunityIcons name="frequently-asked-questions" size={52} color="#FFF" />
                                        </LinearGradient>
                                    </View>

                                    <Text style={styles.heroTitle}>How can we help?</Text>
                                    <Text style={styles.heroSub}>24/7 Professional customer assistance for the TalkPe Pro network.</Text>

                                    <View style={[styles.liveBadge, { borderColor: withAlpha(userTier.color, '60') }]}>
                                        <View style={styles.liveDotWrap}>
                                            <Animated.View style={[styles.liveDotHalo, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                            <View style={styles.liveDot} />
                                        </View>
                                        <Text style={[styles.liveText, { color: userTier.color }]}>SUPPORT ONLINE</Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>

                    {/* 🆕 TRUST & SAFETY HIGHLIGHTS */}
                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>TRUST & SAFETY</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        <View style={styles.trustGrid}>
                            {trustTiles.map((t, i) => (
                                <TrustTile
                                    key={t.title}
                                    index={i}
                                    icon={t.icon}
                                    title={t.title}
                                    sub={t.sub}
                                    tier={userTier}
                                    pulseScale={pulseScale}
                                    pulseOpacity={pulseOpacity}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>DIRECT ASSISTANCE</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        
                        <SupportCard 
                            index={0}
                            orbitRotate={orbitRotate}
                            icon="mail" 
                            title="Official Email Support" 
                            sub="support@talkpepro.com" 
                            color="#6366F1" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20User%20Support')} 
                        />

                        <SupportCard 
                            index={1}
                            orbitRotate={orbitRotateRev}
                            icon="shield-checkmark" 
                            title="Trust & Safety Desk" 
                            sub="Report abusive behavior or scams" 
                            color="#F43F5E" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=URGENT:%20Trust%20&%20Safety%20Report')} 
                        />
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>KNOWLEDGE BASE</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        <BlurView intensity={20} tint="dark" style={[styles.faqContainer, { borderColor: withAlpha(userTier.color, '25') }]}>
                            {faqs.map((item, idx) => (
                                <View key={item.id} style={[styles.faqWrapper, idx === faqs.length - 1 && { borderBottomWidth: 0 }]}>
                                    {expandedId === item.id && (
                                        <LinearGradient
                                            pointerEvents="none"
                                            colors={[withAlpha(userTier.color, '18'), 'rgba(255,255,255,0)']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        style={styles.faqHeader} 
                                        onPress={() => toggleFAQ(item.id)}
                                    >
                                        <View style={[styles.faqIndex, { borderColor: withAlpha(userTier.color, expandedId === item.id ? 'AA' : '40') }]}>
                                            <Text style={[styles.faqIndexText, { color: userTier.color }]}>{String(idx + 1).padStart(2, '0')}</Text>
                                        </View>
                                        <Text style={[styles.faqText, expandedId === item.id && { color: userTier.color }]}>{item.q}</Text>
                                        <View style={[styles.plusBox, expandedId === item.id && { backgroundColor: withAlpha(userTier.color, '20') }]}>
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
                        </BlurView>
                    </View>

                    {/* 🆕 COMMUNITY & COMPLIANCE NOTE (Play Store review friendly) */}
                    <FadeInItem index={0}>
                        <BlurView intensity={25} tint="dark" style={[styles.complianceCard, { borderColor: withAlpha(userTier.color, '35') }]}>
                            <LinearGradient
                                pointerEvents="none"
                                colors={[withAlpha(userTier.color, '20'), 'rgba(255,255,255,0)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.complianceHead}>
                                <MaterialCommunityIcons name="shield-lock" size={20} color={userTier.color} />
                                <Text style={[styles.complianceTitle, { color: userTier.color }]}>OUR COMMITMENT</Text>
                            </View>
                            <Text style={styles.complianceText}>
                                TalkPe Pro is an 18+ social calling platform. Diamonds are virtual in-app credits used only for calls and gifts. All hosts are verified by our admin team, screenshots are blocked in live calls, calls are never recorded, and all games are free for entertainment only with no gambling or real-money rewards.
                            </Text>
                        </BlurView>
                    </FadeInItem>

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
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    headerSubTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1 },
    headerIcon: { padding: 6 },
    headerIconWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    headerIconRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
    scrollContent: { padding: 22 },
    
    // 🆕 3D HERO CARD
    heroSection: { marginBottom: 40, marginTop: 5 },
    heroGlow: { borderRadius: 38, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 16 },
    heroCard: { borderRadius: 38, overflow: 'hidden', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 22 },
    holoStripe: { position: 'absolute', width: 60, height: '240%', top: '-70%', backgroundColor: 'rgba(255,255,255,0.14)' },
    heroIconWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    heroRing: { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1.5, borderStyle: 'dashed' },
    heroRingInner: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderStyle: 'dotted' },
    heroPulse: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
    supportIconBg: { width: 110, height: 110, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#CBD5E1', fontSize: 14, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 22 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    liveDotWrap: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
    liveDotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    
    section: { marginBottom: 40 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
    sectionLine: { flex: 1, height: 1, marginLeft: 12 },

    // 🆕 TRUST GRID
    trustGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
    trustTile: { width: (width - 44 - 14) / 2, minHeight: 138, borderRadius: 26, padding: 16, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    trustIconWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    trustPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20 },
    trustIconCore: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    trustTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    trustSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 6 },
    
    // 🆕 SUPPORT CARDS
    card: { marginBottom: 20, borderRadius: 32, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8, backgroundColor: 'rgba(0,0,0,0.01)' },
    cardBlur: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 22 },
    cardStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, zIndex: 20 },
    iconWrap: { width: 78, height: 78, justifyContent: 'center', alignItems: 'center' },
    iconRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: 'dashed' },
    iconContainer: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 14 },
    cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
    cardSub: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    chevronBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, borderWidth: 1 },
    
    // 🆕 FAQ
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    faqIndex: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(0,0,0,0.4)' },
    faqIndexText: { fontSize: 11, fontWeight: '900' },
    faqText: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 24 },
    plusBox: { padding: 6, borderRadius: 12 },
    answerContainer: { paddingHorizontal: 28, paddingBottom: 28, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 15, lineHeight: 24, fontWeight: '600' },

    // 🆕 COMPLIANCE CARD
    complianceCard: { borderRadius: 28, padding: 22, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    complianceHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    complianceTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    complianceText: { color: '#94A3B8', fontSize: 13, lineHeight: 21, fontWeight: '600' },
    
    footer: { marginTop: 30, alignItems: 'center', paddingBottom: 60 },
    footerLine: { width: '40%', height: 3, borderRadius: 2, marginBottom: 25 },
    footerText: { color: '#334155', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    devRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    devText: { color: '#475569', fontSize: 13, fontWeight: '700' },
    devName: { fontSize: 13, fontWeight: '900' }
});
