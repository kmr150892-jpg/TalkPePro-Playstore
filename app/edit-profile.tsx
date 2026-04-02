import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

// ✅ Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload";
const UPLOAD_PRESET = "talkpe"; 

export default function EditProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState(''); // 🔥 Role track panna
  const [priceInRupees, setPriceInRupees] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [totalBeans, setTotalBeans] = useState(0); // Level check panna

  useEffect(() => {
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
          setUserRole(data.role || 'user'); // Role set panrom
          setTotalBeans(data.totalBeansEarned || 0); // Current beans track
          
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

  const uploadToCloudinary = async (fileUri: string) => {
    let formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      type: "image/jpeg",
      name: `user_${user?.uid}_${Date.now()}.jpg`,
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

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Picker Error:", error);
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Name is mandatory Satti!");
      return;
    }

    setUpdating(true);
    try {
      let finalImageUrl = profileImage;

      if (profileImage && profileImage.startsWith('file://')) {
        const cloudinaryUrl = await uploadToCloudinary(profileImage);
        if (cloudinaryUrl) {
          finalImageUrl = cloudinaryUrl;
        } else {
          throw new Error("Cloudinary upload failed");
        }
      }

      const userRef = doc(db, "users", user!.uid);
      
      // 🔥 MASS LOGIC: Role based update object creation
      let updatePayload: any = {
        name: name,
        profilePic: finalImageUrl,
        updatedAt: new Date().toISOString(),
      };

      // Expert-ah iruntha mattum price related fields add aagum
      if (userRole === 'expert') {
        if (!priceInRupees.trim()) {
            Alert.alert("Wait Satti!", "Price is mandatory for Experts.");
            setUpdating(false);
            return;
        }
        
        const finalBeansRate = Number(priceInRupees) * 100;
        
        // ✅ NEW LEVEL LOGIC: Rookie L1 Max 1200 Beans (12 Rupees)
        let maxLimitBeans = 1000; // Beginner L0 Limit
        if (totalBeans >= 30000) maxLimitBeans = 1200; // Rookie L1 Limit
        
        if (finalBeansRate < 300) {
            Alert.alert("Low Price!", "Minimum 3 Rupees (300 Beans) set pannanum.");
            setUpdating(false);
            return;
        }

        if (finalBeansRate > maxLimitBeans) {
            Alert.alert("Level Limit! 🚀", `Ungaloda current level-ku max ₹${maxLimitBeans/100} thaan set panna mudiyum. Promote aga beans earn pannunga!`);
            setUpdating(false);
            return;
        }

        updatePayload.userPrice = Number(priceInRupees);
        updatePayload.pricePerMin = finalBeansRate;
        updatePayload.beansPerMin = finalBeansRate;
      }

      await updateDoc(userRef, updatePayload);

      Alert.alert("Profile Updated 🎉", "Your profile details have been saved successfully!", [
        { text: "CONGRATES", onPress: () => router.replace('/(tabs)/' as any) }
      ]);
    } catch (error) {
      Alert.alert("Error", "Update failure. Check Firebase/Cloudinary.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.mainContainer}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSub}>Customize your TalkPe identity</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
              <View style={styles.avatarContainer}>
                <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={styles.avatarBorder}>
                  <Image 
                    source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${name || 'User'}&background=1E293B&color=fff` }} 
                    style={styles.avatarImg} 
                  />
                </LinearGradient>
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={20} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.changePicText}>Change Profile Picture</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBg}><Ionicons name="person-outline" size={20} color="#3B82F6" /></View>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#475569" />
              </View>
            </View>

            {/* 🔥 Role Check: Expert-ku mattum Price Section kaatuvom */}
            {userRole === 'expert' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price Per Minute (INR)</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.iconBg}><Ionicons name="cash-outline" size={20} color="#10B981" /></View>
                  <TextInput style={styles.input} value={priceInRupees} onChangeText={setPriceInRupees} keyboardType="numeric" placeholder="Example: 10" placeholderTextColor="#475569" />
                  <Text style={styles.rupeeTag}>/ min</Text>
                </View>
                <Text style={styles.infoText}>Auto-converts to {Number(priceInRupees) * 100} Beans.</Text>
                {/* Visual Level Info */}
                <Text style={[styles.infoText, { color: totalBeans >= 30000 ? '#10B981' : '#EAB308' }]}>
                  {totalBeans >= 30000 ? "✓ Rookie L1 Unlocked: Max ₹12/min" : "Beginner L0 Limit: Max ₹10/min"}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, styles.disabledInput]}>
                <View style={styles.iconBg}><Ionicons name="mail-outline" size={20} color="#64748B" /></View>
                <Text style={styles.emailText}>{email}</Text>
                <Ionicons name="lock-closed" size={14} color="#475569" />
              </View>
              <Text style={styles.infoText}>Email cannot be changed for security.</Text>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={updating} activeOpacity={0.8}>
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {updating ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  loaderContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  headerTextContainer: { marginLeft: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#64748B', fontSize: 13, fontWeight: '500', marginTop: 2 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 50 },
  avatarSection: { alignItems: 'center', marginVertical: 30 },
  avatarContainer: { position: 'relative', elevation: 15, shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 20 },
  avatarBorder: { padding: 4, borderRadius: 60 },
  avatarImg: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#0F172A' },
  cameraBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#3B82F6', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#1E293B' },
  changePicText: { color: '#3B82F6', marginTop: 15, fontWeight: '700', fontSize: 14 },
  formContainer: { width: '100%' },
  inputGroup: { marginBottom: 25 },
  inputLabel: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 10, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: 20, paddingHorizontal: 15, height: 60, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  iconBg: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '600' },
  rupeeTag: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },
  emailText: { flex: 1, color: '#64748B', fontSize: 16, fontWeight: '600' },
  disabledInput: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderColor: 'transparent' },
  infoText: { color: '#475569', fontSize: 11, marginTop: 8, marginLeft: 10, fontWeight: '600' },
  saveBtn: { marginTop: 10, borderRadius: 22, overflow: 'hidden', elevation: 8, shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  cancelBtn: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#64748B', fontSize: 14, fontWeight: '700' }
});