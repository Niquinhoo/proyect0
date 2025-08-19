// checkout.js
import { vaciarCarrito } from './carrito.js';

document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutItemsContainer = document.getElementById('checkout-items-container');
    const checkoutTotalSpan = document.getElementById('checkout-total');
    
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    function renderizarResumenCompra() {
        if (!checkoutItemsContainer || !checkoutTotalSpan) {
            console.error("No se encontraron los contenedores de resumen de compra.");
            return;
        }

        checkoutItemsContainer.innerHTML = '';
        let total = 0;

        if (carrito.length === 0) {
            checkoutItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
        } else {
            carrito.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('checkout-item');
                itemElement.innerHTML = `
                    <p><strong>${item.nombre}</strong> (${item.color}, ${item.medida})</p>
                    <p>${item.cantidad} x $${item.precioUnitario.toFixed(2)} = $${(item.cantidad * item.precioUnitario).toFixed(2)}</p>
                `;
                checkoutItemsContainer.appendChild(itemElement);
                total += item.cantidad * item.precioUnitario;
            });
        }
        checkoutTotalSpan.textContent = total.toFixed(2);
    }

    renderizarResumenCompra();

    // ===========================================
    // LÓGICA DEL FORMULARIO Y PEDIDO MANUAL
    // ===========================================
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Evita que el formulario se envíe de forma tradicional

            // Validación básica para asegurar que el carrito no esté vacío
            if (carrito.length === 0) {
                alert("Tu carrito está vacío. Agrega productos para poder realizar un pedido.");
                return;
            }

            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const direccion = document.getElementById('direccion').value;
            const telefono = document.getElementById('telefono').value;

            // 1. Generar el mensaje de WhatsApp
            let mensajeWhatsApp = `🫡¡Hola! He realizado un pedido. Aquí están los detalles:\n\n`;
            mensajeWhatsApp += `Mis Datos:\n`;
            mensajeWhatsApp += `Nombre: ${nombre} ${apellido}\n`;
            mensajeWhatsApp += `Dirección: ${direccion}\n`;
            mensajeWhatsApp += `Teléfono: ${telefono}\n\n`;
            mensajeWhatsApp += `Productos:\n`;
            carrito.forEach(item => {
                mensajeWhatsApp += `- ${item.nombre} (${item.medida}, ${item.color}) x ${item.cantidad} unidades\n`;
            });
            const totalCompra = carrito.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
            mensajeWhatsApp += `\nTotal: $${totalCompra.toFixed(2)}`;


            // Codificar el mensaje para la URL
            const mensajeCodificado = encodeURIComponent(mensajeWhatsApp);

            // Abre una nueva pestaña con el mensaje de WhatsApp
            const numeroDeAdmin = "5492657234218"; // ¡Asegúrate de que este sea tu número de WhatsApp!
            window.open(`https://wa.me/${numeroDeAdmin}?text=${mensajeCodificado}`, '_blank');
            
            // 2. Finalizar la compra y vaciar el carrito
            // Muestra un mensaje de éxito al cliente.
            alert("¡Pedido realizado con éxito! Por favor, revisa WhatsApp para continuar con el pago y la coordinación del envío.");
            
            // Vaciar el carrito después de enviar el mensaje de pedido
            vaciarCarrito();

            // Opcional: Redirigir a la página principal después de un momento
            setTimeout(() => {
                window.location.href = '../index.html'; 
            }, 3000);
            
        });
    }
});
