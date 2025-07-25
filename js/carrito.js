// cart.js

// Asegúrate de que los productos estén cargados desde localStorage.
// Este código asume que 'productos' es una variable global o que ya se cargó en la página.
// Si tus productos se cargan en otro script (ej. directamente en index.html o un products.js),
// asegúrate de que sean accesibles aquí. Si no, tendrás que cargarlos de nuevo:
const productos = JSON.parse(localStorage.getItem('productos')) || [];

// Referencias al carrito en localStorage
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

// --- Funciones del Carrito ---

/**
 * Agrega un ítem al carrito o incrementa su cantidad si ya existe.
 * Esta función será llamada desde el script de tu página de productos (ej. index.js o products.js)
 * @param {object} itemToAdd - El ítem del producto a agregar (con color, medida, cantidad).
 */
function agregarAlCarrito(itemToAdd) {
    // Buscar si el ítem ya existe en el carrito (mismo producto, mismo color, misma medida)
    const existingItemIndex = carrito.findIndex(item =>
        item.idProducto === itemToAdd.idProducto &&
        item.color === itemToAdd.color &&
        item.medida === itemToAdd.medida
    );

    // Obtener el producto original para verificar el stock
    const productoOriginal = productos.find(p => p.id === itemToAdd.idProducto);
    if (!productoOriginal) {
        console.error("Error: Producto original no encontrado para el ítem del carrito.");
        return;
    }

    const stockKey = `${itemToAdd.color}-${itemToAdd.medida}`;
    const stockDisponible = productoOriginal.stockColoresMedidas?.[stockKey] ?? 0;

    if (existingItemIndex > -1) {
        // Si el ítem ya existe, incrementa la cantidad, pero no más allá del stock disponible
        const nuevaCantidad = carrito[existingItemIndex].cantidad + itemToAdd.cantidad;
        if (nuevaCantidad > stockDisponible) {
            alert(`No puedes agregar más. Solo hay ${stockDisponible} unidades disponibles de "${itemToAdd.nombre}" (${itemToAdd.color}, ${itemToAdd.medida}).`);
            return; // No agregar si excede el stock
        }
        carrito[existingItemIndex].cantidad = nuevaCantidad;
        console.log(`Cantidad actualizada para ${itemToAdd.nombre} (${itemToAdd.color}, ${itemToAdd.medida}). Nueva cantidad: ${carrito[existingItemIndex].cantidad}`);
    } else {
        // Si no existe, verifica que la cantidad inicial no exceda el stock
        if (itemToAdd.cantidad > stockDisponible) {
            alert(`No puedes agregar esa cantidad. Solo hay ${stockDisponible} unidades disponibles de "${itemToAdd.nombre}" (${itemToAdd.color}, ${itemToAdd.medida}).`);
            return; // No agregar si excede el stock
        }
        carrito.push(itemToAdd);
        console.log(`Nuevo ítem agregado al carrito: ${itemToAdd.nombre} (${itemToAdd.color}, ${itemToAdd.medida})`);
    }

    // Guarda el carrito actualizado en localStorage
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderizarCarrito(); // Llama a la función para actualizar la visualización del carrito
    actualizarContadorCarrito(); // Llama a una función para actualizar un ícono de carrito (si tienes uno en tu header)
}

/**
 * Renderiza el contenido del carrito en el HTML.
 * Adaptada para usar tus IDs y clases: #carrito-contenedor, .carrito-item, #total.
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
            itemElement.classList.add('carrito-item'); // Usa tu clase CSS

            itemElement.innerHTML = `
                <img src="${item.imagen}" alt="${item.nombre}">
                <div class="info">
                    <h4>${item.nombre}</h4>
                    <p>Color: ${item.color}, Medida: ${item.medida}</p>
                    <p>Precio Unitario: $${item.precioUnitario.toFixed(2)}</p>
                    <p>Subtotal: $${(item.precioUnitario * item.cantidad).toFixed(2)}</p>
                </div>
                <div class="cantidad-control">
                    <button onclick="cambiarCantidadCarrito(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                </div>
                <button class="eliminar" onclick="eliminarDelCarrito(${index})">Eliminar</button>
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
function cambiarCantidadCarrito(index, delta) {
    if (carrito[index]) {
        const itemEnCarrito = carrito[index];

        // 1. Encontrar el producto original para obtener el stock
        const productoOriginal = productos.find(p => p.id === itemEnCarrito.idProducto);
        if (!productoOriginal) {
            console.error("Error: Producto original no encontrado para el ítem del carrito.");
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

        // Si la nueva cantidad es válida (no excede el stock y es >= 0)
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
 * Asume que tienes un elemento con id="cart-count" en tu header o alguna parte visible.
 * Si no lo tienes, puedes ignorar esta función o crear el elemento en tu header HTML.
 */
function actualizarContadorCarrito() {
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) {
        const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCountElement.textContent = totalItems;
        // Ocultar/mostrar el contador si no hay ítems
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