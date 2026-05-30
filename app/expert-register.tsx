import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXPERTISE_TAGS = [
    "🎤 Singing", "💃 Dancing", "🔮 Astrology", "🎴 Tarot Reading", "🤝 Community Advice", "💼 Career Counseling", "🌱 Life Coaching", 
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

const CONNECT_TAGS = [
    "🌱 Life Advice", "💼 Career Guidance", "❤️ Relationship Tips", "🗣️ Just Venting", 
    "✨ Spiritual Growth", "💪 Daily Motivation", "🎭 Entertainment", "📚 Skill Learning", 
    "🤝 Loneliness Support", "🔮 Astrology & Tarot"
];

const LANGUAGES = ["English", "Tamil", "Hindi", "Malayalam", "Kannada", "Telugu"];

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
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

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
                    selectedHobbies, selectedLanguages, image
                };
                await AsyncStorage.setItem('@expert_draft', JSON.stringify(dataToSave));
            } catch (error) {
                console.log("Error saving draft: ", error);
            }
        };
        saveDraft();
    }, [step, name, age, gender, location, selectedPersonality, selectedConnections, bio, selectedExpertise, selectedHobbies, selectedLanguages, image, isRestored]);


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

    // 🔥 PUTHUSA ADD PANNA FUNCTION - BACK BUTTON FOR LOGOUT / CANCEL
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

            if (!photoURL) throw new Error("Image upload failed.");

            await setDoc(doc(db, "users", user.uid), {
                displayName: name,
                name: name, 
                age: age,
                gender: gender,
                location: location,
                photoURL: photoURL, 
                profilePic: photoURL, 
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

    if (!isRestored) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: darkBg }]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <View style={StyleSheet.absoluteFill}>
                <View style={{ flex: 1, backgroundColor: darkBg }} />
                <Animated.View style={[styles.glowOrb, { top: -50, right: -50, backgroundColor: activeGradient[0], transform: [{ translateY: orbTranslateY }, { translateX: orbTranslateX }] }]} />
                <Animated.View style={[styles.glowOrb, { bottom: -100, left: -80, backgroundColor: activeGradient[1], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }, { translateX: Animated.multiply(orbTranslateX, -1) }] }]} />
                <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.noiseOverlay} />
            </View>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(step / 5) * 100}%`, backgroundColor: activeGradient[0] }]} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollPadding} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {step < 5 && (
                    <View style={styles.header}>
                        <LinearGradient colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)']} style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>STEP {step} OF 5</Text>
                        </LinearGradient>
                        
                        <Text style={styles.title}>
                            {step === 1 && "Create Your Identity"}
                            {step === 2 && "Verification"}
                            {step === 3 && "Choose Your Expertise"}
                            {step === 4 && "Your Vibe & Connection"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 1 && "Add your best photo and real name."}
                            {step === 2 && "Ensure you meet our platform policy."}
                            {step === 3 && "Select the skills that define you."}
                            {step === 4 && "Let people know who you are and your interests."}
                        </Text>
                    </View>
                )}

                <View style={styles.formContainer}>
                    {step === 1 && (
                        <View style={styles.stepWrapper}>
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.9}>
                                <View style={styles.imageContainer}>
                                    <Animated.View style={[styles.avatarBaseGlow, { transform: [{ scale: pulseAnim }], backgroundColor: activeGradient[0] }]} />
                                    <Animated.View style={[styles.rotatingSolidRing, { borderColor: activeGradient[1], transform: [{ rotate: rotateAnim }] }]} />
                                    <Animated.View style={[styles.reverseRotatingThinRing, { borderTopColor: activeGradient[0], borderBottomColor: activeGradient[0], transform: [{ rotate: reverseRotateAnim }] }]} />
                                    
                                    <View style={styles.imageWrapper}>
                                        {image ? (
                                            <Image source={{ uri: image }} style={styles.selectedImage} />
                                        ) : (
                                            <View style={styles.placeholderBox}>
                                                <Ionicons name="camera" size={40} color="rgba(255,255,255,0.4)" />
                                                <Text style={styles.placeholderText}>UPLOAD PHOTO</Text>
                                            </View>
                                        )}
                                    </View>
                                    <LinearGradient colors={activeGradient} style={styles.editIconBadge}>
                                         <Feather name={image ? "edit-2" : "plus"} size={18} color="#fff" />
                                    </LinearGradient>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.formCard}>
                                <Text style={styles.sectionTitle}>Account Setup</Text>
                                <View style={styles.genderRow}>
                                    {['Male', 'Female'].map((item) => {
                                        const isSelected = gender === item;
                                        return (
                                            <TouchableOpacity 
                                                key={item} 
                                                style={[styles.genderCard, isSelected && styles.genderCardActive]} 
                                                onPress={() => setGender(item)}
                                                activeOpacity={0.8}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} style={StyleSheet.absoluteFill} />}
                                                <View style={styles.genderContent}>
                                                    <Ionicons name={item === 'Female' ? 'female' : 'male'} size={20} color={isSelected ? '#FFF' : '#64748B'} />
                                                    <Text style={[styles.genderText, isSelected && styles.genderTextActive]}>{item}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Display Name</Text>
                                    <View style={styles.inputField}>
                                        <Feather name="user" size={18} color={name ? activeGradient[0] : "#64748B"} />
                                        <TextInput style={styles.input} placeholder="e.g. Sarah Smith" placeholderTextColor="#475569" value={name} onChangeText={setName} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepWrapper}>
                            <View style={styles.formCard}>
                                <View style={styles.ageVerificationBox}>
                                    <View style={[styles.iconWrapperGlow, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                        <MaterialCommunityIcons name="shield-check" size={24} color="#EF4444" />
                                    </View>
                                    <Text style={styles.ageTitle}>18+ Verification Required</Text>
                                    <Text style={styles.ageDesc}>You must be at least 18 years old to build connections on this platform.</Text>
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={[styles.inputGroup, {flex: 0.35}]}>
                                        <Text style={styles.inputLabel}>Age</Text>
                                        <View style={styles.inputField}>
                                            <TextInput style={[styles.input, {textAlign: 'center'}]} placeholder="25" placeholderTextColor="#475569" keyboardType="numeric" value={age} onChangeText={setAge} maxLength={2} />
                                        </View>
                                    </View>
                                    <View style={[styles.inputGroup, {flex: 0.65}]}>
                                        <Text style={styles.inputLabel}>Location</Text>
                                        <View style={styles.inputField}>
                                            <Feather name="map-pin" size={18} color={location ? activeGradient[0] : "#64748B"} />
                                            <TextInput style={styles.input} placeholder="City, Country" placeholderTextColor="#475569" value={location} onChangeText={setLocation} />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.formCard, { marginTop: 20 }]}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={styles.sectionTitle}>Languages You Speak</Text>
                                    <Text style={styles.limitBadge}>{selectedLanguages.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {LANGUAGES.map((tag) => {
                                        const isSelected = selectedLanguages.includes(tag);
                                        return (
                                            <TouchableOpacity 
                                                key={tag} 
                                                style={[styles.chip, isSelected && styles.chipActive]}
                                                onPress={() => toggleTag(tag, selectedLanguages, setSelectedLanguages, 3)}
                                                activeOpacity={0.8}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.stepWrapper}>
                            <View style={styles.formCard}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={styles.sectionTitle}>Core Expertise</Text>
                                    <Text style={styles.limitBadge}>{selectedExpertise.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {EXPERTISE_TAGS.map((tag) => {
                                        const isSelected = selectedExpertise.includes(tag);
                                        return (
                                            <TouchableOpacity 
                                                key={tag} 
                                                style={[styles.chip, isSelected && styles.chipActive]}
                                                onPress={() => toggleTag(tag, selectedExpertise, setSelectedExpertise, 3)}
                                                activeOpacity={0.8}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 4 && (
                        <View style={styles.stepWrapper}>
                            <View style={styles.formCard}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={styles.sectionTitle}>My Personality</Text>
                                    <Text style={styles.limitBadge}>{selectedPersonality.length}/3</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {PERSONALITY_TAGS.map((tag) => {
                                        const isSelected = selectedPersonality.includes(tag);
                                        return (
                                            <TouchableOpacity 
                                                key={tag} 
                                                style={[styles.chip, isSelected && styles.chipActive]}
                                                onPress={() => toggleTag(tag, selectedPersonality, setSelectedPersonality, 3)}
                                                activeOpacity={0.8}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={[styles.formCard, { marginTop: 20 }]}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={styles.sectionTitle}>Other Interests</Text>
                                    <Text style={styles.limitBadge}>{selectedHobbies.length}/5</Text>
                                </View>
                                <View style={styles.chipWrap}>
                                    {HOBBIES_TAGS.map((tag) => {
                                        const isSelected = selectedHobbies.includes(tag);
                                        return (
                                            <TouchableOpacity 
                                                key={tag} 
                                                style={[styles.chip, isSelected && styles.chipActive]}
                                                onPress={() => toggleTag(tag, selectedHobbies, setSelectedHobbies, 5)}
                                                activeOpacity={0.8}
                                            >
                                                {isSelected && <LinearGradient colors={activeGradient} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />}
                                                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={[styles.formCard, { marginTop: 20 }]}>
                                <View style={styles.tagSectionHeader}>
                                    <Text style={styles.sectionTitle}>A Bit About Me</Text>
                                    <Text style={styles.limitBadge}>{bio.length}/150</Text>
                                </View>
                                <View style={[styles.inputField, styles.bioField]}>
                                    <TextInput 
                                        style={styles.bioInput} 
                                        placeholder="Write a small bio about who you are, your vibe, and why people should talk to you..." 
                                        placeholderTextColor="#475569" 
                                        value={bio} 
                                        onChangeText={setBio} 
                                        multiline 
                                        maxLength={150}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 5 && (
                        <Animated.View style={styles.stepWrapper}>
                            <View style={[styles.formCard, styles.finalCard]}>
                                <Animated.View style={[styles.shieldIconWrap, { transform: [{ scale: pulseAnim }] }]}>
                                    <LinearGradient colors={activeGradient} style={styles.shieldGradient}>
                                        <MaterialCommunityIcons name="shield-star" size={40} color="#FFF" />
                                    </LinearGradient>
                                </Animated.View>
                                
                                <Text style={styles.finalTitle}>Welcome to the Elite, {name || 'Creator'}!</Text>
                                <Text style={styles.finalSub}>Your application to join the <Text style={{color: activeGradient[0], fontWeight:'800'}}>Elite Creators Network</Text> is almost ready.</Text>
                                
                                <View style={styles.termsBox}>
                                    <View style={styles.termsIcon}>
                                        <Feather name="check-circle" size={18} color={activeGradient[0]} />
                                    </View>
                                    <Text style={styles.termsText}>
                                        By proceeding, you agree to our Terms of Use. We value your privacy and maintain a professional environment. Our team will verify your details to ensure community standards.
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.stickyFooter}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                
                <View style={styles.footerRow}>
                    {/* 🔥 1st Step-la Logout icon varum, Matha Step-la Back Arrow varum! */}
                    <TouchableOpacity 
                        style={styles.backBtn} 
                        onPress={step === 1 ? cancelAndGoToLogin : prevStep}
                    >
                        <Feather name={step === 1 ? "log-out" : "arrow-left"} size={24} color="#F8FAFC" />
                    </TouchableOpacity>

                    {/* 🔥 Style Update: Back button yappa paathalum irukkum, so layout udayaathu! */}
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

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#030014' },
    glowOrb: { position: 'absolute', width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, opacity: 0.18 },
    noiseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)', opacity: 0.5 },

    progressContainer: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight },
    progressBar: { height: '100%', borderRadius: 2 },

    scrollPadding: { paddingBottom: 150, paddingTop: 20, paddingHorizontal: 20 },
    
    header: { alignItems: 'flex-start', marginBottom: 25, marginTop: 5 },
    stepBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    stepBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    title: { color: '#F8FAFC', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 6, lineHeight: 20 },
    
    formContainer: { width: '100%' },
    stepWrapper: { width: '100%' },

    formCard: { backgroundColor: 'rgba(15, 23, 42, 0.45)', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    sectionTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', letterSpacing: 0.5, marginBottom: 18 },

    finalCard: { alignItems: 'center', paddingVertical: 45, paddingHorizontal: 25, backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', marginTop: 25 },
    shieldIconWrap: { padding: 10, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    shieldGradient: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
    finalTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 14, textAlign: 'center', letterSpacing: -0.5 },
    finalSub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 35, fontWeight: '500', paddingHorizontal: 5 },
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
    limitBadge: { backgroundColor: 'rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
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
});