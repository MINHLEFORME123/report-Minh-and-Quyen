
// Import các hàm từ Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Cấu hình Firebase của bạn
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
const orderList = document.getElementById('orderList');
const mainApp = document.getElementById('mainApp');

// Tạo modal xác nhận hoàn thành đơn hàng
function createConfirmModal() {
    const modalHTML = `
        <div id="confirmModal" class="modal-overlay">
            <div class="modal-content">
                <h2>Xác nhận hoàn thành</h2>
                <p>Bạn có chắc chắn muốn đánh dấu đơn hàng này là đã hoàn thành?</p>
                <div class="modal-buttons">
                    <button id="confirmYes" class="modal-btn confirm-btn">Có</button>
                    <button id="confirmNo" class="modal-btn cancel-btn">Không</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Gán sự kiện cho các nút trong modal
    document.getElementById('confirmYes').addEventListener('click', handleConfirmYes);
    document.getElementById('confirmNo').addEventListener('click', handleConfirmNo);
    document.getElementById('confirmModal').addEventListener('click', handleModalClick);
}

// Tạo thông báo
function createNotification() {
    const notificationHTML = `
        <div id="notification" class="notification">
            <p>🔔 Có đơn hàng mới!</p>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
}

// Hiển thị modal xác nhận
function showConfirmModal(orderId) {
    currentOrderId = orderId;
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
}

// Ẩn modal xác nhận
function hideConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentOrderId = null;
}

// Hiển thị thông báo
function showNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.add('show', 'new-order');
        
        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Xử lý sự kiện click nút Có
function handleConfirmYes() {
    if (currentOrderId) {
        completeOrder(currentOrderId);
        hideConfirmModal();
    }
}

// Xử lý sự kiện click nút Không
function handleConfirmNo() {
    hideConfirmModal();
}

// Xử lý sự kiện click vào overlay
function handleModalClick(e) {
    if (e.target.id === 'confirmModal') {
        hideConfirmModal();
    }
}

// Biến lưu trữ orderId đang được xác nhận
let currentOrderId = null;
let previousOrderCount = 0;

// Lắng nghe đơn hàng từ Firestore
listenForOrders();

function listenForOrders() {
    console.log("Bắt đầu lắng nghe đơn hàng...");
    
    // Tạo modal và thông báo nếu chưa tồn tại
    if (!document.getElementById('confirmModal')) {
        createConfirmModal();
    }
    if (!document.getElementById('notification')) {
        createNotification();
    }
    
    // Tạo một truy vấn: chỉ lấy các đơn hàng có status là "pending"
    const q = query(collection(db, "orders"), where("status", "==", "pending"));

    // onSnapshot là một bộ lắng nghe theo thời gian thực
    onSnapshot(q, (snapshot) => {
        orderList.innerHTML = ''; // Xóa danh sách cũ
        
        if (snapshot.empty) {
            orderList.innerHTML = '<p>Không có đơn hàng mới nào.</p>';
            previousOrderCount = 0;
            return;
        }

        const currentOrderCount = snapshot.docs.length;
        
        // Kiểm tra nếu có đơn hàng mới
        if (currentOrderCount > previousOrderCount) {
            showNotification();
        }
        
        previousOrderCount = currentOrderCount;

        // Sắp xếp các đơn hàng, đơn mới nhất lên trước
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const timeA = a.data().createdAt?.toDate() || 0;
            const timeB = b.data().createdAt?.toDate() || 0;
            return timeB - timeA; // Sắp xếp giảm dần (mới nhất trước)
        });

        // Lặp qua từng tài liệu (đơn hàng) đã sắp xếp
        sortedDocs.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            
            // Tạo thẻ HTML cho đơn hàng
            const orderElement = document.createElement('div');
            orderElement.className = 'order-card';
            
            // Định dạng thời gian (nếu có)
            let time = 'Không rõ';
            if (order.createdAt && order.createdAt.toDate) {
                time = order.createdAt.toDate().toLocaleTimeString('vi-VN');
            }

            // Hiển thị các món hàng
            let itemsHtml = order.items.map(item => `
                <li>
                    ${item.quantity}x ${item.name.vi} (${item.price.toLocaleString()}€)
                    ${item.note ? `<br><i>Ghi chú: ${item.note}</i>` : ''}
                </li>
            `).join('');

            // Đổ dữ liệu vào thẻ HTML
            orderElement.innerHTML = `
                <h3>${order.tableNumber} - Lúc: ${time}</h3>
                <p>Tổng tiền: <strong>${order.total.toLocaleString()}€</strong></p>
                <p>Thanh toán: ${order.paymentMethod}</p>
                <ul>${itemsHtml}</ul>
                <button class="complete-btn" data-id="${orderId}">Hoàn thành</button>
            `;
            
            orderList.appendChild(orderElement);
        });

        // Gán sự kiện click cho các nút "Hoàn thành"
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                showConfirmModal(id);
            });
        });

    }, (error) => {
        console.error("Lỗi khi lắng nghe đơn hàng:", error);
        if (error.code === 'permission-denied') {
            orderList.innerHTML = '<p style="color: red; font-size: 20px;">LỖI BẢO MẬT: Bạn không có quyền xem dữ liệu. Vui lòng đảm bảo bạn đã đăng nhập Firebase trước khi vào trang này.</p>';
        }
    });
}

// Hàm hoàn thành đơn hàng
async function completeOrder(orderId) {
    console.log("Hoàn thành đơn hàng:", orderId);
    const orderRef = doc(db, "orders", orderId);
    
    try {
        // Cập nhật trường "status" thành "completed"
        await updateDoc(orderRef, {
            status: "completed"
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật đơn hàng:", error);
    }
}