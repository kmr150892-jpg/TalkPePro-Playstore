const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require('firebase-admin');

// Ensure admin is initialized if not already done elsewhere in your index.js
if (!admin.apps.length) {
    admin.initializeApp();
}

// 🏁 REFLEX BLITZ ARENA MANAGER - CLEAN PRODUCTION REWARD ENGINE
exports.reflexBlitzGlobalManager = onSchedule("every 1 minutes", async (event) => {
    const db = admin.firestore();
    const reflexRef = db.collection('global_games').doc('reflex_arena');

    try {
        const snap = await reflexRef.get();

        if (snap.exists) {
            const data = snap.data();
            
            // Status check and 1-min / 5-min round expiration logic
            if (data.status === 'PLAYING' && data.gameExpiresAt) {
                const now = Date.now();
                if (now >= data.gameExpiresAt) {
                    
                    const players = data.players || [];
                    const entryFee = data.entryFee || 0;
                    const totalPrizePool = players.length * entryFee;

                    let winnerId = null;

                    // 1. Calculate Top Scorer based on Reflex Blitz highscore properties
                    if (players.length > 0) {
                        let maxScore = -1;
                        players.forEach(p => {
                            const currentScore = p.score !== undefined ? p.score : 0;
                            if (currentScore > maxScore) {
                                maxScore = currentScore;
                                winnerId = p.id;
                            }
                        });
                    }

                    // 2. Fallback routing if scores aren't published
                    if (!winnerId && players.length > 0) {
                        winnerId = players[0].id; 
                    }

                    // 🛠️ MULTI-TIER REWARD PROTOCOL: 60% Winner, 30% Admin, 10% Expert (Converted to Beans)
                    const winnerReward = totalPrizePool * 0.60;
                    const adminCommission = totalPrizePool * 0.30;
                    const expertCommission = totalPrizePool * 0.10;
                    const expertBeans = Math.floor(expertCommission / 2); 

                    const batch = db.batch();

                    players.forEach(player => {
                        const isWin = player.id === winnerId;
                        const finalWinAmount = isWin ? winnerReward : 0;
                        
                        // Increment winner balance register safely
                        if (isWin && winnerReward > 0) {
                            const userRef = db.collection("users").doc(player.id);
                            batch.update(userRef, { 
                                balance: admin.firestore.FieldValue.increment(winnerReward) 
                            });
                        }

                        // Write telemetry data record logs to Passbook
                        const historyRef = db.collection("users").doc(player.id).collection("activityHistory").doc();
                        batch.set(historyRef, {
                            type: "GAME_RESULT",
                            status: isWin ? "WIN" : "LOSS",
                            gameName: "REFLEX BLITZ ARENA",
                            sessionId: "reflex_arena",
                            entryFee: entryFee,
                            winAmount: finalWinAmount,
                            lossAmount: isWin ? 0 : entryFee,
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        });
                    });

                    // 4. Finalize Ledger Record Logs
                    batch.update(reflexRef, {
                        status: 'FINISHED',
                        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
                        winnerId: winnerId,
                        totalPool: totalPrizePool,
                        rewardAmount: winnerReward,
                        adminCommission: adminCommission,
                        expertCommission: expertCommission,
                        expertBeans: expertBeans,
                        prizeDistributed: winnerReward
                    });

                    await batch.commit();
                    console.log(`✅ Reflex Blitz Arena Session Concluded. Winner: ${winnerId}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Reflex Engine Error Logs:", error);
    }
});