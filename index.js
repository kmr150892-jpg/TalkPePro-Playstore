// Root entry (package.json la "main": "index.js" nu maathanum)
import notifee from '@notifee/react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import {
    cancelIncomingCall,
    handleCallEvent,
    showIncomingCall,
} from './utils/incomingCall';

// App background / killed la call push (data-only) vandha idhu run aagum
setBackgroundMessageHandler(getMessaging(), async (msg) => {
  const data = msg.data || {};
  if (data.type === 'call') await showIncomingCall(data);
  if (data.type === 'call_cancel') await cancelIncomingCall(String(data.callId || ''));
});

// Notification button press (app background la irukkumbodhu)
notifee.onBackgroundEvent(handleCallEvent);

import 'expo-router/entry';

