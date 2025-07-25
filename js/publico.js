// publico.js (Modificado para incluir sugerencias de búsqueda y corregir scroll)

document.addEventListener("DOMContentLoaded", () => {
    const contenedorProductos = document.getElementById("contenedor-productos");
    const productos = JSON.parse(localStorage.getItem("productos")) || [];

    // --- Referencias a los elementos de la barra de búsqueda y el nuevo contenedor de sugerencias ---
    const searchInput = document.querySelector('header .search-bar input[type="text"]');
    // ¡CORREGIDO! Selector actualizado para el botón de búsqueda
    const searchButton = document.getElementById('search-button'); 
    
    // Contenedor para las sugerencias de búsqueda
    const suggestionsContainer = document.getElementById('search-suggestions'); 

    // --- Referencias para el efecto de scroll ---
    const header = document.getElementById("encabezado"); // ¡CORREGIDO! Ahora buscará el ID en el header
    const menuCategorias = document.getElementById("menu-categorias"); // Asegúrate de que este ID exista en tu HTML

    // Validaciones para asegurar que los elementos existen
    if (!contenedorProductos) {
        console.error("No se encontró el contenedor con ID 'contenedor-productos'.");
        return;
    }
    if (!searchInput) {
        console.error("No se encontró el input de búsqueda.");
        return;
    }
    // Es un warning porque la funcionalidad principal no depende de él, pero es bueno saberlo.
    if (!searchButton) {
        console.warn("Botón de búsqueda no encontrado. Asegúrate de que el selector '#search-button' es correcto.");
    }
    if (!suggestionsContainer) {
        console.error("No se encontró el contenedor de sugerencias con ID 'search-suggestions'.");
        return;
    }
    if (!header) { // ¡NUEVO! Validación para el header
        console.error("No se encontró el header con ID 'encabezado'. El efecto de scroll no funcionará.");
    }
    if (!menuCategorias) { // ¡NUEVO! Validación para el menú de categorías
        console.error("No se encontró el menú de categorías con ID 'menu-categorias'. El efecto de scroll no funcionará.");
    }

    if (!Array.isArray(productos) || productos.length === 0) {
        contenedorProductos.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
    }

    // --- Función para obtener la imagen de placeholder ---
    const getPlaceholderImage = () => './assets/placeholder.png'; // <-- ¡AJUSTA ESTA RUTA!

    // --- Función para determinar el precio a mostrar en la tarjeta (EXISTENTE) ---
    function getDisplayPrice(producto) {
        if (!producto.preciosPorMedida || Object.keys(producto.preciosPorMedida).length === 0) {
            return "Precio no disponible";
        }

        const tallesOrdenados = {
            sabana: ["1 plaza", "2 plazas", "queen", "king"],
            acolchado: ["1 plaza", "2 plazas", "queen", "king"],
            frazada: ["1 plaza", "2 plazas", "queen", "king"],
            toalla: ["300g", "400g", "500g", "600g"]
        };

        const tallesPrioritarios = tallesOrdenados[producto.tipo];

        if (tallesPrioritarios && tallesPrioritarios.length > 0) {
            if (producto.tipo === 'toalla' && producto.preciosPorMedida['500g']) {
                return `$${producto.preciosPorMedida['500g'].toFixed(2)}`;
            }

            if (tallesPrioritarios.length >= 2) {
                const segundoTallePrioritario = tallesPrioritarios[1];
                if (producto.preciosPorMedida[segundoTallePrioritario]) {
                    return `$${producto.preciosPorMedida[segundoTallePrioritario].toFixed(2)}`;
                }
            }

            const preciosDisponibles = Object.values(producto.preciosPorMedida)
                                                .filter(precio => typeof precio === 'number' && precio > 0);

            if (preciosDisponibles.length > 0) {
                const minPrecio = Math.min(...preciosDisponibles);
                if (preciosDisponibles.length > 1 && !tallesPrioritarios.some(t => producto.preciosPorMedida[t] === minPrecio)) {
                    return `Desde $${minPrecio.toFixed(2)}`;
                }
                return `$${minPrecio.toFixed(2)}`;
            }
        }

        const allPrices = Object.values(producto.preciosPorMedida || {});
        if (allPrices.length > 0) {
            const minPrice = Math.min(...allPrices);
            if (allPrices.length > 1) {
                return `Desde $${minPrice.toFixed(2)}`;
            }
            return `$${minPrice.toFixed(2)}`;
        }

        return "Precio no definido";
    }

    // --- Renderizar todos los productos inicialmente (EXISTENTE) ---
    function renderizarProductos(productosARenderizar) {
        contenedorProductos.innerHTML = "";
        if (productosARenderizar.length === 0) {
            contenedorProductos.innerHTML = "<p>No hay productos disponibles que coincidan con la búsqueda.</p>";
            return;
        }

        productosARenderizar.forEach(producto => {
            const card = document.createElement("div");
            card.classList.add("producto");

            let imagenPrincipal = getPlaceholderImage();
            let imagenSecundaria = getPlaceholderImage();

            const coloresConImagenes = Object.keys(producto.imagenesPorColor || {}).filter(color =>
                Array.isArray(producto.imagenesPorColor[color]) && producto.imagenesPorColor[color].length > 0
            );

            if (coloresConImagenes.length > 0) {
                const primerColorConImagen = coloresConImagenes[0];
                imagenPrincipal = producto.imagenesPorColor[primerColorConImagen][0];

                if (producto.imagenesPorColor[primerColorConImagen].length > 1) {
                    imagenSecundaria = producto.imagenesPorColor[primerColorConImagen][1];
                } else if (coloresConImagenes.length > 1) {
                    const segundoColorConImagen = coloresConImagenes[1];
                    imagenSecundaria = producto.imagenesPorColor[segundoColorConImagen][0];
                } else {
                    imagenSecundaria = imagenPrincipal;
                }
            }

            const nombre = producto.nombre || "Producto sin nombre";
            const precioMostrado = getDisplayPrice(producto);

            // Ajuste en la ruta del enlace para que funcione desde index.html a producto.html
            // Si index.html está en la raíz y producto.html en ../productos, la ruta relativa sería '../productos/producto.html'
            card.innerHTML = `
                <a href="../productos/producto.html?id=${encodeURIComponent(producto.id)}" class="producto-link">
                    <img src="${imagenPrincipal}"
                         data-front="${imagenPrincipal}"
                         data-back="${imagenSecundaria}"
                         alt="${nombre}"
                         class="img-producto">
                    <h3>${nombre}</h3>
                    <p class="precio">${precioMostrado}</p>
                    <p class="descripcion"></p>
                </a>
            `;

            contenedorProductos.appendChild(card);
        });

        document.querySelectorAll(".img-producto").forEach(img => {
            img.addEventListener("mouseenter", () => {
                if (img.dataset.back && img.dataset.back !== img.dataset.front) {
                    img.src = img.dataset.back;
                }
            });
            img.addEventListener("mouseleave", () => {
                if (img.dataset.front) {
                    img.src = img.dataset.front;
                }
            });
        });
    }

    // --- FUNCIONES PARA LAS SUGERENCIAS ---
    function mostrarSugerencias(suggestedProducts) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'block';

        if (suggestedProducts.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const ul = document.createElement('ul');
        suggestedProducts.forEach(product => {
            const li = document.createElement('li');
            li.textContent = product.nombre;
            li.dataset.productId = product.id;
            li.addEventListener('click', () => {
                // Ajuste en la ruta del enlace para que funcione desde index.html a producto.html
                window.location.href = `../productos/producto.html?id=${encodeURIComponent(product.id)}`;
                limpiarSugerencias();
            });
            ul.appendChild(li);
        });
        suggestionsContainer.appendChild(ul);
    }

    function limpiarSugerencias() {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }

    // --- Función de búsqueda y redirección ---
    function buscarProducto() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm.length === 0) {
            renderizarProductos(productos); 
            limpiarSugerencias();
            return;
        }

        let productoEncontrado = null;
        let mejorCoincidencia = -1;

        productos.forEach(producto => {
            const nombreProducto = producto.nombre.toLowerCase();

            if (nombreProducto === searchTerm) {
                productoEncontrado = producto;
                mejorCoincidencia = 2;
                return;
            } else if (nombreProducto.startsWith(searchTerm) && mejorCoincidencia < 2) {
                productoEncontrado = producto;
                mejorCoincidencia = 1;
            } else if (nombreProducto.includes(searchTerm) && mejorCoincidencia < 1) {
                productoEncontrado = producto;
                mejorCoincidencia = 0;
            }
        });

        if (productoEncontrado) {
            // Ajuste en la ruta del enlace para que funcione desde index.html a producto.html
            window.location.href = `../productos/producto.html?id=${encodeURIComponent(productoEncontrado.id)}`;
            limpiarSugerencias();
        } else {
            const productosFiltrados = productos.filter(producto =>
                producto.nombre.toLowerCase().includes(searchTerm)
            );
            renderizarProductos(productosFiltrados);
            limpiarSugerencias();
            if (productosFiltrados.length === 0) {
                 alert(`No se encontraron productos con el nombre "${searchTerm}".`);
            }
        }
    }

    // --- Event Listeners para la barra de búsqueda y sugerencias ---
    if (searchButton) {
        searchButton.addEventListener('click', buscarProducto);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length > 0) {
                const filteredProducts = productos.filter(p =>
                    p.nombre.toLowerCase().includes(searchTerm)
                ).slice(0, 5);
                mostrarSugerencias(filteredProducts);
            } else {
                limpiarSugerencias();
            }
        });

        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                buscarProducto();
            }
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(limpiarSugerencias, 100); 
        });
    }

    // --- Inicialización ---
    renderizarProductos(productos);

    // Código de scroll (corregido)
    let ultimaPosicionScroll = window.scrollY;
    
    window.addEventListener("scroll", () => {
        const posicionActual = window.scrollY;

        // Asegurarse de que 'header' y 'menuCategorias' existen antes de intentar manipular sus clases
        if (header && menuCategorias) { // ¡NUEVO! Comprobación de existencia de ambos elementos
            if (posicionActual > ultimaPosicionScroll) {
                // Scroll hacia abajo
                header.classList.add("ocultar-header");
                menuCategorias.classList.remove("mostrar"); // Remover la clase "mostrar" si la tenías por defecto
                menuCategorias.classList.add("ocultar"); // Añadir la clase "ocultar"
            } else {
                // Scroll hacia arriba
                header.classList.remove("ocultar-header");
                menuCategorias.classList.remove("ocultar"); // Remover la clase "ocultar"
                menuCategorias.classList.add("mostrar"); // Añadir la clase "mostrar"
            }
        } else if (header) { // Si solo existe el header
             if (posicionActual > ultimaPosicionScroll) {
                header.classList.add("ocultar-header");
            } else {
                header.classList.remove("ocultar-header");
            }
        } else if (menuCategorias) { // Si solo existe el menú de categorías
            if (posicionActual > ultimaPosicionScroll) {
                menuCategorias.classList.remove("mostrar");
                menuCategorias.classList.add("ocultar");
            } else {
                menuCategorias.classList.remove("ocultar");
                menuCategorias.classList.add("mostrar");
            }
        }
        ultimaPosicionScroll = posicionActual;
    });
});