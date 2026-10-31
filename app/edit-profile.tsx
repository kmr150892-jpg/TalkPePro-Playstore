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
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; 

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

  const userTier = calculateUserLevel(totalSpent);

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
    borderLeftColor: userTier.color,
    borderRightColor: userTier.color,
    borderTopColor: userTier.secondaryColor + '80',
    borderBottomColor: userTier.secondaryColor + '80',
    backgroundColor: 'rgba(5, 5, 5, 0.45)',
  };

  const borderType2 = {
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderLeftColor: userTier.secondaryColor,
    borderRightColor: userTier.secondaryColor,
    borderTopColor: userTier.color + '80',
    borderBottomColor: userTier.color + '80',
    backgroundColor: 'rgba(5, 5, 5, 0.65)',
  };

  if (loading) return <View style={styles.darkLoader}><ActivityIndicator size="large" color={userTier.color} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 200, left: -90, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: userTier.color + '40' }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>EDIT PROFILE</Text>
            <BlurView intensity={20} tint="dark" style={[styles.tierBadge, { borderColor: userTier.color + '30' }]}>
                <Text style={[styles.headerSub, { color: userTier.color }]}>Status: {userTier.label}</Text>
            </BlurView>
          </View>
        </View>

        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        >
          
          <TouchableOpacity style={styles.coverWrapper} onPress={() => pickImage('cover')} activeOpacity={0.9}>
            <Image source={{ uri: coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926' }} style={styles.coverImg} />
            <View style={[styles.coverOverlay, { backgroundColor: userTier.color + '20' }]}>
                <Ionicons name="camera" size={26} color="#FFF" />
                <Text style={styles.coverText}>UPDATE BANNER</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => pickImage('profile')} activeOpacity={0.9}>
              <Animated.View style={[styles.avatarContainer, { transform: [{ translateY: floatAnim }] }]}>
                <View style={[styles.avatarBorder, { borderColor: userTier.color, shadowColor: userTier.color }]}>
                  <Image source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${name}&background=1E293B&color=fff&bold=true` }} style={styles.avatarImg} />
                </View>
                <View style={[styles.cameraBadge, {backgroundColor: userTier.color}]}><Ionicons name="camera" size={16} color="#FFF" /></View>
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: userTier.color }]}>PROFILE DETAILS</Text>
            <View style={[styles.inputWrapper, borderType1]}>
              <Ionicons name="person-outline" size={20} color={userTier.color} style={styles.inputIcon}/>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Display Name" placeholderTextColor="#475569" />
            </View>

            <View style={styles.rowInputs}>
                <View style={[styles.inputWrapper, borderType2, {flex: 1, marginRight: 10}]}>
                    <Ionicons name="calendar-outline" size={20} color={userTier.secondaryColor} style={styles.inputIcon}/>
                    <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" placeholderTextColor="#475569" />
                </View>
                <View style={[styles.inputWrapper, borderType1, {flex: 2}]}>
                    <Ionicons name="location-outline" size={20} color={userTier.color} style={styles.inputIcon}/>
                    <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor="#475569" />
                </View>
            </View>

            <Text style={[styles.inputLabel, { color: userTier.color }]}>GENDER</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((g, index) => (
                <TouchableOpacity key={g} style={[styles.genderBtn, index % 2 === 0 ? borderType1 : borderType2, gender === g && {backgroundColor: userTier.color + '30', borderColor: userTier.color, borderLeftWidth: 3}]} onPress={() => setGender(g as any)}>
                  <Text style={[styles.genderText, gender === g && {color: '#FFF', fontWeight: '900'}]}>{g.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: userTier.color }]}>BIOGRAPHY</Text>
            <View style={[styles.inputWrapper, borderType2, {height: 100, alignItems: 'flex-start', paddingTop: 12, borderRadius: 25}]}>
              <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline maxLength={150} placeholder="Tell your story..." placeholderTextColor="#475569" />
            </View>

            <Text style={[styles.inputLabel, { color: userTier.color }]}>INTERESTS (MAX 5)</Text>
            <View style={styles.tagsContainer}>
              {HOBBIES_TAGS.map((tag, index) => (
                <TouchableOpacity key={tag} style={[styles.tagChip, index % 2 === 0 ? borderType1 : borderType2, selectedHobbies.includes(tag) && {backgroundColor: userTier.color + '60', borderColor: userTier.color}]} onPress={() => toggleTag(tag, selectedHobbies, setSelectedHobbies, 5)}>
                  <Text style={[styles.tagText, selectedHobbies.includes(tag) && {color: '#FFF', fontWeight: 'bold'}]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {userRole === 'expert' && (
              <>
                <Text style={[styles.inputLabel, { color: userTier.color }]}>EXPERT DOMAINS (MAX 3)</Text>
                <View style={styles.tagsContainer}>
                  {EXPERTISE_TAGS.map((tag, index) => (
                    <TouchableOpacity key={tag} style={[styles.tagChip, index % 2 === 0 ? borderType2 : borderType1, selectedExpertise.includes(tag) && {backgroundColor: userTier.color + '60', borderColor: userTier.color}]} onPress={() => toggleTag(tag, selectedExpertise, setSelectedExpertise, 3)}>
                      <Text style={[styles.tagText, selectedExpertise.includes(tag) && {color: '#FFF', fontWeight: 'bold'}]}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.inputLabel, { color: userTier.color }]}>CALL RATE (₹ / MIN)</Text>
                <View style={[styles.inputWrapper, borderType1]}>
                  <Ionicons name="cash-outline" size={20} color={userTier.color} style={styles.inputIcon}/>
                  <TextInput style={styles.input} value={priceInRupees} onChangeText={setPriceInRupees} keyboardType="numeric" placeholder="e.g. 10" placeholderTextColor="#475569" />
                </View>
              </>
            )}

            <Text style={[styles.inputLabel, { color: userTier.color }]}>ACCOUNT INFORMATION</Text>
            <View style={[styles.inputWrapper, styles.disabledInput, { borderColor: userTier.secondaryColor + '30' }]}>
              <Ionicons name="mail-outline" size={20} color="#475569" style={styles.inputIcon}/>
              <Text style={styles.emailText}>{email}</Text>
              <Ionicons name="lock-closed" size={14} color="#475569" />
            </View>

            <TouchableOpacity style={[styles.saveBtn, { shadowColor: userTier.color }]} onPress={handleUpdate} disabled={updating}>
              <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.logoutWrapper, { borderColor: userTier.secondaryColor + '50', borderWidth: 2 }]} onPress={handleLogout} activeOpacity={0.8}>
                <LinearGradient colors={['rgba(255, 0, 50, 0.2)', 'rgba(0,0,0,0.8)']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.logoutBtn}>
                  <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
                  <Text style={styles.logoutLabel}>LOGOUT</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dangerZoneWrapper}>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  headerTextContainer: { marginLeft: 15 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  headerSub: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15, borderWidth: 1 },
  scrollContent: { paddingBottom: 100 },
  coverWrapper: { width: '100%', height: 200, position: 'relative', overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  coverText: { color: '#FFF', fontSize: 10, fontWeight: '900', marginTop: 8, letterSpacing: 2 },
  avatarSection: { alignItems: 'center', marginTop: -60, zIndex: 20 },
  avatarContainer: { position: 'relative' },
  avatarBorder: { padding: 4, borderRadius: 65, borderWidth: 3, elevation: 20, backgroundColor: '#000' },
  avatarImg: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#0F172A' },
  cameraBadge: { position: 'absolute', bottom: 2, right: 2, padding: 10, borderRadius: 25, borderWidth: 3, borderColor: '#020617' },
  formContainer: { padding: 22 },
  inputLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15, marginTop: 30 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, paddingHorizontal: 22, height: 62, marginBottom: 18 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '700' },
  rowInputs: { flexDirection: 'row', width: '100%' },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 15 },
  genderBtn: { flex: 1, height: 52, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  genderText: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 15 },
  tagChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25 },
  tagText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
  emailText: { flex: 1, color: '#475569', fontSize: 15, fontWeight: '700' },
  disabledInput: { backgroundColor: 'rgba(0, 0, 0, 0.4)', borderWidth: 1, borderRadius: 30 },
  saveBtn: { marginTop: 45, borderRadius: 35, overflow: 'hidden', elevation: 15 },
  btnGradient: { paddingVertical: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  logoutWrapper: { marginHorizontal: 0, marginTop: 25, borderRadius: 35, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 12 },
  logoutLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 2, color: '#EF4444' },
  dangerZoneWrapper: { marginTop: 45, paddingTop: 30, borderTopWidth: 1, borderTopColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center' },
  dangerZoneTitle: { color: '#EF4444', fontSize: 16, fontWeight: '900', letterSpacing: 4, marginBottom: 30, textAlign: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 22, borderRadius: 30, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', width: '100%' },
  deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  dangerInfoText: { color: '#475569', fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 18, paddingHorizontal: 20, lineHeight: 18 }
});