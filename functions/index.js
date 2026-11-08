const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require('firebase-admin');

// Ensure admin is initialized if not already done elsewhere in your index.js
if (!admin.apps.length) {
    admin.initializeApp();
}

// 🔔 NEW: Push notifications (app close la irundhaalum call / chat notification)
const push = require("./pushNotifications");
exports.onCallRinging = push.onCallRinging;
exports.onChatMessage = push.onChatMessage;

// 🏁 REFLEX BLITZ ARENA MANAGER - FREE-TO-PLAY (NO ENTRY FEE, NO REWARD, NO COMMISSION)
// 🆕 FREE-TO-PLAY UPDATE: This function now ONLY decides the winner and closes the round.
// Wallet balance, diamonds payout, admin/expert commission, passbook money logs are all removed.
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

                    // 3. Finalize round (winner name only, no money involved)
                    await reflexRef.update({
                        status: 'FINISHED',
                        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
                        winnerId: winnerId
                    });

                    console.log(`✅ Reflex Blitz Arena Session Concluded. Winner: ${winnerId}`);
                }
            }
        }
    } catch (error) {
        console.error("❌ Reflex Engine Error Logs:", error);
    }
});