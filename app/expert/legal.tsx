import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

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

// ✅ TERMS OF SERVICE (Play Store safe wording - games = fun only, no rewards, Redemption wording)
const TERMS_SECTIONS = [
    {
        icon: 'shield-account',
        color: '#6366F1',
        title: '1. Community Guidelines (18+ ONLY)',
        text: 'TalkPe Pro is a premium live interaction platform strictly restricted to users aged 18 and above. All participants must engage with respect. Any form of harassment or policy violation will lead to immediate account suspension under our zero-tolerance policy.'
    },
    {
        icon: 'diamond-stone',
        color: '#0EA5E9',
        title: '2. Digital Assets (Diamonds)',
        text: 'Diamonds are virtual in-app items used to connect with hosts and to send virtual gifts. Diamonds have NO real-world monetary value, are not a currency, and cannot be exchanged, transferred or cashed out. All purchases of virtual items are final and non-refundable, except where required by applicable law or Google Play policies.'
    },
    {
        icon: 'gamepad-variant',
        color: '#22D3EE',
        title: '3. Games: Only For Fun & Entertainment',
        text: 'In-app games (such as Reflex Arena and Memory Match) are provided purely for fun and entertainment. They are 100% free to play: no entry fee, no purchase and no Diamonds are required or charged. No prizes, rewards, Diamonds, cash, redemption value or any item of monetary value is given to any user or host for playing or winning games. Game results do not change any balance or account value. We do not offer, allow or promote gambling, betting or wagering of any kind.'
    },
    {
        icon: 'gift-open',
        color: '#EAB308',
        title: '4. Host Rewards & Redemption',
        text: 'Verified hosts may earn in-app reward points for genuine interactions and entertainment services provided to users. Eligible rewards can be redeemed through our Redemption process after identity and payment-detail verification (KYC), and are subject to review, applicable limits and compliance with these Terms. Rewards are never earned from games. Redemption requests found to involve fraud, misuse or policy violations may be rejected, delayed or reversed, and the related account may be suspended.'
    },
    {
        icon: 'alert-octagon',
        color: '#F43F5E',
        title: '5. Interaction Safety & Reporting',
        text: "Users and Hosts have access to immediate 'Block' and 'Report' functions during Video Calls, Quick Connect sessions, Live Broadcasts, Forum rooms, and on profiles. In Live and Forum chats, if someone sends an abusive, inappropriate or harmful message, simply tap that message to open the 'Block' and 'Report' options for the sender. Hosts can also fill and submit a Trust & Safety report form through the Support Hub. Our admin team reviews every submitted report and works to resolve it within 24 hours, and the host is notified in-app when the report status changes (under review, resolved or dismissed). All user reports are reviewed by our moderation team within 24 hours to ensure platform integrity."
    },
    {
        icon: 'security',
        color: '#10B981',
        title: '6. User Responsibility',
        text: 'You are responsible for maintaining the confidentiality of your account credentials. TalkPe Pro is not liable for unauthorized access resulting from user negligence or shared sensitive information. Capturing, recording or sharing other users\' video calls or live sessions without their consent (including by using another device) is strictly prohibited and may lead to account termination.'
    },
    {
        icon: 'gavel',
        color: '#F59E0B',
        title: '7. Content Moderation & Spotlight',
        text: 'We maintain strict User-Generated Content (UGC) policies. Spotlight videos and chat messages in Live and Forum rooms can be reported. Reported Spotlight videos will be hidden pending a 24-hour administrator review. Users who send violating content may be blocked, restricted or permanently terminated without refunds.'
    },
    {
        icon: 'wifi-off',
        color: '#8B5CF6',
        title: '8. Game Disconnect Policy',
        text: 'In the event of a network disconnection during a free game, the match may end or restart automatically. Since games are free to play and carry no rewards, no Diamonds or rewards are charged, lost or owed because of a disconnection.'
    }
];

// ✅ PRIVACY POLICY
const PRIVACY_SECTIONS = [
    {
        icon: 'microphone-off',
        color: '#A855F7',
        title: '1. Communication Privacy & No Recording',
        text: 'All live interactions (Quick Connect, Live Rooms) utilize industry-standard encryption. We operate under a strict zero-knowledge framework; your private video and audio calls are NEVER recorded, stored, or monitored by TalkPe Pro. To further protect your privacy, screenshots and screen recording are blocked inside Video Calls and Live sessions on supported devices.'
    },
    {
        icon: 'database-lock',
        color: '#EC4899',
        title: '2. Information Security',
        text: 'Your profile and identity data are secured within Firebase encrypted clusters. We maintain a strict policy against selling or sharing your personal data with third-party advertisers for marketing purposes.'
    },
    {
        icon: 'credit-card-chip',
        color: '#F59E0B',
        title: '3. Transaction Protection',
        text: 'Financial details are processed exclusively via secure Google Play Billing and verified payment vaults. Sensitive information like CVV or banking passwords never pass through or get stored within the TalkPe Pro local system.'
    },
    {
        icon: 'eye-off',
        color: '#06B6D4',
        title: '4. Data Permissions',
        text: 'Camera and Microphone access is strictly requested for live call durations only. Any media access is limited to profile personalization. You can manage or revoke these permissions via your device settings at any time.'
    },
    {
        icon: 'delete-sweep',
        color: '#14B8A6',
        title: '5. Data Deletion Rights',
        text: 'In strict compliance with Google Play Developer Policies, users retain full rights over their data. You can request complete deletion of your account and associated data through the app settings at any time, which will permanently wipe your identity from our servers.'
    },
    {
        icon: 'bank-check',
        color: '#84CC16',
        title: '6. Host Redemption Verification',
        text: 'Hosts who choose to use the Redemption process provide identity and payment details only for verification and to complete their redemption. This information is used for no other purpose, is protected with encryption, and is shared only with the payment partners needed to process the redemption.'
    },
    {
        icon: 'gamepad-round',
        color: '#38BDF8',
        title: '7. Games & Your Data',
        text: 'Games are free, for fun and entertainment only. Playing a game does not charge you, does not award rewards to users or hosts, and does not require any additional sensitive personal information.'
    }
];

// 🆕 Quick trust chips (hero card)
const TRUST_CHIPS = [
    { icon: 'account-check', label: '18+ ONLY' },
    { icon: 'gamepad-variant', label: 'FREE GAMES • ENTERTAINMENT ONLY' },
    { icon: 'microphone-off', label: 'NO CALL RECORDING' },
    { icon: 'cellphone-lock', label: 'SCREENSHOT PROTECTED' },
    { icon: 'shield-lock', label: 'SECURE DATA' }
];

// 🆕 Image load aagalana icon fallback
const SafeImage = ({ uri, fallbackIcon, style, color }: any) => {
    const [failed, setFailed] = useState(false);
    if (!uri || failed) {
        return (
            <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialCommunityIcons name={fallbackIcon} size={36} color={color} />
            </View>
        );
    }
    return <Image source={{ uri }} style={style} resizeMode="contain" onError={() => setFailed(true)} />;
};

// 🆕 3D TILT SECTION CARD (Reusable Content Block - same props + 3D animation)
const ContentSection = ({ icon, title, text, color, index, sway }: any) => {
    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 8) * 80,
            friction: 7,
            tension: 50,
            useNativeDriver: true
        }).start();
    }, []);

    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] });
    const rotateXPress = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] });
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
    const even = index % 2 === 0;
    const swayY = sway.interpolate({ inputRange: [0, 1], outputRange: [even ? '-1.6deg' : '1.6deg', even ? '1.6deg' : '-1.6deg'] });

    const pIn = () => Animated.spring(press, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    const pOut = () => Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();

    return (
        <Animated.View
            style={[
                styles.contentBlock,
                {
                    shadowColor: color,
                    opacity: enter,
                    transform: [
                        { perspective: 900 },
                        { translateY },
                        { rotateX: rotateXEnter },
                        { rotateX: rotateXPress },
                        { rotateY: swayY },
                        { scale }
                    ]
                }
            ]}
        >
            <Pressable onPressIn={pIn} onPressOut={pOut}>
                <LinearGradient
                    colors={[`${color}AA`, `${color}22`, `${color}88`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sectionBorder}
                >
                    <View style={styles.sectionInner}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.07)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.8, y: 0.6 }}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                        <LinearGradient colors={[color, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionTopLine} />
                        <View style={styles.titleRow}>
                            <View style={[styles.iconBox, { backgroundColor: `${color}20`, borderColor: `${color}50`, shadowColor: color }]}>
                                <MaterialCommunityIcons name={icon} size={20} color={color} />
                            </View>
                            <Text style={[styles.contentTitle, { color: color }]}>{title}</Text>
                        </View>
                        <View style={styles.textWrapper}>
                            <Text style={styles.contentText}>{text}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
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

    // 🆕 animation drivers
    const floatAnim = useRef(new Animated.Value(0)).current;
    const swayAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const heroEnter = useRef(new Animated.Value(0)).current;
    const tabAnim = useRef(new Animated.Value(0)).current;
    const scrollY = useRef(new Animated.Value(0)).current;
    const [tabBarWidth, setTabBarWidth] = useState(0);
    const [contentH, setContentH] = useState(0);
    const [layoutH, setLayoutH] = useState(0);

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

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(swayAnim, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 900, useNativeDriver: true })
            ])
        ).start();

        Animated.spring(heroEnter, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }).start();
    }, []);

    // 🆕 sliding tab indicator
    useEffect(() => {
        Animated.spring(tabAnim, { toValue: activeTab === 'terms' ? 0 : 1, friction: 8, tension: 70, useNativeDriver: true }).start();
    }, [activeTab]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    const userTier = calculateUserLevel(userDiamonds);

    const orbY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const orbYRev = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const ringRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const dotScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
    const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
    const sweepX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, width] });
    const heroScale = heroEnter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const heroRotX = heroEnter.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '0deg'] });

    const singleTabW = tabBarWidth > 0 ? (tabBarWidth - 12) / 2 : 0;
    const indicatorX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, singleTabW] });
    const maxScroll = Math.max(1, contentH - layoutH);
    const readWidth = scrollY.interpolate({ inputRange: [0, maxScroll], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

    const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient 
                colors={userTier.themeBg as any} 
                style={StyleSheet.absoluteFill} 
            />

            {/* 🆕 floating glow orbs (tier colors) */}
            <Animated.View style={[styles.orb, { top: 120, right: -70, backgroundColor: userTier.color, transform: [{ translateY: orbY }] }]} />
            <Animated.View style={[styles.orb, { top: height * 0.55, left: -100, backgroundColor: userTier.secondaryColor, transform: [{ translateY: orbYRev }] }]} />

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
                            <View style={styles.pulseWrap}>
                                <Animated.View style={[styles.pulseRing, { backgroundColor: userTier.color, opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
                                <View style={[styles.pulseDot, { backgroundColor: userTier.color }]} />
                            </View>
                            <Text style={styles.headerSub}>LAST UPDATED: NOVEMBER 2026</Text>
                        </View>
                    </View>
                </View>

                {/* 🆕 reading progress bar */}
                <View style={styles.readTrack}>
                    <Animated.View style={[styles.readFill, { width: readWidth, backgroundColor: userTier.color }]} />
                </View>

                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    onContentSizeChange={(_w, h) => setContentH(h)}
                    onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
                >
                    {/* 🆕 3D HERO TRUST CARD */}
                    <Animated.View style={[styles.heroWrap, { opacity: heroEnter, transform: [{ perspective: 1000 }, { rotateX: heroRotX }, { scale: heroScale }] }]}>
                        <LinearGradient
                            colors={[userTier.color, userTier.secondaryColor, userTier.color]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroBorder}
                        >
                            <View style={styles.heroInner}>
                                <LinearGradient colors={['rgba(255,255,255,0.10)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}>
                                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1 }} />
                                </Animated.View>

                                <View style={styles.heroTop}>
                                    <View style={styles.shieldBox}>
                                        <Animated.View style={{ position: 'absolute', transform: [{ rotate: ringRotate }] }}>
                                            <LinearGradient colors={[userTier.color, 'transparent', userTier.secondaryColor, 'transparent']} style={styles.shieldRing} />
                                        </Animated.View>
                                        <View style={styles.shieldCore}>
                                            <SafeImage
                                                uri="https://img.icons8.com/3d-fluency/512/shield.png"
                                                fallbackIcon="shield-check"
                                                color={userTier.color}
                                                style={styles.shieldImg}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Text style={styles.heroLabel}>TRUST & SAFETY</Text>
                                        <Text style={styles.heroTitle}>Safe, Fair & Transparent</Text>
                                        <LinearGradient colors={[userTier.color, userTier.secondaryColor]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.tierChip}>
                                            <MaterialCommunityIcons name="crown" size={11} color="#FFF" />
                                            <Text style={styles.tierChipText}>{userTier.label}</Text>
                                        </LinearGradient>
                                    </View>
                                </View>

                                <View style={styles.chipRow}>
                                    {TRUST_CHIPS.map((c) => (
                                        <View key={c.label} style={[styles.trustChip, { borderColor: userTier.color + '40' }]}>
                                            <MaterialCommunityIcons name={c.icon as any} size={12} color={userTier.color} />
                                            <Text style={styles.trustChipText}>{c.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* --- TAB SWITCHER --- */}
                    <View style={styles.tabContainer} onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}>
                        {singleTabW > 0 && (
                            <Animated.View style={[styles.tabIndicator, { width: singleTabW, transform: [{ translateX: indicatorX }] }]}>
                                <LinearGradient
                                    colors={activeTab === 'terms' ? [userTier.color, userTier.color] : [userTier.secondaryColor, userTier.secondaryColor]}
                                    start={{x:0,y:0}} end={{x:1,y:1}}
                                    style={{ flex: 1, borderRadius: 20 }}
                                />
                            </Animated.View>
                        )}
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            style={styles.tab} 
                            onPress={() => setActiveTab('terms')}
                        >
                            <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                                TERMS OF SERVICE
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            activeOpacity={0.9}
                            style={styles.tab} 
                            onPress={() => setActiveTab('privacy')}
                        >
                            <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                                PRIVACY POLICY
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- CONTENT (key = tab, so 3D entrance replays on every switch) --- */}
                    <View key={activeTab} style={styles.glassCard}>
                        {sections.map((s, i) => (
                            <ContentSection
                                key={s.title}
                                index={i}
                                sway={swayAnim}
                                icon={s.icon}
                                color={s.color}
                                title={s.title}
                                text={s.text}
                            />
                        ))}
                    </View>

                    {/* --- FOOTER HUD --- */}
                    <View style={styles.footer}>
                        <View style={styles.footerShieldBox}>
                            <Animated.View style={{ position: 'absolute', transform: [{ rotate: ringRotate }] }}>
                                <LinearGradient colors={[userTier.color, 'transparent', userTier.secondaryColor, 'transparent']} style={styles.footerRing} />
                            </Animated.View>
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
                        <Text style={styles.footerText}>SECURE PROTOCOL v1.0.5</Text>
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
    orb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.14 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18 },
    headerTextContainer: { marginLeft: 18 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulseWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    pulseRing: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    readTrack: { height: 3, marginHorizontal: 20, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 },
    readFill: { height: '100%', borderRadius: 2 },

    // HERO
    heroWrap: { marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
    heroBorder: { borderRadius: 30, padding: 1.5 },
    heroInner: { borderRadius: 28.5, backgroundColor: '#070B1A', padding: 18, overflow: 'hidden' },
    sweep: { position: 'absolute', top: -40, bottom: -40, width: 120 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    shieldBox: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
    shieldRing: { width: 84, height: 84, borderRadius: 42, opacity: 0.9 },
    shieldCore: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0B1022', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    shieldImg: { width: 50, height: 50 },
    heroLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
    heroTitle: { color: '#FFF', fontSize: 19, fontWeight: '900', marginTop: 3, letterSpacing: -0.3 },
    tierChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginTop: 8 },
    tierChipText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    trustChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
    trustChipText: { color: '#CBD5E1', fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },

    // TABS
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 25, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 18 },
    tabIndicator: { position: 'absolute', top: 6, bottom: 6, left: 6 },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 20 },
    activeTabTerms: { backgroundColor: '#6366F1' }, 
    activeTabPrivacy: { backgroundColor: '#A855F7' }, 
    tabText: { color: '#475569', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    activeTabText: { color: '#FFF' },

    // CONTENT
    scrollContent: { padding: 20 },
    glassCard: { backgroundColor: 'rgba(15, 23, 42, 0.35)', borderRadius: 35, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contentBlock: { marginBottom: 16, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    sectionBorder: { borderRadius: 26, padding: 1.2 },
    sectionInner: { borderRadius: 25, backgroundColor: 'rgba(8, 12, 28, 0.97)', padding: 18, overflow: 'hidden' },
    sectionTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 15, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    contentTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, flex: 1 },
    textWrapper: { paddingLeft: 0 },
    contentText: { color: '#94A3B8', fontSize: 13, lineHeight: 22, fontWeight: '600' },

    // FOOTER
    footer: { marginTop: 30, alignItems: 'center' },
    footerShieldBox: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    footerRing: { width: 92, height: 92, borderRadius: 46, opacity: 0.8 },
    shieldGlow: { width: 70, height: 70, borderRadius: 35, padding: 2, justifyContent: 'center', alignItems: 'center' },
    shieldInner: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerSub: { color: '#334155', fontSize: 10, fontWeight: '800' },
    brandHighlight: { color: '#475569', fontSize: 10, fontWeight: '900' }
});
