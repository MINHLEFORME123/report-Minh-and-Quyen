
// Import các hàm từ Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, getDocs, query, where, Timestamp, orderBy 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCh1zPuWrZ6g3UHQPJeahp--96vHoiRB-k",
    authDomain: "minhkiot-7f5d6.firebaseapp.com",
    projectId: "minhkiot-7f5d6",
    storageBucket: "minhkiot-7f5d6.firebasestorage.app",
    messagingSenderId: "25045319035",
    appId: "1:25045319035:web:30e7e5d07dc3a75c8411de",
    measurementId: "G-FZHVBC1NFG"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lấy các phần tử DOM
const revenueTotalTodayEl = document.getElementById('revenue-total-today');
const revenueVsYesterdayEl = document.getElementById('revenue-vs-yesterday');
const revenueVsLastweekEl = document.getElementById('revenue-vs-lastweek');
const yesterdayChangeEl = document.getElementById('yesterday-change');
const lastweekChangeEl = document.getElementById('lastweek-change');
const orderCountTodayEl = document.getElementById('order-count-today');
const ordersListEl = document.getElementById('orders-list');
const orderListTitleEl = document.getElementById('order-list-title');
const dateStartInput = document.getElementById('dateStart');
const dateEndInput = document.getElementById('dateEnd');
const searchBtn = document.getElementById('searchBtn');
const resetBtn = document.getElementById('resetBtn');
const searchSummaryEl = document.getElementById('search-results-summary');
const loadingOverlay = document.getElementById('loadingOverlay');

// Tab elements
const tabTodayBtn = document.getElementById('tab-today');
const tabMonthlyBtn = document.getElementById('tab-monthly');
const dailyChartCanvas = document.getElementById('dailyRevenueChart');
const monthlyChartCanvas = document.getElementById('monthlyRevenueChart');

let todayOrdersUnsubscribe = null;
let monthlyChart = null;
let dailyChart = null;

// --- LOADING FUNCTIONS ---
function showLoading() {
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

// --- HÀM TÍNH TOÁN NGÀY ---
function getTodayDateRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function getYesterdayDateRange() {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function getLastWeekSameDayDateRange() {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

function getYearDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear() + 1, 0, 1);
    return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

// --- HÀM RENDER ---
function renderOrderCard(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    let time = order.createdAt?.toDate()?.toLocaleTimeString('vi-VN') || 'Không rõ';
    let itemsHtml = order.items.map(item => `
        <li>${item.quantity}x ${item.name.vi} (${item.price.toLocaleString()}€) ${item.note ? `<br><i>Ghi chú: ${item.note}</i>` : ''}</li>
    `).join('');
    orderElement.innerHTML = `
        <div class="order-card-header">
            <h3>${order.tableNumber} - Lúc: ${time}</h3>
            <span class="order-total">${order.total.toLocaleString()}€</span>
        </div>
        <p>Thanh toán: ${order.paymentMethod}</p>
        <ul>${itemsHtml}</ul>`;
    return orderElement;
}

function displayOrders(docs, listElement, summaryElement = null, dateRangeText = "") {
    let totalRevenue = 0;
    let orderCount = 0;
    listElement.innerHTML = '';

    if (!docs || docs.length === 0) {
        listElement.innerHTML = `<p>Không tìm thấy đơn hàng nào ${dateRangeText}.</p>`;
        if (summaryElement) summaryElement.textContent = `Tìm thấy 0 đơn hàng ${dateRangeText}. Tổng doanh thu: 0€`;
        return { totalRevenue: 0, orderCount: 0 };
    }

    const sortedDocsData = docs.map(doc => ({ id: doc.id, ...doc.data() }))
                               .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    sortedDocsData.forEach(order => {
        totalRevenue += order.total;
        orderCount++;
        listElement.appendChild(renderOrderCard(order));
    });

    if (summaryElement) {
        summaryElement.textContent = `Tìm thấy ${orderCount} đơn hàng ${dateRangeText}. Tổng doanh thu: ${totalRevenue.toLocaleString()}€`;
    }

    return { totalRevenue, orderCount };
}

function handleError(error, element) {
    console.error("Lỗi Firestore: ", error);
    let message = `<p style="color: red; font-weight: bold;">Đã xảy ra lỗi khi tải dữ liệu.</p>`;
    if (error.code === 'failed-precondition') {
        message = `<p style="color: red; font-weight: bold;">LỖI: Cần tạo Index trong Firestore.<br>Hãy mở Console (F12), tìm lỗi màu đỏ và nhấp vào link để Firebase tự động tạo index.</p>`;
    } else if (error.code === 'permission-denied') {
        message = `<p style="color: red; font-weight: bold;">LỖI BẢO MẬT: Bạn không có quyền xem dữ liệu này.</p>`;
    }
    element.innerHTML = message;
}

// --- HÀM LẤY DỮ LIỆU SO SÁNH ---
async function getRevenueForDateRange(start, end) {
    try {
        const q = query(collection(db, "orders"),
            where("status", "==", "completed"),
            where("createdAt", ">=", start),
            where("createdAt", "<", end)
        );
        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
            total += doc.data().total;
        });
        console.log(`Doanh thu từ ${start.toDate()} đến ${end.toDate()}: ${total}€`);
        return total;
    } catch (error) {
        console.error("Lỗi khi lấy doanh thu:", error);
        return 0;
    }
}

function displayComparison(current, previous, element, changeElement, label) {
    console.log(`So sánh ${label} - Hiện tại: ${current}, Trước: ${previous}`);
    
    element.textContent = `${current.toLocaleString()}€`;
    
    if (previous > 0) {
        const difference = current - previous;
        const percent = ((difference / previous) * 100).toFixed(1);
        
        if (difference > 0) {
            changeElement.textContent = `(+${percent}%)`;
            changeElement.className = 'change-indicator positive';
            console.log(`% ${label}: +${percent}% - màu xanh`);
        } else if (difference < 0) {
            changeElement.textContent = `(${percent}%)`;
            changeElement.className = 'change-indicator negative';
            console.log(`% ${label}: ${percent}% - màu đỏ`);
        } else {
            changeElement.textContent = `(0%)`;
            changeElement.className = 'change-indicator';
            console.log(`% ${label}: 0%`);
        }
    } else if (previous === 0 && current > 0) {
        changeElement.textContent = `(+∞%)`;
        changeElement.className = 'change-indicator positive';
        console.log(`% ${label}: +∞% - màu xanh`);
    } else {
        changeElement.textContent = '';
        changeElement.className = 'change-indicator';
        console.log(`% ${label}: không có dữ liệu`);
    }
}

// --- HÀM LẤY DỮ LIỆU ---

// Lắng nghe đơn hàng hôm nay (real-time) và cập nhật so sánh
async function listenForTodayOrders() {
    console.log("Bắt đầu lắng nghe đơn hàng hôm nay...");
    orderListTitleEl.textContent = "Chi tiết đơn hàng hôm nay";
    searchSummaryEl.textContent = "";
    if (todayOrdersUnsubscribe) todayOrdersUnsubscribe();

    const { start, end } = getTodayDateRange();
    const q = query(collection(db, "orders"),
        where("status", "==", "completed"),
        where("createdAt", ">=", start),
        where("createdAt", "<", end),
        orderBy("createdAt", "desc")
    );

    // Lấy dữ liệu so sánh
    console.log("Đang lấy dữ liệu so sánh...");
    const yesterdayRange = getYesterdayDateRange();
    const lastWeekRange = getLastWeekSameDayDateRange();
    
    try {
        const yesterdayRevenue = await getRevenueForDateRange(yesterdayRange.start, yesterdayRange.end);
        const lastWeekRevenue = await getRevenueForDateRange(lastWeekRange.start, lastWeekRange.end);

        console.log("Doanh thu hôm qua:", yesterdayRevenue);
        console.log("Doanh thu tuần trước:", lastWeekRevenue);

        todayOrdersUnsubscribe = onSnapshot(q, (snapshot) => {
            const { totalRevenue, orderCount } = displayOrders(snapshot.docs, ordersListEl);
            console.log("Doanh thu hôm nay:", totalRevenue);
            
            revenueTotalTodayEl.textContent = `${totalRevenue.toLocaleString()}€`;
            orderCountTodayEl.textContent = orderCount;
            
            // Hiển thị so sánh
            displayComparison(totalRevenue, yesterdayRevenue, revenueVsYesterdayEl, yesterdayChangeEl, "hôm qua");
            displayComparison(totalRevenue, lastWeekRevenue, revenueVsLastweekEl, lastweekChangeEl, "tuần trước");
            
            hideLoading();
        }, (error) => {
            console.error("Lỗi onSnapshot:", error);
            handleError(error, ordersListEl);
            revenueTotalTodayEl.textContent = 'Lỗi';
            orderCountTodayEl.textContent = 'Lỗi';
            hideLoading();
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu so sánh:", error);
        handleError(error, ordersListEl);
        revenueTotalTodayEl.textContent = 'Lỗi';
        orderCountTodayEl.textContent = 'Lỗi';
        hideLoading();
    }
}

// Tìm kiếm đơn hàng theo khoảng ngày (one-time fetch)
async function searchOrdersByDateRange() {
    const startDateStr = dateStartInput.value;
    const endDateStr = dateEndInput.value;

    if (!startDateStr || !endDateStr) {
        alert("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.");
        return;
    }

    showLoading();
    if (todayOrdersUnsubscribe) {
        console.log("Hủy lắng nghe đơn hàng hôm nay.");
        todayOrdersUnsubscribe();
        todayOrdersUnsubscribe = null;
    }

    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    const dateRangeText = `từ ${start.toLocaleDateString('vi-VN')} đến ${end.toLocaleDateString('vi-VN')}`;
    orderListTitleEl.textContent = `Kết quả tìm kiếm ${dateRangeText}`;

    try {
        const q = query(collection(db, "orders"),
            where("status", "==", "completed"),
            where("createdAt", ">=", startTimestamp),
            where("createdAt", "<=", endTimestamp)
        );
        const snapshot = await getDocs(q);
        displayOrders(snapshot.docs, ordersListEl, searchSummaryEl, dateRangeText);

    } catch (error) {
        handleError(error, ordersListEl);
        searchSummaryEl.textContent = "Lỗi khi tìm kiếm.";
    } finally {
        hideLoading();
    }
}

// Vẽ biểu đồ doanh thu tháng
async function renderMonthlyChart() {
    showLoading();
    const { start, end } = getYearDateRange();
    const monthlyTotals = Array(12).fill(0);

    try {
        const q = query(collection(db, "orders"),
            where("status", "==", "completed"),
            where("createdAt", ">=", start),
            where("createdAt", "<", end)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const order = doc.data();
            const month = order.createdAt.toDate().getMonth();
            monthlyTotals[month] += order.total;
        });

        if (monthlyChart) {
            monthlyChart.destroy();
        }

        const ctx = monthlyChartCanvas.getContext('2d');
        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'],
                datasets: [{
                    label: 'Doanh thu (€)',
                    data: monthlyTotals,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Doanh thu các tháng trong năm',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '€';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString() + '€';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        handleError(error, monthlyChartCanvas.parentElement);
    } finally {
        hideLoading();
    }
}

// Vẽ biểu đồ doanh thu hôm nay theo giờ
async function renderDailyChart() {
    showLoading();
    const { start, end } = getTodayDateRange();
    const hourlyTotals = Array(24).fill(0);

    try {
        const q = query(collection(db, "orders"),
            where("status", "==", "completed"),
            where("createdAt", ">=", start),
            where("createdAt", "<", end)
        );
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const order = doc.data();
            const hour = order.createdAt.toDate().getHours();
            hourlyTotals[hour] += order.total;
        });

        if (dailyChart) {
            dailyChart.destroy();
        }

        const ctx = dailyChartCanvas.getContext('2d');
        dailyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                datasets: [{
                    label: 'Doanh thu (€)',
                    data: hourlyTotals,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Doanh thu theo giờ hôm nay',
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + '€';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '€';
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        handleError(error, dailyChartCanvas.parentElement);
    } finally {
        hideLoading();
    }
}

// Hàm chuyển đổi tab
function switchTab(tab) {
    console.log("Chuyển tab:", tab);
    if (tab === 'today') {
        dailyChartCanvas.style.display = 'block';
        monthlyChartCanvas.style.display = 'none';
        tabTodayBtn.classList.add('active');
        tabMonthlyBtn.classList.remove('active');
        renderDailyChart();
    } else if (tab === 'monthly') {
        dailyChartCanvas.style.display = 'none';
        monthlyChartCanvas.style.display = 'block';
        tabMonthlyBtn.classList.add('active');
        tabTodayBtn.classList.remove('active');
        renderMonthlyChart();
    }
}

// --- GÁN SỰ KIỆN ---
searchBtn.addEventListener('click', searchOrdersByDateRange);
resetBtn.addEventListener('click', () => {
    showLoading();
    listenForTodayOrders();
    dateStartInput.value = '';
    dateEndInput.value = '';
});

// Tab button events
tabTodayBtn.addEventListener('click', () => switchTab('today'));
tabMonthlyBtn.addEventListener('click', () => switchTab('monthly'));

// --- KHỞI CHẠY KHI TẢI TRANG ---
window.addEventListener('load', function() {
    showLoading();
    listenForTodayOrders();
    switchTab('today');
});