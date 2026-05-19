"use client";

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function SupportScreen() {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleFAQ = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const faqs = [
        { 
            id: 1, 
            q: "Diamond recharge not reflected?", 
            // 🔥 SATTI FIX: Professional wording for transaction issues
            a: "Recharge status usually synchronizes within 2-5 minutes. If your balance hasn't updated after a successful transaction, please contact our support team via email for manual verification." 
        },
        { 
            id: 2, 
            q: "Experiencing call disconnections?", 
            // 🔥 SATTI FIX: Technical stability explanation
            a: "Our system is optimized for low-latency connections. Please ensure you are on a stable 4G/5G or Wi-Fi network. We monitor link stability to ensure your diamonds are only utilized for active consultation time." 
        },
        { 
            id: 3, 
            q: "How to locate specific experts?", 
            a: "You can find verified experts by using the search feature on the home screen. Filter by expertise tags to find the professional best suited for your requirements." 
        },
        { 
            id: 4, 
            q: "Is my privacy protected?", 
            // 🔥 SATTI FIX: Strengthening trust for Play Store
            a: "TalkPe Pro utilizes end-to-end encryption protocols. Your private consultations are secured, ensuring that no third Session, including TalkPe Pro, can access or record your sessions." 
        }
    ];

    const SupportCard = ({ icon, title, sub, onPress, color }: any) => (
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
            <LinearGradient 
                colors={[`${color}30`, 'rgba(255,255,255,0.02)']} 
                start={{x:0, y:0}} end={{x:1, y:1}} 
                style={styles.cardGradient}
            >
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={28} color="#FFF" />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSub}>{sub}</Text>
                </View>
                <View style={styles.chevronBox}>
                    <Ionicons name="chevron-forward" size={18} color={color} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>SUPPORT HUB</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <MaterialCommunityIcons name="shield-sync-outline" size={22} color="#3B82F6" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <LinearGradient colors={['#3B82F6', '#D946EF']} style={styles.supportIconBg}>
                            <MaterialCommunityIcons name="frequently-asked-questions" size={55} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>How can we help?</Text>
                        <Text style={styles.heroSub}>24/7 Professional customer assistance for the TalkPe Pro network.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>DIRECT ASSISTANCE</Text>
                        <SupportCard 
                            icon="mail" 
                            title="Official Email Support" 
                            sub="support@talkpepro.com" 
                            color="#6366F1" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com')} 
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>KNOWLEDGE BASE</Text>
                        <View style={styles.faqContainer}>
                            {faqs.map((item) => (
                                <View key={item.id} style={styles.faqWrapper}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        style={styles.faqHeader} 
                                        onPress={() => toggleFAQ(item.id)}
                                    >
                                        <Text style={[styles.faqText, expandedId === item.id && { color: '#D946EF' }]}>{item.q}</Text>
                                        <View style={[styles.plusBox, expandedId === item.id && { backgroundColor: 'rgba(217, 70, 239, 0.1)' }]}>
                                            <Ionicons 
                                                name={expandedId === item.id ? "remove-circle" : "add-circle"}
                                                size={22} 
                                                color={expandedId === item.id ? "#D946EF" : "#475569"} 
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {expandedId === item.id && (
                                        <BlurView intensity={20} tint="dark" style={styles.answerContainer}>
                                            <Text style={styles.answerText}>{item.a}</Text>
                                        </BlurView>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <LinearGradient colors={['#3B82F6', '#D946EF']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.footerLine} />
                        <Text style={styles.footerText}>TALKPE PRO SECURE SYSTEM • v1.0.5</Text>
                        <View style={styles.devRow}>
                            <Text style={styles.devText}>Developed with 💎 by </Text>
                            <Text style={styles.devName}>TALKPE TEAM</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerIcon: { padding: 10 },
    scrollContent: { padding: 20 },
    heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
    supportIconBg: { width: 110, height: 110, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 20 },
    section: { marginBottom: 35 },
    sectionLabel: { color: '#6366F1', fontSize: 11, fontWeight: '900', marginBottom: 20, letterSpacing: 3 },
    card: { marginBottom: 18, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    iconContainer: { width: 58, height: 58, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 18 },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 5, fontWeight: '600' },
    chevronBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15 },
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
    faqText: { color: '#FFF', fontSize: 15, fontWeight: '800', flex: 1, paddingRight: 15 },
    plusBox: { padding: 5 },
    answerContainer: { paddingHorizontal: 25, paddingBottom: 25, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 14, lineHeight: 22, fontWeight: '600' },
    footer: { marginTop: 25, alignItems: 'center', paddingBottom: 50 },
    footerLine: { width: '40%', height: 2, borderRadius: 1, marginBottom: 25 },
    footerText: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    devRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    devText: { color: '#475569', fontSize: 12, fontWeight: '700' },
    devName: { color: '#D946EF', fontSize: 12, fontWeight: '900' }
});