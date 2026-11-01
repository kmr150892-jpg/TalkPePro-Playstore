import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// 🔥 SATTI FIX: Replaced expo-video with expo-av for better compatibility 🔥
import { useVideoPlayer, VideoView } from 'expo-video';
import { deleteField, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (SMART FETCH)
const getLevelConfig = (userData: any) => {
    // 1. Direct Level Override (Highest Priority)
    const lvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (lvl !== undefined && lvl !== null) {
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
        if (lvl === 0) return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
    }

    // 2. Title Override
    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title.includes('L10') || title.includes('LEGEND')) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (title.includes('L9') || title.includes('MYTHIC')) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (title.includes('L8') || title.includes('ELITE')) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (title.includes('L7') || title.includes('MASTER')) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (title.includes('L6') || title.includes('DIAMOND')) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (title.includes('L5') || title.includes('PLATINUM')) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (title.includes('L4') || title.includes('GOLD')) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (title.includes('L3') || title.includes('SILVER')) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (title.includes('L2') || title.includes('BRONZE')) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (title.includes('L1') || title.includes('ROOKIE')) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    if (title.includes('L0') || title.includes('BEGINNER')) return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };

    // 3. Fallback to Beans (Original Logic)
    const beans = Number(userData?.totalBeansEarned) || Number(userData?.beans) || 0;
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (beans >= 30000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
};

// 🔥 50 STANDARD SKILLS FOR QUICK SELECTION
const STANDARD_SKILLS = [
    "Singing", "Dancing", "Astrology", "Tarot Reading", "Community Advice", "Career Counseling", "Life Coaching", 
    "Mindfulness & Motivation",  "Yoga", "Meditation", "Cooking", "Baking", "Photography", "Video Editing", 
    "Graphic Design", "Digital Marketing", "Programming", "App Development", "Web Development", 
    "Business Strategy", "Public Speaking", "Language Tutor", "English Fluency", 
    "Tamil Stories", "Comedy & Mimicry", "Acting", "Makeup & Styling", "Fashion Advice", "Interior Design", "Gaming Pro", 
    "Chess Strategy", "Magic Tricks", "Guitar Lessons", "Keyboard Lessons", "Drawing & Sketching", "Painting", 
    "Crafting", "Pet Care", "Travel Planning", "Event Planning", "standup Comedy", "Math Tutoring", 
    "Science Tutoring", "History & Culture", "Storytelling", "Poetry & Writing"
];

// 🎨 ICON FOR EVERY SKILL (visual only - does not touch skill names/data)
const SKILL_ICONS: { [key: string]: string } = {
    "Singing": "microphone-variant",
    "Dancing": "human-female-dance",
    "Astrology": "star-circle",
    "Tarot Reading": "cards-playing-outline",
    "Community Advice": "account-group",
    "Career Counseling": "briefcase-account",
    "Life Coaching": "compass",
    "Mindfulness & Motivation": "meditation",
    "Yoga": "yoga",
    "Meditation": "meditation",
    "Cooking": "chef-hat",
    "Baking": "cake-variant",
    "Photography": "camera",
    "Video Editing": "movie-edit",
    "Graphic Design": "palette",
    "Digital Marketing": "bullhorn",
    "Programming": "code-braces",
    "App Development": "cellphone-cog",
    "Web Development": "web",
    "Business Strategy": "chart-line",
    "Public Speaking": "account-voice",
    "Language Tutor": "translate",
    "English Fluency": "alphabetical-variant",
    "Tamil Stories": "book-open-page-variant",
    "Comedy & Mimicry": "emoticon-excited",
    "Acting": "drama-masks",
    "Makeup & Styling": "lipstick",
    "Fashion Advice": "hanger",
    "Interior Design": "sofa",
    "Gaming Pro": "gamepad-variant",
    "Chess Strategy": "chess-knight",
    "Magic Tricks": "auto-fix",
    "Guitar Lessons": "guitar-acoustic",
    "Keyboard Lessons": "piano",
    "Drawing & Sketching": "pencil",
    "Painting": "brush",
    "Crafting": "scissors-cutting",
    "Pet Care": "paw",
    "Travel Planning": "airplane",
    "Event Planning": "calendar-star",
    "standup Comedy": "microphone",
    "Math Tutoring": "calculator-variant",
    "Science Tutoring": "flask",
    "History & Culture": "bank",
    "Storytelling": "book-open-variant",
    "Poetry & Writing": "feather",
};
const getSkillIcon = (skill: string): any => SKILL_ICONS[skill] || 'star-four-points';

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

// ✨ 3D PRESS WRAPPER: card tilts back in 3D + squishes on touch, optional idle float
const PressScale = ({ children, onPress, disabled, style, wrapperStyle, floatY, tilt = 10 }: any) => {
    const press = useRef(new Animated.Value(0)).current;
    const to = (v: number) =>
        Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 7 }).start();
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
    const rotX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${tilt}deg`] });
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            disabled={disabled}
            onPress={onPress}
            onPressIn={() => to(1)}
            onPressOut={() => to(0)}
            style={wrapperStyle}
        >
            <Animated.View
                style={[
                    style,
                    { transform: [{ perspective: 700 }, { translateY: floatY || 0 }, { rotateX: rotX }, { scale }] }
                ]}
            >
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

// ✨ 3D TILT CARD: auto-sways in 3D, follows your finger when dragged sideways, glare + parallax layers
const Tilt3D = ({ children, style, radius = 28, max = 14, glare = true }: any) => {
    const rx = useRef(new Animated.Value(0)).current;
    const ry = useRef(new Animated.Value(0)).current;
    const sw = useRef(new Animated.Value(0)).current;
    const dims = useRef({ w: 300, h: 150 });

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(sw, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sw, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const release = () => {
        Animated.parallel([
            Animated.spring(rx, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
            Animated.spring(ry, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
        ]).start();
    };

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderMove: (_, g) => {
                ry.setValue(clamp(g.dx / (dims.current.w / 2)));
                rx.setValue(clamp(g.dy / dims.current.h));
            },
            onPanResponderRelease: release,
            onPanResponderTerminate: release,
        })
    ).current;

    const rotateX = rx.interpolate({ inputRange: [-1, 1], outputRange: [`${max}deg`, `-${max}deg`] });
    const rotateY = ry.interpolate({ inputRange: [-1, 1], outputRange: [`-${max}deg`, `${max}deg`] });
    const swayY = sw.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });
    const swayX = sw.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '-3deg'] });

    const front = Animated.add(
        ry.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }),
        sw.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] })
    );
    const back = Animated.add(
        ry.interpolate({ inputRange: [-1, 1], outputRange: [18, -18] }),
        sw.interpolate({ inputRange: [0, 1], outputRange: [10, -10] })
    );
    const glareX = Animated.add(
        ry.interpolate({ inputRange: [-1, 1], outputRange: [-130, 130] }),
        sw.interpolate({ inputRange: [0, 1], outputRange: [-70, 70] })
    );

    return (
        <Animated.View
            {...pan.panHandlers}
            onLayout={(e) => { dims.current = { w: e.nativeEvent.layout.width || 300, h: e.nativeEvent.layout.height || 150 }; }}
            style={[
                style,
                { transform: [{ perspective: 900 }, { rotateX }, { rotateY }, { rotateY: swayY }, { rotateX: swayX }] }
            ]}
        >
            {typeof children === 'function' ? children({ front, back }) : children}
            {glare && (
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
                    <Animated.View style={[styles.glareStrip, { transform: [{ translateX: glareX }, { rotate: '18deg' }] }]} />
                </View>
            )}
        </Animated.View>
    );
};

// ✨ 3D SPINNING LEVEL COIN (front = crown, back = level number)
const HeroCoin = ({ lvl, c1, c2 }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(a, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const frontRot = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const backRot = a.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '540deg'] });
    return (
        <View style={styles.coinWrap}>
            <Animated.View style={[styles.coinFace, { transform: [{ perspective: 500 }, { rotateY: frontRot }] }]}>
                <LinearGradient colors={[c1, c2] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinGrad}>
                    <MaterialCommunityIcons name="crown" size={22} color="#000" />
                </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.coinFace, { transform: [{ perspective: 500 }, { rotateY: backRot }] }]}>
                <LinearGradient colors={[c2, c1] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinGrad}>
                    <Text style={styles.coinText}>L{lvl}</Text>
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

// ✨ SKILL CHIP WITH ICON + SPRING POP ON SELECT
const SkillChip = ({ skill, selected, onPress, color }: any) => {
    const pop = useRef(new Animated.Value(selected ? 1 : 0)).current;
    useEffect(() => {
        Animated.spring(pop, { toValue: selected ? 1 : 0, useNativeDriver: true, friction: 5, tension: 140 }).start();
    }, [selected]);
    const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
    const rotX = pop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-8deg'] });
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View
                style={[
                    styles.skillChip,
                    selected ? { backgroundColor: color, borderColor: color } : { borderColor: 'rgba(255,255,255,0.1)' },
                    { transform: [{ perspective: 600 }, { rotateX: rotX }, { scale }] }
                ]}
            >
                <MaterialCommunityIcons name={getSkillIcon(skill)} size={15} color={selected ? '#000' : '#94A3B8'} />
                <Text style={[styles.skillChipText, selected && { color: '#000', fontWeight: '900' }]}>{skill}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

// ✨ FLOATING AMBIENT PARTICLES
const Particle = ({ left, size, delay, duration, color }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.55] });
    const opacity = a.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 0.8, 0.4, 0] });
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: height * 0.8,
                left,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateY }],
            }}
        />
    );
};

export default function MasterClassScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // 🔥 Data States
    const [userData, setUserData] = useState<any>(null);
    const [skillName, setSkillName] = useState('');
    const [currentSkill, setCurrentSkill] = useState<any>(null);

    // 🔥 Video Showcase States
    const [teaserUploading, setTeaserUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // 🔥 NEW: Delete showcase loading state
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false); // 🔥 SATTI NEW: Modal State for Play Store Safe Warning
    const [teaserVideo, setTeaserVideo] = useState<string | null>(null);
    const [avatarFailed, setAvatarFailed] = useState(false); // avatar image fallback
    const [introDone, setIntroDone] = useState(false); // ✨ NEW: cinematic intro overlay state
    const videoRef = useRef<any>(null); 

    const player = useVideoPlayer(teaserVideo || null, (player) => {
        player.loop = true;
    });

    // 🔥 Animations
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // ✨ Animations (premium layer)
    const entrance = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current; // staggered 3D reveal
    const pulseAnim = useRef(new Animated.Value(0)).current;   // pulsing rings / live dot
    const spinAnim = useRef(new Animated.Value(0)).current;    // rotating avatar ring / orbit
    const shineAnim = useRef(new Animated.Value(0)).current;   // light sweep on main button
    const floatAnim = useRef(new Animated.Value(0)).current;   // idle floating of action cards
    const warnAnim = useRef(new Animated.Value(0)).current;    // warning modal pop-in
    const previewAnim = useRef(new Animated.Value(0)).current; // preview modal pop-in
    const scrollY = useRef(new Animated.Value(0)).current;     // scroll parallax
    const introAnim = useRef(new Animated.Value(0)).current;   // cinematic intro progress
    const introOut = useRef(new Animated.Value(1)).current;    // cinematic intro fade-out

    // 📡 Get Current Data
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setUserData(data);
                setCurrentSkill({
                    name: data.masterclassSkill || '',
                    active: data.hasMasterclass || false
                });
                setSkillName(data.masterclassSkill || '');
                setTeaserVideo(data.teaserVideo || null); 
            }
            setLoading(false);
        });

        // Start Ambient Animation
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

    // ✨ looping premium animations (start once)
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        const spin = Animated.loop(
            Animated.timing(spinAnim, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
        );
        const shine = Animated.loop(
            Animated.sequence([
                Animated.timing(shineAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(1400),
                Animated.timing(shineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const float = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        pulse.start();
        spin.start();
        shine.start();
        float.start();

        return () => {
            pulse.stop();
            spin.stop();
            shine.stop();
            float.stop();
        };
    }, []);

    // ✨ CINEMATIC INTRO → then 3D staggered reveal (runs when data finishes loading)
    useEffect(() => {
        if (loading) return;
        introAnim.setValue(0);
        introOut.setValue(1);
        Animated.sequence([
            Animated.timing(introAnim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.delay(250),
            Animated.timing(introOut, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => setIntroDone(true));

        Animated.sequence([
            Animated.delay(1350),
            Animated.stagger(
                130,
                entrance.map(v => Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 8, tension: 55 }))
            ),
        ]).start();
    }, [loading]);

    // ✨ modal pop-in animations
    useEffect(() => {
        if (showWarningModal) {
            warnAnim.setValue(0);
            Animated.spring(warnAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 70 }).start();
        }
    }, [showWarningModal]);

    useEffect(() => {
        if (showPreviewModal) {
            previewAnim.setValue(0);
            Animated.spring(previewAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
        }
    }, [showPreviewModal]);

    // 🔥 THEME ENGINE SETUP
    const expertRate = userData?.pricePerMin || 1000;
    const userDiamondPrice = expertRate * 2; // Auto-calculated user price to save in DB silently
    const config = getLevelConfig(userData);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A', 
            '#020617'
        ] as const 
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary,
        borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80',
        borderBottomColor: theme.primary + '80',
    };

    // ✨ derived animation values
    const spinRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const ringScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
    const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    const shineTranslate = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
    const warnScale = warnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const previewScale = previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
    const floatA = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
    const floatB = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] });

    // flat reveal (header)
    const enterStyle = (i: number) => ({
        opacity: entrance[i],
        transform: [{ translateY: entrance[i].interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }]
    });
    // 3D flip-up reveal (cards)
    const enter3D = (i: number) => ({
        opacity: entrance[i],
        transform: [
            { perspective: 1000 },
            { translateY: entrance[i].interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
            { rotateX: entrance[i].interpolate({ inputRange: [0, 1], outputRange: ['38deg', '0deg'] }) },
            { scale: entrance[i].interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        ]
    });
    // hero tips away in 3D as you scroll
    const heroScroll = {
        transform: [
            { perspective: 1000 },
            { translateY: scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, 50], extrapolate: 'clamp' }) },
            { rotateX: scrollY.interpolate({ inputRange: [0, 300], outputRange: ['0deg', '28deg'], extrapolate: 'clamp' }) },
            { scale: scrollY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.9], extrapolate: 'clamp' }) },
        ],
        opacity: scrollY.interpolate({ inputRange: [0, 320], outputRange: [1, 0.35], extrapolate: 'clamp' }),
    };
    const orbScrollA = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -120], extrapolate: 'clamp' });
    const orbScrollB = scrollY.interpolate({ inputRange: [0, 600], outputRange: [0, -60], extrapolate: 'clamp' });

    const avatarUri: string | null =
        userData?.profilePic || userData?.photoURL || userData?.photo || userData?.avatar || userData?.image || user?.photoURL || null;
    const displayName: string = userData?.name || userData?.displayName || userData?.username || 'Creator';
    const isLive = !!currentSkill?.active;

    // 🔥 BUTTON CLICK INTERCEPTOR
    const handleUploadClick = () => {
        setShowWarningModal(true); // Open the warning modal first
    };

    // 🔥 CLOUDINARY TEASER UPLOAD LOGIC (Proceed after warning)
    const proceedToUpload = async () => {
        setShowWarningModal(false); // Close the modal
        if (!user?.uid) return;
        
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "Camera roll access is needed to upload a showcase.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'], 
                allowsEditing: true,
                aspect: [9, 16],
                quality: 1, 
                videoMaxDuration: 30, 
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedVideo = result.assets[0];

                if (selectedVideo.duration && selectedVideo.duration > 30000) {
                    Alert.alert(
                        "Video Too Long! ⏱️", 
                        "Showcase video must be under 30 seconds. Please edit or select a shorter video."
                    );
                    return;
                }

                setTeaserUploading(true);
                const videoUri = selectedVideo.uri;

                const CLOUD_NAME = 'dvwjxeexc'; 
                const UPLOAD_PRESET = 'TALKPE'; 

                const data = new FormData();
                data.append('file', {
                    uri: videoUri,
                    type: 'video/mp4',
                    name: `showcase_${user.uid}_${Date.now()}.mp4`
                } as any);
                data.append('upload_preset', UPLOAD_PRESET);
                data.append('cloud_name', CLOUD_NAME);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
                    method: 'POST',
                    body: data,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                    }
                });

                const responseData = await response.json();

                if (responseData.secure_url) {
                    const userDocRef = doc(db, "users", user.uid);
                    await updateDoc(userDocRef, {
                        teaserVideo: responseData.secure_url
                    });
                    Alert.alert("Success!", "Your Premium Showcase has been updated! 🎬");
                } else {
                    Alert.alert("Upload Failed", responseData.error?.message || "Could not upload video.");
                }
                
                setTeaserUploading(false);
            }
        } catch (error) {
            Alert.alert("Upload Failed", "Something went wrong while uploading your showcase.");
            setTeaserUploading(false);
        }
    };

    // 🔥 NEW: DELETE SHOWCASE VIDEO LOGIC (asks confirmation first)
    const handleDeleteShowcase = () => {
        if (!user?.uid || !teaserVideo) return;

        Alert.alert(
            "Delete Showcase? 🗑️",
            "Your showcase video will be removed from your Premium Spotlight. You can upload a new one anytime.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            try { player.pause(); } catch (e) {}
                            await updateDoc(doc(db, "users", user.uid), {
                                teaserVideo: deleteField()
                            });
                            setShowPreviewModal(false);
                            Alert.alert("Deleted", "Your showcase video has been removed.");
                        } catch (error) {
                            Alert.alert("Error", "Unable to delete showcase. Please try again.");
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    // 🔥 SAVE SKILL NAME LOGIC
    const handleSaveSkill = async () => {
        if (!skillName.trim()) {
            Alert.alert("Missing Details", "Skill name is required to start your Premium Spotlight! 🎓");
            return;
        }

        setIsUpdating(true);
        try {
            await updateDoc(doc(db, "users", user!.uid), {
                masterclassSkill: skillName.trim(),
                masterclassUserPrice: userDiamondPrice, // Saved automatically so Discover screen can read it
                hasMasterclass: true,
                masterclassUpdatedAt: serverTimestamp()
            });
            Alert.alert("CONGRATS 🔥", "Your Premium Spotlight is now live. Users can connect with you securely!");
        } catch (error) {
            Alert.alert("Error", "Unable to update. Please try again");
        } finally {
            setIsUpdating(false);
        }
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
            
            {/* 🔥 DYNAMIC BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: theme.primary, transform: [{ translateY: Animated.add(orbTranslateY, orbScrollA) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.add(Animated.multiply(orbTranslateY, -1), orbScrollB) }] }]} />

            {/* ✨ FLOATING AMBIENT PARTICLES */}
            <Particle left={width * 0.08} size={5} delay={0} duration={7000} color={theme.primary} />
            <Particle left={width * 0.25} size={3} delay={1800} duration={8200} color="#FFFFFF" />
            <Particle left={width * 0.45} size={6} delay={900} duration={9000} color={theme.accent} />
            <Particle left={width * 0.63} size={4} delay={2600} duration={7600} color={theme.secondary} />
            <Particle left={width * 0.8} size={5} delay={400} duration={8800} color={theme.primary} />
            <Particle left={width * 0.92} size={3} delay={3200} duration={7200} color="#FFFFFF" />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                {/* 🛡️ HEADER */}
                <Animated.View style={[styles.header, enterStyle(0)]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.primary + '40', borderWidth: 1 }]}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Premium Spotlight</Text>
                        <Text style={[styles.headerSub, { color: theme.primary }]}>Monetize your unique skills</Text>
                    </View>
                    {/* LEVEL BADGE */}
                    <View style={[styles.levelPill, { borderColor: theme.accent + '80', backgroundColor: theme.accent + '18' }]}>
                        <MaterialCommunityIcons name="shield-star" size={14} color={theme.accent} />
                        <Text style={[styles.levelPillText, { color: theme.accent }]}>{config.label}</Text>
                    </View>
                </Animated.View>

                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                >

                    {/* ✨ 3D HERO PROFILE CARD (tilts with your finger, sways on its own, parallax layers, spinning coin) */}
                    <Animated.View style={[styles.heroWrap, enter3D(1)]}>
                        <Animated.View style={heroScroll}>
                            <Tilt3D radius={30} style={styles.heroTilt}>
                                {({ front, back }: any) => (
                                    <LinearGradient
                                        colors={[theme.primary + '55', theme.secondary + '33', 'rgba(2,6,23,0.92)'] as const}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.heroCard, { borderColor: theme.primary + '60' }]}
                                    >
                                        {/* back layer (moves opposite = depth) */}
                                        <Animated.View pointerEvents="none" style={[styles.heroBgIcon, { transform: [{ translateX: back }] }]}>
                                            <MaterialCommunityIcons name="star-four-points" size={170} color={theme.primary} />
                                        </Animated.View>

                                        {/* floating level coin */}
                                        <View style={styles.coinSlot}>
                                            <HeroCoin lvl={config.lvl} c1={theme.primary} c2={theme.accent} />
                                        </View>

                                        {/* front layer: avatar + orbit */}
                                        <Animated.View style={[styles.avatarArea, { transform: [{ translateX: front }] }]}>
                                            <Animated.View
                                                style={[
                                                    styles.avatarHalo,
                                                    { backgroundColor: theme.accent, opacity: ringOpacity, transform: [{ scale: ringScale }] }
                                                ]}
                                            />
                                            <Animated.View style={[styles.avatarSpinner, { transform: [{ rotate: spinRotate }] }]}>
                                                <LinearGradient
                                                    colors={[theme.primary, theme.secondary, theme.accent, theme.primary] as const}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            </Animated.View>
                                            <View style={styles.avatarInner}>
                                                {avatarUri && !avatarFailed ? (
                                                    <Image
                                                        source={{ uri: avatarUri }}
                                                        style={styles.avatarImg}
                                                        onError={() => setAvatarFailed(true)}
                                                    />
                                                ) : (
                                                    <MaterialCommunityIcons name="account-star" size={42} color={theme.primary} />
                                                )}
                                            </View>
                                            {/* orbiting satellites */}
                                            <Animated.View pointerEvents="none" style={[styles.orbit, { transform: [{ rotate: orbitRotate }] }]}>
                                                <View style={[styles.satellite, { top: -4, left: 52, backgroundColor: theme.accent }]} />
                                                <View style={[styles.satelliteSmall, { bottom: 2, left: 6, backgroundColor: '#FFF' }]} />
                                            </Animated.View>
                                        </Animated.View>

                                        <Animated.View style={{ flex: 1, transform: [{ translateX: front }] }}>
                                            <Text style={[styles.heroName, { marginRight: 50 }]} numberOfLines={1}>{displayName}</Text>
                                            <Text style={[styles.heroSkill, { color: theme.accent }]} numberOfLines={2}>
                                                {currentSkill?.name ? currentSkill.name : 'Pick your signature skill'}
                                            </Text>
                                            <View style={styles.heroStatusRow}>
                                                <View style={styles.liveDotWrap}>
                                                    {isLive && (
                                                        <Animated.View
                                                            style={[
                                                                styles.liveDotHalo,
                                                                { opacity: ringOpacity, transform: [{ scale: ringScale }] }
                                                            ]}
                                                        />
                                                    )}
                                                    <View style={[styles.liveDot, { backgroundColor: isLive ? '#22C55E' : '#64748B' }]} />
                                                </View>
                                                <Text style={[styles.heroStatusText, { color: isLive ? '#22C55E' : '#94A3B8' }]}>
                                                    {isLive ? 'SPOTLIGHT LIVE' : 'NOT LIVE YET'}
                                                </Text>
                                            </View>
                                        </Animated.View>
                                    </LinearGradient>
                                )}
                            </Tilt3D>
                        </Animated.View>
                    </Animated.View>
                    
                    {/* 🎬 SKILL SHOWCASE VIDEO UPLOAD (LARGE ACTION CARDS - 3D float + press tilt) */}
                    <Animated.View style={[styles.marginSection, enter3D(2)]}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>30-SEC SKILL SHOWCASE</Text>
                        
                        <View style={styles.actionCardRow}>
                            {/* UPLOAD CARD 🔥 Changed onPress to handleUploadClick 🔥 */}
                            <PressScale
                                onPress={handleUploadClick}
                                disabled={teaserUploading}
                                floatY={floatA}
                                tilt={14}
                                wrapperStyle={{ flex: 1 }}
                                style={[styles.largeActionCard, borderType2]}
                            >
                                <View style={styles.iconCircleWrap}>
                                    <Animated.View
                                        style={[
                                            styles.iconPulse,
                                            { backgroundColor: theme.primary, opacity: ringOpacity, transform: [{ scale: ringScale }] }
                                        ]}
                                    />
                                    <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20', marginBottom: 0 }]}>
                                        {teaserUploading ? <ActivityIndicator color={theme.primary} /> : <Ionicons name="cloud-upload" size={32} color={theme.primary} />}
                                    </View>
                                </View>
                                <Text style={styles.actionCardTitle}>
                                    {teaserVideo ? "UPDATE\nSHOWCASE" : "UPLOAD\nSHOWCASE"}
                                </Text>
                                <Text style={styles.actionCardSub}>Max 30 seconds</Text>
                            </PressScale>

                            {/* PREVIEW CARD */}
                            <PressScale
                                onPress={() => {
                                    if(teaserVideo) setShowPreviewModal(true);
                                    else Alert.alert("No Video", "Upload a showcase video first.");
                                }}
                                floatY={floatB}
                                tilt={14}
                                wrapperStyle={{ flex: 1 }}
                                style={[styles.largeActionCard, borderType2, !teaserVideo && { opacity: 0.5 }]}
                            >
                                <View style={styles.iconCircleWrap}>
                                    {!!teaserVideo && (
                                        <Animated.View
                                            style={[
                                                styles.iconPulse,
                                                { backgroundColor: theme.secondary, opacity: ringOpacity, transform: [{ scale: ringScale }] }
                                            ]}
                                        />
                                    )}
                                    <View style={[styles.iconCircle, { backgroundColor: theme.secondary + '20', marginBottom: 0 }]}>
                                        <Ionicons name="play" size={32} color={theme.secondary} />
                                    </View>
                                </View>
                                <Text style={styles.actionCardTitle}>PREVIEW</Text>
                                <Text style={styles.actionCardSub}>Check quality</Text>
                            </PressScale>
                        </View>
                        
                        {/* CREATOR TIP */}
                        <View style={styles.creatorTipBox}>
                            <MaterialCommunityIcons name="lightbulb-on" size={16} color="#FBBF24" />
                            <Text style={styles.creatorTipText}>Pro Tip: Use good lighting and show high energy to get more calls!</Text>
                        </View>
                    </Animated.View>

                    {/* 🎓 LISTING FORM WITH TALL SKILL BOX */}
                    <Animated.View style={[styles.formCard, borderType2, { backgroundColor: 'rgba(15, 17, 21, 0.85)' }, enter3D(3)]}>

                        {/* ✨ LIVE 3D CARD PREVIEW (text now wraps - nothing is cut) */}
                        <Text style={[styles.label, { color: theme.primary }]}>HOW USERS WILL SEE YOU</Text>
                        <Tilt3D radius={22} max={10} style={styles.livePreviewTilt}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary, theme.accent] as const}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.livePreviewBorder}
                            >
                                <View style={styles.livePreviewInner}>
                                    <View style={styles.livePreviewTop}>
                                        <View style={[styles.livePreviewIcon, { backgroundColor: theme.primary + '25' }]}>
                                            <MaterialCommunityIcons name={getSkillIcon(skillName)} size={28} color={theme.primary} />
                                        </View>
                                        <View style={[styles.premiumTag, { backgroundColor: theme.accent }]}>
                                            <MaterialCommunityIcons name="crown" size={12} color="#000" />
                                            <Text style={styles.premiumTagText}>PREMIUM</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.livePreviewSkill} numberOfLines={3}>
                                        {skillName.trim() ? skillName.trim() : 'Your skill appears here'}
                                    </Text>
                                    <Text style={styles.livePreviewMeta} numberOfLines={2}>
                                        {displayName} • {config.label}
                                    </Text>
                                    <View style={styles.livePreviewFooter}>
                                        <MaterialCommunityIcons name={teaserVideo ? 'movie-open-check' : 'movie-open-off-outline'} size={14} color={teaserVideo ? '#22C55E' : '#64748B'} />
                                        <Text style={[styles.livePreviewFooterText, { color: teaserVideo ? '#22C55E' : '#64748B' }]}>
                                            {teaserVideo ? 'Showcase attached' : 'No showcase yet'}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </Tilt3D>
                        
                        <Text style={[styles.label, { color: theme.primary, marginTop: 22 }]}>SELECT OR TYPE YOUR SKILL</Text>
                        
                        {/* 🔥 TALL SCROLLING SKILL GRID */}
                        <View style={styles.tallSkillBox}>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={styles.skillGrid}>
                                {STANDARD_SKILLS.map(skill => (
                                    <SkillChip
                                        key={skill}
                                        skill={skill}
                                        selected={skillName === skill}
                                        color={theme.primary}
                                        onPress={() => setSkillName(skill)}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        <Text style={[styles.label, { color: theme.primary, marginTop: 15 }]}>Custom Skill</Text>
                        <View style={styles.inputWrap}>
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.primary} style={{ marginLeft: 18 }} />
                            <TextInput 
                                placeholder="Type here..."
                                placeholderTextColor="#475569"
                                value={skillName}
                                onChangeText={setSkillName}
                                style={[styles.largeInput, styles.largeInputInner, { borderColor: theme.primary + '40' }]}
                            />
                        </View>

                        {/* 🔥 THE EXTRA "MASS" FEATURE: ALGORITHM BOOST INFO 🔥 */}
                        <View style={[styles.lockedRevenueCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
                            <View style={styles.revenueHeader}>
                                <MaterialCommunityIcons name="rocket-launch" size={18} color={theme.accent} />
                                <Text style={[styles.revenueTitle, { color: theme.accent }]}> ALGORITHM BOOST</Text>
                            </View>
                            <Text style={styles.revenueDesc}>Activate Premium Spotlight for priority discovery. Experience new daily updates that bring more traffic and opportunities your way!</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] }) }] }}>
                                    <MaterialCommunityIcons name="trending-up" size={28} color="#FFF" />
                                </Animated.View>
                                <Text style={styles.revenueAmount}>300% MORE VISIBILITY</Text>
                            </View>
                        </View>

                        <PressScale
                            onPress={handleSaveSkill}
                            disabled={isUpdating}
                            tilt={6}
                            wrapperStyle={{ marginTop: 30 }}
                            style={[styles.mainBtn, { shadowColor: theme.primary, marginTop: 0 }]}
                        >
                            <LinearGradient colors={[theme.primary, theme.secondary]} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.btnGradient}>
                                {isUpdating ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <MaterialCommunityIcons name="rocket-launch" size={18} color="#FFF" />
                                        <Text style={styles.btnText}>{currentSkill?.active ? "UPDATE PREMIUM SPOTLIGHT" : "START PREMIUM SPOTLIGHT"}</Text>
                                    </View>
                                )}
                                {/* light sweep across the button */}
                                <Animated.View pointerEvents="none" style={[styles.btnShine, { transform: [{ translateX: shineTranslate }, { rotate: '20deg' }] }]} />
                            </LinearGradient>
                        </PressScale>
                    </Animated.View>

                </Animated.ScrollView>
            </KeyboardAvoidingView>

            {/* 🔥 SATTI FIX: PLAY STORE SAFE & PROFESSIONAL GUIDELINES MODAL 🔥 */}
            <Modal visible={showWarningModal} transparent animationType="fade" onRequestClose={() => setShowWarningModal(false)}>
                <BlurView intensity={90} tint="dark" style={styles.previewModalOverlay}>
                    <Animated.View style={[styles.premiumWarningBox, { width: '85%', marginHorizontal: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: theme.primary, opacity: warnAnim, transform: [{ perspective: 900 }, { rotateX: warnAnim.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) }, { scale: warnScale }] }]}>
                        <View style={styles.warningHeader}>
                            <MaterialCommunityIcons name="star-shooting" size={24} color={theme.primary} />
                            <Text style={[styles.warningTitle, { fontSize: 14, color: theme.primary }]}>PREMIUM SHOWCASE GUIDELINES</Text>
                        </View>
                        <Text style={[styles.warningText, { fontSize: 13, marginTop: 10, marginBottom: 20, color: '#E2E8F0' }]}>
                            Attract more users by uploading a high-energy, engaging video demonstrating your skills!
                            {"\n\n"}
                            <Text style={{color: '#10B981', fontWeight: 'bold'}}>✅ Show your real personality</Text>{"\n"}
                            <Text style={{color: '#10B981', fontWeight: 'bold'}}>✅ Ensure good lighting & clear audio</Text>{"\n"}
                            <Text style={{color: '#10B981', fontWeight: 'bold'}}>✅ Keep it highly engaging & respectful</Text>
                            {"\n\n"}
                            <Text style={{color: '#EF4444', fontSize: 11}}>⚠️ Note: Explicit, abusive, or copyrighted content is strictly prohibited and will result in account restriction.</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowWarningModal(false)}>
                                <Text style={[styles.btnText, { color: '#FFF', fontSize: 12 }]}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1.5, backgroundColor: theme.primary }]} onPress={proceedToUpload}>
                                <Text style={[styles.btnText, { color: '#FFF', fontSize: 12 }]}>I UNDERSTAND</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </BlurView>
            </Modal>

            {/* 🔥 SATTI FIX: VIDEO PREVIEW MODAL USING expo-av 🔥 */}
            <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <BlurView intensity={95} tint="dark" style={styles.previewModalOverlay}>
                    <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setShowPreviewModal(false)}>
                        <Ionicons name="close-circle" size={40} color="#FFF" />
                    </TouchableOpacity>
                    <Animated.View style={{ opacity: previewAnim, transform: [{ perspective: 1100 }, { rotateY: previewAnim.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }) }, { scale: previewScale }], alignItems: 'center' }}>
                        {/* glowing gradient frame around the video */}
                        <LinearGradient
                            colors={[theme.primary, theme.secondary, theme.accent] as const}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.previewGlowFrame}
                        >
                            <View style={[styles.previewVideoContainer, { borderColor: theme.primary }]}>
                                {teaserVideo && (
                                   <VideoView 
                                        player={player} 
                                        style={styles.previewVideo} 
                                        contentFit="cover" 
                                    />
                                )}
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* 🔥 NEW: DELETE SHOWCASE BUTTON 🔥 */}
                    <TouchableOpacity
                        onPress={handleDeleteShowcase}
                        disabled={isDeleting}
                        style={styles.deleteBtn}
                    >
                        {isDeleting ? (
                            <ActivityIndicator color="#EF4444" />
                        ) : (
                            <>
                                <Ionicons name="trash" size={18} color="#EF4444" />
                                <Text style={styles.deleteBtnText}>DELETE SHOWCASE</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </BlurView>
            </Modal>

            {/* ✨ CINEMATIC INTRO OVERLAY (expanding rings + spinning 3D crown + title, then fades out) */}
            {!introDone && (
                <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.introOverlay, { opacity: introOut }]}>
                    {[0, 1, 2].map(i => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.introRing,
                                {
                                    borderColor: i === 1 ? theme.secondary : theme.primary,
                                    opacity: introAnim.interpolate({ inputRange: [0, 0.2 + i * 0.1, 1], outputRange: [0, 0.8, 0], extrapolate: 'clamp' }),
                                    transform: [{ scale: introAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4 + i * 1.1] }) }]
                                }
                            ]}
                        />
                    ))}
                    <Animated.View
                        style={{
                            transform: [
                                { perspective: 600 },
                                { rotateY: introAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) },
                                { scale: introAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1.25, 1] }) }
                            ]
                        }}
                    >
                        <LinearGradient colors={[theme.primary, theme.secondary] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.introCrown}>
                            <MaterialCommunityIcons name="crown" size={48} color="#FFF" />
                        </LinearGradient>
                    </Animated.View>
                    <Animated.Text
                        style={[
                            styles.introTitle,
                            {
                                color: theme.accent,
                                opacity: introAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                                transform: [{ translateY: introAnim.interpolate({ inputRange: [0.4, 1], outputRange: [24, 0], extrapolate: 'clamp' }) }]
                            }
                        ]}
                    >
                        PREMIUM SPOTLIGHT
                    </Animated.Text>
                </Animated.View>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, gap: 16 },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    headerSub: { fontSize: 12, fontWeight: '600' },

    // LEVEL PILL
    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
    levelPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    
    marginSection: { marginTop: 10 },
    sectionTitle: { fontSize: 12, fontWeight: '900', marginHorizontal: 24, marginBottom: 15, letterSpacing: 1 },

    // ✨ 3D HERO CARD
    heroWrap: { marginHorizontal: 24, marginBottom: 18 },
    heroTilt: { borderRadius: 30 },
    heroCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, borderRadius: 30, borderWidth: 1, overflow: 'hidden' },
    heroBgIcon: { position: 'absolute', right: -30, top: -20, opacity: 0.09 },
    coinSlot: { position: 'absolute', top: 14, right: 14, zIndex: 5 },
    coinWrap: { width: 46, height: 46 },
    coinFace: { position: 'absolute', width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backfaceVisibility: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
    coinGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coinText: { color: '#000', fontWeight: '900', fontSize: 14 },
    glareStrip: { position: 'absolute', top: -40, bottom: -40, width: 90, backgroundColor: 'rgba(255,255,255,0.12)' },
    avatarArea: { width: 92, height: 92, justifyContent: 'center', alignItems: 'center' },
    avatarHalo: { position: 'absolute', width: 84, height: 84, borderRadius: 42 },
    avatarSpinner: { position: 'absolute', width: 90, height: 90, borderRadius: 45, overflow: 'hidden' },
    avatarInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0B1220', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: '100%', height: '100%' },
    orbit: { position: 'absolute', width: 112, height: 112, top: -10, left: -10 },
    satellite: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
    satelliteSmall: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
    heroName: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
    heroSkill: { fontSize: 13, fontWeight: '800', marginTop: 3 },
    heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    liveDotWrap: { width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    liveDotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' },
    liveDot: { width: 9, height: 9, borderRadius: 5 },
    heroStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

    // 🔥 VIBE CHECK MODAL STYLES 🔥
    premiumWarningBox: {
        marginHorizontal: 24,
        marginBottom: 15,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    warningTitle: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    warningText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '600',
        lineHeight: 18,
    },
    modalActionBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    
    // 🔥 NEW LARGE ACTION CARDS
    actionCardRow: { flexDirection: 'row', gap: 15, marginHorizontal: 24 },
    largeActionCard: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', borderRadius: 25, padding: 20, alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    iconCircleWrap: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    iconPulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
    actionCardTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textAlign: 'center', lineHeight: 18 },
    actionCardSub: { color: '#64748B', fontSize: 9, fontWeight: '700', marginTop: 5 },
    
    creatorTipBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 15, backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
    creatorTipText: { color: '#FBBF24', fontSize: 10, fontWeight: '700', marginLeft: 8, flex: 1 },

    formCard: { marginHorizontal: 24, marginTop: 25, padding: 25, borderRadius: 35 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },

    // ✨ LIVE PREVIEW CARD (stacked layout so text never gets cut)
    livePreviewTilt: { borderRadius: 22 },
    livePreviewBorder: { borderRadius: 22, padding: 1.5 },
    livePreviewInner: { backgroundColor: '#0B1220', borderRadius: 21, padding: 16 },
    livePreviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    livePreviewIcon: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    livePreviewSkill: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.3, lineHeight: 28, flexShrink: 1 },
    livePreviewMeta: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 6, lineHeight: 17, flexShrink: 1 },
    livePreviewFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    livePreviewFooterText: { fontSize: 11, fontWeight: '800' },
    premiumTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    premiumTagText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
    
    // 🔥 TALL SKILL BOX
    tallSkillBox: { height: 250, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 10, marginBottom: 10 },
    skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
    skillChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
    skillChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
    
    largeInput: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 20, paddingVertical: 20, borderRadius: 20, color: '#FFF', fontWeight: '700', fontSize: 16, borderWidth: 1 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
    largeInputInner: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingLeft: 10 },
    
    lockedRevenueCard: { marginTop: 25, padding: 20, borderRadius: 20, borderWidth: 1 },
    revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    revenueTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    revenueDesc: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    revenueAmount: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },

    mainBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowOpacity: 0.3, shadowRadius: 15 },
    btnGradient: { paddingVertical: 22, alignItems: 'center', overflow: 'hidden' },
    btnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
    btnShine: { position: 'absolute', top: -20, bottom: -20, width: 46, backgroundColor: 'rgba(255,255,255,0.28)' },
    
    previewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
    closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 100 },
    previewVideoContainer: { width: width * 0.85, height: height * 0.7, borderRadius: 30, overflow: 'hidden', borderWidth: 2, backgroundColor: '#000' },
    previewVideo: { width: '100%', height: '100%' },
    previewGlowFrame: { padding: 3, borderRadius: 34 },

    // 🔥 NEW: DELETE SHOWCASE BUTTON STYLES
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.6)',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        minHeight: 46,
    },
    deleteBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    // ✨ CINEMATIC INTRO
    introOverlay: { backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', zIndex: 999, elevation: 999 },
    introRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2 },
    introCrown: { width: 104, height: 104, borderRadius: 52, justifyContent: 'center', alignItems: 'center' },
    introTitle: { position: 'absolute', bottom: height * 0.3, fontSize: 18, fontWeight: '900', letterSpacing: 6 },
});
