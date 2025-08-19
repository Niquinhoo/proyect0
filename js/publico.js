import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { agregarProductoAlCarrito, actualizarContadorCarrito, renderizarCartPreview } from './carrito.js';


const firebaseConfig = {
  apiKey: "AIzaSyCvPAeCUNQvNnIUbSk0ggegsUps9DW6mS8",
  authDomain: "calm-todo-blanco.firebaseapp.com",
  projectId: "calm-todo-blanco",
  storageBucket: "calm-todo-blanco.firebasestorage.app",
  messagingSenderId: "115599611256",
  appId: "1:115599611256:web:fcde0c84c53ced5128e48d",
  measurementId: "G-2E6EF3K5TL"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const productosCollection = collection(db, 'productos');


const getPlaceholderImage = () => './assets/placeholder.png';


document.addEventListener("DOMContentLoaded", async () => {
    const contenedorProductos = document.getElementById("contenedor-productos");
    let productos = [];


    const searchInput = document.querySelector('header .search-bar input[type="text"]');
    const searchButton = document.getElementById('search-button');
    const suggestionsContainer = document.getElementById('search-suggestions');
    const header = document.getElementById("encabezado");
    const menuCategorias = document.getElementById("menu-categorias");

    const cartPreviewContainer = document.querySelector('.cart-preview-container');
    const closePreviewBtn = document.getElementById('close-preview');

    // Selectores del Pop-up de Producto
    const productModal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const modalPrice = document.getElementById('modal-price');
    const modalOptions = document.getElementById('modal-options');
    const addToCartModalBtn = document.getElementById('add-to-cart-modal');

    if (!contenedorProductos) {
        console.error("No se encontró el contenedor con ID 'contenedor-productos'.");
        return;
    }


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
            if (producto.tipo === 'toalla' && producto.preciosPorMedida?.['500g']) {
                return `$${producto.preciosPorMedida['500g'].toFixed(2)}`;
            }
            if (tallesPrioritarios.length >= 2) {
                const segundoTallePrioritario = tallesPrioritarios[1];
                if (producto.preciosPorMedida?.[segundoTallePrioritario]) {
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

    function renderizarProductos(productosARenderizar) {
        contenedorProductos.innerHTML = "";
        if (productosARenderizar.length === 0) {
            contenedorProductos.innerHTML = "<p>No hay productos disponibles que coincidan con la búsqueda.</p>";
            return;
        }
        productosARenderizar.forEach(producto => {
            const card = document.createElement("div");
            card.classList.add("producto");
            // Agregamos el ID del producto como un atributo de datos
            card.dataset.id = producto.id;
            
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
            card.innerHTML = `
                <div class="producto-link">
                    <img src="${imagenPrincipal}"
                         data-front="${imagenPrincipal}"
                         data-back="${imagenSecundaria}"
                         alt="${nombre}"
                         class="img-producto">
                    <h3>${nombre}</h3>
                    <p class="precio">${precioMostrado}</p>
                    <p class="descripcion"></p>
                </div>
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

    // Nueva función para mostrar el pop-up del producto
    function mostrarPopUpProducto(producto) {
        modalTitle.textContent = producto.nombre;
        modalDescription.textContent = producto.descripcion || '';
        
        const tallesOrdenados = {
            sabana: ["1 plaza", "2 plazas", "queen", "king"],
            acolchado: ["1 plaza", "2 plazas", "queen", "king"],
            frazada: ["1 plaza", "2 plazas", "queen", "king"],
            toalla: ["300g", "400g", "500g", "600g"]
        };
        
        let selectedOption = null;
        let selectedColor = null;

        modalOptions.innerHTML = '';
        const preciosPorMedida = producto.preciosPorMedida || {};
        const imagenesPorColor = producto.imagenesPorColor || {};
        const tieneTalles = tallesOrdenados[producto.tipo] && tallesOrdenados[producto.tipo].some(talle => preciosPorMedida[talle]);
        const tieneColores = Object.keys(imagenesPorColor).length > 0;

        // Renderiza opciones de talle si existen
        if (tieneTalles) {
            const tallesGroup = document.createElement('div');
            tallesGroup.classList.add('modal-options-group');
            tallesGroup.innerHTML = '<h4>Selecciona un talle:</h4><div class="option-list"></div>';
            const tallesList = tallesGroup.querySelector('.option-list');
            tallesOrdenados[producto.tipo].forEach(talle => {
                if (preciosPorMedida[talle]) {
                    const span = document.createElement('span');
                    span.textContent = talle;
                    span.dataset.talle = talle;
                    tallesList.appendChild(span);
                    span.addEventListener('click', () => {
                        selectedOption = { tipo: 'talle', valor: talle };
                        updateSelections(tallesList, span);
                        updatePrice();
                    });
                }
            });
            modalOptions.appendChild(tallesGroup);
        }
        
        // Renderiza opciones de color si existen
        if (tieneColores) {
            const coloresGroup = document.createElement('div');
            coloresGroup.classList.add('modal-options-group');
            coloresGroup.innerHTML = '<h4>Selecciona un color:</h4><div class="option-list"></div>';
            const coloresList = coloresGroup.querySelector('.option-list');
            Object.keys(imagenesPorColor).forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.classList.add('color-option');
                colorDiv.style.backgroundColor = color;
                colorDiv.dataset.color = color;
                coloresList.appendChild(colorDiv);
                colorDiv.addEventListener('click', () => {
                    selectedColor = color;
                    updateSelections(coloresList, colorDiv);
                    if (imagenesPorColor[color] && imagenesPorColor[color][0]) {
                        modalImage.src = imagenesPorColor[color][0];
                    }
                });
            });
            modalOptions.appendChild(coloresGroup);
        }

        // Función para actualizar la selección visual
        function updateSelections(container, element) {
            container.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
        }

        // Función para actualizar el precio mostrado
        function updatePrice() {
            if (selectedOption && selectedOption.tipo === 'talle') {
                const precio = preciosPorMedida[selectedOption.valor];
                modalPrice.textContent = `$${precio.toFixed(2)}`;
            } else {
                modalPrice.textContent = getDisplayPrice(producto);
            }
        }
        updatePrice();

        // Establece imagen inicial
        const primerColor = Object.keys(imagenesPorColor)[0];
        if (primerColor && imagenesPorColor[primerColor][0]) {
            modalImage.src = imagenesPorColor[primerColor][0];
            selectedColor = primerColor;
            updateSelections(modalOptions.querySelector('.color-option').parentNode, modalOptions.querySelector('.color-option'));
        }

        // Abre el modal
        productModal.classList.add('is-active');

        // Lógica para añadir al carrito desde el modal
        addToCartModalBtn.onclick = () => {
            let productoAAgregar = { ...producto };
            if (tieneColores && selectedColor) {
                productoAAgregar.colorSeleccionado = selectedColor;
                if (imagenesPorColor[selectedColor][0]) {
                    productoAAgregar.imagenPrincipal = imagenesPorColor[selectedColor][0];
                }
            } else if (imagenesPorColor[primerColor][0]) {
                productoAAgregar.imagenPrincipal = imagenesPorColor[primerColor][0];
            }
            if (tieneTalles && selectedOption) {
                productoAAgregar.talleSeleccionado = selectedOption.valor;
                productoAAgregar.precio = preciosPorMedida[selectedOption.valor];
            } else if (Object.keys(preciosPorMedida).length > 0) {
                 const minPrecio = Math.min(...Object.values(preciosPorMedida));
                 const tallePorDefecto = Object.keys(preciosPorMedida).find(key => preciosPorMedida[key] === minPrecio);
                 productoAAgregar.talleSeleccionado = tallePorDefecto;
                 productoAAgregar.precio = minPrecio;
            } else {
                productoAAgregar.precio = 0;
            }

            agregarProductoAlCarrito(productoAAgregar, 1);
            alert(`"${productoAAgregar.nombre}" añadido al carrito.`);
            productModal.classList.remove('is-active');
        };
    }

    // Event Listeners para cerrar el modal
    closeModalBtn.addEventListener('click', () => {
        productModal.classList.remove('is-active');
    });

    productModal.addEventListener('click', (event) => {
        if (event.target === productModal) {
            productModal.classList.remove('is-active');
        }
    });

    try {
        const snapshot = await getDocs(productosCollection);
        productos = [];
        snapshot.forEach(doc => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        if (productos.length === 0) {
            contenedorProductos.innerHTML = "<p>No hay productos disponibles en la base de datos.</p>";
        } else {
            renderizarProductos(productos);
        }
    } catch (error) {
        console.error("Error al cargar productos de Firestore:", error);
        contenedorProductos.innerHTML = `<p>Error al cargar los productos: ${error.message}</p>`;
    }

    // Event Listener para abrir el pop-up al hacer clic en un producto
    contenedorProductos.addEventListener('click', (event) => {
        const productoCard = event.target.closest('.producto');
        if (productoCard) {
            const productId = productoCard.dataset.id;
            const productoSeleccionado = productos.find(p => p.id === productId);
            if (productoSeleccionado) {
                mostrarPopUpProducto(productoSeleccionado);
            }
        }
    });

    // --- Tu lógica de búsqueda intacta ---
    function mostrarSugerencias(suggestedProducts) {
        if (!suggestionsContainer) return;
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
                const productoSeleccionado = productos.find(p => p.id === product.id);
                if (productoSeleccionado) {
                    mostrarPopUpProducto(productoSeleccionado);
                }
                limpiarSugerencias();
            });
            ul.appendChild(li);
        });
        suggestionsContainer.appendChild(ul);
    }

    function limpiarSugerencias() {
        if (!suggestionsContainer) return;
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }

    function buscarProducto() {
        if (!searchInput) return;
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
            mostrarPopUpProducto(productoEncontrado);
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

    let ultimaPosicionScroll = window.scrollY;
    window.addEventListener("scroll", () => {
        const posicionActual = window.scrollY;
        if (header && menuCategorias) {
            if (posicionActual > ultimaPosicionScroll) {
                header.classList.add("ocultar-header");
                menuCategorias.classList.remove("mostrar");
                menuCategorias.classList.add("ocultar");
            } else {
                header.classList.remove("ocultar-header");
                menuCategorias.classList.remove("ocultar");
                menuCategorias.classList.add("mostrar");
            }
        } else if (header) {
            if (posicionActual > ultimaPosicionScroll) {
                header.classList.add("ocultar-header");
            } else {
                header.classList.remove("ocultar-header");
            }
        } else if (menuCategorias) {
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

    const cartIconLink = document.querySelector('.cart-icon-link');
    if (cartPreviewContainer && cartIconLink) {
        actualizarContadorCarrito();

        cartPreviewContainer.addEventListener('mouseenter', () => {
            renderizarCartPreview();
        });

        cartIconLink.addEventListener('click', (event) => {
            if (!cartPreviewContainer.classList.contains('is-active')) {
                event.preventDefault();
                cartPreviewContainer.classList.add('is-active');
                renderizarCartPreview();
            } else {
                // Si ya está activa, el próximo clic redirige al href del enlace
            }
        });

        document.addEventListener('click', (event) => {
            const isClickInsideCart = cartPreviewContainer.contains(event.target);
            if (!isClickInsideCart) {
                cartPreviewContainer.classList.remove('is-active');
            }
        });

        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                cartPreviewContainer.classList.remove('is-active');
            });
        }
    }
});