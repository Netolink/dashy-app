// קבועים והגדרות ראשוניות
const presetColors = ['#38bdf8', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#eab308', '#6366f1', '#14b8a6', '#ef4444', '#94a3b8'];
const defaultPresetEmojis = ['📁', '🚀', '💻', '⚙️', '📊', '🌐', '🔒', '🎨', '📝', '💡', '🛠️', '🔗', '🤖', '👑', '🔥'];

let selectedCatColor = presetColors[0];
let selectedInlineCatColor = presetColors[0];
let selectedEditCatColor = presetColors[0];

let activeEmojiTriggerBtn = null;
let activeHiddenInputId = null;
let temporaryParsedBookmarks = [];

// משתני עזר לניהול מצב גרירה (Drag and Drop)
let draggedCategoryIndex = null;
let draggedItemSourceCatId = null;
let draggedItemId = null;

// ==========================================
// 1. הגדרות FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCcxyNvQa-kC-0KDdWKel-2IG9sMI3AuWs",
  authDomain: "my-dashy-app.firebaseapp.com",
  projectId: "my-dashy-app",
  storageBucket: "my-dashy-app.firebasestorage.app",
  messagingSenderId: "66095384503",
  appId: "1:66095384503:web:d0747e5c07169a7a6b0a32"
};

let isFirebaseActive = false;
if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YourKeyHere")) {
    firebase.initializeApp(firebaseConfig);
    isFirebaseActive = true;
}

const db = isFirebaseActive ? firebase.firestore() : null;
const auth = isFirebaseActive ? firebase.auth() : null;

// ==========================================
// 2. ניהול מצב האפליקציה (State)
// ==========================================
let currentUser = null;
let allDashboards = [
    { id: "dash-default", title: "דשבורד ראשי", icon: "🚀", data: [
        { id: "cat-1", title: "כללי", icon: "📁", color: "#38bdf8", items: [{ id: "t1", name: "Google", url: "https://google.com", clicks: 0 }] }
    ]}
];
let currentDashboardId = "dash-default";

if (!isFirebaseActive && localStorage.getItem('dashy_all_dashboards')) {
    allDashboards = JSON.parse(localStorage.getItem('dashy_all_dashboards'));
    currentDashboardId = localStorage.getItem('dashy_current_id') || allDashboards[0].id;
}

async function saveData() {
    if (currentUser && isFirebaseActive) {
        await db.collection('users_dashboards').doc(currentUser.uid).set({
            allDashboards: allDashboards,
            currentDashboardId: currentDashboardId
        });
    } else {
        localStorage.setItem('dashy_all_dashboards', JSON.stringify(allDashboards));
        localStorage.setItem('dashy_current_id', currentDashboardId);
    }
}

// ==========================================
// 3. התחברות (Authentication)
// ==========================================
if (isFirebaseActive) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authStatusLeft').innerHTML = `
                <div class="user-info">
                    <img src="${user.photoURL}" class="user-avatar">
                    <span>חיבור פעיל: <strong>${user.displayName}</strong></span>
                </div>
            `;
            document.getElementById('authStatusRight').innerHTML = `<button class="btn" onclick="logout()">התנתקות</button>`;
            
            const doc = await db.collection('users_dashboards').doc(user.uid).get();
            if (doc.exists) {
                const cloudData = doc.data();
                allDashboards = cloudData.allDashboards || allDashboards;
                currentDashboardId = cloudData.currentDashboardId || allDashboards[0].id;
            } else {
                await saveData();
            }
        } else {
            currentUser = null;
            document.getElementById('authStatusLeft').innerHTML = `<span style="color: var(--text-muted); font-size: 0.9rem;">מצב: עבודה מקומית (אורח)</span>`;
            document.getElementById('authStatusRight').innerHTML = `<button class="btn" onclick="loginWithGoogle()" style="color: var(--accent);">🌐 התחברות מהירה עם גוגל</button>`;
        }
        renderTabs();
        renderDashboard();
    });
}

function loginWithGoogle() {
    if (!isFirebaseActive) return showAppNotification("הודעת מערכת", "אנא הגדר firebaseConfig תחילה בתוך הקוד.");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => showAppNotification("שגיאת חיבור", err.message));
}

function logout() { auth.signOut().then(() => window.location.reload()); }

// ==========================================
// 4. ניהול חלוניות מודל והתראות מותאמות
// ==========================================
function openModal(id) { 
    closeEmojiPicker();
    document.getElementById(id).style.display = 'flex'; 
    if(id === 'catModal') initColorPicker('catColorPicker', 'cat');
    if(id === 'inlineCatModal') initColorPicker('inlineCatColorPicker', 'inlineCat');
    if(id === 'editCatModal') initColorPicker('editCatColorPicker', 'editCat');
}

function closeModal(id) { 
    closeEmojiPicker();
    document.getElementById(id).style.display = 'none'; 
}

function toggleSettings() { 
    closeEmojiPicker();
    const p = document.getElementById('settingsPanel'); 
    p.style.display = p.style.display === 'block' ? 'none' : 'block'; 
}

function triggerCustomConfirm(message, onExecute) {
    document.getElementById('confirmHeader').innerText = "אישור פעולה";
    document.getElementById('confirmHeader').style.color = "var(--danger)";
    document.getElementById('confirmMessage').innerText = message;
    document.getElementById('confirmCancelBtn').style.display = 'inline-block';
    const executeBtn = document.getElementById('confirmExecuteBtn');
    executeBtn.className = "btn btn-danger";
    executeBtn.textContent = "אישור";
    openModal('confirmModal');
    executeBtn.onclick = () => { onExecute(); closeModal('confirmModal'); };
}

function showAppNotification(title, message) {
    document.getElementById('confirmHeader').innerText = title;
    document.getElementById('confirmHeader').style.color = "var(--accent)";
    document.getElementById('confirmMessage').innerHTML = message;
    document.getElementById('confirmCancelBtn').style.display = 'none';
    const executeBtn = document.getElementById('confirmExecuteBtn');
    executeBtn.className = "btn btn-primary";
    executeBtn.textContent = "הבנתי, תודה";
    openModal('confirmModal');
    executeBtn.onclick = () => { closeModal('confirmModal'); };
}

function initColorPicker(containerId, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    let currentSelected = type === 'cat' ? selectedCatColor : (type === 'inlineCat' ? selectedInlineCatColor : selectedEditCatColor);
    
    presetColors.forEach(color => {
        const opt = document.createElement('div');
        opt.className = `color-option ${color === currentSelected ? 'selected' : ''}`;
        opt.style.backgroundColor = color;
        opt.onclick = () => {
            if(type === 'cat') selectedCatColor = color;
            if(type === 'inlineCat') selectedInlineCatColor = color;
            if(type === 'editCat') selectedEditCatColor = color;
            initColorPicker(containerId, type);
        };
        container.appendChild(opt);
    });

    const customOpt = document.createElement('div');
    const isCustomSelected = !presetColors.includes(currentSelected);
    customOpt.className = `color-option custom-picker-trigger ${isCustomSelected ? 'selected' : ''}`;
    if(isCustomSelected) customOpt.style.backgroundColor = currentSelected;
    customOpt.innerHTML = `🎨<input type="color" value="${currentSelected.startsWith('#') && currentSelected.length === 7 ? currentSelected : '#38bdf8'}" onchange="handleCustomColorChange(this, '${containerId}', '${type}')">`;
    container.appendChild(customOpt);
}

function handleCustomColorChange(picker, containerId, type) {
    const color = picker.value;
    if(type === 'cat') selectedCatColor = color;
    if(type === 'inlineCat') selectedInlineCatColor = color;
    if(type === 'editCat') selectedEditCatColor = color;
    initColorPicker(containerId, type);
}

// ==========================================
// 5. בורר אייקונים (אימוג'י) מובנה
// ==========================================
function initEmojiPicker() {
    const grid = document.getElementById('emojiPresetsGrid');
    grid.innerHTML = '';
    defaultPresetEmojis.forEach(emoji => {
        const item = document.createElement('div');
        item.className = 'emoji-preset-item';
        item.innerText = emoji;
        item.onclick = () => selectEmoji(emoji);
        grid.appendChild(item);
    });
    const customInput = document.getElementById('emojiCustomInput');
    const saveBtn = document.getElementById('emojiCustomSaveBtn');
    customInput.oninput = function() {
        const val = this.value.trim();
        if (val) { this.value = Array.from(val)[0]; saveBtn.disabled = false; } 
        else { saveBtn.disabled = true; }
    };
    saveBtn.onclick = function() {
        const finalEmoji = customInput.value.trim();
        if (finalEmoji) selectEmoji(finalEmoji);
    };
}

function toggleEmojiPicker(triggerBtn, targetInputId) {
    const popover = document.getElementById('emojiPickerPopover');
    if (popover.style.display === 'block' && activeEmojiTriggerBtn === triggerBtn) { closeEmojiPicker(); return; }
    activeEmojiTriggerBtn = triggerBtn;
    activeHiddenInputId = targetInputId;
    document.getElementById('emojiCustomInput').value = '';
    document.getElementById('emojiCustomSaveBtn').disabled = true;
    triggerBtn.parentNode.style.position = 'relative';
    triggerBtn.parentNode.appendChild(popover);
    popover.style.display = 'block';
}

function selectEmoji(emoji) {
    if (activeEmojiTriggerBtn && activeHiddenInputId) {
        activeEmojiTriggerBtn.innerText = emoji;
        document.getElementById(activeHiddenInputId).value = emoji;
    }
    closeEmojiPicker();
}

function closeEmojiPicker() {
    const popover = document.getElementById('emojiPickerPopover');
    popover.style.display = 'none';
    activeEmojiTriggerBtn = null; activeHiddenInputId = null;
}

document.addEventListener('mousedown', function(e) {
    const popover = document.getElementById('emojiPickerPopover');
    if (popover.style.display === 'block' && !popover.contains(e.target) && !activeEmojiTriggerBtn.contains(e.target)) {
        closeEmojiPicker();
    }
});

// ==========================================
// 6. סטטיסטיקות שימוש - כלים נפוצים
// ==========================================
function registerToolClick(catId, itemId) {
    const activeData = getCurrentDashboardData();
    const cat = activeData.find(c => c.id === catId);
    if (cat) {
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            item.clicks = (item.clicks || 0) + 1;
            saveData();
            renderPopularTools();
        }
    }
}

function renderPopularTools() {
    const grid = document.getElementById('popularGrid');
    const section = document.getElementById('popularSection');
    grid.innerHTML = '';

    let allItemsWithCat = [];
    getCurrentDashboardData().forEach(cat => {
        cat.items.forEach(item => {
            if (item.clicks && item.clicks > 0) {
                allItemsWithCat.push({ item, catId: cat.id });
            }
        });
    });

    allItemsWithCat.sort((a, b) => b.item.clicks - a.item.clicks);
    const top5 = allItemsWithCat.slice(0, 5);

    if (top5.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    top5.forEach(obj => {
        const chip = document.createElement('a');
        chip.className = 'popular-chip';
        chip.href = obj.item.url;
        chip.target = '_blank';
        chip.innerHTML = `<span>🌐</span> <strong>${obj.item.name}</strong> <span style="font-size:0.75rem; color:var(--accent);">(${obj.item.clicks})</span>`;
        chip.onclick = () => registerToolClick(obj.catId, obj.item.id);
        grid.appendChild(chip);
    });
}

// ==========================================
// 7. ניהול דשבורדים (Tabs)
// ==========================================
function getCurrentDashboardData() {
    const activeDash = allDashboards.find(d => d.id === currentDashboardId);
    return activeDash ? activeDash.data : [];
}

function renderTabs() {
    const tabsArea = document.getElementById('dashboardTabsArea');
    tabsArea.innerHTML = "";

    allDashboards.forEach(dash => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${dash.id === currentDashboardId ? 'active' : ''}`;
        btn.innerHTML = `<span>${dash.icon || "🚀"}</span> <span>${dash.title}</span>`;
        btn.onclick = () => {
            currentDashboardId = dash.id;
            saveData(); renderTabs(); renderDashboard();
        };
        tabsArea.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = "add-dash-btn"; addBtn.innerText = "➕ דשבורד חדש";
    addBtn.onclick = () => {
        document.getElementById('newDashName').value = "";
        document.getElementById('newDashEmojiTriggerBtn').innerText = "🚀";
        document.getElementById('newDashHiddenEmojiInput').value = "🚀";
        openModal('dashModal');
    };
    tabsArea.appendChild(addBtn);

    document.getElementById('deleteDashBtn').style.display = allDashboards.length > 1 ? 'block' : 'none';
}

function createNewDashboard() {
    const name = document.getElementById('newDashName').value.trim();
    const icon = document.getElementById('newDashHiddenEmojiInput').value.trim() || "🚀";
    if (!name) return;

    const newDash = {
        id: 'dash-' + Date.now(),
        title: name,
        icon: icon,
        data: [{ id: 'cat-' + Date.now(), title: "כללי", icon: "📁", color: "#38bdf8", items: [] }]
    };
    allDashboards.push(newDash);
    currentDashboardId = newDash.id;
    saveData(); renderTabs(); renderDashboard(); closeModal('dashModal');
}

function openEditDashModal() {
    const activeDash = allDashboards.find(d => d.id === currentDashboardId);
    if (!activeDash) return;
    document.getElementById('editDashName').value = activeDash.title;
    document.getElementById('editDashEmojiTriggerBtn').innerText = activeDash.icon || "🚀";
    document.getElementById('editDashHiddenEmojiInput').value = activeDash.icon || "🚀";
    openModal('editDashModal');
}

function saveEditDashboard() {
    const activeDash = allDashboards.find(d => d.id === currentDashboardId);
    if (!activeDash) return;
    activeDash.title = document.getElementById('editDashName').value.trim() || activeDash.title;
    activeDash.icon = document.getElementById('editDashHiddenEmojiInput').value.trim() || "🚀";
    saveData(); renderTabs(); renderDashboard(); closeModal('editDashModal');
}

function deleteCurrentDashboard() {
    if (allDashboards.length <= 1) return;
    triggerCustomConfirm("האם למחוק לחלוטין את הדשבורד הנוכחי?", () => {
        allDashboards = allDashboards.filter(d => d.id !== currentDashboardId);
        currentDashboardId = allDashboards[0].id;
        saveData(); renderTabs(); renderDashboard();
    });
}

// ==========================================
// 8. רינדור קטגוריות וכלים
// ==========================================
function renderDashboard(searchTerm = "") {
    const grid = document.getElementById('categoriesGrid');
    const select = document.getElementById('itemCategorySelect');
    grid.innerHTML = ""; select.innerHTML = "";

    const activeDash = allDashboards.find(d => d.id === currentDashboardId);
    if (activeDash) {
        document.getElementById('activeDashTitleDisplay').innerHTML = `<span>${activeDash.icon || '🚀'}</span> <span>${activeDash.title}</span>`;
    }

    const activeData = getCurrentDashboardData();
    renderPopularTools();

    activeData.forEach((category, catIndex) => {
        const option = document.createElement('option');
        option.value = category.id;
        option.text = (category.icon ? category.icon + " " : "") + category.title;
        select.appendChild(option);

        const filteredItems = category.items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.url.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (searchTerm && filteredItems.length === 0) return;

        const catCard = document.createElement('div');
        catCard.className = "category-card glass-panel";
        const catColor = category.color || "#38bdf8";
        catCard.style.borderColor = catColor;
        
        // תכונות גרירה לקטגוריות
        catCard.draggable = true;
        catCard.dataset.index = catIndex;
        catCard.dataset.catId = category.id;
        setupCategoryDragEvents(catCard);

        let totalLinksCounter = filteredItems.length;

        const catHeader = document.createElement('div');
        catHeader.className = "category-header";
        catHeader.innerHTML = `
            <div class="category-title-area">
                <div class="category-title" style="color: ${catColor};">
                    <span>${category.icon || '📁'}</span>
                    <span>${category.title}</span>
                    <span class="category-counter">(${totalLinksCounter})</span>
                </div>
                <button class="edit-icon-btn" onclick="openEditCatModal('${category.id}')" style="font-size:0.85rem;">✏️</button>
            </div>
            <div class="category-actions">
                <button class="delete-cat-btn" onclick="deleteCategory('${category.id}')">🗑️</button>
            </div>
        `;
        catCard.appendChild(catHeader);

        const itemsList = document.createElement('div');
        itemsList.className = "items-list";
        itemsList.dataset.catId = category.id;
        setupDropzoneEvents(itemsList);

        filteredItems.forEach((item, itemIndex) => {
            let hostname = "google.com";
            try { hostname = new URL(item.url).hostname; } catch(e) {}
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;

            const toolWrapper = document.createElement('div');
            toolWrapper.className = "tool-wrapper";
            toolWrapper.draggable = true;
            toolWrapper.dataset.itemId = item.id;
            toolWrapper.dataset.catId = category.id;
            toolWrapper.dataset.itemIndex = itemIndex;
            setupItemDragEvents(toolWrapper);

            const itemElement = document.createElement('div');
            itemElement.className = "tool-item";
            itemElement.innerHTML = `
                <a href="${item.url}" target="_blank" class="tool-link-area">
                    <img src="${faviconUrl}" class="tool-favicon" onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=google.com'">
                    <span class="tool-name">${item.name}</span>
                </a>
                <div class="tool-actions-area">
                    <button class="tool-action-btn btn-copy-link" data-tooltip="הועתק!" title="העתק קישור מהיר ללוח">🔗</button>
                    <button class="tool-action-btn btn-edit-tool" title="עריכה">✏️</button>
                    <button class="tool-action-btn btn-delete-item" title="מחיקה">🗑️</button>
                </div>
            `;

            // מאזינים ייעודיים לכפתורי הפעולה בתוך הכלי
            itemElement.querySelector('.tool-link-area').onclick = () => registerToolClick(category.id, item.id);
            
            // פיצ'ר משודרג: כפתור העתקה מהירה עם בלון צץ מובנה
            const copyBtn = itemElement.querySelector('.btn-copy-link');
            copyBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                navigator.clipboard.writeText(item.url).then(() => {
                    copyBtn.classList.add('copied-success');
                    setTimeout(() => copyBtn.classList.remove('copied-success'), 1500);
                });
            };

            itemElement.querySelector('.btn-edit-tool').onclick = (e) => {
                e.preventDefault(); e.stopPropagation(); openEditItemModal(category.id, item.id);
            };

            itemElement.querySelector('.btn-delete-item').onclick = (e) => {
                e.preventDefault(); e.stopPropagation(); deleteItem(category.id, item.id);
            };

            toolWrapper.appendChild(itemElement);
            itemsList.appendChild(toolWrapper);
        });

        catCard.appendChild(itemsList);
        grid.appendChild(catCard);
    });
}

// ==========================================
// 9. מנגנון DRAG & DROP נייטיב מלא וחלק
// ==========================================
function setupCategoryDragEvents(el) {
    el.addEventListener('dragstart', (e) => {
        if(e.target.className.includes('tool-wrapper') || e.target.closest('.tool-wrapper')) return;
        draggedCategoryIndex = el.dataset.index;
        el.classList.add('dragging');
        e.dataTransfer.setData('text/type', 'category');
    });
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.category-card').forEach(c => c.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', (e) => {
        if(e.dataTransfer.getData('text/type') === 'item') return;
        e.preventDefault();
        el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/type');
        if (type === 'category' && draggedCategoryIndex !== null) {
            const targetIndex = el.dataset.index;
            const activeData = getCurrentDashboardData();
            const moved = activeData.splice(draggedCategoryIndex, 1)[0];
            activeData.splice(targetIndex, 0, moved);
            saveData(); renderDashboard();
        }
        draggedCategoryIndex = null;
    });
}

// גרירת הכלים (החלפת מיקום או העברה בין קטגוריות)
function setupItemDragEvents(el) {
    el.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedItemSourceCatId = el.dataset.catId;
        draggedItemId = el.dataset.itemId;
        el.classList.add('dragging');
        e.dataTransfer.setData('text/type', 'item');
    });
    el.addEventListener('dragend', (e) => {
        e.stopPropagation();
        el.classList.remove('dragging');
        document.querySelectorAll('.tool-wrapper').forEach(w => w.classList.remove('drag-over-item'));
    });
    el.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('drag-over-item');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over-item'));
    el.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        const type = e.dataTransfer.getData('text/type');
        if (type === 'item' && draggedItemId) {
            const targetCatId = el.dataset.catId;
            const targetItemIndex = parseInt(el.dataset.itemIndex);
            moveItemInState(draggedItemSourceCatId, draggedItemId, targetCatId, targetItemIndex);
        }
    });
}

function setupDropzoneEvents(zone) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/type');
        if (type === 'item' && draggedItemId && e.target.classList.contains('items-list')) {
            const targetCatId = zone.dataset.catId;
            moveItemInState(draggedItemSourceCatId, draggedItemId, targetCatId, null);
        }
    });
}

function moveItemInState(sourceCatId, itemId, targetCatId, targetIndex) {
    const activeData = getCurrentDashboardData();
    const sourceCat = activeData.find(c => c.id === sourceCatId);
    const targetCat = activeData.find(c => c.id === targetCatId);
    if (!sourceCat || !targetCat) return;

    const itemIndex = sourceCat.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const [itemToMove] = sourceCat.items.splice(itemIndex, 1);
    
    if (targetIndex === null || targetIndex === undefined) {
        targetCat.items.push(itemToMove);
    } else {
        targetCat.items.splice(targetIndex, 0, itemToMove);
    }

    saveData();
    renderDashboard();
    draggedItemId = null; draggedItemSourceCatId = null;
}

// ==========================================
// 10. פונקציות לוגיקה תפעולית לקטגוריות וכלים
// ==========================================
function saveCategory() {
    const name = document.getElementById('catName').value.trim();
    const icon = document.getElementById('catHiddenEmojiInput').value.trim() || "📁";
    if (!name) return;
    getCurrentDashboardData().push({ id: 'cat-' + Date.now(), title: name, icon: icon, color: selectedCatColor, items: [] });
    saveData(); renderDashboard(); closeModal('catModal');
    document.getElementById('catName').value = "";
}

function openInlineCategoryCreate() {
    document.getElementById('inlineCatName').value = "";
    openModal('inlineCatModal');
}

function saveInlineCategory() {
    const name = document.getElementById('inlineCatName').value.trim();
    const icon = document.getElementById('inlineCatHiddenEmojiInput').value.trim() || "📁";
    if (!name) return;
    const newCatId = 'cat-' + Date.now();
    getCurrentDashboardData().push({ id: newCatId, title: name, icon: icon, color: selectedInlineCatColor, items: [] });
    saveData(); renderDashboard(); closeModal('inlineCatModal');
    document.getElementById('itemCategorySelect').value = newCatId;
}

function openEditCatModal(catId) {
    const category = getCurrentDashboardData().find(c => c.id === catId);
    if (!category) return;
    document.getElementById('editCatId').value = catId;
    document.getElementById('editCatName').value = category.title;
    document.getElementById('editCatEmojiTriggerBtn').innerText = category.icon || "📁";
    document.getElementById('editCatHiddenEmojiInput').value = category.icon || "📁";
    selectedEditCatColor = category.color || presetColors[0];
    openModal('editCatModal');
}

function saveEditCategory() {
    const catId = document.getElementById('editCatId').value;
    const category = getCurrentDashboardData().find(c => c.id === catId);
    if (!category) return;
    category.title = document.getElementById('editCatName').value.trim() || category.title;
    category.icon = document.getElementById('editCatHiddenEmojiInput').value.trim() || "📁";
    category.color = selectedEditCatColor;
    saveData(); renderDashboard(); closeModal('editCatModal');
}

function saveTool() {
    const name = document.getElementById('itemName').value.trim();
    let url = document.getElementById('itemUrl').value.trim();
    const catId = document.getElementById('itemCategorySelect').value;
    if (!catId || !name || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const category = getCurrentDashboardData().find(c => c.id === catId);
    if (category) {
        category.items.push({ id: 'tool-' + Date.now(), name: name, url: url, clicks: 0 });
        saveData(); renderDashboard(); closeModal('itemModal');
        document.getElementById('itemName').value = "";
        document.getElementById('itemUrl').value = "";
    }
}

function openEditItemModal(catId, itemId) {
    const category = getCurrentDashboardData().find(c => c.id === catId);
    if (!category) return;
    const item = category.items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('editItemTargetCatId').value = catId;
    document.getElementById('editItemTargetId').value = itemId;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemUrl').value = item.url;

    const editSelect = document.getElementById('editItemCategorySelect');
    editSelect.innerHTML = "";
    getCurrentDashboardData().forEach(cat => {
        const opt = document.createElement('option'); opt.value = cat.id; opt.text = cat.title;
        if(cat.id === catId) opt.selected = true;
        editSelect.appendChild(opt);
    });
    openModal('editItemModal');
}

function saveEditTool() {
    const sourceCatId = document.getElementById('editItemTargetCatId').value;
    const itemId = document.getElementById('editItemTargetId').value;
    const newCatId = document.getElementById('editItemCategorySelect').value;
    const newName = document.getElementById('editItemName').value.trim();
    let newUrl = document.getElementById('editItemUrl').value.trim();

    if (!newName || !newUrl) return;
    if (!/^https?:\/\//i.test(newUrl)) newUrl = 'https://' + newUrl;

    const sourceCategory = getCurrentDashboardData().find(c => c.id === sourceCatId);
    if (!sourceCategory) return;
    const itemIndex = sourceCategory.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const updatedItem = sourceCategory.items[itemIndex];
    updatedItem.name = newName; updatedItem.url = newUrl;

    if (sourceCatId !== newCatId) {
        sourceCategory.items.splice(itemIndex, 1);
        const targetCategory = getCurrentDashboardData().find(c => c.id === newCatId);
        if (targetCategory) {
            if(!targetCategory.items) targetCategory.items = [];
            targetCategory.items.push(updatedItem);
        }
    }
    saveData(); renderDashboard(); closeModal('editItemModal');
}

function deleteItem(catId, itemId) {
    triggerCustomConfirm("האם למחוק את הכלי הזה מהדשבורד?", () => {
        const category = getCurrentDashboardData().find(c => c.id === catId);
        if (category) {
            category.items = category.items.filter(i => i.id !== itemId);
            saveData(); renderDashboard();
        }
    });
}

function deleteCategory(catId) {
    if (getCurrentDashboardData().length <= 1) {
        showAppNotification("פעולה חסומה", "לא ניתן למחוק את הקטגוריה האחרונה שנשארה בדשבורד.");
        return;
    }
    triggerCustomConfirm("האם למחוק את הקטגוריה ואת כל הכלים שבתוכה?", () => {
        const activeDash = allDashboards.find(d => d.id === currentDashboardId);
        if (activeDash) {
            activeDash.data = activeDash.data.filter(c => c.id !== catId);
            saveData(); renderDashboard();
        }
    });
}

// ==========================================
// 11. גיבויים ומערכת ייבוא סימניות (Bookmarks)
// ==========================================
function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allDashboards, null, 2));
    const dl = document.createElement('a'); dl.setAttribute("href", dataStr); dl.setAttribute("download", "dashy_professional_backup.json");
    document.body.appendChild(dl); dl.click(); dl.remove();
}

function importDataJSON(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) { allDashboards = imported; currentDashboardId = allDashboards[0].id; saveData(); renderTabs(); renderDashboard(); toggleSettings(); }
        } catch (err) { showAppNotification("שגיאה קריטית", "קובץ הגיבוי שגוי."); }
    };
    reader.readAsText(file);
}

function toggleBookmarksFolderSelector(show) { 
    document.getElementById('bookmarksFolderSelectorArea').style.display = show ? 'block' : 'none'; 
}

function importBookmarksHTML(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const parser = new DOMParser(); const doc = parser.parseFromString(e.target.result, 'text/html');
        const allLinks = doc.querySelectorAll('a');
        if (allLinks.length === 0) { showAppNotification("שגיאה", "לאמצאו סימניות תקינות."); event.target.value = ""; return; }

        temporaryParsedBookmarks = []; const uniqueFolders = new Set();
        allLinks.forEach(link => {
            const url = link.getAttribute('href'); const name = link.textContent.trim();
            if (!url || !url.startsWith('http')) return;
            let folderName = "סימניות ללא קטגוריה"; let currentElement = link.closest('dl');
            if (currentElement) {
                let previousHeader = currentElement.previousElementSibling;
                while (previousHeader && previousHeader.tagName !== 'H3') { previousHeader = previousHeader.previousElementSibling; }
                if (previousHeader && previousHeader.tagName === 'H3') { folderName = previousHeader.textContent.trim(); }
            }
            uniqueFolders.add(folderName);
            temporaryParsedBookmarks.push({ name: name || url, url: url, folder: folderName });
        });

        const checkboxesGrid = document.getElementById('bookmarksFoldersCheckboxesGrid'); checkboxesGrid.innerHTML = '';
        uniqueFolders.forEach(folder => {
            const label = document.createElement('label'); label.style.cssText = "display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.95rem; background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 4px;";
            label.innerHTML = `<input type="checkbox" class="bookmark-folder-checkbox" value="${folder}" checked style="accent-color: var(--accent);"><span>📁 ${folder}</span>`;
            checkboxesGrid.appendChild(label);
        });

        openModal('bookmarksImportModal');
        document.getElementById('executeBookmarksImportBtn').onclick = function() {
            const structureMode = document.querySelector('input[name="bookmarkStructure"]:checked').value;
            const scopeMode = document.querySelector('input[name="bookmarkScope"]:checked').value;
            let foldersToImport = Array.from(uniqueFolders);

            if (scopeMode === 'custom') {
                foldersToImport = Array.from(document.querySelectorAll('.bookmark-folder-checkbox:checked')).map(box => box.value);
                if (foldersToImport.length === 0) { showAppNotification("שים לב", "יש לבחור לפחות תיקייה אחת."); return; }
            }

            const finalLinksToImport = temporaryParsedBookmarks.filter(item => foldersToImport.includes(item.folder));
            const activeDashboardData = getCurrentDashboardData();

            if (structureMode === 'flat') {
                const importedItems = finalLinksToImport.map(item => ({ id: 'tool-' + Math.random().toString(36).substr(2,9), name: item.name, url: item.url, clicks:0 }));
                if (importedItems.length > 0) activeDashboardData.push({ id: 'cat-' + Date.now(), title: `סימניות מיובאות (${importedItems.length})`, icon: "🌐", color: "#a855f7", items: importedItems });
            } else {
                finalLinksToImport.forEach(item => {
                    let existingCat = activeDashboardData.find(c => c.title === item.folder);
                    if (!existingCat) {
                        existingCat = { id: 'cat-' + Math.random().toString(36).substr(2,9), title: item.folder, icon: "📁", color: presetColors[Math.floor(Math.random() * presetColors.length)], items: [] };
                        activeDashboardData.push(existingCat);
                    }
                    existingCat.items.push({ id: 'tool-' + Math.random().toString(36).substr(2,9), name: item.name, url: item.url, clicks:0 });
                });
            }
            saveData(); renderDashboard(); closeModal('bookmarksImportModal'); toggleSettings();
            showAppNotification("הייבוא הושלם! 🎉", `בהצלחה, ${finalLinksToImport.length} סימניות נוספו לדשבורד.`);
            temporaryParsedBookmarks = []; event.target.value = "";
        };
    };
    reader.readAsText(file);
}

// מאזין לשורת החיפוש
document.getElementById('searchBar').addEventListener('input', (e) => renderDashboard(e.target.value));

// אתחול מערכת ראשוני לאחר טעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    initEmojiPicker();
    renderTabs();
    renderDashboard();
});
