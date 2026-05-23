import { createClient } from '@supabase/supabase-js';

// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = "https://tmhoklmnevnnfzslsumg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtaG9rbG1uZXZubmZ6c2xzdW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTQ3NjUsImV4cCI6MjA5NTEzMDc2NX0.d2ypO8YM3z0j_xETkuqJVGf2ot1Sh8vZQu2Fm5EgPFw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== GLOBALS ==========
let myId = null, myName = "", partnerId = null, partnerName = "", partnerRealName = "";
let pinHash = null, pinEnabled = false;
let autoTheme = false;
let messagesSubscription = null;

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
const messagesArea = document.getElementById("messagesArea");

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

// ========== USER INIT ==========
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
  if (storedId) {
    myId = storedId;
    myName = storedName;
    const { data } = await supabase.from('users').select('photo_url, name').eq('user_id', myId).maybeSingle();
    if (data) {
      if (data.photo_url) profileAvatarImg.src = data.photo_url;
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
  
  loadThemeAndWallpaper();
  await loadPartnerDetails();
}

async function loadPartnerDetails() {
  if (!partnerId) {
    chatPartnerNameSpan.textContent = "No partner";
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
    chatPartnerNameSpan.textContent = partnerId || "No partner";
  }
}

// ========== NAME UPDATE ==========
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

// ========== PARTNER SAVE ==========
savePartnerBtn.addEventListener("click", async () => {
  const newPartnerId = partnerIdInput.value.trim();
  const newPartnerName = partnerNameInput.value.trim();
  if (newPartnerId.length !== 8 || !/^[A-Za-z0-9]+$/.test(newPartnerId)) {
    showMessage("Partner ID must be 8 alphanumeric characters", true);
    return;
  }
  partnerId = newPartnerId;
  partnerName = newPartnerName;
  localStorage.setItem("partnerId", partnerId);
  localStorage.setItem("partnerName", partnerName);
  await loadPartnerDetails();
  showMessage("Partner saved");
  loadMessages();
});

// ========== PROFILE PHOTO WITH SPINNER ==========
changePhotoBtn.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadSpinner.classList.remove("hidden");
    const fileExt = file.name.split('.').pop();
    const fileName = `${myId}.${fileExt}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (error) {
      uploadSpinner.classList.add("hidden");
      showMessage("Upload failed: " + error.message, true);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    await supabase.from('users').update({ photo_url: publicUrl }).eq('user_id', myId);
    profileAvatarImg.src = publicUrl;
    uploadSpinner.classList.add("hidden");
    showMessage("Photo updated");
    if (partnerId) await loadPartnerDetails();
  };
  input.click();
});

// Click on avatar to enlarge
profileAvatarImg.addEventListener("click", () => {
  if (profileAvatarImg.src) {
    previewImage.src = profileAvatarImg.src;
    imagePreviewModal.classList.remove("hidden");
  }
});
partnerAvatarHeader.addEventListener("click", () => {
  if (partnerAvatarHeader.src && !partnerAvatarHeader.src.includes("svg")) {
    previewImage.src = partnerAvatarHeader.src;
    imagePreviewModal.classList.remove("hidden");
  } else {
    showMessage("No profile photo yet", true);
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
      showMessage("PIN enabled");
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
      showMessage("PIN disabled");
    } else {
      pinToggle.checked = true;
      showMessage("Wrong PIN", true);
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
    showMessage("Current PIN incorrect", true);
    return;
  }
  if (!/^\d{4,6}$/.test(newPin)) {
    showMessage("New PIN must be 4-6 digits", true);
    return;
  }
  pinHash = simpleHash(newPin);
  localStorage.setItem("pinHash", pinHash);
  showMessage("PIN changed");
  oldPinInput.value = "";
  changeNewPinInput.value = "";
});

// ========== THEMES & WALLPAPER ==========
const themes = {
  dark1: { name: "Deep Space", vars: { '--bg-primary': '#0f0f1a', '--bg-secondary': '#1a1a2e', '--bg-surface': '#16213e', '--text-primary': '#ffffff', '--text-secondary': '#a0a0c0', '--accent': '#0f3460', '--sent-msg': '#0f3460', '--received-msg': '#1e2a47' } },
  dark2: { name: "Midnight", vars: { '--bg-primary': '#121212', '--bg-secondary': '#1e1e1e', '--bg-surface': '#2d2d2d', '--text-primary': '#ffffff', '--text-secondary': '#b0b0b0', '--accent': '#bb86fc', '--sent-msg': '#bb86fc', '--received-msg': '#3a3a3a' } },
  light1: { name: "Daylight", vars: { '--bg-primary': '#f5f5f7', '--bg-secondary': '#ffffff', '--bg-surface': '#e5e5ea', '--text-primary': '#1c1c1e', '--text-secondary': '#6c6c70', '--accent': '#007aff', '--sent-msg': '#007aff', '--received-msg': '#e5e5ea' } },
  light2: { name: "Warm Sand", vars: { '--bg-primary': '#fdf6e3', '--bg-secondary': '#fff4e0', '--bg-surface': '#f0e6d2', '--text-primary': '#4a3b2c', '--text-secondary': '#8b7a66', '--accent': '#d4a373', '--sent-msg': '#d4a373', '--received-msg': '#e8dcc8' } },
  light3: { name: "Blossom", vars: { '--bg-primary': '#fff0f5', '--bg-secondary': '#ffe4ec', '--bg-surface': '#ffd9e6', '--text-primary': '#5e2a3a', '--text-secondary': '#b06a7a', '--accent': '#e91e63', '--sent-msg': '#e91e63', '--received-msg': '#f8d0d8' } },
  light4: { name: "Lavender", vars: { '--bg-primary': '#f5f0ff', '--bg-secondary': '#ede8f5', '--bg-surface': '#e2d9f0', '--text-primary': '#3c2a5e', '--text-secondary': '#7a6a9e', '--accent': '#9b59b6', '--sent-msg': '#9b59b6', '--received-msg': '#dcd0ff' } }
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
  chatContainer.style.backgroundImage = wallpapers[wallpaperId] || "";
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
    const url = URL.createObjectURL(file);
    chatContainer.style.backgroundImage = `url(${url})`;
    localStorage.setItem("customWallpaper", url);
    showMessage("Wallpaper updated");
  };
  input.click();
});

autoThemeToggle.addEventListener("change", (e) => {
  autoTheme = e.target.checked;
  localStorage.setItem("autoTheme", autoTheme);
  loadThemeAndWallpaper();
});

// ========== CHAT MESSAGES (FIXED PIPELINE) ==========
async function sendMessage() {
  if (!partnerId) { showMessage("Set partner ID first", true); return; }
  const text = messageInput.value.trim();
  if (!text) return;

  const temporaryMessage = {
    from_id: myId,
    to_id: partnerId,
    text: text,
    created_at: new Date().toISOString()
  };

  // 1. Instantly append your own message locally
  appendMessageToDOM(temporaryMessage, null);
  
  // Clear layout field
  messageInput.value = "";

  // 2. Transmit to data storage backend
  const { error } = await supabase.from('messages').insert([temporaryMessage]);
  if (error) {
    console.error("Message delivery failed:", error);
  }
}

function loadMessages() {
  if (messagesSubscription) messagesSubscription.unsubscribe();
  if (!partnerId) return;
  
  messagesArea.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-pulse"></i> Loading messages...</div>';
  
  const subscription = supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      const msg = payload.new;
      
      // Realtime channel updates render only messages arriving from your partner.
      if (msg.from_id === partnerId && msg.to_id === myId) {
        appendMessageToDOM(msg, null);
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
    
  if (error) { messagesArea.innerHTML = "<div>Error loading messages</div>"; return; }
  messagesArea.innerHTML = "";
  
  const { data: partnerData } = await supabase.from('users').select('photo_url').eq('user_id', partnerId).maybeSingle();
  const partnerPhoto = partnerData?.photo_url || "";
  
  data.forEach(msg => {
    if ((msg.from_id === myId && msg.to_id === partnerId) || (msg.from_id === partnerId && msg.to_id === myId)) {
      appendMessageToDOM(msg, partnerPhoto);
    }
  });
}

function appendMessageToDOM(msg, cachedPartnerPhoto) {
  const isSent = msg.from_id === myId;
  const timeString = new Date(msg.created_at).toLocaleTimeString();
  
  const div = document.createElement("div");
  div.className = `message ${isSent ? "sent" : "received"}`;
  
  let photo = cachedPartnerPhoto || partnerAvatarHeader.src;
  if (photo && photo.includes("data:image/svg+xml")) {
    photo = null;
  }

  div.innerHTML = `<div class="message-content">${escapeHtml(msg.text)}<small>${timeString}</small></div>`;
  
  // Affix partner avatar metadata blocks safely to target frames layout
  if (!isSent && photo) {
    const avatarImg = document.createElement("img");
    avatarImg.src = photo;
    avatarImg.className = "message-avatar";
    avatarImg.onclick = () => { 
      previewImage.src = photo; 
      imagePreviewModal.classList.remove("hidden"); 
    };
    div.prepend(avatarImg);
  }
  
  messagesArea.appendChild(div);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ========== SHARE ID ==========
shareIdBtn.addEventListener("click", () => {
  const link = `${window.location.origin}${window.location.pathname}?invite=${myId}`;
  shareLinkInput.value = link;
  qrIdSpan.textContent = myId;
  document.getElementById("qrcode").innerHTML = "";
  new QRCode(document.getElementById("qrcode"), { text: link, width: 150, height: 150 });
  qrModal.classList.remove("hidden");
});
copyLinkBtn.addEventListener("click", () => {
  shareLinkInput.select();
  document.execCommand("copy");
  showMessage("Link copied");
});
closeQrBtn.addEventListener("click", () => qrModal.classList.add("hidden"));

// Auto-fill partner from URL
const urlParams = new URLSearchParams(window.location.search);
const inviteId = urlParams.get("invite");
if (inviteId && inviteId.length === 8) {
  partnerIdInput.value = inviteId;
  setTimeout(() => savePartnerBtn.click(), 500);
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

// ========== PIN LOCK ==========
let inactivityTimer;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (pinEnabled && mainApp && !mainApp.classList.contains("hidden")) {
    inactivityTimer = setTimeout(() => lockApp(), 30000);
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
    pinError.textContent = "Wrong PIN";
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
  if (confirm("Reset all data? You'll lose your ID and messages.")) {
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
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
  loadMessages();
})();
