import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react'; // ✅ useState add pannirukaen
import {
    Dimensions,
    LayoutAnimation,
    Linking, // ✅ Smooth animation-kaga
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

// Android-la animation work aaga idhu thevai
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function SupportScreen() {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<number | null>(null); // ✅ Click logic handle panna

    const openWhatsApp = () => {
        Linking.openURL('whatsapp://send?phone=+910000000000&text=Hi TalkPe Support!');
    };

    const toggleFAQ = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const faqs = [
        { id: 1, q: "Diamond recharge not showing?", a: "Check your transaction history first. If it's successful, wait 5 mins or contact support with screenshot." },
        { id: 2, q: "Call disconnected suddenly?", a: "Weak internet connection can cause this. We will refund the diamonds if the call fails within 30 seconds." },
        { id: 3, q: "How to withdrawal earnings?", a: "Go to Wallet > Withdrawal. Minimum balance should be 500 diamonds to request a payout." },
        { id: 4, q: "Privacy & Data security?", a: "TalkPe uses end-to-end encryption for video calls. Your personal data is never shared with third parties." }
    ];

    const SupportCard = ({ icon, title, sub, onPress, color }: any) => (
        <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
            <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} style={styles.cardGradient}>
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <Ionicons name={icon} size={28} color={color} />
                </View>
                <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSub}>{sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
            </LinearGradient>
        </TouchableOpacity>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0F172A', '#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Support Center</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <View style={styles.supportIconBg}>
                            <Ionicons name="headset-outline" size={50} color="#3B82F6" />
                        </View>
                        <Text style={styles.heroTitle}>How can we help?</Text>
                        <Text style={styles.heroSub}>24/7 Professional Support for TalkPe Users.</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Direct Connect</Text>
                        <SupportCard icon="logo-whatsapp" title="WhatsApp Chat" sub="Quick response" color="#10B981" onPress={openWhatsApp} />
                        <SupportCard icon="mail-outline" title="Email Us" sub="support@talkpe.com" color="#3B82F6" onPress={() => Linking.openURL('mailto:support@talkpe.com')} />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Common Queries</Text>
                        <View style={styles.faqContainer}>
                            {faqs.map((item) => (
                                <View key={item.id} style={styles.faqWrapper}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        style={styles.faqHeader} 
                                        onPress={() => toggleFAQ(item.id)}
                                    >
                                        <Text style={[styles.faqText, expandedId === item.id && { color: '#3B82F6' }]}>{item.q}</Text>
                                        <Ionicons 
                                            name={expandedId === item.id ? "remove" : "add"} 
                                            size={20} 
                                            color={expandedId === item.id ? "#3B82F6" : "#64748B"} 
                                        />
                                    </TouchableOpacity>
                                    
                                    {expandedId === item.id && (
                                        <View style={styles.answerContainer}>
                                            <Text style={styles.answerText}>{item.a}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>TalkPe Secure v1.0.4</Text>
                        <Text style={styles.devText}>Developed by Anjali ✨</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#0F172A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 15 },
    scrollContent: { padding: 20 },
    heroSection: { alignItems: 'center', marginVertical: 20 },
    supportIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
    heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    heroSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 10 },
    section: { marginBottom: 30 },
    sectionLabel: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 15 },
    card: { marginBottom: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    iconContainer: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 15 },
    cardTitle: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    cardSub: { color: '#64748B', fontSize: 13, marginTop: 4 },
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
    faqText: { color: '#CBD5E1', fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 10 },
    answerContainer: { paddingHorizontal: 22, paddingBottom: 20, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
    footer: { marginTop: 10, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 12, fontWeight: '800' },
    devText: { color: '#475569', fontSize: 11, marginTop: 5 }
});