const ICON_MAX = '<rect x="2" y="2" width="8" height="8"/>';
const ICON_RESTORE = '<rect x="2" y="4" width="6" height="6"/><path d="M4 4V2h6v6H8"/>';

function setMaxIcon(maximized) {
    document.querySelector("#btn-max svg").innerHTML = maximized ? ICON_RESTORE : ICON_MAX;
}

function bindControls() {
    document.getElementById("btn-min").addEventListener("click", () => window.pywebview.api.minimize());
    document.getElementById("btn-max").addEventListener("click", async () => {
        setMaxIcon(await window.pywebview.api.toggle_maximize());
    });
    document.getElementById("btn-close").addEventListener("click", () => window.pywebview.api.close());
    document.querySelector(".titlebar").addEventListener("dblclick", event => {
        if (event.target.closest(".controls")) {
            return;
        }
        document.getElementById("btn-max").click();
    });
}

window.addEventListener("pywebviewready", bindControls);

const tabsBar = document.getElementById("tabs");
const addButton = document.getElementById("add-tab");
const content = document.getElementById("content");
const addressInput = document.getElementById("address");
const searchInput = document.getElementById("search");
const backButton = document.getElementById("btn-back");
const forwardButton = document.getElementById("btn-forward");
const upButton = document.getElementById("btn-up");
const CLOSE_ICON = '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
const ICON_COLORS = {
    folder: ["#e0486a", "#a01d3d"],
    folderBack: ["#b02d50", "#6d1229"],
    drive: ["#b4bac7", "#6a707d"],
    image: ["#3fae7a", "#1f7a52"],
    audio: ["#a56bd9", "#6a3a9c"],
    video: ["#e8804f", "#a8431f"],
    archive: ["#dcaa3e", "#9a6d14"],
    code: ["#4a9be8", "#2358a8"],
    doc: ["#5a92e0", "#2b4f9c"],
    pdf: ["#e8566a", "#9c1c2e"],
    sheet: ["#47b862", "#1f7a35"],
    app: ["#939bb0", "#555d70"],
    generic: ["#a3a9b6", "#5c616d"]
};

const EXT_TYPES = {
    image: ["png", "jpg", "jpeg", "jpe", "jfif", "gif", "bmp", "webp", "svg", "ico", "tif", "tiff", "heic", "avif"],
    audio: ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"],
    video: ["mp4", "mkv", "avi", "mov", "wmv", "webm", "flv"],
    archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"],
    code: ["py", "js", "ts", "html", "css", "json", "xml", "c", "cpp", "h", "cs", "java", "go", "rs", "php", "sh", "bat", "yml", "yaml", "sql", "jsx", "tsx"],
    doc: ["doc", "docx", "txt", "rtf", "odt", "md", "log", "ini", "cfg"],
    pdf: ["pdf"],
    sheet: ["xls", "xlsx", "csv", "ods", "tsv"],
    app: ["exe", "msi", "lnk", "dll", "apk"]
};

const GLYPHS = {
    image: '<circle cx="9.5" cy="12" r="1.3" fill="#fff"/><path d="M7 18l3.2-3.8 2.1 2.2 2.2-2.9 2.5 4.5z" fill="#fff" fill-opacity=".92"/>',
    audio: '<path d="M10.5 17V11l5-1.2V16" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="17.2" r="1.6" fill="#fff"/><circle cx="14" cy="16.2" r="1.6" fill="#fff"/>',
    video: '<path d="M9.5 10.5l6 3.8-6 3.8z" fill="#fff" stroke="#fff" stroke-width="1" stroke-linejoin="round"/>',
    archive: '<path d="M11 9h2v2h-2zM11 12h2v2h-2z" fill="#fff"/><rect x="10" y="15" width="4" height="3.5" rx="1" fill="none" stroke="#fff" stroke-width="1.3"/>',
    code: '<path d="M10 11l-3 3 3 3M14 11l3 3-3 3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    doc: '<path d="M8 12h8M8 15h8M8 18h5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    pdf: '<path d="M8 12h8M8 15h8M8 18h4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="17.5" r="1.6" fill="#fff"/>',
    sheet: '<rect x="7.5" y="11" width="9" height="7.5" rx="1" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M7.5 14.7h9M12 11v7.5" stroke="#fff" stroke-width="1.3"/>',
    app: '<rect x="7.5" y="11" width="9" height="7.5" rx="1.2" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M7.5 13.6h9" stroke="#fff" stroke-width="1.3"/>',
    generic: '<path d="M8.5 13.5h7M8.5 16.5h4.5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.5" stroke-linecap="round"/>'
};

function installIconDefs() {
    const stops = ([a, b]) => '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/>';
    const grads = Object.keys(ICON_COLORS).map(key =>
        '<linearGradient id="ig-' + key + '" x1="0" y1="0" x2="0" y2="1">' + stops(ICON_COLORS[key]) + '</linearGradient>'
    ).join("");
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    holder.innerHTML = '<svg width="0" height="0"><defs>' + grads + '</defs></svg>';
    document.body.appendChild(holder);
}
installIconDefs();

function iconType(entry) {
    const dot = entry.name.lastIndexOf(".");
    const ext = dot > 0 ? entry.name.slice(dot + 1).toLowerCase() : "";
    return Object.keys(EXT_TYPES).find(type => EXT_TYPES[type].includes(ext)) || "generic";
}

function folderIcon() {
    return '<svg class="file-icon folder" viewBox="0 0 24 24">'
        + '<path d="M2 6a2 2 0 0 1 2-2h5.2l2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="url(#ig-folderBack)"/>'
        + '<path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="url(#ig-folder)"/>'
        + '<path d="M3.2 9.6h17.6" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linecap="round"/>'
        + '</svg>';
}

function driveIcon() {
    return '<svg class="file-icon drive" viewBox="0 0 24 24">'
        + '<rect x="2" y="7" width="20" height="11" rx="3" fill="url(#ig-drive)"/>'
        + '<path d="M4 8.2h16" stroke="#fff" stroke-opacity=".5" stroke-width="1" stroke-linecap="round"/>'
        + '<rect x="5" y="13.5" width="8" height="1.8" rx=".9" fill="#000" fill-opacity=".35"/>'
        + '<circle cx="18" cy="14.4" r="1.2" fill="#e0486a"/>'
        + '</svg>';
}

function fileIcon(type) {
    return '<svg class="file-icon file ' + type + '" viewBox="0 0 24 24">'
        + '<path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="url(#ig-' + type + ')"/>'
        + '<path d="M14 2v3.2A1.8 1.8 0 0 0 15.8 7H19z" fill="#fff" fill-opacity=".4"/>'
        + '<path d="M6 2.6h7.6" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/>'
        + GLYPHS[type]
        + '</svg>';
}

function iconFor(entry) {
    if (entry.is_dir) {
        return /^[A-Za-z]:[\\/]?$/.test(entry.path) || entry.path === "/" ? driveIcon() : folderIcon();
    }
    return fileIcon(iconType(entry));
}


const TRASH = "trash://";
const trashBar = document.getElementById("trashbar");
const trashSelectAll = document.getElementById("tb-select-all");
const trashRestore = document.getElementById("tb-restore");
const trashRestoreAll = document.getElementById("tb-restore-all");
const trashEmpty = document.getElementById("tb-empty");
const states = new WeakMap();
let places = {};
let shownEntries = [];
let shownRows = [];
let anchor = -1;
let cursor = -1;
let helpMode = false;
let viewMode = "table";
try {
    const savedView = localStorage.getItem("folderion.view");
    if (["list", "gallery", "table"].includes(savedView)) {
        viewMode = savedView;
    }
} catch (error) {
    viewMode = "table";
}
let drag = null;
let clipboard = { mode: "", paths: new Set() };
let renaming = null;
let sortKey = "name";
let sortAsc = true;
let groupKey = "none";
try {
    const savedArrange = JSON.parse(localStorage.getItem("folderion.arrange") || "{}");
    if (["name", "size", "type", "date"].includes(savedArrange.sort)) {
        sortKey = savedArrange.sort;
    }
    if (typeof savedArrange.asc === "boolean") {
        sortAsc = savedArrange.asc;
    }
    if (["none", "name", "size", "type", "date"].includes(savedArrange.group)) {
        groupKey = savedArrange.group;
    }
} catch (error) {
    groupKey = "none";
}
let showHidden = false;
try {
    showHidden = localStorage.getItem("folderion.hidden") === "1";
} catch (error) {
    showHidden = false;
}
const selection = new Set();
let renderToken = 0;

function api() {
    return window.pywebview.api;
}

function inTrash(state) {
    return Boolean(state) && state.path === TRASH && !helpMode;
}

function folderCell(entry) {
    const folder = entry.original ? originalFolder(entry.original) : "";
    const cell = makeCell(folder, "file-meta");
    cell.title = folder;
    return cell;
}

function originalFolder(path) {
    const folder = (path || "").replace(/[\\/][^\\/]*$/, "");
    if (!folder) {
        return "/";
    }
    return /^[A-Za-z]:$/.test(folder) ? folder + "\\" : folder;
}

function activeTab() {
    return tabsBar.querySelector(".tab.active");
}

function folderLabel(path) {
    if (!path) {
        return "Цей пк";
    }
    const trimmed = path.replace(/[\\/]+$/, "");
    const name = trimmed.split(/[\\/]/).pop();
    return name || path;
}

function tabTitle(path) {
    const known = Array.from(document.querySelectorAll(".side-item")).find(item => {
        const target = places[item.dataset.place];
        return target !== undefined && normalize(target) === normalize(path);
    });
    return known ? known.textContent : folderLabel(path);
}

function normalize(path) {
    return (path || "").replace(/[\\/]+$/, "").toLowerCase();
}

function formatSize(bytes) {
    if (bytes < 1024) {
        return bytes + " Б";
    }
    const units = ["КБ", "МБ", "ГБ", "ТБ"];
    let value = bytes / 1024;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return value.toFixed(value < 10 ? 1 : 0).replace(".", ",") + " " + units[index];
}

function formatDate(timestamp) {
    if (!timestamp) {
        return "";
    }
    return new Date(timestamp * 1000).toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function setTabLabel(tab, text) {
    tab.querySelector(".tab-label").textContent = text;
}

function highlightPlace(path) {
    document.querySelectorAll(".side-item").forEach(item => {
        const target = item.dataset.path !== undefined ? item.dataset.path : places[item.dataset.place];
        item.classList.toggle("active", target !== undefined && normalize(target) === normalize(path));
    });
}

function updateStatus() {
    document.getElementById("status-count").textContent = helpMode ? "Довідник FOLDERION" : "Елементів: " + shownEntries.length;
    const selected = document.getElementById("status-selected");
    const picked = Array.from(selection).map(index => shownEntries[index]).filter(Boolean);
    if (picked.length) {
        const files = picked.filter(item => !item.is_dir);
        const total = files.reduce((sum, item) => sum + item.size, 0);
        selected.textContent = "Вибрано елементів: " + picked.length + (files.length ? "   " + formatSize(total) : "");
    }
    selected.hidden = !picked.length;
    updateTrashUi();
}

function updateTrashUi() {
    const tab = activeTab();
    const state = tab && states.get(tab);
    const visible = inTrash(state);
    trashBar.hidden = !visible;
    if (visible) {
        trashSelectAll.disabled = !shownEntries.length;
        trashRestore.disabled = !selection.size;
        trashRestoreAll.disabled = !state.entries.length;
        trashEmpty.disabled = !state.entries.length;
    }
}

function applySelection() {
    shownRows.forEach((row, index) => row.classList.toggle("selected", selection.has(index)));
    updateStatus();
}

function showMessage(text) {
    content.innerHTML = "";
    const message = document.createElement("div");
    message.className = "message";
    message.textContent = text;
    content.appendChild(message);
}

function updateNavButtons(state) {
    backButton.disabled = state.index <= 0;
    forwardButton.disabled = state.index >= state.history.length - 1;
    upButton.disabled = !state.path;
}

const ICON_EXTENSIONS = [".exe", ".lnk"];

function hasRealIcon(entry) {
    const lower = entry.name.toLowerCase();
    return !entry.is_dir && ICON_EXTENSIONS.some(ext => lower.endsWith(ext));
}

async function loadIcons(items, token) {
    const chunkSize = 10;
    for (let start = 0; start < items.length; start += chunkSize) {
        const chunk = items.slice(start, start + chunkSize);
        const icons = await api().get_icons(chunk.map(item => item.path));
        if (token !== renderToken) {
            return;
        }
        chunk.forEach(item => {
            const source = icons[item.path];
            if (source) {
                const image = document.createElement("img");
                image.className = "file-icon app";
                image.src = source;
                item.holder.replaceWith(image);
            }
        });
    }
}

function render() {
    if (helpMode) {
        return;
    }
    renderToken += 1;
    renaming = null;
    const token = renderToken;
    const iconItems = [];
    const tab = activeTab();
    if (!tab) {
        return;
    }
    const state = states.get(tab);
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query ? state.entries.filter(entry => entry.name.toLowerCase().includes(query)) : state.entries;
    const arranged = arrangeEntries(filtered);
    const entries = arranged.list;

    content.innerHTML = "";
    content.className = "content view-" + viewMode + (state.path === TRASH ? " trash" : "");
    shownEntries = entries;
    shownRows = [];
    selection.clear();
    anchor = -1;
    cursor = -1;
    updateStatus();

    if (!entries.length) {
        showMessage(query ? "Нічого не знайдено" : (state.path === TRASH ? "Смітник порожній" : "Ця папка порожня"));
        return;
    }

    const fragment = document.createDocumentFragment();
    if (viewMode === "table") {
        const head = document.createElement("div");
        head.className = "file-head";
        head.innerHTML = state.path === TRASH
            ? '<div>Ім’я</div><div>Вихідне розташування</div><div>Дата видалення</div><div class="num">Розмір</div><div>Тип елемента</div><div>Дата змінення</div>'
            : '<div>Ім’я</div><div class="num">Розмір</div><div>Тип</div><div>Дата змінення</div>';
        fragment.appendChild(head);
    }

    entries.forEach((entry, position) => {
        if (arranged.headers.has(position)) {
            fragment.appendChild(groupHeader(arranged.headers.get(position)));
        }
        const row = document.createElement("div");
        row.className = "file-row";
        row.dataset.index = position;
        shownRows.push(row);
        row.dataset.path = entry.path;
        if (clipboard.mode === "cut" && clipboard.paths.has(entry.path)) {
            row.classList.add("cut");
        }
        if (entry.hidden) {
            row.classList.add("is-hidden");
        }
        if (entry.path === playingPath) {
            row.classList.add("playing");
        }

        const name = document.createElement("div");
        name.className = "file-name";
        name.innerHTML = iconFor(entry);
        if (hasRealIcon(entry)) {
            iconItems.push({ path: entry.path, holder: name.firstElementChild });
        }
        const label = document.createElement("span");
        label.textContent = entry.name;
        name.appendChild(label);

        if (viewMode === "table") {
            if (state.path === TRASH) {
                const kb = Math.max(1, Math.ceil(entry.size / 1024));
                row.append(
                    name,
                    folderCell(entry),
                    makeCell(formatDate(entry.deleted), "file-meta"),
                    makeCell(kb.toLocaleString("uk-UA") + " КБ", "file-meta num"),
                    makeCell(entry.is_dir ? "Папка файлів" : typeName(entry), "file-meta"),
                    makeCell(formatDate(entry.modified), "file-meta")
                );
            } else {
                row.append(
                    name,
                    makeCell(entry.is_dir ? "" : formatSize(entry.size), "file-meta num"),
                    makeCell(typeName(entry), "file-meta"),
                    makeCell(formatDate(entry.modified), "file-meta")
                );
            }
        } else {
            row.title = state.path === TRASH ? entry.name + "\nБуло в: " + originalFolder(entry.original) : entry.name;
            row.append(name);
        }

        row.addEventListener("dblclick", () => openEntry(entry));

        fragment.appendChild(row);
    });

    content.appendChild(fragment);

    if (iconItems.length) {
        loadIcons(iconItems, token);
    }
}

async function navigate(path, push = true) {
    const tab = activeTab();
    if (!tab) {
        return;
    }
    const state = states.get(tab);
    setEditorView(false);
    const result = await api().list_dir(path, showHidden);

    if (result.error) {
        showMessage(result.error);
        addressInput.value = state.path || "Цей пк";
        return;
    }

    if (push) {
        state.history = state.history.slice(0, state.index + 1);
        state.history.push(result.path);
        state.index = state.history.length - 1;
    }

    state.help = false;
    helpMode = false;
    closeViewer();
    state.path = result.path;
    state.entries = result.entries;
    state.archive = result.archive || "";
    addressInput.value = result.path === TRASH ? "Смітник" : (result.path || "Цей пк");
    searchInput.value = "";
    setTabLabel(tab, tabTitle(result.path));
    highlightPlace(result.path);
    updateNavButtons(state);
    render();
}

function registerTab(tab, path) {
    states.set(tab, { path: path, history: [path], index: 0, entries: [], archive: "" });
}

function activateTab(tab) {
    setEditorView(false);
    tabsBar.querySelectorAll(".tab.active").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const state = states.get(tab);
    if (state) {
        if (state.help) {
            showHelp();
        } else {
            navigate(state.path, false);
        }
    }
}

function closeTab(tab) {
    const tabs = tabsBar.querySelectorAll(".tab");
    if (tabs.length <= 1) {
        return;
    }
    const wasActive = tab.classList.contains("active");
    const neighbour = tab.nextElementSibling && tab.nextElementSibling.classList.contains("tab")
        ? tab.nextElementSibling
        : tab.previousElementSibling;
    tab.remove();
    if (wasActive && neighbour) {
        activateTab(neighbour);
    }
}

tabsBar.addEventListener("click", event => {
    const tab = event.target.closest(".tab");
    if (!tab) {
        return;
    }
    if (event.target.closest(".tab-close")) {
        closeTab(tab);
    } else if (!tab.classList.contains("active")) {
        activateTab(tab);
    }
});

tabsBar.addEventListener("mousedown", event => {
    if (event.button === 1 && event.target.closest(".tab")) {
        event.preventDefault();
    }
});

tabsBar.addEventListener("auxclick", event => {
    if (event.button !== 1) {
        return;
    }
    const tab = event.target.closest(".tab");
    if (tab) {
        event.preventDefault();
        closeTab(tab);
    }
});

addButton.addEventListener("click", () => {
    setEditorView(false);
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.innerHTML = '<span class="tab-label">Нова вкладка</span><span class="tab-close" title="Закрити вкладку">' + CLOSE_ICON + '</span>';
    tabsBar.insertBefore(tab, addButton);
    registerTab(tab, places.desktop);
    activateTab(tab);
});

document.querySelector(".sidebar").addEventListener("click", event => {
    if (pinSuppressClick) {
        return;
    }
    const item = event.target.closest(".side-item");
    if (item && item.dataset.place === "help") {
        showHelp();
    } else if (item && places[item.dataset.place] !== undefined) {
        navigate(places[item.dataset.place]);
    } else if (item && item.dataset.path !== undefined) {
        if (pinKind.get(item.dataset.path) === "file") {
            openPinnedFile(item.dataset.path);
        } else {
            navigate(item.dataset.path);
        }
    }
});

backButton.addEventListener("click", () => {
    setEditorView(false);
    const state = states.get(activeTab());
    if (state.index > 0) {
        state.index -= 1;
        navigate(state.history[state.index], false);
    }
});

forwardButton.addEventListener("click", () => {
    setEditorView(false);
    const state = states.get(activeTab());
    if (state.index < state.history.length - 1) {
        state.index += 1;
        navigate(state.history[state.index], false);
    }
});

upButton.addEventListener("click", async () => {
    const state = states.get(activeTab());
    if (state.path) {
        navigate(await api().parent(state.path));
    }
});

addressInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        const value = addressInput.value.trim();
        const lower = value.toLowerCase();
        navigate(value === "Цей пк" ? "" : (lower === "смітник" || lower === TRASH ? TRASH : value));
    }
});

searchInput.addEventListener("input", render);

window.addEventListener("pywebviewready", async () => {
    places = await api().places();
    const first = tabsBar.querySelector(".tab");
    registerTab(first, places.start || places.desktop);
    activateTab(first);
});

/* ---------- Плеєр ---------- */
const audio = document.getElementById("audio");
const player = document.getElementById("player");
const plPlay = document.getElementById("pl-play");
const plPrev = document.getElementById("pl-prev");
const plNext = document.getElementById("pl-next");
const plSeek = document.getElementById("pl-seek");
const plVol = document.getElementById("pl-vol");
const plMute = document.getElementById("pl-mute");
const plTitle = document.getElementById("pl-title");
const plSub = document.getElementById("pl-sub");
const plCur = document.getElementById("pl-cur");
const plDur = document.getElementById("pl-dur");
const PL_PLAY = '<path d="M3.2 1.8l7 4.2-7 4.2z"/>';
const PL_PAUSE = '<path d="M2.8 2h2.4v8H2.8zM6.8 2h2.4v8H6.8z"/>';
const PL_VOL = '<path d="M1.5 4.5h2L6.5 2v8l-3-2.5h-2z"/><path d="M8.5 4a3 3 0 0 1 0 4" fill="none"/>';
const PL_MUTE = '<path d="M1.5 4.5h2L6.5 2v8l-3-2.5h-2z"/><path d="M8.5 4.5l3 3M11.5 4.5l-3 3" fill="none"/>';

const plRepeat = document.getElementById("pl-repeat");
const plShuffle = document.getElementById("pl-shuffle");
const PL_REPEAT = '<path d="M2 6V5a1 1 0 0 1 1-1h6.5M8 2.3L9.8 4 8 5.7M10 6v1a1 1 0 0 1-1 1H2.5M4 6.3L2.2 8 4 9.7" fill="none"/>';
const PL_REPEAT_ONE = PL_REPEAT + '<text x="6" y="7.1" font-size="4.6" font-weight="700" text-anchor="middle" stroke="none">1</text>';
const PL_SHUFFLE = '<path d="M1.5 3.5h1.8c2.2 0 3 5 5.2 5h2M1.5 8.5h1.8c.8 0 1.4-.7 2-1.8M6.6 5.1c.6-1 1.2-1.6 1.9-1.6h2M9.4 2L11 3.5 9.4 5M9.4 7L11 8.5 9.4 10" fill="none"/>';
const REPEAT_MODES = ["off", "all", "one"];
const REPEAT_TITLES = { off: "Повтор: вимкнено", all: "Повтор: усіх треків", one: "Повтор: одного треку" };

let queue = [];
let queueIndex = -1;
let playingPath = null;
let order = [];
let orderPos = -1;
let repeatMode = "off";
let shuffleOn = false;

try {
    const savedPlayer = JSON.parse(localStorage.getItem("folderion.player") || "{}");
    if (REPEAT_MODES.includes(savedPlayer.repeat)) {
        repeatMode = savedPlayer.repeat;
    }
    shuffleOn = savedPlayer.shuffle === true;
} catch (error) {
    repeatMode = "off";
}

function savePlayerPrefs() {
    try {
        localStorage.setItem("folderion.player", JSON.stringify({ repeat: repeatMode, shuffle: shuffleOn }));
    } catch (error) {
        return;
    }
}

function buildOrder(startIndex) {
    order = queue.map((item, index) => index);
    if (shuffleOn) {
        for (let i = order.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        const at = order.indexOf(startIndex);
        if (at > 0) {
            [order[0], order[at]] = [order[at], order[0]];
        }
    }
    orderPos = Math.max(0, order.indexOf(startIndex));
}

function updatePlayerNavButtons() {
    const wrap = repeatMode === "all";
    plPrev.disabled = !queue.length || (orderPos <= 0 && !wrap);
    plNext.disabled = !queue.length || (orderPos >= order.length - 1 && !wrap);
}

function updateModeButtons() {
    plRepeat.firstElementChild.innerHTML = repeatMode === "one" ? PL_REPEAT_ONE : PL_REPEAT;
    plRepeat.classList.toggle("active", repeatMode !== "off");
    plRepeat.title = REPEAT_TITLES[repeatMode];
    plShuffle.firstElementChild.innerHTML = PL_SHUFFLE;
    plShuffle.classList.toggle("active", shuffleOn);
    plShuffle.title = shuffleOn ? "Перемішування: увімкнено" : "Перемішування: вимкнено";
}

const PLAY_EXT = {
    audio: new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac"]),
    video: new Set(["mp4", "webm"]),
    image: new Set(["png", "jpg", "jpeg", "jpe", "jfif", "gif", "bmp", "webp", "svg", "ico", "avif"])
};

function isAudio(entry) {
    return !entry.is_dir && PLAY_EXT.audio.has(entryExt(entry));
}

function formatTime(seconds) {
    if (!isFinite(seconds)) {
        return "0:00";
    }
    const total = Math.floor(seconds);
    return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
}

function paintRange(input) {
    const percent = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty("--fill", percent + "%");
}

function markPlaying() {
    content.querySelectorAll(".file-row").forEach(row => {
        row.classList.toggle("playing", row.dataset.path === playingPath);
    });
}

function updatePlayButton() {
    plPlay.firstElementChild.innerHTML = audio.paused ? PL_PLAY : PL_PAUSE;
    plPlay.title = audio.paused ? "Відтворити" : "Пауза";
}

function updateVolumeIcon() {
    plMute.firstElementChild.innerHTML = audio.muted || audio.volume === 0 ? PL_MUTE : PL_VOL;
}

async function loadTrack() {
    const entry = queue[queueIndex];
    if (!entry) {
        return;
    }
    playingPath = entry.path;
    audio.pause();
    plTitle.textContent = entry.name;
    plSub.textContent = (queueIndex + 1) + " / " + queue.length;
    plSeek.value = 0;
    plSeek.disabled = false;
    paintRange(plSeek);
    plCur.textContent = "0:00";
    plDur.textContent = "0:00";
    updatePlayerNavButtons();
    markPlaying();
    let url = null;
    try {
        url = await api().media_url(entry.path);
    } catch (error) {
        url = null;
    }
    if (playingPath !== entry.path) {
        return;
    }
    if (!url) {
        plSub.textContent = "Не вдалося відтворити цей файл";
        return;
    }
    audio.src = url;
    audio.play().catch(() => {});
}

function playFrom(entries, entry) {
    queue = entries.filter(isAudio);
    queueIndex = Math.max(0, queue.findIndex(item => item.path === entry.path));
    buildOrder(queueIndex);
    loadTrack();
}

function step(delta, wrap) {
    let target = orderPos + delta;
    if (target < 0 || target >= order.length) {
        if (!wrap || !order.length) {
            return false;
        }
        target = (target + order.length) % order.length;
    }
    orderPos = target;
    queueIndex = order[orderPos];
    loadTrack();
    return true;
}

function resetPlayer() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    playingPath = null;
    queue = [];
    queueIndex = -1;
    order = [];
    orderPos = -1;
    plTitle.textContent = "Нічого не відтворюється";
    plSub.textContent = "Двічі клікніть по музичному файлу";
    plCur.textContent = "0:00";
    plDur.textContent = "0:00";
    plSeek.value = 0;
    plSeek.disabled = true;
    paintRange(plSeek);
    updatePlayerNavButtons();
    plPlay.disabled = false;
    updatePlayButton();
    markPlaying();
}

plPlay.addEventListener("click", () => {
    if (!queue.length) {
        return;
    }
    if (audio.paused) {
        audio.play().catch(() => {});
    } else {
        audio.pause();
    }
});
plPrev.addEventListener("click", () => {
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
    } else {
        step(-1, repeatMode === "all");
    }
});
plNext.addEventListener("click", () => step(1, repeatMode === "all"));
plRepeat.addEventListener("click", () => {
    repeatMode = REPEAT_MODES[(REPEAT_MODES.indexOf(repeatMode) + 1) % REPEAT_MODES.length];
    updateModeButtons();
    updatePlayerNavButtons();
    savePlayerPrefs();
});
plShuffle.addEventListener("click", () => {
    shuffleOn = !shuffleOn;
    if (queue.length) {
        buildOrder(queueIndex);
    }
    updateModeButtons();
    updatePlayerNavButtons();
    savePlayerPrefs();
});
document.getElementById("pl-close").addEventListener("click", resetPlayer);
plMute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    updateVolumeIcon();
});

plSeek.addEventListener("input", () => {
    if (isFinite(audio.duration)) {
        audio.currentTime = plSeek.value / 1000 * audio.duration;
    }
    paintRange(plSeek);
});
plVol.addEventListener("input", () => {
    audio.volume = plVol.value / 100;
    audio.muted = false;
    paintRange(plVol);
    updateVolumeIcon();
});

audio.addEventListener("timeupdate", () => {
    plCur.textContent = formatTime(audio.currentTime);
    if (isFinite(audio.duration) && audio.duration > 0 && document.activeElement !== plSeek) {
        plSeek.value = audio.currentTime / audio.duration * 1000;
        paintRange(plSeek);
    }
});
audio.addEventListener("loadedmetadata", () => {
    plDur.textContent = formatTime(audio.duration);
});
audio.addEventListener("play", updatePlayButton);
audio.addEventListener("pause", updatePlayButton);
audio.addEventListener("ended", () => {
    if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    } else if (!step(1, repeatMode === "all")) {
        updatePlayButton();
    }
});
audio.addEventListener("error", () => {
    if (audio.getAttribute("src")) {
        plSub.textContent = "Не вдалося відтворити цей файл";
    }
});

audio.volume = plVol.value / 100;
paintRange(plSeek);
paintRange(plVol);
updatePlayButton();
updateVolumeIcon();
updateModeButtons();
resetPlayer();

/* Іконки бокової панелі: Font Awesome Free 6.5.2 (CC BY 4.0) */
const SIDE_ICONS = {"desktop": ["0 0 576 512", ["M64 0C28.7 0 0 28.7 0 64V352c0 35.3 28.7 64 64 64H240l-10.7 32H160c-17.7 0-32 14.3-32 32s14.3 32 32 32H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H346.7L336 416H512c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zM512 64V288H64V64H512z"]], "pc": ["0 0 640 512", ["M384 96V320H64L64 96H384zM64 32C28.7 32 0 60.7 0 96V320c0 35.3 28.7 64 64 64H181.3l-10.7 32H96c-17.7 0-32 14.3-32 32s14.3 32 32 32H352c17.7 0 32-14.3 32-32s-14.3-32-32-32H277.3l-10.7-32H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm464 0c-26.5 0-48 21.5-48 48V432c0 26.5 21.5 48 48 48h64c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48H528zm16 64h32c8.8 0 16 7.2 16 16s-7.2 16-16 16H544c-8.8 0-16-7.2-16-16s7.2-16 16-16zm-16 80c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16s-7.2 16-16 16H544c-8.8 0-16-7.2-16-16zm32 160a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"]], "downloads": ["0 0 512 512", ["M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"]], "documents": ["0 0 384 512", ["M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z"]], "pictures": ["0 0 512 512", ["M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H424c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"]], "music": ["0 0 512 512", ["M499.1 6.3c8.1 6 12.9 15.6 12.9 25.7v72V368c0 44.2-43 80-96 80s-96-35.8-96-80s43-80 96-80c11.2 0 22 1.6 32 4.6V147L192 223.8V432c0 44.2-43 80-96 80s-96-35.8-96-80s43-80 96-80c11.2 0 22 1.6 32 4.6V200 128c0-14.1 9.3-26.6 22.8-30.7l320-96c9.7-2.9 20.2-1.1 28.3 5z"]], "videos": ["0 0 512 512", ["M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM48 368v32c0 8.8 7.2 16 16 16H96c8.8 0 16-7.2 16-16V368c0-8.8-7.2-16-16-16H64c-8.8 0-16 7.2-16 16zm368-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V368c0-8.8-7.2-16-16-16H416zM48 240v32c0 8.8 7.2 16 16 16H96c8.8 0 16-7.2 16-16V240c0-8.8-7.2-16-16-16H64c-8.8 0-16 7.2-16 16zm368-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V240c0-8.8-7.2-16-16-16H416zM48 112v32c0 8.8 7.2 16 16 16H96c8.8 0 16-7.2 16-16V112c0-8.8-7.2-16-16-16H64c-8.8 0-16 7.2-16 16zM416 96c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V112c0-8.8-7.2-16-16-16H416zM160 128v64c0 17.7 14.3 32 32 32H320c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32H192c-17.7 0-32 14.3-32 32zm32 160c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32H320c17.7 0 32-14.3 32-32V320c0-17.7-14.3-32-32-32H192z"]], "trash": ["0 0 448 512", ["M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"]], "help": ["0 0 448 512", ["M0 96C0 43 43 0 96 0h96V190.7c0 13.4 15.5 20.9 26 12.5L272 160l54 43.2c10.5 8.4 26 .9 26-12.5V0h32 32c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32v64c17.7 0 32 14.3 32 32s-14.3 32-32 32H384 96c-53 0-96-43-96-96V96zM64 416c0 17.7 14.3 32 32 32H352V384H96c-17.7 0-32 14.3-32 32z"]]};

function installSideIcons() {
    document.querySelectorAll(".side-item").forEach(item => {
        const icon = SIDE_ICONS[item.dataset.place];
        if (!icon || item.querySelector(".side-icon")) {
            return;
        }
        const paths = icon[1].map(d => '<path d="' + d + '"/>').join("");
        item.insertAdjacentHTML("afterbegin", '<svg class="side-icon" viewBox="' + icon[0] + '">' + paths + '</svg>');
    });
}
installSideIcons();

/* ---------- Виділення: клік, Ctrl, Shift, рамка, Ctrl+A ---------- */
content.addEventListener("mousedown", event => {
    if (event.button !== 0 || helpMode) {
        return;
    }
    const rect = content.getBoundingClientRect();
    if (event.clientX - rect.left >= content.clientWidth || event.clientY - rect.top >= content.clientHeight) {
        return;
    }
    const active = document.activeElement;
    if (active && active.matches("input")) {
        active.blur();
    }
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const rowEl = event.target.closest(".file-row");
    const base = ctrl ? new Set(selection) : new Set();

    if (rowEl) {
        const index = Number(rowEl.dataset.index);
        cursor = index;
        if (shift) {
            const from = anchor >= 0 ? anchor : index;
            if (!ctrl) {
                selection.clear();
            }
            for (let i = Math.min(from, index); i <= Math.max(from, index); i += 1) {
                selection.add(i);
            }
        } else if (ctrl) {
            if (selection.has(index)) {
                selection.delete(index);
            } else {
                selection.add(index);
            }
            anchor = index;
        } else {
            selection.clear();
            selection.add(index);
            anchor = index;
        }
    } else if (!ctrl && !shift) {
        selection.clear();
    }
    applySelection();

    drag = {
        x: event.clientX - rect.left + content.scrollLeft,
        y: event.clientY - rect.top + content.scrollTop,
        clientX: event.clientX,
        clientY: event.clientY,
        base: base,
        ctrl: ctrl,
        band: null
    };
    event.preventDefault();
});

document.addEventListener("mousemove", event => {
    if (!drag) {
        return;
    }
    if (!drag.band) {
        if (Math.abs(event.clientX - drag.clientX) < 4 && Math.abs(event.clientY - drag.clientY) < 4) {
            return;
        }
        drag.band = document.createElement("div");
        drag.band.className = "rubber";
        content.appendChild(drag.band);
    }
    const rect = content.getBoundingClientRect();
    if (event.clientY < rect.top + 24) {
        content.scrollTop -= 14;
    } else if (event.clientY > rect.bottom - 24) {
        content.scrollTop += 14;
    }
    const clamp = (value, max) => Math.max(0, Math.min(value, max));
    const currentX = clamp(event.clientX - rect.left + content.scrollLeft, content.scrollWidth);
    const currentY = clamp(event.clientY - rect.top + content.scrollTop, content.scrollHeight);
    const left = Math.min(drag.x, currentX);
    const top = Math.min(drag.y, currentY);
    const width = Math.abs(drag.x - currentX);
    const height = Math.abs(drag.y - currentY);
    Object.assign(drag.band.style, { left: left + "px", top: top + "px", width: width + "px", height: height + "px" });

    selection.clear();
    shownRows.forEach((row, index) => {
        const hit = row.offsetTop < top + height && row.offsetTop + row.offsetHeight > top
            && row.offsetLeft < left + width && row.offsetLeft + row.offsetWidth > left;
        const on = drag.ctrl ? hit !== drag.base.has(index) : hit;
        if (on) {
            selection.add(index);
        }
    });
    applySelection();
});

function endDrag() {
    if (drag && drag.band) {
        drag.band.remove();
    }
    drag = null;
}

document.addEventListener("mouseup", endDrag);
window.addEventListener("blur", endDrag);

document.addEventListener("keydown", event => {
    if (!(event.ctrlKey || event.metaKey) || event.code !== "KeyA") {
        return;
    }
    if (helpMode || event.target.matches("input[type=text], textarea")) {
        return;
    }
    event.preventDefault();
    shownEntries.forEach((entry, index) => selection.add(index));
    if (anchor < 0 && shownEntries.length) {
        anchor = 0;
    }
    applySelection();
});

/* ---------- Гарячі клавіші вкладок ---------- */
function switchTab(step) {
    const tabs = Array.from(tabsBar.querySelectorAll(".tab"));
    if (tabs.length < 2) {
        return;
    }
    const current = tabs.indexOf(activeTab());
    activateTab(tabs[(current + step + tabs.length) % tabs.length]);
}

document.addEventListener("keydown", event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
    }
    if (event.code === "KeyT" && !event.shiftKey) {
        event.preventDefault();
        addButton.click();
    } else if (event.code === "KeyN" && !event.shiftKey) {
        event.preventDefault();
        api().new_window();
    } else if (event.code === "KeyW" && !event.shiftKey) {
        event.preventDefault();
        const tab = activeTab();
        if (tabsBar.querySelectorAll(".tab").length > 1) {
            closeTab(tab);
        } else {
            api().close();
        }
    } else if (event.code === "Tab") {
        event.preventDefault();
        switchTab(event.shiftKey ? -1 : 1);
    }
});

/* ---------- Навігація стрілками в списку ---------- */
const ARCHIVE_SUFFIXES = [".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".tbz2", ".txz", ".zip", ".tar", ".7z"];

function isArchiveEntry(entry) {
    const name = entry.name.toLowerCase();
    return !entry.is_dir && ARCHIVE_SUFFIXES.some(suffix => name.endsWith(suffix));
}

function readOnlyArchive(state) {
    if (!helpMode && state && state.archive) {
        setNote("Архів доступний лише для перегляду. Скористайтесь «Видобути все»");
        return true;
    }
    return false;
}

async function extractArchives(paths) {
    for (const path of paths) {
        const result = await api().start_extract(path);
        if (result.error) {
            await notify("Не вдалося видобути", result.error);
            return;
        }
        trackJob(result.id, { clearClipboard: false });
    }
}

async function extractSelected(picked) {
    const result = await api().start_extract_selected(picked.map(entry => entry.path));
    if (result.error) {
        await notify("Не вдалося видобути", result.error);
        return;
    }
    trackJob(result.id, { clearClipboard: false });
}

async function openFromArchive(entry) {
    const result = await api().open_from_archive(entry.path);
    if (result && !result.ok) {
        await notify("Не вдалося відкрити", result.error);
    }
}

function groupKind(entries) {
    const current = states.get(activeTab());
    if (entries.length < 2 || (current && (current.path === TRASH || current.archive))) {
        return null;
    }
    if (entries.every(isAudio)) {
        return "audio";
    }
    if (entries.every(isVideo)) {
        return "video";
    }
    if (entries.every(isImage)) {
        return "image";
    }
    return entries.every(isEditable) ? "editor" : null;
}

function openGroup(entries, kind) {
    if (kind === "audio") {
        playFrom(entries, entries[0]);
    } else if (kind === "editor") {
        openAllInEditor(entries);
    } else {
        openViewer(entries, entries[0]);
    }
}

async function openAllInEditor(entries) {
    for (const entry of entries) {
        await openEditor(entry);
    }
    const first = edTabs.find(tab => normalize(tab.path) === normalize(entries[0].path));
    if (first) {
        switchEditorTab(first);
    }
}

function openEntry(entry) {
    const current = states.get(activeTab());
    if (entry.is_dir && current && current.path === TRASH) {
        setNote("Щоб відкрити папку, спершу відновіть її");
    } else if (entry.is_dir) {
        navigate(entry.path);
    } else if (current && current.archive) {
        setNote("Файли в архіві не можна відкрити. Скористайтесь «Видобути все»");
    } else if (isArchiveEntry(entry) && !(current && current.path === TRASH)) {
        openInNewTab(entry.path);
    } else if (isAudio(entry)) {
        playFrom(shownEntries, entry);
    } else if (isImage(entry) || isVideo(entry)) {
        openViewer(shownEntries, entry);
    } else if (isEditable(entry) && !(current && current.path === TRASH)) {
        openEditor(entry);
    } else {
        api().open_path(entry.path);
    }
}

document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.target.matches("input, textarea")) {
        return;
    }
    const total = shownEntries.length;
    if (!total) {
        return;
    }
    if (event.key === "Enter") {
        if (event.target.matches("button")) {
            return;
        }
        const group = pickedEntries();
        const kind = groupKind(group);
        if (kind) {
            event.preventDefault();
            openGroup(group, kind);
            return;
        }
        const entry = shownEntries[cursor >= 0 ? cursor : Array.from(selection)[0]];
        if (entry) {
            event.preventDefault();
            openEntry(entry);
        }
        return;
    }
    let target;
    const step = arrowStep(event.key);
    if (step !== null) {
        target = cursor < 0 ? (step > 0 ? 0 : total - 1) : Math.max(0, Math.min(cursor + step, total - 1));
    } else if (event.key === "Home") {
        target = 0;
    } else if (event.key === "End") {
        target = total - 1;
    } else {
        return;
    }
    event.preventDefault();
    if (event.shiftKey) {
        if (anchor < 0) {
            anchor = cursor >= 0 ? cursor : target;
        }
        selection.clear();
        for (let i = Math.min(anchor, target); i <= Math.max(anchor, target); i += 1) {
            selection.add(i);
        }
    } else {
        selection.clear();
        selection.add(target);
        anchor = target;
    }
    cursor = target;
    applySelection();
    shownRows[target].scrollIntoView({ block: "nearest" });
});

/* ---------- Вигляд: Список / Галерея / Таблиця ---------- */
/* Іконки меню: Font Awesome Free 6.5.2 (CC BY 4.0) */
const VIEW_ICONS = {"list": ["0 0 512 512", ["M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"]], "gallery": ["0 0 512 512", ["M448 96V224H288V96H448zm0 192V416H288V288H448zM224 224H64V96H224V224zM64 288H224V416H64V288zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"]], "table": ["0 0 512 512", ["M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"]], "check": ["0 0 448 512", ["M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"]]};
const VIEW_LABELS = { list: "Список", gallery: "Галерея", table: "Таблиця" };
const CHEVRON = '<svg class="vb-chev" viewBox="0 0 12 12"><path d="M2.5 4.5l3.5 3.5 3.5-3.5"/></svg>';
const viewButton = document.getElementById("btn-view");
const viewMenu = document.getElementById("view-menu");

const TYPE_NAMES = (() => {
    const map = {};
    const add = (label, extensions) => extensions.forEach(ext => { map[ext] = label; });
    add("Документ HTML", ["html", "htm"]);
    add("Каскадна таблиця стилів", ["css"]);
    add("Файл JavaScript", ["js", "mjs"]);
    add("Файл Python", ["py"]);
    add("Файл JSON", ["json"]);
    add("Файл XML", ["xml"]);
    add("Файл Markdown", ["md"]);
    add("Текстовий документ", ["txt"]);
    add("Файл журналу", ["log"]);
    add("Параметри конфігурації", ["ini", "cfg"]);
    add("Файл CSV", ["csv"]);
    add("Документ PDF", ["pdf"]);
    add("Документ Microsoft Word", ["doc", "docx"]);
    add("Аркуш Microsoft Excel", ["xls", "xlsx"]);
    add("Презентація Microsoft PowerPoint", ["ppt", "pptx"]);
    add("Програма", ["exe"]);
    add("Ярлик", ["lnk"]);
    add("Інсталятор Windows", ["msi"]);
    add("Розширення програми", ["dll"]);
    add("Пакетний файл Windows", ["bat", "cmd"]);
    add("Образ диска", ["iso"]);
    add("Піктограма", ["ico"]);
    ["png", "jpg", "jpeg", "jpe", "jfif", "gif", "bmp", "webp", "svg", "tif", "tiff", "heic", "avif"].forEach(ext => {
        map[ext] = "Зображення " + (["jpg", "jpe"].includes(ext) ? "JPEG" : ext.toUpperCase());
    });
    ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma"].forEach(ext => {
        map[ext] = "Аудіофайл " + ext.toUpperCase();
    });
    ["mp4", "mkv", "avi", "mov", "wmv", "webm", "flv"].forEach(ext => {
        map[ext] = "Відеофайл " + ext.toUpperCase();
    });
    ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].forEach(ext => {
        map[ext] = "Архів " + ext.toUpperCase();
    });
    return map;
})();

function typeName(entry) {
    if (entry.is_dir) {
        return /^[A-Za-z]:[\\/]?$/.test(entry.path) ? "Локальний диск" : "Папка з файлами";
    }
    const dot = entry.name.lastIndexOf(".");
    const ext = dot > 0 ? entry.name.slice(dot + 1).toLowerCase() : "";
    if (!ext) {
        return "Файл";
    }
    return TYPE_NAMES[ext] || "Файл «" + ext.toUpperCase() + "»";
}

function makeCell(text, className) {
    const cell = document.createElement("div");
    cell.className = className;
    cell.textContent = text;
    return cell;
}

function galleryColumns() {
    if (!shownRows.length) {
        return 1;
    }
    const top = shownRows[0].offsetTop;
    return Math.max(1, shownRows.filter(row => row.offsetTop === top).length);
}

function arrowStep(key) {
    const steps = {
        table: { ArrowDown: 1, ArrowUp: -1 },
        list: { ArrowDown: 1, ArrowUp: -1 },
        gallery: viewMode === "gallery"
            ? { ArrowRight: 1, ArrowLeft: -1, ArrowDown: galleryColumns(), ArrowUp: -galleryColumns() }
            : {}
    };
    const value = steps[viewMode][key];
    return value === undefined ? null : value;
}

function viewSvg(name, className) {
    const icon = VIEW_ICONS[name];
    return '<svg class="' + className + '" viewBox="' + icon[0] + '">'
        + icon[1].map(d => '<path d="' + d + '"/>').join("") + '</svg>';
}

function updateViewUi() {
    viewButton.innerHTML = viewSvg(viewMode, "vb-icon") + CHEVRON;
    viewButton.title = "Вигляд: " + VIEW_LABELS[viewMode];
    viewMenu.querySelectorAll(".view-item").forEach(item => {
        const active = item.dataset.view === viewMode;
        item.classList.toggle("active", active);
        item.querySelector(".vi").innerHTML = viewSvg(item.dataset.view, "vs");
        item.querySelector(".vc").innerHTML = active ? viewSvg("check", "vs") : "";
    });
}

function setView(mode) {
    viewMenu.hidden = true;
    if (mode === viewMode) {
        return;
    }
    const picked = Array.from(selection).map(index => shownEntries[index] && shownEntries[index].path);
    viewMode = mode;
    try {
        localStorage.setItem("folderion.view", mode);
    } catch (error) {
        // збереження вигляду не критичне
    }
    updateViewUi();
    render();
    let last = -1;
    picked.forEach(path => {
        const index = shownEntries.findIndex(entry => entry.path === path);
        if (index >= 0) {
            selection.add(index);
            last = index;
        }
    });
    if (last >= 0) {
        anchor = last;
        cursor = last;
        shownRows[last].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    applySelection();
}

viewButton.addEventListener("click", () => {
    viewMenu.hidden = !viewMenu.hidden;
    viewButton.blur();
});

viewMenu.addEventListener("click", event => {
    const item = event.target.closest(".view-item");
    if (item) {
        setView(item.dataset.view);
    }
});

document.addEventListener("mousedown", event => {
    if (!viewMenu.hidden && !event.target.closest(".view-wrap")) {
        viewMenu.hidden = true;
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (!viewMenu.hidden) {
            viewMenu.hidden = true;
        } else if (!viewer.hidden && !document.fullscreenElement) {
            closeViewer();
        }
    }
});

updateViewUi();

/* ---------- Довідник ---------- */
const HELP_SECTIONS = [
    {
        title: "Миша",
        rows: [
            [["ЛКМ"], "Виділити елемент."],
            [["Подвійний ЛКМ"], "Відкрити папку чи файл. Музичний файл одразу починає грати у плеєрі, фото чи відео відкривається в панелі перегляду, а текстовий файл у редакторі. Усі інші формати відкриває програма за замовчуванням."],
            [["Утримування ЛКМ"], "Рамка виділення: потягніть мишею, щоб виділити кілька елементів. Біля краю списку він прокручується."],
            [["Ctrl", "ЛКМ"], "Додати елемент до виділення або зняти його."],
            [["Shift", "ЛКМ"], "Виділити діапазон від останнього клікнутого елемента."],
            [["Ctrl", "Shift", "ЛКМ"], "Додати діапазон до поточного виділення."],
            [["Ctrl", "рамка"], "Інвертувати виділення елементів усередині рамки."],
            [["ЛКМ"], "По порожньому місцю: зняти виділення."],
            [["ПКМ"], "По порожньому місцю: контекстне меню з пунктами «Вигляд», «Сортування за», «Групування за» та «Створити» (папка, файл, архів). Меню працює й з клавіатури: ↑ ↓ → ← Enter Esc. Новий елемент одразу переходить у режим перейменування."],
            [["ПКМ по папці"], "Меню папки: відкрити (у цій вкладці, новій вкладці або новому вікні), закріпити на панелі швидкого доступу, стиснути до ZIP, 7z чи TAR, копіювати як шлях, копіювати, вирізати, перейменувати, видалити. Закріплену папку можна відкріпити через ПКМ по ній на панелі зліва."],
            [[ "ПКМ по файлу" ], "Те саме меню, а ще файл можна закріпити на панелі швидкого доступу. Якщо файл можна відкрити кількома способами, є пункт «Відкрити в»: для html це «Браузер» і «Редактор», для py «Python» і «Редактор», для bat, cmd і sh «Запустити» і «Редактор». Закріплені музика відтворюється у вбудованому плеєрі, фото та відео відкриваються у вбудованому перегляді, решта файлів у програмі за замовчуванням. У меню закріпленого файла є «Показати в папці»."]
        ]
    },
    {
        title: "Клавіатура: список файлів",
        rows: [
            [["Ctrl", "A"], "Виділити все в поточній папці."],
            [["↑", "↓"], "Перейти до попереднього чи наступного елемента."],
            [["←", "→"], "У виді «Галерея» рухатися по рядку іконок."],
            [["Shift", "↑ ↓ ← →"], "Розширити виділення."],
            [["Home", "End"], "Перейти до першого чи останнього елемента (з Shift виділяє діапазон)."],
            [["Enter"], "Відкрити виділений елемент."],
            [["Ctrl", "F"], "Перейти до поля пошуку та виділити його вміст. Пошук фільтрує елементи поточної папки."],
            [["Ctrl", "H"], "Показати або сховати приховані та системні файли (те саме, що кнопка «Око»)."],
            [["Ctrl", "G"], "Перемкнути вигляд по колу: Список, Галерея, Таблиця."],
            [["Esc"], "Закрити меню вигляду."]
        ]
    },
    {
        title: "Копіювання, переміщення, перейменування",
        rows: [
            [["Ctrl", "C"], "Скопіювати виділені елементи в буфер."],
            [["Ctrl", "Shift", "C"], "Скопіювати шлях (або шляхи) виділених елементів як текст."],
            [["Ctrl", "X"], "Вирізати виділені елементи. До вставлення вони виглядають напівпрозорими, а після вставлення переміщуються."],
            [["Ctrl", "V"], "Вставити в поточну папку. Якщо елемент з таким іменем уже існує, з’явиться вікно вибору: замінити, залишити обидва, пропустити або (для папок) об’єднати. Галочка застосовує вибір до всіх наступних збігів."],
            [["Ctrl", "Z"], "Скасувати останню дію: вставлення (створені копії буде видалено), переміщення або перейменування. Перед скасуванням копіювання та переміщення з’являється вікно підтвердження. Замінені файли відновити неможливо."],
            [["Delete"], "Видалити виділені елементи до кошика (після підтвердження). Цю дію не скасовує Ctrl+Z, елементи можна відновити зі Смітника FOLDERION (пункт «Смітник» у бічній панелі)."],
            [["Shift", "Delete"], "Остаточно видалити виділені елементи, минаючи кошик. Вікно підтвердження за замовчуванням наводить фокус на «Скасувати»."],
            [["F2"], "Перейменувати виділений елемент прямо в списку. Повторні натискання F2 по черзі вибирають ім’я, весь текст і розширення. Enter зберігає, Esc скасовує."],
            [["Прогрес"], "Кожна операція має власну панель з відсотками, швидкістю, залишком часу та кнопкою скасування. Кілька операцій виконуються по черзі."]
        ]
    },
    {
        title: "Вкладки та вікно",
        rows: [
            [["Ctrl", "T"], "Нова вкладка."],
            [["Ctrl", "N"], "Нове вікно програми."],
            [["Ctrl", "W"], "Закрити вкладку. Остання вкладка закриває вікно."],
            [["Ctrl", "Tab"], "Наступна вкладка."],
            [["Ctrl", "Shift", "Tab"], "Попередня вкладка."],
            [["Win", "←"], "Притиснути вікно до лівої половини екрана."],
            [["Win", "→"], "Притиснути вікно до правої половини екрана."],
            [["Win", "↑"], "Розгорнути вікно на всю робочу область."],
            [["Win", "↓"], "Повернути звичайний розмір, а зі звичайного згорнути."]
        ]
    },
    {
        title: "Навігація та адреса",
        rows: [
            [["◀", "▶"], "Назад і вперед по історії переходів поточної вкладки."],
            [["Alt", "← →"], "Те саме з клавіатури: Alt+← назад, Alt+→ вперед."],
            [["Alt", "↑"], "Піднятися до батьківської папки (як кнопка ▲)."],
            [["▲"], "Піднятися до батьківської папки."],
            [["Адреса"], "Введіть шлях і натисніть Enter. Напис «Цей пк» показує список дисків."],
            [["Пошук"], "Фільтрує елементи поточної папки за частиною назви."],
            [["Вигляд"], "Кнопка праворуч від пошуку: Список, Галерея або Таблиця. Вибір запам'ятовується."],
            [["Око"], "Кнопка праворуч від «Вигляд»: показує або ховає приховані та системні файли й папки. Приховані елементи виглядають напівпрозорими. Вибір запам’ятовується."],
            [["+", "×"], "Нова вкладка та закриття вкладки. Кожна вкладка має власну історію."],
            [["Бічна панель"], "Швидкий перехід до Робочого столу, Завантажень, Документів, Зображень, Музики, Відеозаписів і списку дисків."]
        ]
    },
    {
        title: "Плеєр",
        rows: [
            [["Подвійний ЛКМ"], "По музичному файлу (mp3, wav, flac, ogg, m4a, aac) запускає відтворення. Плейлист це музика поточної папки. Якщо виділити кілька музичних файлів і натиснути «Відкрити» (ПКМ чи Enter), плейлистом стануть лише вони."],
            [["⏮"], "Попередній трек. Якщо поточний грає понад 3 секунди, спочатку перемотує його на початок."],
            [["▶", "⏸"], "Відтворення і пауза."],
            [["⏭"], "Наступний трек. Після завершення треку наступний вмикається сам."],
            [["Повтор"], "Повтор по колу: вимкнено, усі треки, один трек. У режимі одного треку на кнопці з’являється «1». У режимі «усі треки» кнопки «Попередній» і «Наступний» переходять по колу."],
            [["Перемішування"], "Перемішування порядку треків. Поточний трек не переривається. Обрані режими повтору й перемішування запам’ятовуються."],
            [["Повзунок"], "Перемотування. Окремий повзунок і кнопка динаміка керують гучністю та вимкненням звуку."],
            [["×"], "Зупинити музику і скинути плеєр."]
        ]
    },
    {
        title: "Перегляд зображень",
        rows: [
            [["Подвійний ЛКМ"], "По фото (png, jpg, jpeg, jpe, jfif, gif, bmp, webp, svg, ico, avif) відкриває праворуч панель перегляду. Гортати можна фото поточної папки, а якщо виділити кілька фото й натиснути «Відкрити», то лише виділені. Фото інших форматів (tif, tiff, heic) відкриває програма за замовчуванням."],
            [["◀", "▶"], "Попереднє й наступне фото. У списку файлів виділяється те, що зараз показано."],
            [["⛶"], "Показати фото на весь екран і повернутися назад."],
            [["ЛКМ"], "По фото: збільшити до 250% або повернути за розміром панелі."],
            [["Колесо миші"], "Плавне масштабування фото."],
            [["Перетягування"], "Коли фото збільшене, його можна пересувати мишею."],
            [["×", "Esc"], "Закрити панель перегляду."]
        ]
    },
    {
        title: "Перегляд відео",
        rows: [
            [["Подвійний ЛКМ"], "По відеофайлу (mp4, webm) відкриває праворуч панель із відеоплеєром. Гортати можна відео поточної папки, а якщо виділити кілька відео й натиснути «Відкрити», то лише виділені. Коли відео закінчується, вмикається наступне. Відео інших форматів (mkv, avi, mov, wmv, flv) відкриває програма за замовчуванням."],
            [["◀", "▶"], "Попереднє й наступне відео."],
            [["⛶"], "Показати відео на весь екран і повернутися назад. У повноекранному режимі всі кнопки ховаються, якщо кілька секунд не рухати мишею."],
            [["Керування"], "Власні кнопки під відео: пауза, перемотування та звук (у повноекранному режимі ще й гучність). Колесо миші над кнопкою звуку змінює гучність на 5%. Клік по відео ставить паузу, подвійний клік вмикає повний екран, пробіл теж пауза. Під час відео музика в плеєрі ставиться на паузу."],
            [["×", "Esc"], "Закрити панель перегляду."]
        ]
    },
    {
        title: "Рядок стану",
        rows: [
            [["Елементів"], "Кількість елементів у поточній папці, а під час пошуку тих, що знайдено."],
            [["Вибрано"], "Кількість виділених елементів і сумарний розмір виділених файлів."]
        ]
    },
    {
        title: "Редактор файлів",
        rows: [
            [["Двічі ЛКМ"], "По текстовому файлу (txt, html, css, js, json, yaml, yml, md, sql, py, bat, cmd, sh) відкриває редактор. Файли більші за 2 МБ і нетекстові не відкриваються. Якщо виділити кілька таких файлів і натиснути «Відкрити», кожен відкриється в окремій вкладці редактора."],
            [["Редактор"], "Кнопка праворуч у рядку вкладок: зі стрілкою вниз показує редактор замість вмісту папки, зі стрілкою вгору ховає його. Відкриті файли при цьому не закриваються. Перехід в іншу папку теж повертає до вмісту папки."],
            [["Вкладки"], "Кожен файл у своїй вкладці. Крапка біля назви означає незбережені зміни, × або середня кнопка миші закриває вкладку (якщо є зміни, програма спитає, чи зберегти їх)."],
            [["Ctrl", "S"], "Зберегти поточний файл. Кодування (UTF-8, UTF-8 з BOM, UTF-16, Windows-1251) і тип переносу рядків (LF чи CRLF) зберігаються як були."],
            [["Зберегти все"], "З’являється, коли відкрито два чи більше файли. Зберігає всі змінені файли (Ctrl+Shift+S)."],
            [["Око"], "Лише для файлів md: перемикає між текстом і попереднім переглядом з оформленням (заголовки, списки, таблиці, цитати, код, посилання)."],
            [["Tab"], "Вставляє чотири пробіли."],
            [["Захист змін"], "Закрити програму, поки є незбережені файли, не можна: спершу збережіть їх."]
        ]
    },
    {
        title: "Архіви",
        rows: [
            [["Двічі ЛКМ"], "По архіву (zip, tar, tar.gz, tgz, tar.bz2, tbz2, tar.xz, txz, 7z) відкриває його вміст у новій вкладці провідника. Формат 7z потребує бібліотеки py7zr. Усередині архів доступний лише для перегляду: файл відкривається програмою за замовчуванням (спершу він розпаковується в тимчасову папку), а копіювати, перейменовувати чи видаляти вміст не можна."],
            [["ПКМ"], "«Видобути все»: по архіву чи по порожньому місцю всередині відкритого архіву. Розпаковує все в нову папку з назвою архіву поруч із ним, із прогресом і можливістю скасувати. Якщо така папка вже є, до назви додається номер. Нова папка виділяється в списку."]
        ]
    },
    {
        title: "Смітник",
        rows: [
            [["Смітник"], "Пункт у бічній панелі під «Цей пк» відкриває кошик системи просто у FOLDERION. У таблиці видно вихідне розташування, дату видалення, розмір, тип і дату змінення."],
            [["ПКМ"], "По елементу: «Відновити», «Відкрити», «Видалити назавжди». По порожньому місцю: «Відновити все» та «Очистити смітник»."],
            [["Delete"], "Остаточно видалити виділені елементи зі смітника (після підтвердження)."],
            [["Рядок стану"], "Праворуч у смітнику кнопки «Вибрати все», «Відновити вибране», «Відновити все» та «Очистити смітник». Якщо на місці відновлення вже є такий елемент, з’явиться вікно вибору."],
            [["Обмеження"], "У смітнику не можна копіювати, вставляти, перейменувати чи створювати елементи. Папку спершу відновіть, а потім відкривайте."]
        ]
    }
];

const HELP_FEATURES = [
    "Музика грає у вбудованому плеєрі внизу вікна й не зупиняється, поки ви ходите папками. Черга береться з поточної папки, є перемотування та регулювання гучності коліщатком.",
    "Фото й відео відкриваються прямо у вікні провідника, без сторонніх програм: гортання по папці, масштаб коліщатком і перетягування, повний екран, власний відеоплеєр.",
    "На панель швидкого доступу закріплюються не лише папки, а й файли. Закріплена музика, фото та відео відкриваються у вбудованих плеєрі й перегляді, а порядок елементів змінюється перетягуванням.",
    "Вбудований редактор файлів (txt, html, css, js, json, yaml, yml, md, sql, py, bat, cmd, sh) з вкладками, нумерацією рядків і попереднім переглядом для md. Поки є незбережені зміни, провідник не дозволить закрити програму чи вкладку без питання, щоб ви нічого не втратили.",
    "Смітник вбудований у провідник: таблиця з вихідним розташуванням і датою видалення, вибір усього одним кліком, відновлення на початкове місце з вікном вибору при збігу імен.",
    "Кожна довга операція (копіювання, переміщення, стиснення, видалення, відновлення) йде у власній картці з прогресом, швидкістю та часом, що залишився, і її можна скасувати. Інтерфейс при цьому не блокується.",
    "Розумне вікно конфліктів: показує обидва файли поруч з розміром і датою, підписує новіший і старіший, а відповідь можна застосувати до всіх схожих конфліктів.",
    "Ctrl+Z скасовує копіювання, переміщення, перейменування та створення. Перед відкатом копіювання чи переміщення показується, які саме елементи буде змінено.",
    "Групування списку за назвою, розміром, типом або датою («Сьогодні», «Минулого тижня» тощо) разом із сортуванням. Вибір запам’ятовується.",
    "Стиснення до ZIP, 7z і TAR та створення архівів прямо з контекстного меню, без окремих архіваторів для ZIP і TAR.",
    "Власні вкладки з окремою історією, вигляд Список, Галерея чи Таблиця за один Ctrl+G, швидке відкриття папки в новій вкладці чи новому вікні.",
    "Остаточне видалення (Shift+Delete) завжди з підтвердженням, у якому фокус стоїть на «Скасувати», тож випадково не видалити."
];

function helpKeys(keys) {
    return keys.map(key => "<kbd>" + key + "</kbd>").join('<span class="plus">+</span>');
}

function helpHtml() {
    const intro = '<section class="help-card help-intro">'
        + '<div class="help-head"><h2>FOLDERION</h2><div class="help-meta"><span class="help-author">Twilightly</span><span class="help-ver">v1.0</span></div></div>'
        + "<p>Кастомний файловий провідник, написаний на Python (pywebview). Інтерфейс створено на HTML, CSS та JavaScript.</p>"
        + "<ul>" + HELP_FEATURES.map(item => "<li>" + item + "</li>").join("") + "</ul>"
        + "</section>";
    const cards = HELP_SECTIONS.map(section => '<section class="help-card"><h3>' + section.title + "</h3>"
        + section.rows.map(row => '<div class="help-row"><div class="help-keys">' + helpKeys(row[0]) + '</div><div class="help-text">' + row[1] + "</div></div>").join("")
        + "</section>").join("");
    return intro + cards;
}

function showHelp() {
    setEditorView(false);
    const tab = activeTab();
    if (!tab) {
        return;
    }
    const state = states.get(tab);
    state.help = true;
    helpMode = true;
    closeViewer();
    renderToken += 1;
    shownEntries = [];
    shownRows = [];
    selection.clear();
    anchor = -1;
    cursor = -1;
    content.scrollTop = 0;
    content.scrollLeft = 0;
    content.className = "content view-help";
    content.innerHTML = helpHtml();
    addressInput.value = "Довідник";
    setTabLabel(tab, "Довідник");
    document.querySelectorAll(".side-item").forEach(item => {
        item.classList.toggle("active", item.dataset.place === "help");
    });
    updateNavButtons(state);
    updateStatus();
}

/* ---------- Перегляд зображень ---------- */
/* Іконки: Font Awesome Free 6.5.2 (CC BY 4.0) */
const VIEWER_ICONS = {"close": ["0 0 384 512", ["M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"]], "prev": ["0 0 320 512", ["M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"]], "next": ["0 0 320 512", ["M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"]], "plus": ["0 0 512 512", ["M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24V232h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H232V120c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z"]], "expand": ["0 0 448 512", ["M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"]], "compress": ["0 0 448 512", ["M160 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V64zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H96v64c0 17.7 14.3 32 32 32s32-14.3 32-32V352c0-17.7-14.3-32-32-32H32zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V64zM320 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V384h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320z"]], "minus": ["0 0 512 512", ["M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM136 184c-13.3 0-24 10.7-24 24s10.7 24 24 24H280c13.3 0 24-10.7 24-24s-10.7-24-24-24H136z"]]};
const viewer = document.getElementById("viewer");
const vwTitle = document.getElementById("vw-title");
const vwStage = document.getElementById("vw-stage");
const vwImg = document.getElementById("vw-img");
const vwMsg = document.getElementById("vw-msg");
const vwInfo = document.getElementById("vw-info");
const vwPrev = document.getElementById("vw-prev");
const vwNext = document.getElementById("vw-next");
const vwVideo = document.getElementById("vw-video");
const vwFullButton = document.getElementById("vw-full");
const vwFoot = document.getElementById("vw-foot");
const vwBar = document.getElementById("vw-bar");
const vbPlay = document.getElementById("vb-play");
const vbCur = document.getElementById("vb-cur");
const vbDur = document.getElementById("vb-dur");
const vbSeek = document.getElementById("vb-seek");
const vbMute = document.getElementById("vb-mute");
const vbVol = document.getElementById("vb-vol");
const vwClose = document.getElementById("vw-close");

let vwQueue = [];
let vwIndex = -1;
let vwZoom = 1;
let vwX = 0;
let vwY = 0;
let vwDrag = null;
const VW_ZOOM_STEP = 2.5;

function isImage(entry) {
    return !entry.is_dir && PLAY_EXT.image.has(entryExt(entry));
}

function isVideo(entry) {
    return !entry.is_dir && PLAY_EXT.video.has(entryExt(entry));
}

function vwIcon(name) {
    const icon = VIEWER_ICONS[name];
    return '<svg viewBox="' + icon[0] + '">' + icon[1].map(d => '<path d="' + d + '"/>').join("") + "</svg>";
}

function vwApplyTransform(animate) {
    vwImg.style.transition = animate ? "transform 0.15s ease" : "none";
    vwImg.style.transform = "translate(" + vwX + "px, " + vwY + "px) scale(" + vwZoom + ")";
    vwImg.style.cursor = vwZoom > 1 ? (vwDrag && vwDrag.moved ? "grabbing" : "grab") : "zoom-in";
}

function vwClampPan() {
    const maxX = Math.max(0, (vwImg.clientWidth * vwZoom - vwStage.clientWidth) / 2);
    const maxY = Math.max(0, (vwImg.clientHeight * vwZoom - vwStage.clientHeight) / 2);
    vwX = Math.max(-maxX, Math.min(vwX, maxX));
    vwY = Math.max(-maxY, Math.min(vwY, maxY));
}

function vwSetZoom(value) {
    vwZoom = Math.max(1, Math.min(value, 10));
    if (vwZoom === 1) {
        vwX = 0;
        vwY = 0;
    }
    vwClampPan();
    vwApplyTransform(true);
}

async function vwShow() {
    const entry = vwQueue[vwIndex];
    if (!entry) {
        return;
    }
    const video = isVideo(entry);
    vwZoom = 1;
    vwX = 0;
    vwY = 0;
    vwApplyTransform(false);
    vwStage.classList.toggle("is-video", video);
    vwBar.hidden = !video;
    vbCur.textContent = "0:00";
    vbDur.textContent = "0:00";
    vbSeek.value = 0;
    paintRange(vbSeek);
    vwVideo.pause();
    vwVideo.removeAttribute("src");
    vwVideo.load();
    vwVideo.style.visibility = "hidden";
    if (video) {
        audio.pause();
    }
    vwTitle.textContent = entry.name;
    vwTitle.title = entry.name;
    vwInfo.textContent = (vwIndex + 1) + " / " + vwQueue.length;
    vwPrev.disabled = vwIndex <= 0;
    vwNext.disabled = vwIndex >= vwQueue.length - 1;
    vwMsg.hidden = true;
    vwImg.style.visibility = "hidden";

    const position = shownEntries.findIndex(item => item.path === entry.path);
    if (position >= 0 && !helpMode) {
        selection.clear();
        selection.add(position);
        anchor = position;
        cursor = position;
        applySelection();
        shownRows[position].scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    let url = null;
    try {
        url = await api().media_url(entry.path);
    } catch (error) {
        url = null;
    }
    if (vwQueue[vwIndex] !== entry) {
        return;
    }
    if (!url) {
        vwFail();
        return;
    }
    if (video) {
        vwVideo.src = url;
        vwVideo.play().catch(() => {});
    } else {
        vwImg.src = url;
    }
}

function vwFail() {
    vwImg.style.visibility = "hidden";
    vwVideo.style.visibility = "hidden";
    vwMsg.textContent = isVideo(vwQueue[vwIndex] || {}) ? "Не вдалося відтворити це відео" : "Не вдалося показати це зображення";
    vwMsg.hidden = false;
}

function openViewer(entries, entry) {
    setEditorView(false);
    const matches = isVideo(entry) ? isVideo : isImage;
    vwQueue = entries.filter(matches);
    vwIndex = vwQueue.findIndex(item => item.path === entry.path);
    viewer.hidden = false;
    vwShow();
}

function closeViewer() {
    if (viewer.hidden) {
        return;
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    viewer.hidden = true;
    vwVideo.pause();
    vwVideo.removeAttribute("src");
    vwVideo.load();
    vwImg.removeAttribute("src");
    vwQueue = [];
    vwIndex = -1;
    vwDrag = null;
}

function vwStep(delta) {
    const target = vwIndex + delta;
    if (target >= 0 && target < vwQueue.length) {
        vwIndex = target;
        vwShow();
    }
}

vwImg.addEventListener("load", () => {
    vwImg.style.visibility = "visible";
    vwMsg.hidden = true;
    const entry = vwQueue[vwIndex];
    if (entry) {
        vwInfo.textContent = (vwIndex + 1) + " / " + vwQueue.length + "  ·  "
            + vwImg.naturalWidth + " × " + vwImg.naturalHeight + "  ·  " + formatSize(entry.size);
    }
});
function vbUpdatePlay() {
    vbPlay.firstElementChild.innerHTML = vwVideo.paused ? PL_PLAY : PL_PAUSE;
    vbPlay.title = vwVideo.paused ? "Відтворити" : "Пауза";
}

function vbUpdateVolume() {
    vbMute.firstElementChild.innerHTML = vwVideo.muted || vwVideo.volume === 0 ? PL_MUTE : PL_VOL;
}

function vbToggle() {
    if (!vwVideo.getAttribute("src")) {
        return;
    }
    if (vwVideo.paused) {
        vwVideo.play().catch(() => {});
    } else {
        vwVideo.pause();
    }
}

vbPlay.addEventListener("click", vbToggle);
vwVideo.addEventListener("click", vbToggle);
vwVideo.addEventListener("dblclick", vwToggleFullscreen);
vbMute.addEventListener("click", () => {
    vwVideo.muted = !vwVideo.muted;
    vbUpdateVolume();
});
vbSeek.addEventListener("input", () => {
    if (isFinite(vwVideo.duration)) {
        vwVideo.currentTime = vbSeek.value / 1000 * vwVideo.duration;
    }
    paintRange(vbSeek);
});
vbVol.addEventListener("input", () => {
    vwVideo.volume = vbVol.value / 100;
    vwVideo.muted = false;
    paintRange(vbVol);
    vbUpdateVolume();
});

function vbWheel(event) {
    event.preventDefault();
    const level = Math.round(vwVideo.volume * 100) + (event.deltaY < 0 ? 5 : -5);
    const next = Math.max(0, Math.min(100, level));
    vbVol.value = next;
    vwVideo.volume = next / 100;
    vwVideo.muted = false;
    paintRange(vbVol);
    vbUpdateVolume();
}

vbMute.addEventListener("wheel", vbWheel, { passive: false });
vbVol.addEventListener("wheel", vbWheel, { passive: false });
vwVideo.addEventListener("play", vbUpdatePlay);
vwVideo.addEventListener("pause", vbUpdatePlay);
vwVideo.addEventListener("ended", vbUpdatePlay);
vwVideo.addEventListener("ended", () => {
    if (vwIndex < vwQueue.length - 1) {
        vwStep(1);
    }
});
vwVideo.addEventListener("volumechange", vbUpdateVolume);
vwVideo.addEventListener("timeupdate", () => {
    vbCur.textContent = formatTime(vwVideo.currentTime);
    if (isFinite(vwVideo.duration) && vwVideo.duration > 0 && document.activeElement !== vbSeek) {
        vbSeek.value = vwVideo.currentTime / vwVideo.duration * 1000;
        paintRange(vbSeek);
    }
});

document.addEventListener("keydown", event => {
    if (event.code !== "Space" || viewer.hidden || !vwBar || vwBar.hidden) {
        return;
    }
    if (event.target.matches("input[type=text], textarea")) {
        return;
    }
    event.preventDefault();
    vbToggle();
});

vwVideo.addEventListener("loadedmetadata", () => {
    vbDur.textContent = formatTime(vwVideo.duration);
    vwVideo.style.visibility = "visible";
    vwMsg.hidden = true;
    const entry = vwQueue[vwIndex];
    if (entry) {
        vwInfo.textContent = (vwIndex + 1) + " / " + vwQueue.length + "  ·  "
            + vwVideo.videoWidth + " × " + vwVideo.videoHeight + "  ·  " + formatTime(vwVideo.duration) + "  ·  " + formatSize(entry.size);
    }
});
vwVideo.addEventListener("error", () => {
    if (vwVideo.getAttribute("src")) {
        vwFail();
    }
});
audio.addEventListener("play", () => vwVideo.pause());
vwImg.addEventListener("error", () => {
    if (vwImg.getAttribute("src")) {
        vwFail();
    }
});

vwClose.addEventListener("click", closeViewer);
vwPrev.addEventListener("click", () => vwStep(-1));
vwNext.addEventListener("click", () => vwStep(1));

function vwToggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        viewer.requestFullscreen().catch(() => {});
    }
}

vwFullButton.addEventListener("click", vwToggleFullscreen);

let vwIdleTimer = null;

function vwWake() {
    viewer.classList.remove("idle");
    clearTimeout(vwIdleTimer);
    if (document.fullscreenElement === viewer) {
        vwIdleTimer = setTimeout(function hide() {
            if (vwFoot.matches(":hover")) {
                vwIdleTimer = setTimeout(hide, 2500);
            } else {
                viewer.classList.add("idle");
            }
        }, 2500);
    }
}

viewer.addEventListener("mousemove", vwWake);
viewer.addEventListener("mousedown", vwWake);
document.addEventListener("keydown", () => {
    if (document.fullscreenElement === viewer) {
        vwWake();
    }
});

document.addEventListener("fullscreenchange", () => {
    vwWake();
    const on = document.fullscreenElement === viewer;
    vwFullButton.innerHTML = vwIcon(on ? "compress" : "expand");
    vwFullButton.title = on ? "Вийти з повноекранного режиму" : "На весь екран";
    vwFullButton.classList.toggle("active", on);
    vwClampPan();
    vwApplyTransform(false);
});

vwStage.addEventListener("wheel", event => {
    if (isVideo(vwQueue[vwIndex] || {})) {
        return;
    }
    event.preventDefault();
    vwSetZoom(vwZoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2));
}, { passive: false });

vwImg.addEventListener("mousedown", event => {
    if (event.button !== 0) {
        return;
    }
    vwDrag = { sx: event.clientX, sy: event.clientY, ox: vwX, oy: vwY, moved: false };
    event.preventDefault();
});

document.addEventListener("mousemove", event => {
    if (!vwDrag) {
        return;
    }
    const dx = event.clientX - vwDrag.sx;
    const dy = event.clientY - vwDrag.sy;
    if (!vwDrag.moved && Math.hypot(dx, dy) < 4) {
        return;
    }
    vwDrag.moved = true;
    if (vwZoom > 1) {
        vwX = vwDrag.ox + dx;
        vwY = vwDrag.oy + dy;
        vwClampPan();
        vwApplyTransform(false);
    }
});

document.addEventListener("mouseup", () => {
    if (!vwDrag) {
        return;
    }
    const wasClick = !vwDrag.moved;
    vwDrag = null;
    if (wasClick) {
        vwSetZoom(vwZoom > 1 ? 1 : VW_ZOOM_STEP);
    } else {
        vwApplyTransform(false);
    }
});

vwClose.innerHTML = vwIcon("close");
vwPrev.innerHTML = vwIcon("prev");
vwNext.innerHTML = vwIcon("next");
vwFullButton.innerHTML = vwIcon("expand");
vwVideo.volume = vbVol.value / 100;
paintRange(vbSeek);
paintRange(vbVol);
vbUpdatePlay();
vbUpdateVolume();
vwApplyTransform(false);

const modalLayer = document.getElementById("modal-layer");
const jobsBox = document.getElementById("jobs");
const statusNote = document.getElementById("status-note");
const ELEMENT_FORMS = ["елемент", "елементи", "елементів"];
const JOB_POLL = 120;
let noteTimer = null;
let modalQueue = Promise.resolve();

function makeEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function plural(count, forms) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
        return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return forms[1];
    }
    return forms[2];
}

function formatDuration(seconds) {
    const total = Math.max(1, Math.round(seconds));
    if (total < 60) {
        return total + " с";
    }
    if (total < 3600) {
        return Math.floor(total / 60) + " хв " + (total % 60) + " с";
    }
    return Math.floor(total / 3600) + " год " + Math.floor(total % 3600 / 60) + " хв";
}

function setNote(text) {
    statusNote.textContent = text;
    statusNote.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
        statusNote.hidden = true;
    }, 3000);
}

function askModal(options) {
    const result = modalQueue.then(() => new Promise(resolve => mountModal(options, resolve)));
    modalQueue = result;
    return result;
}

function notify(title, text) {
    return askModal({
        title: title,
        text: text,
        buttons: [{ label: "Гаразд", value: "ok", primary: true }],
        cancelValue: "ok"
    });
}

function mountModal(options, resolve) {
    closeContextMenu();
    const box = makeEl("div", "modal" + (options.tone ? " " + options.tone : ""));
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    const head = makeEl("div", "modal-head");
    head.appendChild(makeEl("span", "modal-title", options.title));
    box.appendChild(head);

    const body = makeEl("div", "modal-body");
    if (options.text) {
        body.appendChild(makeEl("p", "modal-text", options.text));
    }
    if (options.content) {
        body.appendChild(options.content);
    }
    let checkbox = null;
    if (options.check) {
        const label = makeEl("label", "modal-check");
        checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        label.append(checkbox, makeEl("span", "modal-check-mark"), makeEl("span", "modal-check-text", options.check));
        body.appendChild(label);
    }
    box.appendChild(body);

    const foot = makeEl("div", "modal-foot");
    let primary = null;
    let focused = null;
    const buttons = options.buttons.map(definition => {
        const button = makeEl("button", "modal-btn" + (definition.kind ? " " + definition.kind : "") + (definition.primary ? " primary" : ""), definition.label);
        button.type = "button";
        button.addEventListener("click", () => finish(definition.value));
        if (definition.primary && !primary) {
            primary = button;
        }
        if (definition.focus) {
            focused = button;
        }
        foot.appendChild(button);
        return button;
    });
    box.appendChild(foot);

    const previous = document.activeElement;
    let closed = false;

    function finish(value) {
        if (closed) {
            return;
        }
        closed = true;
        document.removeEventListener("keydown", onKey, true);
        modalLayer.hidden = true;
        modalLayer.innerHTML = "";
        if (previous && previous.isConnected && typeof previous.focus === "function") {
            previous.focus();
        }
        resolve({ value: value, checked: checkbox ? checkbox.checked : false });
    }

    function onKey(event) {
        const active = document.activeElement;
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(options.cancelValue);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            if (active && active.matches(".modal-btn")) {
                active.click();
            } else if (primary) {
                primary.click();
            }
            return;
        }
        if (event.key === "Tab" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
            const items = Array.from(box.querySelectorAll("button, input"));
            const index = items.indexOf(active);
            const forward = event.key === "Tab" ? !event.shiftKey : event.key === "ArrowRight";
            if (event.key === "Tab" || (active && active.matches(".modal-btn"))) {
                const next = forward ? (index + 1) % items.length : (index <= 0 ? items.length - 1 : index - 1);
                event.preventDefault();
                items[next].focus();
            }
        }
        event.stopPropagation();
    }

    document.addEventListener("keydown", onKey, true);
    modalLayer.innerHTML = "";
    modalLayer.appendChild(box);
    modalLayer.hidden = false;
    (focused || primary || buttons[0]).focus();
}

function conflictSide(label, side, tag) {
    const box = makeEl("div", "cf-side");
    box.appendChild(makeEl("div", "cf-label", label));
    const row = makeEl("div", "cf-item");
    const holder = makeEl("div", "cf-icon");
    holder.innerHTML = iconFor({ name: side.name, path: side.name, is_dir: side.is_dir });
    const info = makeEl("div", "cf-info");
    info.appendChild(makeEl("div", "cf-name", side.name));
    const detail = makeEl("div", "cf-detail", (side.is_dir ? "Папка" : formatSize(side.size)) + (side.modified ? "  ·  " + formatDate(side.modified) : ""));
    if (tag) {
        detail.appendChild(makeEl("span", "cf-tag", tag));
    }
    info.appendChild(detail);
    row.append(holder, info);
    box.appendChild(row);
    return box;
}

function conflictDialog(conflict) {
    const where = "«" + folderLabel(conflict.folder) + "»";
    const content = makeEl("div", "cf");
    let incomingTag = "";
    let existingTag = "";
    if (!conflict.incoming.is_dir && !conflict.existing.is_dir && conflict.incoming.modified && conflict.existing.modified) {
        if (conflict.incoming.modified > conflict.existing.modified) {
            incomingTag = "Новіший";
            existingTag = "Старіший";
        } else if (conflict.incoming.modified < conflict.existing.modified) {
            incomingTag = "Старіший";
            existingTag = "Новіший";
        }
    }
    content.append(
        conflictSide("Вхідний елемент", conflict.incoming, incomingTag),
        conflictSide("Наявний елемент", conflict.existing, existingTag)
    );
    const cancel = { label: "Скасувати операцію", value: "cancel", kind: "danger" };
    if (conflict.kind === "dir") {
        return {
            title: "Папка вже існує",
            text: "У папці " + where + " уже є папка «" + conflict.name + "». Їх можна об’єднати: файли з однаковими іменами буде розглянуто окремо.",
            content: content,
            check: "Застосувати до всіх папок",
            buttons: [
                { label: "Об’єднати", value: "merge", primary: true },
                { label: "Залишити обидві", value: "both" },
                { label: "Пропустити", value: "skip" },
                cancel
            ],
            cancelValue: "cancel"
        };
    }
    if (conflict.kind === "file") {
        content.appendChild(makeEl("div", "modal-note", "Замінений файл не можна буде відновити через Ctrl+Z."));
        return {
            title: "Файл уже існує",
            text: "У папці " + where + " уже є файл з іменем «" + conflict.name + "». Що зробити?",
            content: content,
            check: "Застосувати до всіх файлів",
            buttons: [
                { label: "Замінити", value: "replace", primary: true },
                { label: "Залишити обидва", value: "both" },
                { label: "Пропустити", value: "skip" },
                cancel
            ],
            cancelValue: "cancel"
        };
    }
    return {
        title: "Конфлікт імен",
        text: "У папці " + where + " уже є елемент іншого типу з іменем «" + conflict.name + "». Файл не можна замінити папкою, і навпаки.",
        content: content,
        check: "Застосувати до всіх подібних",
        buttons: [
            { label: "Залишити обидва", value: "both", primary: true },
            { label: "Пропустити", value: "skip" },
            cancel
        ],
        cancelValue: "cancel"
    };
}

function errorDialog(info) {
    const list = makeEl("ul", "err-list");
    info.errors.slice(0, 8).forEach(item => {
        const line = makeEl("li");
        if (item.name) {
            line.appendChild(makeEl("b", "", item.name));
        }
        line.appendChild(makeEl("span", "", (item.name ? " — " : "") + item.error));
        list.appendChild(line);
    });
    if (info.errors.length > 8) {
        list.appendChild(makeEl("li", "", "…і ще " + (info.errors.length - 8)));
    }
    return {
        title: info.errors.length === 1 ? "Не вдалося виконати дію" : "Не всі елементи оброблено",
        text: "Під час операції «" + info.title.toLowerCase() + "» виникли помилки:",
        content: list,
        tone: "error",
        buttons: [{ label: "Гаразд", value: "ok", primary: true }],
        cancelValue: "ok"
    };
}

function createJobCard(id) {
    const root = makeEl("div", "job indeterminate");
    const head = makeEl("div", "job-head");
    const title = makeEl("span", "job-title");
    const cancel = makeEl("button", "job-cancel");
    cancel.type = "button";
    cancel.title = "Скасувати операцію";
    cancel.innerHTML = CLOSE_ICON;
    cancel.addEventListener("click", () => {
        cancel.disabled = true;
        api().job_cancel(id);
    });
    head.append(title, cancel);
    const subject = makeEl("div", "job-subject");
    const route = makeEl("div", "job-route");
    const bar = makeEl("div", "job-bar");
    const fill = makeEl("div", "job-fill");
    bar.appendChild(fill);
    const line = makeEl("div", "job-line");
    const pct = makeEl("span", "job-pct");
    const speed = makeEl("span", "job-speed");
    line.append(pct, speed);
    const file = makeEl("div", "job-file");
    const meta = makeEl("div", "job-meta");
    root.append(head, subject, route, bar, line, file, meta);
    jobsBox.appendChild(root);
    return { root, title, subject, route, fill, pct, speed, file, meta, cancel };
}

function updateJobCard(card, info) {
    const waiting = info.state === "queued" || info.state === "scanning";
    card.root.classList.toggle("indeterminate", waiting);
    card.root.classList.toggle("paused", info.state === "conflict");
    card.title.textContent = info.title;
    card.subject.textContent = info.count === 1 ? "«" + info.first + "»" : info.count + " " + plural(info.count, ELEMENT_FORMS);
    if (info.mode === "restore") {
        card.route.textContent = "до початкового розташування";
    } else if (info.mode === "delete" || info.mode === "trash") {
        card.route.textContent = "";
    } else if (info.mode === "extract") {
        card.route.textContent = "до «" + folderLabel(info.dest) + "»";
    } else {
        card.route.textContent = "з «" + folderLabel(info.source) + "» до «" + folderLabel(info.dest) + "»";
    }
    const fraction = info.total > 0 ? info.done / info.total : (info.files_total > 0 ? info.files_done / info.files_total : 0);
    const clamped = Math.max(0, Math.min(1, fraction));
    card.fill.style.width = (clamped * 100) + "%";
    if (info.state === "queued") {
        card.pct.textContent = "Очікування черги…";
    } else if (info.state === "scanning") {
        card.pct.textContent = "Підготовка…";
    } else {
        card.pct.textContent = Math.floor(clamped * 100) + "%";
    }
    if (info.state === "conflict") {
        card.speed.textContent = "Очікує вашого вибору";
    } else if (info.state === "running" && info.speed > 0 && info.total > 0) {
        const left = Math.max(0, info.total - info.done) / info.speed;
        card.speed.textContent = formatSize(info.speed) + "/с · залишилось " + formatDuration(left);
    } else {
        card.speed.textContent = "";
    }
    card.file.textContent = info.current;
    if (waiting) {
        card.meta.textContent = "";
    } else {
        card.meta.textContent = info.files_done + " з " + info.files_total + " " + plural(info.files_total, ["файлу", "файлів", "файлів"])
            + (info.total > 0 ? " · " + formatSize(info.done) + " з " + formatSize(info.total) : "");
    }
}

function closeJobCard(card, label, full) {
    card.root.classList.remove("indeterminate", "paused");
    card.root.classList.add("finished");
    if (full) {
        card.fill.style.width = "100%";
    }
    card.pct.textContent = label;
    card.speed.textContent = "";
    card.file.textContent = "";
    card.cancel.disabled = true;
    setTimeout(() => {
        card.root.classList.add("leaving");
        setTimeout(() => card.root.remove(), 280);
    }, 1400);
}

async function refreshCurrent(selectPaths) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (!state || state.help || helpMode) {
        return;
    }
    const keep = selectPaths || Array.from(selection).map(index => shownEntries[index] && shownEntries[index].path).filter(Boolean);
    const result = await api().list_dir(state.path, showHidden);
    if (result.error || activeTab() !== tab || helpMode) {
        return;
    }
    state.entries = result.entries;
    state.archive = result.archive || "";
    render();
    const positions = new Map(shownEntries.map((entry, index) => [entry.path, index]));
    let first = -1;
    let last = -1;
    keep.forEach(path => {
        const index = positions.get(path);
        if (index !== undefined) {
            selection.add(index);
            last = index;
            if (first < 0 || index < first) {
                first = index;
            }
        }
    });
    if (last >= 0) {
        anchor = last;
        cursor = last;
        shownRows[first].scrollIntoView({ block: "nearest" });
    }
    applySelection();
}

async function finishJob(card, info, options) {
    const label = info.state === "cancelled" ? "Скасовано" : (info.errors.length ? "Завершено з помилками" : "Готово");
    closeJobCard(card, label, info.state === "done");
    if (options.clearClipboard && info.state === "done" && clipboard.mode === "cut") {
        clipboard = { mode: "", paths: new Set() };
    }
    await refreshCurrent(info.selected.length ? info.selected : undefined);
    if (info.errors.length) {
        await askModal(errorDialog(info));
    }
}

function trackJob(id, options) {
    const card = createJobCard(id);
    let shownConflict = 0;
    let busy = false;
    const timer = setInterval(async () => {
        if (busy) {
            return;
        }
        busy = true;
        try {
            const info = await api().job_status(id);
            if (!info) {
                clearInterval(timer);
                card.root.remove();
                return;
            }
            updateJobCard(card, info);
            if (info.conflict && info.conflict.seq !== shownConflict) {
                shownConflict = info.conflict.seq;
                askModal(conflictDialog(info.conflict)).then(result => api().job_answer(id, result.value, result.checked));
            }
            if (info.finished) {
                clearInterval(timer);
                await finishJob(card, info, options);
            }
        } catch (error) {
            clearInterval(timer);
            card.root.remove();
        } finally {
            busy = false;
        }
    }, JOB_POLL);
}

function pickedEntries() {
    return Array.from(selection).sort((a, b) => a - b).map(index => shownEntries[index]).filter(Boolean);
}

function applyCutMarks() {
    shownRows.forEach((row, index) => {
        const entry = shownEntries[index];
        row.classList.toggle("cut", clipboard.mode === "cut" && Boolean(entry) && clipboard.paths.has(entry.path));
    });
}

function copySelection(mode) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || !state || !state.path || state.path === TRASH) {
        return;
    }
    const picked = pickedEntries();
    if (!picked.length) {
        return;
    }
    clipboard = { mode: mode, paths: new Set(picked.map(entry => entry.path)) };
    applyCutMarks();
    setNote((mode === "cut" ? "Вирізано: " : "Скопійовано: ") + picked.length + " " + plural(picked.length, ELEMENT_FORMS));
}

async function pasteClipboard() {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || !state || !clipboard.paths.size) {
        return;
    }
    if (!state.path) {
        await notify("Вставлення неможливе", "У списку дисків вставляти не можна. Відкрийте диск або папку.");
        return;
    }
    if (state.path === TRASH) {
        await notify("Вставлення неможливе", "До смітника вставляти не можна. Щоб видалити елементи, виділіть їх і натисніть Delete.");
        return;
    }
    const mode = clipboard.mode === "cut" ? "move" : "copy";
    const result = await api().start_transfer(mode, Array.from(clipboard.paths), state.path);
    if (result.error) {
        await notify("Не вдалося почати", result.error);
        return;
    }
    trackJob(result.id, { clearClipboard: mode === "move" });
}

async function runUndo() {
    const result = await api().undo_start();
    if (result.error) {
        await notify("Не вдалося скасувати", result.error);
        return;
    }
    if (result.immediate) {
        await refreshCurrent(result.path ? [result.path] : []);
        setNote(result.note || "Скасовано");
        return;
    }
    trackJob(result.id, { clearClipboard: false });
}

async function undoLast() {
    if (helpMode) {
        return;
    }
    const info = await api().undo_peek();
    if (!info) {
        setNote("Немає дій для скасування");
        return;
    }
    if (info.kind === "rename" || info.kind === "create") {
        await runUndo();
        return;
    }
    const names = info.names.map(name => "«" + name + "»").join(", ") + (info.count > info.names.length ? " та ще " + (info.count - info.names.length) : "");
    const noun = info.count + " " + plural(info.count, ELEMENT_FORMS);
    let options;
    if (info.kind === "copy") {
        options = {
            title: "Скасувати копіювання?",
            text: "Створені копії (" + noun + ": " + names + ") буде остаточно видалено."
                + (info.replaced ? " Елементи, які були замінені під час вставлення (" + info.replaced + "), залишаться без змін: їх відновити неможливо." : ""),
            tone: "error",
            buttons: [
                { label: "Видалити копії", value: "yes", kind: "danger", primary: true },
                { label: "Залишити", value: "no" }
            ],
            cancelValue: "no"
        };
    } else {
        options = {
            title: "Скасувати переміщення?",
            text: "Елементи (" + noun + ": " + names + ") повернуться до початкових папок.",
            buttons: [
                { label: "Повернути", value: "yes", primary: true },
                { label: "Залишити", value: "no" }
            ],
            cancelValue: "no"
        };
    }
    const answer = await askModal(options);
    if (answer.value === "yes") {
        await runUndo();
    }
}

async function deleteSelection(permanent) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || renaming || !state || !state.path) {
        return;
    }
    const picked = pickedEntries();
    if (!picked.length) {
        return;
    }
    if (state.path === TRASH) {
        await purgeEntries(picked);
        return;
    }
    const count = picked.length;
    const noun = count + " " + plural(count, ELEMENT_FORMS);
    const names = picked.slice(0, 5).map(entry => "«" + entry.name + "»").join(", ") + (count > 5 ? " та ще " + (count - 5) : "");
    const subject = count === 1 ? "«" + picked[0].name + "»" : noun + " (" + names + ")";
    let options;
    if (permanent) {
        options = {
            title: "Остаточно видалити?",
            text: "Буде остаточно видалено " + subject + ". Це неможливо скасувати, елементи не потраплять до кошика.",
            tone: "error",
            buttons: [
                { label: "Видалити назавжди", value: "yes", kind: "danger" },
                { label: "Скасувати", value: "no", primary: true, focus: true }
            ],
            cancelValue: "no"
        };
    } else {
        options = {
            title: "Видалити до кошика?",
            text: "Перемістити до кошика " + subject + "?" + (picked.some(entry => entry.is_dir) ? " Папки буде видалено разом з усім вмістом." : ""),
            buttons: [
                { label: "Видалити", value: "yes", kind: "danger", primary: true },
                { label: "Скасувати", value: "no" }
            ],
            cancelValue: "no"
        };
    }
    const answer = await askModal(options);
    if (answer.value !== "yes") {
        return;
    }
    const result = await api().start_delete(picked.map(entry => entry.path), permanent);
    if (result.error) {
        await notify("Не вдалося видалити", result.error);
        return;
    }
    trackJob(result.id, { clearClipboard: false });
}

function nameProblem(name) {
    if (!name) {
        return "Ім’я не може бути порожнім.";
    }
    if (name.length > 255) {
        return "Ім’я занадто довге (максимум 255 символів).";
    }
    if (/^\.+$/.test(name)) {
        return "Ім’я не може складатися лише з крапок.";
    }
    if (/[\\/:*?"<>|\u0000-\u001f]/.test(name)) {
        return "Ім’я не може містити жодного з символів: \\ / : * ? \" < > |";
    }
    if (/[. ]$/.test(name)) {
        return "Ім’я не може закінчуватися крапкою чи пробілом.";
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(name)) {
        return "Ім’я «" + name + "» зарезервоване системою.";
    }
    return "";
}

function extensionOf(name) {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

function finishRename(session) {
    if (renaming === session) {
        renaming = null;
    }
    session.row.classList.remove("renaming");
    if (session.input.isConnected) {
        session.input.replaceWith(session.label);
    }
}

function resumeRename(session) {
    session.busy = false;
    if (renaming === session && session.input.isConnected) {
        session.input.focus();
    }
}

async function commitRename(save) {
    const session = renaming;
    if (!session || session.busy) {
        return;
    }
    const entry = session.entry;
    const value = session.input.value.trim();
    if (!save || value === entry.name) {
        finishRename(session);
        return;
    }
    session.busy = true;
    const problem = nameProblem(value);
    if (problem) {
        await notify("Некоректне ім’я", problem);
        resumeRename(session);
        return;
    }
    if (!entry.is_dir && !session.fresh && extensionOf(value) !== extensionOf(entry.name)) {
        const answer = await askModal({
            title: "Змінити розширення?",
            text: "Розширення файлу буде змінено: " + (extensionOf(entry.name) || "немає") + " → " + (extensionOf(value) || "немає")
                + ". Після цього файл може не відкриватися програмою за замовчуванням.",
            buttons: [
                { label: "Змінити", value: "yes", primary: true },
                { label: "Не змінювати", value: "no" }
            ],
            cancelValue: "no"
        });
        if (answer.value !== "yes") {
            resumeRename(session);
            return;
        }
    }
    const result = await api().rename(entry.path, value);
    if (!result.ok) {
        await notify("Не вдалося перейменувати", result.error);
        resumeRename(session);
        return;
    }
    const keep = Array.from(selection)
        .map(index => shownEntries[index] && shownEntries[index].path)
        .filter(Boolean)
        .map(path => path === entry.path ? result.path : path);
    finishRename(session);
    if (playingPath === entry.path) {
        playingPath = result.path;
    }
    queue.forEach(item => {
        if (item.path === entry.path) {
            item.path = result.path;
            item.name = value;
        }
    });
    await refreshCurrent(keep);
}

function startRename(options) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || renaming || !state || !state.path || state.path === TRASH) {
        return;
    }
    const index = cursor >= 0 && selection.has(cursor) ? cursor : Array.from(selection)[0];
    const entry = shownEntries[index];
    const row = shownRows[index];
    if (!entry || !row) {
        return;
    }
    const label = row.querySelector(".file-name span");
    if (!label) {
        return;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.className = "rename-input";
    input.value = entry.name;
    input.spellcheck = false;
    input.autocomplete = "off";
    label.replaceWith(input);
    row.classList.add("renaming");
    row.scrollIntoView({ block: "nearest" });
    const session = { entry: entry, row: row, input: input, label: label, busy: false, fresh: Boolean(options && options.fresh) };
    renaming = session;
    const dot = entry.is_dir ? -1 : entry.name.lastIndexOf(".");
    input.focus();
    input.setSelectionRange(0, dot > 0 ? dot : entry.name.length);
    let phase = 0;

    input.addEventListener("keydown", event => {
        event.stopPropagation();
        if (event.key === "Enter") {
            event.preventDefault();
            commitRename(true);
        } else if (event.key === "Escape") {
            event.preventDefault();
            commitRename(false);
        } else if (event.key === "F2") {
            event.preventDefault();
            phase = (phase + 1) % 3;
            const text = input.value;
            const currentDot = text.lastIndexOf(".");
            if (phase === 0) {
                input.setSelectionRange(0, currentDot > 0 ? currentDot : text.length);
            } else if (phase === 1) {
                input.setSelectionRange(0, text.length);
            } else if (currentDot > 0) {
                input.setSelectionRange(currentDot + 1, text.length);
            } else {
                input.setSelectionRange(0, text.length);
            }
        }
    });
    input.addEventListener("input", () => {
        const message = nameProblem(input.value.trim());
        input.classList.toggle("invalid", Boolean(message));
        input.title = message;
    });
    input.addEventListener("blur", () => commitRename(true));
    input.addEventListener("dblclick", event => event.stopPropagation());
    input.addEventListener("mousedown", event => event.stopPropagation());
}

document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyF" && !document.fullscreenElement) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp") && !document.fullscreenElement && !renaming) {
        event.preventDefault();
        const targets = { ArrowLeft: backButton, ArrowRight: forwardButton, ArrowUp: upButton };
        targets[event.key].click();
        return;
    }
    if (event.target.matches("input[type=text], textarea") || document.fullscreenElement) {
        return;
    }
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.shiftKey && !event.altKey && event.code === "KeyC") {
        event.preventDefault();
        const pickedForPath = helpMode ? [] : pickedEntries();
        if (pickedForPath.length) {
            copyPaths(pickedForPath);
        }
        return;
    }
    if (ctrl && !event.altKey && !event.shiftKey) {
        if (event.code === "KeyC") {
            event.preventDefault();
            copySelection("copy");
        } else if (event.code === "KeyX") {
            event.preventDefault();
            copySelection("cut");
        } else if (event.code === "KeyV") {
            event.preventDefault();
            pasteClipboard();
        } else if (event.code === "KeyZ") {
            event.preventDefault();
            undoLast();
        } else if (event.code === "KeyH") {
            event.preventDefault();
            toggleHidden();
        } else if (event.code === "KeyG") {
            event.preventDefault();
            cycleView();
        }
    } else if (event.code === "Delete" && !ctrl && !event.altKey) {
        event.preventDefault();
        deleteSelection(event.shiftKey);
    } else if (event.code === "F2" && !ctrl && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        startRename();
    }
});

const hiddenButton = document.getElementById("btn-hidden");
const EYE_OPEN = '<svg viewBox="0 0 12 12"><path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z"/><circle cx="6" cy="6" r="1.5"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 12 12"><path d="M1 6s2-3.5 5-3.5S11 6 11 6s-2 3.5-5 3.5S1 6 1 6z"/><circle cx="6" cy="6" r="1.5"/><path d="M2 10.5L10 1.5"/></svg>';

function updateHiddenUi() {
    hiddenButton.innerHTML = showHidden ? EYE_OPEN : EYE_OFF;
    hiddenButton.title = showHidden ? "Приховані файли: показано" : "Приховані файли: сховано";
    hiddenButton.classList.toggle("active", showHidden);
}

function toggleHidden() {
    showHidden = !showHidden;
    try {
        localStorage.setItem("folderion.hidden", showHidden ? "1" : "0");
    } catch (error) {
        showHidden = Boolean(showHidden);
    }
    updateHiddenUi();
    hiddenButton.blur();
    refreshCurrent();
    setNote(showHidden ? "Приховані файли показано" : "Приховані файли сховано");
}

function cycleView() {
    const order = ["list", "gallery", "table"];
    const next = order[(order.indexOf(viewMode) + 1) % order.length];
    setView(next);
    setNote("Вигляд: " + VIEW_LABELS[next]);
}

hiddenButton.addEventListener("click", toggleHidden);

updateHiddenUi();

const SORT_OPTIONS = [["name", "Назвою"], ["size", "Розміром"], ["type", "Типом"], ["date", "Датою змінення"]];
const arrangeCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function compareBy(key, a, b) {
    let result = 0;
    if (key === "size") {
        result = a.size - b.size;
    } else if (key === "type") {
        result = arrangeCollator.compare(typeName(a), typeName(b));
    } else if (key === "date") {
        result = (a.modified || 0) - (b.modified || 0);
    }
    return result || arrangeCollator.compare(a.name, b.name);
}

function compareOrder(a, b) {
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }
    return arrangeCollator.compare(String(a), String(b));
}

function dateBucket(timestamp) {
    if (!timestamp) {
        return { label: "Невідомо", order: -1 };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = 86400000;
    const weekStart = today - ((now.getDay() + 6) % 7) * day;
    const bounds = [
        [today, 7, "Сьогодні"],
        [today - day, 6, "Вчора"],
        [weekStart, 5, "Раніше цього тижня"],
        [weekStart - 7 * day, 4, "Минулого тижня"],
        [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), 3, "Раніше цього місяця"],
        [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), 2, "Минулого місяця"],
        [new Date(now.getFullYear(), 0, 1).getTime(), 1, "Раніше цього року"]
    ];
    const time = timestamp * 1000;
    const hit = bounds.find(item => time >= item[0]);
    return hit ? { label: hit[2], order: hit[1] } : { label: "Давно", order: 0 };
}

function groupInfo(key, entry) {
    if (key === "name") {
        const first = entry.name.charAt(0);
        if (/\p{L}/u.test(first)) {
            return { label: first.toUpperCase(), order: "2" + first.toUpperCase() };
        }
        if (/\d/.test(first)) {
            return { label: "0–9", order: "1" };
        }
        return { label: "#", order: "0" };
    }
    if (key === "size") {
        if (entry.is_dir) {
            return { label: "Папки", order: 0 };
        }
        const kb = 1024;
        const mb = kb * 1024;
        const gb = mb * 1024;
        if (entry.size === 0) {
            return { label: "Порожні", order: 1 };
        }
        if (entry.size <= 16 * kb) {
            return { label: "Крихітні (до 16 КБ)", order: 2 };
        }
        if (entry.size <= mb) {
            return { label: "Малі (до 1 МБ)", order: 3 };
        }
        if (entry.size <= 128 * mb) {
            return { label: "Середні (до 128 МБ)", order: 4 };
        }
        if (entry.size <= gb) {
            return { label: "Великі (до 1 ГБ)", order: 5 };
        }
        return { label: "Величезні (понад 1 ГБ)", order: 6 };
    }
    if (key === "type") {
        const label = typeName(entry);
        return { label: label, order: label };
    }
    return dateBucket(entry.modified);
}

function arrangeEntries(list) {
    const sign = sortAsc ? 1 : -1;
    const sorted = list.slice().sort((a, b) => {
        if (a.is_dir !== b.is_dir) {
            return a.is_dir ? -1 : 1;
        }
        return sign * compareBy(sortKey, a, b);
    });
    if (groupKey === "none") {
        return { list: sorted, headers: new Map() };
    }
    const groups = new Map();
    sorted.forEach(entry => {
        const info = groupInfo(groupKey, entry);
        if (!groups.has(info.label)) {
            groups.set(info.label, { label: info.label, order: info.order, items: [] });
        }
        groups.get(info.label).items.push(entry);
    });
    const ordered = Array.from(groups.values()).sort((a, b) => sign * compareOrder(a.order, b.order));
    const result = [];
    const headers = new Map();
    ordered.forEach(group => {
        headers.set(result.length, { label: group.label, count: group.items.length });
        result.push(...group.items);
    });
    return { list: result, headers: headers };
}

function groupHeader(info) {
    const head = makeEl("div", "group-head");
    head.append(makeEl("span", "group-name", info.label), makeEl("span", "group-count", String(info.count)));
    return head;
}

function selectPaths(paths) {
    const positions = new Map(shownEntries.map((entry, index) => [entry.path, index]));
    let first = -1;
    let last = -1;
    paths.forEach(path => {
        const index = positions.get(path);
        if (index !== undefined) {
            selection.add(index);
            last = index;
            if (first < 0 || index < first) {
                first = index;
            }
        }
    });
    if (last >= 0) {
        anchor = last;
        cursor = last;
        shownRows[first].scrollIntoView({ block: "nearest" });
    }
    applySelection();
}

function applyArrangement() {
    try {
        localStorage.setItem("folderion.arrange", JSON.stringify({ sort: sortKey, asc: sortAsc, group: groupKey }));
    } catch (error) {
        sortAsc = Boolean(sortAsc);
    }
    const keep = Array.from(selection).map(index => shownEntries[index] && shownEntries[index].path).filter(Boolean);
    render();
    selectPaths(keep);
}

const mainEl = document.querySelector("main");
const CTX_ICONS = {
    open: "M6.5 3H3.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H12a1 1 0 0 0 1-1V9.5M9 2.5h4.5V7M13.5 2.5l-6 6",
    openIn: "M2.5 3.5h11v9h-11zM2.5 6.5h11M6 10h3.5M8.3 8.4l1.7 1.6-1.7 1.6",
    browser: "M2.5 8a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0M2.5 8h11M8 2.5c-2 1.5-2.5 3.3-2.5 5.5s.5 4 2.5 5.5c2-1.5 2.5-3.3 2.5-5.5S10 4 8 2.5z",
    editor: "M9.5 3.5l3 3L6 13H3v-3zM8 5l3 3",
    python: "M2.5 3.5h11v9h-11zM5 6.5l2 1.5-2 1.5M8.5 10H11",
    run: "M5 3.5v9l7.5-4.5z",
    newTab: "M2.5 3.5h11v9h-11zM2.5 6h11M8 7.8v3.4M6.3 9.5h3.4",
    newWindow: "M5.5 5.5h8v7h-8zM5.5 8h8M3.5 10.5v-7h7",
    pin: "M9.5 2.5l4 4M10.5 3.5L6 8H4l4 4v-2l4.5-4.5M5.5 10.5l-3 3",
    unpin: "M9.5 2.5l4 4M10.5 3.5L6 8H4l4 4v-2l4.5-4.5M5.5 10.5l-3 3M2.5 2.5l11 11",
    compress: "M2.5 3.5h11v3h-11zM3.5 6.5v6h9v-6M6.5 9h3",
    link: "M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1",
    copy: "M5.5 5.5h7v8h-7zM3.5 10.5v-8h7",
    cut: "M3 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M3 11.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M5.8 5.3L13 12M5.8 10.7L13 4",
    rename: "M2.5 5h11v6h-11zM8 6.5v3",
    trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M7 7v4M9 7v4",
    folder: "M2.5 4.5h4l1 1.5h6v6.5h-11z",
    restore: "M4 6.5h5.5a3 3 0 0 1 0 6H6M6.5 3.5l-3 3 3 3",
    eye: "M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM6 8a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    sort: "M5 13V3M2.5 5.5L5 3l2.5 2.5M11 3v10M8.5 10.5L11 13l2.5-2.5",
    group: "M2.5 3.5h4v3h-4zM2.5 9.5h4v3h-4zM8.5 5h5M8.5 11h5",
    plus: "M8 3v10M3 8h10",
    extract: "M2.5 4.5h4l1 1.5h6v6.5h-11zM8 7.5v3.5M6.3 9.6L8 11.3l1.7-1.7"
};

function ctxIcon(name) {
    return '<svg class="ctx-ico" viewBox="0 0 16 16"><path d="' + CTX_ICONS[name] + '"/></svg>';
}

const CTX_ARROW = '<svg class="ctx-arrow" viewBox="0 0 12 12"><path d="M4.5 2l4 4-4 4"/></svg>';
let ctxMenu = null;

function setSort(key) {
    sortKey = key;
    applyArrangement();
}

function setSortDirection(ascending) {
    sortAsc = ascending;
    applyArrangement();
}

function setGroup(key) {
    groupKey = key;
    applyArrangement();
}

async function createItem(kind) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || renaming || !state || !state.path || state.path === TRASH) {
        return;
    }
    const result = await api().create_item(state.path, kind);
    if (!result.ok) {
        await notify("Не вдалося створити", result.error);
        return;
    }
    searchInput.value = "";
    await refreshCurrent([result.path]);
    startRename({ fresh: true });
}

function contextItems(state) {
    if (state.archive) {
        return [{ label: "Видобути все", icon: ctxIcon("extract"), action: () => extractArchives([state.archive]) }];
    }
    const views = [["list", "Список"], ["gallery", "Галерея"], ["table", "Таблиця"]];
    const items = [
        {
            label: "Вигляд",
            icon: ctxIcon("eye"),
            submenu: views.map(([mode, label]) => ({ label: label, icon: viewSvg(mode, "ctx-fa"), check: viewMode === mode, action: () => setView(mode) }))
        },
        {
            label: "Сортування за",
            icon: ctxIcon("sort"),
            submenu: SORT_OPTIONS.map(([key, label]) => ({ label: label, check: sortKey === key, action: () => setSort(key) })).concat([
                { separator: true },
                { label: "За зростанням", check: sortAsc, action: () => setSortDirection(true) },
                { label: "За спаданням", check: !sortAsc, action: () => setSortDirection(false) }
            ])
        },
        {
            label: "Групування за",
            icon: ctxIcon("group"),
            submenu: [{ label: "Без групування", check: groupKey === "none", action: () => setGroup("none") }, { separator: true }].concat(
                SORT_OPTIONS.map(([key, label]) => ({ label: label, check: groupKey === key, action: () => setGroup(key) }))
            )
        },
        {
            label: "Створити",
            icon: ctxIcon("plus"),
            disabled: !state.path || state.path === TRASH || Boolean(state.archive),
            submenu: [
                { label: "Папка", icon: folderIcon(), action: () => createItem("folder") },
                { label: "Файл", icon: fileIcon("generic"), action: () => createItem("file") },
                { label: "Архів (стиснута папка)", icon: fileIcon("archive"), action: () => createItem("archive") }
            ]
        }
    ];
    return items;
}

function ctxSetHot(menu, row) {
    menu.querySelectorAll(":scope > .ctx-item.hot").forEach(node => node.classList.remove("hot"));
    if (row) {
        row.classList.add("hot");
    }
}

function ctxFocusable(menu) {
    return Array.from(menu.children).filter(node => node.classList.contains("ctx-item") && !node.classList.contains("disabled"));
}

function ctxCloseSiblings(row) {
    Array.from(row.parentElement.children).forEach(node => {
        if (node !== row) {
            node.classList.remove("open");
        }
    });
}

function ctxPlaceSub(row) {
    const sub = row.querySelector(":scope > .ctx-menu");
    const bounds = mainEl.getBoundingClientRect();
    sub.style.left = "calc(100% + 12px)";
    sub.style.right = "auto";
    sub.style.top = "-6px";
    let box = sub.getBoundingClientRect();
    if (box.right > bounds.right - 4) {
        sub.style.left = "auto";
        sub.style.right = "calc(100% + 12px)";
    }
    box = sub.getBoundingClientRect();
    if (box.bottom > bounds.bottom - 4) {
        sub.style.top = (-6 - (box.bottom - bounds.bottom + 4)) + "px";
    }
}

function ctxOpenSub(row) {
    row.classList.add("open");
    ctxPlaceSub(row);
}

function ctxBuild(items) {
    const menu = makeEl("div", "ctx-menu");
    items.forEach(item => {
        if (item.separator) {
            menu.appendChild(makeEl("div", "ctx-sep"));
            return;
        }
        const row = makeEl("div", "ctx-item" + (item.disabled ? " disabled" : "") + (item.submenu ? " has-sub" : ""));
        const mark = makeEl("span", "ctx-mark");
        if (item.icon) {
            mark.innerHTML = item.icon;
        } else if (item.check) {
            mark.innerHTML = viewSvg("check", "ctx-tick");
        }
        row.append(mark, makeEl("span", "ctx-label", item.label));
        if (item.icon && item.check) {
            const tick = makeEl("span", "ctx-check");
            tick.innerHTML = viewSvg("check", "ctx-tick");
            row.appendChild(tick);
        }
        if (item.hint) {
            row.appendChild(makeEl("span", "ctx-hint", item.hint));
        }
        if (item.submenu) {
            row.insertAdjacentHTML("beforeend", CTX_ARROW);
            row.appendChild(ctxBuild(item.submenu));
        }
        row.addEventListener("mouseenter", () => {
            ctxSetHot(menu, row);
            ctxCloseSiblings(row);
            if (item.submenu && !item.disabled) {
                ctxOpenSub(row);
            }
        });
        row.addEventListener("click", event => {
            event.stopPropagation();
            if (item.disabled) {
                return;
            }
            if (item.submenu) {
                ctxOpenSub(row);
                return;
            }
            closeContextMenu();
            item.action();
        });
        menu.appendChild(row);
    });
    return menu;
}

function closeContextMenu() {
    if (ctxMenu) {
        ctxMenu.remove();
        ctxMenu = null;
    }
}

function openContextMenu(x, y, items) {
    closeContextMenu();
    ctxMenu = ctxBuild(items);
    mainEl.appendChild(ctxMenu);
    const bounds = mainEl.getBoundingClientRect();
    const left = Math.max(4, Math.min(x - bounds.left, bounds.width - ctxMenu.offsetWidth - 4));
    const top = Math.max(4, Math.min(y - bounds.top, bounds.height - ctxMenu.offsetHeight - 4));
    ctxMenu.style.left = left + "px";
    ctxMenu.style.top = top + "px";
}

function ctxDeepest() {
    let menu = ctxMenu;
    for (;;) {
        const open = menu.querySelector(":scope > .ctx-item.open > .ctx-menu");
        if (!open) {
            return menu;
        }
        menu = open;
    }
}

function ctxEnterSub(row) {
    ctxOpenSub(row);
    const sub = row.querySelector(":scope > .ctx-menu");
    ctxSetHot(sub, ctxFocusable(sub)[0]);
}

function ctxKey(event) {
    if (!ctxMenu) {
        return;
    }
    const key = event.key;
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) {
        return;
    }
    const menu = ctxDeepest();
    const rows = ctxFocusable(menu);
    const current = rows.findIndex(row => row.classList.contains("hot"));
    if (key === "Escape") {
        closeContextMenu();
    } else if (key === "ArrowDown" || key === "ArrowUp") {
        const step = key === "ArrowDown" ? 1 : -1;
        const next = current < 0 ? (step > 0 ? 0 : rows.length - 1) : (current + step + rows.length) % rows.length;
        ctxSetHot(menu, rows[next]);
    } else if (key === "ArrowRight") {
        if (rows[current] && rows[current].classList.contains("has-sub")) {
            ctxEnterSub(rows[current]);
        }
    } else if (key === "ArrowLeft") {
        if (menu !== ctxMenu) {
            const parentRow = menu.parentElement;
            parentRow.classList.remove("open");
            ctxSetHot(parentRow.parentElement, parentRow);
        }
    } else if (key === "Enter" || key === " ") {
        const row = rows[current];
        if (row && row.classList.contains("has-sub")) {
            ctxEnterSub(row);
        } else if (row) {
            row.click();
        }
    } else {
        closeContextMenu();
        return;
    }
    event.preventDefault();
    event.stopPropagation();
}

document.addEventListener("keydown", ctxKey, true);
document.addEventListener("mousedown", event => {
    if (ctxMenu && !event.target.closest(".ctx-menu")) {
        closeContextMenu();
    }
}, true);
window.addEventListener("blur", closeContextMenu);
window.addEventListener("resize", closeContextMenu);

content.addEventListener("contextmenu", event => {
    if (event.target.closest("input[type=text]")) {
        return;
    }
    event.preventDefault();
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (helpMode || !state || renaming) {
        return;
    }
    const row = event.target.closest(".file-row");
    if (row) {
        const index = Number(row.dataset.index);
        const entry = shownEntries[index];
        if (!entry) {
            return;
        }
        if (!selection.has(index)) {
            selection.clear();
            selection.add(index);
            anchor = index;
            cursor = index;
            applySelection();
        }
        openContextMenu(event.clientX, event.clientY, state.path === TRASH ? trashMenuItems(pickedEntries()) : folderMenuItems(state, pickedEntries()));
        return;
    }
    if (!event.ctrlKey && !event.shiftKey && selection.size) {
        selection.clear();
        applySelection();
    }
    openContextMenu(event.clientX, event.clientY, state.path === TRASH ? trashBackgroundItems(state) : contextItems(state));
});

content.addEventListener("mousedown", event => {
    if (event.button === 1 && event.target.closest(".file-row")) {
        event.preventDefault();
    }
});

content.addEventListener("auxclick", event => {
    if (event.button !== 1 || helpMode) {
        return;
    }
    const row = event.target.closest(".file-row");
    const state = states.get(activeTab());
    const entry = row && shownEntries[Number(row.dataset.index)];
    if (!entry || !entry.is_dir || !state || state.path === TRASH) {
        return;
    }
    event.preventDefault();
    if (event.shiftKey) {
        api().new_window(entry.path);
    } else {
        openInNewTab(entry.path);
    }
});

document.addEventListener("contextmenu", event => {
    if (!event.target.closest("input[type=text], textarea")) {
        event.preventDefault();
    }
});

let pinnedPaths = [];
try {
    const savedPinned = JSON.parse(localStorage.getItem("folderion.pinned") || "[]");
    if (Array.isArray(savedPinned)) {
        pinnedPaths = savedPinned.filter(item => typeof item === "string" && item);
    }
} catch (error) {
    pinnedPaths = [];
}

function isPinned(path) {
    return pinnedPaths.some(item => normalize(item) === normalize(path));
}

function pinEntry(path) {
    return { name: folderLabel(path), path: path, is_dir: false, size: 0, modified: null };
}

function openPinnedFile(path) {
    const entry = pinEntry(path);
    const files = pinnedPaths.filter(item => pinKind.get(item) === "file").map(pinEntry);
    if (isAudio(entry)) {
        playFrom(files, entry);
    } else if (isImage(entry) || isVideo(entry)) {
        openViewer(files.filter(item => isImage(item) || isVideo(item)), entry);
    } else if (isEditable(entry)) {
        openEditor(entry);
    } else if (isArchiveEntry(entry)) {
        openInNewTab(path);
    } else {
        api().open_path(path);
    }
}

async function refreshPinKinds() {
    try {
        const kinds = await api().pin_kinds(pinnedPaths);
        Object.keys(kinds || {}).forEach(path => pinKind.set(path, kinds[path]));
        renderPinned();
    } catch (error) {
        return;
    }
}

function savePinned() {
    try {
        localStorage.setItem("folderion.pinned", JSON.stringify(pinnedPaths));
    } catch (error) {
        pinnedPaths = pinnedPaths.slice();
    }
    try {
        api().save_pins(pinnedPaths);
    } catch (error) {
        pinnedPaths = pinnedPaths.slice();
    }
}

const PIN_ICON = '<svg class="side-icon pin-icon" viewBox="0 0 384 512"><path d="M32 32C32 14.3 46.3 0 64 0H320c17.7 0 32 14.3 32 32s-14.3 32-32 32H290.5l11.4 148.2c36.7 19.9 65.7 53.2 79.5 94.7l1 3c3.3 9.8 1.6 20.5-4.4 28.8s-15.7 13.3-26 13.3H32c-10.3 0-19.9-4.9-26-13.3s-7.7-19.1-4.4-28.8l1-3c13.8-41.5 42.8-74.8 79.5-94.7L93.5 64H64C46.3 64 32 49.7 32 32zM160 384h64v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V384z"/></svg>';
const pinKind = new Map();
let pinDrag = null;
let pinSuppressClick = false;

function renderPinned() {
    const box = document.getElementById("pinned");
    box.innerHTML = "";
    if (pinnedPaths.length) {
        box.appendChild(makeEl("div", "side-title", "Закріплені елементи"));
    }
    pinnedPaths.forEach(path => {
        const item = makeEl("div", "side-item pinned-item");
        item.dataset.path = path;
        item.title = path;
        item.insertAdjacentHTML("beforeend", PIN_ICON);
        const label = folderLabel(path);
        item.insertAdjacentHTML("beforeend", pinKind.get(path) === "file" ? fileIcon(iconType({ name: label, is_dir: false })) : folderIcon());
        item.appendChild(makeEl("span", "side-label", label));
        const remove = makeEl("span", "pin-remove");
        remove.title = "Відкріпити";
        remove.innerHTML = CLOSE_ICON;
        item.appendChild(remove);
        box.appendChild(item);
    });
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (state && !state.help && !helpMode) {
        highlightPlace(state.path);
    }
}

function finishPinDrag() {
    if (!pinDrag) {
        return;
    }
    const drag = pinDrag;
    pinDrag = null;
    document.body.classList.remove("pin-dragging");
    drag.item.classList.remove("dragging");
    if (!drag.active) {
        return;
    }
    pinSuppressClick = true;
    setTimeout(() => {
        pinSuppressClick = false;
    }, 0);
    pinnedPaths = Array.from(document.querySelectorAll("#pinned .side-item")).map(item => item.dataset.path);
    savePinned();
}

document.getElementById("pinned").addEventListener("mousedown", event => {
    if (event.button !== 0 || event.target.closest(".pin-remove")) {
        return;
    }
    const item = event.target.closest(".side-item");
    if (item) {
        pinDrag = { item: item, startY: event.clientY, active: false };
    }
});

document.getElementById("pinned").addEventListener("click", event => {
    const remove = event.target.closest(".pin-remove");
    if (!remove) {
        return;
    }
    event.stopPropagation();
    const item = remove.closest(".side-item");
    togglePinned([item.dataset.path], false);
});

document.addEventListener("mousemove", event => {
    if (!pinDrag) {
        return;
    }
    if (!pinDrag.active) {
        if (Math.abs(event.clientY - pinDrag.startY) < 5) {
            return;
        }
        pinDrag.active = true;
        pinDrag.item.classList.add("dragging");
        document.body.classList.add("pin-dragging");
    }
    const box = document.getElementById("pinned");
    const others = Array.from(box.querySelectorAll(".side-item")).filter(node => node !== pinDrag.item);
    const before = others.find(node => {
        const rect = node.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
    });
    if (before) {
        if (pinDrag.item.nextElementSibling !== before) {
            box.insertBefore(pinDrag.item, before);
        }
    } else if (box.lastElementChild !== pinDrag.item) {
        box.appendChild(pinDrag.item);
    }
});

document.addEventListener("mouseup", finishPinDrag);
window.addEventListener("blur", finishPinDrag);

function togglePinned(paths, pin) {
    paths.forEach(path => {
        const index = pinnedPaths.findIndex(item => normalize(item) === normalize(path));
        if (pin && index < 0) {
            pinnedPaths.push(path);
        } else if (!pin && index >= 0) {
            pinnedPaths.splice(index, 1);
        }
    });
    savePinned();
    renderPinned();
    setNote(pin ? "Закріплено на панелі швидкого доступу" : "Відкріплено з панелі швидкого доступу");
}

function openInNewTab(path) {
    setEditorView(false);
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.innerHTML = '<span class="tab-label">Нова вкладка</span><span class="tab-close" title="Закрити вкладку">' + CLOSE_ICON + '</span>';
    tabsBar.insertBefore(tab, addButton);
    registerTab(tab, path);
    activateTab(tab);
}

async function compressSelection(kind) {
    const tab = activeTab();
    const state = tab && states.get(tab);
    if (readOnlyArchive(state)) {
        return;
    }
    if (helpMode || !state || !state.path || state.path === TRASH) {
        return;
    }
    const picked = pickedEntries();
    if (!picked.length) {
        return;
    }
    const result = await api().start_archive(kind, picked.map(entry => entry.path), state.path);
    if (result.error) {
        await notify("Не вдалося стиснути", result.error);
        return;
    }
    trackJob(result.id, { clearClipboard: false });
}

async function copyPaths(picked) {
    const current = states.get(activeTab());
    const inBin = Boolean(current) && current.path === TRASH;
    const result = await api().copy_text(picked.map(entry => '"' + (inBin ? entry.original : entry.path) + '"').join("\n"));
    if (result.ok) {
        setNote(picked.length === 1 ? "Шлях скопійовано" : "Шляхи скопійовано: " + picked.length);
    } else {
        await notify("Не вдалося скопіювати", result.error);
    }
}

const BROWSER_EXT = new Set(["html", "htm", "xhtml"]);
const PYTHON_EXT = new Set(["py", "pyw"]);
const SCRIPT_EXT = new Set(["bat", "cmd", "sh"]);

function entryExt(entry) {
    const dot = entry.name.lastIndexOf(".");
    return dot > 0 ? entry.name.slice(dot + 1).toLowerCase() : "";
}

async function openWith(method, entry) {
    const result = await api()[method](entry.path);
    if (result && !result.ok) {
        await notify("Не вдалося відкрити", result.error);
    }
}

function openWithItem(entry, allowEditor) {
    if (!entry || entry.is_dir) {
        return null;
    }
    const ext = entryExt(entry);
    const options = [];
    if (BROWSER_EXT.has(ext)) {
        options.push({ label: "Браузер", icon: ctxIcon("browser"), action: () => openWith("open_in_browser", entry) });
    }
    if (allowEditor && isEditable(entry)) {
        options.push({ label: "Редактор", icon: ctxIcon("editor"), action: () => openEditor(entry) });
    }
    if (PYTHON_EXT.has(ext)) {
        options.push({ label: "Python", icon: ctxIcon("python"), action: () => openWith("run_python", entry) });
    }
    if (SCRIPT_EXT.has(ext)) {
        options.push({ label: "Запустити", icon: ctxIcon("run"), action: () => openWith("run_script", entry) });
    }
    return options.length > 1 ? { label: "Відкрити в", icon: ctxIcon("openIn"), submenu: options } : null;
}

function folderMenuItems(state, picked) {
    const single = picked.length === 1;
    const target = picked[0];
    const folders = picked.filter(entry => entry.is_dir);
    const allPinned = picked.length > 0 && picked.every(entry => isPinned(entry.path));
    const onlyFiles = picked.every(entry => !entry.is_dir);
    const kind = groupKind(picked);
    if (state.archive) {
        return [{ label: "Видобути все", icon: ctxIcon("extract"), action: () => extractArchives([state.archive]) }];
    }
    const items = [{ label: "Відкрити", icon: ctxIcon("open"), hint: "Enter", disabled: !single && !kind, action: () => (kind ? openGroup(picked, kind) : openEntry(target)) }];
    const withItem = single ? openWithItem(target, true) : null;
    if (withItem) {
        items.push(withItem);
    }
    if (picked.length && picked.every(isArchiveEntry)) {
        items.push({ label: "Видобути все", icon: ctxIcon("extract"), action: () => extractArchives(picked.map(entry => entry.path)) });
    }
    if (!onlyFiles) {
        items.push(
            { label: "Відкрити в новій вкладці", icon: ctxIcon("newTab"), disabled: !single, action: () => openInNewTab(target.path) },
            { label: "Відкрити в новому вікні", icon: ctxIcon("newWindow"), disabled: !single, action: () => api().new_window(target.path) }
        );
    }
    items.push(
        { separator: true },
        {
            label: allPinned ? "Відкріпити з панелі швидкого доступу" : "Закріпити на панелі швидкого доступу",
            icon: ctxIcon(allPinned ? "unpin" : "pin"),
            disabled: !picked.length,
            action: () => {
                picked.forEach(entry => pinKind.set(entry.path, entry.is_dir ? "dir" : "file"));
                togglePinned(picked.map(entry => entry.path), !allPinned);
            }
        }
    );
    if (state.path) {
        items.push({
            label: "Стиснути до",
            icon: ctxIcon("compress"),
            submenu: [
                { label: "ZIP", icon: fileIcon("archive"), action: () => compressSelection("zip") },
                { label: "7z", icon: fileIcon("archive"), action: () => compressSelection("7z") },
                { label: "TAR", icon: fileIcon("archive"), action: () => compressSelection("tar") }
            ]
        });
    }
    items.push({ separator: true }, { label: "Копіювати як шлях", icon: ctxIcon("link"), hint: "Ctrl+Shift+C", action: () => copyPaths(picked) });
    if (state.path) {
        items.push(
            { separator: true },
            { label: "Копіювати", icon: ctxIcon("copy"), hint: "Ctrl+C", action: () => copySelection("copy") },
            { label: "Вирізати", icon: ctxIcon("cut"), hint: "Ctrl+X", action: () => copySelection("cut") },
            { separator: true },
            { label: "Перейменувати", icon: ctxIcon("rename"), hint: "F2", disabled: !single, action: () => startRename() },
            { label: "Видалити", icon: ctxIcon("trash"), hint: "Del", action: () => deleteSelection(false) }
        );
    }
    return items;
}

document.querySelector(".sidebar").addEventListener("mousedown", event => {
    if (event.button === 1 && event.target.closest(".side-item")) {
        event.preventDefault();
    }
});

document.querySelector(".sidebar").addEventListener("auxclick", event => {
    if (event.button !== 1) {
        return;
    }
    const item = event.target.closest(".side-item");
    if (!item || item.dataset.place === "help") {
        return;
    }
    let path;
    if (item.dataset.place !== undefined) {
        path = places[item.dataset.place];
    } else if (item.dataset.path !== undefined && pinKind.get(item.dataset.path) !== "file") {
        path = item.dataset.path;
    }
    if (path === undefined) {
        return;
    }
    event.preventDefault();
    if (event.shiftKey) {
        api().new_window(path);
    } else {
        openInNewTab(path);
    }
});

document.querySelector(".sidebar").addEventListener("contextmenu", event => {
    event.preventDefault();
    const item = event.target.closest(".side-item");
    if (!item || item.dataset.path === undefined) {
        return;
    }
    const path = item.dataset.path;
    if (pinKind.get(path) === "file") {
        const pinnedItems = [{ label: "Відкрити", icon: ctxIcon("open"), action: () => openPinnedFile(path) }];
        const pinnedWith = openWithItem(pinEntry(path), true);
        if (pinnedWith) {
            pinnedItems.push(pinnedWith);
        }
        pinnedItems.push(
            {
                label: "Показати в папці",
                icon: ctxIcon("folder"),
                action: async () => {
                    await navigate(await api().parent(path));
                    selectPaths([path]);
                }
            },
            { separator: true },
            { label: "Відкріпити з панелі швидкого доступу", icon: ctxIcon("unpin"), action: () => togglePinned([path], false) }
        );
        openContextMenu(event.clientX, event.clientY, pinnedItems);
        return;
    }
    openContextMenu(event.clientX, event.clientY, [
        { label: "Відкрити", icon: ctxIcon("open"), action: () => navigate(path) },
        { label: "Відкрити в новій вкладці", icon: ctxIcon("newTab"), action: () => openInNewTab(path) },
        { label: "Відкрити в новому вікні", icon: ctxIcon("newWindow"), action: () => api().new_window(path) },
        { separator: true },
        { label: "Відкріпити з панелі швидкого доступу", icon: ctxIcon("unpin"), action: () => togglePinned([path], false) }
    ]);
});

renderPinned();

window.addEventListener("pywebviewready", async () => {
    try {
        const saved = await api().load_pins();
        if (Array.isArray(saved) && saved.length) {
            pinnedPaths = saved;
            renderPinned();
            refreshPinKinds();
        } else if (pinnedPaths.length) {
            api().save_pins(pinnedPaths);
            refreshPinKinds();
        }
    } catch (error) {
        renderPinned();
    }
});



/* ---------- Смітник ---------- */
async function startTrashJob(request) {
    const result = await request;
    if (result.error) {
        await notify("Не вдалося виконати", result.error);
        return;
    }
    trackJob(result.id, { clearClipboard: false });
}

function restoreSelection() {
    const state = states.get(activeTab());
    if (!inTrash(state) || renaming) {
        return Promise.resolve();
    }
    const picked = pickedEntries();
    if (!picked.length) {
        return Promise.resolve();
    }
    return startTrashJob(api().start_restore(picked.map(entry => entry.path)));
}

function restoreAll() {
    const state = states.get(activeTab());
    if (!inTrash(state) || !state.entries.length) {
        return Promise.resolve();
    }
    return startTrashJob(api().start_restore_all());
}

async function purgeEntries(picked) {
    const count = picked.length;
    const subject = count === 1 ? "«" + picked[0].name + "»" : count + " " + plural(count, ELEMENT_FORMS);
    const answer = await askModal({
        title: "Видалити назавжди?",
        text: "Буде остаточно видалено " + subject + ". Це неможливо скасувати, відновити елементи буде не можна.",
        tone: "error",
        buttons: [
            { label: "Видалити назавжди", value: "yes", kind: "danger" },
            { label: "Скасувати", value: "no", primary: true, focus: true }
        ],
        cancelValue: "no"
    });
    if (answer.value !== "yes") {
        return;
    }
    await startTrashJob(api().start_purge(picked.map(entry => entry.path)));
}

async function emptyTrash() {
    const state = states.get(activeTab());
    if (!inTrash(state)) {
        return;
    }
    if (!state.entries.length) {
        setNote("Смітник уже порожній");
        return;
    }
    const count = state.entries.length;
    const answer = await askModal({
        title: "Очистити смітник?",
        text: "Буде остаточно видалено всі елементи зі смітника (" + count + " " + plural(count, ELEMENT_FORMS) + "). Це неможливо скасувати.",
        tone: "error",
        buttons: [
            { label: "Очистити", value: "yes", kind: "danger" },
            { label: "Скасувати", value: "no", primary: true, focus: true }
        ],
        cancelValue: "no"
    });
    if (answer.value !== "yes") {
        return;
    }
    await startTrashJob(api().start_empty_trash());
}

function trashMenuItems(picked) {
    const single = picked.length === 1;
    return [
        { label: "Відновити", icon: ctxIcon("restore"), action: () => restoreSelection() },
        { label: "Відкрити", icon: ctxIcon("open"), hint: "Enter", disabled: !single, action: () => openEntry(picked[0]) },
        { separator: true },
        { label: "Видалити назавжди", icon: ctxIcon("trash"), hint: "Del", action: () => purgeEntries(picked) }
    ];
}

function trashBackgroundItems(state) {
    return [
        { label: "Відновити все", icon: ctxIcon("restore"), disabled: !state.entries.length, action: () => restoreAll() },
        { label: "Очистити смітник", icon: ctxIcon("trash"), disabled: !state.entries.length, action: () => emptyTrash() },
        { separator: true }
    ].concat(contextItems(state));
}

trashSelectAll.addEventListener("click", () => {
    if (!shownEntries.length || renaming) {
        return;
    }
    selection.clear();
    shownEntries.forEach((entry, index) => selection.add(index));
    anchor = 0;
    cursor = shownEntries.length - 1;
    applySelection();
});
trashRestore.addEventListener("click", restoreSelection);
trashRestoreAll.addEventListener("click", restoreAll);
trashEmpty.addEventListener("click", emptyTrash);


/* ---------- Редактор файлів ---------- */
const EDIT_EXT = new Set(["txt", "html", "css", "js", "json", "yaml", "yml", "md", "sql", "py", "bat", "cmd", "sh"]);
const ENCODING_NAMES = { "utf-8": "UTF-8", "utf-8-sig": "UTF-8 з BOM", "utf-16": "UTF-16", "cp1251": "Windows-1251" };
const editorEl = document.getElementById("editor");
const bodyRow = document.getElementById("body-row");
const edSave = document.getElementById("ed-save");
const edSaveAll = document.getElementById("ed-save-all");
const edPreviewBtn = document.getElementById("ed-preview-btn");
const edPreview = document.getElementById("ed-preview");
const edGutter = document.getElementById("ed-gutter");
const edText = document.getElementById("ed-text");
const edWrap = document.getElementById("ed-wrap");
const edCode = document.getElementById("ed-code");
const edPos = document.getElementById("ed-pos");
const edInfo = document.getElementById("ed-info");
const edTabsBox = document.getElementById("ed-tabs");
const edToggle = document.getElementById("ed-toggle");
const edTabs = [];
let editorView = false;

function blankEditor() {
    return { open: false, path: "", name: "", original: "", text: "", eol: "\n", encoding: "utf-8", dirty: false, saving: false, lines: 0, lang: "", pending: false, scrollTop: 0, scrollLeft: 0, selStart: 0, selEnd: 0, preview: false, previewScroll: 0 };
}

let editor = blankEditor();

function isEditable(entry) {
    if (entry.is_dir) {
        return false;
    }
    const dot = entry.name.lastIndexOf(".");
    return dot > 0 && EDIT_EXT.has(entry.name.slice(dot + 1).toLowerCase());
}

function editorDirty() {
    return edTabs.some(tab => tab.dirty);
}

function warnDirty(action) {
    const names = edTabs.filter(tab => tab.dirty).map(tab => "«" + tab.name + "»").join(", ");
    return notify("Є незбережені зміни", "Файли " + names + " відредаговано, але не збережено. Збережіть їх (Ctrl+S або кнопка «Зберегти»), перш ніж " + action + ", інакше зміни буде втрачено.");
}

window.warnDirtyClose = () => {
    if (editorDirty()) {
        warnDirty("закрити програму");
    }
};

function syncDirtyState() {
    try {
        api().set_editor_dirty(editorDirty());
    } catch (error) {
        return;
    }
}

function setDirty(flag) {
    const changed = editor.dirty !== flag;
    editor.dirty = flag;
    edSave.disabled = !flag;
    if (changed) {
        renderEditorTabs();
        syncDirtyState();
    }
}

function renderEditorTabs() {
    edTabsBox.textContent = "";
    edTabs.forEach(tab => {
        const node = makeEl("div", "ed-tab" + (tab === editor ? " active" : ""));
        node.title = tab.path;
        node.appendChild(makeEl("span", "ed-tab-name", tab.name));
        if (tab.dirty) {
            node.appendChild(makeEl("span", "ed-tab-dot"));
        }
        const close = makeEl("span", "ed-tab-close");
        close.innerHTML = '<svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
        close.title = "Закрити вкладку";
        close.addEventListener("click", event => {
            event.stopPropagation();
            closeEditorTab(tab);
        });
        node.addEventListener("click", () => switchEditorTab(tab));
        node.addEventListener("auxclick", event => {
            if (event.button === 1) {
                event.preventDefault();
                closeEditorTab(tab);
            }
        });
        node.appendChild(close);
        edTabsBox.appendChild(node);
    });
    const active = edTabsBox.querySelector(".ed-tab.active");
    if (active) {
        active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    editorEl.classList.toggle("empty", !edTabs.length);
    edSaveAll.hidden = edTabs.length < 2;
    edSaveAll.disabled = !editorDirty();
}

edTabsBox.addEventListener("wheel", event => {
    if (event.deltaY) {
        edTabsBox.scrollLeft += event.deltaY;
        event.preventDefault();
    }
}, { passive: false });

function captureEditorTab() {
    if (!editor.open) {
        return;
    }
    editor.text = edText.value;
    if (editorEl.classList.contains("previewing")) {
        editor.previewScroll = edPreview.scrollTop;
    }
    editor.scrollTop = edText.scrollTop;
    editor.scrollLeft = edText.scrollLeft;
    editor.selStart = edText.selectionStart;
    editor.selEnd = edText.selectionEnd;
}

function restoreEditorView() {
    edText.scrollTop = editor.scrollTop;
    edText.scrollLeft = editor.scrollLeft;
    edText.setSelectionRange(editor.selStart, editor.selEnd);
    updateEditorPos();
    syncGutter();
}

function loadEditorTab(tab) {
    editor = tab;
    edText.value = tab.text;
    edSave.disabled = !tab.dirty;
    updateGutter(true);
    updateEditorInfo();
    highlightNow();
    renderEditorTabs();
    restoreEditorView();
    applyPreview();
}

function switchEditorTab(tab) {
    if (tab !== editor) {
        captureEditorTab();
        loadEditorTab(tab);
    }
    edText.focus();
}

function setEditorView(show) {
    if (show === editorView) {
        return;
    }
    if (show) {
        closeViewer();
    } else {
        captureEditorTab();
    }
    editorView = show;
    editorEl.hidden = !show;
    bodyRow.classList.toggle("editing", show);
    edToggle.classList.toggle("active", show);
    edToggle.title = show ? "Сховати редактор" : "Показати редактор";
    if (show && editor.open) {
        applyPreview();
        restoreEditorView();
        if (!editor.preview) {
            edText.focus();
        }
    }
}

function updateGutter(force) {
    const lines = edText.value.split("\n").length;
    if (!force && lines === editor.lines) {
        return;
    }
    editor.lines = lines;
    const numbers = new Array(lines);
    for (let i = 0; i < lines; i += 1) {
        numbers[i] = i + 1;
    }
    edGutter.textContent = numbers.join("\n");
    edGutter.style.setProperty("--ed-digits", Math.max(3, String(lines).length));
}

function syncGutter() {
    edGutter.style.paddingBottom = (8 + edText.offsetHeight - edText.clientHeight) + "px";
    edGutter.scrollTop = edText.scrollTop;
    edCode.style.transform = "translate(" + (-edText.scrollLeft) + "px, " + (-edText.scrollTop) + "px)";
}

function updateEditorPos() {
    const before = edText.value.slice(0, edText.selectionStart);
    const line = before.split("\n").length;
    const column = before.length - before.lastIndexOf("\n");
    edPos.textContent = "Рядок " + line + ", стовпець " + column;
}

function updateEditorInfo() {
    edInfo.textContent = (ENCODING_NAMES[editor.encoding] || editor.encoding) + " · " + (editor.eol === "\r\n" ? "CRLF" : "LF") + " · " + editor.lines + " " + plural(editor.lines, ["рядок", "рядки", "рядків"]);
}

async function openEditor(entry) {
    const existing = edTabs.find(tab => normalize(tab.path) === normalize(entry.path));
    if (existing) {
        setEditorView(true);
        switchEditorTab(existing);
        return;
    }
    const result = await api().read_text(entry.path);
    if (!result.ok) {
        await notify("Не вдалося відкрити файл", result.error);
        return;
    }
    setEditorView(true);
    captureEditorTab();
    const tab = blankEditor();
    tab.open = true;
    tab.path = entry.path;
    tab.name = entry.name;
    tab.original = result.text;
    tab.text = result.text;
    tab.eol = result.eol;
    tab.encoding = result.encoding;
    tab.lang = HL_LANG[entry.name.slice(entry.name.lastIndexOf(".") + 1).toLowerCase()] || "";
    edTabs.push(tab);
    loadEditorTab(tab);
    edText.focus();
}

function removeEditorTab(tab) {
    const index = edTabs.indexOf(tab);
    if (index < 0) {
        return;
    }
    const wasActive = tab === editor;
    edTabs.splice(index, 1);
    tab.dirty = false;
    if (!wasActive) {
        renderEditorTabs();
        syncDirtyState();
        return;
    }
    const next = edTabs[index] || edTabs[index - 1];
    if (next) {
        loadEditorTab(next);
        syncDirtyState();
        edText.focus();
        return;
    }
    editor = blankEditor();
    edCode.textContent = "";
    edText.value = "";
    edSave.disabled = true;
    edPos.textContent = "";
    edInfo.textContent = "";
    applyPreview();
    renderEditorTabs();
    syncDirtyState();
}

async function closeEditorTab(tab) {
    if (tab.dirty) {
        const answer = await askModal({
            title: "Є незбережені зміни",
            text: "Зберегти зміни у файлі «" + tab.name + "» перед закриттям?",
            buttons: [
                { label: "Зберегти", value: "save", primary: true },
                { label: "Не зберігати", value: "discard" },
                { label: "Скасувати", value: "cancel" }
            ],
            cancelValue: "cancel"
        });
        if (answer.value === "cancel") {
            return;
        }
        if (answer.value === "save") {
            switchEditorTab(tab);
            if (!await saveEditor()) {
                return;
            }
        }
    }
    removeEditorTab(tab);
}

async function writeTab(tab, text) {
    if (tab.saving) {
        return true;
    }
    tab.saving = true;
    const result = await api().write_text(tab.path, text, tab.eol, tab.encoding);
    tab.saving = false;
    if (!result.ok) {
        await notify("Не вдалося зберегти", "«" + tab.name + "»: " + result.error);
        return false;
    }
    tab.original = text;
    if (tab === editor) {
        setDirty(edText.value !== text);
    } else {
        tab.dirty = tab.text !== text;
        renderEditorTabs();
        syncDirtyState();
    }
    return true;
}

async function saveEditor() {
    const tab = editor;
    if (!tab.open || tab.saving || !tab.dirty) {
        return true;
    }
    if (!await writeTab(tab, edText.value)) {
        return false;
    }
    setNote("Збережено");
    refreshCurrent();
    return true;
}

async function saveAllEditors() {
    captureEditorTab();
    const dirty = edTabs.filter(tab => tab.dirty);
    if (!dirty.length) {
        return true;
    }
    let saved = 0;
    for (const tab of dirty) {
        if (await writeTab(tab, tab.text)) {
            saved += 1;
        }
    }
    if (saved) {
        setNote(saved === 1 ? "Збережено" : "Збережено файлів: " + saved);
        refreshCurrent();
    }
    return saved === dirty.length;
}

edText.addEventListener("input", () => {
    setDirty(edText.value !== editor.original);
    updateGutter(false);
    updateEditorInfo();
    updateEditorPos();
    scheduleHighlight();
    syncGutter();
});
edText.addEventListener("scroll", syncGutter);
["keyup", "click", "select", "focus"].forEach(name => edText.addEventListener(name, updateEditorPos));
edText.addEventListener("keydown", event => {
    if (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        if (!event.shiftKey) {
            document.execCommand("insertText", false, "    ");
        }
    }
});
document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === "KeyS" && editor.open) {
        event.preventDefault();
        saveEditor();
    }
}, true);
edSave.addEventListener("click", saveEditor);
edSaveAll.addEventListener("click", saveAllEditors);
document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.shiftKey && event.code === "KeyS" && editor.open) {
        event.preventDefault();
        saveAllEditors();
    }
}, true);
edToggle.addEventListener("click", () => setEditorView(!editorView));
document.addEventListener("keydown", event => {
    if (!editorView || event.target.matches("input, textarea")) {
        return;
    }
    const ctrl = event.ctrlKey || event.metaKey;
    const blocked = ctrl ? ["KeyA", "KeyC", "KeyX", "KeyV", "KeyZ", "KeyY"].includes(event.code) : ["Delete", "F2", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "Backspace"].includes(event.key);
    if (blocked) {
        event.stopPropagation();
    }
}, true);
if (window.ResizeObserver) {
    new ResizeObserver(syncGutter).observe(edText);
}


function mdEscape(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mdSafeUrl(url) {
    return /^(https?:\/\/|mailto:)/i.test(url);
}

function mdInline(text) {
    const codes = [];
    let out = mdEscape(text);
    out = out.replace(/`([^`]+)`/g, (match, code) => {
        codes.push(code);
        return "\u0000" + (codes.length - 1) + "\u0000";
    });
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (match, alt) => '<span class="md-img">Зображення: ' + (alt || "без підпису") + "</span>");
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (match, label, url) => (mdSafeUrl(url) ? '<a class="md-link" href="' + url + '">' + label + "</a>" : label));
    out = out.replace(/\*\*([^*]+?)\*\*|__([^_]+?)__/g, (match, a, b) => "<strong>" + (a || b) + "</strong>");
    out = out.replace(/~~([^~]+?)~~/g, "<del>$1</del>");
    out = out.replace(/\*([^*\s][^*]*?)\*|(?<![\w])_([^_\s][^_]*?)_(?![\w])/g, (match, a, b) => "<em>" + (a || b) + "</em>");
    return out.replace(/\u0000(\d+)\u0000/g, (match, index) => "<code>" + codes[Number(index)] + "</code>");
}

function mdBlank(line) {
    return /^\s*$/.test(line);
}

function mdTableCells(row) {
    let text = row.trim().replace(/\\\|/g, "\u0001");
    if (text.startsWith("|")) {
        text = text.slice(1);
    }
    if (text.endsWith("|")) {
        text = text.slice(0, -1);
    }
    return text.split("|").map(cell => cell.replace(/\u0001/g, "|").trim());
}

function mdIsTable(lines, index) {
    return index + 1 < lines.length
        && lines[index].includes("|")
        && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[index + 1])
        && lines[index + 1].includes("-");
}

function mdStartsBlock(lines, index) {
    const line = lines[index];
    return /^\s*(```|~~~)/.test(line)
        || /^#{1,6}\s/.test(line)
        || /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)
        || /^\s*>/.test(line)
        || /^\s*([-*+]|\d+[.)])\s+/.test(line)
        || mdIsTable(lines, index);
}

function mdList(lines, start) {
    const first = lines[start].match(/^(\s*)([-*+]|\d+[.)])\s+/);
    const indent = first[1].length;
    const ordered = /\d/.test(first[2]);
    const startNumber = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    let i = start;
    while (i < lines.length) {
        const match = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!match || match[1].length !== indent || /\d/.test(match[2]) !== ordered) {
            break;
        }
        const item = { text: match[3], children: "" };
        i += 1;
        while (i < lines.length && !mdBlank(lines[i])) {
            const nested = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+/);
            if (nested && nested[1].length > indent) {
                const sub = mdList(lines, i);
                item.children += sub.html;
                i = sub.next;
            } else if (nested) {
                break;
            } else if (/^\s+\S/.test(lines[i])) {
                item.text += " " + lines[i].trim();
                i += 1;
            } else {
                break;
            }
        }
        items.push(item);
        if (i + 1 < lines.length && mdBlank(lines[i])) {
            const after = lines[i + 1].match(/^(\s*)([-*+]|\d+[.)])\s+/);
            if (after && after[1].length === indent && /\d/.test(after[2]) === ordered) {
                i += 1;
            }
        }
    }
    const tag = ordered ? "ol" : "ul";
    const body = items.map(item => {
        const task = item.text.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
            return '<li class="md-task"><input type="checkbox" disabled' + (task[1] === " " ? "" : " checked") + "> " + mdInline(task[2]) + item.children + "</li>";
        }
        return "<li>" + mdInline(item.text) + item.children + "</li>";
    }).join("");
    const attr = ordered && startNumber !== 1 ? ' start="' + startNumber + '"' : "";
    return { html: "<" + tag + attr + ">" + body + "</" + tag + ">", next: i };
}

function renderMarkdown(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (mdBlank(line)) {
            i += 1;
            continue;
        }
        const fence = line.match(/^\s*(```|~~~)/);
        if (fence) {
            const code = [];
            i += 1;
            while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
                code.push(lines[i]);
                i += 1;
            }
            i += 1;
            html.push('<pre class="md-code"><code>' + mdEscape(code.join("\n")) + "</code></pre>");
            continue;
        }
        const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
        if (heading) {
            const level = heading[1].length;
            html.push("<h" + level + ">" + mdInline(heading[2]) + "</h" + level + ">");
            i += 1;
            continue;
        }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
            html.push("<hr>");
            i += 1;
            continue;
        }
        if (/^\s*>/.test(line)) {
            const inner = [];
            while (i < lines.length && /^\s*>/.test(lines[i])) {
                inner.push(lines[i].replace(/^\s*> ?/, ""));
                i += 1;
            }
            html.push("<blockquote>" + renderMarkdown(inner.join("\n")) + "</blockquote>");
            continue;
        }
        if (mdIsTable(lines, i)) {
            const head = mdTableCells(lines[i]);
            const aligns = mdTableCells(lines[i + 1]).map(cell => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : cell.startsWith(":") ? "left" : ""));
            const cellHtml = (tag, cell, index) => "<" + tag + (aligns[index] ? ' style="text-align:' + aligns[index] + '"' : "") + ">" + mdInline(cell) + "</" + tag + ">";
            const rows = [];
            i += 2;
            while (i < lines.length && !mdBlank(lines[i]) && lines[i].includes("|")) {
                rows.push(mdTableCells(lines[i]));
                i += 1;
            }
            html.push('<div class="md-table"><table><thead><tr>' + head.map((cell, index) => cellHtml("th", cell, index)).join("") + "</tr></thead><tbody>"
                + rows.map(row => "<tr>" + head.map((unused, index) => cellHtml("td", row[index] || "", index)).join("") + "</tr>").join("") + "</tbody></table></div>");
            continue;
        }
        if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
            const list = mdList(lines, i);
            html.push(list.html);
            i = list.next;
            continue;
        }
        const paragraph = [line.trim()];
        i += 1;
        while (i < lines.length && !mdBlank(lines[i]) && !mdStartsBlock(lines, i)) {
            paragraph.push(lines[i].trim());
            i += 1;
        }
        html.push("<p>" + mdInline(paragraph.join(" ")) + "</p>");
    }
    return html.join("\n");
}

function applyPreview() {
    const isMarkdown = editor.open && /\.md$/i.test(editor.name);
    const on = isMarkdown && editor.preview;
    edPreviewBtn.hidden = !isMarkdown;
    edPreviewBtn.classList.toggle("active", on);
    edPreviewBtn.title = on ? "Повернутися до редагування" : "Попередній перегляд";
    editorEl.classList.toggle("previewing", on);
    if (on) {
        edPreview.innerHTML = renderMarkdown(edText.value);
        edPreview.scrollTop = editor.previewScroll;
    } else {
        edPreview.textContent = "";
    }
}

edPreviewBtn.addEventListener("click", () => {
    if (!editor.open) {
        return;
    }
    captureEditorTab();
    editor.preview = !editor.preview;
    applyPreview();
    if (!editor.preview) {
        edText.focus();
        restoreEditorView();
    }
});

edPreview.addEventListener("click", event => {
    const link = event.target.closest("a.md-link");
    if (link) {
        event.preventDefault();
        api().open_path(link.getAttribute("href"));
    }
});

/* ---------- Підсвітка коду ---------- */
const HL_LANG = { js: "js", json: "json", css: "css", html: "html", yaml: "yaml", yml: "yaml", md: "md", sql: "sql", py: "py" };
const HL_LIMIT = 400000;
const JS_KEYWORDS = "async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|static|super|switch|throw|try|typeof|var|void|while|with|yield";
const SQL_KEYWORDS = "add|all|alter|and|as|asc|between|by|case|check|column|constraint|create|database|default|delete|desc|distinct|drop|else|end|exists|foreign|from|full|group|having|in|index|inner|insert|into|is|join|key|left|like|limit|not|null|offset|on|or|order|outer|primary|references|right|select|set|table|then|top|union|unique|update|values|view|when|where|with|int|integer|varchar|text|date|datetime|boolean|true|false";
const STR_DQ = '"(?:\\\\.|[^"\\\\\\n])*"?';
const STR_SQ = "'(?:\\\\.|[^'\\\\\\n])*'?";
const NUM = "\\b0[xX][\\da-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b";

const HL_RULES = {
    js: { flags: "gm", rules: [
        ["c", "\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|(?![\\s\\S]))"],
        ["s", STR_DQ + "|" + STR_SQ + "|`(?:\\\\[\\s\\S]|[^`\\\\])*`?"],
        ["n", NUM],
        ["k", "\\b(?:" + JS_KEYWORDS + ")\\b"],
        ["l", "\\b(?:true|false|null|undefined|this|NaN|Infinity)\\b"],
        ["f", "\\b[A-Za-z_$][\\w$]*(?=\\()"]
    ] },
    json: { flags: "gm", rules: [
        ["p", STR_DQ.replace('"?$', '"') + "(?=\\s*:)"],
        ["s", STR_DQ],
        ["n", "-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b"],
        ["l", "\\b(?:true|false|null)\\b"]
    ] },
    css: { flags: "gm", rules: [
        ["c", "\\/\\*[\\s\\S]*?(?:\\*\\/|(?![\\s\\S]))"],
        ["s", STR_DQ + "|" + STR_SQ],
        ["k", "@[\\w-]+"],
        ["l", "!important"],
        ["n", "#[\\da-fA-F]{3,8}\\b|-?\\d*\\.?\\d+(?:px|em|rem|%|vh|vw|vmin|vmax|ch|s|ms|deg|fr)?\\b"],
        ["p", "[\\w-]+(?=\\s*:(?!:))"],
        ["x", "[.#][A-Za-z_][\\w-]*"],
        ["f", "[\\w-]+(?=\\()"]
    ] },
    html: { flags: "gm", rules: [
        ["c", "<!--[\\s\\S]*?(?:-->|(?![\\s\\S]))"],
        ["l", "<![A-Za-z][^>]*>"],
        ["t", "<\\/?[A-Za-z][\\w:-]*|\\/?>"],
        ["s", STR_DQ.replace("\\\\\\n", "") + "|" + STR_SQ.replace("\\\\\\n", "")],
        ["a", "[\\w:@.-]+(?==)"],
        ["n", "&#?\\w+;"]
    ] },
    yaml: { flags: "gm", rules: [
        ["c", "(?:^|(?<=[ \\t]))#[^\\n]*"],
        ["k", "^---|^\\.\\.\\."],
        ["p", "^[ \\t]*(?:-[ \\t]+)?[^\\s:#'\"\\-][^:\\n#]*?(?=:(?:[ \\t]|$))"],
        ["s", STR_DQ + "|" + STR_SQ],
        ["x", "[&*][\\w-]+"],
        ["n", "-?\\b\\d+(?:\\.\\d+)?\\b"],
        ["l", "\\b(?:true|false|null|yes|no|on|off)\\b"]
    ] },
    md: { flags: "gm", rules: [
        ["s", "^```[\\s\\S]*?(?:\\n```[^\\n]*|(?![\\s\\S]))"],
        ["h", "^#{1,6}[^\\n]*"],
        ["c", "^>[^\\n]*"],
        ["k", "^[ \\t]*(?:[-*+]|\\d+\\.)(?=[ \\t])"],
        ["s", "`[^`\\n]+`"],
        ["b", "\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__"],
        ["f", "\\[[^\\]\\n]*\\]\\([^)\\n]*\\)"]
    ] },
    sql: { flags: "gmi", rules: [
        ["c", "--[^\\n]*|\\/\\*[\\s\\S]*?(?:\\*\\/|(?![\\s\\S]))"],
        ["s", "'(?:''|[^'])*'?"],
        ["n", "\\b\\d+(?:\\.\\d+)?\\b"],
        ["k", "\\b(?:" + SQL_KEYWORDS + ")\\b"],
        ["f", "\\b[A-Za-z_]\\w*(?=\\()"]
    ] }
};

const PY_KEYWORDS = "and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case";
HL_RULES.py = { flags: "gm", rules: [
    ["s", "(?:[rRbBuUfF]{1,2})?(?:\"\"\"[\\s\\S]*?(?:\"\"\"|(?![\\s\\S]))|\'\'\'[\\s\\S]*?(?:\'\'\'|(?![\\s\\S])))"],
    ["c", "#[^\\n]*"],
    ["s", "(?:[rRbBuUfF]{1,2})?(?:" + STR_DQ + "|" + STR_SQ + ")"],
    ["x", "^[ \\t]*@[\\w.]+"],
    ["n", NUM + "|\\b\\d+(?:_\\d+)*\\b"],
    ["k", "\\b(?:" + PY_KEYWORDS + ")\\b"],
    ["l", "\\b(?:True|False|None|self|cls)\\b"],
    ["f", "(?<=\\b(?:def|class)[ \\t]+)[A-Za-z_]\\w*|\\b[A-Za-z_]\\w*(?=\\()"]
] };

const HL_CACHE = {};

function hlRegex(lang) {
    if (!HL_CACHE[lang]) {
        const spec = HL_RULES[lang];
        HL_CACHE[lang] = {
            re: new RegExp(spec.rules.map(rule => "(" + rule[1] + ")").join("|"), spec.flags),
            classes: spec.rules.map(rule => rule[0])
        };
    }
    return HL_CACHE[lang];
}

function hlEscape(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightCode(text, lang) {
    const spec = hlRegex(lang);
    const re = spec.re;
    re.lastIndex = 0;
    let out = "";
    let last = 0;
    let match;
    while ((match = re.exec(text)) !== null) {
        if (match[0] === "") {
            re.lastIndex += 1;
            continue;
        }
        let group = 1;
        while (group < match.length && match[group] === undefined) {
            group += 1;
        }
        out += hlEscape(text.slice(last, match.index));
        out += '<span class="tk-' + spec.classes[group - 1] + '">' + hlEscape(match[0]) + "</span>";
        last = match.index + match[0].length;
    }
    return out + hlEscape(text.slice(last));
}

function highlightNow() {
    editor.pending = false;
    const text = edText.value;
    if (!editor.lang || text.length > HL_LIMIT) {
        edWrap.classList.add("plain");
        edCode.textContent = "";
        return;
    }
    edWrap.classList.remove("plain");
    edCode.innerHTML = highlightCode(text, editor.lang) + "\n";
}

function scheduleHighlight() {
    if (editor.pending || !editor.lang) {
        return;
    }
    editor.pending = true;
    requestAnimationFrame(highlightNow);
}
