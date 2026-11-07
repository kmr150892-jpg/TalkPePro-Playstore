import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

let ringPlayer: AudioPlayer | null = null;
let msgPlayer: AudioPlayer | null = null;
let notifPlayer: AudioPlayer | null = null; // 🔔 NEW
let modeSet = false;
let ringRequested = false;

// 🔕 Sound on/off settings (phone la save aagum)
const RING_KEY = '@sound_ring_enabled';
const MSG_KEY = '@sound_msg_enabled';
const NOTIF_KEY = '@sound_notif_enabled'; // 🔔 NEW
let ringEnabled = true;
let msgEnabled = true;
let notifEnabled = true; // 🔔 NEW
let settingsLoaded = false;

const loadSettings = async () => {
  if (settingsLoaded) return;
  try {
    const [r, m, n] = await Promise.all([
      AsyncStorage.getItem(RING_KEY),
      AsyncStorage.getItem(MSG_KEY),
      AsyncStorage.getItem(NOTIF_KEY),
    ]);
    if (r === 'false') ringEnabled = false;
    if (m === 'false') msgEnabled = false;
    if (n === 'false') notifEnabled = false;
  } catch (e) {}
  settingsLoaded = true;
};
loadSettings();

export const getSoundSettings = async () => {
  await loadSettings();
  return { ring: ringEnabled, message: msgEnabled, notif: notifEnabled };
};

export const setRingEnabled = async (value: boolean) => {
  ringEnabled = value;
  settingsLoaded = true;
  if (!value) stopRingtone();
  try { await AsyncStorage.setItem(RING_KEY, String(value)); } catch (e) {}
};

export const setMessageEnabled = async (value: boolean) => {
  msgEnabled = value;
  settingsLoaded = true;
  try { await AsyncStorage.setItem(MSG_KEY, String(value)); } catch (e) {}
};

// 🔔 NEW
export const setNotifSoundEnabled = async (value: boolean) => {
  notifEnabled = value;
  settingsLoaded = true;
  try { await AsyncStorage.setItem(NOTIF_KEY, String(value)); } catch (e) {}
};

const ensureAudioMode = async () => {
  if (modeSet) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    modeSet = true;
  } catch (e) {
    console.log('Audio mode error', e);
  }
};

export const startRingtone = async () => {
  ringRequested = true;
  if (ringPlayer) return;
  try {
    await loadSettings();
    if (!ringEnabled) return;
    await ensureAudioMode();
    if (!ringRequested || ringPlayer) return;
    ringPlayer = createAudioPlayer(require('../assets/sounds/ringtone.mp3'));
    ringPlayer.loop = true;
    ringPlayer.volume = 1;
    ringPlayer.play();
    if (Platform.OS !== 'web') Vibration.vibrate([0, 800, 700], true);
  } catch (e) {
    console.log('Ringtone start error', e);
  }
};

export const stopRingtone = () => {
  ringRequested = false;
  try {
    if (ringPlayer) {
      ringPlayer.pause();
      ringPlayer.remove();
      ringPlayer = null;
    }
    Vibration.cancel();
  } catch (e) {
    ringPlayer = null;
  }
};

export const playMessageSound = async () => {
  try {
    await loadSettings();
    if (!msgEnabled) return;
    await ensureAudioMode();
    if (!msgPlayer) {
      msgPlayer = createAudioPlayer(require('../assets/sounds/message.mp3'));
    }
    msgPlayer.seekTo(0);
    msgPlayer.play();
  } catch (e) {
    console.log('Message sound error', e);
  }
};

// 🔔 NEW: bell notification sound (message.mp3 thaan use pannum; vera sound venum na assets/sounds/notification.mp3 podunga)
export const playNotificationSound = async () => {
  try {
    await loadSettings();
    if (!notifEnabled) return;
    await ensureAudioMode();
    if (!notifPlayer) {
      notifPlayer = createAudioPlayer(require('../assets/sounds/notification.mp3'));
    }
    notifPlayer.seekTo(0);
    notifPlayer.play();
  } catch (e) {
    console.log('Notification sound error', e);
  }
};