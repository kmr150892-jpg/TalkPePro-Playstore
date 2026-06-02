import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebaseConfig'; // Unga firebaseConfig path-ah correct panni vechikonga

export const BlockContext = createContext<any>(null);

export const BlockProvider = ({ children }: { children: React.ReactNode }) => {
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  // App open aagum pothu avanga blocked list-ah edukka
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().blockedUsers) {
          setBlockedIds(snap.data().blockedUsers);
        }
      } else {
        setBlockedIds([]); // Logout aana list clear aagidum
      }
    });
    return () => unsubscribe();
  }, []);

  // Block button amukkum pothu velai seiya
  const blockUser = async (targetId: string) => {
    if (!auth.currentUser) return;
    
    // UI-la instant ah hide panna (Without loading delay)
    setBlockedIds((prev) => {
        if (!prev.includes(targetId)) return [...prev, targetId];
        return prev;
    });
    
    // Background-la Firebase-la save panna
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(targetId)
      });
      console.log("User Blocked & Saved to Firebase!");
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  return (
    <BlockContext.Provider value={{ blockedIds, blockUser }}>
      {children}
    </BlockContext.Provider>
  );
};