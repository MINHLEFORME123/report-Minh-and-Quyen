// Import các hàm từ Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, query, where, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Cấu hình Firebase của bạn (copy y hệt từ file customer.js)
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
const revenueTotalEl = document.getElementById('revenue-total');
const orderCountEl = document.getElementById('order-count');
const completedOrdersListEl = document.getElementById('completed-orders-list');

/**
 * Tính toán mốc thời gian bắt đầu và kết thúc của ngày hôm nay
 */
function getTodayDateRange() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // Đặt về 00:00:00

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1); // Lấy 00:00:00 ngày mai

    return {
        start: Timestamp.fromDate(startOfToday),
        end: Timestamp.fromDate(startOfTomorrow)
    };
}

/**
 * Lắng nghe các đơn hàng đã hoàn thành trong ngày
 */
function listenForCompletedOrders() {
    console.log("Bắt đầu lắng nghe doanh thu...");
    
    const { start, end } = getTodayDateRange();

    // Tạo truy vấn:
    // 1. status phải là "completed"
    // 2. createdAt phải lớn hơn hoặc bằng 0h hôm nay
    // 3. createdAt phải nhỏ hơn 0h ngày mai
    const q = query(collection(db, "orders"), 
        where("status", "==", "completed"),
        where("createdAt", ">=", start),
        where("createdAt", "<", end)
    );

    // Dùng onSnapshot để tự động cập nhật khi có đơn mới hoàn thành
    onSnapshot(q, (snapshot) => {
        let totalRevenue = 0;
        let orderCount = 0;
        
        completedOrdersListEl.innerHTML = ''; // Xóa danh sách cũ

        if (snapshot.empty) {
            completedOrdersListEl.innerHTML = '<p>Không có đơn hàng nào hoàn thành hôm nay.</p>';
            revenueTotalEl.textContent = '0€';
            orderCountEl.textContent = '0';
            return;
        }

        // Sắp xếp đơn hàng (mới nhất lên trước)
        const sortedDocs = snapshot.docs.sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis());

        sortedDocs.forEach(doc => {
            const order = doc.data();
            
            // Tính toán
            totalRevenue += order.total;
            orderCount++;

            // Hiển thị chi tiết đơn hàng
            renderOrderCard(order);
        });

        // Cập nhật thẻ thống kê
        revenueTotalEl.textContent = `${totalRevenue.toLocaleString()}€`;
        orderCountEl.textContent = orderCount;

    }, (error) => {
        console.error("Lỗi khi lắng nghe doanh thu: ", error);
        // BÁO LỖI NẾU CẦN TẠO INDEX
        if (error.code === 'failed-precondition') {
            completedOrdersListEl.innerHTML = `<p style="color: red; font-weight: bold;">
                LỖI: Cần tạo Index trong Firestore. 
                <br>Hãy mở Console (F12), tìm thông báo lỗi màu đỏ và nhấp vào đường link để Firebase tự động tạo index cho bạn.
            </p>`;
        } else if (error.code === 'permission-denied') {
             completedOrdersListEl.innerHTML = `<p style="color: red; font-weight: bold;">
                LỖI BẢO MẬT: Bạn không có quyền xem dữ liệu này.
            </p>`;
        }
    });
}

/**
 * Hiển thị một thẻ đơn hàng
 */
function renderOrderCard(order) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    
    let time = 'Không rõ';
    if (order.createdAt && order.createdAt.toDate) {
        time = order.createdAt.toDate().toLocaleTimeString('vi-VN');
    }

    let itemsHtml = order.items.map(item => `
        <li>
            ${item.quantity}x ${item.name.vi} (${item.price.toLocaleString()}€)
            ${item.note ? `<br><i>Ghi chú: ${item.note}</i>` : ''}
        </li>
    `).join('');

    orderElement.innerHTML = `
        <div class="order-card-header">
            <h3>${order.tableNumber} - Lúc: ${time}</h3>
            <span class="order-total">${order.total.toLocaleString()}€</span>
        </div>
        <p>Thanh toán: ${order.paymentMethod}</p>
        <ul>${itemsHtml}</ul>
    `;
    
    completedOrdersListEl.appendChild(orderElement);
}

// Bắt đầu chạy
listenForCompletedOrders();