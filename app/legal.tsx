import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
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
 * Brief & Mass Version for Anjali
 */
export default function LegalScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

    // Reusable Content Block for cleaner code
    const ContentSection = ({ icon, title, text }: { icon: any, title: string, text: string }) => (
        <View style={styles.contentBlock}>
            <View style={styles.titleRow}>
                <Ionicons name={icon} size={18} color="#3B82F6" style={{ marginRight: 10 }} />
                <Text style={styles.contentTitle}>{title}</Text>
            </View>
            <Text style={styles.contentText}>{text}</Text>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            
            {/* Deep Space Gradient Background */}
            <LinearGradient 
                colors={['#0F172A', '#1E293B', '#0F172A']} 
                style={StyleSheet.absoluteFill} 
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={styles.backBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Legal Center</Text>
                        <Text style={styles.headerSub}>Effective from March 2026</Text>
                    </View>
                </View>

                {/* Glassmorphic Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'terms' && styles.activeTab]} 
                        onPress={() => setActiveTab('terms')}
                    >
                        <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
                            Terms of Service
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.9}
                        style={[styles.tab, activeTab === 'privacy' && styles.activeTab]} 
                        onPress={() => setActiveTab('privacy')}
                    >
                        <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
                            Privacy Policy
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
                                icon="document-text-outline"
                                title="1. Professional Usage" 
                                text="TalkPe is a platform for expert consultation. Users must maintain professional decorum during video calls. Any inappropriate behavior will result in a permanent ban without prior notice." 
                            />
                            <ContentSection 
                                icon="wallet-outline"
                                title="2. Diamond Transactions" 
                                text="Diamonds are the internal currency of TalkPe. Recharges are processed via secure gateways. Diamonds are non-transferable and non-refundable once the consultation has started." 
                            />
                            <ContentSection 
                                icon="videocam-outline"
                                title="3. Call Termination" 
                                text="Experts and users have the right to terminate a call if the conversation violates our safety protocols. Refund claims for such calls will be investigated by our support team." 
                            />
                            <ContentSection 
                                icon="alert-circle-outline"
                                title="4. Account Security" 
                                text="You are responsible for maintaining the confidentiality of your account credentials. TalkPe is not liable for unauthorized access resulting from user negligence." 
                            />
                        </View>
                    ) : (
                        <View style={styles.glassCard}>
                            <ContentSection 
                                icon="shield-half-outline"
                                title="1. Encryption Standard" 
                                text="All video and audio communications on TalkPe are powered by Agora SDK with end-to-end encryption. We do not record, listen to, or store your private conversations." 
                            />
                            <ContentSection 
                                icon="lock-closed-outline"
                                title="2. Data Protection" 
                                text="Your profile data (Name, Email, Profile Pic) is stored securely on Firebase. We never sell your personal information to third-party advertisers." 
                            />
                            <ContentSection 
                                icon="card-outline"
                                title="3. Payment Privacy" 
                                text="Financial transactions are handled exclusively by Razorpay. TalkPe does not store your credit card details, CVV, or banking passwords on our local servers." 
                            />
                            <ContentSection 
                                icon="phone-portrait-outline"
                                title="4. Device Permissions" 
                                text="We only request Camera and Microphone access for active calls, and Storage access for profile updates. You can revoke these permissions at any time through system settings." 
                            />
                        </View>
                    )}

                    {/* Footer Branding */}
                    <View style={styles.footer}>
                        <View style={styles.shieldBg}>
                            <Ionicons name="shield-checkmark" size={35} color="#3B82F6" />
                        </View>
                        <Text style={styles.footerText}>TalkPe Secure Framework</Text>
                        <Text style={styles.footerSub}>Certified by AI Star Factory ✨</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#0F172A' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 20 
    },
    headerTextContainer: { marginLeft: 15 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#64748B', fontSize: 13, fontWeight: '700', marginTop: 2 },
    backBtn: { 
        backgroundColor: 'rgba(255,255,255,0.06)', 
        padding: 10, 
        borderRadius: 15, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.1)' 
    },
    
    tabContainer: { 
        flexDirection: 'row', 
        backgroundColor: 'rgba(255,255,255,0.04)', 
        marginHorizontal: 20, 
        marginTop: 5, 
        borderRadius: 22, 
        padding: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)'
    },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 18 },
    activeTab: { 
        backgroundColor: '#3B82F6', 
        ...Platform.select({
            ios: { shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 8 }
        })
    },
    tabText: { color: '#94A3B8', fontWeight: '800', fontSize: 14 },
    activeTabText: { color: '#FFF' },

    scrollContent: { padding: 20, paddingBottom: 60 },
    glassCard: { 
        backgroundColor: 'rgba(30, 41, 59, 0.4)', 
        borderRadius: 35, 
        padding: 25, 
        borderWidth: 1.5, 
        borderColor: 'rgba(255,255,255,0.08)' 
    },
    contentBlock: { marginBottom: 35 },
    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    contentTitle: { 
        color: '#3B82F6', 
        fontSize: 16, 
        fontWeight: '900', 
        textTransform: 'uppercase', 
        letterSpacing: 1 
    },
    contentText: { color: '#CBD5E1', fontSize: 14, lineHeight: 24, fontWeight: '600' },
    
    footer: { marginTop: 20, alignItems: 'center' },
    shieldBg: { 
        width: 80, height: 80, borderRadius: 40, 
        backgroundColor: 'rgba(59, 130, 246, 0.1)', 
        justifyContent: 'center', alignItems: 'center', 
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)'
    },
    footerText: { color: '#475569', fontSize: 15, fontWeight: '800' },
    footerSub: { color: '#334155', fontSize: 13, fontWeight: '700', marginTop: 5 }
});