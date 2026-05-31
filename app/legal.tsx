import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

/**
 * TALKPE LEGAL CENTER
 * Professional Play Store Compliant Version
 */
export default function LegalScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

    // Reusable Content Block for cleaner code
    const ContentSection = ({ icon, title, text, color }: { icon: any, title: string, text: string, color: string }) => (
        <View style={styles.contentBlock}>
            <View style={styles.titleRow}>
                <View style={[styles.iconBox, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.contentTitle, { color: color }]}>{title}</Text>
            </View>
            <View style={styles.textWrapper}>
                <Text style={styles.contentText}>{text}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <LinearGradient 
                colors={['#020617', '#0F172A', '#020617']} 
                style={StyleSheet.absoluteFill} 
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                
                {/* --- HEADER HUD --- */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={styles.backBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>LEGAL CENTER</Text>
                        <View style={styles.syncRow}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.headerSub}>LAST UPDATED: MARCH 2026</Text>
                        </View>
                    </View>
                </View>

                {/* --- TAB SWITCHER --- */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'terms' && styles.activeTabTerms]} 
                        onPress={() => setActiveTab('terms')}
                    >
                        <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                            TERMS OF SERVICE
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'privacy' && styles.activeTabPrivacy]} 
                        onPress={() => setActiveTab('privacy')}
                    >
                        <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                            PRIVACY POLICY
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                >
                    {activeTab === 'terms' ? (
                        <View style={styles.glassCard}>
                            <ContentSection 
                                icon="shield-account"
                                color="#6366F1"
                                title="1. Community Guidelines" 
                                text="TalkPe Pro is a premium live interaction and calling platform. All participants must engage with respect and decorum. Any form of harassment or misuse of the service will lead to immediate account suspension as per our zero-tolerance policy." 
                            />
                            <ContentSection 
                                icon="diamond-stone"
                                color="#0EA5E9"
                                title="2. Digital Assets & No Cashout Policy" 
                                text="Our internal ecosystem utilizes Diamonds to connect with hosts. Diamonds are purely virtual in-app assets with NO real-world monetary value. Under no circumstances can user Diamonds be withdrawn, cashed out, or exchanged for real money. All purchases are securely processed through official payment gateways and are strictly non-refundable." 
                            />
                            <ContentSection 
                                icon="phone-cancel"
                                color="#F43F5E"
                                title="3. Interaction Safety" 
                                text="Both the host and the user maintain the right to end a call if safety protocols are compromised. TalkPe Pro reserves the right to review reported violations to ensure network integrity." 
                            />
                            <ContentSection 
                                icon="security"
                                color="#10B981"
                                title="4. User Responsibility" 
                                text="You are responsible for maintaining the confidentiality of your account credentials. TalkPe Pro is not liable for unauthorized access resulting from user negligence or shared sensitive information." 
                            />
                            <ContentSection 
                                icon="gavel"
                                color="#F59E0B"
                                title="5. Content Moderation" 
                                text="We maintain strict User-Generated Content (UGC) policies. Any user found violating community guidelines, engaging in abusive behavior, or attempting off-platform transactions will face immediate account termination without any refund of digital assets." 
                            />
                        </View>
                    ) : (
                        <View style={styles.glassCard}>
                            <ContentSection 
                                icon="fountain-pen-tip"
                                color="#A855F7"
                                title="1. Communication Privacy" 
                                text="All live interactions are powered by Agora SDK with industry-standard encryption. We operate under a zero-knowledge framework; your private calls are confidential and are never recorded or monitored by TalkPe Pro." 
                            />
                            <ContentSection 
                                icon="database-lock"
                                color="#EC4899"
                                title="2. Information Security" 
                                text="Your profile and identity data are secured within Firebase encrypted clusters. We maintain a strict policy against selling or sharing your personal data with third-party advertisers for marketing purposes." 
                            />
                            <ContentSection 
                                icon="credit-card-chip"
                                color="#F59E0B"
                                title="3. Transaction Protection" 
                                text="Financial details are processed via secure Google Play Billing and payment vaults. Sensitive information like CVV or banking passwords never pass through or get stored within the TalkPe Pro local system." 
                            />
                            <ContentSection 
                                icon="eye-off"
                                color="#06B6D4"
                                title="4. Data Permissions" 
                                text="Camera and Microphone access is strictly requested for live call durations only. Any media access is limited to profile personalization. You can manage or revoke these permissions via your device settings at any time." 
                            />
                            <ContentSection 
                                icon="delete-sweep"
                                color="#14B8A6"
                                title="5. Data Deletion Rights" 
                                text="In strict compliance with Google Play Developer Policies, users retain full rights over their data. You can request complete deletion of your account and associated data through the app settings at any time, which will wipe your identity from our servers." 
                            />
                        </View>
                    )}

                    {/* --- FOOTER HUD --- */}
                    <View style={styles.footer}>
                        <LinearGradient 
                            colors={['#6366F1', '#D946EF']} 
                            start={{x:0, y:0}} end={{x:1, y:0}} 
                            style={styles.shieldGlow}
                        >
                            <View style={styles.shieldInner}>
                                <Ionicons name="shield-checkmark" size={30} color="#FFF" />
                            </View>
                        </LinearGradient>
                        <Text style={styles.footerText}>SECURE PROTOCOL v1.0.5</Text>
                        <View style={styles.brandRow}>
                            <Text style={styles.footerSub}>MANAGED BY </Text>
                            <Text style={styles.brandHighlight}>TALKPE TECHNOLOGIES✨</Text>
                        </View>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 25 },
    headerTextContainer: { marginLeft: 18 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    syncRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 },
    headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20, borderRadius: 25, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 20 },
    activeTabTerms: { backgroundColor: '#6366F1' },
    activeTabPrivacy: { backgroundColor: '#A855F7' },
    tabText: { color: '#475569', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    activeTabText: { color: '#FFF' },
    scrollContent: { padding: 20 },
    glassCard: { backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 35, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contentBlock: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 15 },
    contentTitle: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 },
    textWrapper: { paddingLeft: 53 },
    contentText: { color: '#94A3B8', fontSize: 13, lineHeight: 22, fontWeight: '600' },
    footer: { marginTop: 30, alignItems: 'center' },
    shieldGlow: { width: 70, height: 70, borderRadius: 35, padding: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    shieldInner: { width: '100%', height: '100%', borderRadius: 33, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerSub: { color: '#334155', fontSize: 10, fontWeight: '800' },
    brandHighlight: { color: '#475569', fontSize: 10, fontWeight: '900' }
});