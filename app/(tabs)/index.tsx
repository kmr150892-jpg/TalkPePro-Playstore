import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LevelAvatar from '../../components/LevelAvatar';
import { LivePreview } from '../../components/LivePreview';
import WelcomeRewardModal from '../../components/WelcomeRewardModal';
import { auth, db } from '../../firebaseConfig';

const { height, width } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  // ✅ FIXED: Level 1 Secondary Color changed to RED (#6b0402)
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

// 🔥 EXPERT THEME LOGIC (SYNCED)
const getLevelTheme = (totalBeans: number = 0) => {
    if (totalBeans >= 10000000) return { color: '#F59E0B', label: 'MASTER' };
    if (totalBeans >= 5000000) return { color: '#EC4899', label: 'MYTHIC' };
    if (totalBeans >= 1000000) return { color: '#10B981', label: 'DIAMOND' };
    return { color: '#94A3B8', label: 'AGENT' };
};

const getExpertThemeColor = (earned: number) => {
    if (earned >= 10000000) return '#F59E0B';
    if (earned >= 5000000) return '#EC4899';
    if (earned >= 1000000) return '#10B981';
    return '#94A3B8';
};

export default function UserHome() {
    const router = useRouter();
    const user = auth.currentUser;
    const isFocused = useIsFocused();

    const [experts, setExperts] = useState<any[]>([]);
    const [activeLives, setActiveLives] = useState<any[]>([]);
    const [activeParties, setActiveParties] = useState<any[]>([]); // 🔥 NEW STATE FOR Session ROOMS
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeLiveId, setActiveLiveId] = useState<string | null>(null);

    // 🌀 MASTER ANIMATION ENGINE
    const scrollY = useRef(new Animated.Value(0)).current;
    const mainLoop = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) setActiveLiveId(viewableItems[0].item.id);
    }).current;

    useEffect(() => {
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();
        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.04, duration: 1500, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
            Animated.delay(2000)
        ])).start();

        // 🔥 Start Ambient Shimmer (SMOOTH FLOATING SEQUENCE)
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                  toValue: 1,
                  duration: 4000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true
                }),
                Animated.timing(shimmerAnim, {
                  toValue: 0,
                  duration: 4000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true
                })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!user) { setLoading(false); return; }

        const q = query(collection(db, 'users'), where('role', '==', 'expert'));
        const unsubExperts = onSnapshot(q, (snap) => {
            setExperts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const liveQuery = query(collection(db, 'lives'), where('status', '==', 'live'));
        const unsubLives = onSnapshot(liveQuery, (snap) => {
            setActiveLives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 🔥 FIX: FETCH ACTIVE FORUMS FROM 'forum_rooms' COLLECTION 🔥
        const partyQuery = query(collection(db, 'forum_rooms'), where('status', '==', 'active'));
        const unsubParties = onSnapshot(partyQuery, (snap) => {
            setActiveParties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const userRef = doc(db, 'users', user.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        return () => { unsubExperts(); unsubLives(); unsubUser(); unsubParties(); };
    }, [user]);

    // 🔥 SATTI FIX: Fetching the Maximum of DIAMOND/RECHARGE fields only for accurate Home Screen Level
    const userDiamonds = Math.max(
        userData?.totalDiamonds || 0,
        userData?.walletBalance || 0,
        userData?.balance || 0
    );
    const userRank = calculateUserLevel(userDiamonds);
    const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=020617&color=fff&bold=true`;

    const parallaxAura = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -50], extrapolate: 'clamp' });
    const cardScale = scrollY.interpolate({ inputRange: [-100, 0, 100], outputRange: [1.05, 1, 0.98], extrapolate: 'clamp' });

    // ==========================================
    // 🔥 CORE GHOST FILTER APPLICATION (DIRECT SYNC) 🔥
    // ==========================================
    const currentBlocked = userData?.blockedUsers || [];
    
    // 1. Filter Experts (Two-Way Block Check)
    const safeExperts = experts.filter((expert) => {
        const hostBlockedUsers = expert.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(expert.id);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 2. Filter Lives (Two-Way Block Check)
    const safeLives = activeLives.filter(live => {
        const hostProfile = experts.find(e => e.id === live.hostId);
        const hostBlockedUsers = hostProfile?.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(live.hostId);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 3. Filter Parties/Forums (Two-Way Block Check)
    const safeParties = activeParties.filter(party => {
        const hostProfile = experts.find(e => e.id === party.hostId);
        const hostBlockedUsers = hostProfile?.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(party.hostId);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 4. Spotlight (Featured) inherits from already filtered safeExperts
    const spotlightExperts = safeExperts.filter(e => (e.rating || 5.0) >= 4.0);

    const getWalletStyle = () => {
        switch(userRank.anim) {
            case 'wave': return { transform: [{ translateY: mainLoop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 5, 0] }) }] };
            case 'sparkle': return { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] };
            case 'diamond': return { transform: [{ perspective: 1000 }, { rotateY: mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
            case 'nebula': return { transform: [{ perspective: 1000 }, { rotateX: '10deg' }, { scale: scaleAnim }] };
            case 'titan': return { transform: [{ translateX: shakeAnim }, { scale: 1.02 }] };
            default: return { transform: [{ translateY: floatAnim }] };
        }
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userRank.color,
        borderRightColor: userRank.color,
        borderTopColor: userRank.secondaryColor + '80',
        borderBottomColor: userRank.secondaryColor + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userRank.secondaryColor,
        borderRightColor: userRank.secondaryColor,
        borderTopColor: userRank.color + '80',
        borderBottomColor: userRank.color + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
    };

    // 🔥 NEW DIRECT CALL ROUTING LOGIC 🔥
    const handleExpertCallClick = (expert: any, liveSession: any) => {
        if (liveSession) {
            // Priority 1: Expert is LIVE. Send user to Live Room!
            router.push({ pathname: "/(tabs)/live/[liveId]", params: { liveId: liveSession.id } } as any);
        } else if (expert.isBusy === true || expert.isBusy === "true") {
            // Priority 2: Expert is not live, but is on another call (BUSY).
            Alert.alert(
                "Host is Engaged", 
                `${expert.name} is currently assisting another user. Please try again in a few minutes.`
            );
        } else {
            // Priority 3: Expert is free. Send user to detail page (to make the call).
            router.push({ pathname: '/expert-detail', params: { id: expert.id } } as any);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 IDHO UNGA WELCOME SPIN MODAL! */}
            <WelcomeRewardModal />
            
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={userRank.themeBg as any} style={StyleSheet.absoluteFill} />
            
            {/* 🔥 FLOATING SHIMMER ORBS */}
            <Animated.View style={[styles.shimmerOrb, { top: 100, left: -60, backgroundColor: userRank.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 200, right: -60, backgroundColor: userRank.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <SafeAreaView style={styles.topSection} edges={['top']}>
                <View style={styles.topEliteHeader}>
                    <View style={styles.brandContainer}>
                        <Text style={styles.welcomeLabelText}>WELCOME TO</Text>
                        <View style={styles.brandRow}>
                            <Text style={styles.brandTitleWhite}>TALKPE </Text>
                            <Text style={[styles.brandTitleIndigo, { color: userRank.color }]}>PRO</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/two' as any)}>
                         <View style={[styles.syncedAvatarRing, { borderColor: userRank.color, shadowColor: userRank.color }]}>
                            <Image source={{ uri: uPic }} style={styles.syncedAvatarImg} />
                         </View>
                    </TouchableOpacity>
                </View>

                <Animated.View style={[styles.walletArea, getWalletStyle(), { scaleX: cardScale, scaleY: cardScale }]}>
                    <View style={[styles.stealthBoxBase, borderType1]}>
                        <Animated.View style={[styles.glowTrail, { backgroundColor: userRank.color, transform: [{ translateX: trailX }] }]} />
                        <View style={styles.walletContentRow}>
                            <View style={styles.walletInfo}>
                                <Text style={styles.cardSubTitle}>DIAMOND ASSETS</Text>
                                <View style={styles.balanceRow}>
                                    <MaterialCommunityIcons name="diamond-stone" size={26} color="#FFF" />
                                    <Text style={styles.mainBalanceValue} numberOfLines={1} adjustsFontSizeToFit>{(userData?.balance || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.userNameContainer}>
                                    <Text style={styles.walletUserName}>{userData?.name?.toUpperCase() || 'AGENT_IDENTIFIED'}</Text>
                                    <Text style={[styles.walletUserID, { color: userRank.color }]}>{userRank.label}</Text>
                                </View>
                            </View>
                            <View style={styles.rightAction}>
                                <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="rgba(255,255,255,0.5)" />
                                <TouchableOpacity style={[styles.glassAddBtn, {borderColor: userRank.color + '50'}]} onPress={() => router.push('/recharge' as any)}>
                                    <BlurView intensity={20} style={styles.btnBlur}>
                                        <Text style={[styles.btnTxt, {color: userRank.color}]}>TOPUP</Text>
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* 🔥 QUICK Discover BUTTON */}
                <TouchableOpacity 
                    activeOpacity={0.9} 
                    // 🔥 SATTI FIX: EXPO ROUTER STANDARD NAME FIXED HERE 🔥
                    onPress={() => router.push('/explore-experts' as any)}
                    style={[styles.DiscoverTriggerMass, { shadowColor: userRank.color }]}
                >
                    <LinearGradient 
                        colors={[userRank.color, userRank.secondaryColor]} 
                        style={styles.DiscoverGradient}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    >
                        <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFF" />
                        <Text style={styles.DiscoverBtnText}>QUICK CONNECT</Text>
                        <View style={styles.liveIndicatorDiscover}>
                            <View style={styles.liveDotDiscover} />
                            <Text style={styles.liveCountDiscover}>{safeLives.length + safeExperts.length + 42} Online</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.searchSection}>
                    <BlurView intensity={10} tint="dark" style={[styles.searchBarMass, borderType2]}>
                        <Ionicons name="search" size={18} color={userRank.color} />
                        <TextInput placeholder="search host" placeholderTextColor="#475569" style={styles.searchInputMass} value={searchQuery} onChangeText={setSearchQuery} />
                    </BlurView>
                </View>
            </SafeAreaView>

            <Animated.ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >
                {safeLives.length > 0 && (
                    <View style={styles.sectionArea}>
                        <View style={styles.sectionHeaderMass}>
                            <View style={styles.rowCenter}><View style={styles.livePulseDot} /><Text style={styles.sectionTitleMass}>ACTIVE BROADCASTS</Text></View>
                            <Text style={styles.onlineCountText}>{safeLives.length} NODES</Text>
                        </View>
                        <FlatList horizontal snapToInterval={width * 0.45 + 15} decelerationRate="fast" showsHorizontalScrollIndicator={false}
                            data={safeLives} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingLeft: 20 }}
                            onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={viewabilityConfig}
                            renderItem={({ item, index }) => {
                                const isActive = item.id === activeLiveId && isFocused;
                                const liveBorder = index % 2 === 0 ? borderType1 : borderType2;
                                return (
                                    // 🔥 FIX 1: LIVE GOES TO LIVE 🔥
                                    <TouchableOpacity activeOpacity={0.9} style={[styles.massLiveCard, liveBorder]} onPress={() => router.push({ pathname: "/(tabs)/live/[liveId]", params: { liveId: item.id } } as any)}>
                                        {isActive ? <LivePreview liveId={item.id} /> : <Image source={{ uri: item.hostImage || 'https://i.pravatar.cc/150' }} style={styles.massLiveThumb} />}
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.massLiveOverlay}>
                                            <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
                                            <Text style={styles.liveHostNameMass} numberOfLines={1}>{item.hostName || 'Host'}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                {/* 🔥 NEW: VIP Session ARENAS SECTION 🔥 */}
                {safeParties.length > 0 && (
                    <View style={styles.sectionArea}>
                        <View style={styles.sectionHeaderMass}>
                            <View style={styles.rowCenter}>
                                <MaterialCommunityIcons name="party-popper" size={16} color={userRank.color} style={{marginRight: 8}} />
                                <Text style={styles.sectionTitleMass}>OPEN FORUMS</Text>
                            </View>
                            <Text style={styles.onlineCountText}>{safeParties.length} ROOMS</Text>
                        </View>
                        <FlatList horizontal showsHorizontalScrollIndicator={false} data={safeParties} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingLeft: 20 }}
                            renderItem={({ item, index }) => {
                                const partyBorder = index % 2 === 0 ? borderType1 : borderType2;
                                return (
                                    // 🔥 FIX 2: THE ULTIMATE ROOT FOLDER PATH FIX (/forum/[roomId]) 🔥
                                    <TouchableOpacity activeOpacity={0.9} style={[styles.massPartyCard, partyBorder]} onPress={() => router.push({ pathname: "/forum/[roomId]", params: { roomId: item.roomId || item.id } } as any)}>
                                        <Image source={{ uri: item.hostImage || 'https://i.pravatar.cc/150' }} style={styles.massPartyThumb} />
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.massLiveOverlay}>
                                            <View style={[styles.liveBadge, {backgroundColor: '#4F46E5'}]}><Text style={styles.liveBadgeText}>FORUM</Text></View>
                                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                                                <View style={styles.liveDotDiscover} />
                                                <Text style={{color: '#10B981', fontSize: 10, fontWeight: '900', marginLeft: 4}}>{item.viewerCount || 0} Online</Text>
                                            </View>
                                            <Text style={styles.liveHostNameMass} numberOfLines={1}>{item.roomName}</Text>
                                            <Text style={{color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 2}}>Host: {item.hostName}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                <View style={styles.sectionArea}>
                    <View style={styles.sectionHeaderMass}>
                        <Text style={styles.sectionTitleMass}>FEATURED HOSTS</Text>
                        <TouchableOpacity><Text style={[styles.seeMoreText, { color: userRank.color }]}>DISCOVER</Text></TouchableOpacity>
                    </View>
                    <FlatList horizontal showsHorizontalScrollIndicator={false} data={spotlightExperts} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingLeft: 10 }}
                        renderItem={({ item }) => {
                            const liveNode = safeLives.find(l => l.hostId === item.id);
                            return (
                                <TouchableOpacity activeOpacity={0.8} style={styles.circleBtn} onPress={() => liveNode ? router.push({ pathname: "/(tabs)/live/[liveId]", params: { liveId: liveNode.id } } as any) : router.push({ pathname: '/expert-detail', params: { id: item.id } } as any)}>
                                    <LevelAvatar image={item.profilePic || item.photoURL} beans={item.totalBeansEarned || 0} size={64} />
                                    <Text style={styles.circleNameText} numberOfLines={1}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                <View style={styles.listArea}>
                    <Text style={styles.sectionTitleMass}>RECOMMENDED HOSTS</Text>
                    {loading ? ( <ActivityIndicator color={userRank.color} style={{ marginTop: 40 }} /> ) : (
                        safeExperts.filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((expert, index) => {
                                const diamondRate = Number(expert.userPrice || (expert.beansPerMin * 2) || 1000);
                                const liveSession = safeLives.find(live => live.hostId === expert.id);
                                const expertThemeColor = getExpertThemeColor(expert.totalBeansEarned || 0);
                                
                                // 🔥 Alternating Border Logic
                                const expertBorderStyle = index % 2 === 0 ? borderType2 : borderType1;

                                return (
                                    <TouchableOpacity 
                                        key={expert.id} 
                                        activeOpacity={0.85} 
                                        style={[styles.eliteNodeRow, expertBorderStyle]} 
                                        // 🔥 THE UPDATED CALL CLICK LOGIC 🔥
                                        onPress={() => handleExpertCallClick(expert, liveSession)}
                                    >
                                        <View style={styles.nodeLead}>
                                            <View style={[styles.nodeAvatarRing, { borderColor: expertThemeColor }]}>
                                                <Image source={{ uri: expert.profilePic || 'https://i.pravatar.cc/100' }} style={styles.nodeAvatarImg} />
                                            </View>
                                            {liveSession && <View style={styles.livePing}><Text style={styles.livePingText}>LIVE</Text></View>}
                                        </View>
                                        <View style={styles.nodeMain}>
                                            <Text style={styles.nodeName}>{expert.name}</Text>
                                            <Text style={[styles.nodeRateText, { color: expertThemeColor }]}>💎 {diamondRate.toLocaleString()} / MIN</Text>
                                        </View>
                                        
                                        {/* 🔥 FLAME OR VIDEO ICON 🔥 */}
                                        <LinearGradient colors={liveSession ? ['#EF4444', '#7F1D1D'] : [userRank.color, userRank.secondaryColor || '#1E1B4B']} style={styles.nodeCallBtn}>
                                            <Ionicons name={liveSession ? "flame" : "videocam"} size={18} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                );
                            })
                    )}
                </View>
                <View style={{height: 120}} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
    
    topSection: { paddingBottom: 5 },
    topEliteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15 },
    brandContainer: { flex: 1 },
    welcomeLabelText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    brandTitleWhite: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
    brandTitleIndigo: { fontSize: 22, fontWeight: '900', letterSpacing: -1, marginLeft: 6 },
    
    syncedAvatarRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, padding: 2, elevation: 15, backgroundColor: '#020617' },
    syncedAvatarImg: { width: '100%', height: '100%', borderRadius: 28 },

    walletArea: { paddingHorizontal: 20, marginTop: 20 },
    // 🔥 ZERO BOX FLUID SHAPE
    stealthBoxBase: { height: 130, borderRadius: 35, overflow: 'hidden', elevation: 20 },
    glowTrail: { position: 'absolute', width: 120, height: '200%', top: '-50%', opacity: 0.2, transform: [{ rotate: '35deg' }] },
    walletContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingHorizontal: 22, zIndex: 10 },
    walletInfo: { flex: 1 },
    cardSubTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'nowrap' },
    mainBalanceValue: { color: '#FFF', fontSize: 32, fontWeight: '900', flexShrink: 1 },
    userNameContainer: { marginTop: 8 },
    walletUserName: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    walletUserID: { fontSize: 9, fontWeight: '900', marginTop: 2, letterSpacing: 1.5 },
    rightAction: { alignItems: 'flex-end', justifyContent: 'center' },
    glassAddBtn: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginTop: 8 },
    btnBlur: { paddingHorizontal: 15, paddingVertical: 10 },
    btnTxt: { fontWeight: '900', fontSize: 9, letterSpacing: 1 },

    // 🔥 QUICK Discover BUTTON STYLES
    DiscoverTriggerMass: { marginHorizontal: 20, marginTop: 25, borderRadius: 30, elevation: 15, shadowOpacity: 0.6, shadowRadius: 12 },
    DiscoverGradient: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 30, gap: 15 },
    DiscoverBtnText: { color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: 1.5 },
    liveIndicatorDiscover: { marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    liveDotDiscover: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    liveCountDiscover: { color: '#10B981', fontSize: 10, fontWeight: '800' },

    searchSection: { paddingHorizontal: 20, marginTop: 20 },
    searchBarMass: { flexDirection: 'row', borderRadius: 25, paddingHorizontal: 18, height: 50, alignItems: 'center' },
    searchInputMass: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 13, fontWeight: '700' },
    
    scrollContent: { paddingTop: 10 },
    sectionArea: { marginTop: 35 },
    sectionHeaderMass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 15 },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    livePulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 10, shadowColor: '#EF4444', shadowRadius: 5, elevation: 5 },
    sectionTitleMass: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    onlineCountText: { color: '#475569', fontSize: 9, fontWeight: '900' },
    seeMoreText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    
    massLiveCard: { width: 170, height: 230, marginRight: 18, borderRadius: 35, overflow: 'hidden' },
    massLiveThumb: { width: '100%', height: '100%' },
    
    // 🔥 NEW Session CARD STYLES
    massPartyCard: { width: 160, height: 160, marginRight: 18, borderRadius: 25, overflow: 'hidden' },
    massPartyThumb: { width: '100%', height: '100%', opacity: 0.7 },

    massLiveOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 18 },
    liveBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }, 
    liveBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
    liveHostNameMass: { color: '#FFF', fontSize: 14, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 5 },
    
    circleBtn: { alignItems: 'center', marginRight: 22, width: 75 },
    circleNameText: { color: '#FFF', fontSize: 10, fontWeight: '900', marginTop: 10 },
    
    listArea: { marginTop: 45, paddingHorizontal: 20 },
    eliteNodeRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 35, marginBottom: 15 },
    nodeLead: { position: 'relative' },
    nodeAvatarRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, padding: 2 },
    nodeAvatarImg: { width: '100%', height: '100%', borderRadius: 25 },
    livePing: { position: 'absolute', top: -5, left: -5, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, zIndex: 10 },
    livePingText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
    nodeMain: { flex: 1, marginLeft: 16 },
    nodeName: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },
    nodeRateText: { fontSize: 12, fontWeight: '900', marginTop: 3 },
    nodeCallBtn: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 12 },
});