import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// 🔥 SATTI FIX: Replaced expo-video with expo-av for better compatibility 🔥
import { useVideoPlayer, VideoView } from 'expo-video';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    KeyboardAvoidingView,
    Modal,
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
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false); // 🔥 SATTI NEW: Modal State for Play Store Safe Warning
    const [teaserVideo, setTeaserVideo] = useState<string | null>(null);
    const videoRef = useRef<any>(null); 

    const player = useVideoPlayer(teaserVideo || null, (player) => {
        player.loop = true;
    });

    // 🔥 Animations
    const shimmerAnim = useRef(new Animated.Value(0)).current;

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
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                {/* 🛡️ HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.primary + '40', borderWidth: 1 }]}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Premium Spotlight</Text>
                        <Text style={[styles.headerSub, { color: theme.primary }]}>Monetize your unique skills</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    
                    {/* 🎬 SKILL SHOWCASE VIDEO UPLOAD (LARGE ACTION CARDS) */}
                    <View style={styles.marginSection}>
                        <Text style={[styles.sectionTitle, { color: theme.primary }]}>30-SEC SKILL SHOWCASE</Text>
                        
                        <View style={styles.actionCardRow}>
                            {/* UPLOAD CARD 🔥 Changed onPress to handleUploadClick 🔥 */}
                            <TouchableOpacity 
                                onPress={handleUploadClick} 
                                disabled={teaserUploading}
                                style={[styles.largeActionCard, borderType2]}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.primary + '20' }]}>
                                    {teaserUploading ? <ActivityIndicator color={theme.primary} /> : <Ionicons name="cloud-upload" size={32} color={theme.primary} />}
                                </View>
                                <Text style={styles.actionCardTitle}>
                                    {teaserVideo ? "UPDATE\nSHOWCASE" : "UPLOAD\nSHOWCASE"}
                                </Text>
                                <Text style={styles.actionCardSub}>Max 30 seconds</Text>
                            </TouchableOpacity>

                            {/* PREVIEW CARD */}
                            <TouchableOpacity 
                                onPress={() => {
                                    if(teaserVideo) setShowPreviewModal(true);
                                    else Alert.alert("No Video", "Upload a showcase video first.");
                                }}
                                style={[styles.largeActionCard, borderType2, !teaserVideo && { opacity: 0.5 }]}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: theme.secondary + '20' }]}>
                                    <Ionicons name="play" size={32} color={theme.secondary} />
                                </View>
                                <Text style={styles.actionCardTitle}>PREVIEW</Text>
                                <Text style={styles.actionCardSub}>Check quality</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* CREATOR TIP */}
                        <View style={styles.creatorTipBox}>
                            <MaterialCommunityIcons name="lightbulb-on" size={16} color="#FBBF24" />
                            <Text style={styles.creatorTipText}>Pro Tip: Use good lighting and show high energy to get more calls!</Text>
                        </View>
                    </View>

                    {/* 🎓 LISTING FORM WITH TALL SKILL BOX */}
                    <View style={[styles.formCard, borderType2, { backgroundColor: 'rgba(15, 17, 21, 0.85)' }]}>
                        
                        <Text style={[styles.label, { color: theme.primary }]}>SELECT OR TYPE YOUR SKILL</Text>
                        
                        {/* 🔥 TALL SCROLLING SKILL GRID */}
                        <View style={styles.tallSkillBox}>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={styles.skillGrid}>
                                {STANDARD_SKILLS.map(skill => (
                                    <TouchableOpacity 
                                        key={skill} 
                                        onPress={() => setSkillName(skill)} 
                                        style={[
                                            styles.skillChip, 
                                            skillName === skill ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: 'rgba(255,255,255,0.1)' }
                                        ]}
                                    >
                                        <Text style={[styles.skillChipText, skillName === skill && { color: '#000', fontWeight: '900' }]}>{skill}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <Text style={[styles.label, { color: theme.primary, marginTop: 15 }]}>Custom Skill</Text>
                        <TextInput 
                            placeholder="Type here..."
                            placeholderTextColor="#475569"
                            value={skillName}
                            onChangeText={setSkillName}
                            style={[styles.largeInput, { borderColor: theme.primary + '40' }]}
                        />

                        {/* 🔥 THE EXTRA "MASS" FEATURE: ALGORITHM BOOST INFO 🔥 */}
                        <View style={[styles.lockedRevenueCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
                            <View style={styles.revenueHeader}>
                                <MaterialCommunityIcons name="rocket-launch" size={18} color={theme.accent} />
                                <Text style={[styles.revenueTitle, { color: theme.accent }]}> ALGORITHM BOOST</Text>
                            </View>
                            <Text style={styles.revenueDesc}>Activate Premium Spotlight for priority discovery. Experience new daily updates that bring more traffic and opportunities your way!</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                                <MaterialCommunityIcons name="trending-up" size={28} color="#FFF" />
                                <Text style={styles.revenueAmount}>300% MORE VISIBILITY</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={handleSaveSkill} 
                            disabled={isUpdating}
                            style={[styles.mainBtn, { shadowColor: theme.primary }]}
                        >
                            <LinearGradient colors={[theme.primary, theme.secondary]} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.btnGradient}>
                                {isUpdating ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.btnText}>{currentSkill?.active ? "UPDATE PREMIUM SPOTLIGHT" : "START PREMIUM SPOTLIGHT"}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* 🔥 SATTI FIX: PLAY STORE SAFE & PROFESSIONAL GUIDELINES MODAL 🔥 */}
            <Modal visible={showWarningModal} transparent animationType="fade" onRequestClose={() => setShowWarningModal(false)}>
                <BlurView intensity={90} tint="dark" style={styles.previewModalOverlay}>
                    <View style={[styles.premiumWarningBox, { width: '85%', marginHorizontal: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: theme.primary }]}>
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
                    </View>
                </BlurView>
            </Modal>

            {/* 🔥 SATTI FIX: VIDEO PREVIEW MODAL USING expo-av 🔥 */}
            <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <BlurView intensity={95} tint="dark" style={styles.previewModalOverlay}>
                    <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setShowPreviewModal(false)}>
                        <Ionicons name="close-circle" size={40} color="#FFF" />
                    </TouchableOpacity>
                    <View style={[styles.previewVideoContainer, { borderColor: theme.primary }]}>
                        {teaserVideo && (
                           <VideoView 
                                player={player} 
                                style={styles.previewVideo} 
                                contentFit="cover" 
                            />
                        )}
                    </View>
                </BlurView>
            </Modal>

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
    
    marginSection: { marginTop: 10 },
    sectionTitle: { fontSize: 12, fontWeight: '900', marginHorizontal: 24, marginBottom: 15, letterSpacing: 1 },

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
    actionCardTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textAlign: 'center', lineHeight: 18 },
    actionCardSub: { color: '#64748B', fontSize: 9, fontWeight: '700', marginTop: 5 },
    
    creatorTipBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 15, backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
    creatorTipText: { color: '#FBBF24', fontSize: 10, fontWeight: '700', marginLeft: 8, flex: 1 },

    formCard: { marginHorizontal: 24, marginTop: 25, padding: 25, borderRadius: 35 },
    label: { fontSize: 11, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
    
    // 🔥 TALL SKILL BOX
    tallSkillBox: { height: 250, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 10, marginBottom: 10 },
    skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
    skillChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1 },
    skillChipText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
    
    largeInput: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 20, paddingVertical: 20, borderRadius: 20, color: '#FFF', fontWeight: '700', fontSize: 16, borderWidth: 1 },
    
    lockedRevenueCard: { marginTop: 25, padding: 20, borderRadius: 20, borderWidth: 1 },
    revenueHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    revenueTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    revenueDesc: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    revenueAmount: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1 },

    mainBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden', elevation: 10, shadowOpacity: 0.3, shadowRadius: 15 },
    btnGradient: { paddingVertical: 22, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
    
    previewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
    closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 100 },
    previewVideoContainer: { width: width * 0.85, height: height * 0.7, borderRadius: 30, overflow: 'hidden', borderWidth: 2, backgroundColor: '#000' },
    previewVideo: { width: '100%', height: '100%' },
});