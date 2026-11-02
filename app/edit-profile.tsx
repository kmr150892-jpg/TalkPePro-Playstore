import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// ✅ Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload";
const UPLOAD_PRESET = "talkpe"; 

// 🔥 Refined Labels for Compliance
const EXPERTISE_TAGS = [
  "Community Advice", "Astrology", "Career Guide", "Good Listener", 
  "Networking Tips", "Mental Wellness", "Entertainment", "Spiritual"
];

const HOBBIES_TAGS = [
  "Cricket 🏏", "Football ⚽", "Dancing 💃", "Singing 🎤", 
  "Gaming 🎮", "Music 🎵", "Travel ✈️", "Movies 🎬", 
  "Fitness 💪", "Art 🎨", "Cooking 🍳", "Photography 📸",
  "Reading 📚", "Writing ✍️", "Fashion 👗", "Tech 💻"
];

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

// 🆕 Level thresholds (level progress bar-ku): index = lvl - 1 -> start, index = lvl -> next
const LEVEL_STEPS = [0, 200001, 1000000, 5000000, 10000000, 50000000, 100000001, 500000001];

// 🆕 PREMIUM CONSTANTS
const PAL = {
  bg0: '#020617',
  bg1: '#0A0620',
  gold: '#F5C84C',
  emerald: '#10B981',
  ruby: '#EF4444',
  card: 'rgba(8, 6, 20, 0.94)',
};

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
  crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
  money: 'https://img.icons8.com/3d-fluency/512/money-bag.png',
  shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
  star: 'https://img.icons8.com/3d-fluency/512/star.png',
  trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
};

const GENDER_ICONS: Record<string, string> = { Male: 'gender-male', Female: 'gender-female', Other: 'gender-non-binary' };

// 🆕 color helpers
const hex6 = (c: string) => (c && c.length > 7 ? c.slice(0, 7) : c);
const hexToRgb = (hex: string) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const blend = (c1: string, c2: string, t: number) => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return c1;
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
};
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);
const darken = (hex: string, t: number) => blend(hex, '#000000', t);

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
  const [err, setErr] = useState(false);
  if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
  return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating (bob + sway) wrapper
const FloatBox = ({ children, amp = 6, dur = 1800, style }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 🆕 Twinkling sparkle
const Sparkle = ({ x, y, size = 12, color = PAL.gold, delay = 0, dur = 1800 }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
        ]
      }}
    >
      <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
    </Animated.View>
  );
};

// 🆕 Gradient-border glow card
const GlowCard = ({ colors, radius = 26, children, style, innerStyle, glow }: any) => (
  <View
    style={[
      {
        borderRadius: radius,
        backgroundColor: PAL.bg1,
        shadowColor: glow || colors[0],
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 9
      },
      style
    ]}
  >
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
      <View style={[{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: PAL.card }, innerStyle]}>{children}</View>
    </LinearGradient>
  </View>
);

// 🆕 Radar ripple rings
const Ripple = ({ color, size = 220, count = 3 }: any) => {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => {
      const l = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 800),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );
      l.start();
      return l;
    });
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }]
          }}
        />
      ))}
    </>
  );
};

// 🆕 Staggered entrance wrapper
const Reveal = ({ children, delay = 0, style }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay, friction: 7, tension: 50, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 🆕 Section title (icon + text + fading line + diamond + optional right chip)
const SectionTitle = ({ title, icon, color, right }: any) => (
  <View style={styles.sectionRow}>
    <LinearGradient colors={[color, color + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionIcon}>
      <MaterialCommunityIcons name={icon} size={14} color="#0B1026" />
    </LinearGradient>
    <Text style={[styles.sectionText, { color: lighten(color, 0.55) }]}>{title}</Text>
    <LinearGradient colors={[color + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionLine} />
    {right ? right : <View style={[styles.sectionDiamond, { backgroundColor: color, shadowColor: color }]} />}
  </View>
);

// 🆕 Input with focus glow animation (🔧 compact option: age box-ku)
const FancyInput = ({ icon, color, style, children, multiline, compact, ...rest }: any) => {
  const [focused, setFocused] = useState(false);
  const f = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(f, { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [focused]);
  return (
    <Animated.View
      style={[
        styles.inputWrapper,
        compact && { paddingHorizontal: 12 },
        multiline && { alignItems: 'flex-start', paddingTop: 14 },
        {
          borderColor: f.interpolate({ inputRange: [0, 1], outputRange: [color + '44', color] }),
          shadowColor: color,
          shadowOpacity: f.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) as any,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: focused ? 6 : 0
        },
        style
      ]}
    >
      {icon ? (
        <LinearGradient
          colors={[color, color + '77']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.inputIconBubble, compact && { width: 26, height: 26, borderRadius: 9, marginRight: 8 }]}
        >
          <Ionicons name={icon} size={compact ? 14 : 16} color="#FFF" />
        </LinearGradient>
      ) : null}
      <TextInput
        style={[styles.input, { minWidth: 0 }, multiline && { textAlignVertical: 'top', height: '100%' }]}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {children}
    </Animated.View>
  );
};

// 🆕 Tag chip (press scale + gradient when selected)
const TagChip = ({ label, selected, color, color2, baseStyle, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        style={[styles.tagChip, baseStyle, selected && { borderColor: color, shadowColor: color, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 }]}
      >
        {selected && (
          <LinearGradient colors={[color + 'AA', color2 + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {selected && <Ionicons name="checkmark-circle" size={14} color="#FFF" />}
          <Text style={[styles.tagText, selected && { color: '#FFF', fontWeight: 'bold' }]}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🆕 Small stat box (identity card)
const StatBox = ({ icon, label, value, color }: any) => (
  <View style={[styles.statBox, { borderColor: color + '55' }]}>
    <LinearGradient colors={[color + '33', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
    <LinearGradient colors={[color, color + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statIcon}>
      <MaterialCommunityIcons name={icon} size={14} color="#FFF" />
    </LinearGradient>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{label}</Text>
  </View>
);

export default function EditProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState(''); 
  const [priceInRupees, setPriceInRupees] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); 
  const [totalSpent, setTotalSpent] = useState(0); 

  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [genderLocked, setGenderLocked] = useState(false); // 🔧 gender lock (already set aana maatha mudiyaadhu)
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; 

  // 🆕 PREMIUM ANIMATION VALUES
  const spinAnim = useRef(new Animated.Value(0)).current;      // avatar ring + header icon spin
  const pulseAnim = useRef(new Animated.Value(0)).current;     // glow pulse
  const sweepAnim = useRef(new Animated.Value(0)).current;     // shine sweep (banner / save btn)
  const headerAnim = useRef(new Animated.Value(0)).current;    // header entrance
  const levelAnim = useRef(new Animated.Value(0)).current;     // level bar fill
  const complAnim = useRef(new Animated.Value(0)).current;     // completion bar fill
  const particles = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      v: new Animated.Value(0),
      x: ((i * 41) % 100) / 100 * width,
      y: 160 + ((i * 59) % 520),
      size: 2 + (i % 3),
      dur: 6500 + (i % 5) * 1200,
      delay: i * 500,
    }))
  ).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
    ).start();

    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setEmail(user.email || '');
          setProfileImage(data.profilePic || null);
          setCoverImage(data.coverPhoto || null);
          setUserRole(data.role || 'user'); 
          
          // 🔥 SATTI FIX INTEGRATED: Synced Highest Balance check for accurate Level display!
          const userDiamonds = data.totalSpentDiamonds || 0;
          setTotalSpent(userDiamonds); 

          setGender(data.gender || '');
          setGenderLocked(!!data.gender); // 🔧 gender already irundha lock
          setBio(data.bio || '');
          setAge(data.age?.toString() || '');
          setLocation(data.location || '');
          setSelectedExpertise(data.expertiseTags || []);
          setSelectedHobbies(data.hobbies || []);
          
          if (data.pricePerMin) {
            setPriceInRupees((data.pricePerMin / 100).toString());
          }
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // 🆕 Ambient animations (spin, pulse, sweep, particles, header entrance)
  useEffect(() => {
    const spinLoop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    spinLoop.start();
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    pulseLoop.start();
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    sweepLoop.start();

    particles.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    });

    Animated.spring(headerAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();

    return () => {
      spinLoop.stop(); pulseLoop.stop(); sweepLoop.stop();
    };
  }, []);

  const userTier = calculateUserLevel(totalSpent);

  // 🆕 normalized theme colours (8-digit hex bug fix) + text-safe colours
  const T1 = hex6(userTier.color);
  const T2 = hex6(userTier.secondaryColor);
  const TL = lighten(T1, 0.5);
  const TL2 = lighten(T2, 0.5);

  // 🆕 Level progress
  const levelStart = LEVEL_STEPS[userTier.lvl - 1] || 0;
  const levelNext = userTier.lvl < 8 ? LEVEL_STEPS[userTier.lvl] : 0;
  const levelPct = levelNext > 0
    ? Math.max(0, Math.min((totalSpent - levelStart) / (levelNext - levelStart), 1))
    : 1;

  // 🆕 Profile completion
  const complChecks = [
    !!name.trim(), !!profileImage, !!coverImage, !!gender, !!age.trim(), !!location.trim(),
    bio.trim().length > 0, selectedHobbies.length > 0,
    ...(userRole === 'expert' ? [selectedExpertise.length > 0, !!priceInRupees.trim()] : [])
  ];
  const complPct = Math.round((complChecks.filter(Boolean).length / complChecks.length) * 100);

  useEffect(() => {
    Animated.timing(levelAnim, { toValue: levelPct, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [levelPct]);

  useEffect(() => {
    Animated.timing(complAnim, { toValue: complPct / 100, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [complPct]);

  const uploadToCloudinary = async (fileUri: string) => {
    let formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      type: "image/jpeg",
      name: `upload_${user?.uid}_${Date.now()}.jpg`,
    } as any);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = await response.json();
      return data.secure_url; 
    } catch (err) {
      console.error("Cloudinary Error:", err);
      return null;
    }
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to update profile imagery.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.7, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'profile') setProfileImage(result.assets[0].uri);
      else setCoverImage(result.assets[0].uri);
    }
  };

  // 🔧 NEW: camera click -> Change / Remove options added right below pickImage function
  const openImageOptions = (type: 'profile' | 'cover') => {
    const hasImage = type === 'profile' ? !!profileImage : !!coverImage;
    const title = type === 'profile' ? 'Profile Photo' : 'Banner Photo';

    const buttons: any[] = [
      { text: 'Change Photo', onPress: () => pickImage(type) },
    ];
    if (hasImage) {
      buttons.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => {
          if (type === 'profile') setProfileImage(null);
          else setCoverImage(null);
        }
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(title, hasImage ? 'What would you like to do?' : 'Add a photo?', buttons);
  };

  const toggleTag = (tag: string, list: string[], setList: any, maxLimit: number) => {
    if (list.includes(tag)) {
      setList(list.filter(t => t !== tag));
    } else {
      if (list.length >= maxLimit) {
        Alert.alert("Limit Reached", `You can select a maximum of ${maxLimit} tags.`);
        return;
      }
      setList([...list, tag]);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) return Alert.alert("Input Required", "Please provide a valid name.");
    if (!gender) return Alert.alert("Selection Required", "Please select your gender.");

    setUpdating(true);
    try {
      let finalProfileUrl = profileImage;
      let finalCoverUrl = coverImage;

      if (profileImage && profileImage.startsWith('file://')) {
        const url = await uploadToCloudinary(profileImage);
        if (url) finalProfileUrl = url;
      }
      if (coverImage && coverImage.startsWith('file://')) {
        const url = await uploadToCloudinary(coverImage);
        if (url) finalCoverUrl = url;
      }

      const userRef = doc(db, "users", user!.uid);
      let updatePayload: any = {
        name: name,
        profilePic: finalProfileUrl,
        coverPhoto: finalCoverUrl,
        gender: gender,
        bio: bio.trim(),
        age: Number(age) || 0,
        location: location,
        hobbies: selectedHobbies,
        expertiseTags: selectedExpertise,
        updatedAt: new Date().toISOString(),
      };

      if (userRole === 'expert') {
        const finalBeansRate = Number(priceInRupees) * 100;
        let maxLimitBeans = totalSpent >= 30000 ? 1200 : 1000;
        
        if (finalBeansRate < 300 || finalBeansRate > maxLimitBeans) {
            Alert.alert("Rate Limit", `Rate must be set between ₹3 and ₹${maxLimitBeans/100} per minute.`);
            setUpdating(false);
            return;
        }
        updatePayload.userPrice = Number(priceInRupees);
        updatePayload.pricePerMin = finalBeansRate;
        updatePayload.beansPerMin = finalBeansRate;
      }

      await updateDoc(userRef, updatePayload);
      Alert.alert("Success", "Your profile has been updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "CANCEL", style: "cancel" },
      { text: "LOGOUT", style: "destructive", onPress: async () => {
          try { 
              await auth.signOut(); 
              setTimeout(() => {
                  router.replace('/' as any); 
              }, 400); 
          } catch (e) { 
              Alert.alert("Error", "Unable to log out at this moment."); 
          }
      }}
    ]);
  };

  const handleDeleteAccount = () => {
      Alert.alert(
          "PERMANENT ACCOUNT DELETION",
          "This action cannot be undone. All your personal data, chat history, and wallet balance will be permanently erased from our servers in compliance with privacy regulations. Proceed?",
          [
              { text: "CANCEL", style: "cancel" },
              {
                  text: "DELETE FOREVER",
                  style: "destructive",
                  onPress: async () => {
                      if (!user) return;
                      setIsDeleting(true);
                      try {
                          await deleteDoc(doc(db, "users", user.uid));
                          await deleteUser(user);
                          Alert.alert("Deleted", "Your account has been successfully removed.");
                          router.replace('/');
                      } catch (error: any) {
                          if (error.code === 'auth/requires-recent-login') {
                              Alert.alert("Security Re-auth", "Please log out and log in again to verify ownership before account deletion.");
                          } else {
                              Alert.alert("Request Failed", "Could not complete account deletion. Please contact our support team.");
                          }
                      } finally {
                          setIsDeleting(false);
                      }
                  }
              }
          ]
      );
  };

  const orbTranslateY = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30]
  });

  const borderType1 = {
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderLeftColor: T1,
    borderRightColor: T1,
    borderTopColor: T2 + '80',
    borderBottomColor: T2 + '80',
    backgroundColor: 'rgba(5, 5, 5, 0.45)',
  };

  const borderType2 = {
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderLeftColor: T2,
    borderRightColor: T2,
    borderTopColor: T1 + '80',
    borderBottomColor: T1 + '80',
    backgroundColor: 'rgba(5, 5, 5, 0.65)',
  };

  // 🆕 Interpolations
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const sweepXBanner = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
  const sweepXBtn = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });
  const coverTranslate = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, 70], extrapolate: 'clamp' });
  const coverScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.6, 1], extrapolate: 'clamp' });
  const levelBarWidth = levelAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any;
  const complBarWidth = complAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any;

  const maxRateRupees = totalSpent >= 30000 ? 12 : 10;

  if (loading) return (
    <View style={styles.darkLoader}>
      <View style={styles.loaderBox}>
        <Ripple color={T1} size={90} count={2} />
        <ActivityIndicator size="large" color={T1} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: T1, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { top: 520, left: -100, backgroundColor: T2, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 200, left: -90, backgroundColor: T2, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: -60, right: -90, backgroundColor: T1, transform: [{ translateY: orbTranslateY }] }]} />

      {/* 🆕 floating particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: p.y,
            left: p.x,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: [T1, T2, TL, PAL.gold, '#FFFFFF'][i % 5],
            opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
            transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
          }}
        />
      ))}

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }]
            }
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: T1 + '40' }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { textShadowColor: T1 + '99', textShadowRadius: 10 }]}>EDIT PROFILE</Text>
            <BlurView intensity={20} tint="dark" style={[styles.tierBadge, { borderColor: T1 + '30' }]}>
                <Text style={[styles.headerSub, { color: TL }]}>Status: {userTier.label}</Text>
            </BlurView>
            <View style={styles.headerUnderline}>
              <LinearGradient colors={[T1, T2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </View>
          </View>
          <View style={{ flex: 1 }} />
          {/* level badge ("2") */}
          <View style={[styles.levelIconBtn, { backgroundColor: T1 + '1A', borderColor: T1 + '44' }]}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <MaterialCommunityIcons name="shield-star-outline" size={24} color={TL} />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        >
          
          {/* 🔧 UPDATED BANNER PRESS */}
          <TouchableOpacity style={styles.coverWrapper} onPress={() => openImageOptions('cover')} activeOpacity={0.9}>
            <Animated.Image
              source={{ uri: coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926' }}
              style={[styles.coverImg, { transform: [{ translateY: coverTranslate }, { scale: coverScale }] }]}
            />
            <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.25)', 'rgba(2,6,23,0.95)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[styles.coverOverlay, { backgroundColor: T1 + '20' }]} pointerEvents="none">
                <BlurView intensity={30} tint="dark" style={[styles.coverMiniBtn, { borderColor: T1 + '88' }]}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </BlurView>
            </View>
            <Animated.View pointerEvents="none" style={[styles.coverSweep, { transform: [{ translateX: sweepXBanner }, { rotate: '20deg' }] }]}>
              <LinearGradient colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.avatarSection}>
            {/* 🔧 UPDATED PROFILE PHOTO PRESS */}
            <TouchableOpacity onPress={() => openImageOptions('profile')} activeOpacity={0.9}>
              <Animated.View style={[styles.avatarContainer, { transform: [{ translateY: floatAnim }] }]}>
                {/* 🆕 pulse glow + spinning gradient ring */}
                <Animated.View style={[styles.avatarGlow, { backgroundColor: T1, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                <Animated.View style={[styles.avatarSpin, { transform: [{ rotate: spin }] }]}>
                  <LinearGradient colors={[T1, TL, T2, PAL.gold, T1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
                <View style={[styles.avatarBorder, { borderColor: T1, shadowColor: T1 }]}>
                  <Image source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${name}&background=1E293B&color=fff&bold=true` }} style={styles.avatarImg} />
                </View>
                <View style={[styles.cameraBadge, {backgroundColor: T1}]}><Ionicons name="camera" size={16} color="#FFF" /></View>
                <View style={[styles.crownBadge, { backgroundColor: '#0B1026', borderColor: T1 }]}>
                  <MaterialCommunityIcons name="crown" size={13} color={TL} />
                  <Text style={[styles.crownBadgeText, { color: TL }]}>L{userTier.lvl}</Text>
                </View>
                <Sparkle x={-10} y={10} size={12} color={TL} delay={0} />
                <Sparkle x={128} y={0} size={10} color={PAL.gold} delay={600} />
                <Sparkle x={124} y={104} size={11} color={TL2} delay={1100} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>

            {/* 🆕 IDENTITY CARD (tier + level progress + stats + completion) */}
            <Reveal delay={0}>
              <GlowCard colors={[T1, T1 + '22', T2 + '88']} radius={32} glow={T1} style={{ marginTop: 6 }}>
                <View style={styles.identityInner}>
                  <LinearGradient colors={[T1 + '30', 'transparent', T2 + '1F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepXBanner }, { rotate: '20deg' }] }]}>
                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  </Animated.View>

                  <View style={styles.identityTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.identityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{name || 'Your Name'}</Text>
                      <View style={styles.chipRow}>
                        <View style={[styles.chip, { backgroundColor: T1 + '26', borderColor: T1 + '77' }]}>
                          <MaterialCommunityIcons name="star-circle" size={12} color={TL} />
                          <Text style={[styles.chipText, { color: TL }]}>{userTier.label}</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }]}>
                          <MaterialCommunityIcons name={userRole === 'expert' ? 'check-decagram' : 'account'} size={12} color="#CBD5E1" />
                          <Text style={[styles.chipText, { color: '#CBD5E1' }]}>{(userRole || 'user').toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={[styles.identityStatus, { color: TL2 }]}>{userTier.status}</Text>
                    </View>
                    <View style={styles.identityImgBox}>
                      <Animated.View style={[styles.identityImgGlow, { backgroundColor: T1, opacity: glowOpacity }]} />
                      <FloatBox amp={6} dur={1700}>
                        <Img3D uri={IMG.crown} size={78} fallback="crown" color={TL} />
                      </FloatBox>
                    </View>
                  </View>

                  {/* level progress */}
                  <View style={styles.barHeader}>
                    <Text style={styles.barLabel}>LEVEL PROGRESS</Text>
                    <Text style={[styles.barPct, { color: TL }]}>{levelNext > 0 ? `${Math.round(levelPct * 100)}% TO L${userTier.lvl + 1}` : 'MAX RANK'}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <Animated.View style={[styles.barFill, { width: levelBarWidth }]}>
                      <LinearGradient colors={[T1, TL, T2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                      <View style={styles.barCap} />
                    </Animated.View>
                  </View>

                  {/* completion */}
                  <View style={[styles.barHeader, { marginTop: 16 }]}>
                    <Text style={styles.barLabel}>PROFILE COMPLETION</Text>
                    <Text style={[styles.barPct, { color: complPct === 100 ? PAL.emerald : TL }]}>{complPct}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <Animated.View style={[styles.barFill, { width: complBarWidth }]}>
                      <LinearGradient colors={complPct === 100 ? [PAL.emerald, '#34D399'] : [T2, T1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                  </View>

                  <View style={styles.statRow}>
                    <StatBox icon="shield-star" label="LEVEL" value={userTier.lvl} color={T1} />
                    <StatBox icon="diamond-stone" label="SPENT" value={totalSpent.toLocaleString()} color={T2} />
                    <StatBox icon="account-check" label="PROFILE" value={`${complPct}%`} color={PAL.emerald} />
                  </View>
                </View>
              </GlowCard>
            </Reveal>

            {/* PROFILE DETAILS */}
            <Reveal delay={80}>
              <SectionTitle title="PROFILE DETAILS" icon="account-edit" color={T1} />
              <GlowCard colors={[T1, T1 + '22', T2 + '88']} radius={28} glow={T1}>
                <View style={styles.cardInner}>
                  <LinearGradient colors={[T1 + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <FancyInput icon="person-outline" color={T1} value={name} onChangeText={setName} placeholder="Display Name" placeholderTextColor="#64748B" />

                  <View style={styles.rowInputs}>
                      <View style={{ flex: 1.1, marginRight: 10 }}>
                        <FancyInput compact icon="calendar-outline" color={T2} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" maxLength={3} placeholderTextColor="#64748B" />
                      </View>
                      <View style={{ flex: 1.6 }}>
                        <FancyInput compact icon="location-outline" color={T1} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor="#64748B" />
                      </View>
                  </View>
                </View>
              </GlowCard>
            </Reveal>

            {/* GENDER */}
            <Reveal delay={120}>
              <SectionTitle
                title="GENDER"
                icon="gender-male-female"
                color={T2}
                right={genderLocked ? (
                  <View style={[styles.countChip, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <Ionicons name="lock-closed" size={11} color="#CBD5E1" />
                    <Text style={[styles.countChipText, { color: '#CBD5E1' }]}>LOCKED</Text>
                  </View>
                ) : undefined}
              />
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g, index) => {
                  const sel = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      activeOpacity={genderLocked ? 1 : 0.85}
                      style={[
                        styles.genderBtn,
                        index % 2 === 0 ? borderType1 : borderType2,
                        genderLocked && !sel && { opacity: 0.35 },
                        sel && { backgroundColor: T1 + '30', borderColor: T1, borderLeftWidth: 3, shadowColor: T1, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 }
                      ]}
                      onPress={() => {
                        if (genderLocked) {
                          Alert.alert("Gender Locked", "Gender cannot be changed once it has been set.");
                          return;
                        }
                        setGender(g as any);
                      }}
                    >
                      {sel && <LinearGradient colors={[T1 + '77', T2 + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />}
                      <MaterialCommunityIcons name={GENDER_ICONS[g] as any} size={22} color={sel ? '#FFF' : '#64748B'} />
                      <Text style={[styles.genderText, sel && { color: '#FFF', fontWeight: '900' }]}>{g.toUpperCase()}</Text>
                      {genderLocked && sel && (
                        <View style={{ position: 'absolute', top: 6, right: 8 }}>
                          <Ionicons name="lock-closed" size={12} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Reveal>

            {/* BIOGRAPHY */}
            <Reveal delay={160}>
              <SectionTitle
                title="BIOGRAPHY"
                icon="text-account"
                color={T1}
                right={<Text style={[styles.counterText, { color: bio.length >= 140 ? PAL.ruby : TL }]}>{bio.length}/150</Text>}
              />
              <FancyInput
                color={T2}
                multiline
                value={bio}
                onChangeText={setBio}
                maxLength={150}
                placeholder="Tell your story..."
                placeholderTextColor="#64748B"
                style={{ height: 110, borderRadius: 26 }}
              />
            </Reveal>

            {/* INTERESTS */}
            <Reveal delay={200}>
              <SectionTitle
                title="INTERESTS (MAX 5)"
                icon="heart-multiple"
                color={T1}
                right={<View style={[styles.countChip, { backgroundColor: T1 + '26', borderColor: T1 + '77' }]}><Text style={[styles.countChipText, { color: TL }]}>{selectedHobbies.length}/5</Text></View>}
              />
              <View style={styles.tagsContainer}>
                {HOBBIES_TAGS.map((tag, index) => (
                  <TagChip
                    key={tag}
                    label={tag}
                    selected={selectedHobbies.includes(tag)}
                    color={T1}
                    color2={T2}
                    baseStyle={index % 2 === 0 ? borderType1 : borderType2}
                    onPress={() => toggleTag(tag, selectedHobbies, setSelectedHobbies, 5)}
                  />
                ))}
              </View>
            </Reveal>

            {userRole === 'expert' && (
              <>
                <Reveal delay={240}>
                  <SectionTitle
                    title="EXPERT DOMAINS (MAX 3)"
                    icon="medal"
                    color={T2}
                    right={<View style={[styles.countChip, { backgroundColor: T2 + '26', borderColor: T2 + '77' }]}><Text style={[styles.countChipText, { color: TL2 }]}>{selectedExpertise.length}/3</Text></View>}
                  />
                  <View style={styles.tagsContainer}>
                    {EXPERTISE_TAGS.map((tag, index) => (
                      <TagChip
                        key={tag}
                        label={tag}
                        selected={selectedExpertise.includes(tag)}
                        color={T1}
                        color2={T2}
                        baseStyle={index % 2 === 0 ? borderType2 : borderType1}
                        onPress={() => toggleTag(tag, selectedExpertise, setSelectedExpertise, 3)}
                      />
                    ))}
                  </View>
                </Reveal>

                <Reveal delay={280}>
                  <SectionTitle title="CALL RATE (₹ / MIN)" icon="cash-multiple" color={PAL.gold} />
                  <GlowCard colors={[PAL.gold, PAL.gold + '22', T1 + '88']} radius={28} glow={PAL.gold}>
                    <View style={styles.rateInner}>
                      <LinearGradient colors={[PAL.gold + '26', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                      <Sparkle x={70} y={10} size={9} color={PAL.gold} delay={200} />
                      <View style={styles.rateTop}>
                        <View style={styles.rateImgBox}>
                          <Animated.View style={[styles.rateImgGlow, { opacity: glowOpacity }]} />
                          <FloatBox amp={5} dur={1500}>
                            <Img3D uri={IMG.money} size={62} fallback="cash-multiple" color={PAL.gold} />
                          </FloatBox>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.rateTitle, { color: lighten(PAL.gold, 0.4) }]}>YOUR PER MINUTE REWARD</Text>
                          <Text style={styles.rateHint}>Allowed range: ₹3 to ₹{maxRateRupees} per minute</Text>
                        </View>
                      </View>
                      <FancyInput icon="cash-outline" color={PAL.gold} value={priceInRupees} onChangeText={setPriceInRupees} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor="#64748B" />
                    </View>
                  </GlowCard>
                </Reveal>
              </>
            )}

            {/* ACCOUNT INFORMATION */}
            <Reveal delay={320}>
              <SectionTitle title="ACCOUNT INFORMATION" icon="shield-account" color={T2} />
              <View style={[styles.inputWrapper, styles.disabledInput, { borderColor: T2 + '30' }]}>
                <View style={[styles.inputIconBubble, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <Ionicons name="mail-outline" size={16} color="#64748B" />
                </View>
                <Text style={styles.emailText} numberOfLines={1}>{email}</Text>
                <Ionicons name="lock-closed" size={14} color="#64748B" />
              </View>
            </Reveal>

            {/* SAVE */}
            <Reveal delay={360}>
              <TouchableOpacity style={[styles.saveBtn, { shadowColor: T1 }]} onPress={handleUpdate} disabled={updating} activeOpacity={0.9}>
                <LinearGradient colors={[T1, T2]} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                  <Animated.View pointerEvents="none" style={[styles.btnSweep, { transform: [{ translateX: sweepXBtn }, { rotate: '20deg' }] }]}>
                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  </Animated.View>
                  {updating ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <MaterialCommunityIcons name="content-save-check" size={22} color="#FFF" />
                      <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.logoutWrapper, { borderColor: T2 + '50', borderWidth: 2 }]} onPress={handleLogout} activeOpacity={0.8}>
                  <LinearGradient colors={['rgba(255, 0, 50, 0.2)', 'rgba(0,0,0,0.8)']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.logoutBtn}>
                    <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
                    <Text style={styles.logoutLabel}>LOGOUT</Text>
                  </LinearGradient>
              </TouchableOpacity>
            </Reveal>

            <Reveal delay={400}>
              <View style={styles.dangerZoneWrapper}>
                  <View style={styles.dangerIconBox}>
                    <Ripple color="#EF4444" size={54} count={2} />
                    <MaterialCommunityIcons name="alert-octagon" size={30} color="#EF4444" />
                  </View>
                  <Text style={styles.dangerZoneTitle}>ACCOUNT MANAGEMENT</Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={isDeleting} activeOpacity={0.8}>
                      {isDeleting ? <ActivityIndicator color="#EF4444" /> : (
                          <>
                              <Ionicons name="trash-outline" size={20} color="#EF4444" />
                              <Text style={styles.deleteBtnText}>DELETE ACCOUNT</Text>
                          </>
                      )}
                  </TouchableOpacity>
                  <Text style={styles.dangerInfoText}>Requesting account deletion will remove all access to TalkPe, including your credit balance and profile data.</Text>
              </View>
            </Reveal>
            
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  loaderBox: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },

  // header
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  headerTextContainer: { marginLeft: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: 'hidden', alignSelf: 'flex-start' },
  headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  headerUnderline: { width: 120, height: 2, borderRadius: 1, marginTop: 6, overflow: 'hidden' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15, borderWidth: 1 },
  levelIconBtn: { padding: 10, borderRadius: 16, borderWidth: 1 },
  levelBadge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
  levelBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  scrollContent: { paddingBottom: 100 },

  // cover
  coverWrapper: { width: '100%', height: 200, position: 'relative', overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 12 },
  coverMiniBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  coverPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  coverText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  coverSweep: { position: 'absolute', top: -40, bottom: -40, width: 80 },

  // avatar
  avatarSection: { alignItems: 'center', marginTop: -70, zIndex: 20 },
  avatarContainer: { position: 'relative', width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
  avatarGlow: { position: 'absolute', width: 132, height: 132, borderRadius: 66 },
  avatarSpin: { position: 'absolute', width: 136, height: 136, borderRadius: 68, overflow: 'hidden' },
  avatarBorder: { padding: 4, borderRadius: 65, borderWidth: 3, elevation: 20, backgroundColor: '#000' },
  avatarImg: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#0F172A' },
  cameraBadge: { position: 'absolute', bottom: 2, right: 2, padding: 10, borderRadius: 25, borderWidth: 3, borderColor: '#020617' },
  crownBadge: { position: 'absolute', bottom: 4, left: 0, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1.5 },
  crownBadgeText: { fontSize: 10, fontWeight: '900' },

  formContainer: { padding: 22 },

  // identity card
  identityInner: { padding: 20 },
  heroSweep: { position: 'absolute', top: -40, bottom: -40, width: 80 },
  identityTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  identityName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, borderWidth: 1 },
  chipText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
  identityStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
  identityImgBox: { width: 92, height: 92, justifyContent: 'center', alignItems: 'center' },
  identityImgGlow: { position: 'absolute', width: 66, height: 66, borderRadius: 33 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  barLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  barPct: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  barFill: { height: '100%', borderRadius: 6, overflow: 'hidden' },
  barCap: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, backgroundColor: 'rgba(255,255,255,0.85)' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statBox: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.28)', overflow: 'hidden', alignItems: 'flex-start' },
  statIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { color: '#FFF', fontSize: 18, fontWeight: '900', maxWidth: '100%' },
  statLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2, maxWidth: '100%' },

  // section title
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 14 },
  sectionIcon: { width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionText: { fontSize: 12, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
  sectionDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }], shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  counterText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  countChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, borderWidth: 1 },
  countChipText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cardInner: { padding: 16 },

  inputLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginTop: 30 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, paddingHorizontal: 16, height: 62, marginBottom: 14, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.35)' },
  inputIcon: { marginRight: 12 },
  inputIconBubble: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '700' },
  rowInputs: { flexDirection: 'row', width: '100%' },

  // gender
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 5 },
  genderBtn: { flex: 1, height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', gap: 4 },
  genderText: { color: '#64748B', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // tags
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 5 },
  tagChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25, overflow: 'hidden' },
  tagText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },

  // rate
  rateInner: { padding: 16 },
  rateTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rateImgBox: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center' },
  rateImgGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#F5C84C' },
  rateTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  rateHint: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 5 },

  emailText: { flex: 1, color: '#64748B', fontSize: 15, fontWeight: '700' },
  disabledInput: { backgroundColor: 'rgba(0, 0, 0, 0.4)', borderWidth: 1, borderRadius: 30 },

  // save / logout / danger
  saveBtn: { marginTop: 45, borderRadius: 35, overflow: 'hidden', elevation: 15, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  btnGradient: { paddingVertical: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12, overflow: 'hidden' },
  btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 24 },
  btnSweep: { position: 'absolute', top: -30, bottom: -30, width: 70 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  logoutWrapper: { marginHorizontal: 0, marginTop: 25, borderRadius: 35, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 12 },
  logoutLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 2, color: '#EF4444' },
  dangerZoneWrapper: { marginTop: 45, paddingTop: 30, borderTopWidth: 1, borderTopColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center' },
  dangerIconBox: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  dangerZoneTitle: { color: '#EF4444', fontSize: 16, fontWeight: '900', letterSpacing: 4, marginBottom: 30, textAlign: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 22, borderRadius: 30, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', width: '100%' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  dangerInfoText: { color: '#64748B', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 18, paddingHorizontal: 20, lineHeight: 18 }
});