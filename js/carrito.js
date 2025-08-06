// carrito.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyCvPAEuNQVNnIUbSk0ggegsUps9DW6MS8",
    authDomain: "calm-todo-blanco.firebaseapp.com",
    projectId: "calm-todo-blanco",
    storageBucket: "calm-todo-blanco.appspot.com",
    messagingSenderId: "115599611256",
    appId: "1:115599611256:web:fcde0c84c53ced5128e4d",
    measurementId: "G-2E6EF3K5TL"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosCollection = collection(db, 'productos');


let carrito = JSON.parse(localStorage.getItem('carrito')) || [];


const getPlaceholderImage = () => './assets/placeholder.png';


async function agregarAlCarrito(idProductoFirestore, color, medida, cantidad, precioUnitario, nombreProducto, imagenProducto) {
    if (!idProductoFirestore || !color || !medida || !cantidad || isNaN(cantidad) || cantidad <= 0 || !precioUnitario || isNaN(precioUnitario) || precioUnitario <= 0) {
        console.error("Datos incompletos o inválidos para agregar al carrito.");
        alert("Por favor, selecciona las opciones y cantidades correctas.");
        return;
    }
    let productoOriginal = null;
    try {
        const docRef = doc(db, 'productos', idProductoFirestore);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            productoOriginal = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("Error: Producto original no encontrado en Firestore para el ítem del carrito.");
            alert("El producto no está disponible o ha sido eliminado.");
            return;
        }
    } catch (error) {
        console.error("Error al obtener producto de Firestore para verificar stock:", error);
        alert("Hubo un problema al verificar la disponibilidad del producto. Intenta de nuevo.");
        return;
    }
    const stockKey = `${color}-${medida}`;
    const stockDisponible = productoOriginal.stockColoresMedidas?.[stockKey] ?? 0;
    const existingItemIndex = carrito.findIndex(item =>
        item.idProducto === idProductoFirestore &&
        item.color === color &&
        item.medida === medida
    );
    let cantidadEnCarritoActual = 0;
    if (existingItemIndex > -1) {
        cantidadEnCarritoActual = carrito[existingItemIndex].cantidad;
    }
    const nuevaCantidadTotal = cantidadEnCarritoActual + cantidad;
    if (nuevaCantidadTotal > stockDisponible) {
        alert(`No puedes agregar más. Solo hay ${stockDisponible} unidades disponibles de "${nombreProducto}" (${color}, ${medida}). Tienes ${cantidadEnCarritoActual} en tu carrito.`);
        return;
    }
    if (existingItemIndex > -1) {
        carrito[existingItemIndex].cantidad = nuevaCantidadTotal;
        console.log(`Cantidad actualizada para ${nombreProducto} (${color}, ${medida}). Nueva cantidad: ${carrito[existingItemIndex].cantidad}`);
    } else {
        carrito.push({
            idProducto: idProductoFirestore,
            nombre: nombreProducto,
            color: color,
            medida: medida,
            precioUnitario: precioUnitario,
            cantidad: cantidad,
            imagen: imagenProducto
        });
        console.log(`Nuevo ítem agregado al carrito: ${nombreProducto} (${color}, ${medida})`);
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    if (document.getElementById('carrito-contenedor')) {
        renderizarCarrito();
    }
    alert(`"${nombreProducto}" agregado al carrito (Cantidad: ${cantidad}, Color: ${color}, Medida: ${medida})`);
}

function renderizarCarrito() {
    const carritoItemsContainer = document.getElementById('carrito-contenedor');
    const totalCarritoSpan = document.getElementById('total');
    let total = 0;
    if (!carritoItemsContainer || !totalCarritoSpan) {
        console.warn("Contenedores del carrito no encontrados. Asegúrate de que #carrito-contenedor y #total existen en tu HTML.");
        return;
    }
    carritoItemsContainer.innerHTML = '';
    if (carrito.length === 0) {
        carritoItemsContainer.innerHTML = '<p style="text-align: center; margin-top: 50px; font-size: 1.2em; color: #555;">El carrito está vacío.</p>';
    } else {
        carrito.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('carrito-item');
            itemElement.innerHTML = `
                <img src="${item.imagen || getPlaceholderImage()}" alt="${item.nombre}">
                <div class="info">
                    <h4>${item.nombre}</h4>
                    <p>Color: ${item.color}, Medida: ${item.medida}</p>
                    <p>Precio Unitario: $${item.precioUnitario.toFixed(2)}</p>
                    <p>Subtotal: $${(item.precioUnitario * item.cantidad).toFixed(2)}</p>
                </div>
                <div class="cantidad-control">
                    <button onclick="window.cambiarCantidadCarrito(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="window.cambiarCantidadCarrito(${index}, 1)">+</button>
                </div>
                <button class="eliminar" onclick="window.eliminarDelCarrito(${index})">Eliminar</button>
            `;
            carritoItemsContainer.appendChild(itemElement);
            total += item.precioUnitario * item.cantidad;
        });
    }
    totalCarritoSpan.textContent = total.toFixed(2);
}


async function cambiarCantidadCarrito(index, delta) {
    if (carrito[index]) {
        const itemEnCarrito = carrito[index];
        let productoOriginal = null;
        try {
            const docRef = doc(db, 'productos', itemEnCarrito.idProducto);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                productoOriginal = { id: docSnap.id, ...docSnap.data() };
            } else {
                console.error("Error: Producto original no encontrado en Firestore para el ítem del carrito.");
                alert("El producto no está disponible o ha sido eliminado.");
                eliminarDelCarrito(index);
                return;
            }
        } catch (error) {
            console.error("Error al obtener producto de Firestore para verificar stock:", error);
            alert("Hubo un problema al verificar la disponibilidad del producto. Intenta de nuevo.");
            return;
        }
        const stockKey = `${itemEnCarrito.color}-${itemEnCarrito.medida}`;
        const stockDisponible = productoOriginal.stockColoresMedidas?.[stockKey] ?? 0;
        const nuevaCantidad = itemEnCarrito.cantidad + delta;
        if (delta > 0) {
            if (nuevaCantidad > stockDisponible) {
                alert(`No puedes agregar más. Solo hay ${stockDisponible} unidades disponibles de "${itemEnCarrito.nombre}" (${itemEnCarrito.color}, ${itemEnCarrito.medida}).`);
                return;
            }
        }
        if (nuevaCantidad >= 0) {
            carrito[index].cantidad = nuevaCantidad;
            if (carrito[index].cantidad === 0) {
                eliminarDelCarrito(index);
            } else {
                localStorage.setItem('carrito', JSON.stringify(carrito));
                renderizarCarrito();
                actualizarContadorCarrito();
            }
        }
    }
}

function eliminarDelCarrito(index) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto del carrito?")) {
        carrito.splice(index, 1);
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

// =================================================================
// FUNCIÓN MODIFICADA: Ahora exporta para ser usada en checkout.js
// =================================================================
export function vaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
        carrito = [];
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}


export function actualizarContadorCarrito() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

export function renderizarCartPreview() {
    const cartPreviewContainer = document.getElementById('cart-preview-items');
    const verMasLink = document.querySelector('#cart-preview-footer .ver-mas-link');
    const cartEmptyMessage = document.querySelector('.cart-empty-message');

    if (!cartPreviewContainer || !verMasLink) return;

    cartPreviewContainer.innerHTML = '';
    const carritoActual = JSON.parse(localStorage.getItem('carrito')) || [];

    if (carritoActual.length === 0) {
        if (cartEmptyMessage) {
            cartEmptyMessage.style.display = 'block';
            verMasLink.style.display = 'none';
        }
    } else {
        if (cartEmptyMessage) cartEmptyMessage.style.display = 'none';
        verMasLink.style.display = 'block';
        const itemsToRender = carritoActual.slice(0, 2);
        itemsToRender.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-preview-item');
            itemElement.innerHTML = `
                <img src="${item.imagen || getPlaceholderImage()}" alt="${item.nombre}">
                <div class="item-info">
                    <h4>${item.nombre}</h4>
                    <p>${item.cantidad} x $${item.precioUnitario.toFixed(2)}</p>
                </div>
            `;
            cartPreviewContainer.appendChild(itemElement);
        });
        if (carritoActual.length <= 2) {
            verMasLink.style.display = 'none';
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {

    if (document.getElementById('carrito-contenedor')) {
        renderizarCarrito();
        const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
        if (vaciarCarritoBtn) {
            vaciarCarritoBtn.addEventListener('click', vaciarCarrito);
        }
        
        // =================================================================
        // NUEVA LÓGICA: Redirigir al checkout al hacer clic en el botón de comprar
        // =================================================================
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                // Asegúrate de que el carrito no esté vacío antes de redirigir
                if (carrito.length > 0) {
                    window.location.href = '../cart/checkout.html';
                } else {
                    alert('El carrito está vacío. Agrega productos antes de continuar.');
                }
            });
        }
    }
    
    actualizarContadorCarrito();
});


window.agregarAlCarrito = agregarAlCarrito;
window.cambiarCantidadCarrito = cambiarCantidadCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.vaciarCarrito = vaciarCarrito;