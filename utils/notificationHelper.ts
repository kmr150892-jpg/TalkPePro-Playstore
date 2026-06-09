import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const sendNotificationToUser = async (
  userId: string, 
  title: string, 
  message: string, 
  type: 'call' | 'payment' | 'system' | 'alert'
) => {
  try {
    const newNotification = {
      title: title,
      message: message,
      type: type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      read: false, 
      createdAt: Date.now()
    };

    await updateDoc(doc(db, "users", userId), {
      notifications: arrayUnion(newNotification)
    });
    
    console.log("Notification sent successfully!");
  } catch (error) {
    console.error("Error sending notification: ", error);
  }
};