import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    collectionGroup,
    doc,
    onSnapshot,
    query,
    runTransaction,
    where
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    PanResponder,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

    const { width, height } = Dimensions.get('window');
    const AnimatedCircle = Animated.createAnimatedComponent(Circle);
    const AnimatedPath = Animated.createAnimatedComponent(Path);

    // 🎨 IMAGES (neenga eppo venumnaalum maathikalam - load aagala-na kooda design break aagaadhu)
    const HERO_BG = 'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?q=80&w=1200&auto=format&fit=crop';
    const FEATURE_BG = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop';
    const VAULT_BG = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';

    // 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a 3D orb fallback varum
    const IMG = {
        crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
        trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
        diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
        gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
        money: 'https://img.icons8.com/3d-fluency/512/money-bag.png',
        wallet: 'https://img.icons8.com/3d-fluency/512/wallet.png',
        video: 'https://img.icons8.com/3d-fluency/512/video-call.png',
        clock: 'https://img.icons8.com/3d-fluency/512/alarm-clock.png',
        star: 'https://img.icons8.com/3d-fluency/512/star.png',
        shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
        // 🆕 command center 3D icons (load aagalana 3D orb fallback varum)
        user: 'https://img.icons8.com/3d-fluency/512/user-male-circle.png',
        history: 'https://img.icons8.com/3d-fluency/512/time-machine.png',
        network: 'https://img.icons8.com/3d-fluency/512/conference-call.png',
        vault: 'https://img.icons8.com/3d-fluency/512/safe.png',
        support: 'https://img.icons8.com/3d-fluency/512/headset.png',
        privacy: 'https://img.icons8.com/3d-fluency/512/lock.png',
    };

    // 🆕 COLOR HELPERS (8-digit hex like '#f52b6092' kooda safe-a handle pannum)
    const norm = (hex: string) => {
        const h = String(hex || '#000000');
        return h.length >= 7 ? h.slice(0, 7) : h;
    };
    const hexToRgb = (hex: string) => {
        const h = norm(hex).replace('#', '');
        if (h.length !== 6) return null;
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    };
    const blend = (c1: string, c2: string, t: number) => {
        const a = hexToRgb(c1);
        const b = hexToRgb(c2);
        if (!a || !b) return norm(c1);
        const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
        return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
    };
    const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);
    const lum = (hex: string) => {
        const c = hexToRgb(hex);
        if (!c) return 0;
        return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    };
    // romba dark colour dark screen-la theriyaadhu -> konjam lighten pannidum (text / lines ku)
    const textSafe = (hex: string, min = 0.55) => {
        const l = lum(hex);
        if (l >= min) return norm(hex);
        return lighten(hex, Math.min(0.7, (min - l) / (1 - l)));
    };
    const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));
    // 🆕 dark colours-a screen-la theriyara maathiri konjam brighten pannum
    const vis = (hex: string) => {
        const c = norm(hex);
        return lum(c) < 0.22 ? lighten(c, 0.5) : c;
    };
    // 🆕 cubic bezier point (road map-la progress avatar-a path mela vaikka)
    const cubicPt = (p0: any, p1: any, p2: any, p3: any, t: number) => {
        const u = 1 - t;
        return {
            x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
            y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
        };
    };

    // ================= 🆕 PREMIUM COMPONENTS =================

    // 🆕🆕 NEW: 3D ORB ICON - gradient sphere + gloss + shine (image illaadha idathula-um 3D-ah theriyum)
    const Orb3D = ({ size = 44, color = '#6366F1', icon = 'star', glow = true, locked = false, iconColor = '#FFF', style }: any) => {
        const colV = vis(color);
        const d = size * 0.92;
        return (
            <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
                {glow && !locked && (
                    <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colV, opacity: 0.3 }} />
                )}
                <LinearGradient
                    colors={locked ? ['#334155', '#0F172A'] : [lighten(colV, 0.5), colV, blend(colV, '#000000', 0.55)]}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={{ width: d, height: d, borderRadius: d / 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.4)' }}
                >
                    <LinearGradient colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '48%' }} pointerEvents="none" />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', backgroundColor: 'rgba(0,0,0,0.18)' }} pointerEvents="none" />
                    <MaterialCommunityIcons
                        name={icon}
                        size={size * 0.46}
                        color={locked ? '#64748B' : iconColor}
                        style={{ textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } }}
                    />
                </LinearGradient>
            </View>
        );
    };

    // 🆕 3D image with auto 3D-orb fallback
    const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
        const [err, setErr] = useState(false);
        if (err) return <Orb3D size={size} color={color} icon={fallback} />;
        return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
    };

    // 🆕 Floating (bob + 3D sway) wrapper
    const FloatBox = ({ children, amp = 6, dur = 1800, style }: any) => {
        const v = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
                ])
            );
            loop.start();
            return () => loop.stop();
        }, []);
        return (
            <Animated.View
                style={[
                    style,
                    {
                        transform: [
                            { perspective: 600 },
                            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
                            { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) }
                        ]
                    }
                ]}
            >
                {children}
            </Animated.View>
        );
    };

    // 🆕 Twinkling sparkle
    const Sparkle = ({ x, y, size = 12, color = '#F5C84C', delay = 0, dur = 1800 }: any) => {
        const v = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
                ])
            );
            loop.start();
            return () => loop.stop();
        }, []);
        return (
            <Animated.View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    zIndex: 6,
                    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
                    transform: [
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
                    ]
                }}
            >
                <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
            </Animated.View>
        );
    };

    // 🆕 Entrance wrapper (3D flip-up + fade)
    const Enter = ({ children, delay = 0, style }: any) => {
        const a = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.spring(a, { toValue: 1, delay, friction: 7, tension: 55, useNativeDriver: true }).start();
        }, []);
        return (
            <Animated.View
                style={[
                    style,
                    {
                        opacity: a,
                        transform: [
                            { perspective: 900 },
                            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
                            { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['16deg', '0deg'] }) },
                            { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
                        ]
                    }
                ]}
            >
                {children}
            </Animated.View>
        );
    };

    // 🆕 Press-scale button
    const ScaleBtn = ({ children, onPress, style, wrapStyle, disabled }: any) => {
        const s = useRef(new Animated.Value(1)).current;
        return (
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={wrapStyle}
                onPressIn={() => Animated.spring(s, { toValue: 0.95, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
                onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
            >
                <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
            </Pressable>
        );
    };

    // 🆕 Count-up number
    const CountText = ({ value, style, suffix = '', locale = false, duration = 1300 }: any) => {
        const a = useRef(new Animated.Value(0)).current;
        const [shown, setShown] = useState(0);
        useEffect(() => {
            const id = a.addListener(({ value: v }) => setShown(Math.round(v)));
            Animated.timing(a, { toValue: Number(value) || 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
            return () => a.removeListener(id);
        }, [value]);
        return (
            <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                {locale ? shown.toLocaleString() : shown}{suffix}
            </Text>
        );
    };

    // 🆕 Rotating gradient border frame (running light around the card)
    const SpinFrame = ({ spin, colors, radius = 30, pad = 2.5, children, style, size = 760 }: any) => (
        <View style={[{ borderRadius: radius, overflow: 'hidden', padding: pad, backgroundColor: '#05030F' }, style]}>
            <Animated.View
                pointerEvents="none"
                style={{ position: 'absolute', top: '50%', left: '50%', width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: [{ rotate: spin }] }}
            >
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
            <View style={{ borderRadius: radius - pad, overflow: 'hidden' }}>{children}</View>
        </View>
    );

    // 🆕 Sliding-pill tab bar (old design - safe-ku appadiye irukku)
    const PTabs = ({ tabs, active, onChange, c1, c2 }: any) => {
        const [w, setW] = useState(0);
        const pos = useRef(new Animated.Value(0)).current;
        const idx = Math.max(0, tabs.findIndex((t: any) => t.key === active));
        useEffect(() => {
            Animated.spring(pos, { toValue: idx, friction: 8, tension: 70, useNativeDriver: true }).start();
        }, [idx]);
        const tabW = w / tabs.length;
        return (
            <View style={styles.pTabsWrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
                {w > 0 && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.pTabIndicator,
                            {
                                width: tabW - 8,
                                borderColor: lighten(c1, 0.4),
                                shadowColor: c1,
                                transform: [{ translateX: pos.interpolate({ inputRange: [0, tabs.length - 1], outputRange: [4, 4 + tabW * (tabs.length - 1)] }) }]
                            }
                        ]}
                    >
                        <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.pTabGloss} pointerEvents="none" />
                    </Animated.View>
                )}
                {tabs.map((t: any) => {
                    const on = t.key === active;
                    return (
                        <TouchableOpacity key={t.key} activeOpacity={0.8} style={styles.pTabItem} onPress={() => onChange(t.key)}>
                            <MaterialCommunityIcons name={t.icon} size={17} color={on ? '#FFF' : '#64748B'} />
                            <Text style={[styles.pTabText, on && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // 🆕🆕 FIX: 3D TILT CARD - ippo idle-a asaiyaadhu (blur varaadhu), thotta mattum tilt aagum + glare thotta nerathula mattum theriyum
    const TiltCard = ({ children, style, radius = 30, max = 12, sway }: any) => {
        const rx = useRef(new Animated.Value(0)).current;
        const ry = useRef(new Animated.Value(0)).current;
        const dims = useRef({ w: 320, h: 230 });
        const release = () => {
            Animated.parallel([
                Animated.spring(rx, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
                Animated.spring(ry, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
            ]).start();
        };
        const pan = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
                onPanResponderMove: (_, g) => {
                    ry.setValue(clamp(g.dx / (dims.current.w / 2)));
                    rx.setValue(clamp(g.dy / dims.current.h));
                },
                onPanResponderRelease: release,
                onPanResponderTerminate: release,
            })
        ).current;
        const rotateX = rx.interpolate({ inputRange: [-1, 1], outputRange: [`${max}deg`, `-${max}deg`] });
        const rotateY = ry.interpolate({ inputRange: [-1, 1], outputRange: [`-${max}deg`, `${max}deg`] });
        const glareX = ry.interpolate({ inputRange: [-1, 1], outputRange: [-150, 150] });
        const glareOp = ry.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 0, 1] });
        return (
            <Animated.View
                {...pan.panHandlers}
                onLayout={(e) => { dims.current = { w: e.nativeEvent.layout.width || 320, h: e.nativeEvent.layout.height || 230 }; }}
                style={[style, { transform: [{ perspective: 1000 }, { rotateX }, { rotateY }] }]}
            >
                {children}
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
                    <Animated.View style={[styles.glareStrip, { opacity: glareOp, transform: [{ translateX: glareX }, { rotate: '18deg' }] }]}>
                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.20)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                    </Animated.View>
                </View>
            </Animated.View>
        );
    };

    // 🆕🆕 NEW: RANK RING - SVG progress ring + 3D swinging rank coin
    const RankRing = ({ size, progress, sway, c1, c2, icon, pct }: any) => {
        const stroke = 7;
        const R = (size - stroke) / 2;
        const C = 2 * Math.PI * R;
        const offset = progress.interpolate({ inputRange: [0, 100], outputRange: [C, 0] });
        const coin = size - 28;
        const rotY = sway.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '24deg'] });
        return (
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                    <Defs>
                        <SvgGradient id="rkGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={c1} />
                            <Stop offset="1" stopColor={c2} />
                        </SvgGradient>
                    </Defs>
                    <Circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={R}
                        stroke="url(#rkGrad)"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={C}
                        strokeDashoffset={offset}
                    />
                </Svg>
                <Animated.View style={{ width: coin, height: coin, transform: [{ perspective: 600 }, { rotateY: rotY }] }}>
                    <LinearGradient colors={[lighten(c1, 0.4), c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rkCoin}>
                        <LinearGradient colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} style={styles.rkCoinGloss} pointerEvents="none" />
                        <MaterialCommunityIcons name={icon} size={coin * 0.5} color="#FFF" />
                    </LinearGradient>
                </Animated.View>
                <View style={[styles.rkPct, { borderColor: c1 + '88' }]}>
                    <Text style={[styles.rkPctText, { color: lighten(c1, 0.35) }]}>{pct}%</Text>
                </View>
            </View>
        );
    };

    // 🆕🆕 FIX: DOCK TAB ITEM - ippo 3D orb icon (flat symbol illa)
    const DockItem = ({ tab, active, onPress, c1 }: any) => {
        const a = useRef(new Animated.Value(active ? 1 : 0)).current;
        useEffect(() => {
            Animated.spring(a, { toValue: active ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
        }, [active]);
        const iconScale = a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
        const lift = a.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
        const labelOp = a.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
        return (
            <TouchableOpacity style={styles.dockItem} activeOpacity={0.8} onPress={onPress}>
                <Animated.View style={{ transform: [{ perspective: 500 }, { translateY: lift }, { scale: iconScale }] }}>
                    <Orb3D size={38} color={tab.color || c1} icon={tab.icon} glow={active} locked={false} />
                </Animated.View>
                <Animated.Text style={[styles.dockText, { opacity: labelOp, color: active ? '#FFF' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                    {tab.label}
                </Animated.Text>
            </TouchableOpacity>
        );
    };

    const DockTabs = ({ tabs, active, onChange, c1, c2 }: any) => {
        const [w, setW] = useState(0);
        const pos = useRef(new Animated.Value(0)).current;
        const idx = Math.max(0, tabs.findIndex((t: any) => t.key === active));
        useEffect(() => {
            Animated.spring(pos, { toValue: idx, friction: 8, tension: 70, useNativeDriver: true }).start();
        }, [idx]);
        const tabW = w / tabs.length;
        const ac = vis(tabs[idx]?.color || c1);
        return (
            <View style={styles.dockWrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
                <LinearGradient colors={[c1 + '22', 'rgba(0,0,0,0.55)', c2 + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                {w > 0 && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.dockGlow,
                            {
                                width: tabW,
                                transform: [{ translateX: pos.interpolate({ inputRange: [0, tabs.length - 1], outputRange: [0, tabW * (tabs.length - 1)] }) }]
                            }
                        ]}
                    >
                        <LinearGradient colors={['transparent', ac + '55']} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', lighten(ac, 0.45), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dockLine} />
                    </Animated.View>
                )}
                {tabs.map((t: any) => (
                    <DockItem key={t.key} tab={t} active={t.key === active} onPress={() => onChange(t.key)} c1={c1} />
                ))}
            </View>
        );
    };

    // 🆕🆕 NEW: DONUT (gifts vs calls split) - SVG
    const Donut = ({ size, stroke, giftPct, hasData, children }: any) => {
        const R = (size - stroke) / 2;
        const C = 2 * Math.PI * R;
        const L1 = (C * giftPct) / 100;
        const L2 = hasData ? C - L1 : 0;
        return (
            <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
                <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                    <Circle cx={size / 2} cy={size / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
                    {hasData && L1 > 0 && (
                        <Circle cx={size / 2} cy={size / 2} r={R} stroke="#A855F7" strokeWidth={stroke} fill="none" strokeDasharray={`${L1} ${C - L1}`} strokeDashoffset={0} />
                    )}
                    {hasData && L2 > 0 && (
                        <Circle cx={size / 2} cy={size / 2} r={R} stroke="#3B82F6" strokeWidth={stroke} fill="none" strokeDasharray={`${L2} ${C - L2}`} strokeDashoffset={-L1} />
                    )}
                </Svg>
                {children}
            </View>
        );
    };

    // 🆕🆕 NEW: animated metric bar
    const StripBar = ({ pct, color, delay = 0 }: any) => {
        const w = useRef(new Animated.Value(0)).current;
        useEffect(() => {
            Animated.timing(w, { toValue: pct, duration: 1100, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        }, [pct]);
        return (
            <View style={styles.stripTrack}>
                <Animated.View style={[styles.stripFill, { width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any }]}>
                    <LinearGradient colors={[color, lighten(color, 0.5)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
            </View>
        );
    };

    // 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT COLOR PROTOCOL LOCKED)
    const calculateUserLevel = (totalSpent: number) => {
    if (totalSpent >= 500000001) return { 
        lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', grad: ['#ff0000', '#660000'] as const, 
        themeBg: ['#1A0000', '#000000'], layout: 'stealth', anim: 'titan', radius: 40, avatarSize: 85, icon: 'fire-circle'
    }; 
    if (totalSpent >= 100000001) return { 
        lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', grad: ['#ff0dba', '#a50606'] as const, 
        themeBg: ['#15001A', '#000000'], layout: 'stealth', anim: 'mythic', radius: 40, avatarSize: 85, icon: 'lightning-bolt'
    }; 
    if (totalSpent >= 50000000) return { 
        lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', grad: ['#f6f60d', '#02fa0a'] as const, 
        themeBg: ['#08001A', '#000000'], layout: 'stealth', anim: 'grandmaster', radius: 40, avatarSize: 85, icon: 'shield-crown'
    };
    if (totalSpent >= 10000000) return { 
        lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', grad: ['#00F2FE', '#f52b6092'] as const, 
        themeBg: ['#00101A', '#000000'], layout: 'stealth', anim: 'explosion', radius: 40, avatarSize: 85, icon: 'target'
    };
    if (totalSpent >= 5000000) return { 
        lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', grad: ['#d0630a', '#5f0bf0'] as const, 
        themeBg: ['#0A001A', '#000000'], layout: 'stealth', anim: 'nebula', radius: 40, avatarSize: 80, icon: 'shield-airplane'
    };
    if (totalSpent >= 1000000) return { 
        lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', grad: ['#bcde4a', '#09bbf1fe'] as const, 
        themeBg: ['#001A0A', '#000000'], layout: 'stealth', anim: 'diamond', radius: 40, avatarSize: 80, icon: 'diamond-stone'
    };
    if (totalSpent >= 200001) return { 
        lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', grad: ['#ffae00', '#ac4a4a'] as const, 
        themeBg: ['#1A0B00', '#000000'], layout: 'stealth', anim: 'sparkle', radius: 40, avatarSize: 75, icon: 'trophy'
    };
    return { 
        lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', grad: ['#0f33e7', '#02216b'] as const, 
        themeBg: ['#050505', '#000000'], layout: 'stealth', anim: 'wave', radius: 40, avatarSize: 70, icon: 'shield-star'
    };
    };

    // 🔥 TIER ROADMAP DATA FOR DISPLAY
    const ALL_TIERS_ROADMAP = [
        { lvl: 1, req: 0, label: 'SILVER AGENT', color: '#0f33e7', icon: 'shield-star' },
        { lvl: 2, req: 200001, label: 'GOLD OPERATIVE', color: '#ffae00', icon: 'trophy' },
        { lvl: 3, req: 1000000, label: 'DIAMOND CORE', color: '#bcde4a', icon: 'diamond-stone' },
        { lvl: 4, req: 5000000, label: 'LEGENDARY NODE', color: '#d0630a', icon: 'shield-airplane' },
        { lvl: 5, req: 10000000, label: 'ELITE VETERAN', color: '#00F2FE', icon: 'target' },
        { lvl: 6, req: 50000000, label: 'GRANDMASTER', color: '#f6f60d', icon: 'shield-crown' },
        { lvl: 7, req: 100000001, label: 'MYTHIC RULER', color: '#ff0dba', icon: 'lightning-bolt' },
        { lvl: 8, req: 500000001, label: 'TITAN OVERSEER', color: '#ff0000', icon: 'fire-circle' }
    ];

    // 🆕🆕 FIX: tab list (same 3 tabs) - ippo ovvoru tab-kum own 3D orb colour
    const PROFILE_TABS = [
        { key: 'COMMANDS', label: 'COMMANDS', icon: 'console-line', color: '#6366F1' },
        { key: 'STATS', label: 'STATS', icon: 'chart-donut', color: '#A855F7' },
        { key: 'ROADMAP', label: 'ROAD MAP', icon: 'map-marker-path', color: '#F59E0B' },
    ];

    // 🆕 menu tile width (2 columns) - old layout constant, safe-ku appadiye irukku
    const TILE_W = (width - 32 - 12) / 2;

    // 🆕🆕 NEW: layout constants (hero card, stat orbs)
    const HERO_H = 232;
    const ORB_SIZE = 86;

    // 🆕🆕 NEW: ASCENT ROAD layout constants (road map)
    const RM_W = width - 32;
    const RM_ROW = 184;
    const RM_TOP = 74;
    const RM_NODE = 84;
    const RM_BOX = 98;
    const RM_LABEL_W = 150;
    const RM_TIERS = [...ALL_TIERS_ROADMAP].reverse(); // top = TITAN, bottom = SILVER (climb up!)
    const RM_H = RM_TOP + (RM_TIERS.length - 1) * RM_ROW + 150;
    const rmPt = (i: number) => ({ x: i % 2 === 0 ? RM_W * 0.28 : RM_W * 0.72, y: RM_TOP + i * RM_ROW });

    export default function ProfileScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [friendsCount, setFriendsCount] = useState(0);

    // 🔥 LEDGER STATE VARIABLES - ADDED ROADMAP TO TABS
    const [activeTab, setActiveTab] = useState<'COMMANDS' | 'STATS' | 'ROADMAP'>('COMMANDS');
    const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
    const [ledgerLoading, setLedgerLoading] = useState(true);
    const [totalRechargeDiamonds, setTotalRechargeDiamonds] = useState<number>(0); 
    const [totalGiftsSpent, setTotalGiftsSpent] = useState<number>(0);
    const [totalVideoCallSpent, setTotalVideoCallSpent] = useState<number>(0);
    const [totalSpentCalculated, setTotalSpentCalculated] = useState<number>(0); 
    const [totalMinutes, setTotalMinutes] = useState<number>(0);

    // 🌀 COMPLEX ANIMATION ENGINE MATRIX
    const scrollY = useRef(new Animated.Value(0)).current;
    const mainLoop = useRef(new Animated.Value(0)).current;
    const secondaryLoop = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🆕 NEW premium animation values
    const swayAnim = useRef(new Animated.Value(0)).current;       // rank coin 3D sway
    const pulseAnim = useRef(new Animated.Value(0)).current;      // glow pulse
    const progAnim = useRef(new Animated.Value(0)).current;       // rank progress fill (0-100)
    const dashAnim = useRef(new Animated.Value(0)).current;       // 🆕 road map marching dash
    const particles = useRef(
        Array.from({ length: 16 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 43) % 100) / 100 * width,
            y: 140 + ((i * 61) % 560),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 420,
        }))
    ).current;

    // 🆕 LEVEL-UP NOTIFICATION SYNC (remembers which level was already synced in this session)
    const levelSyncedRef = useRef<number>(0);

    useEffect(() => {
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();
        Animated.loop(Animated.timing(secondaryLoop, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
        
        Animated.loop(
            Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
            })
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
            Animated.delay(2000)
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
        ])).start();

        // 🆕 rank coin 3D sway + glow pulse
        Animated.loop(Animated.sequence([
            Animated.timing(swayAnim, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(swayAnim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])).start();

        // 🆕 road map dashed path "marching" (SVG prop - JS driver)
        Animated.loop(Animated.timing(dashAnim, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: false })).start();

        // 🆕 floating particles
        particles.forEach((p) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ).start();
        });
    }, []);

    // Fetch Base User Data
    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const userRef = doc(db, "users", user.uid);
        const unsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setFriendsCount(data.friendsCount || 0);
        }
        setLoading(false);
        });

        return () => { unsub(); };
    }, [user]);

    // 🔥 FETCH LEDGER & MERGED HISTORY DATA DYNAMICALLY 🔥
    useEffect(() => {
        if (!user || !userData) return;

        let rawTransactions: any[] = [];
        let rawGifts: any[] = [];
        let rawCalls: any[] = []; // 🔥 Fetching calls globally here to sync everything properly

        const processAllLogs = () => {
            
            // 🔥 NEW: Extracting In-Call Gifts directly from Calls Database to push to History Logs (WITH EXPERT NAME)
            const mappedCallGifts = rawCalls
                .filter(c => Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))) > 0)
                .map(c => ({
                    id: c.id + '_callgift',
                    _source: 'call_gifts',
                    type: 'GIFT',
                    title: 'In-Call Reward',
                    amount: Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))),
                    status: 'COMPLETED',
                    timestamp: c.endTime || c.createdAt || c.timestamp || c.startTime,
                    expertName: c.expertName || c.receiverName || c.toName || '', // 🔥 Expert Name mapped here
                    _enrichedName: c.expertName || c.receiverName || c.toName || ''
                }));

            // 🔥 SATTI FIX: We must EXCLUDE nested gifts if they belong to a Video Call (callId exists in rawCalls) to avoid Double Entry!
            // We use absolute amounts to map
            
            // Filter valid standalone gifts
            const myGifts = rawGifts.filter(g => {
                const isMine = g.senderId === user.uid || (g.senderName && userData.name && String(g.senderName).trim().toLowerCase() === String(userData.name).trim().toLowerCase());
                if (!isMine) return false;

                // Only keep gifts that are NOT tied to a call
                return !g.callId; 
            });

            // 🔥 EXTRACT EXPERT NAME FOR GIFTS (LIVE/FORUM)
            const enrichedGifts = myGifts.map(g => ({
                ...g,
                _enrichedName: g.expertName || g.receiverName || g.toName || g.hostName || g.creatorName || g.Name || ''
            }));

            // 🔥 EXTRACT EXPERT NAME FOR TRANSACTIONS (CALL)
            const validTransactions = rawTransactions.filter(t => {
                const typeStr = String(t.type).toUpperCase();
                return typeStr !== 'VOUCHER_REDEEM'; 
            }).map(t => {
                let enrichedName = t.expertName || t.receiverName || t.toName || t.hostName || t.creatorName || t.Name || '';
                // Cross-reference with Calls DB if name is missing
                if (!enrichedName && t.callId) {
                    const call = rawCalls.find(c => c.id === t.callId);
                    if (call) enrichedName = call.expertName || call.receiverName || '';
                }
                return { ...t, _enrichedName: enrichedName };
            });

            // Merge everything into history (🎮 Game logs removed - game is now free-to-play)
            const mergedLogs = [...validTransactions, ...enrichedGifts, ...mappedCallGifts];

            mergedLogs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
                return timeB - timeA;
            });

            setHistoryLogs(mergedLogs);

            // ================= STATS CALCULATION ENGINE =================

            // Calculate Video Call Minutes safely from rawCalls
            const totalSecs = rawCalls.reduce((acc, curr) => acc + (Number(curr.finalDuration) || Number(curr.duration) || 0), 0);
            setTotalMinutes(Math.floor(totalSecs / 60));
            
            // 1. Calculate Recharge (Asset Added)
            const calcRecharge = rawTransactions.reduce((sum, log) => {
                const typeStr = String(log.type || '').toUpperCase();
                const itemStatus = String(log.status || '').toLowerCase();
                if (typeStr.includes('RECHARGE') && (itemStatus === 'success' || itemStatus === 'completed')) {
                    let d = Number(log.diamonds) || Number(log.diamondsAdded) || 0;
                    if (d === 0) d = (Number(log.amount) || 0) * 100;
                    return sum + d;
                }
                return sum;
            }, 0);
            setTotalRechargeDiamonds(calcRecharge);

            // 2. 🔥 Calculate ALL Gifts (Standalone + In-Call) 🔥
            
            // Calculate valid standalone gifts
            const calcGiftsFromNested = enrichedGifts.reduce((sum, log) => sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0), 0); 
            
            // 🔥 SATTI STRICT FIX: Tx table Gifts completely removed to prevent overlapping double counting!
            // We rely exclusively on "myGifts" (nested_gifts) AND "mappedCallGifts" (calls DB) for accurate gift tracking.
            
            const calcCallGifts = mappedCallGifts.reduce((sum, log) => sum + log.amount, 0); 
            
            const calcGifts = calcGiftsFromNested + calcCallGifts;
            setTotalGiftsSpent(calcGifts);

            // 3. Calculate Video Call Spent
            const calcVideoCalls = rawTransactions.reduce((sum, log) => {
                if (String(log.type || '').toUpperCase().includes('CALL')) { 
                    return sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0);
                }
                return sum;
            }, 0);
            setTotalVideoCallSpent(calcVideoCalls);

            // 6. Calculate ALL General Refunds
            const calcRefunds = rawTransactions.reduce((sum, log) => {
                if (String(log.type || '').toUpperCase().includes('REFUND')) {
                    return sum + (Number(log.amount) || Number(log.diamonds) || 0);
                }
                return sum;
            }, 0);

            // 7. Calculate Total Spent / Asset Utilized (Removed calcRedeemed here)
            const grandTotalSpent = Math.max(0, calcVideoCalls + calcGifts);
            setTotalSpentCalculated(grandTotalSpent);

            setLedgerLoading(false);
        };

        // Ensure we listen to all collections
        const qHistory = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const unsubHistory = onSnapshot(qHistory, (snap) => {
            rawTransactions = snap.docs.map(d => ({ id: d.id, _source: 'transactions', ...(d.data() as any) }));
            processAllLogs();
        });

        const qGifts = query(collectionGroup(db, 'gifts'));
        const unsubGifts = onSnapshot(qGifts, (snap) => {
            rawGifts = snap.docs.map(d => ({ id: d.id, _source: 'nested_gifts', ...(d.data() as any) }));
            processAllLogs();
        });

        // 🔥 Calls Snapshot integration
        const qCalls = query(collection(db, "calls"), where("callerId", "==", user.uid));
        const unsubCalls = onSnapshot(qCalls, (snap) => {
            rawCalls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAllLogs();
        });

        return () => { unsubHistory(); unsubGifts(); unsubCalls(); };
    }, [user, userData]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display across all screens!
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    
    const rank = calculateUserLevel(userDiamonds);
    const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=1E293B&color=fff&bold=true`;

    // ==========================================
    // 🏆 LEVEL-UP NOTIFICATION (Profile screen - same rule as the Home screen)
    // - Home screen already sends it; this makes sure it is sent even if the user opens Profile first.
    // - Same notification id (level_up_<lvl>) + lastNotifiedLevel check inside a transaction,
    //   so the Level Up notification is added only ONCE no matter which screen triggers it.
    // - First time (no lastNotifiedLevel saved yet): only saves the current level silently (no old-user spam).
    // - Notification has createdAt + read:false -> home bell badge counts it, notifications screen shows it as NEW.
    // - route '/(tabs)/two' -> tapping the level notification opens this profile screen.
    // ==========================================
    useEffect(() => {
        if (!user || !userData) return;
        const lvl = rank.lvl;
        if (levelSyncedRef.current === lvl) return;
        levelSyncedRef.current = lvl;

        const syncLevelNotification = async () => {
            try {
                const userRef = doc(db, 'users', user.uid);
                await runTransaction(db, async (tx) => {
                    const snap = await tx.get(userRef);
                    if (!snap.exists()) return;
                    const data: any = snap.data();

                    // always trust the latest value stored in Firestore
                    const latestRank = calculateUserLevel(Number(data.totalSpentDiamonds) || 0);
                    const stored = data.lastNotifiedLevel;

                    // first run for this user -> just remember the level, no notification
                    if (typeof stored !== 'number') {
                        tx.update(userRef, { lastNotifiedLevel: latestRank.lvl });
                        return;
                    }

                    // no level increase -> nothing to send
                    if (latestRank.lvl <= stored) return;

                    const existing: any[] = Array.isArray(data.notifications) ? data.notifications : [];
                    const notifId = `level_up_${latestRank.lvl}`;
                    const alreadyThere = existing.some((n: any) => n?.id === notifId);

                    const extra = latestRank.lvl === 2 ? ' Quick Connect is now UNLOCKED!' : '';
                    const newNotif = {
                        id: notifId,
                        type: 'level',
                        title: 'Level Up! 🎉',
                        message: `Congratulations! You reached Level ${latestRank.lvl} - ${latestRank.label} (${latestRank.status}).${extra}`,
                        time: new Date().toLocaleString(),
                        createdAt: Date.now(),
                        read: false,
                        route: '/(tabs)/two',
                    };

                    tx.update(userRef, {
                        lastNotifiedLevel: latestRank.lvl,
                        ...(alreadyThere ? {} : { notifications: [...existing, newNotif] }),
                    });
                });
            } catch (err) {
                // allow a retry next time the level value changes / screen re-mounts
                levelSyncedRef.current = 0;
                console.log('Level notification sync error:', err);
            }
        };

        syncLevelNotification();
    }, [user, userData, rank.lvl]);

    // 🆕 RANK DUOTONE (rank.color + visible secondary) - dark secondary-a konjam lighten pannidum
    const c1 = norm(rank.color);
    const c2raw = norm(rank.secondaryColor);
    const c2 = lum(c2raw) < 0.22 ? lighten(c2raw, 0.5) : c2raw;
    const t1 = textSafe(c1);
    const t2 = textSafe(c2);

    const parallaxBg = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -40], extrapolate: 'clamp' });
    const bgOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0.12, 0.05], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    // 🆕 top backdrop image fades + drifts while scrolling
    const topImgOpacity = scrollY.interpolate({ inputRange: [0, 320], outputRange: [0.34, 0.06], extrapolate: 'clamp' });
    const topImgShift = scrollY.interpolate({ inputRange: [0, 320], outputRange: [0, -80], extrapolate: 'clamp' });

    // 🆕 derived animation styles
    const spin = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const spinRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const heroRotY = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
    const heroRotX = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['2deg', '-2deg'] });
    const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });
    const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const dashOffset = dashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });

    const getDynamicStyle = () => {
        switch(rank.anim) {
        case 'wave': return { transform: [{ translateY: mainLoop.interpolate({ inputRange:[0, 0.5, 1], outputRange:[0, 6, 0] }) }] };
        case 'sparkle': return { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] };
        case 'diamond': return { transform: [{ perspective: 1000 }, { rotateY: mainLoop.interpolate({ inputRange:[0, 1], outputRange:['0deg', '360deg'] }) }] };
        case 'nebula': return { transform: [{ perspective: 1000 }, { rotateX: '10deg' }, { scale: scaleAnim }] };
        case 'explosion': return { transform: [{ scale: secondaryLoop.interpolate({ inputRange:[0, 0.1, 1], outputRange:[1, 1.08, 1] }) }] };
        case 'titan': return { transform: [{ translateX: shakeAnim }, { scale: 1.03 }] };
        default: return { transform: [{ translateY: floatAnim }] };
        }
    };

    // 🆕 menu items (old fields appadiye + new 3D image / description)
    const menuItems = [
        { id: '1', title: 'EDIT PROFILE', icon: 'finger-print', color: rank.color, route: '/edit-profile', img: IMG.user, fb: 'account-edit', sub: 'Update your identity & photo' },
        { id: '2', title: 'Session Archives', icon: 'analytics', color: rank.secondaryColor, route: '/history', img: IMG.history, fb: 'history', sub: 'Every call & reward history' }, 
        { id: 'friends', title: 'Network Circle', icon: 'planet', color: rank.color, route: '/friends', img: IMG.network, fb: 'account-group', sub: 'Your connections & circle' }, 
        { id: '3', title: 'Asset Vault', icon: 'shield-checkmark', color: rank.secondaryColor, route: '/recharge', img: IMG.vault, fb: 'safe-square', sub: 'Recharge & manage assets' },
        { id: '4', title: 'Support Center', icon: 'construct', color: rank.color, route: '/support', img: IMG.support, fb: 'headset', sub: 'Help, guidance & contact' },
        { id: '5', title: 'Privacy Policy', icon: 'ribbon', color: rank.secondaryColor, route: '/legal', img: IMG.privacy, fb: 'shield-lock', sub: 'How we protect your data' },
    ];
    
    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: rank.color, borderRightColor: rank.color,
        borderTopColor: rank.secondaryColor + '80', borderBottomColor: rank.secondaryColor + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.85)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: rank.secondaryColor, borderRightColor: rank.secondaryColor,
        borderTopColor: rank.color + '80', borderBottomColor: rank.color + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.85)',
    };

    // 🆕 safe versions (8-digit hex problem illaadha) - new design ippo idha use pannum
    const borderA = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: c1, borderRightColor: c1,
        borderTopColor: c2 + '80', borderBottomColor: c2 + '80',
        backgroundColor: 'rgba(8, 6, 20, 0.82)',
    };
    const borderB = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: c2, borderRightColor: c2,
        borderTopColor: c1 + '80', borderBottomColor: c1 + '80',
        backgroundColor: 'rgba(8, 6, 20, 0.82)',
    };

    // 🔥 CALCULATION FOR ROAD MAP PROGRESS
    const currentTierIndex = ALL_TIERS_ROADMAP.findIndex(t => t.lvl === rank.lvl);
    const nextTier = ALL_TIERS_ROADMAP[currentTierIndex + 1] || ALL_TIERS_ROADMAP[currentTierIndex];
    const roadMapProgress = rank.lvl === 8 ? 100 : Math.min(100, Math.max(0, (userDiamonds / nextTier.req) * 100));

    // 🆕 rank progress bar fill animation
    useEffect(() => {
        Animated.timing(progAnim, { toValue: roadMapProgress, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [roadMapProgress]);
    const progWidth = progAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any;

    // 🆕 stats split (gifts vs calls) for the summary bar
    const splitTotal = totalGiftsSpent + totalVideoCallSpent;
    const giftPct = splitTotal > 0 ? Math.round((totalGiftsSpent / splitTotal) * 100) : 0;

    // 🆕🆕 NEW: stats metric strips data
    const metrics = [
        { label: 'ASSETS ADDED', value: totalRechargeDiamonds, img: IMG.money, fb: 'cash-plus', color: '#10B981' },
        { label: 'ASSETS UTILIZED', value: totalSpentCalculated, img: IMG.diamond, fb: 'diamond-stone', color: '#F43F5E' },
        { label: 'REWARDS SENT', value: totalGiftsSpent, img: IMG.gift, fb: 'gift', color: '#A855F7' },
        { label: 'CALL SPENT', value: totalVideoCallSpent, img: IMG.video, fb: 'video-vintage', color: '#3B82F6' },
    ];
    const metricMax = Math.max(1, ...metrics.map((m) => m.value));

    // 🆕🆕 ================= HERO MEMBERSHIP CARD (3D tilt, credit-card style) - FIX: clear & crisp =================
    const renderDynamicProfileCard = () => {
        const av = 62;
        const ringSz = av + 14;
        const idTail = (user?.uid || 'TALKPE00').slice(-8).toUpperCase().padStart(8, '0');
        const idFmt = `${idTail.slice(0, 4)}  ${idTail.slice(4)}`;
        return (
        <TiltCard sway={swayAnim} radius={32} style={[styles.heroCardWrap, { shadowColor: c1 }]}>
            <LinearGradient colors={[c1, c2, lighten(c1, 0.4), c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBorder}>
                <View style={styles.heroInner}>
                    <Image source={{ uri: HERO_BG }} style={styles.heroBgImage} />
                    <LinearGradient colors={[c1 + '55', '#05030FDD', c2 + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

                    <Sparkle x={width * 0.5} y={12} size={11} color={t1} delay={0} />
                    <Sparkle x={width * 0.8} y={96} size={9} color={t2} delay={700} />
                    <Sparkle x={26} y={128} size={8} color="#FFF" delay={1300} />

                    {/* top row: gold chip + brand | rank chip */}
                    <View style={styles.heroTopRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.chipGold}>
                                <LinearGradient colors={['#FDE68A', '#D4A017', '#FDE68A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <View style={styles.chipLineH} />
                                <View style={styles.chipLineV} />
                            </View>
                            <View>
                                <Text style={styles.brandSmall}>TALKPE PRO</Text>
                                <Text style={styles.brandTiny}>MEMBER CARD</Text>
                            </View>
                        </View>
                        <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rankChip}>
                            <MaterialCommunityIcons name={rank.icon as any} size={13} color="#FFF" />
                            <Text style={styles.rankChipText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{rank.label} L{rank.lvl}</Text>
                        </LinearGradient>
                    </View>

                    {/* middle row: avatar + name | rank ring */}
                    <View style={styles.heroMid}>
                        <Animated.View style={[styles.avatarNode, { width: ringSz + 8, height: ringSz + 8 }, getDynamicStyle()]}>
                            <Animated.View style={[styles.avatarGlow, { width: ringSz, height: ringSz, borderRadius: ringSz / 2, backgroundColor: c2, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                            <View style={{ width: ringSz, height: ringSz, borderRadius: ringSz / 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                                <Animated.View style={{ width: ringSz * 1.6, height: ringSz * 1.6, transform: [{ rotate: spin }] }}>
                                    <LinearGradient colors={[c1, 'transparent', c2, 'transparent', c1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                </Animated.View>
                            </View>
                            <View style={[styles.ring, { position: 'absolute', borderRadius: 100, borderWidth: 2, borderColor: c1, shadowColor: c1, shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 }]}>
                                <Image source={{ uri: uPic }} style={{ width: av, height: av, borderRadius: 100 }} />
                            </View>
                            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ rotate: spinRev }] }]}>
                                {[0, 1, 2].map((i) => {
                                    const a = (i / 3) * 2 * Math.PI;
                                    const r = (ringSz + 8) / 2;
                                    return (
                                        <MaterialCommunityIcons
                                            key={i}
                                            name="rhombus"
                                            size={9}
                                            color={i % 2 === 0 ? t1 : t2}
                                            style={{ position: 'absolute', left: r + r * Math.cos(a) - 4.5, top: r + r * Math.sin(a) - 4.5 }}
                                        />
                                    );
                                })}
                            </Animated.View>
                        </Animated.View>

                        <View style={{ flex: 1, marginLeft: 10, marginRight: 6 }}>
                            <Text style={styles.heroName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{userData?.name || 'SYNCING...'}</Text>
                            <Text style={[styles.heroStatus, { color: t2 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{rank.status}</Text>
                        </View>

                        <RankRing size={98} progress={progAnim} sway={swayAnim} c1={c1} c2={c2} icon={rank.icon} pct={Math.round(roadMapProgress)} />
                    </View>

                    {/* bottom row: card number + secure */}
                    <View style={styles.heroBottomRow}>
                        <View>
                            <Text style={styles.heroIdLabel}>MEMBER ID</Text>
                            <Text style={styles.heroIdText}>{idFmt}</Text>
                        </View>
                        <View style={[styles.secureChip, { borderColor: t1 + '66' }]}>
                            <Animated.View style={[styles.secureDot, { backgroundColor: '#10B981', opacity: glowOpacity }]} />
                            <Text style={[styles.secureChipText, { color: t1 }]}>SECURE ID</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </TiltCard>
        );
    };

    // 🆕🆕 STAT ORB (circle glass - NETWORK / ASSETS / LEVEL)
    const renderOrb = (idx: number, node: any, label: string, color: string, amp: number) => (
        <FloatBox key={label} amp={amp} dur={1700 + idx * 200}>
            <LinearGradient colors={[color, c2, color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.orbRing, { shadowColor: color }]}>
                <View style={styles.orbInner}>
                    <LinearGradient colors={[color + '33', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    {node}
                    <Text style={styles.orbLabel}>{label}</Text>
                </View>
            </LinearGradient>
        </FloatBox>
    );

    // 🆕🆕 FIX: ONE COMMAND ROW - 3D image ippo box-kulle perfect-a (veliya poagaadhu)
    const renderMenuTile = (item: any, index: number, featured: boolean) => {
        const col = norm(item.color);
        const colVisible = lum(col) < 0.22 ? lighten(col, 0.5) : col;
        const other = index % 2 === 0 ? c2 : c1;
        return (
            <Enter key={item.id} delay={index * 70} style={{ width: '100%', marginBottom: 14 }}>
                <ScaleBtn onPress={() => router.push(item.route as any)} style={[styles.cmdCard, { borderColor: colVisible + '66', shadowColor: colVisible }]}>
                    <View style={styles.cmdClip} pointerEvents="none">
                        <LinearGradient colors={[colVisible + '2E', 'rgba(5,3,15,0.9)', other + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        {featured && <Image source={{ uri: FEATURE_BG }} style={styles.tileBgImage} />}
                        <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']} style={styles.tileGloss} />
                        <Text style={[styles.cmdGhost, { color: colVisible }]}>{String(index + 1).padStart(2, '0')}</Text>
                    </View>
                    {/* 🆕 3D image pedestal - image full-a box-kulle */}
                    <View style={[styles.cmdIconBox, { borderColor: colVisible + '55' }]}>
                        <LinearGradient colors={[colVisible + '40', 'rgba(255,255,255,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={[styles.cmdIconGlow, { backgroundColor: colVisible }]} />
                        <FloatBox amp={3} dur={1700 + index * 140}>
                            <Img3D uri={item.img} size={56} fallback={item.fb} color={colVisible} />
                        </FloatBox>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.cmdTitle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{item.title.toUpperCase()}</Text>
                        <Text style={styles.cmdSub} numberOfLines={2}>{item.sub}</Text>
                        <View style={[styles.cmdChip, { borderColor: colVisible + '66', backgroundColor: colVisible + '18' }]}>
                            <View style={[styles.cmdChipDot, { backgroundColor: '#10B981' }]} />
                            <Text style={[styles.cmdChipText, { color: lighten(colVisible, 0.4) }]}>ACCESS GRANTED</Text>
                        </View>
                    </View>
                    <View style={[styles.cmdChev, { borderColor: colVisible + '77' }]}>
                        <Ionicons name="arrow-forward" size={16} color={lighten(colVisible, 0.4)} />
                    </View>
                </ScaleBtn>
            </Enter>
        );
    };

    // 🆕 ONE STAT BOX (old design - safe-ku appadiye irukku)
    const renderStatBox = (idx: number, img: string, fallback: string, color: string, value: number, label: string, wide?: boolean, border?: any) => (
        <Enter key={label} delay={idx * 80} style={{ width: wide ? '100%' : '48%' }}>
            <View style={[styles.ledgerBox, border, { shadowColor: color }]}>
                <LinearGradient colors={[color + '2E', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <FloatBox amp={5} dur={1600 + idx * 150}>
                    <View style={[styles.iconCircle, { backgroundColor: color + '24', borderWidth: 1, borderColor: color + '55' }]}>
                        <Img3D uri={img} size={38} fallback={fallback} color={color} />
                    </View>
                </FloatBox>
                <CountText value={value} suffix={label === 'CALL MINS' ? '' : ' 💎'} style={styles.statBoxValue} />
                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
            </View>
        </Enter>
    );

    // 🆕🆕 ================= ROAD MAP: ASCENT ROAD (unique) =================
    // Silver (keezha) -> Titan (mela). Winding glowing road, 3D medal nodes, un avatar progress-ku ethavidhama road-la nikkum.
    const renderAscentRoad = () => {
        const curIdx = RM_TIERS.findIndex((t) => t.lvl === rank.lvl); // current tier node index
        const showMarker = rank.lvl < 8 && curIdx > 0;
        let marker = { x: 0, y: 0 };
        if (showMarker) {
            const A = rmPt(curIdx);
            const B = rmPt(curIdx - 1);
            const t = clamp(roadMapProgress / 100, 0.15, 0.85);
            marker = cubicPt(A, { x: A.x, y: A.y - RM_ROW * 0.55 }, { x: B.x, y: B.y + RM_ROW * 0.55 }, B, t);
        }
        return (
            <View style={{ width: RM_W, height: RM_H, alignSelf: 'center', marginTop: 4 }}>
                {/* ghost level numbers (background decoration) */}
                {RM_TIERS.map((tier, i) => {
                    const p = rmPt(i);
                    const leftSide = i % 2 === 0;
                    return (
                        <Text
                            key={`ghost-${tier.lvl}`}
                            pointerEvents="none"
                            style={[styles.rmGhost, { top: p.y - 38, color: vis(tier.color) }, leftSide ? { right: 6 } : { left: 6 }]}
                        >
                            L{tier.lvl}
                        </Text>
                    );
                })}

                {/* road (SVG) */}
                <Svg width={RM_W} height={RM_H} style={StyleSheet.absoluteFill}>
                    <Defs>
                        {RM_TIERS.slice(0, -1).map((upper, i) => {
                            const lower = RM_TIERS[i + 1];
                            return (
                                <SvgGradient key={`g${i}`} id={`rmseg${i}`} x1="0" y1="1" x2="0" y2="0">
                                    <Stop offset="0" stopColor={vis(lower.color)} />
                                    <Stop offset="1" stopColor={vis(upper.color)} />
                                </SvgGradient>
                            );
                        })}
                    </Defs>
                    {RM_TIERS.slice(0, -1).map((upper, i) => {
                        const lower = RM_TIERS[i + 1];
                        const A = rmPt(i + 1);
                        const B = rmPt(i);
                        const d = `M ${A.x} ${A.y} C ${A.x} ${A.y - RM_ROW * 0.55}, ${B.x} ${B.y + RM_ROW * 0.55}, ${B.x} ${B.y}`;
                        const lit = userDiamonds >= upper.req;
                        const isNext = lower.lvl === rank.lvl && rank.lvl < 8;
                        return (
                            <React.Fragment key={`seg${i}`}>
                                <Path d={d} stroke="rgba(255,255,255,0.07)" strokeWidth={12} fill="none" strokeLinecap="round" />
                                {lit && (
                                    <>
                                        <Path d={d} stroke={vis(upper.color)} strokeWidth={20} fill="none" strokeLinecap="round" opacity={0.18} />
                                        <Path d={d} stroke={`url(#rmseg${i})`} strokeWidth={6} fill="none" strokeLinecap="round" />
                                    </>
                                )}
                                {isNext && (
                                    <AnimatedPath
                                        d={d}
                                        stroke={vis(lower.color)}
                                        strokeWidth={5}
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray="10 12"
                                        strokeDashoffset={dashOffset}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </Svg>

                {/* progress avatar travelling on the road */}
                {showMarker && (
                    <View pointerEvents="none" style={{ position: 'absolute', left: marker.x - 21, top: marker.y - 21, width: 42, alignItems: 'center', zIndex: 5 }}>
                        <Animated.View style={{ position: 'absolute', width: 42, height: 42, borderRadius: 21, backgroundColor: c1, opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
                        <View style={styles.rmMarker}>
                            <Image source={{ uri: uPic }} style={{ width: '100%', height: '100%' }} />
                        </View>
                        <View style={[styles.rmMarkerTag, { borderColor: c1 + '99' }]}>
                            <Text style={[styles.rmMarkerTagText, { color: t1 }]}>{Math.round(roadMapProgress)}%</Text>
                        </View>
                    </View>
                )}

                {/* tier nodes */}
                {RM_TIERS.map((tier, i) => {
                    const p = rmPt(i);
                    const unlocked = userDiamonds >= tier.req;
                    const current = tier.lvl === rank.lvl;
                    const remain = Math.max(0, tier.req - userDiamonds);
                    const tv = vis(tier.color);
                    return (
                        <Enter
                            key={tier.lvl}
                            delay={i * 80}
                            style={{ position: 'absolute', left: p.x - RM_LABEL_W / 2, top: p.y - RM_BOX / 2, width: RM_LABEL_W, alignItems: 'center', zIndex: 10 }}
                        >
                            <View style={{ width: RM_BOX, height: RM_BOX, justifyContent: 'center', alignItems: 'center' }}>
                                {current && (
                                    <>
                                        <Animated.View style={{ position: 'absolute', width: RM_BOX, height: RM_BOX, borderRadius: RM_BOX / 2, backgroundColor: tv, opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
                                        <View style={{ position: 'absolute', width: RM_BOX, height: RM_BOX, borderRadius: RM_BOX / 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                                            <Animated.View style={{ width: RM_BOX * 1.6, height: RM_BOX * 1.6, transform: [{ rotate: spin }] }}>
                                                <LinearGradient colors={[tv, 'transparent', c2, 'transparent', tv]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                            </Animated.View>
                                        </View>
                                        <View style={{ position: 'absolute', width: RM_BOX - 6, height: RM_BOX - 6, borderRadius: (RM_BOX - 6) / 2, backgroundColor: '#05030F' }} />
                                    </>
                                )}
                                {current ? (
                                    <FloatBox amp={3} dur={1800}>
                                        <Orb3D size={RM_NODE} color={tier.color} icon={tier.icon} glow={false} locked={false} />
                                    </FloatBox>
                                ) : (
                                    <Orb3D size={RM_NODE - 6} color={tier.color} icon={tier.icon} glow={unlocked} locked={!unlocked} />
                                )}
                                {!unlocked && (
                                    <View style={styles.rmLockBadge}>
                                        <Ionicons name="lock-closed" size={13} color="#94A3B8" />
                                    </View>
                                )}
                                {unlocked && !current && (
                                    <View style={[styles.rmCheckBadge, { backgroundColor: '#10B981' }]}>
                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                    </View>
                                )}
                            </View>

                            <View style={[styles.rmLabel, { borderColor: unlocked ? tv + '66' : '#1E293B', backgroundColor: unlocked ? 'rgba(8,6,20,0.92)' : 'rgba(8,6,20,0.8)' }]}>
                                <Text style={[styles.rmLabelName, { color: unlocked ? '#FFF' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{tier.label}</Text>
                                <Text style={styles.rmLabelReq} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>L{tier.lvl} • REQ {tier.req.toLocaleString()} 💎</Text>
                                {current ? (
                                    <View style={[styles.rmBadgeCurrent, { backgroundColor: tv, marginTop: 6 }]}>
                                        <Text style={styles.rmBadgeCurrentText}>CURRENT</Text>
                                    </View>
                                ) : unlocked ? (
                                    <View style={[styles.rmStatusRow, { marginTop: 6 }]}>
                                        <Ionicons name="checkmark-circle" size={14} color={tv} />
                                        <Text style={[styles.rmStatusText, { color: tv }]}>UNLOCKED</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.rmStatusRow, { marginTop: 6 }]}>
                                        <Ionicons name="lock-closed" size={11} color="#64748B" />
                                        <Text style={[styles.rmStatusText, { color: '#94A3B8' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{remain.toLocaleString()} 💎 TO GO</Text>
                                    </View>
                                )}
                            </View>
                        </Enter>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.mainContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={rank.themeBg as any} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[c1 + '2A', 'transparent', c2 + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* 🆕 top backdrop image (fades while scrolling) - FIX: pointerEvents View-ku, Image-ku illa (TS error fix) */}
        <Animated.View
            pointerEvents="none"
            style={[styles.topBgImage, { opacity: topImgOpacity, transform: [{ translateY: topImgShift }] }]}
        >
            <Image source={{ uri: HERO_BG }} style={{ width: '100%', height: '100%' }} />
        </Animated.View>
        <LinearGradient colors={['transparent', '#020617']} pointerEvents="none" style={styles.topBgFade} />
        
        {/* 🔥 DYNAMIC ANIMATED SHIMMER ORBS */}
        <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: rank.color, transform: [{ translateY: orbTranslateY }] }]} />
        <Animated.View style={[styles.shimmerOrb, { bottom: 200, left: -90, backgroundColor: rank.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

        <Animated.View style={[styles.aura, { top: 40, left: -50, backgroundColor: rank.color, opacity: bgOpacity, transform: [{ translateY: parallaxBg }] }]} />
        <Animated.View style={[styles.aura, { bottom: 40, right: -50, backgroundColor: rank.secondaryColor, opacity: 0.06, transform: [{ translateY: parallaxBg }] }]} />

        {/* 🆕 floating particles */}
        {particles.map((p, i) => (
            <Animated.View
                key={i}
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: p.y,
                    left: p.x,
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: i % 3 === 0 ? t1 : i % 3 === 1 ? t2 : '#FFFFFF',
                    opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
                    transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                }}
            />
        ))}

        <Animated.ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollPadding}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        >
            <SafeAreaView edges={['top']}>
            {/* 🆕 top title strip */}
            <Enter style={styles.topStrip}>
                <View>
                    <Text style={[styles.topLabel, { color: t1 }]}>COMMAND ID</Text>
                    <Text style={styles.topTitle}>MY PROFILE</Text>
                    <LinearGradient colors={['transparent', c1, c2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topUnderline} />
                </View>
                <FloatBox amp={4} dur={1700}>
                    <Img3D uri={IMG.crown} size={46} fallback="crown" color={t1} />
                </FloatBox>
            </Enter>
            <View style={styles.cardContainer}>{renderDynamicProfileCard()}</View>

            {/* 🆕🆕 FIX: 3 stat orbs ippo member card-ku keezha (overlap illa) */}
            <View style={styles.orbRow}>
                {renderOrb(0,
                    <CountText value={friendsCount} style={styles.orbValue} />,
                    'NETWORK', c1, 4)}
                {renderOrb(1,
                    <CountText value={userData?.balance || 0} locale style={styles.orbValue} />,
                    'ASSETS', c2, 6)}
                {renderOrb(2,
                    <Text style={[styles.orbValue, { color: t1 }]}>L{rank.lvl}</Text>,
                    'LEVEL', c1, 4)}
            </View>
            </SafeAreaView>

            {/* 🔥 TABS SECTION (3 TABS: COMMANDS / STATS / ROAD MAP) 🔥 */}
            <DockTabs tabs={PROFILE_TABS} active={activeTab} onChange={(k: any) => setActiveTab(k)} c1={c1} c2={c2} />

            <View style={styles.menuBox}>
                {/* 1. COMMANDS TAB */}
                {activeTab === 'COMMANDS' && (
                    <View style={{ paddingTop: 14 }} key="tab-commands">
                    {menuItems.map((item, index) => renderMenuTile(item, index, index === 0))}
                    </View>
                )}

                {/* 2. STATS TAB */}
                {activeTab === 'STATS' && (
                    <View key="tab-stats">
                        {ledgerLoading ? (
                            <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                        ) : (
                            <View>
                                {/* 🆕 vault panel: donut (rewards vs calls) + total utilized */}
                                <Enter>
                                    <View style={[styles.vaultPanel, borderA, { shadowColor: c1 }]}>
                                        <Image source={{ uri: VAULT_BG }} style={styles.summaryBg} />
                                        <LinearGradient colors={[c1 + '55', '#05030FEE', c2 + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <View style={styles.vaultRow}>
                                            <Donut size={132} stroke={14} giftPct={giftPct} hasData={splitTotal > 0}>
                                                <FloatBox amp={4} dur={1700}>
                                                    <Img3D uri={IMG.diamond} size={54} fallback="diamond-stone" color={t1} />
                                                </FloatBox>
                                            </Donut>
                                            <View style={{ flex: 1, marginLeft: 16 }}>
                                                <Text style={[styles.summaryLabel, { color: t1 }]}>TOTAL ASSETS UTILIZED</Text>
                                                <CountText value={totalSpentCalculated} suffix=" 💎" style={styles.summaryValue} />
                                                <View style={styles.vaultLegend}>
                                                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} /><Text style={styles.legendText}>REWARDS {giftPct}%</Text></View>
                                                    <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} /><Text style={styles.legendText}>CALLS {splitTotal > 0 ? 100 - giftPct : 0}%</Text></View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </Enter>

                                {/* 🆕 metric strips with animated bars */}
                                {metrics.map((m, idx) => (
                                    <Enter key={m.label} delay={(idx + 1) * 80} style={{ marginTop: 12 }}>
                                        <View style={[styles.stripRow, { borderColor: m.color + '44', shadowColor: m.color }]}>
                                            <LinearGradient colors={[m.color + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                            <FloatBox amp={3} dur={1600 + idx * 150}>
                                                <View style={[styles.stripIcon, { backgroundColor: m.color + '22', borderColor: m.color + '55' }]}>
                                                    <Img3D uri={m.img} size={34} fallback={m.fb} color={m.color} />
                                                </View>
                                            </FloatBox>
                                            <View style={{ flex: 1, marginLeft: 14 }}>
                                                <View style={styles.stripHead}>
                                                    <Text style={styles.stripLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{m.label}</Text>
                                                    <CountText value={m.value} suffix=" 💎" style={styles.stripValue} />
                                                </View>
                                                <StripBar pct={(m.value / metricMax) * 100} color={m.color} delay={idx * 120} />
                                            </View>
                                        </View>
                                    </Enter>
                                ))}

                                {/* 🆕 call time panel */}
                                <Enter delay={420} style={{ marginTop: 12 }}>
                                    <View style={[styles.minsPanel, borderB, { shadowColor: '#F59E0B' }]}>
                                        <LinearGradient colors={['#F59E0B33', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <FloatBox amp={4} dur={1800}>
                                            <Img3D uri={IMG.clock} size={60} fallback="clock-outline" color="#F59E0B" />
                                        </FloatBox>
                                        <View style={{ flex: 1, marginLeft: 16 }}>
                                            <Text style={styles.statBoxLabel}>TOTAL TALK TIME</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                                                <CountText value={totalMinutes} style={styles.minsValue} />
                                                <Text style={styles.minsSuffix}>MIN</Text>
                                            </View>
                                        </View>
                                    </View>
                                </Enter>
                            </View>
                        )}
                    </View>
                )}

                {/* 3. 🔥 ROAD MAP TAB (ASCENT ROAD) 🔥 */}
                {activeTab === 'ROADMAP' && (
                    <View style={styles.roadmapContainer} key="tab-roadmap">
                        {/* Progress Header */}
                        <Enter>
                            <View style={[styles.rmHeaderBox, { borderColor: c1, backgroundColor: c1 + '15', shadowColor: c1 }]}>
                                <Image source={{ uri: HERO_BG }} style={styles.rmHeaderBg} />
                                <LinearGradient colors={[c1 + '44', '#05030FEE', c2 + '33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <FloatBox amp={4} dur={1700}>
                                    <Img3D uri={IMG.trophy} size={60} fallback="trophy" color={t1} />
                                </FloatBox>
                                <Text style={styles.rmHeaderTitle}>TIER PROGRESSION</Text>
                                <Text style={styles.rmHeaderSub}>Assets Required for Next Rank</Text>
                                
                                <View style={styles.rmProgressWrapper}>
                                    <Animated.View style={[styles.rmProgressBar, { width: progWidth }]}>
                                        <LinearGradient colors={[c1, c2, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                    </Animated.View>
                                </View>
                                <View style={styles.rmProgressTextRow}>
                                    <Text style={styles.rmProgressTextL}>{userDiamonds.toLocaleString()} 💎</Text>
                                    <Text style={styles.rmProgressTextR}>{rank.lvl === 8 ? 'MAX LEVEL' : `${nextTier.req.toLocaleString()} 💎`}</Text>
                                </View>
                            </View>
                        </Enter>

                        {/* 🆕🆕 Ascent road: Silver (keezha) -> Titan (mela) */}
                        <Text style={[styles.rmRoadTitle, { color: t1 }]}>THE ASCENT</Text>
                        <Text style={styles.rmRoadSub}>CLIMB FROM SILVER TO TITAN</Text>
                        {renderAscentRoad()}
                    </View>
                )}
            </View>

            <View style={styles.footer}>
            <Text style={styles.verText}>TALKPE PRO OS v1.0.5 • SECURE_NODE</Text>
            <View style={[styles.secureNode, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                <MaterialCommunityIcons name="shield-check" size={12} color={rank.color} />
                <Text style={[styles.secureText, { color: rank.color }]}>Quantum Link Secure</Text>
            </View>
            </View>
        </Animated.ScrollView>
        </View>
    );
    }

    const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    scrollPadding: { paddingBottom: 150 },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(120px)' },
    cardContainer: { margin: 16, marginTop: 10 },
    cardGlassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)' },
    
    cardBase: { padding: 25, elevation: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.9, shadowRadius: 30 },
    avatarNode: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
    ring: { padding: 4, backgroundColor: 'rgba(0,0,0,0.4)' },
    badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
    badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginLeft: 4 },
    nameRow: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 2 },
    rowStats: { flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: 1 },
    stat: { flex: 1, alignItems: 'center' },
    statV: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    statL: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', marginTop: 6, letterSpacing: 1.5 },

    glowTrail: { position: 'absolute', width: 120, height: '220%', top: '-60%', opacity: 0.15, transform: [{ rotate: '40deg' }] },

    menuBox: { paddingHorizontal: 16, marginTop: 10 },
    
    tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    headerSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    screenTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    placeholderBtn: { width: 45 },
    talktimeHighlight: { alignItems: 'center' },
    totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
    minsDisplay: { flexDirection: 'row', alignItems: 'flex-end' },
    bigMins: { color: '#FFF', fontSize: 44, fontWeight: '900', lineHeight: 46 },
    minSuffix: { color: '#475569', fontSize: 12, fontWeight: '800', marginLeft: 8, marginBottom: 6 },

    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    ledgerBox: { width: '100%', padding: 20, borderRadius: 25, alignItems: 'center', elevation: 10, overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statBoxValue: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4, maxWidth: '100%' },
    statBoxLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },

    historyCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 25, marginBottom: 12, elevation: 10 },
    historyIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    historyTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
    historyDate: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    historyAmount: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    historyStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

    neonRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 25, marginBottom: 15, elevation: 10 },
    neonIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    neonLabel: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    neonSub: { color: 'rgba(255,255,255,0.35)', fontSize: 9, marginTop: 4, fontWeight: '800', letterSpacing: 1 },

    logoutWrapper: { marginHorizontal: 0, marginTop: 30, borderRadius: 30, overflow: 'hidden' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 12 },
    logoutLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 3, color: '#EF4444' },
    footer: { alignItems: 'center', marginTop: 80 },
    verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
    secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },

    // Stealth History Card Specifics
    stealthHistoryCard: { backgroundColor: 'rgba(5,5,5,0.7)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    sessionBadge: { position: 'absolute', top: -1, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
    sessionTypeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 10 },
    expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
    expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
    expertInfo: { flex: 1, marginLeft: 15 },
    expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    callDateText: { color: '#475569', fontSize: 10, fontWeight: '800' },
    costContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    costText: { fontSize: 17, fontWeight: '900' },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, zIndex: 10 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
    statValueText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    vDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
    talkAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1 },
    talkAgainText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    floatingReaction: { position: 'absolute' },

    // 🔥 ROADMAP TAB STYLES 🔥
    roadmapContainer: { paddingTop: 5, paddingBottom: 20 },
    rmHeaderBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 25, alignItems: 'center', overflow: 'hidden', elevation: 10, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    rmHeaderBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.3 },
    rmHeaderTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 4, marginTop: 6 },
    rmHeaderSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 15 },
    rmProgressWrapper: { width: '100%', height: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 5, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    rmProgressBar: { height: '100%', borderRadius: 5, overflow: 'hidden' },
    rmProgressTextRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    rmProgressTextL: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    rmProgressTextR: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900' },
    
    rmTimelineWrapper: { paddingHorizontal: 10 },
    rmTimelineRow: { flexDirection: 'row', minHeight: 80 },
    rmTimelineConnector: { width: 30, alignItems: 'center' },
    rmTimelineDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, zIndex: 2, marginTop: 25 },
    rmDotHalo: { position: 'absolute', top: 19, width: 26, height: 26, borderRadius: 13 },
    rmTimelineLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -25, zIndex: 1 },
    
    rmTierCard: { flex: 1, marginLeft: 15, marginBottom: 15, borderRadius: 16, borderWidth: 1, padding: 15, justifyContent: 'center', overflow: 'hidden' },
    rmCardContent: { flexDirection: 'row', alignItems: 'center' },
    rmMedal: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
    rmCardTexts: { flex: 1, marginLeft: 15 },
    rmTierName: { fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    rmTierReq: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    rmBadgeCurrent: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    rmBadgeCurrentText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    // ================= 🆕 PREMIUM REDESIGN STYLES =================
    topStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
    topLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 4 },
    topTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(255,255,255,0.25)', textShadowRadius: 10 },
    topUnderline: { width: 120, height: 2, borderRadius: 1, marginTop: 6 },

    heroShadow: { borderRadius: 34, elevation: 22, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
    heroCard: { padding: 20, overflow: 'hidden', backgroundColor: '#05030F' },
    heroBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.3 },
    heroSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    rankChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, maxWidth: '62%' },
    rankChipText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    secureChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 11, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    secureDot: { width: 7, height: 7, borderRadius: 4 },
    secureChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    avatarGlow: { position: 'absolute' },
    floatCrown: { position: 'absolute', top: -6, alignSelf: 'center' },
    heroProgWrap: { marginTop: 16, zIndex: 10 },
    heroProgHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
    heroProgLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, flexShrink: 1 },
    heroProgPct: { fontSize: 12, fontWeight: '900' },
    heroProgTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    heroProgFillWrap: { height: '100%', borderRadius: 4, overflow: 'hidden' },

    pTabsWrap: { flexDirection: 'row', height: 54, marginHorizontal: 16, marginTop: 10, marginBottom: 15, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    pTabIndicator: { position: 'absolute', top: 4, left: 0, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 1, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    pTabGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    pTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 4 },
    pTabText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1, maxWidth: '100%' },

    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    tile: { minHeight: 138, borderRadius: 26, padding: 16, overflow: 'hidden', elevation: 10, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    tileFeatured: { minHeight: 98, flexDirection: 'row', alignItems: 'center' },
    tileBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.22 },
    tileGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
    tileIconBg: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    tileIconGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 20 },
    tileChev: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },

    summaryCard: { borderRadius: 26, padding: 20, marginBottom: 14, overflow: 'hidden', elevation: 12, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    summaryBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.25 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginBottom: 6 },
    summaryValue: { color: '#FFF', fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
    splitTrack: { flexDirection: 'row', height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 16 },
    splitFill: { height: '100%' },
    splitLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },

    // ================= 🆕🆕 NEW: 3D MEMBERSHIP CARD / ORBS / DOCK / COMMANDS / STATS / ASCENT ROAD =================
    topBgImage: { position: 'absolute', top: 0, left: 0, right: 0, height: 380, width: '100%' },
    topBgFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
    glareStrip: { position: 'absolute', top: -40, bottom: -40, width: 110 },

    // 🔧 FIX: backgroundColor + chinna elevation (Android-la transparent view-ku periya elevation shadow = "half shade" problem)
    heroCardWrap: { borderRadius: 32, backgroundColor: '#05030F', elevation: 8, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    heroBorder: { padding: 1.5, borderRadius: 32 },
    heroInner: { height: HERO_H, borderRadius: 30.5, overflow: 'hidden', backgroundColor: '#05030F', padding: 16, justifyContent: 'space-between' },
    chipGold: { width: 38, height: 28, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' },
    chipLineH: { position: 'absolute', top: 13, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    chipLineV: { position: 'absolute', left: 18, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    brandSmall: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    brandTiny: { color: 'rgba(255,255,255,0.65)', fontSize: 7.5, fontWeight: '800', letterSpacing: 2.2, marginTop: 2 },
    heroMid: { flexDirection: 'row', alignItems: 'center', zIndex: 10 },
    heroName: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
    heroStatus: { fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1.6 },
    heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 },
    heroIdLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 7.5, fontWeight: '900', letterSpacing: 2.5 },
    heroIdText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 3.5, marginTop: 3, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },

    rkCoin: { flex: 1, borderRadius: 100, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
    rkCoinGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%' },
    rkPct: { position: 'absolute', bottom: -4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, borderWidth: 1, backgroundColor: 'rgba(5,3,15,0.92)' },
    rkPctText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },

    // 🔧 FIX: negative margin neekki (member card-a overlap pannaadhu)
    orbRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginTop: 14, marginBottom: 6, zIndex: 20 },
    orbRing: { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, padding: 1.8, shadowOpacity: 0.65, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
    orbInner: { flex: 1, borderRadius: ORB_SIZE / 2, backgroundColor: 'rgba(5,3,15,0.94)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', paddingHorizontal: 8 },
    orbValue: { color: '#FFF', fontSize: 19, fontWeight: '900', width: 62, textAlign: 'center' },
    orbLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 7.5, fontWeight: '900', letterSpacing: 1.6, marginTop: 3 },

    dockWrap: { flexDirection: 'row', height: 76, marginHorizontal: 16, marginTop: 14, marginBottom: 6, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    dockGlow: { position: 'absolute', top: 0, bottom: 0, left: 0 },
    dockLine: { position: 'absolute', bottom: 0, left: 14, right: 14, height: 3, borderRadius: 2 },
    dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 },
    dockText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2, maxWidth: '100%' },

    // 🔧 FIX: command card - icon ippo box-kulle (absolute / negative top illa)
    cmdCard: { flexDirection: 'row', alignItems: 'center', minHeight: 108, paddingVertical: 14, paddingLeft: 14, paddingRight: 14, borderRadius: 26, borderWidth: 1, backgroundColor: 'rgba(5,3,15,0.9)', elevation: 8, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    cmdClip: { ...StyleSheet.absoluteFillObject, borderRadius: 26, overflow: 'hidden' },
    cmdGhost: { position: 'absolute', right: 52, bottom: -14, fontSize: 70, fontWeight: '900', opacity: 0.08 },
    cmdIconWrap: { position: 'absolute', left: 12, top: -16, width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    cmdIconBox: { width: 78, height: 78, borderRadius: 22, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    cmdIconGlow: { position: 'absolute', width: 48, height: 48, borderRadius: 24, opacity: 0.3 },
    cmdTitle: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
    cmdSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: '700', marginTop: 4, lineHeight: 15 },
    cmdChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    cmdChipDot: { width: 5, height: 5, borderRadius: 3 },
    cmdChipText: { fontSize: 7.5, fontWeight: '900', letterSpacing: 1.3 },
    cmdChev: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 8 },

    vaultPanel: { borderRadius: 28, padding: 18, overflow: 'hidden', elevation: 12, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    vaultRow: { flexDirection: 'row', alignItems: 'center' },
    vaultLegend: { marginTop: 10, gap: 6 },
    stripRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 22, borderWidth: 1, backgroundColor: 'rgba(8,6,20,0.85)', overflow: 'hidden', elevation: 8, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    stripIcon: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    stripHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
    stripLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4, flexShrink: 1, marginRight: 8 },
    stripValue: { color: '#FFF', fontSize: 15, fontWeight: '900', maxWidth: 130, textAlign: 'right' },
    stripTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    stripFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
    minsPanel: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 26, overflow: 'hidden', elevation: 10, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    minsValue: { color: '#FFF', fontSize: 40, fontWeight: '900', lineHeight: 44, maxWidth: 170 },
    minsSuffix: { color: '#F59E0B', fontSize: 13, fontWeight: '900', letterSpacing: 2, marginLeft: 8, marginBottom: 8 },

    // ================= 🆕🆕 ASCENT ROAD (ROAD MAP) STYLES =================
    rmRoadTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
    rmRoadSub: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 3, textAlign: 'center', marginTop: 4, marginBottom: 4 },
    rmGhost: { position: 'absolute', fontSize: 66, fontWeight: '900', opacity: 0.07 },
    rmLockBadge: { position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
    rmCheckBadge: { position: 'absolute', bottom: 8, right: 8, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#05030F', justifyContent: 'center', alignItems: 'center' },
    rmLabel: { width: RM_LABEL_W, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1, marginTop: 2 },
    rmLabelName: { fontSize: 12, fontWeight: '900', letterSpacing: 1, maxWidth: '100%' },
    rmLabelReq: { color: 'rgba(255,255,255,0.5)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 3, maxWidth: '100%' },
    rmStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rmStatusText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
    rmMarker: { width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: '#FFF', overflow: 'hidden', backgroundColor: '#0F172A' },
    rmMarkerTag: { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(5,3,15,0.92)' },
    rmMarkerTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 }
    });
