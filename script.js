class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem("todos")) || [];
        this.completedTodos =
            JSON.parse(localStorage.getItem("completedTodos")) || [];
        this.currentFilter = "all";
        this.viewMode = localStorage.getItem("viewMode") || "list";
        this.reminderInterval = null;
        this.todoToComplete = null;
        this.cleanupCompletedTodos();
        this.init();
    }

    init() {
        this.initTheme();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.setupReminders();
    }

    bindEvents() {
        const todoInput = document.getElementById("todoInput");
        const addTodo = document.getElementById("addTodo");
        const filterBtns = document.querySelectorAll(".filter-btn");
        const toggleViewBtn = document.getElementById("toggleViewBtn");
        const confirmModal = document.getElementById("confirmModal");
        const confirmYes = document.getElementById("confirmYes");
        const confirmNo = document.getElementById("confirmNo");

        addTodo.addEventListener("click", () => this.addTodo());
        todoInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.addTodo();
        });

        filterBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                if (e.target.id === "toggleViewBtn") return;
                filterBtns.forEach((b) => b.classList.remove("active"));
                e.target.classList.add("active");
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });

        toggleViewBtn.addEventListener("click", () => {
            this.viewMode = this.viewMode === "list" ? "grid" : "list";
            localStorage.setItem("viewMode", this.viewMode);
            toggleViewBtn.textContent =
                this.viewMode === "list" ? "Grid View" : "List View";
            this.render();
        });
        toggleViewBtn.textContent =
            this.viewMode === "list" ? "Grid View" : "List View";

        confirmYes.addEventListener("click", () => {
            if (this.todoToComplete !== null) {
                this.confirmCompleteTodo(this.todoToComplete);
                this.todoToComplete = null;
            }
            confirmModal.style.display = "none";
        });
        confirmNo.addEventListener("click", () => {
            this.todoToComplete = null;
            confirmModal.style.display = "none";
        });

        // Theme toggle
        const themeToggleBtn = document.getElementById("themeToggleBtn");
        const themeToggleIcon = document.getElementById("themeToggleIcon");
        themeToggleBtn.addEventListener("click", () => {
            const isLight = document.body.classList.toggle("light-theme");
            if (isLight) {
                localStorage.setItem("theme", "light");
            } else {
                localStorage.setItem("theme", "dark");
            }
            this.setThemeIcon(isLight);
        });

        // Custom dropdown logic
        const dropdown = document.getElementById('priorityDropdown');
        const selected = document.getElementById('prioritySelected');
        const optionsBox = document.getElementById('priorityOptions');
        const options = document.querySelectorAll('.custom-dropdown-option');
        const hiddenInput = document.getElementById('prioritySelect');

        let isOpen = false;

        function closeDropdown() {
            optionsBox.style.display = 'none';
            isOpen = false;
        }

        function openDropdown() {
            optionsBox.style.display = 'block';
            isOpen = true;
        }

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const label = option.textContent;
                selected.textContent = label;
                hiddenInput.value = value;
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                closeDropdown();
            });
        });

        document.addEventListener('click', (e) => {
            if (isOpen) closeDropdown();
        });

        // Keyboard navigation (optional, for accessibility)
        dropdown.addEventListener('keydown', (e) => {
            if (!isOpen && (e.key === ' ')) {
                openDropdown();
                e.preventDefault();
            } else if (isOpen) {
                const current = Array.from(options).findIndex(opt => opt.classList.contains('selected'));
                if (e.key === 'ArrowDown') {
                    let next = (current + 1) % options.length;
                    options.forEach(opt => opt.classList.remove('selected'));
                    options[next].classList.add('selected');
                    selected.textContent = options[next].textContent;
                    hiddenInput.value = options[next].getAttribute('data-value');
                    e.preventDefault();
                } else if (e.key === 'ArrowUp') {
                    let prev = (current - 1 + options.length) % options.length;
                    options.forEach(opt => opt.classList.remove('selected'));
                    options[prev].classList.add('selected');
                    selected.textContent = options[prev].textContent;
                    hiddenInput.value = options[prev].getAttribute('data-value');
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    closeDropdown();
                    e.preventDefault();
                } else if (e.key === 'Enter') {
                    closeDropdown();
                    e.preventDefault();
                }
            }
        });

        const inputWrapper = document.querySelector('.input-wrapper');
        inputWrapper.addEventListener('keydown', (e) => {
            const optionsBox = document.getElementById('priorityOptions');
            const isDropdownOpen = optionsBox && optionsBox.style.display === 'block';
            if (e.key === 'Enter' && !isDropdownOpen) {
                e.preventDefault();
                this.addTodo();
            }
        });

        // Add keydown to custom dropdown for Enter
        const customDropdown = document.getElementById('priorityDropdown');
        customDropdown.addEventListener('keydown', (e) => {
            const optionsBox = document.getElementById('priorityOptions');
            const isDropdownOpen = optionsBox && optionsBox.style.display === 'block';
            if (e.key === 'Enter' && !isDropdownOpen) {
                e.preventDefault();
                this.addTodo();
            }
        });
    }

    addTodo() {
        const input = document.getElementById("todoInput");
        const prioritySelect = document.getElementById("prioritySelect");
        const text = input.value.trim();
        const priority = prioritySelect ? prioritySelect.value : "medium";
        if (!text) return;
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: priority,
        };
        this.todos.push(todo);
        input.value = "";
        if (prioritySelect) prioritySelect.value = "medium";
        // Reset custom dropdown UI
        const selected = document.getElementById('prioritySelected');
        if (selected) selected.textContent = 'Medium';
        const options = document.querySelectorAll('.custom-dropdown-option');
        options.forEach(opt => opt.classList.remove('selected'));
        if (options[1]) options[1].classList.add('selected'); // Medium
        this.saveTodos();
        this.render();
        this.updateStats();
    }

    toggleTodo(id) {
        // If todo is completed, uncheck and move to pending
        const idxCompleted = this.completedTodos.findIndex((t) => t.id === id);
        if (idxCompleted !== -1) {
            // Move back to todos
            const todo = this.completedTodos[idxCompleted];
            this.completedTodos.splice(idxCompleted, 1);
            this.todos.unshift({
                ...todo,
                completed: false,
                completedAt: undefined,
            });
            this.saveTodos();
            this.saveCompletedTodos();
            this.render();
            this.updateStats();
            return;
        }
        // Otherwise, show confirmation modal to mark as complete
        this.todoToComplete = id;
        document.getElementById("confirmModal").style.display = "flex";
    }

    confirmCompleteTodo(id) {
        const idx = this.todos.findIndex((t) => t.id === id);
        if (idx !== -1) {
            const todo = this.todos[idx];
            // Move to completedTodos with completedAt
            this.completedTodos.unshift({
                ...todo,
                completed: true,
                completedAt: new Date().toISOString(),
            });
            this.todos.splice(idx, 1);
            this.saveTodos();
            this.saveCompletedTodos();
            this.render();
            this.updateStats();
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter((t) => t.id !== id);
        this.saveTodos();
        this.render();
        this.updateStats();
    }

    getFilteredTodos() {
        let todos = this.currentFilter === "completed" ? this.completedTodos : this.todos;
        // Sort by priority (high > medium > low), then by createdAt ascending (oldest first)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return todos.slice().sort((a, b) => {
            const pa = priorityOrder[a.priority || 'medium'];
            const pb = priorityOrder[b.priority || 'medium'];
            if (pa !== pb) return pa - pb;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }

    render() {
        const todoList = document.getElementById("todoList");
        let filteredTodos = this.getFilteredTodos();

        if (filteredTodos.length === 0) {
            todoList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✨</div>
                    <h3 class="empty-title">No tasks yet</h3>
                    <p class="empty-subtitle">Add your first task to get started</p>
                </div>
            `;
            return;
        }

        if (this.viewMode === "grid") {
            todoList.style.display = "grid";
            todoList.style.gridTemplateColumns =
                "repeat(auto-fit, minmax(220px, 1fr))";
            todoList.style.gap = "16px";
        } else {
            todoList.style.display = "";
            todoList.style.gridTemplateColumns = "";
            todoList.style.gap = "";
        }

        todoList.innerHTML = filteredTodos
            .map((todo) => {
                const priorityLabel = todo.priority ? todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1) : "Medium";
                const priorityClass = todo.priority ? todo.priority : "medium";
                if (this.viewMode === "grid") {
                    return `
                <div class="todo-item card">
                    <div class="card-top-row" style="display: flex; align-items: center; justify-content: space-between;">
                        <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
                        <div class="card-actions">
                            <button class="card-btn complete" data-id="${todo.id}" title="${todo.completed ? "Mark as pending" : "Mark as complete"}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2" fill="none"/>
                                    <path d="M8 12.5l2.5 2.5 5-5" stroke="#10b981" stroke-width="2" fill="none"/>
                                </svg>
                            </button>
                            ${!todo.completed ? `<button class="card-btn delete" data-id="${todo.id}" title="Delete task">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="12" rx="2" stroke="#ef4444" stroke-width="2" fill="none"/><path d="M9 11v4M15 11v4" stroke="#ef4444" stroke-width="2"/><path d="M10 7V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" stroke="#ef4444" stroke-width="2"/></svg>
                            </button>` : ""}
                        </div>
                    </div>
                    <div class="card-content">
                        <span class="todo-text ${todo.completed ? "completed" : ""}" data-id="${todo.id}">${todo.text}</span>
                    </div>
                </div>
                `;
                } else {
                    return `
                <div class="todo-item" style="${
                    this.viewMode === "grid" ? "margin-bottom:0;" : ""
                }">
                    <div class="todo-content">
                        <div class="todo-left">
                            <div 
                                class="todo-checkbox ${
                                    todo.completed ? "completed" : ""
                                }"
                                data-id="${todo.id}"
                            >
                                ${todo.completed ? "✓" : ""}
                            </div>
                            <span class="todo-text ${
                                todo.completed ? "completed" : ""
                            }" data-id="${todo.id}">
                                ${todo.text}
                            </span>
                            <span class="priority-badge ${priorityClass}">${priorityLabel}</span>
                        </div>
                        ${
                            !todo.completed
                                ? `
                        <button 
                            class="delete-btn"
                            data-id="${todo.id}"
                            title="Delete task"
                        >
                            ✕
                        </button>
                        `
                                : ""
                        }
                    </div>
                </div>
                `;
                }
            })
            .join("");

        // Attach event listeners after rendering
        // Complete (toggle) buttons
        document.querySelectorAll(".card-btn.complete").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                this.toggleTodo(Number(id));
            });
        });
        // Delete buttons (grid)
        document.querySelectorAll(".card-btn.delete").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                this.deleteTodo(Number(id));
            });
        });
        // Delete buttons (list)
        document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-id");
                this.deleteTodo(Number(id));
            });
        });
        // Todo text click (for delete in pending)
        document.querySelectorAll(".todo-text").forEach((span) => {
            span.addEventListener("click", (e) => {
                const id = span.getAttribute("data-id");
                this.handleTodoClick(Number(id));
            });
        });
        // Checkbox click (list)
        document.querySelectorAll(".todo-checkbox").forEach((box) => {
            box.addEventListener("click", (e) => {
                const id = box.getAttribute("data-id");
                this.toggleTodo(Number(id));
            });
        });
    }

    updateStats() {
        const total = this.todos.length + this.completedTodos.length;
        const completed = this.completedTodos.length;
        const pending = this.todos.length;

        document.getElementById("totalTasks").textContent = total;
        document.getElementById("completedTasks").textContent = completed;
        document.getElementById("pendingTasks").textContent = pending;
    }

    saveTodos() {
        localStorage.setItem("todos", JSON.stringify(this.todos));
    }
    saveCompletedTodos() {
        localStorage.setItem(
            "completedTodos",
            JSON.stringify(this.completedTodos)
        );
    }

    cleanupCompletedTodos() {
        // Remove completed todos older than 1 day (24 hours)
        const now = Date.now();
        this.completedTodos = (this.completedTodos || []).filter((todo) => {
            if (!todo.completedAt) return true;
            const completedTime = new Date(todo.completedAt).getTime();
            return now - completedTime < 24 * 60 * 60 * 1000;
        });
        this.saveCompletedTodos();
    }

    setupReminders() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }

        this.reminderInterval = setInterval(() => {
            this.playReminderSound();
            this.showReminderNotification();
        }, 3600000); // 1 hour
    }

    playReminderSound() {
        const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

        notes.forEach((frequency, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(
                frequency,
                audioContext.currentTime
            );
            oscillator.type = "sine";

            gainNode.gain.setValueAtTime(
                0,
                audioContext.currentTime + index * 0.3
            );
            gainNode.gain.linearRampToValueAtTime(
                0.1,
                audioContext.currentTime + index * 0.3 + 0.1
            );
            gainNode.gain.linearRampToValueAtTime(
                0,
                audioContext.currentTime + index * 0.3 + 0.4
            );

            oscillator.start(audioContext.currentTime + index * 0.3);
            oscillator.stop(audioContext.currentTime + index * 0.3 + 0.4);
        });
    }

    showReminderNotification() {
        const pendingTasks = this.todos.length;

        if (pendingTasks > 0) {
            const notification = document.createElement("div");
            notification.className = "notification";
            notification.innerHTML = `
                        <div class="notification-content">
                            <div class="notification-icon">⏰</div>
                            <div class="notification-text">
                                <div class="notification-title">Reminder</div>
                                <div class="notification-subtitle">You have ${pendingTasks} pending task${
                pendingTasks > 1 ? "s" : ""
            }</div>
                            </div>
                            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
                        </div>
                    `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.add("show");
            }, 100);

            setTimeout(() => {
                if (notification.parentElement) {
                    notification.classList.remove("show");
                    setTimeout(() => notification.remove(), 500);
                }
            }, 5000);
        }
    }

    handleTodoClick(id) {
        // In pending tab, clicking a todo removes it
        if (
            this.currentFilter === "pending" &&
            this.todos.some((t) => t.id === id)
        ) {
            this.deleteTodo(id);
        }
    }

    setThemeIcon(isLight) {
        const iconSpan = document.getElementById("themeToggleIcon");
        if (isLight) {
            // Minimal sun SVG
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${
                document.body.classList.contains("light-theme")
                    ? "#6366f1"
                    : "#fff"
            }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
        } else {
            // Minimal moon SVG
            iconSpan.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${
                document.body.classList.contains("light-theme")
                    ? "#6366f1"
                    : "#fff"
            }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>`;
        }
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        let isLight = false;
        if (savedTheme === "light") {
            document.body.classList.add("light-theme");
            isLight = true;
        } else if (savedTheme === "dark") {
            document.body.classList.remove("light-theme");
            isLight = false;
        } else {
            // No saved theme, use system preference
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
            if (!prefersDark) {
                document.body.classList.add("light-theme");
                isLight = true;
            } else {
                document.body.classList.remove("light-theme");
                isLight = false;
            }
        }
        this.setThemeIcon(isLight);
    }
}

const app = new TodoApp();
