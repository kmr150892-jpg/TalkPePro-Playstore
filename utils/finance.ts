import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

// 🚀 MASTER TRANSACTION FUNCTION
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
    console.log(`✅ ${type} Logged in Ledger`);
  } catch (error) {
    console.error("❌ Ledger Update Failed:", error);
  }
};