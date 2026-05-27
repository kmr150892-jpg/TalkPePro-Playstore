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
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        },
        // 🔥 NEW PLAY STORE COMPLIANCE FAQS ADDED HERE
        { 
            id: 5, 
            q: "What is the Refund Policy for Diamonds?", 
            a: "All digital diamond purchases are final and non-refundable as per Play Store guidelines. However, if a transaction fails or a consultation drops due to our server error, please contact Support within 24 hours for a review." 
        },
        { 
            id: 6, 
            q: "How to report abusive behavior?", 
            a: "User safety is our top priority. You can use the 'Report' button during any active session or email our Trust & Safety Desk directly. We take strict administrative action within 24 hours against any policy violations." 
        },
        { 
            id: 7, 
            q: "How can I delete my account & data?", 
            a: "You have full control over your data. To permanently delete your account and wipe all personal data from our servers, navigate to Profile > Edit Profile > Delete Account Permanently." 
        },
        { 
            id: 8, 
            q: "How can I use my Diamonds?", 
            a: "Diamonds act as your premium digital access keys. You can use them exclusively within the app to initiate live 1-on-1 video/audio consultations with verified experts, engage in premium live &forum activities, and unlock exclusive platform features." 
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
                    <Ionicons name={icon} size={32} color="#FFF" />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSub}>{sub}</Text>
                </View>
                <View style={styles.chevronBox}>
                    <Ionicons name="chevron-forward" size={22} color={color} />
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
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>SUPPORT HUB</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <MaterialCommunityIcons name="shield-sync-outline" size={26} color="#3B82F6" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <LinearGradient colors={['#3B82F6', '#D946EF']} style={styles.supportIconBg}>
                            <MaterialCommunityIcons name="frequently-asked-questions" size={65} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>How can we help?</Text>
                        <Text style={styles.heroSub}>24/7 Professional customer assistance for the TalkPe Pro network.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>DIRECT ASSISTANCE</Text>
                        
                        {/* 🔥 ORIGINAL EMAIL SUPPORT CARD (Made Bigger) */}
                        <SupportCard 
                            icon="mail" 
                            title="Official Email Support" 
                            sub="support@talkpepro.com" 
                            color="#6366F1" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20Client%20Support')} 
                        />

                        {/* 🔥 NEW TRUST & SAFETY CARD (Play Store Requirement) */}
                        <SupportCard 
                            icon="shield-checkmark" 
                            title="Trust & Safety Desk" 
                            sub="Report abusive behavior or scams" 
                            color="#F43F5E" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=URGENT:%20Trust%20&%20Safety%20Report')} 
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
                                                size={26} 
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerIcon: { padding: 12 },
    scrollContent: { padding: 22 },
    
    // 🔥 HERO SECTION SCALED UP
    heroSection: { alignItems: 'center', marginBottom: 45, marginTop: 15 },
    supportIconBg: { width: 130, height: 130, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', marginTop: 14, fontWeight: '600', lineHeight: 24 },
    
    section: { marginBottom: 40 },
    sectionLabel: { color: '#6366F1', fontSize: 13, fontWeight: '900', marginBottom: 20, letterSpacing: 3 },
    
    // 🔥 SUPPORT CARDS SCALED UP
    card: { marginBottom: 20, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 24 },
    iconContainer: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 20 },
    cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
    cardSub: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    chevronBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16 },
    
    // 🔥 FAQ SCALED UP
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 28 },
    faqText: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 24 },
    plusBox: { padding: 6, borderRadius: 12 },
    answerContainer: { paddingHorizontal: 28, paddingBottom: 28, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 15, lineHeight: 24, fontWeight: '600' },
    
    footer: { marginTop: 30, alignItems: 'center', paddingBottom: 60 },
    footerLine: { width: '40%', height: 3, borderRadius: 2, marginBottom: 25 },
    footerText: { color: '#334155', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    devRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    devText: { color: '#475569', fontSize: 13, fontWeight: '700' },
    devName: { color: '#D946EF', fontSize: 13, fontWeight: '900' }
});