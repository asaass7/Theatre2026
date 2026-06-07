// Тема
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

// Скролл топ
window.addEventListener("scroll", () => {
    const scrollBtn = document.getElementById("scrollTopBtn");
    if (scrollBtn) {
        scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
    }
    
    // Анимация при скролле
    document.querySelectorAll(".fade-scroll").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 100) {
            el.classList.add("visible");
        }
    });
});

document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Таймер
function updateCountdown() {
    const target = new Date(2026, 3, 15, 19, 0, 0);
    const now = new Date();
    const diff = target - now;
    const countdownEl = document.getElementById("countdown");
    
    if (countdownEl) {
        if (diff <= 0) {
            countdownEl.innerHTML = "Премьера уже началась! 🎭";
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);
            countdownEl.innerHTML = `${days}д ${hours}ч ${mins}м ${secs}с`;
        }
    }
}

setInterval(updateCountdown, 1000);
updateCountdown();

// Редактирование профиля
const editBtn = document.getElementById("editProfileBtn");
const editForm = document.getElementById("editForm");
const cancelBtn = document.getElementById("cancelEditBtn");

if (editBtn) {
    editBtn.addEventListener("click", () => {
        editForm.style.display = "block";
        editBtn.style.display = "none";
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        editForm.style.display = "none";
        editBtn.style.display = "inline-block";
    });
}

// Загрузка спектаклей через API
let currentPerformanceId = null;

async function loadPerformances() {
    const container = document.getElementById("performancesContainer");
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const response = await fetch("/api/performances");
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        container.innerHTML = '<div class="loading">Ошибка загрузки спектаклей</div>';
    }
}

function renderPerformances(performances) {
    const container = document.getElementById("performancesContainer");
    
    if (!performances || performances.length === 0) {
        container.innerHTML = '<div class="loading">Спектакли не найдены</div>';
        return;
    }
    
    container.innerHTML = performances.map(perf => `
        <div class="card" data-category="${perf.category}" data-name="${perf.name}">
            <div class="card-inner">
                <img src="/static/images/${perf.image_url}" 
                     onerror="this.src='https://placehold.co/280x180/831717/fbc603?text=${perf.name}'">
                <div class="card-content">
                    <h4>${perf.name}</h4>
                    <p><i class="fas fa-calendar"></i> ${perf.date} ${perf.time}</p>
                    <p><i class="fas fa-tag"></i> ${perf.price} ₽</p>
                    <p><i class="fas fa-chair"></i> Свободно мест: ${perf.available_seats}</p>
                    <button class="btn-small book-btn" data-id="${perf.id}">Забронировать</button>
                </div>
            </div>
        </div>
    `).join("");
    
    // Добавляем обработчики для кнопок бронирования
    document.querySelectorAll(".book-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            openBookingModal(id);
        });
    });
}

// Фильтрация и поиск
const filterBtns = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");

async function filterPerformances() {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    const searchTerm = searchInput?.value || "";
    
    try {
        const response = await fetch(`/api/performances?category=${activeFilter}&search=${encodeURIComponent(searchTerm)}`);
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        console.error("Ошибка фильтрации:", error);
    }
}

filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filterPerformances();
    });
});

if (searchInput) {
    searchInput.addEventListener("input", debounce(filterPerformances, 300));
}

// Модальное окно бронирования
const modal = document.getElementById("bookingModal");
const ticketsCountInput = document.getElementById("ticketsCount");
const totalPriceSpan = document.getElementById("totalPrice");
let currentPerformancePrice = 0;

async function openBookingModal(performanceId) {
    currentPerformanceId = performanceId;
    
    try {
        const response = await fetch(`/api/performances/${performanceId}`);
        const performance = await response.json();
        currentPerformancePrice = performance.price;
        
        if (ticketsCountInput) {
            ticketsCountInput.max = performance.available_seats;
            updateTotalPrice();
        }
        
        modal.style.display = "flex";
    } catch (error) {
        console.error("Ошибка загрузки спектакля:", error);
        alert("Не удалось загрузить информацию о спектакле");
    }
}

if (ticketsCountInput) {
    ticketsCountInput.addEventListener("input", updateTotalPrice);
}

function updateTotalPrice() {
    const count = parseInt(ticketsCountInput.value) || 1;
    totalPriceSpan.textContent = count * currentPerformancePrice;
}

// Подтверждение бронирования
const confirmBtn = document.getElementById("confirmBooking");
if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
        const ticketsCount = parseInt(ticketsCountInput.value);
        
        try {
            const response = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    performance_id: currentPerformanceId,
                    tickets_count: ticketsCount
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                modal.style.display = "none";
                filterPerformances(); // Обновляем список
                if (typeof loadUserBookings === "function") loadUserBookings();
            } else {
                alert(result.error || "Ошибка бронирования");
            }
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Произошла ошибка при бронировании");
        }
    });
}

// Закрытие модального окна
const closeBtns = document.querySelectorAll(".close");
closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        modal.style.display = "none";
    });
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Функция для отмены бронирования
window.cancelBooking = async function(bookingId) {
    if (confirm("Вы уверены, что хотите отменить бронирование?")) {
        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: "DELETE"
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                location.reload();
            } else {
                alert(result.error || "Ошибка отмены бронирования");
            }
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Произошла ошибка");
        }
    }
};

// Загружаем спектакли при загрузке страницы
if (document.getElementById("performancesContainer")) {
    loadPerformances();
}

// Вспомогательная функция debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}