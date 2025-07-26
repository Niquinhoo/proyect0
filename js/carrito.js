// cart.js (Modificado para Firebase Firestore para la validación de stock)

// 1. Importa las funciones necesarias de Firebase SDKs usando las URLs CDN completas.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. Tu configuración de la aplicación Firebase (¡Asegúrate de que sea la misma en todos tus scripts!)
const firebaseConfig = {
    apiKey: "AIzaSyCvPAEuNQVNnIUbSk0ggegsUps9DW6MS8", // Tu API Key
    authDomain: "calm-todo-blanco.firebaseapp.com",
    projectId: "calm-todo-blanco",
    storageBucket: "calm-todo-blanco.appspot.com",
    messagingSenderId: "115599611256",
    appId: "1:115599611256:web:fcde0c84c53ced5128e4d",
    measurementId: "G-2E6EF3K5TL"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosCollection = collection(db, 'productos'); // Referencia a la colección 'productos'

// Referencias al carrito en localStorage (El carrito en sí mismo se mantiene en localStorage)
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// --- Funciones del Carrito ---

// Función global para obtener la imagen de placeholder (para usar en el carrito si una imagen no está definida)
// Asegúrate de que esta ruta sea correcta desde la raíz de tu sitio si cart.html está en la raíz,
// o ajústala si cart.html está en una subcarpeta.
const getPlaceholderImage = () => './assets/placeholder.png'; // Ruta a la imagen de placeholder


/**
 * Agrega un ítem al carrito o incrementa su cantidad si ya existe.
 * Esta función será llamada desde el script de tu página de productos (ej. producto.js)
 * @param {string} idProductoFirestore - El ID del documento de Firebase del producto a agregar.
 * @param {string} color - El color seleccionado.
 * @param {string} medida - La medida seleccionada.
 * @param {number} cantidad - La cantidad a agregar.
 * @param {number} precioUnitario - El precio unitario del producto con la medida y color.
 * @param {string} nombreProducto - El nombre del producto.
 * @param {string} imagenProducto - La URL de la imagen principal del producto para el carrito.
 */
async function agregarAlCarrito(idProductoFirestore, color, medida, cantidad, precioUnitario, nombreProducto, imagenProducto) {
    if (!idProductoFirestore || !color || !medida || !cantidad || isNaN(cantidad) || cantidad <= 0 || !precioUnitario || isNaN(precioUnitario) || precioUnitario <= 0) {
        console.error("Datos incompletos o inválidos para agregar al carrito.");
        alert("Por favor, selecciona las opciones y cantidades correctas.");
        return;
    }

    // Obtener el producto original de Firestore para verificar el stock más reciente
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

    // Buscar si el ítem ya existe en el carrito (mismo producto, mismo color, misma medida)
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
        // Si el ítem ya existe, incrementa la cantidad
        carrito[existingItemIndex].cantidad = nuevaCantidadTotal;
        console.log(`Cantidad actualizada para ${nombreProducto} (${color}, ${medida}). Nueva cantidad: ${carrito[existingItemIndex].cantidad}`);
    } else {
        // Si no existe, agrega el nuevo ítem
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
    renderizarCarrito();
    actualizarContadorCarrito();
    alert(`"${nombreProducto}" agregado al carrito (Cantidad: ${cantidad}, Color: ${color}, Medida: ${medida})`);
}

/**
 * Renderiza el contenido del carrito en el HTML.
 */
function renderizarCarrito() {
    const carritoItemsContainer = document.getElementById('carrito-contenedor');
    const totalCarritoSpan = document.getElementById('total');
    let total = 0;

    if (!carritoItemsContainer || !totalCarritoSpan) {
        console.warn("Contenedores del carrito no encontrados. Asegúrate de que #carrito-contenedor y #total existen en tu HTML.");
        return;
    }

    carritoItemsContainer.innerHTML = ''; // Limpiar el contenedor antes de re-renderizar

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

/**
 * Cambia la cantidad de un ítem en el carrito, respetando el stock.
 * @param {number} index - Índice del ítem en el array del carrito.
 * @param {number} delta - Cantidad a sumar o restar (ej. 1 o -1).
 */
async function cambiarCantidadCarrito(index, delta) {
    if (carrito[index]) {
        const itemEnCarrito = carrito[index];

        // 1. Encontrar el producto original en Firestore para obtener el stock más reciente
        let productoOriginal = null;
        try {
            const docRef = doc(db, 'productos', itemEnCarrito.idProducto);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                productoOriginal = { id: docSnap.id, ...docSnap.data() };
            } else {
                console.error("Error: Producto original no encontrado en Firestore para el ítem del carrito.");
                alert("El producto no está disponible o ha sido eliminado.");
                // Eliminar del carrito si el producto ya no existe
                eliminarDelCarrito(index);
                return;
            }
        } catch (error) {
            console.error("Error al obtener producto de Firestore para verificar stock:", error);
            alert("Hubo un problema al verificar la disponibilidad del producto. Intenta de nuevo.");
            return;
        }

        // 2. Obtener el stock disponible para el color y medida específicos
        const stockKey = `${itemEnCarrito.color}-${itemEnCarrito.medida}`;
        const stockDisponible = productoOriginal.stockColoresMedidas?.[stockKey] ?? 0;

        const nuevaCantidad = itemEnCarrito.cantidad + delta;

        if (delta > 0) { // Si estamos intentando aumentar la cantidad
            if (nuevaCantidad > stockDisponible) {
                alert(`No puedes agregar más. Solo hay ${stockDisponible} unidades disponibles de "${itemEnCarrito.nombre}" (${itemEnCarrito.color}, ${itemEnCarrito.medida}).`);
                return; // No permitir que la cantidad exceda el stock
            }
        }

        if (nuevaCantidad >= 0) {
            carrito[index].cantidad = nuevaCantidad;
            if (carrito[index].cantidad === 0) {
                eliminarDelCarrito(index); // Si la cantidad llega a 0, eliminar el ítem
            } else {
                localStorage.setItem('carrito', JSON.stringify(carrito));
                renderizarCarrito();
                actualizarContadorCarrito();
            }
        }
    }
}

/**
 * Elimina un ítem del carrito.
 * @param {number} index - Índice del ítem en el array del carrito a eliminar.
 */
function eliminarDelCarrito(index) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto del carrito?")) {
        carrito.splice(index, 1);
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

/**
 * Vacía completamente el carrito.
 */
function vaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar todo el carrito?")) {
        carrito = [];
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

/**
 * Actualiza un contador visual del carrito (ej. un número en un ícono de carrito en el header).
 */
function actualizarContadorCarrito() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCountElement.textContent = totalItems;
        cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
    // Renderiza el carrito y el contador al cargar la página del carrito
    renderizarCarrito();
    actualizarContadorCarrito();

    // Listener para el botón "Vaciar Carrito"
    const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
    if (vaciarCarritoBtn) {
        vaciarCarritoBtn.addEventListener('click', vaciarCarrito);
    }
});

// Exportar funciones para que puedan ser llamadas desde otros módulos (producto.js)
// Si producto.js llama a agregarAlCarrito, necesita esta exportación
window.agregarAlCarrito = agregarAlCarrito;
window.cambiarCantidadCarrito = cambiarCantidadCarrito;
window.eliminarDelCarrito = eliminarDelCarrito;
window.vaciarCarrito = vaciarCarrito;
window.actualizarContadorCarrito = actualizarContadorCarrito;