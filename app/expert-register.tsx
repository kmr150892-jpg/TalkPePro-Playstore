import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

export default function RegisterExpert() {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    // 📸 Photo Selection Logic
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Gallery access venum Satti!");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleRegistration = async () => {
        if (!name || !age || !gender || !location || !image) {
            Alert.alert("Missing Info", "Ella details-um fill panni, photo select pannunga.");
            return;
        }

        setUploading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert("Error", "User login check pannunga.");
                setUploading(false);
                return;
            }

            // ☁️ STEP 1: UPLOAD TO CLOUDINARY
            const cloudName = 'dvwjxeexc'; 
            const uploadPreset = 'TALKPE'; 

            const data = new FormData();
            // @ts-ignore
            data.append('file', {
                uri: image,
                type: 'image/jpeg',
                name: 'upload.jpg',
            });
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
                throw new Error("Cloudinary upload failed!");
            }

            // 📝 STEP 2: INITIALIZE ALL DATA 
            // updateDoc-ku bathula setDoc + merge use panrom so fields auto-create aagum
            await setDoc(doc(db, "users", user.uid), {
                displayName: name,
                name: name, 
                age: age,
                gender: gender,
                location: location,
                photoURL: photoURL, 
                profilePic: photoURL, 
                
                // Analytics Fields Initialization
                todayMinutes: 0,           // ✅ Added/Ensured
                totalMinutes: 0,
                totalCalls: 0,
                walletBalance: 0,
                totalBeansEarned: 0,
                totalWithdrawnRs: 0,
                longestCallDuration: 0,    // ✅ Added/Ensured
                pendingPayout: 0,
                lastCallFrom: "Waiting...",
                topCallerName: "No Fans Yet", // ✅ Added/Ensured
                
                // Admin & App Logic
                pricePerMin: 1200, 
                userPrice: 2400,
                status: "Pending",     // Must be 'Pending' for Verification Queue
                role: "user",          // Stays 'user' until Admin approves to 'expert'
                isApplying: true,      // Set to TRUE (Boolean) to track application state
                isVerified: false,     
                appliedAt: serverTimestamp(), 
            }, { merge: true }); 

            setUploading(false);
            
            Alert.alert("✨ SUCCESS!", "Application submitted! Wait for admin approval.", [
                { text: "OK", onPress: () => router.replace('/waiting-approval' as any) } 
            ]);

        } catch (error: any) {
            setUploading(false);
            Alert.alert("Upload Failed", "Error: " + error.message);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />
            
            <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>EXPERT PROFILE</Text>
                    <Text style={styles.subtitle}>Ready for Verification</Text>
                </View>

                {/* Photo Section */}
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                    <View style={styles.imageWrapper}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.selectedImage} />
                        ) : (
                            <View style={styles.placeholderBox}>
                                <Feather name="camera" size={32} color="#6366F1" />
                                <Text style={styles.placeholderText}>UPLOAD PHOTO</Text>
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                             <Feather name="edit-2" size={14} color="#fff" />
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.form}>
                    <Text style={styles.label}>FULL NAME</Text>
                    <TextInput style={styles.input} placeholder="Enter Name" placeholderTextColor="#475569" value={name} onChangeText={setName} />

                    <Text style={styles.label}>AGE</Text>
                    <TextInput style={styles.input} placeholder="Ex: 24" placeholderTextColor="#475569" keyboardType="numeric" value={age} onChangeText={setAge} />

                    <Text style={styles.label}>GENDER</Text>
                    <View style={styles.genderRow}>
                        {['Male', 'Female'].map((item) => (
                            <TouchableOpacity key={item} style={[styles.genderBtn, gender === item && styles.genderBtnActive]} onPress={() => setGender(item)}>
                                <Text style={[styles.genderText, gender === item && styles.genderTextActive]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>LOCATION</Text>
                    <TextInput style={styles.input} placeholder="City, State" placeholderTextColor="#475569" value={location} onChangeText={setLocation} />

                    <TouchableOpacity style={[styles.submitBtn, uploading && { opacity: 0.7 }]} onPress={handleRegistration} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitText}>SUBMIT APPLICATION </Text>
                                <Feather name="arrow-right" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    scrollPadding: { paddingBottom: 60, paddingTop: 60 },
    header: { alignItems: 'center', marginBottom: 35 },
    title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#6366F1', fontSize: 13, marginTop: 5, fontWeight: '700', textTransform: 'uppercase' },
    imagePicker: { alignSelf: 'center', marginBottom: 35 },
    imageWrapper: { position: 'relative' },
    placeholderBox: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#6366F1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: '#6366F1', fontSize: 10, fontWeight: '900', marginTop: 10 },
    selectedImage: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#6366F1' },
    editIconBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#6366F1', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#020617' },
    form: { paddingHorizontal: 30 },
    label: { color: '#6366F1', fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1.5, marginLeft: 5 },
    input: { backgroundColor: '#0F172A', borderRadius: 18, padding: 18, color: '#fff', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', fontSize: 15 },
    genderRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
    genderBtn: { flex: 1, height: 58, borderRadius: 18, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
    genderBtnActive: { backgroundColor: '#6366F1', borderColor: '#818CF8' },
    genderText: { color: '#94A3B8', fontWeight: '700', fontSize: 15 },
    genderTextActive: { color: '#fff' },
    submitBtn: { flexDirection: 'row', height: 68, borderRadius: 22, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 }
});