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
        text: 'TalkPe Pro is a live interaction platform strictly restricted to adults aged 18 and above. By using the app you confirm that you are 18 or older, and we may terminate any account that we suspect belongs to a minor. All participants must engage with respect. Harassment, abuse or any other policy violation may lead to a warning, restriction, suspension or permanent ban under our zero-tolerance policy.'
    },
    {
        icon: 'diamond-stone',
        color: '#0EA5E9',
        title: '2. Digital Assets (Diamonds)',
        text: 'Diamonds are virtual in-app items used to connect with hosts and to send virtual gifts. Users cannot withdraw Diamonds or exchange them for money, and Diamonds are not a currency. Gifts you send are credited to hosts as rewards under these Terms. Levels are based on in-app Diamond activity, unlock features and have no cash value. When Diamond purchases are available, they are processed only through Google Play Billing and are final and non-refundable, except where required by applicable law or Google Play policies.'
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
        text: 'Verified hosts earn from genuine interactions: video calls and gifts received from users. Hosts receive rewards for these interactions. Rewards are converted to INR (100 rewards = ₹1) and shown in the host wallet at rates set by TalkPe Pro. When the wallet balance reaches the ₹500 minimum, a host can submit a redemption request in the app with bank details. A transaction charge of ₹100 applies per redemption, and a valid ID proof is required for redemption requests above ₹5,000. Every request is manually reviewed by our admin team (5-7 working days). After verification, our admin team transfers the approved amount outside the app and the host is notified in the app. Games are never a source of rewards. Hosts must not share personal contact details to bypass the app. Redemption requests found to involve fraud, misuse or policy violations may be rejected, delayed or reversed, and the related account may be suspended. Hosts are responsible for any taxes that apply to the amounts they redeem.'
    },
    {
        icon: 'alert-octagon',
        color: '#F43F5E',
        title: '5. Interaction Safety & Reporting',
        text: "Users and Hosts have access to immediate 'Block' and 'Report' functions during Video Calls, Quick Connect sessions, Live Broadcasts, Forum rooms, and on profiles and Spotlight videos. In Live and Forum chats, if someone sends an abusive, inappropriate or harmful message, simply tap that message to open the 'Block' and 'Report' options for the sender. Users and Hosts can also fill and submit a confidential Trust & Safety report through the Support Hub and track its status in the app. Our admin team reviews every submitted report and we aim to resolve it within 24 hours. You can see the status of your report in the Support Hub in the app."
    },
    {
        icon: 'security',
        color: '#10B981',
        title: '6. User Responsibility',
        text: 'You are responsible for keeping your Google account and device secure. TalkPe Pro is not liable for unauthorized access resulting from user negligence or shared sensitive information. Never share OTPs, passwords or banking details with anyone; our team will never ask for them. Capturing, recording or sharing other users\' video calls or live sessions without their consent (including by using another device) is strictly prohibited and may lead to account termination.'
    },
    {
        icon: 'gavel',
        color: '#F59E0B',
        title: '7. Content Moderation & Spotlight',
        text: 'We maintain strict User-Generated Content (UGC) policies. We prohibit nudity, sexual content, harassment, hate speech, threats, violence, illegal content, scams, fake profiles, and asking users to pay or share contact details outside the app. Spotlight videos and chat messages in Live and Forum rooms can be reported. Every report is sent to our admin team, who verify it and take action if the content really violates our rules. Violating content may be removed, and users who send violating content may be warned, blocked, restricted or permanently terminated without refunds, except where required by law.'
    },
    {
        icon: 'wifi-off',
        color: '#8B5CF6',
        title: '8. Disconnections (Games & Calls)',
        text: 'In the event of a network disconnection during a free game, the match may end or restart automatically. Since games are free to play and carry no rewards, no Diamonds or rewards are charged, lost or owed because of a disconnection. Live calls depend on the internet connection of both the user and the host, and may disconnect because of network problems on either side. If you believe you were charged incorrectly, contact support@talkpepro.com and our team will review your request.'
    },
    {
        icon: 'account-check',
        color: '#14B8A6',
        title: '9. Verified Hosts',
        text: 'Every host submits a profile photo and a short selfie video, which are reviewed and verified by our admin team before the host can receive calls. Hosts must be 18 years or older and must follow our community guidelines. Accounts that violate our policies may be warned, suspended or permanently removed.'
    },
    {
        icon: 'delete-sweep',
        color: '#FB923C',
        title: '10. Account Termination & Deletion',
        text: 'You may stop using TalkPe Pro and delete your account at any time from inside the app by tapping the DELETE ACCOUNT button at the bottom of your home screen. You may also request deletion by emailing support@talkpepro.com. We may suspend or terminate accounts that violate these Terms. Pending redemption requests of accounts terminated for fraud or policy violations may be rejected.'
    },
    {
        icon: 'email',
        color: '#38BDF8',
        title: '11. Contact & Updates',
        text: 'We may update these Terms from time to time to reflect changes in our services or legal requirements. Continued use of the app after an update means you accept the revised Terms. For any questions, contact us at support@talkpepro.com.'
    }
];

// ✅ PRIVACY POLICY
const PRIVACY_SECTIONS = [
    {
        icon: 'microphone-off',
        color: '#A855F7',
        title: '1. Communication Privacy & No Recording',
        text: 'Live interactions (Quick Connect, Live Rooms and Video Calls) are protected with encryption in transit. Your private video and audio calls are NEVER recorded, stored, or monitored by TalkPe Pro. To further protect your privacy, screenshots and screen recording are blocked inside Video Calls and Live sessions on supported devices.'
    },
    {
        icon: 'account-details',
        color: '#6366F1',
        title: '2. Information We Collect',
        text: 'We collect the details you give us or that come from Google Sign-In (name, email and profile photo), the profile information you add, your wallet and transaction history, call and gift history, chat messages in Live and Forum rooms, Spotlight videos and photos you upload, your device notification token and the reports you submit. For hosts we also collect the verification photo and selfie video, and the bank details and ID proof submitted with a redemption request.'
    },
    {
        icon: 'cog',
        color: '#22C55E',
        title: '3. How We Use Your Information',
        text: 'We use your information to run calls, live rooms, forums and your wallet, show your level, send notifications, keep the community safe (including reviewing reports), verify hosts, process redemption requests and provide support. We do not sell your personal data and we do not share it with third-party advertisers for marketing purposes.'
    },
    {
        icon: 'database-lock',
        color: '#EC4899',
        title: '4. Information Security & Service Providers',
        text: 'Your data is stored with trusted service providers: Google (Firebase and Google Sign-In) and Cloudinary for media storage and delivery, plus our real-time video and audio provider for calls. Data is encrypted in transit, and Firebase also encrypts stored data. We use reasonable technical and organisational measures to protect your information, but no method of storage or transmission is completely secure.'
    },
    {
        icon: 'credit-card-chip',
        color: '#F59E0B',
        title: '5. Transaction Protection',
        text: 'Diamond purchases, when available, are processed only through Google Play Billing, which handles your payment details. Sensitive information like card numbers, CVV or banking passwords is never stored within the TalkPe Pro app.'
    },
    {
        icon: 'eye-off',
        color: '#06B6D4',
        title: '6. Data Permissions',
        text: 'Camera and microphone are used only when you use features that need them: video calls, voice rooms and live sessions, host selfie verification, and recording or uploading Spotlight videos. Photos and videos are accessed only when you choose to upload them. Notification permission is used to alert you about calls and updates. You can manage or revoke these permissions in your device settings at any time.'
    },
    {
        icon: 'bank-check',
        color: '#84CC16',
        title: '7. Host Redemption & Verification Data',
        text: 'Hosts who submit a redemption request provide bank details, and an ID proof where required, only to verify the request and to send the approved amount. The verification photo and selfie video are used only to confirm that a host is a real adult. This information is reviewed manually by our admin team, is used for no other purpose and is never sold. Where the law requires, or to prevent fraud, we may retain limited redemption and transaction records.'
    },
    {
        icon: 'gamepad-round',
        color: '#38BDF8',
        title: '8. Games & Your Data',
        text: 'Games are free, for fun and entertainment only. Playing a game does not charge you, does not award rewards to users or hosts, and does not require any additional sensitive personal information.'
    },
    {
        icon: 'delete-sweep',
        color: '#14B8A6',
        title: '9. Data Retention & Deletion Rights',
        text: 'You can delete your account and associated personal data from our servers at any time inside the app. Hosts: tap the Delete Account button at the bottom of the Home screen. Users: go to Profile > Edit Profile > Delete Account. Where the law requires, or to prevent fraud, we may retain limited redemption and transaction records after deletion. You can also request deletion by writing to support@talkpepro.com.'
    },
    {
        icon: 'account-lock',
        color: '#8B5CF6',
        title: '10. Your Choices & Rights',
        text: 'You can edit your profile information in the app, and manage camera, microphone, photo and notification permissions in your device settings. To access or correct your data, or to ask any question about it, contact support@talkpepro.com.'
    },
    {
        icon: 'account-check',
        color: '#F43F5E',
        title: '11. Age Restriction (18+)',
        text: 'TalkPe Pro is strictly for adults aged 18 and above. We do not knowingly collect personal data from anyone under 18, and accounts found to belong to minors are removed along with their data.'
    },
    {
        icon: 'email',
        color: '#0EA5E9',
        title: '12. Contact & Policy Updates',
        text: 'For privacy questions or data requests, contact support@talkpepro.com. We may update this Privacy Policy from time to time, and the date at the top of this screen shows the latest update.'
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