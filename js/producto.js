// producto.js (Versión Modificada)

// Asegúrate de que la función 'agregarAlCarrito' de este script
// sea la que se usa para el botón en la página de detalle del producto.
// Las funciones 'renderizarCarrito', 'actualizarContadorCarrito', etc.,
// definidas en carrito.js, no necesitan estar aquí, solo la llamada.

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get("id"));

    const productos = JSON.parse(localStorage.getItem("productos")) || [];
    const producto = productos.find(p => p.id === id);

    if (!producto) {
        document.getElementById("detalle-producto").innerHTML = "<p>Producto no encontrado</p>";
        return;
    }

    // --- Renderizado del Detalle del Producto ---
    const detalle = document.getElementById("detalle-producto");
    detalle.innerHTML = `
        <div id="carrusel" class="carrusel"></div>
        <div class="detalle-info">
            <h1>${producto.nombre}</h1>
            <p class="precio" id="precio-display"></p> <p class="descripcion">${producto.descripcion}</p>

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
    if (producto.colores && producto.colores.length > 0) {
        const colorOptionsHTML = producto.colores
            .map(color => `<option value="${color}">${color}</option>`)
            .join("");
        colorSelect.innerHTML = colorOptionsHTML;
    } else {
        document.querySelector('label[for="color"]').style.display = 'none';
        colorSelect.style.display = 'none';
    }

    // --- Función para obtener la imagen de placeholder ---
    function getPlaceholderImage() {
        return '../assets/placeholder.png'; // <-- ¡AJUSTA ESTA RUTA SI ES NECESARIO!
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

        if (!hayStockEnAlgunaMedida) {
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

        if (tallesArray.length > 0) {
            medidaSelect.value = tallesArray[0];
        } else {
            medidaSelect.innerHTML = '<option value="">No hay medidas disponibles</option>';
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
    if (producto.colores && producto.colores.length > 0) {
        colorSelect.value = producto.colores[0];
    } else {
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

    // --- Productos Recomendados (código existente) ---
    const contenedorRecomendados = document.getElementById("recomendados");

    if (contenedorRecomendados) {
        const recomendados = productos.filter(p =>
            p.id !== producto.id &&
            p.tipo === producto.tipo &&
            Object.keys(p.imagenesPorColor || {}).some(color =>
                Array.isArray(p.imagenesPorColor[color]) && p.imagenesPorColor[color].length > 0
            ) &&
            Object.values(p.preciosPorMedida || {}).length > 0
        ).slice(0, 3);

        if (recomendados.length > 0) {
            // contenedorRecomendados.innerHTML = '<h2>Productos Relacionados</h2>';

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
                        <p>${precioRecomendadoHTML}</p> </a>
                `;
                divTarjetasRelacionadas.appendChild(card);
            });
            contenedorRecomendados.appendChild(divTarjetasRelacionadas);
        } else {
            contenedorRecomendados.innerHTML = "<p>No hay productos relacionados disponibles en esta categoría.</p>";
        }
    }

    // --- Listener para el botón "Agregar al Carrito" ---
    // Este listener debe estar DENTRO del DOMContentLoaded para asegurar que el botón existe
    agregarAlCarritoBtn.addEventListener("click", () => {
        // Llama a la función global 'agregarAlCarrito'
        // Asegúrate de que esta función se defina globalmente (fuera del DOMContentLoaded)
        // o que 'carrito.js' se cargue antes de este script y defina 'agregarAlCarrito'.
        // Ya tienes una definición global para 'agregarAlCarrito' en este mismo archivo, ¡perfecto!
        agregarAlCarrito(producto.id);
    });
});

// --- Función para Agregar al Carrito (GLOBAL) ---
// Esta función ahora se alinea mejor con la estructura de carrito.js
function agregarAlCarrito(idProducto) {
    const productos = JSON.parse(localStorage.getItem("productos")) || [];
    const producto = productos.find(p => p.id === idProducto);
    if (!producto) {
        console.error("Producto no encontrado para agregar al carrito.");
        return;
    }

    const cantidadInput = document.getElementById("cantidad");
    const colorSelect = document.getElementById("color");
    const medidaSelect = document.getElementById("medida");

    const cantidad = parseInt(cantidadInput.value);
    const color = colorSelect.value;
    const medida = medidaSelect.value; // Ya viene del select, no necesitamos el ?.value || ""

    // Validaciones
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

    // Obtener el precio del talle/medida seleccionado
    const precioUnitario = producto.preciosPorMedida?.[medida];

    if (precioUnitario === undefined || precioUnitario <= 0) {
        alert("No se pudo determinar el precio para la medida seleccionada. Por favor, elige una medida válida.");
        return;
    }

    // Validar stock usando el max del input (que ya se actualiza dinámicamente)
    const stockActual = parseInt(cantidadInput.max);
    if (cantidad > stockActual) {
        alert(`No hay suficiente stock. Solo quedan ${stockActual} unidades.`);
        return;
    }

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    // Estructura del ítem en el carrito para consistencia con carrito.js
    const itemExistenteIndex = carrito.findIndex(item =>
        item.idProducto === idProducto && item.color === color && item.medida === medida
    );

    const imagenParaCarrito = producto.imagenesPorColor?.[color]?.[0] || getPlaceholderImage();

    if (itemExistenteIndex !== -1) {
        // Si el ítem ya existe, incrementa la cantidad
        carrito[itemExistenteIndex].cantidad += cantidad;
    } else {
        // Si no existe, agrega el nuevo ítem
        carrito.push({
            idProducto: idProducto, // Renombrado a idProducto para consistencia con carrito.js
            nombre: producto.nombre,
            color: color,
            medida: medida,
            precioUnitario: precioUnitario, // Renombrado a precioUnitario para consistencia con carrito.js
            cantidad: cantidad,
            imagen: imagenParaCarrito
        });
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert(`"${producto.nombre}" agregado al carrito (Cantidad: ${cantidad}, Color: ${color}, Medida: ${medida})`);

    // Opcional: Si tienes una función global en carrito.js para actualizar el contador del carrito en el header,
    // puedes llamarla aquí. Asegúrate de que carrito.js se cargue antes que producto.js.
    if (typeof actualizarContadorCarrito === 'function') {
        actualizarContadorCarrito();
    }
}

// --- Función del Carrusel (Global) ---
// Mantengo esta función global ya que es útil y ya la tenías así.
function crearCarrusel(imagenes, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) {
        console.error(`ERROR: Contenedor de carrusel con ID "${contenedorId}" no encontrado.`);
        return;
    }

    // Asegúrate de que getPlaceholderImage esté disponible en este scope si no es global
    // Ya la definimos localmente en DOMContentLoaded, y globalmente en agregarAlCarrito,
    // pero si esta función es realmente global, debe poder acceder a ella.
    // La mejor forma es que getPlaceholderImage sea una función global si se usa globalmente.
    // Vamos a asegurar que sea global:
    if (typeof window.getPlaceholderImage === 'undefined') {
        window.getPlaceholderImage = () => '../assets/placeholder.png'; // Fallback global
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