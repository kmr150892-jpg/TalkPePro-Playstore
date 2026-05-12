import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
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
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 Updated Tags for Play Store Compliance (Clean & Professional)
const EXPERTISE_TAGS = [
    "Wellness Coach", "Life Guidance", "Soft Skills",
    "Career Mentor", "Motivational", "Educational", "Social Growth",
    "Fitness Trainer", "Business Strategy", "Dance & Choreography", 
    "Singing & Vocals", "Music Production", "Acting & Theatre", 
    "Instrumental Music", "Art & Illustration", "Photography Expert", 
    "Video Editing", "Content Creation", "Language Tutor", 
    "Creative Writing", "Gaming Pro", "Fashion Stylist", 
    "Culinary Expert", "Tech Consultant"
];

const HOBBIES_TAGS = [
    "Music Lovers", "Travel Enthusiast", "Cinema", "Reading",
    "Culinary Arts", "Gaming", "Fine Arts", "Photography",
    "Animal Welfare", "Fashion Design", "Sports", "Performing Arts"
];

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2) 🔥
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
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
  if (totalSpent >= 1) return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
  return { 
      lvl: 0, label: 'BEGINNER', status: 'NEW RECRUIT', color: '#94A3B8', secondaryColor: '#475569', anim: 'wave', themeBg: ['#020617', '#000000']
  };
};

export default function RegisterExpert() {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');
    
    const [bio, setBio] = useState('');
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
    const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
    
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 8000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();
    }, []);

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
        }
    };

    const toggleTag = (tag: string, list: string[], setList: any, maxLimit: number = 3) => {
        if (list.includes(tag)) {
            setList(list.filter(t => t !== tag));
        } else {
            if (list.length >= maxLimit) {
                Alert.alert("Maximum Limit", `You can select a maximum of ${maxLimit} tags for your profile.`);
                return;
            }
            setList([...list, tag]);
        }
    };

    const handleRegistration = async () => {
        if (!name || !age || !gender || !location || !image) {
            Alert.alert("Incomplete Profile", "Please provide all required information and a profile picture to continue.");
            return;
        }

        setUploading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Authentication Error", "Session expired. Please sign in again.");
                setUploading(false);
                return;
            }

            const cloudName = 'dvwjxeexc'; 
            const uploadPreset = 'TALKPE'; 

            const data = new FormData();
            data.append('file', {
                uri: image,
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
            const photoURL = cloudResult.secure_url;

            if (!photoURL) {
                throw new Error("Image upload failed.");
            }

            await setDoc(doc(db, "users", user.uid), {
                displayName: name,
                name: name, 
                age: age,
                gender: gender,
                location: location,
                photoURL: photoURL, 
                profilePic: photoURL, 
                
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
                pendingPayout: 0,
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

            setUploading(false);
            
            Alert.alert("Application Received", "Thank you for applying. Our team will review your profile for professional community standards.", [
                { text: "Got it", onPress: () => router.replace('/waiting-approval' as any) } 
            ]);

        } catch (error: any) {
            setUploading(false);
            Alert.alert("Submission Failed", "Could not submit your application. Please check your network and try again.");
        }
    };

    const brandGradient = gender === 'Female' ? ['#FF0080', '#FF8C00'] as const : ['#00F2FE', '#4FACFE'] as const;
    const fallbackGradient = ['#38BDF8', '#818CF8'] as const; 
    const activeGradient = gender ? brandGradient : fallbackGradient;
    
    const darkBg = '#030014'; 

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -60]
    });
    
    const orbTranslateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 40]
    });

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: darkBg }} />
                <Animated.View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: activeGradient[0], transform: [{ translateY: orbTranslateY }, { translateX: orbTranslateX }] }]} />
                <Animated.View style={[styles.glowOrb, { bottom: -100, left: -80, backgroundColor: activeGradient[1], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }, { translateX: Animated.multiply(orbTranslateX, -1) }] }]} />
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.noiseOverlay} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
                
                <View style={styles.header}>
                    <LinearGradient colors={['rgba(251, 191, 36, 0.2)', 'rgba(251, 191, 36, 0.05)']} style={styles.proBadge}>
                        <MaterialCommunityIcons name="crown" size={16} color="#FBBF24" />
                        <MaterialCommunityIcons name="star" size={12} color="#FBBF24" style={{marginLeft: 2}} />
                        <Text style={styles.proBadgeText}>PROFESSIONAL NETWORK</Text>
                    </LinearGradient>
                    <Text style={styles.title}>Become a <Text style={{ color: activeGradient[0] }}>Consultant</Text></Text>
                    <Text style={styles.subtitle}>Complete your profile to join our community of experts</Text>
                </View>

                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.9}>
                    <Animated.View style={[styles.avatarGlowRing, { transform: [{ scale: pulseAnim }], backgroundColor: activeGradient[0] }]} />
                    <View style={styles.imageWrapper}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.selectedImage} />
                        ) : (
                            <View style={styles.placeholderBox}>
                                <Ionicons name="camera" size={40} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.placeholderText}>UPLOAD PHOTO</Text>
                            </View>
                        )}
                        <LinearGradient colors={activeGradient} style={styles.editIconBadge}>
                             <Feather name={image ? "edit-2" : "plus"} size={16} color="#fff" />
                        </LinearGradient>
                    </View>
                </TouchableOpacity>

                <View style={styles.glassFormContainer}>
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.01)']} style={styles.glassBorder} />
                    
                    <View style={styles.formInner}>
                        
                        <Text style={styles.sectionLabel}>ACCOUNT CATEGORY</Text>
                        <View style={styles.genderRow}>
                            {['Female', 'Other'].map((item) => {
                                const isSelected = gender === item;
                                return (
                                    <TouchableOpacity 
                                        key={item} 
                                        style={[styles.genderCard, isSelected && { borderColor: 'transparent' }]} 
                                        onPress={() => setGender(item)}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && <LinearGradient colors={activeGradient} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />}
                                        <View style={styles.genderContent}>
                                            <Ionicons name={item === 'Female' ? 'female' : 'options-outline'} size={24} color={isSelected ? '#FFF' : '#A1A1AA'} />
                                            <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>{item.toUpperCase()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.sectionLabel}>PROFILE DETAILS</Text>
                        <View style={styles.inputContainer}>
                            <Feather name="user" size={18} color={name ? activeGradient[0] : "#71717A"} style={styles.inputIcon} />
                            <TextInput style={styles.input} placeholder="Display Name" placeholderTextColor="#71717A" value={name} onChangeText={setName} />
                        </View>

                        <View style={{flexDirection: 'row', gap: 15}}>
                            <View style={[styles.inputContainer, {flex: 0.35}]}>
                                <TextInput style={[styles.input, {paddingLeft: 20, textAlign: 'center'}]} placeholder="Age" placeholderTextColor="#71717A" keyboardType="numeric" value={age} onChangeText={setAge} maxLength={2} />
                            </View>
                            <View style={[styles.inputContainer, {flex: 0.65}]}>
                                <Feather name="globe" size={18} color={location ? activeGradient[0] : "#71717A"} style={styles.inputIcon} />
                                <TextInput style={styles.input} placeholder="Location" placeholderTextColor="#71717A" value={location} onChangeText={setLocation} />
                            </View>
                        </View>

                        <View style={[styles.inputContainer, styles.bioContainer]}>
                            <TextInput 
                                style={styles.bioInput} 
                                placeholder="Highlight your professional background and how you can assist users..." 
                                placeholderTextColor="#71717A" 
                                value={bio} 
                                onChangeText={setBio} 
                                multiline 
                                maxLength={150}
                            />
                        </View>

                        <View style={styles.tagSectionHeader}>
                            <Text style={styles.sectionLabel}>CONSULTATION TOPICS</Text>
                            <Text style={styles.limitText}>{selectedExpertise.length}/3</Text>
                        </View>
                        <View style={styles.chipWrap}>
                            {EXPERTISE_TAGS.map((tag) => {
                                const isSelected = selectedExpertise.includes(tag);
                                return (
                                    <TouchableOpacity 
                                        key={tag} 
                                        style={[styles.chip, isSelected && { borderColor: 'transparent', elevation: 5 }]}
                                        onPress={() => toggleTag(tag, selectedExpertise, setSelectedExpertise, 3)}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={[styles.tagSectionHeader, { marginTop: 25 }]}>
                            <Text style={styles.sectionLabel}>PROFESSIONAL INTERESTS</Text>
                            <Text style={styles.limitText}>{selectedHobbies.length}/5</Text>
                        </View>
                        <View style={styles.chipWrap}>
                            {HOBBIES_TAGS.map((tag) => {
                                const isSelected = selectedHobbies.includes(tag);
                                return (
                                    <TouchableOpacity 
                                        key={tag} 
                                        style={[styles.chip, isSelected && { borderColor: 'transparent' }]}
                                        onPress={() => toggleTag(tag, selectedHobbies, setSelectedHobbies, 5)}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && <LinearGradient colors={activeGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
                                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity 
                            style={styles.submitWrapper} 
                            onPress={handleRegistration} 
                            disabled={uploading}
                            activeOpacity={0.8}
                        >
                            <Animated.View style={[styles.submitGlow, { transform: [{ scale: pulseAnim }], backgroundColor: activeGradient[0] }]} />
                            <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitInner}>
                                {uploading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Text style={styles.submitText}>SUBMIT APPLICATION</Text>
                                        <Feather name="check-circle" size={22} color="#fff" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.termsText}>By proceeding, you agree to our Terms of Use. We value your privacy and maintain a professional environment.</Text>
                        
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030014' },
    glowOrb: { position: 'absolute', width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, opacity: 0.18 },
    noiseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)', opacity: 0.5 },
    scrollPadding: { paddingBottom: 60, paddingTop: 80 },
    header: { paddingHorizontal: 30, marginBottom: 40, alignItems: 'center' },
    proBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)' },
    proBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginLeft: 6 },
    title: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
    subtitle: { color: '#A1A1AA', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    imagePicker: { alignSelf: 'center', marginBottom: 45, position: 'relative' },
    avatarGlowRing: { position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, borderRadius: 75, opacity: 0.4 },
    imageWrapper: { width: 140, height: 140, borderRadius: 70, padding: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 2 },
    placeholderBox: { flex: 1, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 5, letterSpacing: 1 },
    selectedImage: { flex: 1, borderRadius: 66 },
    editIconBadge: { position: 'absolute', bottom: 5, right: 5, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#030014' },
    glassFormContainer: { marginHorizontal: 20, borderRadius: 30, overflow: 'hidden' },
    glassBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 30, borderWidth: 1.5, borderColor: 'transparent' }, 
    formInner: { padding: 25, backgroundColor: 'rgba(10, 10, 15, 0.4)' },
    sectionLabel: { color: '#E2E8F0', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginLeft: 4 },
    genderRow: { flexDirection: 'row', gap: 15, marginBottom: 30 },
    genderCard: { flex: 1, height: 85, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    genderContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    genderText: { color: '#A1A1AA', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
    genderTextActive: { color: '#FFF', fontWeight: '900' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20, height: 62 },
    inputIcon: { paddingLeft: 20 },
    input: { flex: 1, height: '100%', color: '#FFF', fontSize: 15, fontWeight: '600', paddingHorizontal: 15 },
    bioContainer: { height: 120, alignItems: 'flex-start', paddingVertical: 5 },
    bioInput: { flex: 1, width: '100%', color: '#FFF', fontSize: 14, paddingHorizontal: 20, paddingTop: 18, textAlignVertical: 'top', lineHeight: 22 },
    tagSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15, marginLeft: 4 },
    limitText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 5 },
    chip: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 4 },
    chipText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
    chipTextActive: { color: '#FFF', fontWeight: '900' },
    submitWrapper: { position: 'relative', marginTop: 35, alignSelf: 'center', width: '100%' },
    submitGlow: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 0, borderRadius: 22, opacity: 0.4 },
    submitInner: { flexDirection: 'row', height: 62, borderRadius: 22, justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
    termsText: { color: '#71717A', fontSize: 10, textAlign: 'center', marginTop: 20, fontWeight: '600', lineHeight: 16 }
});