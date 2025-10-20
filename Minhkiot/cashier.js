
// Import các hàm từ Firebase CDN
// KHÔNG CẦN import auth nữa
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, query, where 
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
// KHÔNG CẦN auth

// Lấy các phần tử DOM
const orderList = document.getElementById('orderList');
// ĐÃ XÓA các phần tử login/logout

// == BỘ LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP ĐÃ BỊ XÓA ==

// == FORM ĐĂNG NHẬP / ĐĂNG XUẤT ĐÃ BỊ XÓA ==

// == LẮNG NGHE ĐƠN HÀNG TỪ FIRESTORE ==
// Chạy hàm này ngay khi tải trang
listenForOrders();

function listenForOrders() {
    console.log("Bắt đầu lắng nghe đơn hàng...");
    
    // Tạo một truy vấn: chỉ lấy các đơn hàng có status là "pending"
    const q = query(collection(db, "orders"), where("status", "==", "pending"));

    // onSnapshot là một bộ lắng nghe theo thời gian thực
    onSnapshot(q, (snapshot) => {
        orderList.innerHTML = ''; // Xóa danh sách cũ
        if (snapshot.empty) {
            orderList.innerHTML = '<p>Không có đơn hàng mới nào.</p>';
            return;
        }

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

            // Hiển thị các món hàng - ĐÃ SỬA ĐƠN VỊ TIỀN THÀNH EURO
            let itemsHtml = order.items.map(item => `
                <li>
                    ${item.quantity}x ${item.name.vi} (${item.price.toLocaleString()}€)
                    ${item.note ? `<br><i>Ghi chú: ${item.note}</i>` : ''}
                </li>
            `).join('');

            // Đổ dữ liệu vào thẻ HTML - ĐÃ SỬA ĐƠN VỊ TIỀN THÀNH EURO
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
                completeOrder(id);
            });
        });

    }, (error) => {
        console.error("Lỗi khi lắng nghe đơn hàng:", error);
        // Vẫn giữ kiểm tra này để báo lỗi nếu bạn chưa đăng nhập
        if (error.code === 'permission-denied') {
            orderList.innerHTML = '<p style="color: red; font-size: 20px;">LỖI BẢO MẬT: Bạn không có quyền xem dữ liệu. Vui lòng đảm bảo bạn đã đăng nhập Firebase trước khi vào trang này.</p>';
        }
    });
}

// == HÀM HOÀN THÀNH ĐƠN HÀNG ==
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