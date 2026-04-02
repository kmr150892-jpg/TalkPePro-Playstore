import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function WaitingApproval() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            // ✅ Fix: Route '/login' illana '/' use pannanum. 
            // 'as any' use panni TypeScript red line error-ah avoid pannuvom.
            router.replace('/' as any); 
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Feather name="clock" size={60} color="#6366F1" />
                </View>
                <Text style={styles.title}>APPLICATION UNDER REVIEW</Text>
                <Text style={styles.subtitle}>
                     your profil details are being reviewed by admin. once approved, your account will be activated. Thank  you for your patience!
                </Text>
                
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Text style={styles.logoutText}>LOGOUT & CHECK LATER</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 30, alignItems: 'center' },
    iconCircle: { 
        width: 120, 
        height: 120, 
        borderRadius: 60, 
        backgroundColor: '#1E293B', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#334155'
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 15, letterSpacing: 1 },
    subtitle: { color: '#94A3B8', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
    logoutBtn: { 
        paddingVertical: 15, 
        paddingHorizontal: 30, 
        borderRadius: 15, 
        borderWidth: 1, 
        borderColor: '#6366F1',
        backgroundColor: 'transparent'
    },
    logoutText: { color: '#6366F1', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }
});