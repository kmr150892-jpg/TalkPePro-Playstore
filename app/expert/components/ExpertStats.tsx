import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

const calculateLevel = (d: number) => {
    if (d <= 200000) return "Silver";
    if (d <= 1000000) return "Gold";
    if (d <= 5000000) return "Diamond";
    if (d <= 10000000) return "Legend";
    if (d <= 50000000) return "Elite";
    if (d <= 100000000) return "Master";
    if (d <= 500000000) return "Grandmaster";
    return "Godlike";
};

const TABS = [
    { id: 'video_call', label: 'Call Reward', icon: 'videocam', iconType: 'Ionicons' },
    { id: 'live_gift', label: 'Broadcast Rewards', icon: 'broadcast', iconType: 'MaterialCommunityIcons' },
    { id: 'party_gift', label: 'Forum Rewards', icon: 'party-popper', iconType: 'MaterialCommunityIcons' },
    { id: 'call_gift', label: 'Private Rewards', icon: 'gift', iconType: 'MaterialCommunityIcons' },
    { id: 'live_game_bonus', label: 'Broadcast Activity', icon: 'dice-multiple', iconType: 'MaterialCommunityIcons' },
    { id: 'party_game_bonus', label: 'Forum Activity', icon: 'dice-multiple', iconType: 'MaterialCommunityIcons' },
    { id: 'daily_bonus', label: 'Daily Bonus', icon: 'star-shooting', iconType: 'MaterialCommunityIcons' } 
];

export default function ExpertStats({ expertData }: { expertData: any }) {
    const router = useRouter(); 
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    
    const [mainTab, setMainTab] = useState<'STATS' | 'MONTHLY' | 'LEADERBOARD'>('STATS'); 
    const [activeTab, setActiveTab] = useState(0); 

    const [breakdown, setBreakdown] = useState({
        calls: 0, liveGifts: 0, partyGifts: 0, callGifts: 0, liveGames: 0, partyGames: 0, totalDeepGifts: 0
    });

    const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
    const [historyLoading, setHistoryLoading] = useState(true);
    
    const [yearlyEarnings, setYearlyEarnings] = useState<{year: string, total: number, months: {month: string, total: number, logs: any[]}[]}[]>([]);
    const [expandedYear, setExpandedYear] = useState<string | null>(null);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [selectedUserToBlock, setSelectedUserToBlock] = useState<{id: string, name: string} | null>(null);
    const [isBlocking, setIsBlocking] = useState(false);

    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Policy Violation"
    ];

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    const milestones = [
        { target: 100000, bonus: 5000, label: "STARTER" },
        { target: 300000, bonus: 10000, label: "PRO" },
        { target: 500000, bonus: 15000, label: "ELITE" }
    ];

    const totalBeansEarned = stats?.totalBeansEarned || expertData?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    
    const primary = config.colors?.[0] || '#ad57a6';
    const secondary = config.colors?.[2] || '#5e2a5b';
    
    const theme = {
        primary: primary,
        secondary: secondary,
        accent: config.glow !== 'transparent' ? (config.glow || primary) : primary,
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A', 
            '#020617'
        ] as const 
    };

    const bonusLock = useRef(false);

    const evaluateAndResetDailyStats = async (expertId: string, currentData: any) => {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDateStr = (new Date(Date.now() - offset)).toISOString().split('T')[0];
        
        // 🔥 SATTI FIX: Removed the "currentData.lastBonusDate &&" check to ensure it ALWAYS runs on a new day
        if (currentData.lastBonusDate !== localDateStr) {
            
            if (bonusLock.current) return;
            bonusLock.current = true; 

            const storageKey = `@daily_reset_${localDateStr}_${expertId}`;
            const hasClaimedLocally = await AsyncStorage.getItem(storageKey);
            if (hasClaimedLocally === 'true') return; 

            await AsyncStorage.setItem(storageKey, 'true');

            let bonusEarned = 0;
            let earnedLabel = "";
            const yesterdayBeans = Number(currentData.todayBeans) || 0;

            for (let i = milestones.length - 1; i >= 0; i--) {
                if (yesterdayBeans >= milestones[i].target) {
                    bonusEarned = milestones[i].bonus;
                    earnedLabel = milestones[i].label;
                    break; 
                }
            }

            try {
                const updates: any = {
                    todayBeans: 0, todayMinutes: 0, todayCalls: 0, 
                    lastBonusDate: localDateStr, topVipSupporter: { name: 'None', amount: 0, date: localDateStr },
                    currentDailyMilestone: "" 
                };

                if (bonusEarned > 0) {
                    updates.walletBalance = increment(bonusEarned);
                    updates.beans = increment(bonusEarned);
                    updates.totalBeansEarned = increment(bonusEarned); 
                }

                await updateDoc(doc(db, "users", expertId), updates);

                if (bonusEarned > 0) {
                    await addDoc(collection(db, "transactions"), {
                        userId: expertId,
                        type: 'mission_bonus',
                        title: `Daily Mission Reward: ${earnedLabel}`,
                        amount: bonusEarned,
                        beans: bonusEarned,
                        expertBeans: bonusEarned,
                        timestamp: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        status: 'completed'
                    });

                    Alert.alert(
                        "🎉 Daily Milestone Reached! 💸", 
                        `Awesome work! You received ${bonusEarned.toLocaleString()} rewards for completing the ${earnedLabel} mission yesterday!\n\nIt has been credited to your wallet.`
                    );
                }
            } catch (e) {
                console.error("Failed to auto-reset stats:", e);
                bonusLock.current = false; 
                await AsyncStorage.removeItem(storageKey);
            }
        }
    };

    useEffect(() => {
        if (mainTab === 'LEADERBOARD' && leaderboardData.length === 0) {
            fetchLeaderboard();
        }
    }, [mainTab]);

    const fetchLeaderboard = async () => {
        setIsLeaderboardLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("totalBeansEarned", "desc"), limit(25));
            const snap = await getDocs(q);
            
            let experts = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((u: any) => (u.isExpert === true || u.role === 'expert') && (u.totalBeansEarned > 0));
                
            experts = experts.slice(0, 10); 
            setLeaderboardData(experts);
        } catch (error) {
            console.error("Leaderboard fetch error:", error);
        } finally {
            setIsLeaderboardLoading(false);
        }
    };

    useEffect(() => {
        const fetchAllArchives = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                let rawData: any[] = [];

                // 1. VIDEO CALLS
                try {
                    const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", user.uid)));
                    for (const docSnap of callsSnap.docs) {
                        const d = docSnap.data();
                        const expertEarnings = Number(d.expertEarnings) || 0;
                        if (expertEarnings > 0) { 
                            rawData.push({ id: docSnap.id, type: 'video_call', expertEarnings: expertEarnings, timestamp: d.endedAt || d.createdAt || { seconds: 0 }, callerName: d.callerName, userId: d.callerId });
                        }
                    }
                } catch(e) { console.log('Calls fetch error', e); }

                // 2. TRANSACTIONS (Fallback & Daily Bonus)
                try {
                    const userQ = query(collection(db, "transactions"), where("userId", "==", user.uid));
                    const expertQ = query(collection(db, "transactions"), where("expertId", "==", user.uid));
                    
                    const [transSnapUser, transSnapExpert] = await Promise.all([getDocs(userQ), getDocs(expertQ)]);
                    const mergedDocs = [...transSnapUser.docs, ...transSnapExpert.docs];
                    const uniqueDocs = Array.from(new Map(mergedDocs.map(doc => [doc.id, doc])).values());

                    for (const docSnap of uniqueDocs) {
                        const d = docSnap.data();
                        
                        if (d.type === 'video_call') continue; 
                        
                        if (d.type === 'mission_bonus' || d.title?.includes('Daily Mission') || (d.title?.includes('Bonus') && !d.title?.includes('Arena'))) {
                            const bonusAmount = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Number(d.amount) || 0;
                            if (bonusAmount > 0) {
                                rawData.push({
                                    id: docSnap.id,
                                    type: 'daily_bonus',
                                    senderId: null,
                                    senderName: 'TalkPe System',
                                    syncPic: 'https://img.icons8.com/3d-fluency/512/star.png',
                                    syncLevel: 'Legend',
                                    giftName: d.title || 'Daily Goal Completion',
                                    amount: bonusAmount,
                                    beans: bonusAmount,
                                    timestamp: d.timestamp || d.createdAt || { seconds: 0 }
                                });
                            }
                            continue; 
                        }

                        // 🔥 SATTI FIX: Strict check to avoid fake private rewards 🔥
                        let tType = '';
                        
                        // Ignore withdrawals, payouts, or deductions so they don't count as earnings!
                        if (d.type === 'withdrawal' || d.type === 'payout' || d.status === 'deducted' || d.amount < 0) continue;

                        if (d.type?.includes('game') || d.source?.includes('game')) {
                            tType = (d.source === 'Session' || d.source === 'forum') ? 'party_game_bonus' : 'live_game_bonus';
                        } else if (d.source === 'Session' || d.source === 'forum') {
                            tType = 'party_gift';
                        } else if (d.source === 'live') {
                            tType = 'live_gift';
                        } else if (d.type === 'gift' || d.source === 'call') {
                            tType = 'call_gift';
                        } else {
                            // Unhandled transaction types (like system deductions) are ignored.
                            continue;
                        }

                        const bns = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Math.floor((Number(d.diamonds) || Number(d.amount) || 0) / 2);
                        if (bns > 0) { 
                            rawData.push({ id: docSnap.id, type: tType, beans: bns, timestamp: d.timestamp || d.createdAt || { seconds: 0 }, senderName: d.senderName || d.userName || d.name || "User", userId: d.userId || d.senderId });
                        }
                    }
                } catch(e) { console.log('Transactions fetch error', e); }

                // 3. LIVE GIFTS & NESTED GAMES
                try {
                    const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", user.uid)));
                    for (const liveDoc of livesSnap.docs) {
                        const liveData = liveDoc.data();
                        const isParty = liveData.isPartyRoom === true || liveData.status === "party_hidden";

                        if (liveData.gameBeansCollected && liveData.gameBeansCollected > 0) {
                            rawData.push({
                                id: `game_${liveDoc.id}`,
                                type: isParty ? 'party_game_bonus' : 'live_game_bonus',
                                senderName: 'System Reward',
                                beans: liveData.gameBeansCollected,
                                timestamp: liveData.endedAt || liveData.startedAt || { seconds: Math.floor(Date.now() / 1000) }
                            });
                        }

                        const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            const bns = Number(g.beans) || Math.floor((Number(g.amount) || Number(g.price) || 0) / 2);
                            if (bns > 0) { 
                                rawData.push({ id: gDoc.id, type: 'live_gift', beans: bns, timestamp: g.timestamp || liveData.startedAt || { seconds: 1 }, senderName: g.senderName || g.userName || g.name || "User", userId: g.senderId || g.userId });
                            }
                        }
                        
                        try {
                            const gamesSnap = await getDocs(collection(db, "lives", liveDoc.id, "games"));
                            for (const gameDoc of gamesSnap.docs) {
                                const d = gameDoc.data();
                                const expertBeans = Number(d.expertBeans) || Number(d.expertBean) || 0;
                                if (expertBeans > 0) {
                                    rawData.push({ 
                                        id: `${liveDoc.id}_${gameDoc.id}`, 
                                        type: 'live_game_bonus', 
                                        beans: expertBeans, 
                                        timestamp: d.timestamp || d.createdAt || d.gameStartedAt || liveData.startedAt || { seconds: Math.floor(Date.now() / 1000) }, 
                                        senderName: "Live Game System" 
                                    });
                                }
                            }
                        } catch(e){}
                    }
                } catch(e) { console.log('Live gifts fetch error', e); }

                // 4. FORUM REWARDS & NESTED GAMES
                try {
                    const forumSnap = await getDocs(query(collection(db, "forum_rooms"), where("hostId", "==", user.uid)));
                    for (const forumDoc of forumSnap.docs) {
                        const pData = forumDoc.data();
                        const giftsSnap = await getDocs(collection(db, "forum_rooms", forumDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            const bns = Number(g.beans) || Math.floor((Number(g.price) || Number(g.amount) || 0) / 2);
                            if (bns > 0) { 
                                rawData.push({ id: gDoc.id, type: 'party_gift', beans: bns, timestamp: g.timestamp || pData.createdAt || { seconds: 1 }, senderName: g.senderName || g.userName || g.name || "User", userId: g.senderId || g.userId });
                            }
                        }

                        try {
                            const gamesSnap = await getDocs(collection(db, "forum_rooms", forumDoc.id, "games"));
                            for (const gameDoc of gamesSnap.docs) {
                                const d = gameDoc.data();
                                const expertBeans = Number(d.expertBeans) || Number(d.expertBean) || 0;
                                if (expertBeans > 0) {
                                    rawData.push({ 
                                        id: `${forumDoc.id}_${gameDoc.id}`, 
                                        type: 'party_game_bonus', 
                                        beans: expertBeans, 
                                        timestamp: d.timestamp || d.createdAt || d.gameStartedAt || pData.createdAt || { seconds: Math.floor(Date.now() / 1000) }, 
                                        senderName: "Forum Game System" 
                                    });
                                }
                            }
                        } catch(e){}
                    }
                } catch(e) { console.log('Forum rewards fetch error', e); }

                // 5. BROADCAST ACTIVITY (Live Games)
                try {
                    const idFields = ["hostId", "expertId", "userId"];
                    for (const field of idFields) {
                        const snap = await getDocs(query(collection(db, "live_games"), where(field, "==", user.uid)));
                        for (const gameDoc of snap.docs) {
                            const d = gameDoc.data();
                            const expertBeans = Number(d.expertBeans) || Number(d.expertBean) || 0;
                            if (expertBeans > 0) { 
                                rawData.push({ id: gameDoc.id, type: 'live_game_bonus', beans: expertBeans, timestamp: d.timestamp || d.createdAt || d.endedAt || { seconds: Math.floor(Date.now() / 1000) }, senderName: "Live Game System" });
                            }
                        }
                    }
                } catch(e) { console.log('Live games fetch error', e); }

                // 6. FORUM ACTIVITY (Forum Games)
                try {
                    const idFields = ["hostId", "expertId", "userId"];
                    for (const field of idFields) {
                        const snap = await getDocs(query(collection(db, "forum_games"), where(field, "==", user.uid)));
                        for (const gameDoc of snap.docs) {
                            const d = gameDoc.data();
                            const expertBeans = Number(d.expertBeans) || Number(d.expertBean) || 0;
                            if (expertBeans > 0) { 
                                rawData.push({ id: gameDoc.id, type: 'party_game_bonus', beans: expertBeans, timestamp: d.timestamp || d.createdAt || d.endedAt || { seconds: Math.floor(Date.now() / 1000) }, senderName: "Forum Game System" });
                            }
                        }
                    }
                } catch(e) { console.log('Forum games fetch error', e); }

                // PROCESS UNIQUE DATA
                const uniqueData: any[] = [];
                const seen = new Set();
                for (const item of rawData) {
                    const amount = Number(item.beans) || Number(item.expertEarnings) || 0;
                    if (amount > 0) { 
                        const uniqueKey = item.id ? `${item.type}_${item.id}` : `${item.type}_${amount}_${item.timestamp?.seconds || Math.random()}`;
                        if (!seen.has(uniqueKey)) {
                            seen.add(uniqueKey);
                            uniqueData.push(item);
                        }
                    }
                }

                let calls = 0, liveGifts = 0, partyGifts = 0, callGifts = 0, liveGames = 0, partyGames = 0;
                uniqueData.forEach(t => {
                    if (t.type === 'video_call') calls += (t.expertEarnings || 0);
                    else if (t.type === 'live_gift') liveGifts += (t.beans || 0);
                    else if (t.type === 'party_gift') partyGifts += (t.beans || 0);
                    else if (t.type === 'call_gift') callGifts += (t.beans || 0);
                    else if (t.type === 'live_game_bonus') liveGames += (t.beans || 0);
                    else if (t.type === 'party_game_bonus') partyGames += (t.beans || 0);
                });

                setBreakdown({
                    calls, liveGifts, partyGifts, callGifts, liveGames, partyGames,
                    totalDeepGifts: liveGifts + partyGifts + callGifts + liveGames + partyGames
                });

                uniqueData.sort((a, b) => {
                    const getT = (val: any) => {
                        const t = val?.timestamp || val?.createdAt;
                        if (!t) return 0;
                        if (t.toMillis) return t.toMillis();
                        if (t.seconds) return t.seconds * 1000;
                        if (t.getTime) return t.getTime();
                        if (typeof t === 'number') return t < 10000000000 ? t * 1000 : t; 
                        if (typeof t === 'string') return new Date(t).getTime();
                        return 0;
                    };
                    return getT(b) - getT(a);
                });
                
                setHistoryLogs(uniqueData);

                const yearMap: Record<string, { total: number, months: Record<string, { total: number, logs: any[] }> }> = {};

                uniqueData.forEach(t => {
                    const rawT = t.timestamp;
                    if (rawT) {
                        let logDate = new Date();
                        if (rawT.toDate) logDate = rawT.toDate();
                        else if (rawT.seconds) logDate = new Date(rawT.seconds * 1000);
                        else if (typeof rawT === 'number') logDate = new Date(rawT < 10000000000 ? rawT * 1000 : rawT);
                        else if (typeof rawT === 'string') logDate = new Date(rawT);

                        const yearStr = logDate.getFullYear().toString();
                        const monthStr = logDate.toLocaleString('default', { month: 'short' }); 
                        
                        let earned = 0;
                        if (t.type === 'video_call') earned = Number(t.expertEarnings) || 0;
                        else if (t.type === 'live_gift' || t.type === 'party_gift' || t.type === 'call_gift') earned = Number(t.beans) || 0;
                        else if (t.type === 'live_game_bonus' || t.type === 'party_game_bonus') earned = Number(t.beans) || 0;
                        else if (t.type === 'daily_bonus') earned = Number(t.beans) || 0; 
                        else earned = Number(t.expertEarnings) || Number(t.beans) || 0;

                        if (earned > 0) { 
                            if (!yearMap[yearStr]) yearMap[yearStr] = { total: 0, months: {} };
                            if (!yearMap[yearStr].months[monthStr]) yearMap[yearStr].months[monthStr] = { total: 0, logs: [] };
                            
                            yearMap[yearStr].total += earned;
                            yearMap[yearStr].months[monthStr].total += earned;
                            yearMap[yearStr].months[monthStr].logs.push(t);
                        }
                    }
                });

                const yearlyArray = Object.keys(yearMap).map(year => ({
                    year,
                    total: yearMap[year].total,
                    months: Object.keys(yearMap[year].months).map(month => ({
                        month,
                        total: yearMap[year].months[month].total,
                        logs: yearMap[year].months[month].logs
                    })).sort((a, b) => {
                        const mOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return mOrder.indexOf(b.month) - mOrder.indexOf(a.month);
                    })
                })).sort((a, b) => Number(b.year) - Number(a.year));

                setYearlyEarnings(yearlyArray);
                setHistoryLoading(false); 

            } catch (error) { 
                console.error(error); 
                setHistoryLoading(false); 
            }
        };
        fetchAllArchives();
    }, []);

    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        const expertId = auth.currentUser?.uid;
        if (!expertId) return;

        const unsub = onSnapshot(doc(db, "users", expertId), async (snap) => {
            if (snap.exists()) {
                const d = snap.data();

                // 🔥 SATTI FIX: Validate if it's a new day before evaluating reset
                const today = new Date();
                const offset = today.getTimezoneOffset() * 60000;
                const localDateStr = (new Date(Date.now() - offset)).toISOString().split('T')[0];
                const isNewDay = d.lastBonusDate !== localDateStr;

                await evaluateAndResetDailyStats(expertId, d);

                const totalBeans = Number(d.walletBalance) || 0; 
                const lastCallerName = d.lastCallFrom || "Waiting...";
                const eliteFan = d.topVipSupporter?.name && d.topVipSupporter.name !== 'None' 
                    ? `${d.topVipSupporter.name} (💎${d.topVipSupporter.amount})` 
                    : "No Key Users Yet";
                
                const longestSecs = Number(d.longestCallDuration) || 0; 
                const longestCallMinutes = Math.floor(longestSecs / 60);

                // 🔥 SATTI FIX: If it's a new day, visually force UI to 0 instantly instead of waiting for DB sync delay
                const todaysEarnings = isNewDay ? 0 : (Number(d.todayBeans) || 0);
                const displayTodayCalls = isNewDay ? 0 : (Number(d.todayCalls) || 0);
                const displayTodayMins = isNewDay ? '0' : Math.round(Number(d.todayMinutes) || 0).toString();
                
                if (todaysEarnings >= 300000) setActiveTab(2);
                else if (todaysEarnings >= 100000) setActiveTab(1);
                else setActiveTab(0);

                setStats({
                    ...d,
                    totalBeans,
                    totalBeansEarned: Number(d.totalBeansEarned) || 0, 
                    todayBeans: todaysEarnings,
                    totalCalls: Number(d.totalCalls) || 0,
                    todayCalls: displayTodayCalls, 
                    totalWithdrawn: Number(d.totalWithdrawnRs) || 0,
                    displayMins: Math.round(Number(d.totalMinutes) || 0).toString(),
                    todayMins: displayTodayMins,
                    longestCallDisplay: longestCallMinutes.toString(), 
                    topFanName: eliteFan,
                    lastCaller: lastCallerName,
                    statusLabel: d.isVerified === true ? "VERIFIED PRO" : "PENDING VERIFICATION",
                    statusColor: d.isVerified === true ? "#10B981" : "#F59E0B",
                });
                
                setLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true })
                ]).start();
            }
        });

        return () => unsub();
    }, []);

    const handleReasonSelect = (reason: string) => {
        if (!selectedUserToBlock || !auth.currentUser) return;
        const targetId = selectedUserToBlock.id;
        
        const alreadyBlocked = Array.isArray(stats?.blockedUsers) && stats.blockedUsers.includes(targetId);
        
        if (alreadyBlocked) {
            Alert.alert("ALREADY RESTRICTED", "You have already restricted this user. Remove restriction first.");
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM RESTRICTION",
            `Are you sure you want to restrict ${selectedUserToBlock.name}?\n\nReason: ${reason}`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "YES, RESTRICT", 
                    style: "destructive",
                    onPress: () => executeBlockUser(reason, targetId)
                }
            ]
        );
    };

    const executeBlockUser = async (reason: string, targetId: string) => {
        setIsBlocking(true);
        const expertId = auth.currentUser!.uid;

        try {
            await updateDoc(doc(db, "users", expertId), { blockedUsers: arrayUnion(targetId) });
            await updateDoc(doc(db, "users", targetId), { expertBlockCount: increment(1) });
            await addDoc(collection(db, "admin_alerts"), {
                type: 'EXPERT_BLOCKED_USER', expertId: expertId, expertName: stats?.name || "Host",
                userId: targetId, userName: selectedUserToBlock!.name, reason: reason,
                timestamp: serverTimestamp(), status: 'unread'
            });

            Alert.alert("SUCCESS", `${selectedUserToBlock!.name} has been restricted and reported.`);
        } catch (error) {
            console.error("Block Error:", error);
            Alert.alert("ERROR", "Could not restrict the user. Please try again.");
        } finally {
            setIsBlocking(false); setBlockModalVisible(false); setSelectedUserToBlock(null);
        }
    };

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: theme.primary, borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80', borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary, borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80', borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const renderExpertHistoryItem = (item: any, index: number) => {
        const uniqueKey = item.id ? `${item.id}-${index}-${item.type}` : `log-${index}`;
        let iconName = "swap-horizontal";
        let iconColor = "#94A3B8";
        let amountValue = Number(item.beans) || Number(item.expertEarnings) || 0;
        let titleText = item.giftName || item.title || item.type || 'Transaction';
        
        const itemType = String(item.type || '').toLowerCase();
        const targetUserName = item.callerName || item.senderName || 'User';

        if (itemType === 'video_call') {
            iconName = "video-vintage"; iconColor = theme.primary; 
            titleText = item.callerName ? `Call with ${item.callerName}` : "Call Reward";
        } else if (itemType.includes('gift')) {
            iconName = "gift"; iconColor = theme.secondary; 
            let baseTitle = itemType === 'live_gift' ? "Broadcast Reward" : itemType === 'party_gift' ? "Forum Reward" : "Private Reward";
            titleText = `${baseTitle} (from ${targetUserName})`;
        } else if (itemType.includes('game')) {
            iconName = "dice-multiple"; iconColor = "#F59E0B";
            titleText = itemType === 'live_game_bonus' ? "Broadcast Activity Reward" : "Forum Activity Reward";
        } else if (itemType === 'daily_bonus') {
            iconName = "star-shooting"; iconColor = "#8B5CF6";
            titleText = item.giftName || 'Daily Mission Bonus';
        }

        const timeVal = item.timestamp || item.createdAt;
        let displayTime = 'Recent';
        if (timeVal?.toDate) displayTime = timeVal.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        else if (timeVal?.seconds) displayTime = new Date(timeVal.seconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        const itemBorder = index % 2 === 0 ? borderType2 : borderType1;

        return (
            <View key={uniqueKey} style={[styles.historyCard, itemBorder]}>
                <View style={[styles.historyIconBox, { backgroundColor: iconColor + '20', borderColor: iconColor + '40' }]}>
                    <MaterialCommunityIcons name={iconName as any} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12, paddingRight: 8, justifyContent: 'center' }}>
                    <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{titleText}</Text>
                    <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{displayTime}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={[styles.historyAmount, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        +{amountValue.toLocaleString()} 🎖️
                    </Text>
                    <Text style={[styles.historyStatus, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        ACQUIRED
                    </Text>
                </View>
            </View>
        );
    };

    const renderLeaderboardItem = (user: any, index: number) => {
        let rankColor = theme.primary;
        let rankGradient = ['rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.45)'];
        let iconName = "medal-outline";
        let isTop3 = false;

        if (index === 0) { rankColor = '#F59E0B'; rankGradient = ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.05)']; iconName = "crown"; isTop3 = true; }
        else if (index === 1) { rankColor = '#94A3B8'; rankGradient = ['rgba(148, 163, 184, 0.25)', 'rgba(148, 163, 184, 0.05)']; iconName = "crown"; isTop3 = true; }
        else if (index === 2) { rankColor = '#D97706'; rankGradient = ['rgba(217, 119, 6, 0.25)', 'rgba(217, 119, 6, 0.05)']; iconName = "crown"; isTop3 = true; }

        const isMe = user.id === auth.currentUser?.uid;
        const uConfig = getLevelConfig(user.totalBeansEarned || 0);

        const scaleAnim = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] }) : 1;
        const translateYAnim = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) : 0;
        const glowOpacity = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.8, 0.3] }) : 0;

        return (
            <Animated.View
                key={`rank-${user.id}-${index}`}
                style={{
                    marginBottom: 16,
                    transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                    shadowColor: rankColor,
                    shadowOpacity: glowOpacity,
                    shadowRadius: isTop3 ? 12 : 0,
                    elevation: isTop3 ? 8 : 0,
                }}
            >
                <LinearGradient
                    colors={isMe && !isTop3 ? [theme.primary + '30', theme.primary + '10'] : (rankGradient as any)}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12, 
                        borderRadius: 24,
                        borderWidth: isTop3 || isMe ? 1.5 : 1,
                        borderColor: isTop3 ? rankColor : (isMe ? theme.accent : 'rgba(255,255,255,0.1)'),
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {isTop3 && (
                        <View style={{ position: 'absolute', right: -20, bottom: -25, opacity: 0.1 }}>
                            <MaterialCommunityIcons name={iconName as any} size={110} color={rankColor} style={{ transform: [{ rotate: '15deg' }] }} />
                        </View>
                    )}

                    <View style={{
                        width: 40, height: 40, borderRadius: 20, 
                        backgroundColor: isTop3 ? rankColor : 'rgba(255,255,255,0.05)',
                        justifyContent: 'center', alignItems: 'center',
                        shadowColor: rankColor, shadowOpacity: isTop3 ? 0.5 : 0, shadowRadius: 6, elevation: 5,
                        marginRight: 10, 
                        position: 'relative',
                        flexShrink: 0
                    }}>
                        {isTop3 ? (
                            <MaterialCommunityIcons name={iconName as any} size={20} color="#000" style={{ marginTop: -2 }} />
                        ) : (
                            <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '900' }}>{index + 1}</Text>
                        )}
                        {isTop3 && (
                            <View style={{ position: 'absolute', bottom: -6, backgroundColor: '#000', paddingHorizontal: 6, borderRadius: 6, borderWidth: 1, borderColor: rankColor }}>
                                <Text style={{ color: rankColor, fontSize: 9, fontWeight: '900' }}>#{index + 1}</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ position: 'relative', flexShrink: 0 }}>
                        <Image
                            source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=0F172A&color=fff` }}
                            style={{
                                width: 48, height: 48, borderRadius: 18, 
                                borderWidth: 2, borderColor: isTop3 ? rankColor : 'rgba(255,255,255,0.15)'
                            }}
                        />
                        {isMe && (
                            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: theme.primary, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#020617' }} />
                        )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8, justifyContent: 'center' }}>
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5, lineHeight: 22 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {user.name || 'Host'} {isMe && <Text style={{ color: theme.accent, fontSize: 12 }}> (You)</Text>}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: uConfig.colors[0] + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                                <Text style={{ color: uConfig.colors[0], fontSize: 9, fontWeight: '900' }}>L{uConfig.lvl}</Text>
                            </View>
                            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                                {uConfig.label}
                            </Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>REWARDS</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <Text style={{ fontSize: 12, marginRight: 4 }}>🎖️</Text>
                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '900' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {user.totalBeansEarned?.toLocaleString() || 0}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    if (loading) return (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, { color: theme.primary }]}>CALIBRATING HUB...</Text>
        </View>
    );

    const currentMilestone = milestones[activeTab] || milestones[0];
    const progress = Math.min(stats?.todayBeans / currentMilestone.target, 1);
    const isCompleted = stats?.todayBeans >= currentMilestone.target;

    return (
        <View style={{ flex: 1, backgroundColor: '#020617' }}>
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 150}}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    
                    <View style={styles.eliteHeroWrapper}>
                        <LinearGradient colors={[theme.primary, theme.secondary, '#020617']} start={{x:0, y:0}} end={{x:1, y:1}} style={[styles.eliteHeroCard, borderType1]}>
                            <View style={styles.cyberCircle} />
                            <View style={styles.cyberCircleSmall} />
                            
                            <View style={styles.heroHeaderRow}>
                                <View style={styles.systemStatusBox}>
                                    <View style={styles.pulseDot} />
                                    <Text style={styles.systemStatusText}>ANALYTICS ACTIVE</Text>
                                </View>
                                <View style={[styles.statusTag, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                                    <MaterialCommunityIcons name="star-circle" size={14} color={theme.accent} />
                                    <Text style={[styles.statusTagText, { color: theme.accent }]}>{config.label}</Text>
                                </View>
                            </View>

                            <View style={styles.revenueDisplay}>
                                <Text style={styles.revenueTitle}>GLOBAL GAINED REWARDS STREAM</Text>
                                <View style={styles.revenueNumberContainer}>
                                    <Text style={[styles.revenueSymbol, { color: theme.accent }]}>🎖️</Text>
                                    <Text style={styles.revenueMainValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{stats?.totalBeansEarned?.toLocaleString()}</Text>
                                    <Text style={[styles.revenueMainUnit, { color: theme.accent }]}>REWARDS</Text>
                                </View>
                            </View>

                            <View style={styles.heroSummaryGrid}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>LAST INTERACTION</Text>
                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{stats?.lastCaller}</Text>
                                </View>
                                <View style={styles.vLine} />
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>KEY USER</Text>
                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{stats?.topFanName}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.tabsRow}>
                        <TouchableOpacity style={[styles.tabBtn, mainTab === 'STATS' && styles.tabBtnActive]} onPress={() => setMainTab('STATS')}>
                            <Text style={[styles.tabText, mainTab === 'STATS' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>STATS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tabBtn, mainTab === 'MONTHLY' && styles.tabBtnActive]} onPress={() => setMainTab('MONTHLY')}>
                            <Text style={[styles.tabText, mainTab === 'MONTHLY' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>MONTHLY</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tabBtn, mainTab === 'LEADERBOARD' && styles.tabBtnActive]} onPress={() => setMainTab('LEADERBOARD')}>
                            <Text style={[styles.tabText, mainTab === 'LEADERBOARD' && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>RANKING</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuBox}>
                        
                        {mainTab === 'STATS' && (
                            <View>
                                <Text style={styles.subHeading}>PERFORMANCE MATRIX</Text>
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="time-outline" label="Today Session" value={`${stats?.todayMins}m`} color={theme.primary} borderStyle={borderType2} />
                                        <MatrixBox icon="people-outline" label="Today Calls" value={stats?.todayCalls} color={theme.primary} borderStyle={borderType1} />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="stats-chart-outline" label="Total Time" value={`${stats?.displayMins}m`} color={theme.primary} borderStyle={borderType1} />
                                        <MatrixBox icon="cash-outline" label="Paid Out" value={`₹${stats?.totalWithdrawn}`} color="#EF4444" borderStyle={borderType2} />
                                    </View>
                                </View>

                                <Text style={styles.subHeading}>REWARD BREAKDOWN</Text>
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="videocam" label="Call Earnings" value={`🎖️${breakdown.calls.toLocaleString()}`} color={theme.primary} borderStyle={borderType2} />
                                        <MatrixBox icon="gift" label="Call Rewards" value={`🎖️${breakdown.callGifts.toLocaleString()}`} color={theme.primary} borderStyle={borderType1} />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="broadcast" iconFamily="MaterialCommunityIcons" label="Broadcast Rewards" value={`🎖️${breakdown.liveGifts.toLocaleString()}`} color={theme.secondary} borderStyle={borderType1} />
                                        <MatrixBox icon="party-popper" iconFamily="MaterialCommunityIcons" label="Forum Rewards" value={`🎖️${breakdown.partyGifts.toLocaleString()}`} color={theme.secondary} borderStyle={borderType2} />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="dice-multiple" iconFamily="MaterialCommunityIcons" label="Broadcast Activity" value={`🎖️${breakdown.liveGames.toLocaleString()}`} color="#F59E0B" borderStyle={borderType2} />
                                        <MatrixBox icon="dice-multiple" iconFamily="MaterialCommunityIcons" label="Forum Activity" value={`🎖️${breakdown.partyGames.toLocaleString()}`} color="#EC4899" borderStyle={borderType1} />
                                    </View>
                                </View>

                                <View style={styles.dailyFlowContainer}>
                                    <BlurView intensity={20} tint="dark" style={[styles.holoFlowCardWrapper, borderType1]}>
                                        <LinearGradient 
                                            colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)', 'transparent']} 
                                            start={{x:0, y:0}} end={{x:1, y:1}} 
                                            style={[styles.dailyFlowPill, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                                        >
                                            <View style={[styles.flowIconGlow, { backgroundColor: '#F59E0B' }]} />
                                            <View style={[styles.flowIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.5)' }]}>
                                                 <MaterialCommunityIcons name="gift-outline" size={24} color="#F59E0B" />
                                            </View>
                                            <View style={styles.flowTextContainer}>
                                                <Text style={styles.flowLabel} numberOfLines={1} adjustsFontSizeToFit>LIFETIME REWARDS & ACTIVITIES</Text>
                                            </View>
                                            <View style={styles.flowValueNode}>
                                                <View style={[styles.flowValueGlow, { backgroundColor: '#F59E0B' }]} />
                                                <View style={[styles.flowValueBox, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(245, 158, 11, 0.5)' }]}>
                                                    <Text style={[styles.flowBeanSymbol, {color: '#F59E0B', marginRight: 4}]}>🎖️</Text>
                                                    <Text style={[styles.flowValText, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                                        {(breakdown.totalDeepGifts > 0 ? breakdown.totalDeepGifts : Math.floor((Number(stats?.totalDiamondsReceived) || 0) / 2)).toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </BlurView>
                                </View>

                                <Text style={styles.subHeading}>MISSION: DAILY GOAL</Text>
                                <LinearGradient 
                                    colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)']} 
                                    style={[styles.massChallengeCard, borderType1, isCompleted && { borderLeftColor: '#10B981', borderRightColor: '#10B981' }]}
                                >
                                    <View style={styles.massChallengeHeader}>
                                        <View style={styles.massHeaderLeft}>
                                            <View style={[styles.missionIconRing, { borderColor: isCompleted ? '#10B981' : theme.primary }]}>
                                                <Ionicons name={isCompleted ? "checkmark-circle" : "rocket"} size={22} color={isCompleted ? '#10B981' : theme.primary} />
                                            </View>
                                            <View style={styles.missionTextGroup}>
                                                <Text style={[styles.missionMainTitle, { color: isCompleted ? '#10B981' : '#FFF' }]}>
                                                    {currentMilestone.label} MISSION
                                                </Text>
                                                <Text style={styles.missionSubText}>Reach {currentMilestone.target.toLocaleString()} Rewards to unlock</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.bountyBox, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : theme.primary + '20', borderColor: isCompleted ? '#10B981' : theme.primary }]}>
                                            <Text style={styles.bountyLabel}>REWARDS</Text>
                                            <Text style={[styles.bountyValue, { color: isCompleted ? '#10B981' : theme.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{currentMilestone.bonus.toLocaleString()}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.holoTabContainer}>
                                        {milestones.map((m, index) => {
                                            const isTabActive = activeTab === index;
                                            return (
                                                <TouchableOpacity 
                                                    key={index} 
                                                    onPress={() => setActiveTab(index)} 
                                                    style={[
                                                        styles.holoTab, 
                                                        isTabActive && { backgroundColor: theme.primary + '30', borderColor: theme.primary }
                                                    ]}
                                                    activeOpacity={0.7}
                                                >
                                                    {isTabActive && <View style={[styles.holoTabGlow, { backgroundColor: theme.primary }]} />}
                                                    <Text style={[styles.holoTabText, isTabActive && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <View style={styles.quantumProgressContainer}>
                                        <View style={styles.quantumProgressHeader}>
                                            <Text style={styles.quantumProgressLabel}>CORE SYNC STATUS</Text>
                                            <Text style={[styles.quantumProgressPct, { color: isCompleted ? '#10B981' : theme.primary }]}>
                                                {Math.round(progress * 100)}%
                                            </Text>
                                        </View>
                                        <View style={styles.quantumTrack}>
                                            <Animated.View 
                                                style={[
                                                    styles.quantumFill, 
                                                    { 
                                                        width: `${progress * 100}%`, 
                                                        backgroundColor: isCompleted ? '#10B981' : theme.primary,
                                                        shadowColor: isCompleted ? '#10B981' : theme.primary
                                                    }
                                                ]} 
                                            />
                                        </View>
                                        <View style={styles.quantumFooter}>
                                            <Text style={styles.quantumCollected}>{stats?.todayBeans?.toLocaleString()} / {currentMilestone.target.toLocaleString()}</Text>
                                            <Text style={[styles.quantumRemaining, isCompleted && { color: '#10B981' }]}>
                                                {isCompleted ? 'TRANSMISSION COMPLETE' : `${(currentMilestone.target - stats?.todayBeans).toLocaleString()} REWARDS REMAINING`}
                                            </Text>
                                        </View>
                                    </View>
                                </LinearGradient>

                                <Text style={styles.subHeading}>VIP INSIGHTS</Text>
                                <LinearGradient colors={['rgba(30, 41, 59, 0.4)', 'rgba(2, 6, 23, 0.9)']} style={[styles.insightPremiumCard, borderType2]}>
                                    <View style={[styles.insightIconRing, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                                         <MaterialCommunityIcons name="trophy-variant" size={26} color={theme.accent} />
                                    </View>
                                    <View style={{flex: 1, marginLeft: 15}}>
                                        <Text style={[styles.insightTopTitle, { color: theme.accent }]}>TOP LOYALTY RECORD</Text>
                                        <Text style={styles.insightDescription}>Maximum focus: <Text style={{color: '#FFF', fontWeight: '900'}}>{stats?.longestCallDisplay} minutes</Text> single session.</Text>
                                    </View>
                                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                                </LinearGradient>
                            </View>
                        )}

                        {mainTab === 'MONTHLY' && (
                            <View>
                                <View style={{ alignItems: 'center', marginBottom: 25, marginTop: 10 }}>
                                     <Text style={[styles.totalTalkLabel, { color: theme.primary, marginBottom: 5 }]}>LIFETIME REWARDS ACCUMULATED</Text>
                                     <Text style={{color: '#FFF', fontSize: 34, fontWeight: '900', letterSpacing: -1}} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                         {stats?.totalBeansEarned?.toLocaleString() || 0} 🎖️
                                     </Text>
                                </View>

                                {historyLoading ? (
                                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                        <ActivityIndicator size="large" color={theme.primary} />
                                        <Text style={{ color: theme.primary, marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>DECRYPTING ARCHIVES...</Text>
                                    </View>
                                ) : yearlyEarnings.length > 0 ? yearlyEarnings.map((y, yIdx) => {
                                    const isYearExpanded = expandedYear === y.year;

                                    return (
                                        <View key={`year-group-${yIdx}`} style={{ marginBottom: 15 }}>
                                            <TouchableOpacity 
                                                style={[
                                                    styles.historyCard, borderType1, 
                                                    { 
                                                        borderColor: isYearExpanded ? theme.accent : theme.primary, 
                                                        backgroundColor: isYearExpanded ? theme.primary + '15' : 'rgba(15, 23, 42, 0.45)',
                                                        marginBottom: isYearExpanded ? 15 : 0
                                                    }
                                                ]}
                                                activeOpacity={0.8}
                                                onPress={() => setExpandedYear(isYearExpanded ? null : y.year)}
                                            >
                                                <View style={[styles.historyIconBox, { backgroundColor: theme.primary + '30', borderColor: theme.primary + '50' }]}>
                                                    <MaterialCommunityIcons name="calendar-multiselect" size={24} color={theme.accent} />
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 15 }}>
                                                    <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit>{y.year}</Text>
                                                    <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{y.months.length} Months Active</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 10, flexShrink: 1 }}>
                                                    <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                                                        <Text style={[styles.historyAmount, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{y.total.toLocaleString()} 🎖️</Text>
                                                        <Text style={[styles.historyStatus, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>YEAR TOTAL</Text>
                                                    </View>
                                                    <Ionicons name={isYearExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.accent} style={{marginLeft: 5}} />
                                                </View>
                                            </TouchableOpacity>

                                            {isYearExpanded && (
                                                <View style={{ paddingLeft: 15, paddingRight: 0 }}>
                                                    {y.months.map((m, mIdx) => {
                                                        const monthUniqueKey = `${y.year}-${m.month}`;
                                                        const isMonthExpanded = expandedMonth === monthUniqueKey;

                                                        return (
                                                            <View key={`month-group-${mIdx}`} style={{ marginBottom: 10 }}>
                                                                <TouchableOpacity 
                                                                    style={[
                                                                        styles.historyCard, borderType2, 
                                                                        { 
                                                                            borderColor: isMonthExpanded ? theme.accent : theme.secondary, 
                                                                            backgroundColor: isMonthExpanded ? theme.secondary + '15' : 'rgba(15, 23, 42, 0.45)',
                                                                            marginBottom: isMonthExpanded ? 10 : 0,
                                                                            padding: 12
                                                                        }
                                                                    ]}
                                                                    activeOpacity={0.8}
                                                                    onPress={() => setExpandedMonth(isMonthExpanded ? null : monthUniqueKey)}
                                                                >
                                                                    <View style={[styles.historyIconBox, { backgroundColor: theme.secondary + '30', borderColor: theme.secondary + '50', width: 40, height: 40 }]}>
                                                                        <MaterialCommunityIcons name="calendar-month" size={20} color={theme.accent} />
                                                                    </View>
                                                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                                                        <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit>{m.month} {y.year}</Text>
                                                                        <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{m.logs.length} Transactions</Text>
                                                                    </View>
                                                                    <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 10, flexShrink: 1 }}>
                                                                        <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                                                                            <Text style={[styles.historyAmount, { color: '#10B981', fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{m.total.toLocaleString()} 🎖️</Text>
                                                                        </View>
                                                                        <Ionicons name={isMonthExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.accent} style={{marginLeft: 5}} />
                                                                    </View>
                                                                </TouchableOpacity>

                                                                {isMonthExpanded && (
                                                                    <View style={{ paddingLeft: 10, paddingRight: 5 }}>
                                                                        {m.logs.map((log, logIdx) => renderExpertHistoryItem(log, logIdx))}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </View>
                                    );
                                }) : (
                                    <View style={styles.emptyBox}>
                                        <MaterialCommunityIcons name="calendar-blank" size={48} color="rgba(255,255,255,0.2)" />
                                        <Text style={styles.emptyText}>No monthly earnings recorded yet.</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {mainTab === 'LEADERBOARD' && (
                            <View style={{ marginTop: 10 }}>
                                <View style={{ alignItems: 'center', marginBottom: 25 }}>
                                    <Text style={[styles.totalTalkLabel, { color: theme.primary, marginBottom: 5 }]}>GLOBAL TOP PERFORMERS (LIFETIME)</Text>
                                    <Text style={{color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5}}>LEADERBOARD</Text>
                                </View>
                                
                                {isLeaderboardLoading ? (
                                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                        <ActivityIndicator size="large" color={theme.primary} />
                                        <Text style={{ color: theme.primary, marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>SYNCING RANKS...</Text>
                                    </View>
                                ) : leaderboardData.length > 0 ? (
                                    leaderboardData.map((user, index) => renderLeaderboardItem(user, index))
                                ) : (
                                    <View style={styles.emptyBox}>
                                        <MaterialCommunityIcons name="trophy-broken" size={48} color="rgba(255,255,255,0.2)" />
                                        <Text style={styles.emptyText}>No rankings available yet.</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>

            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: theme.primary }]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>RESTRICT USER</Text>
                            <Text style={styles.modalSubText}>
                                Prevent {selectedUserToBlock?.name} from contacting you.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>SELECT REASON:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: theme.primary + '40' }]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                            </TouchableOpacity>
                        ))}

                        {isBlocking && (
                            <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
                        )}

                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setBlockModalVisible(false)}
                            disabled={isBlocking}
                        >
                            <Text style={styles.cancelBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const MatrixBox = ({ icon, label, value, color, borderStyle, iconFamily = "Ionicons" }: any) => (
    <View style={[styles.matrixCardWrapper, borderStyle]}>
        <BlurView intensity={15} tint="dark" style={styles.matrixCard}>
            <View style={[styles.matrixIconCircle, { backgroundColor: color + '15' }]}>
                {iconFamily === 'Ionicons' ? (
                    <Ionicons name={icon} size={22} color={color} />
                ) : (
                    <MaterialCommunityIcons name={icon} size={22} color={color} />
                )}
            </View>
            <View style={{alignItems: 'center', width: '100%', paddingHorizontal: 5, flexShrink: 1}}>
                <Text style={styles.matrixValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{value}</Text>
                <Text style={styles.matrixLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
            </View>
            <View style={[styles.bottomGlowLine, { backgroundColor: color }]} />
        </BlurView>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#020617' },
    loaderText: { marginTop: 15, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },

    subHeading: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 15, marginTop: 40, textTransform: 'uppercase' },
    eliteHeroWrapper: { width: '100%', marginTop: 10 },
    eliteHeroCard: { borderRadius: 40, padding: 25, overflow: 'hidden', elevation: 20 },
    cyberCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.03)' },
    cyberCircleSmall: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
    heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
    systemStatusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 8 },
    systemStatusText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    statusTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    revenueDisplay: { marginBottom: 35 },
    revenueTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    revenueNumberContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, flexWrap: 'nowrap' },
    revenueSymbol: { fontSize: 24, fontWeight: '800', marginRight: 5 },
    revenueMainValue: { color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -1, flexShrink: 1 },
    revenueMainUnit: { fontSize: 14, fontWeight: '800', marginLeft: 10 },
    heroSummaryGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 18, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    summaryItem: { flex: 1, overflow: 'hidden' }, 
    summaryLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '900', marginBottom: 4 },
    summaryValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    vLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
    matrixGrid: { gap: 15 },
    matrixRow: { flexDirection: 'row', gap: 15 },
    matrixCardWrapper: { flex: 1, borderRadius: 30, overflow: 'hidden' },
    matrixCard: { padding: 22, alignItems: 'center', width: '100%' },
    matrixIconCircle: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    matrixValue: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
    matrixLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
    bottomGlowLine: { position: 'absolute', bottom: 0, width: '40%', height: 3, borderRadius: 2 },
    
    dailyFlowContainer: { marginTop: 15, marginBottom: 5 },
    holoFlowCardWrapper: { borderRadius: 30, overflow: 'hidden' },
    dailyFlowPill: { flexDirection: 'row', alignItems: 'center', padding: 20, borderWidth: 1, position: 'relative' },
    flowIconGlow: { position: 'absolute', top: 20, left: 20, width: 50, height: 50, borderRadius: 25, opacity: 0.3, filter: 'blur(10px)' },
    flowIconBox: { width: 56, height: 56, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, zIndex: 2 },
    flowTextContainer: { flex: 1, paddingLeft: 18, justifyContent: 'center' },
    flowLabel: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    flowSub: { fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
    flowValueNode: { position: 'relative', flexShrink: 1, maxWidth: '40%' },
    flowValueGlow: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, opacity: 0.5, filter: 'blur(8px)' },
    flowValueBox: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, zIndex: 2 },
    flowValText: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, flexShrink: 1 },
    flowBeanSymbol: { fontSize: 16, fontWeight: '900' },
    
    massChallengeCard: { borderRadius: 35, padding: 25, elevation: 15 },
    massChallengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    massHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    missionIconRing: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.3)' },
    missionTextGroup: { marginLeft: 15, flex: 1 },
    missionMainTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    missionSubText: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 3 },
    bountyBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, maxWidth: '35%' },
    bountyLabel: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2, opacity: 0.8 },
    bountyValue: { fontSize: 14, fontWeight: '900', flexShrink: 1 },
    
    holoTabContainer: { flexDirection: 'row', gap: 10, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 20 },
    holoTab: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', position: 'relative', overflow: 'hidden' },
    holoTabGlow: { position: 'absolute', bottom: 0, width: '50%', height: 2, borderRadius: 2, elevation: 5, shadowOpacity: 1, shadowRadius: 5 },
    holoTabText: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    
    quantumProgressContainer: { backgroundColor: 'rgba(0,0,0,0.25)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    quantumProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
    quantumProgressLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    quantumProgressPct: { fontSize: 18, fontWeight: '900' },
    quantumTrack: { width: '100%', height: 8, backgroundColor: '#020617', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    quantumFill: { height: '100%', borderRadius: 4, elevation: 10, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    quantumFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quantumCollected: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    quantumRemaining: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    insightPremiumCard: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 30 },
    insightIconRing: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    insightTopTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    insightDescription: { color: '#94A3B8', fontSize: 13, marginTop: 5, lineHeight: 20 },

    menuBox: { paddingHorizontal: 0, marginTop: 10 },
    tabsRow: { flexDirection: 'row', marginHorizontal: 0, marginTop: 10, marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'space-between' },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent', overflow: 'hidden' }, 
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
    tabText: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tabTextActive: { color: '#FFF' },
    
    filterPill: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
    filterPillText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
    historyIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    historyTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5, lineHeight: 20 },
    historyDate: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    historyAmount: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    historyStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    emptyBox: { alignItems: 'center', marginTop: 20, marginBottom: 20, opacity: 0.7 },
    emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    talktimeHighlight: { alignItems: 'center' },
    totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});