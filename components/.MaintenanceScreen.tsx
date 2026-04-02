import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

const MaintenanceScreen = () => {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="tools" size={60} color="#F59E0B" />
            </View>
            <Text style={styles.title}>TALKPE IS UPDATING</Text>
            <Text style={styles.subText}>
                We are currently performing scheduled maintenance to improve your experience. 
                We'll be back online shortly!
            </Text>
            <View style={styles.statusBadge}>
                <View style={styles.pulse} />
                <Text style={styles.statusText}>ENGINEERS AT WORK</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 30 },
    iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
    subText: { color: '#475569', fontSize: 14, textAlign: 'center', marginTop: 15, lineHeight: 22 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 40, borderWidth: 1, borderColor: '#1E293B' },
    pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 10 },
    statusText: { color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }
});

export default MaintenanceScreen;