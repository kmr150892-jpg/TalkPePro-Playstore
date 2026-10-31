import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

// 🌈 Same multicolor family as the royal settings menu
const BORDER_COLORS = ['#F5D27A', '#FF5C9E', '#8B5CF6', '#22D3EE', '#34D399'];

export interface FilterPreset {
    id: string;
    name: string;
    icon: string;
    desc?: string;
    colors: [string, string];
    beauty?: { contrast: number; lightening: number; smooth: number; redness: number; sharp: number };
    color?: { strength: number; skin: number };
    lowlight?: boolean;
}

// 🎨 FILTER PRESETS (Agora built-in beauty / color-enhance / low-light engines)
export const FILTER_PRESETS: FilterPreset[] = [
    { id: 'none', name: 'Off', icon: 'ban', desc: 'Original camera look', colors: ['#64748B', '#1E293B'] },
    // 'Pro Glow' = old single Pro filter values (same as before)
    { id: 'pro', name: 'Pro Glow', icon: 'sparkles', desc: 'Signature glow & smooth skin', colors: ['#FFD700', '#F59E0B'], beauty: { contrast: 1, lightening: 0.7, smooth: 0.7, redness: 0.1, sharp: 0 } },
    { id: 'natural', name: 'Natural', icon: 'leaf', desc: 'Soft & true-to-life', colors: ['#34D399', '#22D3EE'], beauty: { contrast: 1, lightening: 0.4, smooth: 0.45, redness: 0.1, sharp: 0.3 } },
    { id: 'porcelain', name: 'Porcelain', icon: 'snow', desc: 'Flawless bright porcelain', colors: ['#BAE6FD', '#A5B4FC'], beauty: { contrast: 1, lightening: 0.85, smooth: 0.95, redness: 0.05, sharp: 0.1 } },
    { id: 'rosy', name: 'Rosy', icon: 'heart', desc: 'Warm pink blush tones', colors: ['#FF8AC6', '#FF3D81'], beauty: { contrast: 1, lightening: 0.5, smooth: 0.6, redness: 0.85, sharp: 0.2 } },
    { id: 'sunglow', name: 'Sun Glow', icon: 'sunny', desc: 'Golden sun-kissed warmth', colors: ['#FBBF24', '#FB7185'], beauty: { contrast: 2, lightening: 0.6, smooth: 0.5, redness: 0.5, sharp: 0.2 }, color: { strength: 0.5, skin: 1 } },
    { id: 'crisp', name: 'Crisp HD', icon: 'diamond', desc: 'Ultra sharp HD clarity', colors: ['#60A5FA', '#8B5CF6'], beauty: { contrast: 2, lightening: 0.35, smooth: 0.2, redness: 0.1, sharp: 0.9 } },
    { id: 'studio', name: 'Studio', icon: 'film', desc: 'Pro studio-grade polish', colors: ['#A78BFA', '#EC4899'], beauty: { contrast: 1, lightening: 0.7, smooth: 0.7, redness: 0.1, sharp: 0.3 }, color: { strength: 0.6, skin: 1 } },
    { id: 'vivid', name: 'Vivid', icon: 'color-palette', desc: 'Rich punchy colors', colors: ['#F472B6', '#22D3EE'], beauty: { contrast: 1, lightening: 0.3, smooth: 0.3, redness: 0.2, sharp: 0.2 }, color: { strength: 1, skin: 1 } },
    { id: 'night', name: 'Night Boost', icon: 'moon', desc: 'Brighten dark rooms', colors: ['#6366F1', '#0EA5E9'], beauty: { contrast: 1, lightening: 0.8, smooth: 0.4, redness: 0.1, sharp: 0.2 }, lowlight: true },
];

// SOFT / MEDIUM / MAX multipliers
export const FILTER_LEVEL_MULT = [0.6, 1, 1.35];
const LEVEL_LABELS = ['SOFT', 'MEDIUM', 'MAX'];

// 📐 Carousel geometry
const PANEL_INNER_W = SCREEN_W - 12 * 2 - 2 * 2 - 14 * 2;
const ITEM_W = 84;
const ORB = 64;
const SIDE_PAD = (PANEL_INNER_W - ITEM_W) / 2;

// ✨ Selected orb's rotating rainbow halo
const HaloRing = () => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={styles.haloClip} pointerEvents="none">
            <Animated.View style={[styles.haloSpinner, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                <LinearGradient
                    colors={['#FF3D81', '#F5C84C', '#34D399', '#22D3EE', '#8B5CF6', '#FF3D81'] as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

// 💎 3D GLOSSY GEM ORB (layered gradients: body + shade + specular + rim light + embossed icon)
const GemOrb = ({ preset, selected }: { preset: FilterPreset; selected: boolean }) => {
    const bob = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!selected) {
            bob.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [selected]);

    const c0 = preset.colors[0];
    const c1 = preset.colors[1];

    return (
        <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
            {/* ground reflection */}
            <View style={[styles.groundShadow, { backgroundColor: c0 + (selected ? '88' : '40') }]} pointerEvents="none" />

            <View
                style={[
                    styles.orbWrap,
                    selected && { shadowColor: c0, shadowOpacity: 0.95, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 16 }
                ]}
            >
                {selected && <HaloRing />}

                {/* body */}
                <LinearGradient
                    colors={[c0, c1] as any}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={[styles.orbBody, { opacity: selected ? 1 : 0.82 }]}
                >
                    {/* depth shade (bottom darker) */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(0,0,0,0.42)'] as any}
                        start={{ x: 0.5, y: 0.35 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* rim light (bottom edge) */}
                    <View style={[styles.rimLight, { backgroundColor: c0 + '99' }]} />
                    {/* specular highlight (top-left gloss) */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0)'] as any}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={styles.specular}
                    />
                    <View style={styles.specularDot} />

                    {/* embossed icon (dark offset copy + white face) */}
                    <View style={styles.iconStack}>
                        <Ionicons name={preset.icon as any} size={26} color="rgba(0,0,0,0.38)" style={styles.iconShadow} />
                        <Ionicons name={preset.icon as any} size={26} color="#FFF" />
                    </View>
                </LinearGradient>

                {/* glass edge */}
                <View style={styles.orbEdge} pointerEvents="none" />
            </View>
        </Animated.View>
    );
};

// 🎠 COVERFLOW ITEM: scroll position-a poruthu rotateY / scale / depth
const CoverItem = ({
    index, scrollX, preset, selected, onPress
}: {
    index: number;
    scrollX: Animated.Value;
    preset: FilterPreset;
    selected: boolean;
    onPress: () => void;
}) => {
    const pos = index * ITEM_W;
    const range = [pos - 2 * ITEM_W, pos - ITEM_W, pos, pos + ITEM_W, pos + 2 * ITEM_W];

    const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.68, 0.84, 1.14, 0.84, 0.68], extrapolate: 'clamp' });
    const rotateY = scrollX.interpolate({ inputRange: range, outputRange: ['55deg', '38deg', '0deg', '-38deg', '-55deg'], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.3, 0.7, 1, 0.7, 0.3], extrapolate: 'clamp' });
    const translateY = scrollX.interpolate({ inputRange: range, outputRange: [16, 7, -2, 7, 16], extrapolate: 'clamp' });

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.coverTouch}>
            <Animated.View style={{ opacity, transform: [{ perspective: 700 }, { translateY }, { rotateY }, { scale }] }}>
                <GemOrb preset={preset} selected={selected} />
            </Animated.View>
        </TouchableOpacity>
    );
};

interface FilterPanelProps {
    activeId: string;
    levelIndex: number;
    onSelect: (id: string) => void;
    onLevelChange: (index: number) => void;
    onReset: () => void;
    onClose: () => void;
}

export default function FilterPanel({ activeId, levelIndex, onSelect, onLevelChange, onReset, onClose }: FilterPanelProps) {
    const enter = useRef(new Animated.Value(0)).current;
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<any>(null);
    const slide = useRef(new Animated.Value(levelIndex)).current;

    const activeIndex = Math.max(0, FILTER_PRESETS.findIndex(p => p.id === activeId));
    const [focusIdx, setFocusIdx] = useState(activeIndex);
    const focusRef = useRef(activeIndex);
    const [trackW, setTrackW] = useState(0);

    // 🆕 Panel entrance: 3D tilt-up
    useEffect(() => {
        Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    // 🆕 Open aagumbodhu active filter center-la irukkum
    useEffect(() => {
        const t = setTimeout(() => {
            scrollRef.current?.scrollTo({ x: activeIndex * ITEM_W, y: 0, animated: false });
        }, 60);
        return () => clearTimeout(t);
    }, []);

    // 🆕 Scroll-la center-la irukkura card-a track pannum (name + apply button-ku)
    useEffect(() => {
        const id = scrollX.addListener(({ value }) => {
            const idx = Math.max(0, Math.min(FILTER_PRESETS.length - 1, Math.round(value / ITEM_W)));
            if (idx !== focusRef.current) {
                focusRef.current = idx;
                setFocusIdx(idx);
            }
        });
        return () => scrollX.removeListener(id);
    }, []);

    // 🆕 Intensity thumb smooth slide
    useEffect(() => {
        Animated.spring(slide, { toValue: levelIndex, useNativeDriver: true, friction: 7, tension: 90 }).start();
    }, [levelIndex]);

    const activePreset = FILTER_PRESETS.find(p => p.id === activeId) || FILTER_PRESETS[0];
    const focused = FILTER_PRESETS[focusIdx] || FILTER_PRESETS[0];
    const isOn = activeId !== 'none';
    const focusedIsActive = focused.id === activeId;

    const handleOrbPress = (idx: number) => {
        scrollRef.current?.scrollTo({ x: idx * ITEM_W, y: 0, animated: true });
        focusRef.current = idx;
        setFocusIdx(idx);
        onSelect(FILTER_PRESETS[idx].id);
    };

    const segW = trackW > 0 ? (trackW - 8) / 3 : 0;
    const thumbColors = (activePreset.id === 'none' ? ['#8B5CF6', '#22D3EE'] : activePreset.colors) as any;

    const applyLabel = focusedIsActive
        ? (focused.id === 'none' ? 'NO FILTER' : 'ACTIVE')
        : (focused.id === 'none' ? 'TURN OFF' : 'APPLY');

    return (
        <Animated.View
            style={[
                styles.wrap,
                {
                    opacity: enter,
                    transform: [
                        { perspective: 900 },
                        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) },
                        { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['14deg', '0deg'] }) },
                        { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
                    ]
                }
            ]}
        >
            <LinearGradient colors={BORDER_COLORS as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.border}>
                <View style={styles.inner}>
                    <LinearGradient colors={['#1B1145', '#0A0F24', '#05141F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    {/* ambient color glow follows focused filter */}
                    <View style={[styles.ambientGlow, { backgroundColor: focused.colors[0] + '2E' }]} pointerEvents="none" />
                    <View style={styles.glowCyan} pointerEvents="none" />
                    {/* top glass sheen */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'] as any}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.topSheen}
                        pointerEvents="none"
                    />

                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <View style={styles.headerBadgeWrap}>
                            <LinearGradient colors={['#FFE9A8', '#F5C84C', '#FF5C9E'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerBadge}>
                                <Ionicons name="sparkles" size={14} color="#0B1026" />
                                <LinearGradient colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'] as any} style={styles.badgeGloss} />
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>GLOW STUDIO</Text>
                        <View style={[styles.activeChip, isOn && { borderColor: activePreset.colors[0] }]}>
                            {isOn && <View style={[styles.activeDot, { backgroundColor: activePreset.colors[0] }]} />}
                            <Text style={[styles.activeChipText, isOn && { color: activePreset.colors[0] }]}>
                                {isOn ? activePreset.name.toUpperCase() : 'NO FILTER'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.iconBtnWrap} onPress={onReset} activeOpacity={0.7}>
                            <LinearGradient colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.04)'] as any} style={styles.iconBtn}>
                                <Ionicons name="refresh" size={15} color="#CBD5E1" />
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtnWrap} onPress={onClose} activeOpacity={0.7}>
                            <LinearGradient colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.04)'] as any} style={styles.iconBtn}>
                                <Ionicons name="close" size={17} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <LinearGradient
                        colors={['transparent', '#F5D27A', '#FF5C9E', '#8B5CF6', '#22D3EE', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.line}
                    />

                    {/* 🎠 3D COVERFLOW CAROUSEL */}
                    <View style={styles.carouselBox}>
                        <Animated.ScrollView
                            ref={scrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={ITEM_W}
                            decelerationRate="fast"
                            scrollEventThrottle={16}
                            contentContainerStyle={{ paddingHorizontal: SIDE_PAD, alignItems: 'center' }}
                            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                        >
                            {FILTER_PRESETS.map((preset, idx) => (
                                <CoverItem
                                    key={preset.id}
                                    index={idx}
                                    scrollX={scrollX}
                                    preset={preset}
                                    selected={preset.id === activeId}
                                    onPress={() => handleOrbPress(idx)}
                                />
                            ))}
                        </Animated.ScrollView>
                    </View>

                    {/* FOCUSED FILTER INFO + 3D APPLY BUTTON */}
                    <View style={styles.infoRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.focusName, { color: focused.colors[0] }]} numberOfLines={1}>{focused.name.toUpperCase()}</Text>
                            <Text style={styles.focusDesc} numberOfLines={1}>{focused.desc}</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={focusedIsActive}
                            onPress={() => onSelect(focused.id)}
                            style={[styles.applyWrap, focusedIsActive && { opacity: 0.75 }]}
                        >
                            <LinearGradient
                                colors={(focusedIsActive ? ['#334155', '#1E293B'] : focused.colors) as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.applyBtn}
                            >
                                <LinearGradient colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'] as any} style={styles.applyGloss} pointerEvents="none" />
                                {focusedIsActive && focused.id !== 'none' && <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{ marginRight: 5 }} />}
                                <Text style={[styles.applyText, !focusedIsActive && { color: '#0B1026' }]}>{applyLabel}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 🎚 3D INTENSITY SWITCH (sliding glossy thumb) */}
                    <View style={[styles.intensityRow, !isOn && { opacity: 0.4 }]}>
                        <Text style={styles.intensityLabel}>INTENSITY</Text>
                        <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
                            <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(255,255,255,0.04)'] as any} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            {segW > 0 && (
                                <Animated.View
                                    style={[
                                        styles.thumb,
                                        {
                                            width: segW,
                                            shadowColor: thumbColors[0],
                                            transform: [{ translateX: slide.interpolate({ inputRange: [0, 2], outputRange: [0, 2 * segW] }) }]
                                        }
                                    ]}
                                >
                                    <LinearGradient colors={thumbColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbFill}>
                                        <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] as any} style={styles.thumbGloss} pointerEvents="none" />
                                    </LinearGradient>
                                </Animated.View>
                            )}
                            {LEVEL_LABELS.map((label, idx) => (
                                <TouchableOpacity
                                    key={label}
                                    style={styles.segTouch}
                                    activeOpacity={0.8}
                                    disabled={!isOn}
                                    onPress={() => onLevelChange(idx)}
                                >
                                    <Text style={[styles.segText, idx === levelIndex && { color: '#0B1026' }]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginHorizontal: 12,
        marginBottom: 14,
        zIndex: 60,
        elevation: 16,
        shadowColor: '#A855F7',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
    },
    border: { borderRadius: 28, padding: 2 },
    inner: { borderRadius: 26, padding: 14, overflow: 'hidden' },
    ambientGlow: { position: 'absolute', top: 30, alignSelf: 'center', left: SCREEN_W / 2 - 12 - 2 - 14 - 110, width: 220, height: 130, borderRadius: 110 },
    glowCyan: { position: 'absolute', bottom: -50, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(34,211,238,0.13)' },
    topSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 70 },

    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBadgeWrap: { shadowColor: '#F5C84C', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
    headerBadge: { width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    badgeGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 13 },
    title: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 3, flex: 1 },
    activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(148,163,184,0.4)', backgroundColor: 'rgba(255,255,255,0.05)' },
    activeDot: { width: 5, height: 5, borderRadius: 3 },
    activeChipText: { color: '#94A3B8', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    iconBtnWrap: { borderRadius: 11 },
    iconBtn: { width: 28, height: 28, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
    line: { height: 1.5, marginTop: 10, marginBottom: 4 },

    // carousel
    carouselBox: { height: 118, marginHorizontal: -14 },
    coverTouch: { width: ITEM_W, height: 118, justifyContent: 'center', alignItems: 'center' },

    // orb
    orbWrap: { width: ORB, height: ORB, borderRadius: 22, backgroundColor: '#0B1026' },
    orbBody: { flex: 1, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    orbEdge: { ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.38)' },
    rimLight: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 6, borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.8 },
    specular: { position: 'absolute', top: 4, left: 7, width: 38, height: 22, borderRadius: 12, transform: [{ rotate: '-18deg' }] },
    specularDot: { position: 'absolute', top: 8, left: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.95)' },
    iconStack: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    iconShadow: { position: 'absolute', left: 2.5, top: 3.5 },
    groundShadow: { position: 'absolute', bottom: -13, alignSelf: 'center', width: ORB * 0.8, height: 9, borderRadius: 5, transform: [{ scaleX: 1 }] },
    haloClip: { position: 'absolute', top: -5, left: -5, width: ORB + 10, height: ORB + 10, borderRadius: 27, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    haloSpinner: { position: 'absolute', width: 130, height: 130, left: (ORB + 10 - 130) / 2, top: (ORB + 10 - 130) / 2 },

    // info
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    focusName: { fontSize: 15, fontWeight: '900', letterSpacing: 2.5 },
    focusDesc: { color: '#94A3B8', fontSize: 10.5, fontWeight: '600', marginTop: 2 },
    applyWrap: { borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, height: 36, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    applyGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    applyText: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },

    // intensity
    intensityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    intensityLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 2, width: 70 },
    track: { flex: 1, height: 38, borderRadius: 15, flexDirection: 'row', padding: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'visible' },
    thumb: { position: 'absolute', top: 4, left: 4, height: 30, borderRadius: 11, shadowOpacity: 0.85, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8, backgroundColor: '#0B1026' },
    thumbFill: { flex: 1, borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
    thumbGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 14 },
    segTouch: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    segText: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
});
