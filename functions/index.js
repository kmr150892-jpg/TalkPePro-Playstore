const { onDocumentWritten, onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

// 🔧 Firestore database location ku match aaganum (Firebase Console -> Project settings -> Default GCP resource location)
const REGION = "asia-south1";

// Call channel Notifee la (incoming_call_v3) app side la create aagum. Message channel expo-notifications la.
const CALL_CHANNEL = "incoming_call_v3";
const MESSAGE_CHANNEL = "chat_messages_v2";
const RINGING_STATUSES = ["dialing", "calling", "ringing", "pending", "Discover_dialing"];

// 🟢 NEW: Host online notification cooldown (host flicker panna spam avoid panna)
const HOST_ONLINE_COOLDOWN_MS = 10 * 60 * 1000;

// 🟢 NEW: isOnline true / 'true' rendume handle panna
const isTrue = (v) => v === true || v === "true";

async function sendToUser(uid, { title, body, channelId, data, ttlMs, priority, dataOnly }) {
  const userRef = admin.firestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return;

  const tokens = (snap.data().fcmTokens || []).filter(Boolean);
  if (tokens.length === 0) return;

  const strData = {};
  Object.entries(data || {}).forEach(([k, v]) => { strData[k] = String(v == null ? "" : v); });

  const message = {
    tokens,
    data: strData,
    android: { priority: "high", ttl: ttlMs },
  };
  // dataOnly = true na system notification varaadhu, app (Notifee) dhaan kaattum
  if (!dataOnly) {
    message.notification = { title, body };
    message.android.notification = { channelId, priority, visibility: "public" };
  }

  const res = await admin.messaging().sendEachForMulticast(message);

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

// 📞 Host ku call vandha push (data-only) + call mudinjaa / cancel aanaa notification remove
exports.onCallRinging = onDocumentWritten(
  { document: "calls/{callId}", region: REGION },
  async (event) => {
    const before = event.data && event.data.before && event.data.before.data();
    const after = event.data && event.data.after && event.data.after.data();
    if (!after) return;

    // Ringing la irundhu vera status ku maariducha -> notification remove panna cancel push
    if (
      before &&
      RINGING_STATUSES.includes(before.status) &&
      !RINGING_STATUSES.includes(after.status) &&
      after.pushSent &&
      after.expertId
    ) {
      await sendToUser(after.expertId, {
        channelId: CALL_CHANNEL,
        priority: "max",
        ttlMs: 30000,
        dataOnly: true,
        data: { type: "call_cancel", callId: event.params.callId },
      });
      return;
    }

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

    let callerName = after.callerName;
    if (!callerName && after.callerId) {
      const cSnap = await db.collection("users").doc(after.callerId).get();
      callerName = cSnap.exists ? (cSnap.data().name || "A user") : "A user";
    }

    await sendToUser(after.expertId, {
      channelId: CALL_CHANNEL,
      priority: "max",
      ttlMs: 30000,
      dataOnly: true,
      data: {
        type: "call",
        callId: event.params.callId,
        callerId: after.callerId || "",
        callerName: callerName || "A user",
      },
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

// 🟢 NEW: Host offline -> online aanaa, avangaloda connected (friend) users ku mattum push
exports.onHostOnline = onDocumentUpdated(
  { document: "users/{hostId}", region: REGION },
  async (event) => {
    const before = event.data && event.data.before && event.data.before.data();
    const after = event.data && event.data.after && event.data.after.data();
    if (!before || !after) return;

    // offline -> online maarina mattum
    if (isTrue(before.isOnline) || !isTrue(after.isOnline)) return;

    const hostId = event.params.hostId;
    const db = admin.firestore();
    const hostRef = event.data.after.ref;

    // Cooldown + duplicate protection (oru thadavai mattum claim pannu)
    const claimed = await db.runTransaction(async (tx) => {
      const s = await tx.get(hostRef);
      if (!s.exists) return false;
      const last = s.data().lastOnlineNotifiedAt;
      const lastMs = last && last.toMillis ? last.toMillis() : 0;
      if (Date.now() - lastMs < HOST_ONLINE_COOLDOWN_MS) return false;
      tx.update(hostRef, { lastOnlineNotifiedAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) return;

    // Connected users = connections la receiverId == host, status == 'friend'
    const connSnap = await db
      .collection("connections")
      .where("receiverId", "==", hostId)
      .where("status", "==", "friend")
      .get();

    const userIds = [...new Set(connSnap.docs.map((d) => d.data().senderId).filter(Boolean))];
    if (userIds.length === 0) return;

    const hostBlocked = Array.isArray(after.blockedUsers) ? after.blockedUsers : [];
    const hostName = after.name || after.userName || "Your host";

    const sendOne = async (uid) => {
      try {
        if (hostBlocked.includes(uid)) return;

        const uSnap = await db.collection("users").doc(uid).get();
        if (!uSnap.exists) return;
        const u = uSnap.data();

        // User settings la notification off panniruntha skip
        if (u.pushEnabled === false) return;
        // User host a block panniruntha skip
        if (Array.isArray(u.blockedUsers) && u.blockedUsers.includes(hostId)) return;

        await sendToUser(uid, {
          title: `${hostName} is online now 🟢`,
          body: "Tap to connect with them.",
          channelId: MESSAGE_CHANNEL,
          priority: "high",
          ttlMs: 60 * 60 * 1000,
          data: {
            type: "host_online",
            hostId,
            hostName,
          },
        });
      } catch (e) {
        console.log("Host online push error for", uid, e);
      }
    };

    // 20 users oru batch ah anuppu
    for (let i = 0; i < userIds.length; i += 20) {
      await Promise.all(userIds.slice(i, i + 20).map(sendOne));
    }
  }
);