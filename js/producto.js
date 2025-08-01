// producto.js (Versión Modificada para Firebase Firestore)

// 1. Importa las funciones necesarias de Firebase SDKs usando las URLs CDN completas.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Se añade 'getDocs' para productos recomendados

// 2. Tu configuración de la aplicación Firebase (¡Asegúrate de que sea la misma que en admin.js y carrito.js!)
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

// Función global para obtener la imagen de placeholder
// Asegúrate de que esta ruta sea correcta desde la ubicación de tu archivo HTML
// Por ejemplo, si producto.html está en 'pages' y 'assets' en la raíz, entonces '../assets/placeholder.png' es correcto.
function getPlaceholderImage() {
    return '../assets/placeholder.png'; // <-- ¡VERIFICA Y AJUSTA ESTA RUTA SEGÚN LA ESTRUCTURA DE TU PROYECTO!
}

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    // Asumimos que el 'id' que pasas en la URL es el ID del documento en Firestore
    const idProductoFirestore = params.get("id"); // Usamos el ID de Firestore directamente como string

    if (!idProductoFirestore) {
        document.getElementById("detalle-producto").innerHTML = "<p>ID de producto no proporcionado en la URL.</p>";
        return;
    }

    let producto = null;
    try {
        const docRef = doc(db, 'productos', idProductoFirestore);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            producto = { id: docSnap.id, ...docSnap.data() };
        } else {
            document.getElementById("detalle-producto").innerHTML = "<p>Producto no encontrado en la base de datos.</p>";
            return;
        }
    } catch (error) {
        console.error("Error al obtener el producto de Firestore:", error);
        document.getElementById("detalle-producto").innerHTML = `<p>Error al cargar el producto: ${error.message}</p>`;
        return;
    }

    // --- Renderizado del Detalle del Producto ---
    const detalle = document.getElementById("detalle-producto");
    detalle.innerHTML = `
        <div id="carrusel" class="carrusel"></div>
        <div class="detalle-info">
            <h1>${producto.nombre}</h1>
            <p class="precio" id="precio-display"></p>
            <p class="descripcion">${producto.descripcion}</p>

            <label for="color">Color:</label>
            <select id="color"></select>

            <label for="medida">Medida:</label>
            <select id="medida"></select>

            <label for="cantidad">Cantidad:</label>
            <input type="number" id="cantidad" value="1" min="1">
            <p id="stock-disponible" style="color: gray; font-size: 0.9em;"></p>

            <button id="agregar-al-carrito-btn">Agregar al carrito</button>
        </div>
    `;

    // --- Obtener referencias a los elementos después de que se han renderizado ---
    const precioDisplay = document.getElementById("precio-display");
    const cantidadInput = document.getElementById("cantidad");
    const colorSelect = document.getElementById("color");
    const medidaSelect = document.getElementById("medida");
    const stockDisponibleText = document.getElementById("stock-disponible");
    const agregarAlCarritoBtn = document.getElementById("agregar-al-carrito-btn");

    // --- Generar Opciones de Colores ---
    // Si 'colores' es un array en Firestore, úsalo. Si no, genera a partir de stockColoresMedidas
    let coloresDisponibles = [];
    if (Array.isArray(producto.colores) && producto.colores.length > 0) {
        coloresDisponibles = producto.colores;
    } else if (producto.stockColoresMedidas) {
        // Si no hay array de colores, inferir de stockColoresMedidas (claves como "Color-Medida")
        const coloresSet = new Set();
        for (const clave in producto.stockColoresMedidas) {
            if (producto.stockColoresMedidas.hasOwnProperty(clave)) {
                const [colorKey] = clave.split('-');
                coloresSet.add(colorKey);
            }
        }
        coloresDisponibles = Array.from(coloresSet);
    }
    
    if (coloresDisponibles.length > 0) {
        const colorOptionsHTML = coloresDisponibles
            .map(color => `<option value="${color}">${color}</option>`)
            .join("");
        colorSelect.innerHTML = colorOptionsHTML;
    } else {
        // Si no hay colores, oculta los selectores de color
        document.querySelector('label[for="color"]').style.display = 'none';
        colorSelect.style.display = 'none';
    }

    // --- Función para actualizar las opciones de Medida y el Stock, y AHORA EL PRECIO ---
    function actualizarMedidasYStock() {
        const colorElegido = colorSelect.value;
        const tallesDisponiblesParaColor = new Set();
        let hayStockEnAlgunaMedida = false;

        for (const clave in producto.stockColoresMedidas) {
            if (producto.stockColoresMedidas.hasOwnProperty(clave)) {
                const [colorKey, medidaKey] = clave.split('-');
                if (colorKey === colorElegido && producto.stockColoresMedidas[clave] > 0) {
                    tallesDisponiblesParaColor.add(medidaKey);
                    hayStockEnAlgunaMedida = true;
                }
            }
        }

        const tallesArray = Array.from(tallesDisponiblesParaColor);

        if (!hayStockEnAlgunaMedida || tallesArray.length === 0) {
            medidaSelect.innerHTML = '<option value="">No hay medidas disponibles</option>';
            medidaSelect.disabled = true;
            cantidadInput.disabled = true;
            agregarAlCarritoBtn.disabled = true;
            stockDisponibleText.textContent = `Stock disponible: 0`;
            precioDisplay.textContent = 'Producto sin stock disponible.';
            cantidadInput.value = 0;
            return;
        } else {
            medidaSelect.disabled = false;
            cantidadInput.disabled = false;
            agregarAlCarritoBtn.disabled = false;
        }

        const medidaOptionsHTML = tallesArray.map(medida => `<option value="${medida}">${medida}</option>`).join("");
        medidaSelect.innerHTML = medidaOptionsHTML;

        // Seleccionar la primera medida disponible por defecto
        if (tallesArray.length > 0) {
            medidaSelect.value = tallesArray[0];
        }

        actualizarCantidadMaxima();
        actualizarPrecioProducto();
        actualizarCarruselPorColor();
    }

    function actualizarCantidadMaxima() {
        const colorElegido = colorSelect.value;
        const medidaElegida = medidaSelect.value;
        const clave = `${colorElegido}-${medidaElegida}`;
        const stockActual = producto.stockColoresMedidas?.[clave] ?? 0;

        cantidadInput.max = stockActual;
        stockDisponibleText.textContent = `Stock disponible: ${stockActual}`;

        if (parseInt(cantidadInput.value) > stockActual) {
            cantidadInput.value = stockActual;
        }
        if (stockActual === 0) {
            cantidadInput.value = 0;
            cantidadInput.disabled = true;
            agregarAlCarritoBtn.disabled = true;
        } else {
            cantidadInput.disabled = false;
            agregarAlCarritoBtn.disabled = false;
        }
        cantidadInput.min = (stockActual > 0) ? 1 : 0;
    }

    // --- Actualiza el precio visible en la UI ---
    function actualizarPrecioProducto() {
        const medidaElegida = medidaSelect.value;
        const precioActual = producto.preciosPorMedida?.[medidaElegida];

        if (precioActual !== undefined) {
            precioDisplay.textContent = `$${precioActual.toFixed(2)}`;
        } else {
            const preciosExistentes = Object.values(producto.preciosPorMedida || {});
            if (preciosExistentes.length > 0) {
                const minPrecio = Math.min(...preciosExistentes);
                const maxPrecio = Math.max(...preciosExistentes);
                if (minPrecio === maxPrecio) {
                    precioDisplay.textContent = `$${minPrecio.toFixed(2)}`;
                } else {
                    precioDisplay.textContent = `Desde $${minPrecio.toFixed(2)}`;
                }
            } else {
                precioDisplay.textContent = `Precio no disponible`;
            }
        }
    }

    // --- FUNCIÓN CLAVE: Actualiza el Carrusel con imágenes del color seleccionado ---
    function actualizarCarruselPorColor() {
        const colorElegido = colorSelect.value;
        const imagenesDelColor = producto.imagenesPorColor?.[colorElegido] || [];

        const imagenesParaCarrusel = imagenesDelColor.length > 0
            ? imagenesDelColor
            : [getPlaceholderImage()];

        crearCarrusel(imagenesParaCarrusel, "carrusel");
    }

    // --- Event Listeners para actualizar la UI ---
    colorSelect.addEventListener("change", actualizarMedidasYStock);
    medidaSelect.addEventListener("change", () => {
        actualizarCantidadMaxima();
        actualizarPrecioProducto();
    });
    cantidadInput.addEventListener("input", actualizarCantidadMaxima);

    // Inicializar la interfaz al cargar la página
    if (coloresDisponibles.length > 0) {
        colorSelect.value = coloresDisponibles[0];
    } else {
        // Si no hay colores, intentar inicializar medidas con todas las disponibles si aplica
        const allMedidas = new Set();
        for (const clave in producto.stockColoresMedidas) {
            if (producto.stockColoresMedidas.hasOwnProperty(clave)) {
                const [, medidaKey] = clave.split('-');
                allMedidas.add(medidaKey);
            }
        }
        const medidaOptionsHTML = Array.from(allMedidas).map(medida => `<option value="${medida}">${medida}</option>`).join("");
        medidaSelect.innerHTML = medidaOptionsHTML;
    }
    actualizarMedidasYStock(); // Inicia la cascada de actualizaciones

    // --- Productos Recomendados ---
    const contenedorRecomendados = document.getElementById("recomendados");

    if (contenedorRecomendados) {
        // Necesitamos cargar TODOS los productos para buscar recomendados
        try {
            const snapshotRecomendados = await getDocs(productosCollection);
            const todosProductos = [];
            snapshotRecomendados.forEach(doc => {
                todosProductos.push({ id: doc.id, ...doc.data() });
            });

            const recomendados = todosProductos.filter(p =>
                p.id !== producto.id &&
                p.tipo === producto.tipo &&
                Object.keys(p.imagenesPorColor || {}).some(color =>
                    Array.isArray(p.imagenesPorColor[color]) && p.imagenesPorColor[color].length > 0
                ) &&
                Object.values(p.preciosPorMedida || {}).length > 0
            ).slice(0, 3); // Limitar a 3 productos recomendados

            if (recomendados.length > 0) {
                const divTarjetasRelacionadas = document.createElement("div");
                divTarjetasRelacionadas.classList.add("productos-relacionados");

                recomendados.forEach(p => {
                    const card = document.createElement("div");
                    card.classList.add("producto-rel-card");

                    let primeraImagenRecomendado = getPlaceholderImage();
                    if (p.imagenesPorColor) {
                        const coloresConImgs = Object.keys(p.imagenesPorColor).filter(c => Array.isArray(p.imagenesPorColor[c]) && p.imagenesPorColor[c].length > 0);
                        if (coloresConImgs.length > 0) {
                            primeraImagenRecomendado = p.imagenesPorColor[coloresConImgs[0]][0];
                        }
                    }

                    let precioRecomendadoHTML = '';
                    const preciosExistentesRecomendado = Object.values(p.preciosPorMedida || {});
                    if (preciosExistentesRecomendado.length > 0) {
                        const minPrecioRecomendado = Math.min(...preciosExistentesRecomendado);
                        precioRecomendadoHTML = `$${minPrecioRecomendado.toFixed(2)}`;
                        if (preciosExistentesRecomendado.length > 1) {
                            precioRecomendadoHTML = `Desde $${minPrecioRecomendado.toFixed(2)}`;
                        }
                    } else {
                        precioRecomendadoHTML = `Precio N/A`;
                    }

                    card.innerHTML = `
                        <a href="producto.html?id=${p.id}">
                            <img src="${primeraImagenRecomendado}" alt="${p.nombre}" class="img-producto-rel">
                            <h4>${p.nombre}</h4>
                            <p>${precioRecomendadoHTML}</p>
                        </a>
                    `;
                    divTarjetasRelacionadas.appendChild(card);
                });
                contenedorRecomendados.appendChild(divTarjetasRelacionadas);
            } else {
                contenedorRecomendados.innerHTML = "<p>No hay productos relacionados disponibles en esta categoría.</p>";
            }
        } catch (error) {
            console.error("Error al cargar productos recomendados de Firestore:", error);
            contenedorRecomendados.innerHTML = `<p>Error al cargar productos relacionados: ${error.message}</p>`;
        }
    }

    // --- Listener para el botón "Agregar al Carrito" ---
    // Este listener llama a la función local 'agregarAlCarrito' (definida abajo)
    agregarAlCarritoBtn.addEventListener("click", () => {
        // Asegúrate de que 'producto' esté disponible y tenga un 'id' antes de llamar
        if (producto && producto.id) {
            agregarAlCarrito(producto.id);
        } else {
            console.error("Error: Producto no cargado o ID no disponible para agregar al carrito.");
            alert("No se puede agregar el producto al carrito. Por favor, recarga la página.");
        }
    });
});

// --- Función para Agregar al Carrito (GLOBAL para la página producto.html) ---
// Esta función es la que se llama desde el botón "Agregar al carrito" en producto.html.
// Su propósito es recopilar los datos del formulario de la página y luego
// llamar a la función `window.agregarAlCarrito` que proviene de `carrito.js`.
async function agregarAlCarrito(idProductoFirestore) { 
    // Obtener el producto directamente de Firestore para asegurar la información más reciente
    // Esto es un doble chequeo de stock y precio, ya que `carrito.js` también lo hará,
    // pero asegura que la UI del producto refleje el estado actual antes de enviar al carrito.
    let productoActualizado = null;
    try {
        const docRef = doc(db, 'productos', idProductoFirestore);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            productoActualizado = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("Producto no encontrado en Firestore para agregar al carrito.");
            alert("El producto no está disponible o ha sido eliminado.");
            return;
        }
    } catch (error) {
        console.error("Error al obtener producto de Firestore para el carrito:", error);
        alert("Hubo un problema al verificar la disponibilidad del producto. Intenta de nuevo.");
        return;
    }

    const cantidadInput = document.getElementById("cantidad");
    const colorSelect = document.getElementById("color");
    const medidaSelect = document.getElementById("medida");

    const cantidad = parseInt(cantidadInput.value);
    const color = colorSelect.value;
    const medida = medidaSelect.value;

    // Validaciones (mantenerlas aquí)
    if (cantidad <= 0 || isNaN(cantidad)) {
        alert("Por favor, ingresa una cantidad válida (mayor a cero) para agregar al carrito.");
        return;
    }
    if (!color) {
        alert("Por favor, selecciona un color.");
        return;
    }
    if (!medida) {
        alert("Por favor, selecciona una medida.");
        return;
    }

    const precioUnitario = productoActualizado.preciosPorMedida?.[medida];

    if (precioUnitario === undefined || precioUnitario <= 0) {
        alert("No se pudo determinar el precio para la medida seleccionada. Por favor, elige una medida válida.");
        return;
    }

    // Llamar a la función `agregarAlCarrito` del módulo `carrito.js` (ahora expuesta a `window`)
    // ¡Es crucial que `carrito.js` se cargue ANTES que `producto.js` en tu HTML!
    if (typeof window.agregarAlCarrito === 'function') {
        await window.agregarAlCarrito(
            productoActualizado.id,
            color,
            medida,
            cantidad,
            precioUnitario,
            productoActualizado.nombre,
            productoActualizado.imagenesPorColor?.[color]?.[0] || getPlaceholderImage()
        );
    } else {
        console.error("La función global 'agregarAlCarrito' (de carrito.js) no está definida. Asegúrate de que carrito.js se cargue correctamente y exponga sus funciones a 'window'.");
        alert("Hubo un error al intentar agregar al carrito. Por favor, recarga la página.");
    }
}

// --- Función del Carrusel (Global para la página producto.html) ---
// Esta función gestiona la visualización del carrusel de imágenes del producto.
function crearCarrusel(imagenes, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) {
        console.error(`ERROR: Contenedor de carrusel con ID "${contenedorId}" no encontrado.`);
        return;
    }

    const imagenesAMostrar = (imagenes && imagenes.length > 0) ? imagenes : [getPlaceholderImage()];

    let indice = 0;

    contenedor.innerHTML = `
        <button class="btn-carrusel izq">‹</button>
        <div class="imagen-carrusel">
            <img src="${imagenesAMostrar[indice]}" alt="Imagen del producto">
        </div>
        <button class="btn-carrusel der">›</button>
    `;

    const imgContainer = contenedor.querySelector(".imagen-carrusel");
    const img = imgContainer.querySelector("img");
    const btnIzq = contenedor.querySelector(".izq");
    const btnDer = contenedor.querySelector(".der");

    const zoomScale = 1.6;

    imgContainer.addEventListener("mouseenter", () => {
        img.style.transform = `scale(${zoomScale})`;
        img.style.cursor = 'zoom-in';
        img.classList.add("zooming");
    });

    imgContainer.addEventListener("mousemove", (e) => {
        if (img.classList.contains("zooming")) {
            const rect = imgContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const originX = x * 100;
            const originY = y * 100;
            img.style.transformOrigin = `${originX}% ${originY}%`;
            img.style.transform = `scale(${zoomScale})`;
        }
    });

    imgContainer.addEventListener("mouseleave", () => {
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
        img.style.cursor = 'grab';
        img.classList.remove("zooming");
    });

    if (imagenesAMostrar.length <= 1) {
        btnIzq.style.display = 'none';
        btnDer.style.display = 'none';
    } else {
        btnIzq.style.display = 'block';
        btnDer.style.display = 'block';
    }

    btnIzq.addEventListener("click", () => {
        indice = (indice - 1 + imagenesAMostrar.length) % imagenesAMostrar.length;
        img.src = imagenesAMostrar[indice];
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
        img.classList.remove("zooming");
    });

    btnDer.addEventListener("click", () => {
        indice = (indice + 1) % imagenesAMostrar.length;
        img.src = imagenesAMostrar[indice];
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center center';
        img.classList.remove("zooming");
    });
}