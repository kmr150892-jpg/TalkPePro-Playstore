const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Admin App safely
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

exports.processResult = functions.firestore
  .document('global_games/fortune_clash')
  .onUpdate(async (change, context) => {
    const data = change.after.data();

    // 🌍 We trigger the logic when the GLOBAL Engine signals 'ROLLING' with trigger
    if (data.phase === 'ROLLING' && data.triggerBackend === true) {
      
      const roundId = data.roundId;
      // Global allocations are stored under the current round
      const allocationsRef = db.collection('global_games').doc('fortune_clash').collection('rounds').doc(roundId.toString()).collection('bets');
      const allocationsSnap = await allocationsRef.get();

      let totalZoneA = 0; // Previously totalSmall
      let totalZoneB = 0; // Previously totalBig

      // 1. Calculate total allocated diamonds from ALL rooms globally (🔥 NO REFUNDS, FULL ACTIVITY CYCLE 🔥)
      allocationsSnap.forEach(doc => {
          const allocation = doc.data();
          if (allocation.pick === 'SMALL') totalZoneA += allocation.amount;
          if (allocation.pick === 'BIG') totalZoneB += allocation.amount;
      });

      let forcedResultType = '';
      let systemBalanceFavored = '';

      // 2. The Smart System Logic (Platform Economy Management)
      if (totalZoneA === 0 || totalZoneB === 0) {
          forcedResultType = Math.random() < 0.5 ? 'SMALL' : 'BIG';
          systemBalanceFavored = 'RNG_FALLBACK';
      } else if (totalZoneA < totalZoneB) {
          forcedResultType = 'SMALL'; // Zone A yields, System manages Zone B
          systemBalanceFavored = 'SMALL';
      } else if (totalZoneB < totalZoneA) {
          forcedResultType = 'BIG'; // Zone B yields, System manages Zone A
          systemBalanceFavored = 'BIG';
      } else {
          forcedResultType = Math.random() < 0.5 ? 'SMALL' : 'BIG';
          systemBalanceFavored = 'EQUAL_ALLOCATIONS';
      }

      // 3. Generate 4 numbers that sum up to the target result
      let n1, n2, n3, n4, sum;
      do {
        n1 = Math.floor(Math.random() * 6) + 1;
        n2 = Math.floor(Math.random() * 6) + 1;
        n3 = Math.floor(Math.random() * 6) + 1;
        n4 = Math.floor(Math.random() * 6) + 1;
        sum = n1 + n2 + n3 + n4;
      } while (
        (forcedResultType === 'SMALL' && sum > 13) || 
        (forcedResultType === 'BIG' && sum <= 13)
      );

      // --- 4. EXECUTE DISTRIBUTIONS & REWARDS ---
      const batch = db.batch();

      // Process ALL Allocations (Success & Attempt Limits)
      allocationsSnap.forEach(doc => {
        const b = doc.data();
        let successYield = 0;
        let attemptDeduction = 0;
        
        // A. Process Success/Limit Stats & Distributions
        if (b.pick === forcedResultType) {
            successYield = b.amount * 1.8;
            attemptDeduction = 0;
            
            // ✅ Update User Profile for SUCCESS
            batch.update(db.collection('users').doc(b.userId), { 
                balance: admin.firestore.FieldValue.increment(successYield),
                totalActivitySuccess: admin.firestore.FieldValue.increment(1),
                totalDiamondsYielded: admin.firestore.FieldValue.increment(successYield),
                totalDiamondsAllocated: admin.firestore.FieldValue.increment(b.amount)
            });
        } else {
            successYield = 0;
            attemptDeduction = b.amount;

            // ✅ Update User Profile for ATTEMPT LIMIT
            batch.update(db.collection('users').doc(b.userId), { 
                totalActivityLimits: admin.firestore.FieldValue.increment(1),
                totalDiamondsConsumed: admin.firestore.FieldValue.increment(attemptDeduction),
                totalDiamondsAllocated: admin.firestore.FieldValue.increment(b.amount)
            });
        }

        // B. ✅ SAVE USER SPECIFIC ACTIVITY HISTORY (For their Stats UI)
        const userHistoryRef = db.collection('users').doc(b.userId).collection('gameHistory').doc();
        batch.set(userHistoryRef, {
            roundId: roundId,
            liveId: b.liveId || 'unknown_room',
            hostId: b.hostId || 'unknown_host',
            gameType: 'DICE_ACTIVITY',
            allocatedAmount: b.amount,
            pick: b.pick,
            result: forcedResultType,
            status: b.pick === forcedResultType ? 'SUCCESS' : 'LIMITED',
            yieldAmount: successYield,
            consumedAmount: attemptDeduction,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // C. Consultant Reward (🔥 Exactly 5% Rewards based on Diamonds spent)
        if (b.hostId && b.liveId) {
            const rewardInUnits = Math.floor(b.amount * 0.05); 
            if (rewardInUnits > 0) {
                const userRef = db.collection('users').doc(b.hostId);
                batch.update(userRef, {
                    totalBeansEarned: admin.firestore.FieldValue.increment(rewardInUnits),
                    walletBalance: admin.firestore.FieldValue.increment(rewardInUnits),
                    todayBeans: admin.firestore.FieldValue.increment(rewardInUnits)
                });

                const liveRef = db.collection('lives').doc(b.liveId);
                batch.update(liveRef, {
                    gameBeansCollected: admin.firestore.FieldValue.increment(rewardInUnits)
                });
            }
        }
      });

      // 5. Update Global Result in Database
      await change.after.ref.update({
        slots: [n1, n2, n3, n4],
        totalSum: sum,
        resultType: forcedResultType,
        triggerBackend: false // Reset trigger
      });

      // 6. SAVE GLOBAL HISTORY
      const historyRef = db.collection('global_games').doc('fortune_clash').collection('gameHistory');
      await historyRef.add({
        roundId: roundId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        resultType: forcedResultType,
        slots: [n1, n2, n3, n4],
        totalSum: sum,
        totalZoneAAllocated: totalZoneA,
        totalZoneBAllocated: totalZoneB,
        systemBalanceState: systemBalanceFavored
      });

      // Execute all wallet & stats updates at once
      await batch.commit();

      console.log(`[Global Activity] Round ${roundId} Result: ${forcedResultType}. ZA:${totalZoneA} vs ZB:${totalZoneB}. FULL CYCLE COMPLETED.`);
    }
});