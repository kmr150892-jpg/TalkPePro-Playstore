const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (admin.apps.length === 0) { admin.initializeApp(); }
const db = admin.firestore();

exports.processResult = functions.firestore
  .document('global_games/turbo_racing') 
  .onUpdate(async (change, context) => {
    const data = change.after.data();

    // 🌍 We trigger the logic when the GLOBAL Engine signals 'ROLLING' with trigger
    if (data.phase === 'ROLLING' && data.triggerBackend === true) {
      const roundId = data.roundId;
      const allocationsRef = db.collection('global_games').doc('turbo_racing').collection('rounds').doc(roundId.toString()).collection('bets');
      const allocationsSnap = await allocationsRef.get();

      let totalRed = 0; let totalGreen = 0; let totalBlue = 0;

      allocationsSnap.forEach(doc => {
          const allocation = doc.data();
          if (allocation.pick === 'RED') totalRed += allocation.amount;
          if (allocation.pick === 'GREEN') totalGreen += allocation.amount;
          if (allocation.pick === 'BLUE') totalBlue += allocation.amount;
      });

      let forcedResultType = ''; let systemBalanceFavored = '';
      const allocations = [
          { type: 'RED', amount: totalRed }, 
          { type: 'GREEN', amount: totalGreen }, 
          { type: 'BLUE', amount: totalBlue }
      ];
      allocations.sort((a, b) => a.amount - b.amount);

      if (totalRed === 0 || totalGreen === 0 || totalBlue === 0) {
          const options = ['RED', 'GREEN', 'BLUE'];
          forcedResultType = options[Math.floor(Math.random() * options.length)];
          systemBalanceFavored = 'RNG_FALLBACK';
      } else {
          forcedResultType = allocations[0].type; 
          systemBalanceFavored = allocations[0].type; 
          if (allocations[0].amount === allocations[1].amount) { 
              forcedResultType = Math.random() < 0.5 ? allocations[0].type : allocations[1].type; 
          }
      }

      // We update the Global Game doc IMMEDIATELY so the frontend knows the success type
      // and starts moving the winning car to the finish line
      await change.after.ref.update({ resultType: forcedResultType, triggerBackend: false });

      // 🔥 THE MASTER SUSPENSE FIX: Delay the actual Distribution by 12 Seconds 🔥
      // This ensures the wallet balance only increases AFTER the cars finish racing
      setTimeout(async () => {
          try {
              const batch = db.batch();

              allocationsSnap.forEach(doc => {
                const b = doc.data();
                let yieldAmount = 0; let consumedAmount = 0;
                
                if (b.pick === forcedResultType) {
                    yieldAmount = b.amount * 2; // ✅ 2.0x Yield
                    consumedAmount = 0;
                    batch.update(db.collection('users').doc(b.userId), { 
                        balance: admin.firestore.FieldValue.increment(yieldAmount),
                        totalActivitySuccess: admin.firestore.FieldValue.increment(1),
                        totalDiamondsYielded: admin.firestore.FieldValue.increment(yieldAmount),
                        totalDiamondsAllocated: admin.firestore.FieldValue.increment(b.amount)
                    });
                } else {
                    yieldAmount = 0; consumedAmount = b.amount;
                    batch.update(db.collection('users').doc(b.userId), { 
                        totalActivityLimits: admin.firestore.FieldValue.increment(1),
                        totalDiamondsConsumed: admin.firestore.FieldValue.increment(consumedAmount),
                        totalDiamondsAllocated: admin.firestore.FieldValue.increment(b.amount)
                    });
                }

                // B. ✅ SAVE USER SPECIFIC ACTIVITY HISTORY (For their Stats UI)
                const userHistoryRef = db.collection('users').doc(b.userId).collection('gameHistory').doc();
                batch.set(userHistoryRef, {
                    roundId: roundId,
                    liveId: b.liveId || 'unknown_room',
                    hostId: b.hostId || 'unknown_host',
                    gameType: 'RACING_ACTIVITY', 
                    allocatedAmount: b.amount,
                    pick: b.pick,      
                    result: forcedResultType,
                    status: b.pick === forcedResultType ? 'SUCCESS' : 'LIMITED',
                    yieldAmount: yieldAmount,
                    consumedAmount: consumedAmount,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                if (b.hostId && b.liveId) {
                    const rewardInUnits = Math.floor(b.amount * 0.05); 
                    if (rewardInUnits > 0) {
                        batch.update(db.collection('users').doc(b.hostId), {
                            totalBeansEarned: admin.firestore.FieldValue.increment(rewardInUnits),
                            walletBalance: admin.firestore.FieldValue.increment(rewardInUnits),
                            todayBeans: admin.firestore.FieldValue.increment(rewardInUnits)
                        });
                        batch.update(db.collection('lives').doc(b.liveId), { gameBeansCollected: admin.firestore.FieldValue.increment(rewardInUnits) });
                    }
                }
              });

              await db.collection('global_games').doc('turbo_racing').collection('gameHistory').add({
                roundId: roundId, timestamp: admin.firestore.FieldValue.serverTimestamp(), resultType: forcedResultType,
                totalRedAllocated: totalRed, totalGreenAllocated: totalGreen, totalBlueAllocated: totalBlue, systemBalanceState: systemBalanceFavored
              });

              await batch.commit();
              console.log(`[Racing Activity] Round ${roundId} Distribution Completed: ${forcedResultType}.`);
          } catch (error) {
              console.error("[Racing Activity] Distribution Error:", error);
          }
      }, 12000); // 🔥 12000 milliseconds = 12 Seconds Delay (Suspense fixed!)
    }
});