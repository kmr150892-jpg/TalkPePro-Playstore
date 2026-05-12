import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UpdateAlert = () => {
    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.talkpe.app"; // Unga link podunga

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <MaterialCommunityIcons name="rocket-launch" size={60} color="#6366F1" />
                <Text style={styles.title}>CRITICAL SYSTEM UPDATE</Text>
                <Text style={styles.sub}>To ensure secure consulting sessions on TalkPe Pro, please upgrade to the latest infrastructure version.</Text>
                
                <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(playStoreUrl)}>
                    <Text style={styles.btnText}>UPGRADE SECURELY</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 25 },
    card: { backgroundColor: '#0F172A', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 20, textAlign: 'center' },
    sub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },
    btn: { backgroundColor: '#6366F1', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 15, marginTop: 25, width: '100%', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 14 }
});

export default UpdateAlert;