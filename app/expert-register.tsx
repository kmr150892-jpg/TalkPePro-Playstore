import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage'; // 🔥 SATTI UPDATE: Firebase Storage Added
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Keyboard,
    LayoutAnimation,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    UIManager,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 🔥 SATTI UPDATE (NEW): Safe-area insets for bottom button + floating box
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🔥 SATTI UPDATE (NEW): Hard lock for intro video length (5 seconds). 500ms tolerance for camera rounding.
const MAX_VIDEO_SECONDS = 5;
const MAX_VIDEO_MS = MAX_VIDEO_SECONDS * 1000 + 500;

const EXPERTISE_TAGS = [
    "🎤 Singing", "💃 Dancing", "🤝 Community Advice", "💼 Career Counseling", "🌱 Life Coaching", 
    "🧘 Mindfulness & Motivation",  "🧘‍♀️ Yoga", "📿 Meditation", "🍳 Cooking", "🧁 Baking", "📸 Photography", "🎬 Video Editing", 
    "🎨 Graphic Design", "📈 Digital Marketing", "💻 Programming", "📱 App Development", "🌐 Web Development",  
    "📊 Business Strategy", "🗣️ Public Speaking", "🌍 Language Tutor", "🗣️ English Fluency", 
    "📚 Tamil Stories", "😂 Comedy & Mimicry", "🎭 Acting", "💄 Makeup & Styling", "👗 Fashion Advice", "🛋️ Interior Design", "🎮 Gaming Pro", 
    "♟️ Chess Strategy", "🎩 Magic Tricks", "🎸 Guitar Lessons", "🎹 Keyboard Lessons", "✏️ Drawing & Sketching", "🖌️ Painting", 
    "✂️ Crafting", "🐾 Pet Care", "✈️ Travel Planning", "🎉 Event Planning", "📱 Tech Gadgets", "➗ Math Tutoring", 
    "🔬 Science Tutoring", "🏛️ History & Culture", "📖 Storytelling", "✍️ Poetry & Writing"
];

const HOBBIES_TAGS = [
  "🎵 Music Lovers", "✈️ Travel Enthusiast", "🎬 Cinema", "📚 Reading",
  "👨‍🍳 Culinary Arts", "🎮 Gaming", "🎭 Fine Arts",
  "🐾 Animal Welfare", "👗 Fashion Design", "⚽ Sports", "🎪 Performing Arts",
  "🎤 Singing", "💃 Dancing", "✍️ Writing & Poetry", "✂️ DIY & Crafts", 
  "🎨 Sketching & Painting", "🖋️ Calligraphy", "🕊️ Origami", "🌱 Gardening", 
  "💪 Fitness & Wellness", "📱 Tech Gadgets", "🍿 Movie Buff", 
  "🗺️ Travel & Adventure", "🍔 Foodie", "🧘 Yoga & Meditation", 
  "🏋️ Fitness & Gym", "🏃 Running", "🚴 Cycling", "🥋 Martial Arts", 
  "🏊 Swimming", "🥗 Healthy Living", "🧠 Mindfulness", "🤝 Volunteering", 
  "🌍 Environmental Activism", "🐕 Animal Rescue", "♻️ Sustainable Living", 
  "🧥 Fashion & Style", "🛋️ Interior Design", "🏡 Home Decor", 
  "📸 Photography", "🎥 Videography", "🎸 Music & Instruments"
];

const PERSONALITY_TAGS = [
    "😊 Friendly Listener", "🎯 Direct & Honest", "😂 Humorous & Fun", "🧠 Deep Thinker", 
    "🫂 Empathetic", "🔥 Motivational", "🕊️ Spiritual", "🧩 Logical & Practical", 
    "😎 Chill & Relaxed", "⚡ High Energy"
];

// 🔥 SATTI UPDATE: Play Store friendly wording (Loneliness Support -> Friendly Company, Just Venting -> Casual Chat)
const CONNECT_TAGS = [
    "🌱 Life Advice", "💼 Career Guidance", "❤️ Relationship Tips", "🗣️ Casual Chat", 
    "✨ Spiritual Growth", "💪 Daily Motivation", "🎭 Entertainment", "📚 Skill Learning", 
    "🤝 Friendly Company", "🔮 Astrology & Tarot"
];

const LANGUAGES = ["English", "Tamil", "Hindi", "Malayalam", "Kannada", "Telugu"];

// 🔥 SATTI UPDATE: Floating particles for 3D depth background
const PARTICLES = [
    { l: '8%', t: '14%', s: 5, r: 26 },
    { l: '82%', t: '10%', s: 4, r: 34 },
    { l: '66%', t: '30%', s: 6, r: 20 },
    { l: '16%', t: '44%', s: 3, r: 30 },
    { l: '90%', t: '58%', s: 5, r: 24 },
    { l: '34%', t: '72%', s: 4, r: 36 },
    { l: '74%', t: '84%', s: 6, r: 22 },
    { l: '12%', t: '90%', s: 3, r: 28 },
];

// 🔥 SATTI UPDATE: Step hero icons + tips
const STEP_ICONS: any[] = ['account-circle', 'shield-check', 'star-four-points', 'emoticon-happy', 'rocket-launch'];
const STEP_TIPS = [
    "Clear, recent photos build trust fast.",
    "Takes just 30 seconds. Private & secure.",
    "Pick up to 3 skills you love sharing.",
    "A friendly bio gets more connections.",
    "One tap away from joining the community!"
];

// 🔥 SATTI UPDATE (NEW): Step names shown above the progress bar
const STEP_NAMES = ["Profile", "Safety", "Skills", "Vibe", "Review"];

// 🔥 SATTI UPDATE: Config for the floating keyboard input box
const FIELD_CONFIG: any = {
    name: { label: 'Display Name', placeholder: 'e.g. Sarah Smith', max: 40, keyboard: 'default', multiline: false, icon: 'user' },
    age: { label: 'Your Age', placeholder: '25', max: 2, keyboard: 'numeric', multiline: false, icon: 'calendar' },
    location: { label: 'Location', placeholder: 'City, Country', max: 40, keyboard: 'default', multiline: false, icon: 'map-pin' },
    bio: { label: 'A Bit About Me', placeholder: 'Write a small bio about who you are, your vibe, and why people should talk to you...', max: 150, keyboard: 'default', multiline: true, icon: 'edit-3' },
};

// ============================================================
// 🔥 SATTI UPDATE: REUSABLE 3D COMPONENTS
// ============================================================

// 3D press effect (scale + tilt) for every tappable thing
const Press3D = ({ children, onPress, style, disabled }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const tilt = useRef(new Animated.Value(0)).current;

    const pressIn = () => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }),
            Animated.spring(tilt, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }),
        ]).start();
    };
    const pressOut = () => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
            Animated.spring(tilt, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 12 }),
        ]).start();
    };
    const rotateX = tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '10deg'] });

    return (
        <TouchableWithoutFeedback onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
            <Animated.View style={[style, { transform: [{ perspective: 700 }, { rotateX }, { scale }] }]}>
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

// Chip with pop animation when selected
const Chip = ({ label, selected, onPress, gradient, start, end }: any) => {
    const pop = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (selected) {
            pop.setValue(0.82);
            Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
        }
    }, [selected]);

    return (
        <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Press3D onPress={onPress} style={[styles.chip, selected && styles.chipActive]}>
                {selected && <LinearGradient colors={gradient} start={start || { x: 0, y: 0 }} end={end || { x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
            </Press3D>
        </Animated.View>
    );
};

// Glass card with top light reflection
const GlassCard = ({ children, style }: any) => (
    <View style={[styles.formCard, style]}>
        <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.7 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
        {children}
    </View>
);

// Tap field -> opens the floating keyboard input box
const FieldButton = ({ label, icon, value, placeholder, onPress, color, multiline, style }: any) => (
    <View style={[styles.inputGroup, style]}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Press3D onPress={onPress} style={[styles.inputField, multiline && styles.bioField]}>
            {icon ? <Feather name={icon} size={18} color={value ? color : "#64748B"} style={multiline ? { marginTop: 20, marginLeft: 16 } : undefined} /> : null}
            <Text
                style={[styles.input, !value && { color: '#475569' }, multiline && { paddingTop: 20, paddingRight: 16 }]}
                numberOfLines={multiline ? 4 : 1}
            >
                {value || placeholder}
            </Text>
            {!multiline && <Feather name="edit-3" size={14} color="#475569" />}
        </Press3D>
    </View>
);

// 🔥 SATTI UPDATE (NEW): Animated checklist row for the final review step
const CheckRow = ({ label, done, color, delay }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View
            style={[
                styles.checkRow,
                {
                    opacity: anim,
                    transform: [
                        { perspective: 700 },
                        { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                        { rotateY: anim.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
                    ],
                },
            ]}
        >
            <View style={[styles.checkDot, done ? { backgroundColor: color, borderColor: color } : { borderColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name={done ? 'check' : 'minus'} size={12} color={done ? '#fff' : '#64748B'} />
            </View>
            <Text style={[styles.checkRowText, !done && { color: '#64748B' }]}>{label}</Text>
        </Animated.View>
    );
};

export default function RegisterExpert() {
    const [isRestored, setIsRestored] = useState(false);

    const [step, setStep] = useState(1);

    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');
    
    const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
    const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
    const [bio, setBio] = useState('');

    const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
    const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']); 
    
    const [image, setImage] = useState<string | null>(null);

    // 🔥 SATTI UPDATE: New States for Host Verification
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [capturedVideo, setCapturedVideo] = useState<string | null>(null);

    // 🔥 SATTI UPDATE: Floating keyboard input box states + consent
    const [activeField, setActiveField] = useState<string | null>(null);
    const [agreed, setAgreed] = useState(false);

    // 🔥 SATTI UPDATE (NEW): Safe-area insets (bottom button no longer hides behind phone nav buttons)
    const insets = useSafeAreaInsets();

    // 🔥 SATTI UPDATE (NEW): Background upload promises (upload starts right after capture, so SUBMIT is instant)
    const profileUpRef = useRef<Promise<string | null> | null>(null);
    const selfieUpRef = useRef<Promise<string | null> | null>(null);
    const videoUpRef = useRef<Promise<string | null> | null>(null);

    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    // 🔥 SATTI UPDATE: New animation values
    const floatAnim = useRef(new Animated.Value(0)).current;
    const enterAnim = useRef(new Animated.Value(0)).current;
    // 🔥 SATTI UPDATE (NEW): Smooth progress fill + sheet slide-in
    const progressAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadDraft = async () => {
            try {
                const savedData = await AsyncStorage.getItem('@expert_draft');
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.step) setStep(parsed.step);
                    if (parsed.name) setName(parsed.name);
                    if (parsed.age) setAge(parsed.age);
                    if (parsed.gender) setGender(parsed.gender);
                    if (parsed.location) setLocation(parsed.location);
                    if (parsed.selectedPersonality) setSelectedPersonality(parsed.selectedPersonality);
                    if (parsed.selectedConnections) setSelectedConnections(parsed.selectedConnections);
                    if (parsed.bio) setBio(parsed.bio);
                    if (parsed.selectedExpertise) setSelectedExpertise(parsed.selectedExpertise);
                    if (parsed.selectedHobbies) setSelectedHobbies(parsed.selectedHobbies);
                    if (parsed.selectedLanguages) setSelectedLanguages(parsed.selectedLanguages);
                    if (parsed.image) setImage(parsed.image);
                    if (parsed.capturedPhoto) setCapturedPhoto(parsed.capturedPhoto); // 🔥 SATTI UPDATE
                    if (parsed.capturedVideo) setCapturedVideo(parsed.capturedVideo); // 🔥 SATTI UPDATE
                }
            } catch (error) {
                console.log("Error loading draft: ", error);
            } finally {
                setIsRestored(true);
            }
        };
        loadDraft();
    }, []);

    useEffect(() => {
        if (!isRestored) return; 
        const saveDraft = async () => {
            try {
                const dataToSave = {
                    step, name, age, gender, location, selectedPersonality, 
                    selectedConnections, bio, selectedExpertise, 
                    selectedHobbies, selectedLanguages, image, 
                    capturedPhoto, capturedVideo // 🔥 SATTI UPDATE
                };
                await AsyncStorage.setItem('@expert_draft', JSON.stringify(dataToSave));
            } catch (error) {
                console.log("Error saving draft: ", error);
            }
        };
        saveDraft();
    }, [step, name, age, gender, location, selectedPersonality, selectedConnections, bio, selectedExpertise, selectedHobbies, selectedLanguages, image, capturedPhoto, capturedVideo, isRestored]);


    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.linear), useNativeDriver: true })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();

        // 🔥 SATTI UPDATE: Floating 3D loop (hero tile + particles)
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) })
            ])
        ).start();
    }, []);

    // 🔥 SATTI UPDATE: 3D card entrance on every step change
    useEffect(() => {
        enterAnim.setValue(0);
        Animated.spring(enterAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
    }, [step]);

    // 🔥 SATTI UPDATE (NEW): Progress percentage animates smoothly on every step change
    useEffect(() => {
        Animated.timing(progressAnim, { toValue: step / 5, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [step]);

    // 🔥 SATTI UPDATE (NEW): Floating box slides up each time it opens
    useEffect(() => {
        if (activeField) {
            sheetAnim.setValue(0);
            Animated.spring(sheetAnim, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
        }
    }, [activeField]);

    // 🔥 SATTI UPDATE (FIXED): Keyboard listener simplified. The floating box is now anchored at the TOP of the screen
    // (never hidden behind the keyboard, on any phone / any Android mode), so no keyboard height / measuring is needed anymore.
    useEffect(() => {
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const hideSub = Keyboard.addListener(hideEvt, () => {
            setActiveField(null);
        });
        return () => {
            hideSub.remove();
        };
    }, []);

    const openField = (field: string) => setActiveField(field);
    const closeField = () => {
        Keyboard.dismiss();
        setActiveField(null);
    };
    const getFieldValue = (field: string) => {
        if (field === 'name') return name;
        if (field === 'age') return age;
        if (field === 'location') return location;
        if (field === 'bio') return bio;
        return '';
    };
    const handleFieldChange = (field: string, text: string) => {
        if (field === 'name') setName(text);
        else if (field === 'age') setAge(text.replace(/[^0-9]/g, ''));
        else if (field === 'location') setLocation(text);
        else if (field === 'bio') setBio(text);
    };

    // 🔥 SATTI UPDATE (NEW): Cloudinary profile upload as a reusable function (same preset / cloud as before)
    const uploadProfileToCloudinary = async (uri: string): Promise<string | null> => {
        try {
            const cloudName = 'dvwjxeexc'; 
            const uploadPreset = 'TALKPE'; 

            const data = new FormData();
            data.append('file', {
                uri: uri,
                type: 'image/jpeg',
                name: 'profile_upload.jpg',
            } as any);
            data.append('upload_preset', uploadPreset);

            const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                },
            });

            const cloudResult = await cloudResponse.json();
            return cloudResult.secure_url || null;
        } catch (error) {
            console.log("Cloudinary upload error:", error);
            return null;
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Gallery access is required to upload a profile picture.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            // 🔥 SATTI UPDATE (NEW): start uploading in background right away
            profileUpRef.current = uploadProfileToCloudinary(result.assets[0].uri);
        }
    };

    // 🔥 SATTI UPDATE: TAKE LIVE SELFIE FUNCTION 🔥
    const takeLiveSelfie = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "We need camera access for Host verification.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            setCapturedPhoto(result.assets[0].uri);
            // 🔥 SATTI UPDATE (NEW): start uploading in background right away
            selfieUpRef.current = uploadMediaToFirebase(result.assets[0].uri, 'image');
        }
    };

    // 🔥 SATTI UPDATE: RECORD 5s INTRO VIDEO FUNCTION 🔥
    // 🔥 SATTI UPDATE (NEW): HARD 5-SECOND LOCK -> camera auto-stops at 5s (allowsEditing off so no trimmer / extension),
    // and if any phone's camera still returns a longer clip, it is rejected and NOT accepted.
    const recordIntroVideo = async () => {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
            Alert.alert("Permission Denied", "Camera access is required for Video verification.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false,
            videoMaxDuration: MAX_VIDEO_SECONDS, 
            quality: 0.5,
        });
        if (!result.canceled) {
            const asset: any = result.assets[0];
            const durationMs = typeof asset.duration === 'number' ? asset.duration : null;
            if (durationMs !== null && durationMs > MAX_VIDEO_MS) {
                Alert.alert("Video Too Long", `Intro video must be ${MAX_VIDEO_SECONDS} seconds or less. Please record again.`);
                return;
            }
            setCapturedVideo(asset.uri);
            // 🔥 SATTI UPDATE (NEW): start uploading in background right away
            videoUpRef.current = uploadMediaToFirebase(asset.uri, 'video');
        }
    };

    // 🔥 SATTI UPDATE: Local File to Firebase Storage Uploader 🔥
    const uploadMediaToFirebase = async (uri: string, type: 'image' | 'video') => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storage = getStorage();
            const filename = `host_verifications/${type}_${Date.now()}`;
            const storageRef = ref(storage, filename);

            await uploadBytesResumable(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);
            return downloadUrl; 
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            return null;
        }
    };

    const toggleTag = (tag: string, list: string[], setList: any, maxLimit: number = 3) => {
        if (list.includes(tag)) {
            setList(list.filter((t: string) => t !== tag));
        } else {
            if (list.length >= maxLimit) {
                Alert.alert("Maximum Limit", `You can select a maximum of ${maxLimit} tags here.`);
                return;
            }
            setList([...list, tag]);
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!image || !name || !gender) return Alert.alert("Incomplete", "Please add your photo, name, and gender to proceed.");
        } else if (step === 2) {
            if (!age || !location) return Alert.alert("Incomplete", "Please provide your age and location.");
            // 🔥 SATTI UPDATE: Force Live Selfie & Video check
            if (!capturedPhoto || !capturedVideo) return Alert.alert("Verification Required", "Please complete Live Selfie and 5s Video verification to proceed.");
            if (selectedLanguages.length === 0) return Alert.alert("Incomplete", "Please select at least one language you speak.");
            if (parseInt(age) < 18) return Alert.alert("Age Restriction", "You must be 18 years or older to join as a Verified Profile.");
        } else if (step === 3) {
            if (selectedExpertise.length === 0) return Alert.alert("Missing Tags", "Please select at least one core expertise tag.");
        } else if (step === 4) {
            if (selectedPersonality.length === 0) return Alert.alert("Incomplete", "Please select at least one personality trait.");
            if (!bio || bio.length < 10) return Alert.alert("Incomplete Bio", "Please write a short bio about yourself (minimum 10 characters).");
        }

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(step + 1);
    };

    const prevStep = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(step - 1);
    };

    const cancelAndGoToLogin = async () => {
        Alert.alert(
            "Cancel Registration?",
            "Are you sure you want to cancel your application and sign out?",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Cancel", 
                    style: "destructive",
                    onPress: async () => {
                        if (auth.currentUser) {
                            try {
                                await updateDoc(doc(db, "users", auth.currentUser.uid), { 
                                    registrationInProgress: false 
                                });
                                await AsyncStorage.removeItem('@expert_draft');
                                await auth.signOut();
                            } catch (error) {
                                console.log("Logout Error:", error);
                            }
                        } else {
                            router.replace('/' as any);
                        }
                    }
                }
            ]
        );
    };

    const handleRegistration = async () => {
        // 🔥 SATTI UPDATE: Consent check (Play Store data-safety friendly)
        if (!agreed) {
            return Alert.alert("Consent Needed", "Please accept the Terms of Use & Privacy Policy to submit your application.");
        }

        setUploading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Authentication Error", "Session expired. Please sign in again.");
                setUploading(false);
                return;
            }

            // 🔥 SATTI UPDATE (NEW): FAST SUBMIT.
            // Profile pic (Cloudinary), live selfie & intro video (Firebase Storage) were already uploading in the background
            // from the moment they were captured. Here we just wait for them (all 3 in PARALLEL, not one-by-one).
            // If a background upload failed or the draft was restored after an app restart, it is uploaded now as a fallback.
            const [photoURL, liveSelfieUrl, introVideoUrl] = await Promise.all([
                (async () => (await profileUpRef.current) || uploadProfileToCloudinary(image as string))(),
                (async () => (await selfieUpRef.current) || uploadMediaToFirebase(capturedPhoto as string, 'image'))(),
                (async () => (await videoUpRef.current) || uploadMediaToFirebase(capturedVideo as string, 'video'))(),
            ]);

            if (!photoURL) throw new Error("Image upload failed.");

            await setDoc(doc(db, "users", user.uid), {
                displayName: name,
                name: name, 
                age: age,
                gender: gender,
                location: location,
                photoURL: photoURL, 
                profilePic: photoURL, 
                
                // 🔥 SATTI UPDATE: Save Firebase URLs to Firestore
                liveSelfie: liveSelfieUrl || "",
                introVideo: introVideoUrl || "",

                languages: selectedLanguages, 
                personalityTraits: selectedPersonality,
                connectWithMeFor: selectedConnections,
                bio: bio.trim(),
                
                expertiseTags: selectedExpertise,
                hobbies: selectedHobbies,
                
                todayMinutes: 0,            
                totalMinutes: 0,
                totalCalls: 0,
                walletBalance: 0,
                totalBeansEarned: 0,
                totalWithdrawnRs: 0,
                longestCallDuration: 0,    
                pendingACTIVITY_REWARD: 0,
                lastCallFrom: "Waiting...",
                topCallerName: "No Community Activity", 
                
                pricePerMin: 1000, 
                userPrice: 2000,
                
                status: "Pending",     
                role: "user",          
                isApplying: true,      
                isVerified: false,     
                appliedAt: serverTimestamp(), 
                
                currentLevel: 0,
                levelTitle: "BEGINNER"
            }, { merge: true }); 

            await AsyncStorage.removeItem('@expert_draft');

            setUploading(false);
            
            Alert.alert("Application Received", "Thank you! Your profile is under review by our community team.", [
                { text: "Got it", onPress: () => router.replace('/waiting-approval' as any) } 
            ]);

        } catch (error: any) {
            setUploading(false);
            Alert.alert("Submission Failed", "Could not submit your application. Please check your network and try again.");
        }
    };

    const brandGradient = gender === 'Female' ? ['#FF0080', '#FF8C00'] as const : ['#0EA5E9', '#3B82F6'] as const;
    const fallbackGradient = ['#8B5CF6', '#D946EF'] as const; 
    const activeGradient = gender ? brandGradient : fallbackGradient;
    const darkBg = '#030014'; 

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbTranslateX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });

    const rotateAnim = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const reverseRotateAnim = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    // 🔥 SATTI UPDATE: 3D interpolations
    const heroRotateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['-22deg', '22deg'] });
    const heroRotateX = floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['10deg', '-10deg'] });
    const heroFloatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

    const enterStyle = {
        opacity: enterAnim,
        transform: [
            { perspective: 1000 },
            { translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
            { rotateX: enterAnim.interpolate({ inputRange: [0, 1], outputRange: ['14deg', '0deg'] }) },
            { scale: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
    };

    // 🔥 SATTI UPDATE (NEW): Review checklist data
    const checklist = [
        { label: 'Profile photo added', done: !!image },
        { label: 'Live selfie & 5s video verified', done: !!capturedPhoto && !!capturedVideo },
        { label: 'Skills selected', done: selectedExpertise.length > 0 },
        { label: 'Personality & bio ready', done: selectedPersonality.length > 0 && bio.length >= 10 },
    ];

    if (!isRestored) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: darkBg }]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    // 🔥 SATTI UPDATE: Floating keyboard input box
    // 🔥 SATTI UPDATE (FIXED): Box is anchored at the TOP (below status bar), keyboard is at the bottom -> typing text + DONE button are always visible.
    const renderFloatingInput = () => {
        if (!activeField) return null;
        const cfg = FIELD_CONFIG[activeField];
        const value = getFieldValue(activeField);

        return (
            <View style={styles.sheetOverlay} pointerEvents="box-none">
                <TouchableWithoutFeedback onPress={closeField}>
                    <View style={styles.sheetBackdrop} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            top: insets.top + 70,
                            opacity: sheetAnim,
                            transform: [
                                { perspective: 900 },
                                { translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                                { rotateX: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '0deg'] }) },
                            ],
                        },
                    ]}
                >
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient
                        colors={[activeGradient[0], activeGradient[1]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sheetAccent}
                    />
                    <View style={styles.sheetHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Feather name={cfg.icon} size={16} color={activeGradient[0]} />
                            <Text style={styles.sheetLabel}>{cfg.label}</Text>
                        </View>
                        <Text style={styles.limitBadge}>{value.length}/{cfg.max}</Text>
                    </View>

                    <View style={[styles.sheetInputWrap, cfg.multiline && { height: 110, alignItems: 'flex-start' }]}>
                        <TextInput
                            style={[styles.sheetInput, cfg.multiline && { textAlignVertical: 'top', paddingTop: 14 }]}
                            placeholder={cfg.placeholder}
                            placeholderTextColor="#475569"
                            value={value}
                            onChangeText={(t) => handleFieldChange(activeField, t)}
                            autoFocus
                            multiline={cfg.multiline}
                            maxLength={cfg.max}
                            keyboardType={cfg.keyboard}
                            returnKeyType={cfg.multiline ? 'default' : 'done'}
                            onSubmitEditing={cfg.multiline ? undefined : closeField}
                            blurOnSubmit={!cfg.multiline}
                        />
                    </View>

                    <TouchableOpacity style={styles.sheetDoneBtn} onPress={closeField} activeOpacity={0.85}>
                        <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sheetDoneInner}>
                            <Text style={styles.sheetDoneText}>DONE</Text>
                            <Feather name="check" size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    // 🔥 SATTI UPDATE (NEW): KeyboardAvoidingView removed -> it was pushing the whole screen / footer and fighting the floating box.
    // The floating box now handles the keyboard by itself, so Continue stays in a fixed, visible place.
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: darkBg }} />
                <Animated.View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: activeGradient[0], transform: [{ translateY: orbTranslateY }, { translateX: orbTranslateX }] }]} />
                <Animated.View style={[styles.glowOrb, { bottom: -100, left: -80, backgroundColor: activeGradient[1], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }, { translateX: Animated.multiply(orbTranslateX, -1) }] }]} />
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.noiseOverlay} />

                {/* 🔥 SATTI UPDATE: Floating 3D depth particles */}
                {PARTICLES.map((p, i) => (
                    <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: p.l as any,
                            top: p.t as any,
                            width: p.s,
                            height: p.s,
                            borderRadius: p.s / 2,
                            backgroundColor: i % 2 === 0 ? activeGradient[0] : activeGradient[1],
                            opacity: 0.55,
                            transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 === 0 ? -p.r : p.r] }) }],
                        }}
                    />
                ))}
            </View>

            {/* 🔥 SATTI UPDATE (NEW): Step name + animated % above the segmented progress */}
            <View style={styles.progressTopRow}>
                <Text style={styles.progressStepName}>{STEP_NAMES[step - 1]}</Text>
                <Text style={[styles.progressPercent, { color: activeGradient[0] }]}>{step * 20}% done</Text>
            </View>

            {/* 🔥 SATTI UPDATE: Segmented glowing progress */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressSeg,
                            i <= step && { backgroundColor: activeGradient[0] },
                            i === step && { shadowColor: activeGradient[0], shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
                        ]}
                    />
                ))}
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollPadding, { paddingBottom: 150 + insets.bottom }]} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step < 5 && (
                    <View style={styles.header}>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <LinearGradient colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)']} style={styles.stepBadge}>
                                    <Text style={styles.stepBadgeText}>STEP {step} OF 5</Text>
                                </LinearGradient>
                                
                                <Text style={styles.title}>
                                    {step === 1 && "Let's Build Your Profile"}
                                    {step === 2 && "Quick Safety Check"}
                                    {step === 3 && "What Are You Great At?"}
                                    {step === 4 && "Show Your Vibe"}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {step === 1 && "Add a clear photo and your real name to get started."}
                                    {step === 2 && "A short check keeps our community real and safe for everyone."}
                                    {step === 3 && "Select the skills you love sharing with others."}
                                    {step === 4 && "Let people know who you are and what you enjoy."}
                                </Text>
                            </View>

                            {/* 🔥 SATTI UPDATE: Floating 3D hero tile */}
                            <Animated.View
                                style={{
                                    transform: [
                                        { perspective: 600 },
                                        { translateY: heroFloatY },
                                        { rotateY: heroRotateY },
                                        { rotateX: heroRotateX },
                                    ],
                                }}
                            >
                                <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroTile}>
                                    <MaterialCommunityIcons name={STEP_ICONS[step - 1]} size={34} color="#fff" />
                                </LinearGradient>
                            </Animated.View>
                        </View>

                        <View style={styles.tipPill}>
                            <Text style={styles.tipText}>💡 {STEP_TIPS[step - 1]}</Text>
                        </View>
                    </View>
                )}

                <Animated.View style={[styles.formContainer, enterStyle]}>
                    {step === 1 && (
                        <View style={styles.stepWrapper}>
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.9}>
                                <View style={styles.imageContainer}>
                                    <Animated.View style={[styles.avatarBaseGlow, { transform: [{ scale: pulseAnim }], backgroundColor: activeGradient[0] }]} />
                                    <Animated.View style={[styles.rotatingSolidRing, { borderColor: activeGradient[1], transform: [{ rotate: rotateAnim }] }]} />
                                    <Animated.View style={[styles.reverseRotatingThinRing, { borderTopColor: activeGradient[0], borderBottomColor: activeGradient[0], transform: [{ rotate: reverseRotateAnim }] }]} />
                                    
                                    <Animated.View style={[styles.imageWrapper, { transform: [{ perspective: 800 }, { rotateY: heroRotateY }, { rotateX: heroRotateX }] }]}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={styles.selectedImage} />
                                        ) : (
                                            <View style={styles.placeholderBox}>
                                                <Ionicons name="camera" size={40} color="rgba(255,255,255,0.4)" />
                                                <Text style={styles.placeholderText}>UPLOAD PHOTO</Text>
                                            </View>
                                        )}
                                    </Animated.View>
                                    <LinearGradient colors={activeGradient} style={styles.editIconBadge}>
                                         <Feather name={image ? "edit-2" : "plus"} size={18} color="#fff" />
                                    </LinearGradient>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.photoHint}>Tap to add a clear, recent photo of yourself</Text>

                            <GlassCard>
                                <Text style={styles.sectionTitle}>Account Setup</Text>
                                <View style={styles.genderRow}>
                                    {['Male', 'Female'].map((item) => {
                                        const isSelected = gender === item;
                                        return (
                                            <Press3D 
                                                key={item} 
                                                style={[styles.genderCard, isSelected && styles.genderCardActive]} 
                                                onPress={() => setGender(item)}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} style={StyleSheet.absoluteFill} />}
                                                <View style={styles.genderContent}>
                                                    <Ionicons name={item === 'Female' ? 'female' : 'male'} size={20} color={isSelected ? '#FFF' : '#64748B'} />
                                                    <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>{item}</Text>
                                                </View>
                                            </Press3D>
                                        );
                                    })}
                                </View>

                                {/* 🔥 SATTI UPDATE: Tap -> floating input box above keyboard */}
                                <FieldButton
                                    label="Display Name"
                                    icon="user"
                                    value={name}
                                    placeholder="e.g. Sarah Smith"
                                    color={activeGradient[0]}
                                    onPress={() => openField('name')}
                                />
                            </GlassCard>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepWrapper}>
                            <GlassCard>
                                <View style={styles.ageVerificationBox}>
                                    <View style={[styles.iconWrapperGlow, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                        <MaterialCommunityIcons name="shield-check" size={24} color="#EF4444" />
                                    </View>
                                    <Text style={styles.ageTitle}>18+ Verification Required</Text>
                                    <Text style={styles.ageDesc}>You must be at least 18 years old to join as a Community Host.</Text>
                                </View>

                                <View style={styles.rowInputs}>
                                    <FieldButton
                                        style={{ flex: 0.35 }}
                                        label="Age"
                                        value={age}
                                        placeholder="25"
                                        color={activeGradient[0]}
                                        onPress={() => openField('age')}
                                    />
                                    <FieldButton
                                        style={{ flex: 0.65 }}
                                        label="Location"
                                        icon="map-pin"
                                        value={location}
                                        placeholder="City, Country"
                                        color={activeGradient[0]}
                                        onPress={() => openField('location')}
                                    />
                                </View>
                            </GlassCard>

                            {/* 🔥 SATTI UPDATE: NEW HOST VERIFICATION UI (ADDED IN STEP 2) 🔥 */}
                            <GlassCard style={{ marginTop: 20 }}>
                                <Text style={styles.sectionTitle}>Identity Verification</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginBottom: 15, lineHeight: 16 }}>
                                    To keep our community safe, please take a live selfie and a 5-second video (e.g., just say "Hi"). These are used only to confirm you are a real person and are never shown publicly.
                                </Text>

                                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 25, marginBottom: 10 }}>
                                    {/* 🔹 PHOTO CIRCLE 🔹 */}
                                    <View style={{ alignItems: 'center' }}>
                                        <Press3D onPress={takeLiveSelfie} style={[styles.verifyCircle, { borderColor: capturedPhoto ? '#02fa0a' : activeGradient[0] }]}>
                                            {capturedPhoto ? (
                                                <Image source={{ uri: capturedPhoto }} style={styles.verifyImage} />
                                            ) : (
                                                <Ionicons name="camera" size={32} color={activeGradient[0]} />
                                            )}
                                        </Press3D>
                                        <Text style={styles.verifyLabelText}>Live Selfie</Text>
                                        <Text style={[styles.verifyStatus, capturedPhoto && { color: '#02fa0a' }]}>{capturedPhoto ? 'Done ✓' : 'Tap to capture'}</Text>
                                    </View>

                                    {/* 🔹 VIDEO CIRCLE 🔹 */}
                                    <View style={{ alignItems: 'center' }}>
                                        <Press3D onPress={recordIntroVideo} style={[styles.verifyCircle, { borderColor: capturedVideo ? '#02fa0a' : activeGradient[1] }]}>
                                            {capturedVideo ? (
                                                <View style={[styles.verifyImage, { backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Ionicons name="checkmark-circle" size={32} color="#02fa0a" />
                                                </View>
                                            ) : (
                                                <Ionicons name="videocam" size={32} color={activeGradient[1]} />
                                            )}
                                        </Press3D>
                                        <Text style={styles.verifyLabelText}>5s Intro Video</Text>
                                        <Text style={[styles.verifyStatus, capturedVideo && { color: '#02fa0a' }]}>{capturedVideo ? 'Done ✓' : 'Tap to record'}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                            {/* 🔥 SATTI UPDATE END 🔥 */}

                            <GlassCard style={{ marginTop: 20 }}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Languages You Speak</Text>
                                    <Text style={styles.limitBadge}>{selectedLanguages.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {LANGUAGES.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            selected={selectedLanguages.includes(tag)}
                                            gradient={activeGradient}
                                            onPress={() => toggleTag(tag, selectedLanguages, setSelectedLanguages, 3)}
                                        />
                                    ))}
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.stepWrapper}>
                            <GlassCard>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Core Expertise</Text>
                                    <Text style={styles.limitBadge}>{selectedExpertise.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {EXPERTISE_TAGS.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            selected={selectedExpertise.includes(tag)}
                                            gradient={activeGradient}
                                            onPress={() => toggleTag(tag, selectedExpertise, setSelectedExpertise, 3)}
                                        />
                                    ))}
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {step === 4 && (
                        <View style={styles.stepWrapper}>
                            <GlassCard>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>My Personality</Text>
                                    <Text style={styles.limitBadge}>{selectedPersonality.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {PERSONALITY_TAGS.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            selected={selectedPersonality.includes(tag)}
                                            gradient={activeGradient}
                                            onPress={() => toggleTag(tag, selectedPersonality, setSelectedPersonality, 3)}
                                        />
                                    ))}
                                </View>
                            </GlassCard>

                            <GlassCard style={{ marginTop: 20 }}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Other Interests</Text>
                                    <Text style={styles.limitBadge}>{selectedHobbies.length}/5</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {HOBBIES_TAGS.map((tag) => (
                                        <Chip
                                            key={tag}
                                            label={tag}
                                            selected={selectedHobbies.includes(tag)}
                                            gradient={activeGradient}
                                            start={{ x: 1, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            onPress={() => toggleTag(tag, selectedHobbies, setSelectedHobbies, 5)}
                                        />
                                    ))}
                                </View>
                            </GlassCard>

                            <GlassCard style={{ marginTop: 20 }}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>A Bit About Me</Text>
                                    <Text style={styles.limitBadge}>{bio.length}/150</Text>
                                </View>
                                {/* 🔥 SATTI UPDATE: Bio also opens the floating keyboard box */}
                                <FieldButton
                                    label=""
                                    icon="edit-3"
                                    value={bio}
                                    placeholder="Write a small bio about who you are, your vibe, and why people should talk to you..."
                                    color={activeGradient[0]}
                                    multiline
                                    style={{ marginBottom: 0 }}
                                    onPress={() => openField('bio')}
                                />
                            </GlassCard>
                        </View>
                    )}

                    {step === 5 && (
                        <Animated.View style={styles.stepWrapper}>
                            <GlassCard style={styles.finalCard}>
                                <Animated.View style={[styles.shieldIconWrap, { transform: [{ perspective: 700 }, { scale: pulseAnim }, { rotateY: heroRotateY }] }]}>
                                    <LinearGradient colors={activeGradient} style={styles.shieldGradient}>
                                        <MaterialCommunityIcons name="shield-star" size={40} color="#FFF" />
                                    </LinearGradient>
                                </Animated.View>
                                
                                <Text style={styles.finalTitle}>You're All Set, {name || 'Creator'}!</Text>
                                <Text style={styles.finalSub}>Your application to join the <Text style={{color: activeGradient[0], fontWeight:'800'}}>Community Hosts Network</Text> is ready to submit.</Text>

                                {/* 🔥 SATTI UPDATE: Profile preview card */}
                                <View style={styles.previewCard}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.previewImg} />
                                    ) : (
                                        <View style={[styles.previewImg, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.previewName} numberOfLines={1}>{name}</Text>
                                        <Text style={styles.previewMeta} numberOfLines={1}>{age ? `${age} yrs` : ''}{age && location ? '  •  ' : ''}{location}</Text>
                                        <Text style={styles.previewTags} numberOfLines={1}>{selectedExpertise.join('  ')}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="check-decagram" size={22} color={activeGradient[0]} />
                                </View>

                                {/* 🔥 SATTI UPDATE (NEW): Animated readiness checklist */}
                                <View style={styles.checklistBox}>
                                    {checklist.map((c, idx) => (
                                        <CheckRow key={c.label} label={c.label} done={c.done} color={activeGradient[0]} delay={250 + idx * 160} />
                                    ))}
                                </View>
                                
                                <View style={styles.termsBox}>
                                    <View style={styles.termsIcon}>
                                        <Feather name="check-circle" size={18} color={activeGradient[0]} />
                                    </View>
                                    <Text style={styles.termsText}>
                                        We value your privacy and maintain a safe environment. Your verification selfie and video are used only to confirm you are a real person and are never shown publicly. Our team will review your details to ensure community standards.
                                    </Text>
                                </View>

                                {/* 🔥 SATTI UPDATE: Consent checkbox */}
                                <Press3D onPress={() => setAgreed(!agreed)} style={styles.consentRow}>
                                    <View style={[styles.checkbox, agreed && { backgroundColor: activeGradient[0], borderColor: activeGradient[0] }]}>
                                        {agreed && <Feather name="check" size={14} color="#fff" />}
                                    </View>
                                    <Text style={styles.consentText}>I agree to the Terms of Use & Privacy Policy</Text>
                                </Press3D>
                            </GlassCard>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* 🔥 SATTI UPDATE (FIXED): Footer lifts above phone navigation buttons using safe-area bottom inset */}
            <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={styles.footerRow}>
                    <TouchableOpacity 
                        style={styles.backBtn} 
                        onPress={step === 1 ? cancelAndGoToLogin : prevStep}
                    >
                        <Feather name={step === 1 ? "log-out" : "arrow-left"} size={24} color="#F8FAFC" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.submitBtn} 
                        onPress={step === 5 ? handleRegistration : nextStep} 
                        disabled={uploading}
                        activeOpacity={0.9}
                    >
                        {step === 5 && <Animated.View style={[styles.submitGlow, { transform: [{ scale: pulseAnim }], backgroundColor: activeGradient[0] }]} />}
                        <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitInner}>
                            {uploading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.submitText}>{step === 5 ? "SUBMIT FOR REVIEW" : "CONTINUE"}</Text>
                                    <Feather name={step === 5 ? "check-circle" : "arrow-right"} size={20} color="#fff" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 🔥 SATTI UPDATE: Floating keyboard input box (always on top) */}
            {renderFloatingInput()}

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030014' },
    glowOrb: { position: 'absolute', width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, opacity: 0.18 },
    noiseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)', opacity: 0.5 },

    progressContainer: { width: '100%', height: 4, flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 8 },
    progressBar: { height: '100%', borderRadius: 2 },
    // 🔥 SATTI UPDATE: segmented progress (container is overridden below to hold 5 segments)
    progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },

    // 🔥 SATTI UPDATE (NEW): progress label row (safe top margin handled here)
    progressTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, marginTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 6 },
    progressStepName: { color: '#E2E8F0', fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
    progressPercent: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

    scrollPadding: { paddingBottom: 150, paddingTop: 20, paddingHorizontal: 20 },
    
    header: { alignItems: 'flex-start', marginBottom: 25, marginTop: 5 },
    headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    heroTile: { width: 74, height: 74, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 14 },
    tipPill: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
    stepBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', alignSelf: 'flex-start' },
    stepBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    title: { color: '#F8FAFC', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 6, lineHeight: 20 },
    
    formContainer: { width: '100%' },
    stepWrapper: { width: '100%' },

    formCard: { backgroundColor: 'rgba(15, 23, 42, 0.45)', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 6 },
    sectionTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', letterSpacing: 0.5, marginBottom: 18 },

    finalCard: { alignItems: 'center', paddingVertical: 45, paddingHorizontal: 25, backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', marginTop: 25 },
    shieldIconWrap: { padding: 10, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    shieldGradient: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    finalTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 14, textAlign: 'center', letterSpacing: -0.5 },
    finalSub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 25, fontWeight: '500', paddingHorizontal: 5 },
    termsBox: { flexDirection: 'row', padding: 20, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-start', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    termsIcon: { marginTop: 2 },
    termsText: { flex: 1, color: '#94A3B8', fontSize: 12, lineHeight: 20, fontWeight: '500' },

    imagePicker: { alignSelf: 'center', marginBottom: 35, marginTop: 20 },
    imageContainer: { width: 140, height: 140, position: 'relative' },
    avatarBaseGlow: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderRadius: 100, opacity: 0.25, shadowColor: '#FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15 },
    
    rotatingSolidRing: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 100, borderWidth: 2, borderStyle: 'solid', opacity: 0.5 },
    reverseRotatingThinRing: { position: 'absolute', top: -14, left: -14, right: -14, bottom: -14, borderRadius: 100, borderWidth: 1.5, borderLeftColor: 'transparent', borderRightColor: 'transparent', opacity: 0.9 },
    
    imageWrapper: { width: '100%', height: '100%', borderRadius: 70, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
    placeholderBox: { flex: 1, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 5, letterSpacing: 1 },
    selectedImage: { flex: 1, width: '100%', height: '100%' },
    editIconBadge: { position: 'absolute', bottom: -5, right: 0, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#030014', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5 },
    photoHint: { color: '#64748B', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: -18, marginBottom: 24 },

    ageVerificationBox: { flexDirection: 'column', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 25, alignItems: 'center' },
    iconWrapperGlow: { padding: 12, borderRadius: 20, marginBottom: 5 },
    ageTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginBottom: 5 },
    ageDesc: { color: '#94A3B8', fontSize: 12, textAlign: 'center', lineHeight: 18 },

    inputGroup: { marginBottom: 18 },
    rowInputs: { flexDirection: 'row', gap: 15 },
    inputLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputField: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 60, paddingHorizontal: 15 },
    input: { flex: 1, color: '#F8FAFC', fontSize: 15, fontWeight: '600', marginLeft: 10 },
    
    bioField: { height: 130, paddingHorizontal: 0, alignItems: 'flex-start' },
    bioInput: { flex: 1, width: '100%', color: '#F8FAFC', fontSize: 14, paddingHorizontal: 18, paddingTop: 18, textAlignVertical: 'top', lineHeight: 22 },
    
    genderRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    genderCard: { flex: 1, height: 65, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    genderCardActive: { borderColor: 'transparent', elevation: 5 },
    genderContent: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    genderText: { color: '#94A3B8', fontWeight: '700', fontSize: 14 },
    genderTextActive: { color: '#FFF', fontWeight: '800' },
    
    tagSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    limitBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    chipActive: { borderColor: 'transparent', elevation: 4 }, 
    chipText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#FFF', fontWeight: '800' },
    
    stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 45 : 35, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    submitBtn: { flex: 1, position: 'relative' },
    submitGlow: { position: 'absolute', top: 5, left: 10, right: 10, bottom: -5, borderRadius: 20, opacity: 0.5, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 10 },
    submitInner: { flexDirection: 'row', height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },

    // 🔥 SATTI UPDATE: NEW STYLES FOR CAMERA VERIFICATION 🔥
    verifyCircle: { width: 75, height: 75, borderRadius: 37.5, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
    verifyImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    verifyLabelText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    verifyStatus: { color: '#64748B', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 2 },

    // 🔥 SATTI UPDATE: FLOATING KEYBOARD INPUT BOX STYLES 🔥
    sheetOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100 },
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    // 🔥 SATTI UPDATE (FIXED): sheet is now a floating card anchored from the top (top value is set inline using safe-area inset)
    sheet: { position: 'absolute', left: 16, right: 16, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, borderRadius: 30, backgroundColor: 'rgba(10, 12, 30, 0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
    sheetAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sheetLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
    sheetInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', height: 58, paddingHorizontal: 16 },
    sheetInput: { flex: 1, color: '#F8FAFC', fontSize: 16, fontWeight: '600', lineHeight: 22 },
    sheetDoneBtn: { marginTop: 14 },
    sheetDoneInner: { flexDirection: 'row', height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
    sheetDoneText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },

    // 🔥 SATTI UPDATE: PROFILE PREVIEW + CONSENT STYLES 🔥
    previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
    previewImg: { width: 54, height: 54, borderRadius: 27 },
    previewName: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
    previewMeta: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 2 },
    previewTags: { color: '#CBD5E1', fontSize: 11, marginTop: 3 },
    consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, alignSelf: 'flex-start' },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
    consentText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700', flexShrink: 1 },

    // 🔥 SATTI UPDATE (NEW): REVIEW CHECKLIST STYLES 🔥
    checklistBox: { width: '100%', padding: 16, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 16, gap: 12 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    checkRowText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700', flexShrink: 1 }
});
