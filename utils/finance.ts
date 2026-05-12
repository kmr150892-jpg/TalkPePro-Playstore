import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

// 🚀 SECURE LEDGER ACTIVITY PROTOCOL
export const recordTransaction = async (
  userId: string, 
  userName: string, 
  amount: number, 
  type: 'RECHARGE' | 'CALL_DEDUCTION' | 'PAYOUT',
  details: string = ""
) => {
  try {
    await addDoc(collection(db, "transactions"), {
      userId,
      userName,
      amount,
      type,
      details,
      timestamp: serverTimestamp(),
      status: "SUCCESS"
    });
    console.log(`✅ Secure ${type} recorded in System Ledger`);
  } catch (error) {
    console.error("❌ Secure Ledger Synchronization Failed:", error);
  }
};