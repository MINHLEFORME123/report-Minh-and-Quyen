
// Import các hàm từ Firebase CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, query, where, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ===== BẮT ĐẦU CODE MỚI =====

// Biến để lưu API key
let GOOGLE_TRANSLATE_API_KEY = "";

// Hàm lấy API key từ Firestore
async function getApiKeyFromFirestore() {
    try {
        const apiKeysRef = collection(db, "api_keys");
        const snapshot = await getDocs(apiKeysRef);
        
        if (snapshot.empty) {
            // Nếu collection chưa tồn tại, tạo document mẫu
            await addDoc(apiKeysRef, {
                service: "google_translate",
                apiKey: "YOUR_API_KEY_HERE",
                createdAt: new Date()
            });
            console.log("Đã tạo collection 'api_keys' với document mẫu");
            return "YOUR_API_KEY_HERE";
        } else {
            // Lấy API key đầu tiên (hoặc bạn có thể tìm theo service)
            const firstDoc = snapshot.docs[0];
            return firstDoc.data().apiKey || "";
        }
    } catch (error) {
        console.error("Lỗi khi lấy API key từ Firestore:", error);
        return "";
    }
}

/**
 * Hàm gọi Google Cloud Translation API để dịch văn bản
 * @param {string} text - Văn bản cần dịch
 * @param {string} sourceLanguage - Ngôn ngữ gốc (ví dụ: 'en', 'fi')
 * @param {string} targetLanguage - Ngôn ngữ đích (mặc định 'vi')
 */
async function translateWithGoogle(text, sourceLanguage, targetLanguage = 'vi') {
    if (!text || !text.trim()) return text;
    
    // Nếu ngôn ngữ gốc đã là tiếng Việt thì không cần dịch
    if (sourceLanguage === targetLanguage) return text;

    // Nếu chưa có API key, lấy từ Firestore
    if (!GOOGLE_TRANSLATE_API_KEY) {
        GOOGLE_TRANSLATE_API_KEY = await getApiKeyFromFirestore();
    }

    try {
        const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                q: text,
                source: sourceLanguage,
                target: targetLanguage,
                format: 'text'
            })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        return data.data.translations[0].translatedText;
    } catch (error) {
        console.error('Lỗi dịch thuật với Google Translate:', error);
        return `${text} (Lỗi dịch)`; // Trả về text gốc nếu lỗi
    }
}

// Hàm đảm bảo collection "orders" tồn tại
async function ensureOrdersCollectionExists() {
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Thêm một document mẫu để tạo collection
            await addDoc(ordersRef, {
                tableNumber: "Kiểm tra",
                total: 0,
                paymentMethod: "test",
                status: "completed", // Đặt là completed để không hiển thị
                items: [],
                createdAt: new Date(),
                language: "vi"
            });
            console.log("Đã tạo collection 'orders' để đảm bảo tồn tại.");
        }
    } catch (error) {
        console.error("Lỗi khi đảm bảo collection tồn tại:", error);
    }
}
// ===== KẾT THÚC CODE MỚI =====

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

// Lấy API key khi khởi động
getApiKeyFromFirestore().then(key => {
    GOOGLE_TRANSLATE_API_KEY = key;
    console.log("Đã tải API key từ Firestore");
});

// Đảm bảo collection tồn tại
ensureOrdersCollectionExists();

// Lấy các phần tử DOM
const orderList = document.getElementById('orderList');
const mainApp = document.getElementById('mainApp');

// ===== HÀM HELPER CHO LOADING =====

// Hàm để HIỆN logo loading
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
    }
}

// Hàm để ẨN logo loading
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}

// Hàm delay để tạo độ trễ nhẹ
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ===================================

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
        showLoading(); // Hiển thị loading khi xác nhận hoàn thành
        setTimeout(() => {
            completeOrder(currentOrderId);
            hideConfirmModal();
            hideLoading(); // Ẩn loading sau khi hoàn thành
        }, 200); // Độ trễ nhẹ 200ms
    }
}

// Xử lý sự kiện click nút Không
function handleConfirmNo() {
    showLoading(); // Hiển thị loading khi hủy
    setTimeout(() => {
        hideConfirmModal();
        hideLoading(); // Ẩn loading sau khi hoàn thành
    }, 150); // Độ trễ nhẹ 150ms
}

// Xử lý sự kiện click vào overlay
function handleModalClick(e) {
    if (e.target.id === 'confirmModal') {
        showLoading(); // Hiển thị loading khi click overlay
        setTimeout(() => {
            hideConfirmModal();
            hideLoading(); // Ẩn loading sau khi hoàn thành
        }, 150); // Độ trễ nhẹ 150ms
    }
}

// Biến lưu trữ orderId đang được xác nhận
let currentOrderId = null;
let previousOrderCount = 0;

// Lắng nghe đơn hàng từ Firestore
listenForOrders();

// == LẮNG NGHE ĐƠN HÀNG TỪ FIRESTORE (PHIÊN BẢN CÓ DỊCH TỰ ĐỘNG) ==
async function listenForOrders() {
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
    onSnapshot(q, async (snapshot) => {
        showLoading(); // Hiển thị loading khi cập nhật danh sách đơn hàng
        
        orderList.innerHTML = ''; // Xóa danh sách cũ
        
        if (snapshot.empty) {
            orderList.innerHTML = '<p>Không có đơn hàng mới nào.</p>';
            previousOrderCount = 0;
            setTimeout(() => {
                hideLoading(); // Ẩn loading sau khi hoàn thành
            }, 150); // Độ trễ nhẹ 150ms
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
        for (const doc of sortedDocs) {
            const order = doc.data();
            const orderId = doc.id;
            
            // ===== BẮT ĐẦU LOGIC DỊCH =====
            // Kiểm tra xem đơn hàng có phải tiếng nước ngoài VÀ có ghi chú không
            if (order.language && order.language !== 'vi' && order.items.some(item => item.note)) {
                
                // Dùng Promise.all để dịch tất cả ghi chú của đơn hàng này cùng lúc
                await Promise.all(order.items.map(async (item) => {
                    if (item.note) {
                        // Gọi hàm dịch Google
                        const translatedNote = await translateWithGoogle(item.note, order.language, 'vi');
                        // Ghi đè ghi chú bằng bản dịch
                        item.note = `${translatedNote} (<i>Dịch từ ${order.language}</i>)`;
                    }
                }));
            }
            // ===== KẾT THÚC LOGIC DỊCH =====

            // Tạo thẻ HTML cho đơn hàng (với ghi chú đã được dịch)
            const orderElement = document.createElement('div');
            orderElement.className = 'order-card'; // Class mặc định
            
            // ===== BẮT ĐẦU KIỂM TRA THỜI GIAN CHỜ =====
            if (order.createdAt && order.createdAt.toDate) {
                const orderTime = order.createdAt.toDate().getTime(); // Thời gian tạo đơn (milliseconds)
                const currentTime = Date.now(); // Thời gian hiện tại (milliseconds)
                const minutesWaiting = (currentTime - orderTime) / (1000 * 60); // Số phút đã chờ

                if (minutesWaiting > 10) { 
                    orderElement.classList.add('urgent'); // Thêm class "khẩn cấp" nếu > 10 phút
                } else if (minutesWaiting > 5) {
                    orderElement.classList.add('warning'); // Thêm class "cảnh báo" nếu > 5 phút
                }
            }
            // ===== KẾT THÚC KIỂM TRA THỜI GIAN CHỜ =====

            // Định dạng thời gian (nếu có)
            let time = 'Không rõ';
            if (order.createdAt && order.createdAt.toDate) {
                time = order.createdAt.toDate().toLocaleTimeString('vi-VN');
            }

            // Hiển thị các món hàng - ĐÃ CẬP NHẬT ĐỂ HIỂN THỊ SIZE
            let itemsHtml = order.items.map(item => {
                // Tạo chuỗi hiển thị size nếu có
                const sizeDisplay = item.size ? ` - Size: ${item.size}` : '';
                return `
                    <li>
                        ${item.quantity}x ${item.name.vi}${sizeDisplay} (${item.price.toLocaleString()}€)
                        ${item.note ? `<br><i class="note-translated">Ghi chú: ${item.note}</i>` : ''}
                    </li>
                `;
            }).join('');

            // Đổ dữ liệu vào thẻ HTML
            orderElement.innerHTML = `
                <h3>${order.tableNumber} - Lúc: ${time}</h3>
                <p>Tổng tiền: <strong>${order.total.toLocaleString()}€</strong></p>
                <p>Thanh toán: ${order.paymentMethod}</p>
                <ul>${itemsHtml}</ul>
                <button class="complete-btn" data-id="${orderId}">Hoàn thành</button>
            `;
            
            orderList.appendChild(orderElement);
        }

        // Gán sự kiện click cho các nút "Hoàn thành"
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                showLoading(); // Hiển thị loading khi click nút hoàn thành
                setTimeout(() => {
                    showConfirmModal(id);
                    hideLoading(); // Ẩn loading sau khi hoàn thành
                }, 150); // Độ trễ nhẹ 150ms
            });
        });

        setTimeout(() => {
            hideLoading(); // Ẩn loading sau khi hoàn thành
        }, 200); // Độ trễ nhẹ 200ms

    }, (error) => {
        console.error("Lỗi khi lắng nghe đơn hàng:", error);
        hideLoading(); // Ẩn loading khi có lỗi
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

// ===== THÊM VÀO CUỐI FILE .JS =====
// Ẩn màn hình loading khi trang tải xong
window.addEventListener('load', function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        // Thêm trễ 200ms để đảm bảo mọi thứ đẹp mắt
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
        }, 200); 
    }
});
// ===================================