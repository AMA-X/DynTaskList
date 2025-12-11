(() => {
  const STORAGE_KEY = 'taskBoard.v1';

  /** @typedef {{ id:string, title:string, status:'open'|'ongoing'|'closed', priority:1|2|3|4|5, assignedDate:null|string }} Task */

  /** @type {{ tasks: Task[] }} */
  const state = {
    tasks: [],
  };

  // Utilities
  const byId = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const parseDate = (s) => new Date(s + 'T00:00:00');

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  // Week helpers (ISO week: Monday is 1st day)
  function startOfISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Get day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to ISO: 0=Monday, 1=Tuesday, ..., 6=Sunday
    const dayOfWeek = d.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday (0) -> 6, Monday (1) -> 0, etc.
    // Go back to Monday
    d.setDate(d.getDate() - isoDayOfWeek);
    return d;
  }
  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
  function addWeeks(date, weeks) {
    return addDays(date, weeks * 7);
  }
  function getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    // January 4 is always in week 1.
    const week1 = new Date(d.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return (
      1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    );
  }

  // Persistence
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.tasks)) {
        state.tasks = data.tasks;
      }
    } catch (_) {
      // ignore
    }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: state.tasks }));
  }

  function seedBacklogIfMissing(titles) {
    const existingTitles = new Set(state.tasks.map((t) => t.title));
    let added = 0;
    for (const title of titles) {
      if (!existingTitles.has(title)) {
        state.tasks.push({ id: uid(), title, status: 'open', priority: 3, assignedDate: null });
        added++;
      }
    }
    if (added > 0) save();
  }

  // Rendering
  const weeksContainerEl = byId('weeksContainer');
  const backlogListEl = byId('backlogList');
  const weekTitleEl = byId('weekTitle');
  const weekDateRangeEl = byId('weekDateRange');
  const jumpToDateBtn = byId('jumpToDateBtn');
  const datePickerEl = byId('datePicker');
  const datePickerDaysEl = byId('datePickerDays');
  const datePickerMonthYearEl = byId('datePickerMonthYear');
  const datePickerPrevMonthBtn = byId('datePickerPrevMonth');
  const datePickerNextMonthBtn = byId('datePickerNextMonth');
  const datePickerTodayBtn = byId('datePickerToday');
  const datePickerClearBtn = byId('datePickerClear');

  let currentWeekStart = startOfISOWeek(new Date());
  let isInitialScroll = true;

  function renderWeekHeader() {
    const first = currentWeekStart;
    const last = addDays(first, 6); // Sunday of the same week (Monday + 6 days)
    const wStart = getISOWeek(first);
    weekTitleEl.textContent = `Week ${wStart}`;
    const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    weekDateRangeEl.textContent = `${fmt(first)} – ${fmt(last)}`;
    // Do not override the user's chosen date in the jump picker here.
  }

  function ensureDnD(el) {
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drop-hint');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-hint'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drop-hint');
      const taskId = e.dataTransfer.getData('text/plain');
      const dateTarget = el.getAttribute('data-date') || null;
      moveTaskTo(taskId, dateTarget);
    });
  }

  function createDayColumn(date) {
    const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
    const dayFull = date.toLocaleDateString(undefined, { weekday: 'long' });
    const dateStr = fmtDate(date);
    const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const col = document.createElement('div');
    const today = new Date();
    const isToday = dateStr === fmtDate(today);
    col.className = isToday ? 'day-col today' : 'day-col';

    const head = document.createElement('div');
    head.className = 'day-head';
    const nameEl = document.createElement('div');
    nameEl.className = 'day-name';
    nameEl.textContent = dayName;
    nameEl.title = dayFull;
    const dateEl = document.createElement('div');
    dateEl.className = 'day-date';
    dateEl.textContent = dateLabel;
    head.appendChild(nameEl);
    head.appendChild(dateEl);

    const list = document.createElement('div');
    list.className = 'day-list';
    list.setAttribute('data-dropzone', 'day');
    list.setAttribute('data-date', dateStr);

    ensureDnD(list);

    col.appendChild(head);
    col.appendChild(list);
    return col;
  }

  function renderWeeks() {
    weeksContainerEl.innerHTML = '';
    // Render 52 weeks total: 26 weeks back and 26 weeks forward from current week
    const weeksToRender = 52;
    const weeksBack = 26;
    const startWeek = addWeeks(currentWeekStart, -weeksBack);
    
    for (let w = 0; w < weeksToRender; w++) {
      const weekStart = addWeeks(startWeek, w);
      const weekEnd = addDays(weekStart, 6);
      const row = document.createElement('div');
      row.className = 'week';

      const head = document.createElement('div');
      head.className = 'week-row-head';
      const title = document.createElement('span');
      title.className = 'w-title';
      title.textContent = `Week ${getISOWeek(weekStart)}`;
      const range = document.createElement('span');
      range.className = 'w-range';
      const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      range.textContent = `${fmt(weekStart)} – ${fmt(weekEnd)}`;
      head.appendChild(title);
      head.appendChild(range);

      const grid = document.createElement('div');
      grid.className = 'week-grid';
      // Create days from Monday (0) to Sunday (6)
      // weekStart is already Monday from startOfISOWeek
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        grid.appendChild(createDayColumn(d));
      }

      row.appendChild(head);
      row.appendChild(grid);
      row.setAttribute('data-week-start', fmtDate(weekStart));
      weeksContainerEl.appendChild(row);
    }
    
    // Scroll to current week (week 26 in the rendered weeks)
    setTimeout(() => {
      const currentWeekRow = weeksContainerEl.children[weeksBack];
      if (currentWeekRow) {
        // Temporarily disable scroll updates during initial scroll
        if (weeksContainerEl._scrollHandler) {
          weeksContainerEl.removeEventListener('scroll', weeksContainerEl._scrollHandler);
        }
        
        currentWeekRow.scrollIntoView({ behavior: 'auto', block: 'start' });
        
        // Re-enable scroll listener after scroll completes
        // Don't call updateCurrentWeekFromScroll() here - we already have the correct week
        setTimeout(() => {
          if (weeksContainerEl._scrollHandler) {
            weeksContainerEl.addEventListener('scroll', weeksContainerEl._scrollHandler);
          }
          // Mark initial scroll as complete
          isInitialScroll = false;
        }, 300);
      }
    }, 100);
  }
  
  function updateCurrentWeekFromScroll() {
    const container = weeksContainerEl;
    if (!container || container.children.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    
    // Find the week that is actually visible at the top
    // Use Intersection Observer approach: find the week whose top edge
    // is at or just below the container top
    
    let topWeek = null;
    let minDistance = Infinity;
    
    // Find the first week whose top edge is at or below container top
    // This should be the snapped week
    for (const weekRow of container.children) {
      const rect = weekRow.getBoundingClientRect();
      const weekTop = rect.top;
      
      // The week at the top should have its top edge at or just below container top
      if (weekTop >= containerTop - 5 && weekTop <= containerTop + 5) {
        const distance = Math.abs(weekTop - containerTop);
        if (distance < minDistance) {
          minDistance = distance;
          topWeek = weekRow;
        }
      }
    }
    
    // If no week found with top at container top, find the first visible one
    if (!topWeek) {
      for (const weekRow of container.children) {
        const rect = weekRow.getBoundingClientRect();
        // Find the first week that is actually visible at the top
        if (rect.top >= containerTop - 10 && rect.top <= containerTop + 10 && rect.bottom > containerTop) {
          topWeek = weekRow;
          break;
        }
      }
    }
    
    if (topWeek) {
      const weekStartStr = topWeek.getAttribute('data-week-start');
      if (weekStartStr) {
        const newWeekStart = parseDate(weekStartStr);
        if (newWeekStart.getTime() !== currentWeekStart.getTime()) {
          currentWeekStart = newWeekStart;
          renderWeekHeader();
        }
      }
    }
  }
  

  function renderTasks() {
    // Clear lists
    backlogListEl.innerHTML = '';
    qsa('.day-list').forEach((el) => (el.innerHTML = ''));

    const tasks = clone(state.tasks);

    for (const task of tasks) {
      const card = renderTaskCard(task);
      if (task.assignedDate) {
        const target = qs(`.day-list[data-date="${task.assignedDate}"]`);
        if (target) target.appendChild(card);
      } else {
        backlogListEl.appendChild(card);
      }
    }

    // Sort backlog by priority (1 highest) then title
    const backlogCards = Array.from(backlogListEl.children);
    backlogCards.sort((a, b) => {
      const ta = state.tasks.find((t) => t.id === a.dataset.id);
      const tb = state.tasks.find((t) => t.id === b.dataset.id);
      const pa = ta && typeof ta.priority === 'number' ? ta.priority : 3;
      const pb = tb && typeof tb.priority === 'number' ? tb.priority : 3;
      if (pa !== pb) return pa - pb;
      const na = ta ? ta.title : '';
      const nb = tb ? tb.title : '';
      return na.localeCompare(nb);
    });
    backlogCards.forEach((c) => backlogListEl.appendChild(c));
  }

  function renderTaskCard(task) {
    const tmpl = byId('taskCardTemplate');
    const node = tmpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    const titleEl = qs('.task-title', node);
    const delBtn = qs('.delete-btn', node);
    const statusSel = qs('.status-select', node);
    const prioritySel = qs('.priority-select', node);

    titleEl.textContent = task.title;
    statusSel.value = task.status;
    if (prioritySel) prioritySel.value = String(task.priority ?? 3);
    setCardStatusClass(node, task.status);

    node.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      requestAnimationFrame(() => node.classList.add('dragging'));
    });
    node.addEventListener('dragend', () => node.classList.remove('dragging'));

    statusSel.addEventListener('change', () => {
      updateTask(task.id, { status: statusSel.value });
    });
    if (prioritySel) {
      prioritySel.addEventListener('change', () => {
        updateTask(task.id, { priority: parseInt(prioritySel.value, 10) });
      });
    }

    delBtn.addEventListener('click', () => {
      if (confirm('Delete this task?')) deleteTask(task.id);
    });

    return node;
  }

  function setCardStatusClass(card, status) {
    card.classList.remove('status-open', 'status-ongoing', 'status-closed');
    card.classList.add(`status-${status}`);
  }

  // Actions
  function addTask(title, priority = 3) {
    const task = { id: uid(), title, status: 'open', priority: parseInt(priority, 10), assignedDate: null };
    state.tasks.push(task);
    save();
    renderTasks();
  }
  function updateTask(id, updates) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, updates);
    save();
    renderTasks();
  }
  function deleteTask(id) {
    state.tasks = state.tasks.filter((x) => x.id !== id);
    save();
    renderTasks();
  }
  function moveTaskTo(id, assignedDate) {
    updateTask(id, { assignedDate });
  }

  // Events
  function bindEvents() {
    byId('addTaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = byId('taskTitleInput').value.trim();
      const priority = byId('taskPriorityInput').value;
      if (!title) return;
      addTask(title, priority);
      byId('taskTitleInput').value = '';
      byId('taskTitleInput').focus();
    });

    byId('prevWeekBtn').addEventListener('click', () => {
      currentWeekStart = addWeeks(currentWeekStart, -1);
      renderWeekHeader();
      renderWeeks();
      renderTasks();
    });
    byId('nextWeekBtn').addEventListener('click', () => {
      currentWeekStart = addWeeks(currentWeekStart, 1);
      renderWeekHeader();
      renderWeeks();
      renderTasks();
    });
    jumpToDateEl.addEventListener('change', () => {
      const d = parseDate(jumpToDateEl.value);
      if (!isNaN(d)) {
        // Ensure we start on Monday of the week containing the selected date
        currentWeekStart = startOfISOWeek(d);
        renderWeekHeader();
        renderWeeks();
        renderTasks();
        // Ensure scroll listener is active after render
        isInitialScroll = false;
      }
    });

    ensureDnD(backlogListEl);
    
    // Update current week when scrolling
    let scrollTimeout;
    const scrollHandler = () => {
      // Don't update during initial scroll
      if (isInitialScroll) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateCurrentWeekFromScroll();
      }, 150);
    };
    weeksContainerEl._scrollHandler = scrollHandler;
    weeksContainerEl.addEventListener('scroll', scrollHandler);
  }

  // Init
  load();
  // Migration: add default priority to existing tasks
  let migrated = false;
  for (const t of state.tasks) {
    if (typeof t.priority !== 'number') { t.priority = 3; migrated = true; }
  }
  if (migrated) save();
  seedBacklogIfMissing([
    'Optiker',
    'Hälsoundersökning',
    'Linkedin?',
    'Språk',
    'Pionex bot',
    'Stop-loss',
    'TRR',
    'HDD',
    'USB HD',
    'Basics',
    'BTCX',
    'Mycelium',
    'BTC node(s)',
    'Båt',
    'Kolla läget med mina',
    'Försäkringar',
    'Pension',
    'Flyg',
    'Resa',
    'Rödljus',
    'Kampsport',
    'Webbkamera',
  ]);
  bindEvents();
  renderWeekHeader();
  renderWeeks();
  renderTasks();
})();


