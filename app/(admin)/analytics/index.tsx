import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AnalyticsDashboard() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* HEADER - Cinematic Style */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.welcomeText}>SYSTEM OPERATIONS</Text>
                        <Text style={styles.adminName}>PLATFORM PULSE</Text>
                    </View>
                </View>

                {/* MAIN NAVIGATION TILES */}
                <View style={styles.menuGrid}>
                    
                    {/* 1. SYSTEM YIELD */}
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.mainTile, { borderColor: '#10B98130' }]} 
                        onPress={() => router.push('/(admin)/analytics/revenue')}
                    >
                        <LinearGradient colors={['#10B98120', 'transparent']} style={styles.tileGrad} />
                        <MaterialCommunityIcons name="currency-inr" size={30} color="#10B981" />
                        <Text style={styles.tileTitle}>SYSTEM YIELD</Text>
                        <Text style={styles.tileSub}>Platform Income & Distributions</Text>
                    </TouchableOpacity>

                    {/* 2. SESSION LOGS */}
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.mainTile, { borderColor: '#6366F130' }]} 
                        onPress={() => router.push('/(admin)/analytics/calls')}
                    >
                        <LinearGradient colors={['#6366F120', 'transparent']} style={styles.tileGrad} />
                        <Feather name="phone-call" size={28} color="#6366F1" />
                        <Text style={styles.tileTitle}>SESSION LOGS</Text>
                        <Text style={styles.tileSub}>Operational Traffic & Metrics</Text>
                    </TouchableOpacity>

                    {/* 3. CONSULTANT VERIFICATION - Updated Route Logic */}
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.mainTile, { borderColor: '#8B5CF630', width: '100%' }]} 
                        onPress={() => router.push('/(admin)/experts/verification-queue')}
                    >
                        <LinearGradient colors={['#8B5CF620', 'transparent']} style={styles.tileGrad} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <MaterialCommunityIcons name="shield-check-outline" size={32} color="#8B5CF6" />
                            <View>
                                <Text style={styles.tileTitle}>CONSULTANT QUEUE</Text>
                                <Text style={styles.tileSub}>Manage Identity Verifications</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* 4. CLIENT GROWTH */}
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.mainTile, { borderColor: '#F59E0B30', width: '100%' }]} 
                        onPress={() => router.push('/(admin)/analytics/users')}
                    >
                        <LinearGradient colors={['#F59E0B20', 'transparent']} style={styles.tileGrad} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                            <Feather name="users" size={30} color="#F59E0B" />
                            <View>
                                <Text style={styles.tileTitle}>CLIENT GROWTH</Text>
                                <Text style={styles.tileSub}>Onboarding & Retention</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 30, gap: 15 },
    backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
    welcomeText: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    adminName: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2 },
    menuGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    mainTile: { width: (width - 55) / 2, height: 140, backgroundColor: '#0F172A', borderRadius: 28, padding: 20, justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
    tileGrad: { ...StyleSheet.absoluteFillObject },
    tileTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 10, letterSpacing: 0.5 },
    tileSub: { color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 4 }
});