const { onDocumentWritten, onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

// 🔧 Firestore database location ku match aaganum (Firebase Console -> Project settings -> Default GCP resource location)
const REGION = "asia-south1";

const CALL_CHANNEL = "incoming_call_v2";
const MESSAGE_CHANNEL = "chat_messages_v2";
const RINGING_STATUSES = ["dialing", "calling", "ringing", "pending", "Discover_dialing"];

async function sendToUser(uid, { title, body, channelId, data, ttlMs, priority }) {
  const userRef = admin.firestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return;

  const tokens = (snap.data().fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) return;

  const strData = {};
  Object.entries(data || {}).forEach(([k, v]) => { strData[k] = String(v == null ? "" : v); });

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: strData,
    android: {
      priority: "high",
      ttl: ttlMs,
      notification: {
        channelId,
        priority,
        visibility: "public",
      },
    },
  });

  // Invalid / pazhaya tokens clean pannu
  const bad = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) bad.push(tokens[i]);
  });
  if (bad.length > 0) {
    await userRef.update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...bad) });
  }
}

// 📞 Host ku call vandha push
exports.onCallRinging = onDocumentWritten(
  { document: "calls/{callId}", region: REGION },
  async (event) => {
    const after = event.data && event.data.after && event.data.after.data();
    if (!after) return;
    if (after.pushSent) return;
    if (!RINGING_STATUSES.includes(after.status)) return;
    if (!after.expertId) return;

    const created = after.createdAt && after.createdAt.toMillis ? after.createdAt.toMillis() : Date.now();
    if (Date.now() - created > 60000) return; // pazhaya call ku push vendaam

    // Duplicate push varaama oru thadavai mattum claim pannu
    const ref = event.data.after.ref;
    const claimed = await admin.firestore().runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists || s.data().pushSent) return false;
      tx.update(ref, { pushSent: true });
      return true;
    });
    if (!claimed) return;

    const db = admin.firestore();
    const expertSnap = await db.collection("users").doc(after.expertId).get();
    if (!expertSnap.exists) return;
    if (expertSnap.data().isBusy === true) return; // host vera call la irukkaanga

    const callerUid = after.callerId || after.userId;
    let callerName = after.callerName || after.userName;
    if (!callerName && callerUid) {
      const cSnap = await db.collection("users").doc(callerUid).get();
      callerName = cSnap.exists ? (cSnap.data().name || "A user") : "A user";
    }

    await sendToUser(after.expertId, {
      title: "Incoming call 📞",
      body: `${callerName || "A user"} is calling you`,
      channelId: CALL_CHANNEL,
      priority: "max",
      ttlMs: 30000,
      data: { type: "call", callId: event.params.callId, callerId: callerUid || "" },
    });
  }
);

// 💬 Puthu message vandha push
exports.onChatMessage = onDocumentCreated(
  { document: "chats/{chatId}/messages/{msgId}", region: REGION },
  async (event) => {
    const msg = event.data && event.data.data();
    if (!msg || !msg.senderId || !msg.text) return;

    const db = admin.firestore();
    const chatId = event.params.chatId;

    // chatId = sorted(uid1_uid2). Illana chat doc participants use pannu
    let receiverId = chatId.split("_").find((id) => id && id !== msg.senderId);
    let receiverSnap = receiverId ? await db.collection("users").doc(receiverId).get() : null;

    if (!receiverSnap || !receiverSnap.exists) {
      const chatSnap = await db.collection("chats").doc(chatId).get();
      const parts = chatSnap.exists ? (chatSnap.data().participants || []) : [];
      receiverId = parts.find((id) => id && id !== msg.senderId);
      if (!receiverId) return;
      receiverSnap = await db.collection("users").doc(receiverId).get();
      if (!receiverSnap.exists) return;
    }

    const senderSnap = await db.collection("users").doc(msg.senderId).get();
    const senderData = senderSnap.exists ? senderSnap.data() : {};
    const receiverData = receiverSnap.data();

    // Block aana push vendaam
    const recvBlocked = Array.isArray(receiverData.blockedUsers) && receiverData.blockedUsers.includes(msg.senderId);
    const sendBlocked = Array.isArray(senderData.blockedUsers) && senderData.blockedUsers.includes(receiverId);
    if (recvBlocked || sendBlocked) return;

    const text = String(msg.text);
    await sendToUser(receiverId, {
      title: senderData.name || "New message",
      body: text.length > 100 ? text.slice(0, 100) + "…" : text,
      channelId: MESSAGE_CHANNEL,
      priority: "high",
      ttlMs: 24 * 60 * 60 * 1000,
      data: {
        type: "message",
        chatId,
        senderId: msg.senderId,
        senderName: senderData.name || "",
      },
    });
  }
);