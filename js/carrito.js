import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


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
const carritoCollection = collection(db, 'carrito');

export const actualizarContadorCarrito = async () => {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;

    try {
        const snapshot = await getDocs(carritoCollection);
        const count = snapshot.size;
        cartCountElement.textContent = count;
        cartCountElement.style.display = count > 0 ? 'block' : 'none';
    } catch (error) {
        console.error("Error al actualizar el contador del carrito:", error);
    }
};

export const agregarProductoAlCarrito = async (producto) => {
    try {
        // Generar un ID único basado en el producto, talle y color
        const productoId = producto.id;
        const talle = producto.talleSeleccionado || 'unico';
        const color = producto.colorSeleccionado || 'unico';
        const docId = `${productoId}-${talle}-${color}`;

        // Obtener la referencia al documento
        const docRef = doc(db, 'carrito', docId);
        const docSnapshot = await getDocs(carritoCollection);
        const productoExistente = docSnapshot.docs.find(d => d.id === docId);

        if (productoExistente) {
            const currentCantidad = productoExistente.data().cantidad;
            await updateDoc(docRef, {
                cantidad: currentCantidad + 1
            });
        } else {
            await addDoc(carritoCollection, {
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio,
                imagen: producto.imagenPrincipal,
                talle: talle,
                color: color,
                cantidad: 1
            });
        }
        await actualizarContadorCarrito();
        console.log("Producto agregado al carrito con éxito.");
    } catch (error) {
        console.error("Error al agregar producto al carrito:", error);
    }
};

export const renderizarCartPreview = async () => {
    const cartPreviewItems = document.querySelector('.cart-preview-items');
    if (!cartPreviewItems) return;

    try {
        const snapshot = await getDocs(carritoCollection);
        const items = snapshot.docs.map(doc => doc.data());
        cartPreviewItems.innerHTML = '';

        if (items.length === 0) {
            cartPreviewItems.innerHTML = '<p style="text-align:center; padding: 10px;">El carrito está vacío.</p>';
        } else {
            items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-preview-item');
                itemElement.innerHTML = `
                    <img src="${item.imagen}" alt="${item.nombre}">
                    <div class="item-info">
                        <h4>${item.nombre}</h4>
                        <p>Talle: ${item.talle}</p>
                        <p>${item.cantidad} x $${item.precio.toFixed(2)}</p>
                    </div>
                `;
                cartPreviewItems.appendChild(itemElement);
            });
        }
    } catch (error) {
        console.error("Error al renderizar la vista previa del carrito:", error);
    }
};