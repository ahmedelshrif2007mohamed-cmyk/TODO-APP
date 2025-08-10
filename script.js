/* Enhanced To-Do App
   - i18n ar/en (switch dir & labels)
   - LocalStorage persistence
   - per-task remindAt (datetime-local) + notified flag
   - Notifications (Notification API) + sound
   - edit inline (text + remind time)
   - export/import JSON
*/

const STORAGE_KEYS = {
    tasks: "todo_tasks_v3",
    theme: "todo_theme_v3",
    lang: "todo_lang_v3"
  };
  
  /* ---------- elements ---------- */
  const taskInput = document.getElementById("task-input");
  const remindInput = document.getElementById("remind-input");
  const addBtn = document.getElementById("add-btn");
  const tasksUl = document.getElementById("tasks");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const clearAllBtn = document.getElementById("clear-all");
  const themeToggle = document.getElementById("theme-toggle");
  const btnAr = document.getElementById("btn-ar");
  const btnEn = document.getElementById("btn-en");
  const appTitle = document.getElementById("app-title");
  const subtitle = document.getElementById("subtitle");
  const counterEl = document.getElementById("counter");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const fileInput = document.getElementById("file-input");
  const ding = document.getElementById("ding-sound");
  
  /* ---------- state ---------- */
  let tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.tasks) || "[]");
  let currentFilter = "all";
  let currentLang = localStorage.getItem(STORAGE_KEYS.lang) || "ar";
  let currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  
  /* ---------- i18n strings ---------- */
  const I18N = {
    ar: {
      title: "قائمة المهام",
      subtitle: "منظم المهام البسيط والجميل",
      placeholder: "أضف مهمة جديدة...",
      add: "إضافة",
      all: "الكل",
      active: "غير منجزة",
      completed: "منجزة",
      clearAll: "مسح الكل",
      export: "تصدير JSON",
      import: "استيراد JSON",
      tasksText: (n) => `${n} مهمة${n === 1 ? "" : ""}`,
      confirmClear: "هل تريد مسح كل المهام؟",
      remindAtText: (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        return `تذكير: ${d.toLocaleString('ar-EG')}`;
      },
      editPrompt: "عدل المهمة:"
    },
    en: {
      title: "To-Do List",
      subtitle: "Simple & neat task manager",
      placeholder: "Add new task...",
      add: "Add",
      all: "All",
      active: "Active",
      completed: "Completed",
      clearAll: "Clear All",
      export: "Export JSON",
      import: "Import JSON",
      tasksText: (n) => `${n} task${n === 1 ? "" : "s"}`,
      confirmClear: "Clear all tasks?",
      remindAtText: (ts) => {
        if (!ts) return "";
        const d = new Date(ts);
        return `Remind: ${d.toLocaleString()}`;
      },
      editPrompt: "Edit task:"
    }
  };
  
  /* ---------- helper funcs ---------- */
  function save() {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  }
  
  function notifyPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
  
  function setTheme(t) {
    currentTheme = t;
    localStorage.setItem(STORAGE_KEYS.theme, t);
    document.body.classList.toggle("dark", t === "dark");
    themeToggle.textContent = t === "dark" ? "☀️" : "🌙";
  }
  
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEYS.lang, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  
    const t = I18N[lang];
    appTitle.textContent = t.title;
    subtitle.textContent = t.subtitle;
    taskInput.placeholder = t.placeholder;
    addBtn.textContent = t.add;
    document.querySelector('[data-filter="all"]').textContent = t.all;
    document.querySelector('[data-filter="active"]').textContent = t.active;
    document.querySelector('[data-filter="completed"]').textContent = t.completed;
    clearAllBtn.textContent = t.clearAll;
    exportBtn.textContent = t.export;
    importBtn.textContent = t.import;
  
    btnAr.classList.toggle("active", lang === "ar");
    btnEn.classList.toggle("active", lang === "en");
    btnAr.setAttribute("aria-pressed", lang === "ar");
    btnEn.setAttribute("aria-pressed", lang === "en");
  
    render();
  }
  
  function escapeHtml(str) {
    return String(str).replace(/[&<>"'`=\/]/g, function(s) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
        "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
      }[s];
    });
  }
  
  function formatRemind(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    // use locale by language
    const locale = currentLang === "ar" ? "ar-EG" : undefined;
    return (currentLang === "ar" ? "تذكير: " : "Remind: ") + d.toLocaleString(locale);
  }
  
  function toDatetimeLocalString(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const pad = (n) => n.toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
  
  function parseDatetimeLocal(value) {
    if (!value) return null;
    // assuming value like 2023-08-10T14:30
    const ts = Date.parse(value);
    return isNaN(ts) ? null : ts;
  }
  
  /* ---------- rendering ---------- */
  function render() {
    tasksUl.innerHTML = "";
    // apply filter
    const filtered = tasks.filter(t => {
      if (currentFilter === "active") return !t.done;
      if (currentFilter === "completed") return t.done;
      return true;
    });
  
    filtered.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " completed" : "");
      li.dataset.id = task.id;
  
      const remindText = task.remindAt ? (currentLang === "ar" ? "تذكير: " : "Remind: ") + new Date(task.remindAt).toLocaleString(currentLang === "ar" ? "ar-EG" : undefined) : "";
  
      li.innerHTML = `
        <div class="task-left">
          <div class="task-meta">
            <div class="task-text">${escapeHtml(task.text)}</div>
            <div class="task-remind">${remindText}</div>
          </div>
        </div>
        <div class="task-actions">
          <button class="small-btn" data-action="toggle" data-id="${task.id}" title="${currentLang==='ar'?'تبديل الحالة':'Toggle'}">✔</button>
          <button class="small-btn" data-action="edit" data-id="${task.id}" title="${currentLang==='ar'?'تعديل':'Edit'}">✏</button>
          <button class="small-btn" data-action="delete" data-id="${task.id}" title="${currentLang==='ar'?'حذف':'Delete'}">❌</button>
        </div>
      `;
      tasksUl.appendChild(li);
    });
  
    // update counter
    const t = I18N[currentLang];
    counterEl.textContent = t.tasksText(tasks.length || 0);
  }
  
  /* ---------- actions ---------- */
  
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    const remindAt = parseDatetimeLocal(remindInput.value);
    const task = {
      id: Date.now().toString() + Math.random().toString(36).slice(2,6),
      text,
      done: false,
      createdAt: Date.now(),
      remindAt: remindAt || null,
      notified: false
    };
    tasks.push(task);
    save();
    taskInput.value = "";
    remindInput.value = "";
    render();
  }
  
  function findIndexById(id) {
    return tasks.findIndex(t => t.id === id);
  }
  
  function toggleTaskById(id) {
    const idx = findIndexById(id);
    if (idx === -1) return;
    tasks[idx].done = !tasks[idx].done;
    save();
    render();
  }
  
  function deleteTaskById(id) {
    const idx = findIndexById(id);
    if (idx === -1) return;
    tasks.splice(idx, 1);
    save();
    render();
  }
  
  function clearAll() {
    const t = I18N[currentLang];
    if (!confirm(t.confirmClear)) return;
    tasks = [];
    save();
    render();
  }
  
  /* inline edit UI */
  function openEditUI(id) {
    const idx = findIndexById(id);
    if (idx === -1) return;
    const task = tasks[idx];
    const li = tasksUl.querySelector(`li[data-id="${id}"]`);
    if (!li) return;
  
    // build edit area
    const editDiv = document.createElement("div");
    editDiv.className = "edit-area";
    editDiv.innerHTML = `
      <input class="edit-text" value="${escapeHtml(task.text)}" />
      <input class="edit-remind" type="datetime-local" value="${task.remindAt ? toDatetimeLocalString(task.remindAt) : ''}" />
      <button class="save-edit">حفظ</button>
      <button class="cancel-edit">إلغاء</button>
    `;
  
    // replace li content temporarily
    li.innerHTML = "";
    li.appendChild(editDiv);
  
    // listeners
    editDiv.querySelector(".cancel-edit").addEventListener("click", () => render());
    editDiv.querySelector(".save-edit").addEventListener("click", () => {
      const newText = editDiv.querySelector(".edit-text").value.trim();
      const newRemindVal = editDiv.querySelector(".edit-remind").value;
      if (!newText) {
        alert(currentLang === "ar" ? "أدخل نص المهمة" : "Enter task text");
        return;
      }
      const newRemindAt = parseDatetimeLocal(newRemindVal);
      task.text = newText;
      task.remindAt = newRemindAt || null;
      task.notified = false; // reset notified when changing remind
      save();
      render();
    });
  }
  
  /* ---------- event delegation ---------- */
  tasksUl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id) return;
    if (action === "toggle") toggleTaskById(id);
    if (action === "edit") openEditUI(id);
    if (action === "delete") {
      if (confirm(currentLang === "ar" ? "حذف المهمة؟" : "Delete task?")) deleteTaskById(id);
    }
  });
  
  /* filter buttons */
  filterBtns.forEach(b => {
    b.addEventListener("click", () => {
      filterBtns.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      currentFilter = b.dataset.filter;
      render();
    });
  });
  
  /* add */
  addBtn.addEventListener("click", addTask);
  taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
  
  /* clear all */
  clearAllBtn.addEventListener("click", clearAll);
  
  /* theme toggle */
  themeToggle.addEventListener("click", () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  });
  
  /* language toggle */
  btnAr.addEventListener("click", () => setLang("ar"));
  btnEn.addEventListener("click", () => setLang("en"));
  
  /* export / import */
  exportBtn.addEventListener("click", () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
  
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Invalid JSON");
        if (!confirm(currentLang === "ar" ? "هل تريد استبدال المهام الحالية بالمحتوى المستورد؟" : "Replace current tasks with imported tasks?")) return;
        tasks = imported.map(t => ({
          id: t.id || (Date.now().toString()+Math.random().toString(36).slice(2,6)),
          text: t.text || "",
          done: !!t.done,
          createdAt: t.createdAt || Date.now(),
          remindAt: t.remindAt || null,
          notified: !!t.notified
        }));
        save();
        render();
      } catch (err) {
        alert(currentLang === "ar" ? "ملف غير صالح" : "Invalid file");
      }
    };
    reader.readAsText(file);
    fileInput.value = "";
  });
  
  /* ---------- reminders check ---------- */
  function showNotification(task) {
    const title = currentLang === "ar" ? "تذكير: مهمة" : "Reminder: Task";
    const body = task.text;
    // sound
    try { ding.currentTime = 0; ding.play(); } catch(e) {}
    // browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, { body, tag: task.id });
      n.onclick = () => window.focus();
    } else {
      // fallback alert
      alert((currentLang==="ar"?"تذكير: ":"Reminder: ") + task.text);
    }
  }
  
  function checkReminders() {
    const now = Date.now();
    let changed = false;
    tasks.forEach(task => {
      if (task.remindAt && !task.notified && task.remindAt <= now) {
        showNotification(task);
        task.notified = true;
        changed = true;
      }
    });
    if (changed) save();
  }
  
  /* ---------- init ---------- */
  (function init() {
    // request notification permission on start
    notifyPermission();
  
    // apply saved theme & lang
    setTheme(localStorage.getItem(STORAGE_KEYS.theme) || currentTheme);
    setLang(localStorage.getItem(STORAGE_KEYS.lang) || currentLang);
  
    render();
  
    // check reminders every 5 seconds
    setInterval(checkReminders, 5000);
  })();
  