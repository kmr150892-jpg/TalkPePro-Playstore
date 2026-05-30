import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function PassbookIndex() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 🛡️ SYSTEM HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>System Ledger</Text>
                    <Text style={styles.headerSub}>Select entity type to audit</Text>
                </View>
                <MaterialCommunityIcons name="safe" size={28} color="#10B981" style={styles.headerIcon} />
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>AUDIT ACCESS</Text>

                {/* 👤 CLIENT ALLOCATION LEDGER BUTTON */}
                <TouchableOpacity 
                    style={styles.cardWrapper} 
                    activeOpacity={0.8}
                    onPress={() => router.push('/(admin)/passbook/user-list' as any)} 
                >
                    <LinearGradient 
                        colors={['#0F172A', '#1E1B4B']} 
                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                        style={[styles.card, { borderColor: '#4F46E5' }]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(79, 70, 229, 0.2)' }]}>
                            <MaterialCommunityIcons name="account-group" size={32} color="#818CF8" />
                        </View>
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardTitle}>CLIENT AUDIT</Text>
                            <Text style={styles.cardSub}>Review total allocations, unit refills, and session history of all network clients.</Text>
                        </View>
                        <Ionicons name="chevron-forward-circle" size={28} color="#818CF8" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* 👑 CONSULTANT PERFORMANCE LEDGER BUTTON */}
                <TouchableOpacity 
                    style={styles.cardWrapper} 
                    activeOpacity={0.8}
                    onPress={() => router.push('/(admin)/passbook/expert-list' as any)} 
                >
                    <LinearGradient 
                        colors={['#0F172A', '#31102A']} 
                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                        style={[styles.card, { borderColor: '#E11D48' }]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 29, 72, 0.2)' }]}>
                            <MaterialCommunityIcons name="shield-star" size={32} color="#FB7185" />
                        </View>
                        <View style={styles.cardTextContainer}>
                            <Text style={styles.cardTitle}>CONSULTANT AUDIT</Text>
                            <Text style={styles.cardSub}>Review Operational Activity, processed, spotlight analytics, and reward logs.</Text>
                        </View>
                        <Ionicons name="chevron-forward-circle" size={28} color="#FB7185" />
                    </LinearGradient>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#020617' 
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        gap: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerTitle: { 
        color: '#FFF', 
        fontSize: 20, 
        fontWeight: '900', 
        letterSpacing: 0.5 
    },
    headerSub: { 
        color: '#94A3B8', 
        fontSize: 11, 
        fontWeight: '600',
        marginTop: 2
    },
    headerIcon: {
        marginLeft: 'auto',
        textShadowColor: 'rgba(16, 185, 129, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20
    },
    sectionTitle: {
        color: '#475569', 
        fontSize: 10, 
        fontWeight: '900', 
        letterSpacing: 2, 
        marginBottom: 15,
        marginLeft: 5
    },
    cardWrapper: {
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 15,
        marginRight: 10
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4
    },
    cardSub: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16
    }
});