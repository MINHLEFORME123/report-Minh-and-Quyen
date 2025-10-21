
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCh1zPuWrZ6g3UHQPJeahp--96vHoiRB-k",
  authDomain: "minhkiot-7f5d6.firebaseapp.com",
  projectId: "minhkiot-7f5d6",
  storageBucket: "minhkiot-7f5d6.firebasestorage.app",
  messagingSenderId: "25045319035",
  appId: "1:25045319035:web:30e7e5d07dc3a75c8411de",
  measurementId: "G-FZHVBC1NFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// State variables
let currentLanguage = 'vi';
let cart = [];
let currentCategory = '';
let menuData = [];
let selectedTable = '';
let selectedProduct = null;
let selectedSize = null;
let searchQuery = ''; // Thêm biến để lưu từ khóa tìm kiếm

// DOM Elements
const languageSelect = document.getElementById('languageSelect');
const categoriesGrid = document.getElementById('categoriesGrid');
const productsGrid = document.getElementById('productsGrid');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const mainContainer = document.getElementById('mainContainer');
const languageSelection = document.getElementById('languageSelection');
const orderReviewModal = document.getElementById('orderReviewModal');
const paymentMethod = document.getElementById('paymentMethod');
const productDetailModal = document.getElementById('productDetailModal');

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

// Hàm kiểm tra có phải giờ Lounas không (10:00 - 15:00, Thứ 2 đến Thứ 6)
function isLounasTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Thứ 2 đến Thứ 6 (1-5)
    const isWeekday = currentDay >= 1 && currentDay <= 5;
    
    // Giờ từ 10:00 đến 15:00
    const isLounasHour = currentHour >= 10 && currentHour < 15;
    
    return isWeekday && isLounasHour;
}

// Hàm lấy thông báo không phải giờ Lounas theo ngôn ngữ
function getNotLounasTimeMessage() {
    const messages = {
        vi: 'Hiện giờ không phải giờ Lounas, hãy thử lại sau!',
        en: 'It\'s not Lounas time now, please try again later!',
        fi: 'Nyt ei ole Lounas-aika, yritä myöhemmin uudelleen!'
    };
    return messages[currentLanguage] || messages.vi;
}

// Hàm lấy text nút OK theo ngôn ngữ
function getOKButtonText() {
    const texts = {
        vi: 'OK',
        en: 'OK',
        fi: 'OK'
    };
    return texts[currentLanguage] || texts.vi;
}

// Hàm hiển thị modal thông báo không phải giờ Lounas
function showNotLounasTimeModal() {
    // Tạo modal element nếu chưa tồn tại
    let modal = document.getElementById('notLounasTimeModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notLounasTimeModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>Thông báo</h2>
                </div>
                <div class="modal-body">
                    <p id="notLounasTimeMessage"></p>
                </div>
                <div class="modal-footer">
                    <button id="notLounasTimeOKBtn" class="modal-btn-confirm">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Thêm event listener cho nút OK
        document.getElementById('notLounasTimeOKBtn').addEventListener('click', function() {
            modal.classList.remove('show');
        });
        
        // Đóng modal khi click outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
    
    // Cập nhật nội dung theo ngôn ngữ
    const messageElement = document.getElementById('notLounasTimeMessage');
    if (messageElement) {
        messageElement.textContent = getNotLounasTimeMessage();
    }
    
    const okBtnElement = document.getElementById('notLounasTimeOKBtn');
    if (okBtnElement) {
        okBtnElement.textContent = getOKButtonText();
    }
    
    // Hiển thị modal
    modal.classList.add('show');
}

// Hàm hiển thị modal chọn size cho nước
function showSizeSelectionModal(product) {
    // Kiểm tra null product
    if (!product) {
        console.error('Cannot show size selection: product is null');
        return;
    }
    
    selectedProduct = product;
    selectedSize = null;
    
    const sizeSelectionModal = document.getElementById('sizeSelectionModal');
    if (!sizeSelectionModal) {
        const modal = document.createElement('div');
        modal.id = 'sizeSelectionModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2 id="sizeSelectionTitle">Chọn size</h2>
                    <button class="modal-close" onclick="closeSizeSelection()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="product-detail-content">
                        <!-- Hình ảnh sản phẩm -->
                        <img id="sizeSelectionImage" class="product-detail-image" style="display: none;">
                        
                        <!-- Tên sản phẩm -->
                        <div id="sizeSelectionName" class="product-detail-name"></div>
                        
                        <!-- Thành phần -->
                        <div id="sizeSelectionIngredients" class="product-detail-ingredients"></div>
                        
                        <!-- Giá theo size -->
                        <div class="size-selection-container">
                            <button class="size-btn" onclick="selectSize('M')" id="sizeMButton">
                                <div class="size-name" id="sizeMLabel">Size M</div>
                                <div class="size-price" id="sizeMPrice"></div>
                            </button>
                            <button class="size-btn" onclick="selectSize('L')" id="sizeLButton">
                                <div class="size-name" id="sizeLLabel">Size L</div>
                                <div class="size-price" id="sizeLPrice"></div>
                            </button>
                        </div>
                        
                        <!-- Ghi chú -->
                        <textarea id="sizeSelectionNote" class="product-detail-note" placeholder=""></textarea>
                        
                        <!-- Nút thêm vào giỏ -->
                        <button id="addToCartFromSizeBtn" class="add-to-cart-btn"></button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Thêm event listener cho nút thêm vào giỏ
        document.getElementById('addToCartFromSizeBtn').addEventListener('click', function() {
            if (selectedProduct && selectedSize) {
                const noteElement = document.getElementById('sizeSelectionNote');
                const note = noteElement ? noteElement.value.trim() : '';
                addToCart(selectedProduct, note, selectedSize);
                closeSizeSelection();
            } else {
                showNotification('Vui lòng chọn size!', 'warning');
            }
        });
    }
    
    // Cập nhật thông tin sản phẩm với kiểm tra null
    const nameElement = document.getElementById('sizeSelectionName');
    if (nameElement && product.name) {
        nameElement.textContent = product.name[currentLanguage] || '';
    }
    
    const ingredientsElement = document.getElementById('sizeSelectionIngredients');
    if (ingredientsElement && product.ingredients) {
        ingredientsElement.textContent = product.ingredients[currentLanguage] || '';
    }
    
    const imageElement = document.getElementById('sizeSelectionImage');
    if (imageElement) {
        if (product.image) {
            imageElement.src = product.image;
            imageElement.style.display = 'block';
        } else {
            imageElement.style.display = 'none';
        }
    }
    
    // Cập nhật tiêu đề modal theo ngôn ngữ
    const titleElement = document.getElementById('sizeSelectionTitle');
    if (titleElement) {
        titleElement.textContent = getSizeSelectionTitle();
    }
    
    // Cập nhật label size theo ngôn ngữ
    const sizeMLabelElement = document.getElementById('sizeMLabel');
    if (sizeMLabelElement) {
        sizeMLabelElement.textContent = getTranslatedSizeName('M');
    }
    
    const sizeLLabelElement = document.getElementById('sizeLLabel');
    if (sizeLLabelElement) {
        sizeLLabelElement.textContent = getTranslatedSizeName('L');
    }
    
    // Cập nhật giá cho từng size với kiểm tra null
    const priceM = product.price?.M?.price || 0;
    const currencyM = product.price?.M?.currency || '€';
    const priceL = product.price?.L?.price || 0;
    const currencyL = product.price?.L?.currency || '€';
    
    const sizeMPriceElement = document.getElementById('sizeMPrice');
    if (sizeMPriceElement) {
        sizeMPriceElement.textContent = `${priceM.toLocaleString()}${currencyM}`;
    }
    
    const sizeLPriceElement = document.getElementById('sizeLPrice');
    if (sizeLPriceElement) {
        sizeLPriceElement.textContent = `${priceL.toLocaleString()}${currencyL}`;
    }
    
    // Cập nhật placeholder cho ghi chú
    const noteElement = document.getElementById('sizeSelectionNote');
    if (noteElement) {
        noteElement.placeholder = getNotePlaceholder();
    }
    
    // Cập nhật text cho nút thêm vào giỏ
    const addToCartBtn = document.getElementById('addToCartFromSizeBtn');
    if (addToCartBtn) {
        addToCartBtn.textContent = getAddToCartText();
    }
    
    // Hiển thị modal
    const modalElement = document.getElementById('sizeSelectionModal');
    if (modalElement) {
        modalElement.classList.add('show');
    }
}

// Hàm đóng modal chọn size
function closeSizeSelection() {
    const sizeSelectionModal = document.getElementById('sizeSelectionModal');
    if (sizeSelectionModal) {
        sizeSelectionModal.classList.remove('show');
    }
    selectedProduct = null;
    selectedSize = null;
    
    // Clear note input
    const noteElement = document.getElementById('sizeSelectionNote');
    if (noteElement) {
        noteElement.value = '';
    }
}

// Hàm chọn size
function selectSize(size) {
    selectedSize = size;
    
    // Highlight size được chọn
    const sizeMButton = document.getElementById('sizeMButton');
    const sizeLButton = document.getElementById('sizeLButton');
    
    if (sizeMButton && sizeLButton) {
        if (size === 'M') {
            sizeMButton.classList.add('selected');
            sizeLButton.classList.remove('selected');
        } else if (size === 'L') {
            sizeLButton.classList.add('selected');
            sizeMButton.classList.remove('selected');
        }
    }
}

// Hàm lấy tiêu đề chọn size theo ngôn ngữ
function getSizeSelectionTitle() {
    const titles = {
        vi: 'Chọn size',
        en: 'Select size',
        fi: 'Valitse koko'
    };
    return titles[currentLanguage] || 'Chọn size';
}

// Hàm lấy tên size dịch theo ngôn ngữ
function getTranslatedSizeName(size) {
    const translations = {
        vi: {
            M: 'Size M',
            L: 'Size L'
        },
        en: {
            M: 'Size M',
            L: 'Size L'
        },
        fi: {
            M: 'Koko M',
            L: 'Koko L'
        }
    };
    
    return translations[currentLanguage]?.[size] || size;
}

// ===== HÀM HELPER ĐỂ LẤY GIÁ TRỊ GIÁ VÀ TIỀN TỆ (ĐÃ FIX) =====
function getProductPriceValue(product) {
    console.log('=== DEBUG PRICE VALUE ===');
    console.log('Product input:', product);
    
    if (!product || product.price === undefined || product.price === null) {
        console.log('Price is undefined/null, returning 0');
        return 0;
    }
    
    // Nếu là món nước, xử lý theo size
    if (product.category === 'nước') {
        console.log('This is a drink item');
        if (product.price.M && (typeof product.price.M.price === 'number' || typeof product.price.M.price === 'string')) {
            const price = parseFloat(product.price.M.price);
            console.log('M price:', price);
            return isNaN(price) ? 0 : price;
        }
        if (product.price.L && (typeof product.price.L.price === 'number' || typeof product.price.L.price === 'string')) {
            const price = parseFloat(product.price.L.price);
            console.log('L price:', price);
            return isNaN(price) ? 0 : price;
        }
        console.log('No valid drink price found, returning 0');
        return 0;
    }
    
    // Xử lý trường hợp price là object đơn giản { price: number, currency: string }
    if (typeof product.price === 'object' && product.price !== null) {
        if (product.price.price !== undefined) {
            const price = parseFloat(product.price.price);
            console.log('Object price:', price);
            return isNaN(price) ? 0 : price;
        }
        console.log('Unknown object price structure:', product.price);
        return 0;
    }
    
    // Nếu không phải món nước, price là số trực tiếp
    if (typeof product.price === 'number') {
        console.log('Direct number price:', product.price);
        return product.price;
    }
    
    if (typeof product.price === 'string') {
        const parsedPrice = parseFloat(product.price);
        console.log('String price:', product.price, 'Parsed:', parsedPrice);
        return isNaN(parsedPrice) ? 0 : parsedPrice;
    }
    
    console.log('Unknown price type:', typeof product.price, 'Value:', product.price);
    return 0;
}

function getProductCurrencyValue(product) {
    console.log('=== DEBUG CURRENCY VALUE ===');
    console.log('Product input:', product);
    
    if (!product) {
        console.log('Product is null, returning €');
        return '€';
    }
    
    // Nếu là món nước, lấy currency từ size
    if (product.category === 'nước') {
        console.log('This is a drink item');
        if (product.price.M && product.price.M.currency) {
            console.log('M currency:', product.price.M.currency);
            return product.price.M.currency;
        }
        if (product.price.L && product.price.L.currency) {
            console.log('L currency:', product.price.L.currency);
            return product.price.L.currency;
        }
        console.log('No drink currency found, returning €');
        return '€';
    }
    
    // Xử lý trường hợp price là object đơn giản { price: number, currency: string }
    if (typeof product.price === 'object' && product.price !== null && product.price.currency) {
        console.log('Object currency:', product.price.currency);
        return product.price.currency;
    }
    
    // Nếu không phải món nước, lấy currency trực tiếp
    if (product.currency && typeof product.currency === 'string') {
        console.log('Direct currency:', product.currency);
        return product.currency;
    }
    
    console.log('No valid currency found, returning €');
    return '€';
}
// ===== KẾT THÚC HÀM HELPER =====

// ===================================

// Initialize the page
window.addEventListener('load', async function() {
    await loadMenuData();
    // Language selection screen is shown by default
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
});

// Load menu data from Firestore
async function loadMenuData() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        menuData = [];
        
        querySnapshot.forEach((doc) => {
            const productData = doc.data();
            console.log('Firestore product data:', productData);
            
            // Kiểm tra dữ liệu hợp lệ trước khi thêm vào menuData
            if (productData && 
                typeof productData === 'object' && 
                productData.name && 
                typeof productData.name === 'object') {
                menuData.push(productData);
            } else {
                console.warn('Invalid product data structure:', productData);
            }
        });
        
        console.log("Đã tải menu từ Firestore thành công!", menuData.length, "items");
        console.log("Menu data:", menuData);
        
        // Thêm thanh search sau khi tải menu
        addSearchBar();
    } catch (error) {
        console.error('Error loading menu data from Firestore:', error);
        showNotification("Lỗi khi tải thực đơn từ máy chủ.", "error");
        menuData = [];
    }
}

// Hàm thêm thanh search
function addSearchBar() {
    const productsContainer = document.querySelector('.products-container');
    if (!productsContainer) return;
    
    // Tạo container cho search bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <div class="search-bar">
            <input type="text" id="searchInput" placeholder="Tìm kiếm món ăn..." />
            <button id="searchBtn">🔍</button>
            <button id="clearSearchBtn" style="display: none;">✕</button>
        </div>
    `;
    
    // Thêm vào đầu container sản phẩm
    productsContainer.insertBefore(searchContainer, productsContainer.firstChild);
    
    // Thêm event listeners
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput && searchBtn && clearSearchBtn) {
        searchInput.addEventListener('input', function() {
            searchQuery = this.value.trim().toLowerCase();
            if (searchQuery) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            displayProducts();
        });
        
        searchBtn.addEventListener('click', function() {
            searchQuery = searchInput.value.trim().toLowerCase();
            displayProducts();
        });
        
        clearSearchBtn.addEventListener('click', function() {
            searchInput.value = '';
            searchQuery = '';
            this.style.display = 'none';
            displayProducts();
        });
        
        // Cho phép tìm kiếm bằng Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchQuery = this.value.trim().toLowerCase();
                displayProducts();
            }
        });
    }
}

// Language selection handler
document.querySelectorAll('.language-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        showLoading();
        
        currentLanguage = this.dataset.lang;
        if (languageSelect) {
            languageSelect.value = currentLanguage;
        }
        updateLanguage();
        loadCategories();
        displayProducts();
        updateCartDisplay();
        
        if (languageSelection) {
            languageSelection.style.display = 'none';
        }
        if (mainContainer) {
            mainContainer.style.display = 'flex';
        }
        
        setTimeout(() => {
            hideLoading();
        }, 300);
    });
});

// Language change handler
if (languageSelect) {
    languageSelect.addEventListener('change', function() {
        showLoading();
        
        currentLanguage = this.value;
        updateLanguage();
        loadCategories();
        displayProducts();
        updateCartDisplay();
        
        setTimeout(() => {
            hideLoading();
        }, 200);
    });
}

// Get table selection title based on language
function getTableSelectionTitle() {
    const titles = {
        vi: 'Chọn bàn hoặc Mang về',
        en: 'Select Table or Takeaway',
        fi: 'Valitse pöytä tai Nouto'
    };
    return titles[currentLanguage] || 'Chọn bàn hoặc Mang về';
}

// Update language for all elements
function updateLanguage() {
    const translations = {
        vi: {
            categoriesTitle: "Danh Mục Món Ăn",
            productsTitle: "Thực Đơn",
            cartTitle: "Giỏ Hàng",
            checkoutBtn: "Đặt Món",
            notePlaceholder: "Ghi chú đặc biệt",
            emptyCart: "Giỏ hàng trống",
            cartTotal: "Tổng",
            emptyCartMessage: "Giỏ hàng của bạn đang trống!",
            orderSuccess: "Đặt món thành công!",
            orderReviewTitle: "Xem lại đơn hàng",
            paymentMethodTitle: "Phương thức thanh toán",
            cancelOrderBtn: "Hủy",
            confirmOrderBtn: "Xác nhận đặt món",
            paymentCash: "Tiền mặt",
            paymentCard: "Thẻ ngân hàng",
            paymentEdenred: "Edenred",
            paymentEpassi: "E-Passi",
            addToCart: "Thêm vào giỏ",
            close: "Đóng",
            takeawayBtn: "Mang về (Takeaway)",
            sizeM: "Size M",
            sizeL: "Size L",
            searchPlaceholder: "Tìm kiếm món ăn..."
        },
        en: {
            categoriesTitle: "Food Categories",
            productsTitle: "Menu",
            cartTitle: "Shopping Cart",
            checkoutBtn: "Place Order",
            notePlaceholder: "Special notes",
            emptyCart: "Cart is empty",
            cartTotal: "Total",
            emptyCartMessage: "Your cart is empty!",
            orderSuccess: "Order placed successfully!",
            orderReviewTitle: "Order Review",
            paymentMethodTitle: "Payment Method",
            cancelOrderBtn: "Cancel",
            confirmOrderBtn: "Confirm Order",
            paymentCash: "Cash",
            paymentCard: "Bank Card",
            paymentEdenred: "Edenred",
            paymentEpassi: "E-Passi",
            addToCart: "Add to Cart",
            close: "Close",
            takeawayBtn: "Takeaway",
            sizeM: "Size M",
            sizeL: "Size L",
            searchPlaceholder: "Search food items..."
        },
        fi: {
            categoriesTitle: "Ruokakategoriat",
            productsTitle: "Menu",
            cartTitle: "Ostoskori",
            checkoutBtn: "Tee tilaus",
            notePlaceholder: "Erikoishuomautukset",
            emptyCart: "Ostoskori on tyhjä",
            cartTotal: "Yhteensä",
            emptyCartMessage: "Ostoskorisi on tyhjä!",
            orderSuccess: "Tilaus onnistui!",
            orderReviewTitle: "Tilauksen tarkistus",
            paymentMethodTitle: "Maksutapa",
            cancelOrderBtn: "Peruuta",
            confirmOrderBtn: "Vahvista tilaus",
            paymentCash: "Käteinen",
            paymentCard: "Pankkikortti",
            paymentEdenred: "Edenred",
            paymentEpassi: "E-Passi",
            addToCart: "Lisää koriin",
            close: "Sulje",
            takeawayBtn: "Nouto",
            sizeM: "Koko M",
            sizeL: "Koko L",
            searchPlaceholder: "Hae ruokaa..."
        }
    };

    const currentTranslations = translations[currentLanguage] || translations.vi;
    
    const categoriesTitleElement = document.getElementById('categoriesTitle');
    if (categoriesTitleElement) {
        categoriesTitleElement.textContent = currentTranslations.categoriesTitle || '';
    }
    
    const productsTitleElement = document.getElementById('productsTitle');
    if (productsTitleElement) {
        productsTitleElement.textContent = currentTranslations.productsTitle || '';
    }
    
    const cartTitleElement = document.getElementById('cartTitle');
    if (cartTitleElement) {
        cartTitleElement.textContent = currentTranslations.cartTitle || '';
    }
    
    const checkoutBtnElement = document.getElementById('checkoutBtn');
    if (checkoutBtnElement) {
        checkoutBtnElement.textContent = currentTranslations.checkoutBtn || '';
    }
    
    const orderReviewTitleElement = document.getElementById('orderReviewTitle');
    if (orderReviewTitleElement) {
        orderReviewTitleElement.textContent = currentTranslations.orderReviewTitle || '';
    }
    
    const paymentMethodTitleElement = document.getElementById('paymentMethodTitle');
    if (paymentMethodTitleElement) {
        paymentMethodTitleElement.textContent = currentTranslations.paymentMethodTitle || '';
    }
    
    const cancelOrderBtnElement = document.getElementById('cancelOrderBtn');
    if (cancelOrderBtnElement) {
        cancelOrderBtnElement.textContent = currentTranslations.cancelOrderBtn || '';
    }
    
    const confirmOrderBtnElement = document.getElementById('confirmOrderBtn');
    if (confirmOrderBtnElement) {
        confirmOrderBtnElement.textContent = currentTranslations.confirmOrderBtn || '';
    }
    
    if (paymentMethod) {
        const paymentOptions = paymentMethod.querySelectorAll('option');
        if (paymentOptions.length >= 5) {
            paymentOptions[1].textContent = currentTranslations.paymentCash || '';
            paymentOptions[2].textContent = currentTranslations.paymentCard || '';
            paymentOptions[3].textContent = currentTranslations.paymentEdenred || '';
            paymentOptions[4].textContent = currentTranslations.paymentEpassi || '';
        }
    }
    
    const addToCartDetailBtnElement = document.getElementById('addToCartDetailBtn');
    if (addToCartDetailBtnElement) {
        addToCartDetailBtnElement.textContent = currentTranslations.addToCart || '';
    }
    
    const tableSelectionTitleElement = document.querySelector('#tableSelectionModal .modal-header h2');
    if (tableSelectionTitleElement) {
        tableSelectionTitleElement.textContent = getTableSelectionTitle();
    }
    
    const takeawayBtnElement = document.querySelector('.takeaway-btn .takeaway-text');
    if (takeawayBtnElement) {
        takeawayBtnElement.textContent = currentTranslations.takeawayBtn || '';
    }
    
    // Cập nhật placeholder cho search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = currentTranslations.searchPlaceholder || 'Tìm kiếm món ăn...';
    }
}

// Load and display categories
function loadCategories() {
    if (!categoriesGrid) return;
    
    const categories = [...new Set(menuData.map(item => item.category))];
    
    categoriesGrid.innerHTML = '';
    
    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.onclick = () => {
            showLoading();
            setTimeout(() => {
                filterByCategory(category);
                hideLoading();
            }, 200);
        };
        
        const categoryName = document.createElement('div');
        categoryName.className = 'category-name';
        categoryName.textContent = getCategoryName(category);
        
        categoryCard.appendChild(categoryName);
        categoriesGrid.appendChild(categoryCard);
    });
}

// Get category name based on language
function getCategoryName(category) {
    const categoryNames = {
        'nước': { vi: 'Nước', en: 'Drinks', fi: 'Juomat' },
        'xào': { vi: 'Món Xào', en: 'Stir Fry', fi: 'Paistettu' },
        'đặc sản': { vi: 'Đặc Sản', en: 'Specialties', fi: 'Erikoisuudet' },
        'khai vị': { vi: 'Khai Vị', en: 'Appetizers', fi: 'Alkuruoat' },
        'món chính': { vi: 'Món Chính', en: 'Main Courses', fi: 'Pääruoat' },
        'tráng miệng': { vi: 'Tráng Miệng', en: 'Desserts', fi: 'Jälkiruoat' },
        'súp': { vi: 'Súp', en: 'Soup', fi: 'Keitto' },
        'lounas': { vi: 'Lounas', en: 'Lounas', fi: 'Lounas' }
    };
    
    return categoryNames[category]?.[currentLanguage] || category || '';
}

// Filter products by category
function filterByCategory(category) {
    currentCategory = category || '';
    displayProducts();
}

// Display products with very small uniform size
function displayProducts() {
    if (!productsGrid) return;
    
    let filteredProducts = menuData;
    
    // Lọc theo category nếu có
    if (currentCategory) {
        filteredProducts = menuData.filter(product => product && product.category === currentCategory);
    }
    
    // Lọc theo search query nếu có
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(product => {
            if (!product || !product.name) return false;
            
            // Kiểm tra tên món ăn trong tất cả các ngôn ngữ
            const nameVi = (product.name.vi || '').toLowerCase();
            const nameEn = (product.name.en || '').toLowerCase();
            const nameFi = (product.name.fi || '').toLowerCase();
            
            // Kiểm tra ingredients nếu có
            const ingredientsVi = (product.ingredients?.vi || '').toLowerCase();
            const ingredientsEn = (product.ingredients?.en || '').toLowerCase();
            const ingredientsFi = (product.ingredients?.fi || '').toLowerCase();
            
            return nameVi.includes(searchQuery) || 
                   nameEn.includes(searchQuery) || 
                   nameFi.includes(searchQuery) ||
                   ingredientsVi.includes(searchQuery) || 
                   ingredientsEn.includes(searchQuery) || 
                   ingredientsFi.includes(searchQuery);
        });
    }
    
    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        // Hiển thị thông báo không tìm thấy kết quả
        productsGrid.innerHTML = `<div class="no-results">
            ${getNoResultsText()}
        </div>`;
        return;
    }
    
    filteredProducts.forEach((product, index) => {
        // Kiểm tra product null
        if (!product) {
            console.warn('Null product at index:', index);
            return;
        }
        
        console.log('=== DISPLAY PRODUCT DEBUG ===');
        console.log('Index:', index);
        console.log('Product:', product);
        console.log('Category:', product?.category);
        console.log('Price field:', product?.price);
        console.log('Currency field:', product?.currency);
        
        const priceValue = getProductPriceValue(product);
        const currencyValue = getProductCurrencyValue(product);
        console.log('Calculated price:', priceValue);
        console.log('Calculated currency:', currencyValue);
        console.log('Display text:', `${priceValue.toLocaleString()}${currencyValue}`);

        const productCard = document.createElement('div');
        productCard.className = 'product-card-uniform';
        
        const isLounasItem = product.category === 'lounas';
        const currentlyLounasTime = isLounasTime();
        
        if (isLounasItem && !currentlyLounasTime) {
            productCard.classList.add('product-card-disabled');
        }
        
        const imgContainer = document.createElement('div');
        imgContainer.className = 'product-image-container';
        
        if (product.image) {
            const img = document.createElement('img');
            img.className = 'product-image-uniform';
            img.src = product.image;
            img.alt = product.name ? (product.name[currentLanguage] || '') : '';
            imgContainer.appendChild(img);
        } else {
            const imgPlaceholder = document.createElement('div');
            imgPlaceholder.className = 'product-image-uniform';
            imgPlaceholder.style.background = '#e6f3ff';
            imgPlaceholder.style.display = 'flex';
            imgPlaceholder.style.alignItems = 'center';
            imgPlaceholder.style.justifyContent = 'center';
            imgPlaceholder.style.color = '#0066cc';
            imgPlaceholder.textContent = '?';
            imgContainer.appendChild(imgPlaceholder);
        }
        
        productCard.appendChild(imgContainer);
        
        const infoContainer = document.createElement('div');
        infoContainer.className = 'product-info-container';
        
        const productName = document.createElement('div');
        productName.className = 'product-name-uniform';
        productName.textContent = product.name ? (product.name[currentLanguage] || '') : '';
        infoContainer.appendChild(productName);
        
        const productPrice = document.createElement('div');
        productPrice.className = 'product-price-uniform';

        // Chỉ xử lý size cho category "nước"
        if (product.category === 'nước') {
            const priceM = product.price?.M?.price || 0;
            const currencyM = product.price?.M?.currency || '€';
            const priceL = product.price?.L?.price || 0;
            const currencyL = product.price?.L?.currency || '€';
            
            productPrice.innerHTML = `
                <div class="drink-prices">
                    <span class="price-size">M: ${priceM.toLocaleString()}${currencyM}</span>
                    <span class="price-size">L: ${priceL.toLocaleString()}${currencyL}</span>
                </div>
            `;
        } else if (isLounasItem && product.originalPrice && product.originalPrice > (getProductPriceValue(product) || 0)) {
            const discount = Math.round(((product.originalPrice - (getProductPriceValue(product) || 0)) / product.originalPrice) * 100);
            const priceValue = getProductPriceValue(product);
            const currencyValue = getProductCurrencyValue(product);
            
            if (currentlyLounasTime) {
                productPrice.innerHTML = `
                    <span class="original-price">${product.originalPrice.toLocaleString()}${currencyValue}</span> 
                    <span class="current-price">${priceValue.toLocaleString()}${currencyValue}</span>
                    <span class="discount-badge">-${discount}%</span>
                `;
            } else {
                productPrice.innerHTML = `
                    <span class="original-price-disabled">${product.originalPrice.toLocaleString()}${currencyValue}</span> 
                    <span class="current-price-disabled">${priceValue.toLocaleString()}${currencyValue}</span>
                    <span class="discount-badge-disabled">-${discount}%</span>
                `;
            }
        } else {
            const priceValue = getProductPriceValue(product);
            const currencyValue = getProductCurrencyValue(product);
            productPrice.textContent = `${priceValue.toLocaleString()}${currencyValue}`;
        }

        infoContainer.appendChild(productPrice);
        productCard.appendChild(infoContainer);
        
        productCard.onclick = () => {
            if (isLounasItem && !currentlyLounasTime) {
                showNotLounasTimeModal();
                return;
            }
            
            showLoading();
            setTimeout(() => {
                if (product.category === 'nước') {
                    showSizeSelectionModal(product);
                } else {
                    showProductDetail(product);
                }
                hideLoading();
            }, 150);
        };
        
        productsGrid.appendChild(productCard);
    });
}

// Hàm lấy text khi không tìm thấy kết quả
function getNoResultsText() {
    const texts = {
        vi: 'Không tìm thấy món ăn phù hợp',
        en: 'No matching food items found',
        fi: 'Ei löytynyt ruokaa'
    };
    return texts[currentLanguage] || texts.vi;
}

// Show product detail modal - ĐÃ FIX LỖI
function showProductDetail(product, size = null) {
    // Kiểm tra null product
    if (!product) {
        console.error('Cannot show product detail: product is null');
        return;
    }
    
    const productDetailNameElement = document.getElementById('productDetailName');
    if (productDetailNameElement) {
        productDetailNameElement.textContent = product.name ? (product.name[currentLanguage] || 'Unknown Product') : 'Unknown Product';
    }
    
    const productDetailPriceElement = document.getElementById('productDetailPrice');
    if (productDetailPriceElement) {
        if (product.category === 'nước' && size) {
            const priceData = product.price?.[size] || { price: 0, currency: '€' };
            productDetailPriceElement.textContent = `${getTranslatedSizeName(size)}: ${(priceData.price || 0).toLocaleString()}${priceData.currency || '€'}`;
        } else if (product.category === 'nước') {
            const priceM = product.price?.M?.price || 0;
            const currencyM = product.price?.M?.currency || '€';
            const priceL = product.price?.L?.price || 0;
            const currencyL = product.price?.L?.currency || '€';
            
            productDetailPriceElement.innerHTML = `
                <div class="drink-prices-detail">
                    <div class="price-item">
                        <span class="size-label">${getTranslatedSizeName('M')}:</span>
                        <span class="price-value">${priceM.toLocaleString()}${currencyM}</span>
                    </div>
                    <div class="price-item">
                        <span class="size-label">${getTranslatedSizeName('L')}:</span>
                        <span class="price-value">${priceL.toLocaleString()}${currencyL}</span>
                    </div>
                </div>
            `;
        } else {
            const isLounasItem = product.category === 'lounas';
            const currentlyLounasTime = isLounasTime();
            const priceValue = getProductPriceValue(product);
            const currencyValue = getProductCurrencyValue(product);
            
            if (isLounasItem && product.originalPrice && product.originalPrice > priceValue) {
                const discount = Math.round(((product.originalPrice - priceValue) / product.originalPrice) * 100);
                if (currentlyLounasTime) {
                    productDetailPriceElement.innerHTML = `
                        <span class="original-price">${product.originalPrice.toLocaleString()}${currencyValue}</span> 
                        <span class="current-price">${priceValue.toLocaleString()}${currencyValue}</span>
                        <span class="discount-badge">-${discount}%</span>
                    `;
                } else {
                    productDetailPriceElement.innerHTML = `
                        <span class="original-price-disabled">${product.originalPrice.toLocaleString()}${currencyValue}</span> 
                        <span class="current-price-disabled">${priceValue.toLocaleString()}${currencyValue}</span>
                        <span class="discount-badge-disabled">-${discount}%</span>
                    `;
                }
            } else {
                productDetailPriceElement.textContent = `${priceValue.toLocaleString()}${currencyValue}`;
            }
        }
    }
    
    const productDetailIngredientsElement = document.getElementById('productDetailIngredients');
    if (productDetailIngredientsElement) {
        productDetailIngredientsElement.textContent = product.ingredients ? (product.ingredients[currentLanguage] || '') : '';
    }
    
    const productDetailImageElement = document.getElementById('productDetailImage');
    if (productDetailImageElement) {
        if (product.image) {
            productDetailImageElement.src = product.image;
            productDetailImageElement.style.display = 'block';
        } else {
            productDetailImageElement.style.display = 'none';
        }
    }
    
    const productDetailNoteElement = document.getElementById('productDetailNote');
    if (productDetailNoteElement) {
        productDetailNoteElement.placeholder = getNotePlaceholder();
    }
    
    const addToCartDetailBtnElement = document.getElementById('addToCartDetailBtn');
    if (addToCartDetailBtnElement) {
        addToCartDetailBtnElement.textContent = getAddToCartText();
        
        const isLounasItem = product.category === 'lounas';
        const currentlyLounasTime = isLounasTime();
        
        if (isLounasItem && !currentlyLounasTime) {
            addToCartDetailBtnElement.disabled = true;
            addToCartDetailBtnElement.style.opacity = '0.5';
            addToCartDetailBtnElement.style.cursor = 'not-allowed';
            addToCartDetailBtnElement.textContent = getNotLounasTimeMessage();
        } else {
            addToCartDetailBtnElement.disabled = false;
            addToCartDetailBtnElement.style.opacity = '1';
            addToCartDetailBtnElement.style.cursor = 'pointer';
            addToCartDetailBtnElement.textContent = getAddToCartText();
        }
        
        addToCartDetailBtnElement.dataset.currentProduct = JSON.stringify(product);
        if (size) {
            addToCartDetailBtnElement.dataset.selectedSize = size;
        } else {
            addToCartDetailBtnElement.dataset.selectedSize = '';
        }
    }
    
    if (productDetailModal) {
        productDetailModal.dataset.currentProduct = JSON.stringify(product);
        if (size) {
            productDetailModal.dataset.selectedSize = size;
        } else {
            productDetailModal.dataset.selectedSize = '';
        }
        productDetailModal.classList.add('show');
    }
}

// Close product detail modal
function closeProductDetail() {
    if (productDetailModal) {
        productDetailModal.classList.remove('show');
    }
}

// Add product to cart from detail modal
function addProductToCartFromDetail() {
    if (productDetailModal) {
        const productJson = productDetailModal.dataset.currentProduct;
        const selectedSize = productDetailModal.dataset.selectedSize;
        if (productJson) {
            try {
                const product = JSON.parse(productJson);
                
                if (product.category === 'lounas' && !isLounasTime()) {
                    showNotLounasTimeModal();
                    return;
                }
                
                showLoading();
                
                const productDetailNoteElement = document.getElementById('productDetailNote');
                const note = productDetailNoteElement ? productDetailNoteElement.value.trim() : '';
                
                addToCart(product, note, selectedSize);
                closeProductDetail();
                
                setTimeout(() => {
                    hideLoading();
                }, 200);
            } catch (e) {
                console.error('Error parsing product JSON:', e);
                showNotification("Lỗi khi xử lý sản phẩm", "error");
            }
        }
    }
}

// Get note placeholder text based on language
function getNotePlaceholder() {
    const texts = {
        vi: 'Ghi chú đặc biệt',
        en: 'Special notes',
        fi: 'Erikoishuomautukset'
    };
    return texts[currentLanguage] || texts.vi || 'Ghi chú đặc biệt';
}

// Get add to cart button text based on language
function getAddToCartText() {
    const texts = {
        vi: 'Thêm vào giỏ',
        en: 'Add to Cart',
        fi: 'Lisää koriin'
    };
    return texts[currentLanguage] || texts.vi || 'Thêm vào giỏ';
}

// Add product to cart with note and size
function addToCart(product, note = '', size = null) {
    // Kiểm tra null product
    if (!product) {
        console.error('Cannot add to cart: product is null');
        return;
    }
    
    let cartKey = product.name?.vi || 'unknown_product';
    if (size) {
        cartKey += `_size_${size}`;
    }
    if (note) {
        cartKey += `_note_${note}`;
    }
    
    const existingItem = cart.find(item => {
        let itemKey = item.product?.name?.vi || 'unknown_product';
        if (item.size) {
            itemKey += `_size_${item.size}`;
        }
        if (item.note) {
            itemKey += `_note_${item.note}`;
        }
        return itemKey === cartKey;
    });
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            product: product,
            quantity: 1,
            note: note,
            size: size
        });
    }
    
    updateCartDisplay();
    showNotification(`${product.name ? (product.name[currentLanguage] || '') : 'Sản phẩm'} ${size ? '(' + getTranslatedSizeName(size) + ')' : ''} đã được thêm vào giỏ hàng!`);
}

// Update cart display
function updateCartDisplay() {
    if (!cartItems || !cartTotal) return;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `<div style="text-align: center; color: #666; padding: 15px;">
            ${getEmptyCartText()}
        </div>`;
        cartTotal.textContent = getCartTotalText() + ': 0€';
        return;
    }
    
    let total = 0;
    
    cart.forEach((item, index) => {
        // Kiểm tra item và product null
        if (!item || !item.product) {
            console.warn('Invalid cart item at index:', index);
            return;
        }
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'cart-item-info';
        
        const itemName = document.createElement('div');
        itemName.className = 'cart-item-name';
        itemName.textContent = item.product.name ? (item.product.name[currentLanguage] || '') : '';
        itemInfo.appendChild(itemName);
        
        // Hiển thị size nếu có (chỉ cho món nước)
        if (item.size && item.product.category === 'nước') {
            const itemSize = document.createElement('div');
            itemSize.className = 'cart-item-size';
            itemSize.textContent = `Size: ${getTranslatedSizeName(item.size)}`;
            itemInfo.appendChild(itemSize);
        }
        
        if (item.note) {
            const itemNote = document.createElement('div');
            itemNote.className = 'cart-item-note';
            itemNote.textContent = `Ghi chú: ${item.note}`;
            itemInfo.appendChild(itemNote);
        }
        
        const itemPrice = document.createElement('div');
        itemPrice.className = 'cart-item-price';
        
        let price = 0;
        let currency = '€';
        if (item.product.category === 'nước' && item.size) {
            const priceData = item.product.price?.[item.size] || { price: 0, currency: '€' };
            price = priceData.price || 0;
            currency = priceData.currency || '€';
        } else {
            price = getProductPriceValue(item.product);
            currency = getProductCurrencyValue(item.product);
        }
        
        itemPrice.textContent = `${price.toLocaleString()}${currency} x ${item.quantity}`;
        itemInfo.appendChild(itemPrice);
        
        cartItem.appendChild(itemInfo);
        
        const quantityControl = document.createElement('div');
        quantityControl.className = 'cart-item-quantity';
        
        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => {
            showLoading();
            setTimeout(() => {
                updateQuantity(index, -1);
                hideLoading();
            }, 100);
        };
        quantityControl.appendChild(minusBtn);
        
        const quantityDisplay = document.createElement('span');
        quantityDisplay.textContent = item.quantity;
        quantityDisplay.style.fontSize = '0.7em';
        quantityControl.appendChild(quantityDisplay);
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => {
            showLoading();
            setTimeout(() => {
                updateQuantity(index, 1);
                hideLoading();
            }, 100);
        };
        quantityControl.appendChild(plusBtn);
        
        cartItem.appendChild(quantityControl);
        
        cartItems.appendChild(cartItem);
        
        total += (price * item.quantity);
    });
    
    cartTotal.textContent = getCartTotalText() + `: ${total.toLocaleString()}€`;
}

// Get empty cart text based on language
function getEmptyCartText() {
    const texts = {
        vi: 'Giỏ hàng trống',
        en: 'Cart is empty',
        fi: 'Ostoskori on tyhjä'
    };
    return texts[currentLanguage] || texts.vi || 'Giỏ hàng trống';
}

// Get cart total text based on language
function getCartTotalText() {
    const texts = {
        vi: 'Tổng',
        en: 'Total',
        fi: 'Yhteensä'
    };
    return texts[currentLanguage] || texts.vi || 'Tổng';
}

// Update item quantity in cart
function updateQuantity(index, change) {
    if (index < 0 || index >= cart.length) {
        console.error('Invalid cart index:', index);
        return;
    }
    
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    
    updateCartDisplay();
}

// Show order review modal
function showOrderReview() {
    if (cart.length === 0) {
        showNotification(getEmptyCartMessage(), 'warning');
        return;
    }
    
    const orderReviewContentElement = document.getElementById('orderReviewContent');
    if (!orderReviewContentElement) return;
    
    let total = 0;
    
    orderReviewContentElement.innerHTML = '';
    
    cart.forEach(item => {
        // Kiểm tra item và product null
        if (!item || !item.product) {
            console.warn('Invalid cart item in order review');
            return;
        }
        
        let price = 0;
        let currency = '€';
        if (item.product.category === 'nước' && item.size) {
            const priceData = item.product.price?.[item.size] || { price: 0, currency: '€' };
            price = priceData.price || 0;
            currency = priceData.currency || '€';
        } else {
            price = getProductPriceValue(item.product);
            currency = getProductCurrencyValue(item.product);
        }
        
        const itemTotal = price * item.quantity;
        total += itemTotal;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = 'order-review-item';
        
        const itemName = document.createElement('div');
        itemName.className = 'order-review-name';
        itemName.textContent = item.product.name ? (item.product.name[currentLanguage] || '') : '';
        reviewItem.appendChild(itemName);
        
        // Hiển thị size trong order review (chỉ cho món nước)
        if (item.size && item.product.category === 'nước') {
            const itemSize = document.createElement('div');
            itemSize.className = 'order-review-size';
            itemSize.textContent = `Size: ${getTranslatedSizeName(item.size)}`;
            reviewItem.appendChild(itemSize);
        }
        
        if (item.note) {
            const itemNote = document.createElement('div');
            itemNote.className = 'order-review-note';
            itemNote.textContent = `Ghi chú: ${item.note}`;
            reviewItem.appendChild(itemNote);
        }
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'order-review-details';
        itemDetails.textContent = `SL: ${item.quantity} | Giá: ${price.toLocaleString()}${currency} | Tiền: ${itemTotal.toLocaleString()}${currency}`;
        reviewItem.appendChild(itemDetails);
        
        orderReviewContentElement.appendChild(reviewItem);
    });
    
    const totalElement = document.createElement('div');
    totalElement.style.fontWeight = 'bold';
    totalElement.style.fontSize = '1em';
    totalElement.style.color = '#0066cc';
    totalElement.style.marginTop = '15px';
    totalElement.style.paddingTop = '10px';
    totalElement.style.borderTop = '1px solid #0066cc';
    totalElement.textContent = `${getCartTotalText()}: ${total.toLocaleString()}€`;
    orderReviewContentElement.appendChild(totalElement);
    
    if (orderReviewModal) {
        orderReviewModal.classList.add('show');
    }
}

// Close order review modal
function closeOrderReview() {
    if (orderReviewModal) {
        orderReviewModal.classList.remove('show');
    }
}

// ===== BẮT ĐẦU CODE MỚI: LOGIC CHỌN BÀN =====

function startCheckoutProcess() {
    if (cart.length === 0) {
        showNotification(getEmptyCartMessage(), 'warning');
        return;
    }
    
    showLoading();
    
    const tableSelectionTitleElement = document.querySelector('#tableSelectionModal .modal-header h2');
    if (tableSelectionTitleElement) {
        tableSelectionTitleElement.textContent = getTableSelectionTitle();
    }
    
    const tableSelectionModal = document.getElementById('tableSelectionModal');
    if (tableSelectionModal) {
        tableSelectionModal.classList.add('show');
    }
    
    setTimeout(() => {
        hideLoading();
    }, 200);
}

function closeTableSelection() {
    const tableSelectionModal = document.getElementById('tableSelectionModal');
    if (tableSelectionModal) {
        tableSelectionModal.classList.remove('show');
    }
}

function selectTable(tableId) {
    showLoading();
    
    selectedTable = tableId || '';
    console.log("Đã chọn:", selectedTable);
    
    closeTableSelection();
    
    setTimeout(() => {
        showOrderReview();
        hideLoading();
    }, 150);
}

function selectTakeaway() {
    showLoading();
    
    selectedTable = 'Takeaway';
    console.log("Đã chọn:", selectedTable);
    
    closeTableSelection();
    
    setTimeout(() => {
        showOrderReview();
        hideLoading();
    }, 150);
}

// ===== KẾT THÚC CODE MỚI =====

// Save order to Firebase
async function saveOrderToFirebase(orderData) {
    try {
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            createdAt: serverTimestamp(),
            status: "pending"
        });
        console.log("Order saved with ID: ", docRef.id);
        return true;
    } catch (error) {
        console.error("Error saving order: ", error);
        showNotification("Lỗi khi lưu hóa đơn. Vui lòng thử lại.", "error");
        return false;
    }
}

// Confirm order
async function confirmOrder() {
    const paymentMethodElement = document.getElementById('paymentMethod');
    const selectedPayment = paymentMethodElement ? paymentMethodElement.value : '';
    
    if (!selectedPayment) {
        showNotification('Vui lòng chọn phương thức thanh toán!', 'warning');
        return;
    }
    
    let total = 0;
    const orderItems = cart.map(item => {
        // Kiểm tra item và product null
        if (!item || !item.product) {
            return null;
        }
        
        let price = 0;
        let currency = '€';
        if (item.product.category === 'nước' && item.size) {
            const priceData = item.product.price?.[item.size] || { price: 0, currency: '€' };
            price = priceData.price || 0;
            currency = priceData.currency || '€';
        } else {
            price = getProductPriceValue(item.product);
            currency = getProductCurrencyValue(item.product);
        }
        
        const itemTotal = price * item.quantity;
        total += itemTotal;
        
        return {
            name: item.product.name || {},
            price: price,
            currency: currency,
            quantity: item.quantity,
            note: item.note || '',
            size: item.size || null,
            total: itemTotal
        };
    }).filter(item => item !== null); // Lọc bỏ các item null
    
    const orderData = {
        items: orderItems,
        total: total,
        paymentMethod: selectedPayment,
        language: currentLanguage,
        tableNumber: selectedTable,
        customerNotes: ""
    };
    
    showLoading();

    const isSaved = await saveOrderToFirebase(orderData);
    
    hideLoading();
    
    if (isSaved) {
        showNotification(getOrderSuccessMessage(), 'success');
        
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
}

// Get empty cart message based on language
function getEmptyCartMessage() {
    const messages = {
        vi: 'Giỏ hàng của bạn đang trống!',
        en: 'Your cart is empty!',
        fi: 'Ostoskorisi on tyhjä!'
    };
    return messages[currentLanguage] || messages.vi || 'Giỏ hàng của bạn đang trống!';
}

// Get order success message based on language
function getOrderSuccessMessage() {
    const messages = {
        vi: 'Đặt món thành công!',
        en: 'Order placed successfully!',
        fi: 'Tilaus onnistui!'
    };
    return messages[currentLanguage] || messages.vi || 'Đặt món thành công!';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '15px';
    notification.style.right = '15px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '6px';
    notification.style.color = 'white';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '10000';
    notification.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
    notification.style.maxWidth = '250px';
    notification.style.textAlign = 'center';
    notification.style.fontSize = '0.75em';
    
    switch(type) {
        case 'success':
            notification.style.background = 'linear-gradient(45deg, #00cc66, #00ff99)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(45deg, #ff9900, #ffcc00)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(45deg, #ff3300, #ff6666)';
            break;
        default:
            notification.style.background = 'linear-gradient(45deg, #0066cc, #0099ff)';
    }
    
    notification.textContent = message || '';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 2000);
}

// Close modals when clicking outside
document.addEventListener('click', function(e) {
    if (e.target === productDetailModal) {
        closeProductDetail();
    }
    if (e.target === orderReviewModal) {
        closeOrderReview();
    }
    const notLounasModal = document.getElementById('notLounasTimeModal');
    if (notLounasModal && e.target === notLounasModal) {
        notLounasModal.classList.remove('show');
    }
    
    const sizeSelectionModal = document.getElementById('sizeSelectionModal');
    if (sizeSelectionModal && e.target === sizeSelectionModal) {
        closeSizeSelection();
    }
    
    const tableSelectionModal = document.getElementById('tableSelectionModal');
    if (tableSelectionModal && e.target === tableSelectionModal) {
        closeTableSelection();
    }
});

// Make functions globally accessible
window.addProductToCartFromDetail = addProductToCartFromDetail;
window.closeProductDetail = closeProductDetail;
window.showOrderReview = showOrderReview;
window.closeOrderReview = closeOrderReview;
window.confirmOrder = confirmOrder;
window.toggleFullscreen = toggleFullscreen;
window.startCheckoutProcess = startCheckoutProcess;
window.closeTableSelection = closeTableSelection;
window.selectTable = selectTable;
window.selectTakeaway = selectTakeaway;
window.showSizeSelectionModal = showSizeSelectionModal;
window.closeSizeSelection = closeSizeSelection;
window.selectSize = selectSize;

// Hàm toggle fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}