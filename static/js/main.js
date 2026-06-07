// Тема
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
});

// Плавный скролл
window.addEventListener("scroll", () => {
    const scrollBtn = document.getElementById("scrollTopBtn");
    if (scrollBtn) {
        scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
    }
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

// Загрузка спектаклей
let currentPerformanceId = null;
let currentPerformancePrice = 0;

async function loadPerformances() {
    const container = document.getElementById("performancesContainer");
    if (!container) return;
    
    container.innerHTML = '<div class="loading">🎭 Загрузка...</div>';
    
    try {
        const response = await fetch("/api/performances");
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        container.innerHTML = '<div class="loading">❌ Ошибка загрузки</div>';
    }
}

function renderPerformances(performances) {
    const container = document.getElementById("performancesContainer");
    
    if (!performances || performances.length === 0) {
        container.innerHTML = '<div class="loading">😔 Спектакли не найдены</div>';
        return;
    }
    
    container.innerHTML = performances.map(perf => `
        <div class="card">
            <div class="card-inner">
                <img src="/static/images/${perf.image_url}" 
                     onerror="this.src='https://placehold.co/300x200/831717/fbc603?text=${perf.name}'">
                <div class="card-content">
                    <h4>${perf.name}</h4>
                    <p>📅 ${perf.date} ${perf.time}</p>
                    <p>💰 ${perf.price} ₽</p>
                    <p>💺 Свободно: ${perf.available_seats}</p>
                    <button class="btn-small book-btn" data-id="${perf.id}">🎫 Забронировать</button>
                </div>
            </div>
        </div>
    `).join("");
    
    document.querySelectorAll(".book-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.dataset.id);
            const isLoggedIn = document.querySelector('a[href="/profile"]') !== null;
            
            if (!isLoggedIn) {
                if (confirm("Для бронирования нужно войти в аккаунт. Перейти на страницу входа?")) {
                    window.location.href = "/login";
                }
                return;
            }
            
            await openBookingModal(id);
        });
    });
}

// Фильтрация
async function filterPerformances() {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    const searchTerm = document.getElementById("searchInput")?.value || "";
    
    try {
        const response = await fetch(`/api/performances?category=${activeFilter}&search=${encodeURIComponent(searchTerm)}`);
        const performances = await response.json();
        renderPerformances(performances);
    } catch (error) {
        console.error("Ошибка:", error);
    }
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        filterPerformances();
    });
});

document.getElementById("searchInput")?.addEventListener("input", filterPerformances);

// Бронирование
const modal = document.getElementById("bookingModal");

async function openBookingModal(performanceId) {
    currentPerformanceId = performanceId;
    
    try {
        const response = await fetch(`/api/performances/${performanceId}`);
        const performance = await response.json();
        currentPerformancePrice = performance.price;
        
        const ticketsCount = document.getElementById("ticketsCount");
        if (ticketsCount) {
            ticketsCount.max = performance.available_seats;
            ticketsCount.value = 1;
            updateTotalPrice();
        }
        
        if (modal) modal.style.display = "flex";
    } catch (error) {
        alert("Ошибка загрузки спектакля");
    }
}

function updateTotalPrice() {
    const count = parseInt(document.getElementById("ticketsCount")?.value) || 1;
    const totalSpan = document.getElementById("totalPrice");
    if (totalSpan) totalSpan.textContent = count * currentPerformancePrice;
}

document.getElementById("ticketsCount")?.addEventListener("input", updateTotalPrice);

document.getElementById("confirmBooking")?.addEventListener("click", async () => {
    const ticketsCount = parseInt(document.getElementById("ticketsCount").value);
    
    try {
        const response = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                performance_id: currentPerformanceId,
                tickets_count: ticketsCount
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            if (modal) modal.style.display = "none";
            filterPerformances();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert("Ошибка бронирования");
    }
});

// Закрытие модального окна
document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", () => {
        if (modal) modal.style.display = "none";
    });
});

window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
});

// Инициализация
if (document.getElementById("performancesContainer")) {
    loadPerformances();
}

setTimeout(() => {
    document.querySelectorAll(".fade-scroll").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.classList.add("visible");
        }
    });
}, 100);

// ========== ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК ==========
window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанная ошибка:', event.reason);
    showNotification('Произошла ошибка. Попробуйте позже.', 'error');
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `flash-message flash-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.animation = 'slideIn 0.5s ease';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ========== ОПТИМИЗАЦИЯ ЗАПРОСОВ ==========
let lastRequestTime = 0;
const REQUEST_DELAY = 300;

async function debouncedRequest(url, options = {}) {
    const now = Date.now();
    if (now - lastRequestTime < REQUEST_DELAY) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
    lastRequestTime = Date.now();
    return fetch(url, options);
}

// ========== ОБНОВЛЕНИЕ СВОБОДНЫХ МЕСТ В РЕАЛЬНОМ ВРЕМЕНИ ==========
async function updateAvailableSeats(performanceId) {
    try {
        const response = await fetch(`/api/performances/${performanceId}`);
        const performance = await response.json();
        
        // Находим карточку спектакля и обновляем отображение мест
        const card = document.querySelector(`.book-btn[data-id="${performanceId}"]`)?.closest('.card');
        if (card) {
            const seatsElement = card.querySelector('.available-seats');
            if (seatsElement) {
                seatsElement.textContent = `💺 Свободно: ${performance.available_seats}`;
            }
        }
        return performance.available_seats;
    } catch (error) {
        console.error('Ошибка обновления мест:', error);
        return null;
    }
}

// Обновляем места после успешного бронирования
const originalAlert = alert;
window.alert = function(message) {
    if (message.includes('успешно') && currentPerformanceId) {
        setTimeout(() => updateAvailableSeats(currentPerformanceId), 500);
    }
    originalAlert(message);
};
