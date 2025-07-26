// admin.js

// 1. Importa las funciones necesarias de Firebase SDKs
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

// 2. Tu configuración de la aplicación Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCvPAEuNQVNnIUbSk0ggegsUps9DW6MS8", // Tu API Key
    authDomain: "calm-todo-blanco.firebaseapp.com",
    projectId: "calm-todo-blanco",
    storageBucket: "calm-todo-blanco.appspot.com", // Verifica esto en tu consola de Firebase
    messagingSenderId: "115599611256",
    appId: "1:115599611256:web:fcde0c84c53ced5128e4d",
    measurementId: "G-2E6EF3K5TL" // Si usas Analytics, de lo contrario puedes omitir
};

// 3. Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencia a la colección 'productos' en Firestore
const productosCollection = collection(db, "productos");

// ¡IMPORTANTE! Eliminamos la línea const productos = JSON.parse(localStorage.getItem('productos')) || [];
// Ahora los productos se cargarán directamente de Firestore.
let productos = []; // Esta variable ahora almacenará los productos cargados de Firestore

// Referencias a elementos del DOM
const nombreInput = document.getElementById('nombre');
const descripcionInput = document.getElementById('descripcion');
const tipoProductoSelect = document.getElementById('tipoProducto');
const medidasContainer = document.getElementById('medidasContainer');
const stockVisualContainer = document.getElementById('stockVisualContainer');
const stockCombinadoInput = document.getElementById('stockCombinado');
const imagenesPorColorContainer = document.getElementById('imagenesPorColorContainer');
const agregarBtn = document.getElementById('agregar');
const tablaBody = document.getElementById('tabla-body');
const exportarBtn = document.getElementById('exportar');

const preciosPorMedidaContainer = document.getElementById('preciosPorMedidaContainer');
const preciosCombinadosInput = document.getElementById('preciosCombinados');

let editandoProductoId = null; // Almacena el ID de Firestore del producto que se está editando

const tallesPorTipo = {
    sabana: ["1 plaza", "2 plazas", "queen", "king"],
    acolchado: ["1 plaza", "2 plazas", "queen", "king"],
    frazada: ["1 plaza", "2 plazas", "queen", "king"],
    toalla: ["300g", "400g", "500g", "600g"]
};


// --- Funciones para la UI y Lógica del Formulario ---

/**
 * Renderiza la información de talles disponibles para el tipo de producto
 * y los campos de entrada para el precio por cada talle.
 */
function renderMedidasInfo() {
    const tipo = tipoProductoSelect.value;
    medidasContainer.innerHTML = "";
    preciosPorMedidaContainer.innerHTML = "";

    if (tallesPorTipo[tipo]) {
        const p = document.createElement("p");
        p.innerHTML = `**Talles/Medidas disponibles para ${tipo}:** ${tallesPorTipo[tipo].join(", ")}`;
        medidasContainer.appendChild(p);

        const preciosHeader = document.createElement("h3");
        preciosHeader.textContent = `Precios por Medida para ${tipo}:`;
        preciosPorMedidaContainer.appendChild(preciosHeader);

        const preciosGridDiv = document.createElement("div");
        preciosGridDiv.style.display = "grid";
        preciosGridDiv.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
        preciosGridDiv.style.gap = "10px";
        preciosPorMedidaContainer.appendChild(preciosGridDiv);

        const currentPricesMap = parsePreciosCombinados(preciosCombinadosInput.value);

        tallesPorTipo[tipo].forEach(talle => {
            const div = document.createElement("div");
            div.style.marginBottom = "5px";
            div.style.border = "1px solid #ccc";
            div.style.padding = "10px";
            div.style.borderRadius = "5px";

            const label = document.createElement("label");
            label.textContent = `Precio ${talle}: `;

            const input = document.createElement("input");
            input.type = "number";
            input.min = 0;
            input.step = "0.01";
            const clavePrecio = talle;
            input.value = currentPricesMap[clavePrecio] || 0;
            input.dataset.clavePrecio = clavePrecio;
            input.style.width = "80px";

            input.addEventListener("input", actualizarCampoPreciosCombinados);
            div.appendChild(label);
            div.appendChild(input);
            preciosGridDiv.appendChild(div);
        });
        actualizarCampoPreciosCombinados();
    }
    actualizarStockVisual();
}

/**
 * Actualiza la visualización de los campos de stock para cada combinación color-medida.
 */
function actualizarStockVisual() {
    stockVisualContainer.innerHTML = "";

    const tipo = tipoProductoSelect.value;
    const tallesDisponibles = tallesPorTipo[tipo] || [];
    const coloresSeleccionados = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(c => c.value);

    if (!tipo || tallesDisponibles.length === 0 || coloresSeleccionados.length === 0) {
        stockCombinadoInput.value = "";
        return;
    }

    const currentStockMap = parseStockCombinado(stockCombinadoInput.value);

    coloresSeleccionados.forEach(color => {
        const colorHeader = document.createElement("h4");
        colorHeader.textContent = `Stock para ${color}:`;
        stockVisualContainer.appendChild(colorHeader);

        const gridDiv = document.createElement("div");
        gridDiv.style.display = "grid";
        gridDiv.style.gridTemplateColumns = "repeat(auto-fit, minmax(150px, 1fr))";
        gridDiv.style.gap = "10px";
        stockVisualContainer.appendChild(gridDiv);

        tallesDisponibles.forEach(talle => {
            const div = document.createElement("div");
            div.style.marginBottom = "5px";
            div.style.border = "1px solid #ccc";
            div.style.padding = "10px";
            div.style.borderRadius = "5px";

            const label = document.createElement("label");
            label.textContent = `${talle}: `;

            const input = document.createElement("input");
            input.type = "number";
            input.min = 0;
            const clave = `${color}-${talle}`;
            input.value = currentStockMap[clave] || 0;
            input.dataset.clave = clave;
            input.style.width = "60px";

            input.addEventListener("input", actualizarCampoStockCombinado);
            div.appendChild(label);
            div.appendChild(input);
            gridDiv.appendChild(div);
        });
    });

    actualizarCampoStockCombinado();
}

/**
 * Genera los botones para subir imágenes por cada color seleccionado
 * y muestra miniaturas de las imágenes ya cargadas.
 * @param {Object} productoEnEdicion - El objeto producto si estamos en modo edición.
 */
function actualizarInputsImagenesPorColor(productoEnEdicion = null) {
    imagenesPorColorContainer.innerHTML = ""; // Limpiar antes de renderizar

    // --- ¡IMPORTANTE! REEMPLAZA CON TU CLOUD NAME Y TU UPLOAD PRESET REALES ---
    const CLOUD_NAME = 'dltealb5k'; // Ejemplo: 'mi-tienda-online'
    const UPLOAD_PRESET = 'mis_productos_web'; // El nombre que le diste a tu preset "Unsigned"

    const coloresSeleccionados = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(c => c.value);

    coloresSeleccionados.forEach(color => {
        const div = document.createElement("div");
        div.classList.add("color-imagenes-input-group");
        div.style.marginBottom = "15px";
        div.style.border = "1px solid #eee";
        div.style.padding = "10px";
        div.style.borderRadius = "5px";

        const label = document.createElement("label");
        label.innerHTML = `<strong>Imágenes para ${color}:</strong>`;

        // --- BOTÓN QUE ACTIVARÁ EL WIDGET DE CLOUDINARY ---
        const uploadButton = document.createElement("button");
        uploadButton.textContent = `Subir Imagen para ${color}`;
        uploadButton.classList.add('cloudinary-button', 'upload-image-button'); // Añade una clase para identificar
        uploadButton.dataset.color = color; // Para saber a qué color pertenece este botón
        uploadButton.type = "button"; // Evita que se envíe el formulario

        div.appendChild(label);
        div.appendChild(uploadButton);

        const previewContainer = document.createElement("div");
        previewContainer.classList.add("imagenes-preview-container");
        previewContainer.dataset.color = color; // Añade data-color al contenedor de preview
        previewContainer.style.display = "flex";
        previewContainer.style.flexWrap = "wrap";
        previewContainer.style.gap = "5px";
        previewContainer.style.marginTop = "5px";
        div.appendChild(previewContainer);

        imagenesPorColorContainer.appendChild(div);

        // --- Lógica del Cloudinary Upload Widget para cada botón ---
        const myWidget = cloudinary.createUploadWidget(
            {
                cloudName: CLOUD_NAME,
                uploadPreset: UPLOAD_PRESET,
                folder: `productos_tienda/${color.toLowerCase().replace(/ /g, '_')}`, // Carpeta específica por color
                sources: ['local', 'url', 'camera', 'google_drive', 'dropbox'], // Fuentes de subida disponibles
                clientAllowedFormats: ["png", "gif", "jpeg", "jpg", "webp"], // Limita los tipos de archivo
                maxImageFileSize: 10000000, // 10MB máximo
                // cropping: true, // Opcional: permite recortar la imagen antes de subir
                // Configuración de transformación para optimización al subir
                transformation: [
                    { width: 800, height: 600, crop: "limit", quality: "auto:eco" }
                ]
            },
            async (error, result) => { // Marcamos la función como async para usar await al actualizar Firestore
                if (!error && result && result.event === "success") {
                    console.log('Imagen subida con éxito:', result.info);
                    const imageUrl = result.info.secure_url; // Esta es la URL de la imagen de Cloudinary
                    
                    if (editandoProductoId) {
                        const productoActual = productos.find(p => p.id === editandoProductoId);
                        if (productoActual) {
                            if (!productoActual.imagenesPorColor) {
                                productoActual.imagenesPorColor = {};
                            }
                            if (!productoActual.imagenesPorColor[color]) {
                                productoActual.imagenesPorColor[color] = [];
                            }
                            productoActual.imagenesPorColor[color].push(imageUrl);
                            
                            // *** ACTUALIZAR EL PRODUCTO EN FIRESTORE ***
                            await actualizarProducto(editandoProductoId, { 
                                imagenesPorColor: productoActual.imagenesPorColor 
                            });

                            // No es necesario llamar a guardarYRenderizar() aquí si actualizarProducto ya lo hace
                            // renderImagenesPreview ya se llama dentro de actualizarInputsImagenesPorColor
                            // Ojo: Si quieres una actualización visual más rápida sin recargar todo,
                            // podrías actualizar solo el previewContainer aquí directamente.
                            renderImagenesPreview(previewContainer, productoActual.imagenesPorColor[color], color);
                        }
                    } else {
                        // Para nuevos productos (no guardados aún en Firestore)
                        // Seguiremos usando localStorage temporalmente para las imágenes
                        // hasta que se guarde el producto completo.
                        let tempImages = JSON.parse(localStorage.getItem('tempProductImages') || '{}');
                        if (!tempImages[color]) {
                            tempImages[color] = [];
                        }
                        tempImages[color].push(imageUrl);
                        localStorage.setItem('tempProductImages', JSON.stringify(tempImages));
                        renderImagenesPreview(previewContainer, tempImages[color], color);
                    }
                } else if (error) {
                    console.error("Error al subir imagen:", error);
                    alert("Error al subir la imagen. Por favor, inténtalo de nuevo.");
                }
            }
        );

        uploadButton.addEventListener('click', () => {
            myWidget.open(); // Abre el widget al hacer clic
        });

        // --- Mostrar miniaturas de imágenes existentes (en edición o recién añadidas) ---
        let imagenesDelColor = [];
        if (productoEnEdicion && productoEnEdicion.imagenesPorColor && productoEnEdicion.imagenesPorColor[color]) {
            imagenesDelColor = productoEnEdicion.imagenesPorColor[color];
        } else if (!productoEnEdicion) {
            // En modo agregar, si ya se subieron imágenes para este color con el widget (temporalmente)
            const tempImages = JSON.parse(localStorage.getItem('tempProductImages') || '{}');
            if (tempImages[color]) {
                imagenesDelColor = tempImages[color];
            }
        }
        renderImagenesPreview(previewContainer, imagenesDelColor, color);
    });
}

/**
 * Función auxiliar para renderizar/actualizar las miniaturas de imágenes dentro de un contenedor.
 * @param {HTMLElement} container - El div .imagenes-preview-container del color.
 * @param {Array<string>} imageUrls - Array de URLs de imágenes para ese color.
 * @param {string} color - El color al que pertenecen las imágenes.
 */
function renderImagenesPreview(container, imageUrls, color) {
    container.innerHTML = ""; // Limpiar antes de re-renderizar

    imageUrls.forEach((imageUrl, index) => {
        const imgWrapper = document.createElement("div");
        imgWrapper.style.position = "relative";
        imgWrapper.style.width = "70px";
        imgWrapper.style.height = "70px";
        imgWrapper.style.overflow = "hidden";
        imgWrapper.style.border = "1px solid #ddd";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.classList.add('uploaded-cloudinary-image'); // Añade una clase para identificar

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "x";
        removeBtn.style.position = "absolute";
        removeBtn.style.top = "2px";
        removeBtn.style.right = "2px";
        removeBtn.style.background = "rgba(255,0,0,0.7)";
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.width = "20px";
        removeBtn.style.height = "20px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.display = "flex";
        removeBtn.style.alignItems = "center";
        removeBtn.style.justifyContent = "center";
        removeBtn.style.fontSize = "12px";
        removeBtn.title = `Eliminar imagen ${index + 1} de ${color}`;

        removeBtn.onclick = async (e) => { // Marcar como async para await
            e.stopPropagation();
            if (editandoProductoId) {
                const productoActualizado = productos.find(p => p.id === editandoProductoId);
                if (productoActualizado && productoActualizado.imagenesPorColor && productoActualizado.imagenesPorColor[color]) {
                    productoActualizado.imagenesPorColor[color].splice(index, 1);
                    if (productoActualizado.imagenesPorColor[color].length === 0) {
                        delete productoActualizado.imagenesPorColor[color];
                    }
                    // *** ACTUALIZAR EL PRODUCTO EN FIRESTORE ***
                    await actualizarProducto(editandoProductoId, { 
                        imagenesPorColor: productoActualizado.imagenesPorColor 
                    });
                    // renderImagenesPreview ya se llama dentro de actualizarProducto() -> cargarYRenderizarProductos()
                    // o puedes actualizar directamente aquí si prefieres (ej. renderImagenesPreview(container, productoActualizado.imagenesPorColor[color] || [], color);)
                }
            } else {
                // Si estamos en modo "Agregar Producto" (nuevo), eliminamos de la preview y del tempImages
                let tempImages = JSON.parse(localStorage.getItem('tempProductImages') || '{}');
                if (tempImages[color]) {
                    tempImages[color].splice(index, 1);
                    if (tempImages[color].length === 0) {
                        delete tempImages[color];
                    }
                    localStorage.setItem('tempProductImages', JSON.stringify(tempImages));
                    renderImagenesPreview(container, tempImages[color] || [], color);
                }
            }
        };

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(removeBtn);
        container.appendChild(imgWrapper);
    });
}


/**
 * Actualiza el campo oculto stockCombinadoInput con los valores de los inputs de stock visual.
 */
function actualizarCampoStockCombinado() {
    const inputs = stockVisualContainer.querySelectorAll("input[type='number']");
    const combinaciones = Array.from(inputs)
        .filter(input => parseInt(input.value) >= 0)
        .map(input => `${input.dataset.clave}=${input.value}`)
        .join(", ");
    stockCombinadoInput.value = combinaciones;
}

function actualizarCampoPreciosCombinados() {
    const inputs = preciosPorMedidaContainer.querySelectorAll("input[type='number']");
    const combinaciones = Array.from(inputs)
        .filter(input => parseFloat(input.value) > 0)
        .map(input => `${input.dataset.clavePrecio}=${parseFloat(input.value).toFixed(2)}`)
        .join(", ");
    preciosCombinadosInput.value = combinaciones;
}

/**
 * Parsea el string del campo stockCombinado a un objeto de mapa de stock.
 * @param {string} stockString - El string del campo stockCombinado.
 * @returns {Object} Un objeto con clave-valor de stock.
 */
function parseStockCombinado(stockString) {
    const stockMap = {};
    if (stockString) {
        stockString.split(",").forEach(par => {
            const [clave, cantidad] = par.split("=");
            if (clave && !isNaN(parseInt(cantidad))) {
                stockMap[clave.trim()] = parseInt(cantidad);
            }
        });
    }
    return stockMap;
}

function parsePreciosCombinados(preciosString) {
    const preciosMap = {};
    if (preciosString) {
        preciosString.split(",").forEach(par => {
            const [clave, precio] = par.split("=");
            if (clave && !isNaN(parseFloat(precio))) {
                preciosMap[clave.trim()] = parseFloat(precio);
            }
        });
    }
    return preciosMap;
}


/**
 * Limpia todos los campos del formulario.
 */
function limpiarFormulario() {
    nombreInput.value = "";
    descripcionInput.value = "";
    tipoProductoSelect.value = "";
    medidasContainer.innerHTML = "";
    preciosPorMedidaContainer.innerHTML = "";
    preciosCombinadosInput.value = "";
    stockVisualContainer.innerHTML = "";
    stockCombinadoInput.value = "";
    imagenesPorColorContainer.innerHTML = "";
    document.querySelectorAll('input[name="color"]').forEach(input => input.checked = false);
    agregarBtn.textContent = "Agregar Producto";
    editandoProductoId = null;
    localStorage.removeItem('tempProductImages'); // Limpia imágenes temporales
}

// --- Event Listeners ---

tipoProductoSelect.addEventListener("change", renderMedidasInfo);

document.querySelectorAll('input[name="color"]').forEach(input => {
    input.addEventListener("change", () => {
        actualizarStockVisual();
        // Al cambiar colores, re-renderizamos los inputs de imágenes para el producto actual o temporalmente
        // Aquí productos es el array global (que se actualiza con cargarYRenderizarProductos)
        const productoParaImagenes = editandoProductoId ? productos.find(p => p.id === editandoProductoId) : null;
        actualizarInputsImagenesPorColor(productoParaImagenes);
    });
});

// Listener principal para agregar/editar producto
agregarBtn.addEventListener('click', async () => { // Marcamos la función como async
    // --- Validaciones---
    const tipo = tipoProductoSelect.value;
    const tallesDisponibles = tallesPorTipo[tipo] || [];
    const coloresSeleccionados = Array.from(document.querySelectorAll('input[name="color"]:checked'))
        .map(c => c.value);

    const preciosMap = parsePreciosCombinados(preciosCombinadosInput.value);
    const tallesConPrecioDefinido = tallesDisponibles.filter(talle => preciosMap[talle] && preciosMap[talle] > 0);

    if (tallesDisponibles.length > 0 && tallesConPrecioDefinido.length === 0) {
        alert("Debes definir un precio mayor a cero para al menos una de las medidas disponibles.");
        return;
    }

    if (!nombreInput.value.trim() || descripcionInput.value.trim() === "") {
        alert("Por favor, completa el nombre y descripción del producto.");
        return;
    }

    if (coloresSeleccionados.length === 0) {
        alert("Por favor, selecciona al menos un color disponible.");
        return;
    }

    const stockMap = parseStockCombinado(stockCombinadoInput.value);

    const algunaCombinacionConStock = coloresSeleccionados.some(color => {
        return tallesDisponibles.some(talle => {
            const clave = `${color}-${talle}`;
            return (clave in stockMap && stockMap[clave] === null || stockMap[clave] > 0);
        });
    });

    if (coloresSeleccionados.length > 0 && tallesDisponibles.length > 0 && !algunaCombinacionConStock) {
        alert("Debes definir un stock mayor a cero para al menos una de las combinaciones de color y talle seleccionadas.");
        return;
    }
    // --- Fin Validaciones ---

    // --- Recopilar URLs de Cloudinary (YA SUBIDAS A TRAVÉS DEL WIDGET) ---
    const finalImagesForColors = {};

    // Si estamos editando un producto, empezamos con las imágenes que ya tenía el producto de Firestore.
    if (editandoProductoId) {
        const prodOriginal = productos.find(p => p.id === editandoProductoId);
        if (prodOriginal && prodOriginal.imagenesPorColor) {
            Object.assign(finalImagesForColors, JSON.parse(JSON.stringify(prodOriginal.imagenesPorColor)));
        }
    } else {
        // Para nuevos productos, recuperamos las URLs subidas temporalmente via localStorage.
        const tempImages = JSON.parse(localStorage.getItem('tempProductImages') || '{}');
        Object.assign(finalImagesForColors, tempImages);
    }
    
    // Ahora, recorre los contenedores de vista previa en la UI para obtener el estado final de las imágenes
    document.querySelectorAll('.imagenes-preview-container').forEach(previewContainer => {
        const color = previewContainer.dataset.color;
        const imagesInPreview = Array.from(previewContainer.querySelectorAll('.uploaded-cloudinary-image')).map(img => img.src);
        if (imagesInPreview.length > 0) {
            finalImagesForColors[color] = imagesInPreview;
        } else if (finalImagesForColors[color]) {
            delete finalImagesForColors[color];
        }
    });

    // Asegurarse de que solo se guarden las imágenes de los colores actualmente seleccionados
    const coloresActualesSeleccionadosSet = new Set(coloresSeleccionados);
    for (const colorKey in finalImagesForColors) {
        if (!coloresActualesSeleccionadosSet.has(colorKey)) {
            delete finalImagesForColors[colorKey];
        }
    }


    const productoAProcesar = {
        nombre: nombreInput.value,
        preciosPorMedida: preciosMap,
        descripcion: descripcionInput.value,
        tipo: tipoProductoSelect.value,
        colores: coloresSeleccionados,
        stockColoresMedidas: stockMap,
        imagenesPorColor: finalImagesForColors 
    };

    if (editandoProductoId) {
        // *** ACTUALIZAR EN FIRESTORE ***
        await actualizarProducto(editandoProductoId, productoAProcesar);
        alert("Producto actualizado con éxito!");
    } else {
        // *** AGREGAR A FIRESTORE ***
        await agregarProducto(productoAProcesar);
        alert("Producto agregado con éxito!");
    }

    limpiarFormulario();
});


// --- Funciones de Gestión de Productos (Tabla) ---

/**
 * Función que carga los productos de Firestore y luego los renderiza en la tabla.
 */
async function cargarYRenderizarProductos() {
    productos = []; // Limpiamos el array global antes de cargar de Firestore
    try {
        const querySnapshot = await getDocs(productosCollection);
        querySnapshot.forEach((doc) => {
            productos.push({ id: doc.id, ...doc.data() });
        });
        console.log("Productos cargados desde Firestore:", productos);
        renderTabla(); // Llama a renderTabla con los productos ya cargados en la variable global `productos`
    } catch (e) {
        console.error("Error al cargar documentos de Firestore: ", e);
        alert("Hubo un error al cargar los productos. Por favor, revisa la consola para más detalles.");
    }
}

/**
 * Agrega un nuevo producto a Firestore.
 * @param {Object} nuevoProducto - Los datos del nuevo producto.
 */
async function agregarProducto(nuevoProducto) {
    try {
        // Eliminamos el 'id' si lo estamos pasando, ya que Firestore lo generará automáticamente
        delete nuevoProducto.id; 
        const docRef = await addDoc(productosCollection, nuevoProducto);
        console.log("Documento agregado con ID: ", docRef.id);
        await cargarYRenderizarProductos(); // Recargar y renderizar la tabla
    } catch (e) {
        console.error("Error al añadir documento a Firestore: ", e);
        alert("Hubo un error al agregar el producto.");
    }
}

/**
 * Actualiza un producto existente en Firestore.
 * @param {string} idProducto - El ID del documento de Firestore.
 * @param {Object} datosActualizados - Los campos a actualizar.
 */
async function actualizarProducto(idProducto, datosActualizados) {
    try {
        const productoDocRef = doc(db, "productos", idProducto);
        await updateDoc(productoDocRef, datosActualizados);
        console.log("Documento actualizado con ID: ", idProducto);
        await cargarYRenderizarProductos(); // Recargar y renderizar la tabla
    } catch (e) {
        console.error("Error al actualizar documento en Firestore: ", e);
        alert("Hubo un error al actualizar el producto.");
    }
}

/**
 * Elimina un producto de Firestore.
 * @param {string} idProducto - El ID del documento de Firestore a eliminar.
 */
async function eliminarProducto(idProducto) {
    const confirmacion = confirm("¿Estás seguro de que quieres eliminar este producto?");
    if (confirmacion) {
        try {
            await deleteDoc(doc(db, "productos", idProducto));
            console.log("Documento eliminado con ID: ", idProducto);
            await cargarYRenderizarProductos(); // Recargar y renderizar la tabla
            alert("Producto eliminado con éxito.");
        } catch (e) {
            console.error("Error al eliminar documento de Firestore: ", e);
            alert("Hubo un error al eliminar el producto.");
        }
    }
}


/**
 * Renderiza la tabla de productos usando el array 'productos' global (ya cargado de Firestore).
 */
function renderTabla() {
    tablaBody.innerHTML = "";
    // Asegurarse de que 'productos' tenga datos antes de intentar renderizar
    if (productos.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="7">No hay productos cargados.</td></tr>';
        return;
    }

    productos.forEach(prod => {
        const fila = document.createElement("tr");

        const coloresHTML = prod.colores?.join(", ") || "—";
        const stockHTML = Object.entries(prod.stockColoresMedidas || {})
            .map(([clave, stock]) => `${clave}: ${stock}`).join("<br>");

        const preciosHTML = Object.entries(prod.preciosPorMedida || {})
            .map(([medida, precio]) => `${medida}: $${precio.toFixed(2)}`).join("<br>");


        let primeraImagenParaTabla = '';
        if (prod.imagenesPorColor) {
            for (const color in prod.imagenesPorColor) {
                if (prod.imagenesPorColor[color] && prod.imagenesPorColor[color].length > 0) {
                    primeraImagenParaTabla = prod.imagenesPorColor[color][0];
                    break;
                }
            }
        }

        fila.innerHTML = `
            <td><img src="${primeraImagenParaTabla}" alt="${prod.nombre}" width="60"></td>
            <td>${prod.nombre}</td>
            <td>${preciosHTML}</td>
            <td>${coloresHTML}</td>
            <td><small>${stockHTML}</small></td>
            <td class="descripcion">${prod.descripcion}</td>
            <td>
                <button onclick="editarProductoFirestore('${prod.id}')">Editar</button>
                <button onclick="eliminarProducto('${prod.id}')">Eliminar</button>
            </td>
        `;
        tablaBody.appendChild(fila);
    });
}

/**
 * Carga los datos de un producto de Firestore en el formulario para su edición.
 * @param {string} id - El ID de Firestore del producto a editar.
 */
async function editarProductoFirestore(id) { // Renombramos para evitar conflicto con la función de eliminar.
    const producto = productos.find(p => p.id === id); // Busca en el array global ya cargado
    if (!producto) {
        alert("Producto no encontrado.");
        return;
    }

    editandoProductoId = id; // Guardamos el ID de Firestore

    nombreInput.value = producto.nombre;
    descripcionInput.value = producto.descripcion;
    tipoProductoSelect.value = producto.tipo || "";

    preciosCombinadosInput.value = Object.entries(producto.preciosPorMedida || {})
        .map(([m, p]) => `${m}=${p.toFixed(2)}`).join(", ");


    tipoProductoSelect.dispatchEvent(new Event("change"));

    document.querySelectorAll('input[name="color"]').forEach(input => {
        input.checked = producto.colores.includes(input.value);
    });

    stockCombinadoInput.value = Object.entries(producto.stockColoresMedidas || {})
        .map(([c, s]) => `${c}=${s}`).join(", ");

    // Al entrar en modo edición, limpia cualquier imagen temporal de un producto nuevo no guardado
    localStorage.removeItem('tempProductImages');

    // Usamos un pequeño timeout para asegurar que los colores y tipos se hayan actualizado
    // antes de renderizar los campos de stock e imágenes.
    setTimeout(() => {
        actualizarStockVisual();
        // Pasamos el producto completo para que se muestren las imágenes existentes de Cloudinary
        actualizarInputsImagenesPorColor(producto);
    }, 100);

    agregarBtn.textContent = "Guardar cambios";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// --- Funcionalidad de Exportación ---

if (exportarBtn) {
    exportarBtn.addEventListener("click", () => {
        let contenido = productos.map(p => { 
            const stockInfo = Object.entries(p.stockColoresMedidas || {})
                .map(([clave, stock]) => `${clave}: ${stock}`).join(", ");
            const imagenesInfo = Object.entries(p.imagenesPorColor || {})
                .map(([color, imgs]) => `${color} (${imgs.length} imágenes): ${imgs.join(', ')}`) // Incluye las URLs
                .join(";\n");
            const preciosInfo = Object.entries(p.preciosPorMedida || {})
                .map(([medida, precio]) => `${medida}: $${precio.toFixed(2)}`).join(", "); 

            return `Nombre: ${p.nombre}\n` +
                   `Tipo: ${p.tipo}\n` +
                   `Descripción: ${p.descripcion}\n` +
                   `Precios por Medida: ${preciosInfo}\n` +
                   `Colores: ${p.colores.join(", ")}\n` +
                   `Stock por Color/Medida: ${stockInfo}\n` +
                   `Imágenes por Color:\n${imagenesInfo}\n` +
                   `----------------------------------------`;
        }).join("\n\n"); // Separar cada producto por dos saltos de línea

        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'productos_exportados.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// --- Inicialización al Cargar la Página ---
document.addEventListener('DOMContentLoaded', () => {
    cargarYRenderizarProductos(); // Carga y muestra los productos al cargar la página
    renderMedidasInfo(); // Asegura que los campos de medida/precio se muestren al cargar
    actualizarInputsImagenesPorColor(); // Muestra los inputs de imagen para los colores preseleccionados
});