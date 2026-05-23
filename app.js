import { createClient } from '@supabase/supabase-js';

// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = "https://tmhoklmnevnnfzslsumg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9rbG1uZXZubmZ6c2xzdW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTQ3NjUsImV4cCI6MjA5NTEzMDc2NX0.d2ypO8YM3z0j_xETkuqJVGf2ot1Sh8vZQu2Fm5EgPFw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== GLOBALS ==========
let myId = null, myName = "", partnerId = null, partnerName = "", partnerRealName = "";
let pinHash = null, pinEnabled = false, autoTheme = false, notificationsEnabled = false;
let messagesSubscription = null, typingSubscription = null, presenceSubscription = null;
let typingTimeout = null;

// DOM Elements
const pinOverlay = document.getElementById("pinOverlay"), pinInput = document.getElementById("pinInput"), unlockBtn = document.getElementById("unlockBtn"), pinError = document.getElementById("pinError"), mainApp = document.getElementById("mainApp");
const navBtns = document.querySelectorAll(".nav-btn"), pages = { chats: document.getElementById("chatsPage"), profile: document.getElementById("profilePage"), settings: document.getElementById("settingsPage"), themes: document.getElementById("themesPage") };
const profileNameInput = document.getElementById("profileName"), profileIdSpan = document.getElementById("profileId"), partnerNameInput = document.getElementById("partnerNameInput"), partnerIdInput = document.getElementById("partnerIdInput"), savePartnerBtn = document.getElementById("savePartnerBtn"), profileAvatarImg = document.getElementById("profileAvatarImg"), changePhotoBtn = document.getElementById("changePhotoBtn"), chatPartnerNameSpan = document.getElementById("chatPartnerName"), partnerAvatarHeader = document.getElementById("partnerAvatarHeader"), uploadSpinner = document.getElementById("uploadSpinner"), chatPartnerStatus = document.getElementById("chatPartnerStatus");
const notificationToggle = document.getElementById("notificationToggle");
const messageInput = document.getElementById("messageInput"), sendBtn = document.getElementById("sendBtn"), messagesArea = document.getElementById("messagesArea"), imageUploadBtn = document.getElementById("imageUploadBtn"), chatImageInput = document.getElementById("chatImageInput");
const imagePreviewModal = document.getElementById("imagePreviewModal"), previewImage = document.getElementById("previewImage"), closePreviewBtn = document.getElementById("closePreviewBtn");

// ========== HELPER FUNCTIONS ==========
function escapeHtml(str) { return str.replace(/[&<>]/g, m => m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"); }
function simpleHash(str) { let h = 0; for(let i=0;i<str.length;i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h.toString(); }

// ========== USER INIT & PRESENCE ==========
async function initUser() {
  myId = localStorage.getItem("myId");
  if (!myId) {
    myId = Math.random().toString(36).substring(2, 10);
    localStorage.setItem("myId", myId);
    await supabase.from('users').insert([{ user_id: myId, name: "", photo_url: "" }]);
  }
  const { data } = await supabase.from('users').select('*').eq('user_id', myId).maybeSingle();
  if (data) { myName = data.name; profileNameInput.value = myName; if (data.photo_url) profileAvatarImg.src = data.photo_url; }
  profileIdSpan.textContent = myId;
  
  partnerId = localStorage.getItem("partnerId") || "";
  partnerName = localStorage.getItem("partnerName") || "";
  partnerIdInput.value = partnerId; partnerNameInput.value = partnerName;

  notificationsEnabled = localStorage.getItem("notifications") === "true";
  notificationToggle.checked = notificationsEnabled;
  if(notificationsEnabled && Notification.permission !== 'granted') Notification.requestPermission();

  await loadPartnerDetails();
  setupPresenceAndTyping();
}

async function loadPartnerDetails() {
  if (!partnerId) return;
  const { data } = await supabase.from('users').select('*').eq('user_id', partnerId).maybeSingle();
  if (data) {
    partnerRealName = data.name;
    chatPartnerNameSpan.textContent = partnerName || partnerRealName || partnerId;
    if (data.photo_url) partnerAvatarHeader.src = data.photo_url;
  }
}

// ========== PRESENCE & TYPING ==========
function setupPresenceAndTyping() {
  if (!partnerId) return;
  const roomName = `room:${[myId, partnerId].sort().join('-')}`;
  const channel = supabase.channel(roomName);

  channel.on('broadcast', { event: 'typing' }, (payload) => {
    if (payload.payload.userId === partnerId) {
      chatPartnerStatus.textContent = "Typing...";
      chatPartnerStatus.style.color = "#007aff";
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        chatPartnerStatus.textContent = "Online";
        chatPartnerStatus.style.color = "var(--text-secondary)";
      }, 2000);
    }
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const isPartnerOnline = Object.values(state).flat().some(p => p.userId === partnerId);
    if(chatPartnerStatus.textContent !== "Typing...") {
      chatPartnerStatus.textContent = isPartnerOnline ? "Online" : "Offline";
      chatPartnerStatus.style.color = isPartnerOnline ? "#4caf50" : "var(--text-secondary)";
    }
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') await channel.track({ userId: myId, onlineAt: new Date().toISOString() });
  });

  messageInput.addEventListener("input", () => {
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
  });
}

// ========== CHAT MESSAGES (IMAGES & RECEIPTS) ==========
async function sendMessage(imageUrl = null) {
  if (!partnerId) return;
  const text = messageInput.value.trim();
  if (!text && !imageUrl) return;

  const tempMsg = { 
    id: 'temp-' + Date.now(), from_id: myId, to_id: partnerId, 
    text: text, image_url: imageUrl, created_at: new Date().toISOString(), is_read: false 
  };
  
  appendMessageToDOM(tempMsg, null);
  messageInput.value = "";

  await supabase.from('messages').insert([{ 
    from_id: myId, to_id: partnerId, text: text, image_url: imageUrl 
  }]);
}

// Send normal text
sendBtn.addEventListener("click", () => sendMessage(null));
messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(null); });

// Send Image
imageUploadBtn.addEventListener("click", () => chatImageInput.click());
chatImageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fileName = `${Date.now()}_${myId}.${file.name.split('.').pop()}`;
  
  // Need a 'chat-images' bucket created in Supabase!
  const { error } = await supabase.storage.from('chat-images').upload(fileName, file);
  if (error) { alert("Failed to upload image: " + error.message); return; }
  
  const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
  sendMessage(data.publicUrl);
});

function loadMessages() {
  if (messagesSubscription) messagesSubscription.unsubscribe();
  if (!partnerId) return;
  
  messagesSubscription = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const msg = payload.new;
      if (msg.from_id === partnerId && msg.to_id === myId) {
        appendMessageToDOM(msg, partnerAvatarHeader.src);
        markAsRead([msg.id]); // Mark incoming as read immediately if chat is open
        triggerNotification(msg);
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      const msg = payload.new;
      const existingTick = document.getElementById(`tick-${msg.id}`);
      if (existingTick && msg.is_read) {
        existingTick.className = "fas fa-check-double msg-tick read";
      }
    })
    .subscribe();
    
  fetchMessages();
}

async function fetchMessages() {
  const { data } = await supabase.from('messages').select('*').or(`from_id.eq.${myId},to_id.eq.${myId}`).order('created_at', { ascending: true });
  messagesArea.innerHTML = "";
  
  const unreadIds = [];
  data.forEach(msg => {
    if ((msg.from_id === myId && msg.to_id === partnerId) || (msg.from_id === partnerId && msg.to_id === myId)) {
      appendMessageToDOM(msg, msg.from_id === partnerId ? partnerAvatarHeader.src : null);
      if (msg.to_id === myId && !msg.is_read) unreadIds.push(msg.id);
    }
  });
  if (unreadIds.length > 0) markAsRead(unreadIds);
}

async function markAsRead(messageIds) {
  if (!document.hidden) {
    await supabase.from('messages').update({ is_read: true }).in('id', messageIds);
  }
}

function appendMessageToDOM(msg, photo) {
  const isSent = msg.from_id === myId;
  const div = document.createElement("div");
  div.className = `message ${isSent ? "sent" : "received"}`;
  
  let contentHtml = "";
  if (msg.image_url) {
    contentHtml += `<img src="${msg.image_url}" class="chat-image" onclick="document.getElementById('previewImage').src=this.src; document.getElementById('imagePreviewModal').classList.remove('hidden')">`;
  }
  if (msg.text) contentHtml += `<div>${escapeHtml(msg.text)}</div>`;
  
  let tickHtml = isSent ? `<i id="tick-${msg.id}" class="fas ${msg.is_read ? 'fa-check-double read' : 'fa-check'} msg-tick"></i>` : "";
  
  div.innerHTML = `<div class="message-content">
    ${contentHtml}
    <div class="msg-meta">
      <span>${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      ${tickHtml}
    </div>
  </div>`;
  
  if (!isSent && photo) {
    const img = document.createElement("img");
    img.src = photo; img.className = "message-avatar";
    div.prepend(img);
  }
  
  messagesArea.appendChild(div);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ========== NOTIFICATIONS ==========
function triggerNotification(msg) {
  if (document.hidden && notificationsEnabled && Notification.permission === "granted") {
    new Notification(chatPartnerNameSpan.textContent, {
      body: msg.text || "📷 Sent an image",
      icon: partnerAvatarHeader.src
    });
  }
}

notificationToggle.addEventListener("change", (e) => {
  notificationsEnabled = e.target.checked;
  localStorage.setItem("notifications", notificationsEnabled);
  if (notificationsEnabled) Notification.requestPermission();
});

// ========== BASIC UI BINDINGS (Abbreviated for space) ==========
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(b => b.classList.remove("active")); btn.classList.add("active");
    Object.values(pages).forEach(p => p.classList.remove("active")); pages[btn.dataset.page].classList.add("active");
    if (btn.dataset.page === "chats") loadMessages();
  });
});
closePreviewBtn.onclick = () => imagePreviewModal.classList.add("hidden");

// Bootstrap
(async () => {
  await initUser();
  mainApp.classList.remove("hidden");
  loadMessages();
})();
