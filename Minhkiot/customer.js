
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
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

// Initialize the page
window.addEventListener('load', async function() {
    await loadMenuData();
    // Language selection screen is shown by default
});

// Load menu data from menu.json file (only)
async function loadMenuData() {
    try {
        const response = await fetch('menu/menu.json');
        if (response.ok) {
            menuData = await response.json();
        } else {
            console.error('Failed to load menu.json:', response.status);
            showNotification("Không thể tải thực đơn. Vui lòng kiểm tra lại kết nối hoặc file menu.json.", "error");
            menuData = [];
        }
    } catch (error) {
        console.error('Error loading menu data from menu.json:', error);
        showNotification("Lỗi khi tải thực đơn từ máy chủ.", "error");
        menuData = [];
    }
}

// Language selection handler
document.querySelectorAll('.language-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentLanguage = this.dataset.lang;
        languageSelect.value = currentLanguage;
        updateLanguage();
        loadCategories();
        displayProducts();
        updateCartDisplay();
        languageSelection.style.display = 'none';
        mainContainer.style.display = 'flex';
    });
});

// Language change handler
languageSelect.addEventListener('change', function() {
    currentLanguage = this.value;
    updateLanguage();
    loadCategories();
    displayProducts();
    updateCartDisplay();
});

// Update language for all elements
function updateLanguage() {
    const translations = {
        vi: {
            restaurantName: "Minhkiot",
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
            close: "Đóng"
        },
        en: {
            restaurantName: "Minhkiot",
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
            close: "Close"
        },
        fi: {
            restaurantName: "Minhkiot",
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
            close: "Sulje"
        }
    };

    const currentTranslations = translations[currentLanguage];
    
    document.getElementById('restaurantName').textContent = currentTranslations.restaurantName;
    document.getElementById('categoriesTitle').textContent = currentTranslations.categoriesTitle;
    document.getElementById('productsTitle').textContent = currentTranslations.productsTitle;
    document.getElementById('cartTitle').textContent = currentTranslations.cartTitle;
    document.getElementById('checkoutBtn').textContent = currentTranslations.checkoutBtn;
    
    // Update order review modal texts
    document.getElementById('orderReviewTitle').textContent = currentTranslations.orderReviewTitle;
    document.getElementById('paymentMethodTitle').textContent = currentTranslations.paymentMethodTitle;
    document.getElementById('cancelOrderBtn').textContent = currentTranslations.cancelOrderBtn;
    document.getElementById('confirmOrderBtn').textContent = currentTranslations.confirmOrderBtn;
    
    // Update payment method options
    const paymentOptions = paymentMethod.querySelectorAll('option');
    if (paymentOptions.length >= 5) {
        paymentOptions[1].textContent = currentTranslations.paymentCash;
        paymentOptions[2].textContent = currentTranslations.paymentCard;
        paymentOptions[3].textContent = currentTranslations.paymentEdenred;
        paymentOptions[4].textContent = currentTranslations.paymentEpassi;
    }
    
    // Update product detail modal texts
    document.getElementById('addToCartDetailBtn').textContent = currentTranslations.addToCart;
}

// Load and display categories
function loadCategories() {
    // Get unique categories
    const categories = [...new Set(menuData.map(item => item.category))];
    
    categoriesGrid.innerHTML = '';
    
    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.onclick = () => filterByCategory(category);
        
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
        'súp': { vi: 'Súp', en: 'Soup', fi: 'Keitto' }
    };
    
    return categoryNames[category]?.[currentLanguage] || category;
}

// Filter products by category
function filterByCategory(category) {
    currentCategory = category;
    displayProducts();
}

// Display products with very small uniform size
function displayProducts() {
    let filteredProducts = menuData;
    
    if (currentCategory) {
        filteredProducts = menuData.filter(product => product.category === currentCategory);
    }
    
    productsGrid.innerHTML = '';
    
    filteredProducts.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card-uniform';
        
        // Product image with uniform small size
        const imgContainer = document.createElement('div');
        imgContainer.className = 'product-image-container';
        
        if (product.image) {
            const img = document.createElement('img');
            img.className = 'product-image-uniform';
            img.src = product.image;
            img.alt = product.name[currentLanguage];
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
        
        // Product info container
        const infoContainer = document.createElement('div');
        infoContainer.className = 'product-info-container';
        
        // Product name (very small font)
        const productName = document.createElement('div');
        productName.className = 'product-name-uniform';
        productName.textContent = product.name[currentLanguage];
        infoContainer.appendChild(productName);
        
        // Product price (very small font) - Changed to Euro
        const productPrice = document.createElement('div');
        productPrice.className = 'product-price-uniform';
        productPrice.textContent = `${product.price?.toLocaleString() || '0'} €`;
        infoContainer.appendChild(productPrice);
        
        productCard.appendChild(infoContainer);
        
        // Show detail when clicking anywhere on the card
        productCard.onclick = () => showProductDetail(product);
        
        productsGrid.appendChild(productCard);
    });
}

// Show product detail modal
function showProductDetail(product) {
    document.getElementById('productDetailName').textContent = product.name[currentLanguage];
    // Changed to Euro
    document.getElementById('productDetailPrice').textContent = `${product.price?.toLocaleString() || '0'} €`;
    document.getElementById('productDetailIngredients').textContent = product.ingredients[currentLanguage];
    
    if (product.image) {
        document.getElementById('productDetailImage').src = product.image;
        document.getElementById('productDetailImage').style.display = 'block';
    } else {
        document.getElementById('productDetailImage').style.display = 'none';
    }
    
    document.getElementById('productDetailNote').placeholder = getNotePlaceholder();
    document.getElementById('addToCartDetailBtn').textContent = getAddToCartText();
    
    // Store current product for adding to cart
    productDetailModal.dataset.currentProduct = JSON.stringify(product);
    
    productDetailModal.classList.add('show');
}

// Close product detail modal
function closeProductDetail() {
    productDetailModal.classList.remove('show');
}

// Add product to cart from detail modal
function addProductToCartFromDetail() {
    const productJson = productDetailModal.dataset.currentProduct;
    const product = JSON.parse(productJson);
    const note = document.getElementById('productDetailNote').value.trim();
    
    addToCart(product, note);
    closeProductDetail();
}

// Get note placeholder text based on language
function getNotePlaceholder() {
    const texts = {
        vi: 'Ghi chú đặc biệt',
        en: 'Special notes',
        fi: 'Erikoishuomautukset'
    };
    return texts[currentLanguage];
}

// Get add to cart button text based on language
function getAddToCartText() {
    const texts = {
        vi: 'Thêm vào giỏ',
        en: 'Add to Cart',
        fi: 'Lisää koriin'
    };
    return texts[currentLanguage];
}

// Add product to cart with note
function addToCart(product, note = '') {
    const existingItem = cart.find(item => 
        item.product.name.vi === product.name.vi && 
        item.note === note
    );
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            product: product,
            quantity: 1,
            note: note
        });
    }
    
    updateCartDisplay();
    showNotification(`${product.name[currentLanguage]} đã được thêm vào giỏ hàng!`);
}

// Update cart display
function updateCartDisplay() {
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
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'cart-item-info';
        
        const itemName = document.createElement('div');
        itemName.className = 'cart-item-name';
        itemName.textContent = item.product.name[currentLanguage];
        itemInfo.appendChild(itemName);
        
        if (item.note) {
            const itemNote = document.createElement('div');
            itemNote.className = 'cart-item-note';
            itemNote.textContent = `Ghi chú: ${item.note}`;
            itemInfo.appendChild(itemNote);
        }
        
        const itemPrice = document.createElement('div');
        itemPrice.className = 'cart-item-price';
        // Changed to Euro
        itemPrice.textContent = `${item.product.price?.toLocaleString() || '0'}€ x ${item.quantity}`;
        itemInfo.appendChild(itemPrice);
        
        cartItem.appendChild(itemInfo);
        
        const quantityControl = document.createElement('div');
        quantityControl.className = 'cart-item-quantity';
        
        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantity-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => updateQuantity(index, -1);
        quantityControl.appendChild(minusBtn);
        
        const quantityDisplay = document.createElement('span');
        quantityDisplay.textContent = item.quantity;
        quantityDisplay.style.fontSize = '0.7em';
        quantityControl.appendChild(quantityDisplay);
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantity-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => updateQuantity(index, 1);
        quantityControl.appendChild(plusBtn);
        
        cartItem.appendChild(quantityControl);
        
        cartItems.appendChild(cartItem);
        
        total += (item.product.price || 0) * item.quantity;
    });
    
    // Changed to Euro
    cartTotal.textContent = getCartTotalText() + `: ${total.toLocaleString()}€`;
}

// Get empty cart text based on language
function getEmptyCartText() {
    const texts = {
        vi: 'Giỏ hàng trống',
        en: 'Cart is empty',
        fi: 'Ostoskori on tyhjä'
    };
    return texts[currentLanguage];
}

// Get cart total text based on language
function getCartTotalText() {
    const texts = {
        vi: 'Tổng',
        en: 'Total',
        fi: 'Yhteensä'
    };
    return texts[currentLanguage];
}

// Update item quantity in cart
function updateQuantity(index, change) {
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
    
    const orderReviewContent = document.getElementById('orderReviewContent');
    let total = 0;
    
    orderReviewContent.innerHTML = '';
    
    cart.forEach(item => {
        const itemTotal = (item.product.price || 0) * item.quantity;
        total += itemTotal;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = 'order-review-item';
        
        const itemName = document.createElement('div');
        itemName.className = 'order-review-name';
        itemName.textContent = item.product.name[currentLanguage];
        reviewItem.appendChild(itemName);
        
        if (item.note) {
            const itemNote = document.createElement('div');
            itemNote.className = 'order-review-note';
            itemNote.textContent = `Ghi chú: ${item.note}`;
            reviewItem.appendChild(itemNote);
        }
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'order-review-details';
        // Changed to Euro
        itemDetails.textContent = `SL: ${item.quantity} | Giá: ${item.product.price?.toLocaleString() || '0'}€ | Tiền: ${itemTotal.toLocaleString()}€`;
        reviewItem.appendChild(itemDetails);
        
        orderReviewContent.appendChild(reviewItem);
    });
    
    const totalElement = document.createElement('div');
    totalElement.style.fontWeight = 'bold';
    totalElement.style.fontSize = '1em';
    totalElement.style.color = '#0066cc';
    totalElement.style.marginTop = '15px';
    totalElement.style.paddingTop = '10px';
    totalElement.style.borderTop = '1px solid #0066cc';
    // Changed to Euro
    totalElement.textContent = `${getCartTotalText()}: ${total.toLocaleString()}€`;
    orderReviewContent.appendChild(totalElement);
    
    orderReviewModal.classList.add('show');
}

// Close order review modal
function closeOrderReview() {
    orderReviewModal.classList.remove('show');
}

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
    const selectedPayment = paymentMethod.value;
    
    if (!selectedPayment) {
        showNotification('Vui lòng chọn phương thức thanh toán!', 'warning');
        return;
    }
    
    // Prepare order data
    let total = 0;
    const orderItems = cart.map(item => {
        const itemTotal = (item.product.price || 0) * item.quantity;
        total += itemTotal;
        return {
            name: item.product.name,
            price: item.product.price,
            currency: '€',
            quantity: item.quantity,
            note: item.note,
            total: itemTotal
        };
    });
    
    const orderData = {
        items: orderItems,
        total: total,
        paymentMethod: selectedPayment,
        language: currentLanguage,
        tableNumber: "Bàn 1",
        customerNotes: ""
    };
    
    // Save order to Firebase
    const isSaved = await saveOrderToFirebase(orderData);
    
    if (isSaved) {
        // Show success message
        showNotification(getOrderSuccessMessage(), 'success');
        
        // Refresh page after successful order
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
    return messages[currentLanguage];
}

// Get order success message based on language
function getOrderSuccessMessage() {
    const messages = {
        vi: 'Đặt món thành công!',
        en: 'Order placed successfully!',
        fi: 'Tilaus onnistui!'
    };
    return messages[currentLanguage];
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
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
    
    // Set style based on type
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
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 2 seconds
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
});

// Make functions globally accessible for HTML onclick attributes
window.addProductToCartFromDetail = addProductToCartFromDetail;
window.closeProductDetail = closeProductDetail;
window.showOrderReview = showOrderReview;
window.closeOrderReview = closeOrderReview;
window.confirmOrder = confirmOrder;
window.toggleFullscreen = toggleFullscreen;

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