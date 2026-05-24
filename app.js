import { createClient } from '@supabase/supabase-js';

// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = "https://tmhoklmnevnnfzslsumg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9rbG1uZXZubmZ6c2xzdW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTQ3NjUsImV4cCI6MjA5NTEzMDc2NX0.d2ypO8YM3z0j_xETkuqJVGf2ot1Sh8vZQu2Fm5EgPFw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== GLOBALS ==========
let myId = null, myName = "", partnerId = null, partnerName = "", partnerRealName = "";
let pinHash = null, pinEnabled = false;
let autoTheme = false;
let notificationsEnabled = false;
let messagesSubscription = null;
let presenceChannel = null;
let typingTimeout = null;
let isPartnerOpenChat = false;

// DOM Elements
const pinOverlay = document.getElementById("pinOverlay");
const pinInput = document.getElementById("pinInput");
const unlockBtn = document.getElementById("unlockBtn");
const pinError = document.getElementById("pinError");
const mainApp = document.getElementById("mainApp");

// Navigation
const navBtns = document.querySelectorAll(".nav-btn");
const pages = {
  chats: document.getElementById("chatsPage"),
  profile: document.getElementById("profilePage"),
  settings: document.getElementById("settingsPage"),
  themes: document.getElementById("themesPage")
};

// Profile elements
const profileNameInput = document.getElementById("profileName");
const profileIdSpan = document.getElementById("profileId");
const partnerNameInput = document.getElementById("partnerNameInput");
const partnerIdInput = document.getElementById("partnerIdInput");
const savePartnerBtn = document.getElementById("savePartnerBtn");
const profileAvatarImg = document.getElementById("profileAvatarImg");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const chatPartnerNameSpan = document.getElementById("chatPartnerName");
const partnerAvatarHeader = document.getElementById("partnerAvatarHeader");
const uploadSpinner = document.getElementById("uploadSpinner");

// Settings
const notificationToggle = document.getElementById("notificationToggle");
const pinToggle = document.getElementById("pinToggle");
const newPinInput = document.getElementById("newPinInput");
const savePinBtn = document.getElementById("savePinBtn");
const oldPinInput = document.getElementById("oldPinInput");
const changeNewPinInput = document.getElementById("changeNewPinInput");
const changePinBtn = document.getElementById("changePinBtn");
const resetAppBtn = document.getElementById("resetAppBtn");
const shareIdBtn = document.getElementById("shareIdBtn");

// Themes & Wallpaper
const autoThemeToggle = document.getElementById("autoThemeToggle");
const themeGrid = document.getElementById("themeGrid");
const wallpaperGrid = document.getElementById("wallpaperGrid");
const uploadWallpaperBtn = document.getElementById("uploadWallpaperBtn");
const chatContainer = document.getElementById("chatContainer");

// Chat elements
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const chatImageInput = document.getElementById("chatImageInput");
const messagesArea = document.getElementById("messagesArea");
const partnerStatus = document.getElementById("partnerStatus");
const typingIndicator = document.getElementById("typingIndicator");
const chatUploadProgress = document.getElementById("chatUploadProgress");

// Modals
const customModal = document.getElementById("customModal");
const modalMessage = document.getElementById("modalMessage");
const modalOkBtn = document.getElementById("modalOkBtn");
const qrModal = document.getElementById("qrModal");
const qrIdSpan = document.getElementById("qrId");
const shareLinkInput = document.getElementById("shareLinkInput");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const closeQrBtn = document.getElementById("closeQrBtn");
const imagePreviewModal = document.getElementById("imagePreviewModal");
const previewImage = document.getElementById("previewImage");
const closePreviewBtn = document.getElementById("closePreviewBtn");

// ========== HELPER FUNCTIONS ==========
function showMessage(msg, isError = false) {
  modalMessage.textContent = msg;
  customModal.classList.remove("hidden");
  if (isError) modalMessage.style.color = "var(--danger)";
  else modalMessage.style.color = "inherit";
}
modalOkBtn.onclick = () => customModal.classList.add("hidden");

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, m => m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;");
}

function formatDate(dateString) {
  const options = { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true,
    timeZone: 'Africa/Addis_Ababa' // Ensures standard EAT local time format
  };
  return new Date(dateString).toLocaleTimeString('en-US', options);
}

// ========== NOTIFICATIONS (SAFE API) ==========
function setupNotifications() {
  notificationsEnabled = localStorage.getItem("notificationsEnabled") === "true";
  notificationToggle.checked = notificationsEnabled;

  notificationToggle.addEventListener("change", async (e) => {
    if (e.target.checked) {
      if (!("Notification" in window)) {
        showMessage("Push notifications not supported on this device/browser.", true);
        notificationToggle.checked = false;
        return;
      }
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          notificationsEnabled = true;
          localStorage.setItem("notificationsEnabled", "true");
          showMessage("Notifications enabled!");
        } else {
          notificationToggle.checked = false;
          showMessage("Permission denied. Enable it in your browser settings.", true);
        }
      } else {
        notificationsEnabled = true;
        localStorage.setItem("notificationsEnabled", "true");
      }
    } else {
      notificationsEnabled = false;
      localStorage.setItem("notificationsEnabled", "false");
    }
  });
}

function triggerPushAlert(title, body) {
  if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
    // Only fire if the app is hidden or backgrounded
    if (document.hidden) {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
           navigator.serviceWorker.ready.then((registration) => {
             registration.showNotification(title, {
               body: body,
               icon: 'icon.png', // Fallback PWA icon
               badge: 'icon.png',
               vibrate: [200, 100, 200]
             });
           });
        } else {
           new Notification(title, { body: body });
        }
      } catch(err) {
        console.warn("Notification error:", err);
      }
    }
  }
}

// ========== USER INIT & DB RECONSTRUCTION ==========
async function generateUniqueId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id;
  do {
    id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const { data } = await supabase.from('users').select('user_id').eq('user_id', id).maybeSingle();
    if (!data) break;
  } while (true);
  return id;
}

async function initUser() {
  let storedId = localStorage.getItem("myId");
  let storedName = localStorage.getItem("myName") || "";
  let storedPhoto = localStorage.getItem("myPhoto") || "";
  
  if (storedId) {
    myId = storedId;
    myName = storedName;
    // DATABASE RECONSTRUCTION FALLBACK
    // Check if ID exists in cloud. If dropped/wiped, silently recreate.
    const { data, error } = await supabase.from('users').select('photo_url, name').eq('user_id', myId).maybeSingle();
    
    if (!data) {
      // Missing from DB, reconstruct from local
      await supabase.from('users').insert([{ 
        user_id: myId, 
        name: myName, 
        photo_url: storedPhoto, 
        created_at: new Date() 
      }]);
    } else {
      if (data.photo_url) {
        profileAvatarImg.src = data.photo_url;
        localStorage.setItem("myPhoto", data.photo_url);
      }
      if (data.name) {
        myName = data.name;
        profileNameInput.value = myName;
      }
    }
  } else {
    myId = await generateUniqueId();
    localStorage.setItem("myId", myId);
    await supabase.from('users').insert([{ user_id: myId, name: "", photo_url: "", created_at: new Date() }]);
  }
  
  profileIdSpan.textContent = myId;
  profileNameInput.value = myName;
  
  partnerId = localStorage.getItem("partnerId") || "";
  partnerName = localStorage.getItem("partnerName") || "";
  partnerIdInput.value = partnerId;
  partnerNameInput.value = partnerName;
  updateChatHeader();
  
  pinEnabled = localStorage.getItem("pinEnabled") === "true";
  pinToggle.checked = pinEnabled;
  if (pinEnabled) pinHash = localStorage.getItem("pinHash");
  
  autoTheme = localStorage.getItem("autoTheme") === "true";
  autoThemeToggle.checked = autoTheme;
  
  setupNotifications();
  loadThemeAndWallpaper();
  await loadPartnerDetails();
  setupPresence();
}

async function loadPartnerDetails() {
  if (!partnerId) {
    chatPartnerNameSpan.textContent = "No partner linked";
    partnerAvatarHeader.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle fill='%23ccc' cx='50' cy='50' r='50'/%3E%3Ctext fill='white' x='50' y='67' text-anchor='middle' font-size='50'%3E?%3C/text%3E%3C/svg%3E";
    return;
  }
  const { data } = await supabase.from('users').select('photo_url, name').eq('user_id', partnerId).maybeSingle();
  if (data) {
    partnerRealName = data.name || partnerId;
    if (data.photo_url) partnerAvatarHeader.src = data.photo_url;
    else partnerAvatarHeader.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle fill='%23ccc' cx='50' cy='50' r='50'/%3E%3Ctext fill='white' x='50' y='67' text-anchor='middle' font-size='50'%3E?%3C/text%3E%3C/svg%3E";
    
    if (partnerName && partnerName.trim() !== "") {
      chatPartnerNameSpan.textContent = partnerName;
    } else {
      chatPartnerNameSpan.textContent = partnerRealName || partnerId;
    }
  } else {
    chatPartnerNameSpan.textContent = partnerId;
  }
}

function updateChatHeader() {
  if (partnerName && partnerName.trim() !== "") {
    chatPartnerNameSpan.textContent = partnerName;
  } else if (partnerRealName) {
    chatPartnerNameSpan.textContent = partnerRealName;
  } else {
    chatPartnerNameSpan.textContent = partnerId || "No partner linked";
  }
}

// ========== PRESENCE & REAL-TIME STATUS ==========
function setupPresence() {
  if (!myId) return;
  
  presenceChannel = supabase.channel('presence-room', {
    config: {
      presence: {
        key: myId,
      },
    },
  });

  presenceChannel.on('presence', { event: 'sync' }, () => {
    const newState = presenceChannel.presenceState();
    let isPartnerOnline = false;
    let isPartnerTyping = false;

    // Check if partner ID is in the state
    if (partnerId && newState[partnerId]) {
      isPartnerOnline = true;
      // if any connection instance of the partner is typing
      isPartnerTyping = newState[partnerId].some(client => client.typing === true);
    }

    if (isPartnerOnline) {
      partnerStatus.textContent = isPartnerTyping ? "Typing..." : "Online";
      partnerStatus.className = `status-indicator ${isPartnerTyping ? 'typing' : 'online'}`;
      if (isPartnerTyping) {
        typingIndicator.classList.remove("hidden");
        messagesArea.scrollTop = messagesArea.scrollHeight; // auto scroll to see typing
      } else {
        typingIndicator.classList.add("hidden");
      }
    } else {
      partnerStatus.textContent = "Offline";
      partnerStatus.className = "status-indicator offline";
      typingIndicator.classList.add("hidden");
    }
  });

  // Track user presence
  presenceChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ typing: false });
    }
  });

  // Typing event listener
  messageInput.addEventListener("input", () => {
    if (!presenceChannel) return;
    
    presenceChannel.track({ typing: true });
    
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      presenceChannel.track({ typing: false });
    }, 2000);
  });
}

// ========== NAME & PARTNER UPDATES ==========
profileNameInput.addEventListener("change", async () => {
  const newName = profileNameInput.value.trim();
  if (newName) {
    myName = newName;
    localStorage.setItem("myName", myName);
    await supabase.from('users').update({ name: myName }).eq('user_id', myId);
    showMessage("Name saved");
    if (partnerId) await loadPartnerDetails(); 
  }
});

savePartnerBtn.addEventListener("click", async () => {
  const newPartnerId = partnerIdInput.value.trim();
  const newPartnerName = partnerNameInput.value.trim();
  if (newPartnerId.length !== 8 || !/^[A-Za-z0-9]+$/.test(newPartnerId)) {
    showMessage("Partner ID must be exactly 8 alphanumeric characters", true);
    return;
  }
  partnerId = newPartnerId;
  partnerName = newPartnerName;
  localStorage.setItem("partnerId", partnerId);
  localStorage.setItem("partnerName", partnerName);
  await loadPartnerDetails();
  showMessage("Partner linked successfully!");
  loadMessages();
});

// ========== AVATAR UPLOAD ==========
changePhotoBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadSpinner.classList.remove("hidden");
    const fileExt = file.name.split('.').pop();
    const fileName = `${myId}-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) {
      uploadSpinner.classList.add("hidden");
      showMessage("Upload failed. Make sure 'avatars' bucket exists and is public.", true);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    
    await supabase.from('users').update({ photo_url: publicUrl }).eq('user_id', myId);
    localStorage.setItem("myPhoto", publicUrl);
    profileAvatarImg.src = publicUrl;
    uploadSpinner.classList.add("hidden");
    showMessage("Profile photo updated");
    if (partnerId) await loadPartnerDetails(); 
  };
  input.click();
});

// Photo Viewers
profileAvatarImg.addEventListener("click", () => {
  if (profileAvatarImg.src && !profileAvatarImg.src.includes("svg")) {
    previewImage.src = profileAvatarImg.src;
    imagePreviewModal.classList.remove("hidden");
  }
});
partnerAvatarHeader.addEventListener("click", () => {
  if (partnerAvatarHeader.src && !partnerAvatarHeader.src.includes("svg")) {
    previewImage.src = partnerAvatarHeader.src;
    imagePreviewModal.classList.remove("hidden");
  } else {
    showMessage("Partner hasn't uploaded a photo yet.", true);
  }
});
closePreviewBtn.addEventListener("click", () => imagePreviewModal.classList.add("hidden"));

// ========== PIN LOGIC ==========
function updatePinUI() {
  const pinSettings = document.getElementById("pinSettingsArea");
  if (pinEnabled) {
    pinSettings.classList.remove("hidden");
  } else {
    pinSettings.classList.add("hidden");
  }
}

pinToggle.addEventListener("change", async (e) => {
  if (e.target.checked) {
    const newPin = prompt("Set a new PIN (4-6 digits):");
    if (newPin && /^\d{4,6}$/.test(newPin)) {
      pinHash = simpleHash(newPin);
      localStorage.setItem("pinHash", pinHash);
      localStorage.setItem("pinEnabled", "true");
      pinEnabled = true;
      showMessage("PIN lock enabled");
    } else {
      pinToggle.checked = false;
      showMessage("PIN must be 4-6 digits only", true);
    }
  } else {
    const currentPin = prompt("Enter current PIN to disable:");
    if (currentPin && simpleHash(currentPin) === localStorage.getItem("pinHash")) {
      localStorage.removeItem("pinHash");
      localStorage.setItem("pinEnabled", "false");
      pinEnabled = false;
      pinHash = null;
      showMessage("PIN lock disabled");
    } else {
      pinToggle.checked = true;
      showMessage("Incorrect PIN", true);
    }
  }
  updatePinUI();
});

savePinBtn.addEventListener("click", () => {
  const newPin = newPinInput.value;
  if (!/^\d{4,6}$/.test(newPin)) {
    showMessage("PIN must be 4-6 digits", true);
    return;
  }
  pinHash = simpleHash(newPin);
  localStorage.setItem("pinHash", pinHash);
  localStorage.setItem("pinEnabled", "true");
  pinEnabled = true;
  pinToggle.checked = true;
  updatePinUI();
  showMessage("PIN saved and enabled");
  newPinInput.value = "";
});

changePinBtn.addEventListener("click", () => {
  const oldPin = oldPinInput.value;
  const newPin = changeNewPinInput.value;
  if (!oldPin || simpleHash(oldPin) !== pinHash) {
    showMessage("Current PIN is incorrect", true);
    return;
  }
  if (!/^\d{4,6}$/.test(newPin)) {
    showMessage("New PIN must be 4-6 digits", true);
    return;
  }
  pinHash = simpleHash(newPin);
  localStorage.setItem("pinHash", pinHash);
  showMessage("PIN changed successfully");
  oldPinInput.value = "";
  changeNewPinInput.value = "";
});

// ========== THEMES & WALLPAPER ==========
const themes = {
  dark1: { name: "Deep Space", vars: { '--bg-primary': '#0f0f1a', '--bg-secondary': '#1a1a2e', '--bg-surface': '#16213e', '--text-primary': '#ffffff', '--text-secondary': '#a0a0c0', '--accent': '#0f3460', '--sent-msg': '#0f3460', '--received-msg': '#1e2a47', '--border': '#16213e' } },
  dark2: { name: "Midnight", vars: { '--bg-primary': '#121212', '--bg-secondary': '#1e1e1e', '--bg-surface': '#2d2d2d', '--text-primary': '#ffffff', '--text-secondary': '#b0b0b0', '--accent': '#bb86fc', '--sent-msg': '#bb86fc', '--received-msg': '#3a3a3a', '--border': '#333333' } },
  dark3: { name: "Vibe Green", vars: { '--bg-primary': '#111812', '--bg-secondary': '#1e2920', '--bg-surface': '#2d3b2f', '--text-primary': '#ffffff', '--text-secondary': '#a3b5a6', '--accent': '#2ecc71', '--sent-msg': '#27ae60', '--received-msg': '#2d3b2f', '--border': '#2d3b2f' } },
  light1: { name: "Daylight", vars: { '--bg-primary': '#f5f5f7', '--bg-secondary': '#ffffff', '--bg-surface': '#e5e5ea', '--text-primary': '#1c1c1e', '--text-secondary': '#6c6c70', '--accent': '#007aff', '--sent-msg': '#007aff', '--received-msg': '#e5e5ea', '--border': '#d1d1d6' } },
  light2: { name: "Warm Sand", vars: { '--bg-primary': '#fdf6e3', '--bg-secondary': '#fff4e0', '--bg-surface': '#f0e6d2', '--text-primary': '#4a3b2c', '--text-secondary': '#8b7a66', '--accent': '#d4a373', '--sent-msg': '#d4a373', '--received-msg': '#e8dcc8', '--border': '#e0d5c1' } },
  light3: { name: "Blossom", vars: { '--bg-primary': '#fff0f5', '--bg-secondary': '#ffe4ec', '--bg-surface': '#ffd9e6', '--text-primary': '#5e2a3a', '--text-secondary': '#b06a7a', '--accent': '#e91e63', '--sent-msg': '#e91e63', '--received-msg': '#f8d0d8', '--border': '#f5c6d4' } },
  light4: { name: "Lavender", vars: { '--bg-primary': '#f5f0ff', '--bg-secondary': '#ede8f5', '--bg-surface': '#e2d9f0', '--text-primary': '#3c2a5e', '--text-secondary': '#7a6a9e', '--accent': '#9b59b6', '--sent-msg': '#9b59b6', '--received-msg': '#dcd0ff', '--border': '#d3c6e8' } }
};

function applyTheme(themeId) {
  const theme = themes[themeId];
  if (!theme) return;
  for (const [prop, val] of Object.entries(theme.vars)) {
    document.documentElement.style.setProperty(prop, val);
  }
  localStorage.setItem("theme", themeId);
  if (themeId.startsWith("light")) document.body.classList.add("light-theme");
  else document.body.classList.remove("light-theme");
}

function loadThemeAndWallpaper() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme && themes[savedTheme]) applyTheme(savedTheme);
  else applyTheme("dark1");
  const savedWallpaper = localStorage.getItem("wallpaper");
  if (savedWallpaper) setWallpaper(savedWallpaper);
}

function setWallpaper(wallpaperId) {
  const wallpapers = {
    none: "", solid1: "linear-gradient(145deg, #2c3e50, #1a1a2e)", solid2: "#2b2b2b", solid3: "#f5e6ca",
    img1: "url('https://www.transparenttextures.com/patterns/cubes.png')"
  };
  
  if (wallpaperId.startsWith("data:") || wallpaperId.startsWith("blob:")) {
    chatContainer.style.backgroundImage = `url(${wallpaperId})`;
  } else {
    chatContainer.style.backgroundImage = wallpapers[wallpaperId] || "";
  }
  
  localStorage.setItem("wallpaper", wallpaperId);
  if (autoTheme) {
    if (wallpaperId === "solid3") applyTheme("light1");
    else applyTheme("dark1");
  }
}

function buildThemeGrid() {
  themeGrid.innerHTML = "";
  Object.entries(themes).forEach(([id, theme]) => {
    const card = document.createElement("div");
    card.className = "theme-card";
    card.textContent = theme.name;
    card.onclick = () => applyTheme(id);
    themeGrid.appendChild(card);
  });
}

function buildWallpaperGrid() {
  const wallpapers = ["none", "solid1", "solid2", "solid3", "img1"];
  wallpaperGrid.innerHTML = "";
  wallpapers.forEach(w => {
    const card = document.createElement("div");
    card.className = "wallpaper-card";
    if (w === "solid1") card.style.background = "linear-gradient(145deg, #2c3e50, #1a1a2e)";
    else if (w === "solid2") card.style.background = "#2b2b2b";
    else if (w === "solid3") card.style.background = "#f5e6ca";
    else card.style.background = "var(--bg-surface)";
    card.onclick = () => setWallpaper(w);
    wallpaperGrid.appendChild(card);
  });
}

uploadWallpaperBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setWallpaper(base64);
      showMessage("Wallpaper updated from gallery");
    };
    reader.readAsDataURL(file);
  };
  input.click();
});

autoThemeToggle.addEventListener("change", (e) => {
  autoTheme = e.target.checked;
  localStorage.setItem("autoTheme", autoTheme);
  loadThemeAndWallpaper();
});

// ========== CHAT MESSAGES & REALTIME SYNC ==========
async function sendMessage(imageUrl = null) {
  if (!partnerId) { showMessage("Link a partner ID first in Profile.", true); return; }
  const text = messageInput.value.trim();
  if (!text && !imageUrl) return; // Allow empty text if sending image
  
  // Clear input instantly for UI speed
  messageInput.value = "";
  if (presenceChannel) presenceChannel.track({ typing: false });
  
  await supabase.from('messages').insert([{ 
    from_id: myId, 
    to_id: partnerId, 
    text: text, 
    image_url: imageUrl,
    is_read: false,
    created_at: new Date() 
  }]);
}

// Media sharing attachment handler
attachBtn.addEventListener("click", () => {
  chatImageInput.click();
});

chatImageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  chatUploadProgress.classList.remove("hidden");
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${myId}-${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage.from('chat-images').upload(fileName, file);
  
  if (error) {
    chatUploadProgress.classList.add("hidden");
    showMessage("Image upload failed. Ensure 'chat-images' bucket is public.", true);
    return;
  }
  
  const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
  await sendMessage(urlData.publicUrl);
  
  chatUploadProgress.classList.add("hidden");
  chatImageInput.value = ""; // Reset input
});


function loadMessages() {
  if (messagesSubscription) messagesSubscription.unsubscribe();
  if (!partnerId) return;
  
  messagesArea.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Loading chat...</div>';
  
  // Subscribe to BOTH inserts and updates (for read receipts)
  const subscription = supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      const msg = payload.new;
      if ((msg.from_id === myId && msg.to_id === partnerId) || (msg.from_id === partnerId && msg.to_id === myId)) {
        appendMessage(msg);
        
        // Handle logic for incoming message
        if (msg.to_id === myId) {
          // If chat is open and we are looking at it, mark read
          if (!document.hidden && document.getElementById('chatsPage').classList.contains('active')) {
             await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
          } else {
             // Otherwise, trigger push notification
             triggerPushAlert(`New message from ${chatPartnerNameSpan.textContent}`, msg.text || "📷 Image received");
          }
        }
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
       const msg = payload.new;
       // Find the message in DOM and update checkmarks
       const msgElement = document.getElementById(`msg-${msg.id}`);
       if (msgElement && msg.from_id === myId) {
         const receiptSpan = msgElement.querySelector('.receipt');
         if (receiptSpan && msg.is_read) {
           receiptSpan.textContent = '✓✓';
           receiptSpan.classList.add('read');
         }
       }
    })
    .subscribe();
    
  messagesSubscription = subscription;
  fetchMessages();
}

async function fetchMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`from_id.eq.${myId},to_id.eq.${myId}`)
    .order('created_at', { ascending: true });
    
  if (error) { messagesArea.innerHTML = "<div class='loading'>Error loading messages from database</div>"; return; }
  messagesArea.innerHTML = "";
  
  let unreadIdsToUpdate = [];

  data.forEach(msg => {
    if ((msg.from_id === myId && msg.to_id === partnerId) || (msg.from_id === partnerId && msg.to_id === myId)) {
      appendMessageToDOM(msg);
      
      // Collect incoming unread messages to mark as read
      if (msg.to_id === myId && !msg.is_read) {
         unreadIdsToUpdate.push(msg.id);
      }
    }
  });
  
  // Batch update read receipts for historical unread messages when we open the chat
  if (unreadIdsToUpdate.length > 0 && !document.hidden && document.getElementById('chatsPage').classList.contains('active')) {
    await supabase.from('messages').update({ is_read: true }).in('id', unreadIdsToUpdate);
  }
}

function appendMessage(msg) {
  appendMessageToDOM(msg);
}

function appendMessageToDOM(msg) {
  const isSent = msg.from_id === myId;
  const div = document.createElement("div");
  div.id = `msg-${msg.id}`;
  div.className = `message ${isSent ? "sent" : "received"}`;
  
  let innerHtml = `<div class="message-content">`;
  
  // Render Media
  if (msg.image_url) {
    innerHtml += `<img src="${msg.image_url}" class="message-image" alt="Chat Media" onclick="document.getElementById('previewImage').src=this.src; document.getElementById('imagePreviewModal').classList.remove('hidden');">`;
  }
  
  // Render Text
  if (msg.text) {
    innerHtml += `<span>${escapeHtml(msg.text)}</span>`;
  }
  
  // Render Time and Receipt
  const timeStr = formatDate(msg.created_at);
  let receiptHtml = "";
  
  if (isSent) {
    // Single tick = sent to DB. Double tick = read by partner.
    const tickMark = msg.is_read ? "✓✓" : "✓";
    const readClass = msg.is_read ? "read" : "";
    receiptHtml = `<span class="receipt ${readClass}">${tickMark}</span>`;
  }
  
  innerHtml += `<div class="message-time-row"><small>${timeStr}</small>${receiptHtml}</div></div>`;
  
  div.innerHTML = innerHtml;
  messagesArea.appendChild(div);
  
  // Smooth auto-scroll
  setTimeout(() => {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }, 10);
}

// Update read status when returning to the app
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && partnerId && document.getElementById('chatsPage').classList.contains('active')) {
    // Find unread messages received from partner
    const { data } = await supabase
      .from('messages')
      .select('id')
      .eq('from_id', partnerId)
      .eq('to_id', myId)
      .eq('is_read', false);
      
    if (data && data.length > 0) {
      const ids = data.map(d => d.id);
      await supabase.from('messages').update({ is_read: true }).in('id', ids);
    }
  }
});

// ========== SHARE ID ==========
shareIdBtn.addEventListener("click", () => {
  const link = `${window.location.origin}${window.location.pathname}?invite=${myId}`;
  shareLinkInput.value = link;
  qrIdSpan.textContent = myId;
  document.getElementById("qrcode").innerHTML = "";
  new QRCode(document.getElementById("qrcode"), { text: link, width: 180, height: 180 });
  qrModal.classList.remove("hidden");
});
copyLinkBtn.addEventListener("click", () => {
  shareLinkInput.select();
  document.execCommand("copy");
  showMessage("Invite link copied to clipboard!");
});
closeQrBtn.addEventListener("click", () => qrModal.classList.add("hidden"));

// Auto-fill partner from URL
const urlParams = new URLSearchParams(window.location.search);
const inviteId = urlParams.get("invite");
if (inviteId && inviteId.length === 8) {
  partnerIdInput.value = inviteId;
  setTimeout(() => {
    savePartnerBtn.click();
    // Clear URL to prevent re-trigger
    window.history.replaceState({}, document.title, window.location.pathname);
  }, 800);
}

// ========== NAVIGATION ==========
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(pages).forEach(p => p.classList.remove("active"));
    pages[page].classList.add("active");
    
    if (page === "chats") loadMessages();
    if (page === "profile") loadPartnerDetails();
  });
});

// ========== PIN LOCK (TIMER) ==========
let inactivityTimer;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (pinEnabled && mainApp && !mainApp.classList.contains("hidden")) {
    inactivityTimer = setTimeout(() => lockApp(), 60000); // 1 minute inactivity lock
  }
}
function lockApp() {
  if (!pinEnabled) return;
  mainApp.classList.add("hidden");
  pinOverlay.classList.remove("hidden");
  pinInput.value = "";
  pinError.textContent = "";
}
function unlockApp() {
  const entered = pinInput.value;
  if (!pinEnabled || simpleHash(entered) === pinHash) {
    mainApp.classList.remove("hidden");
    pinOverlay.classList.add("hidden");
    resetInactivityTimer();
  } else {
    pinError.textContent = "Incorrect PIN";
    pinInput.value = "";
  }
}
unlockBtn.addEventListener("click", unlockApp);
pinInput.addEventListener("keypress", (e) => { if (e.key === "Enter") unlockApp(); });
document.addEventListener("click", resetInactivityTimer);
document.addEventListener("keypress", resetInactivityTimer);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && pinEnabled) lockApp();
});

// ========== RESET ==========
resetAppBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all local data? You will lose access to your identity unless you saved the ID.")) {
    localStorage.clear();
    window.location.reload();
  }
});

// ========== INIT ==========
(async () => {
  await initUser();
  buildThemeGrid();
  buildWallpaperGrid();
  if (pinEnabled && localStorage.getItem("pinHash")) {
    lockApp();
  } else {
    mainApp.classList.remove("hidden");
  }
  
  sendBtn.addEventListener("click", () => sendMessage(null));
  messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(null); });
  
  loadMessages();
})();
