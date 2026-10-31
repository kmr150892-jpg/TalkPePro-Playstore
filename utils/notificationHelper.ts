import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const sendNotificationToUser = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'call' | 'payment' | 'system' | 'alert',
  extra?: { callerId?: string; callerImage?: string } // 🔥 NEW: optional extra data (tap -> open user profile, photo on card)
) => {
  try {
    const newNotification = {
      title: title,
      message: message,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      read: false, 
      createdAt: Date.now(),
      ...(extra?.callerId ? { callerId: extra.callerId } : {}), // 🔥 NEW: only added when present (Firestore rejects undefined)
      ...(extra?.callerImage ? { callerImage: extra.callerImage } : {})
    };

    await updateDoc(doc(db, "users", userId), {
      notifications: arrayUnion(newNotification)
    });
    
    console.log("Notification sent successfully!");
  } catch (error) {
    console.error("Error sending notification: ", error);
  }
};