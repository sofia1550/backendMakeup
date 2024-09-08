
# 🌟 Backend para Proyecto E-commerce Peluquería 💇‍♀️

Este es el backend del proyecto E-commerce y sistema de gestión para un salón de belleza/peluquería. Está desarrollado en Node.js con Express, utilizando Sequelize como ORM para MySQL.

## 🎨 Características del Backend

- **Autenticación Segura** 🔐: Implementación de **JWT** para asegurar las rutas.
- **Mercado Pago** 💳: Integración para la gestión de pagos en el e-commerce.
- **Servicios Gestionables** 💼: Administración de servicios y asignación de empleados, con contacto directo por WhatsApp.
- **Notificaciones en tiempo real** 📡: Utilizando **Socket.IO** para actualizaciones de órdenes y disponibilidad.
- **Gestión de productos** 🛍️: Creación, edición y eliminación de productos con la posibilidad de destacarlos en el carrousel 3D.

## 🛠️ Tecnologías Utilizadas

- 🟢 **Node.js** con **Express.js** como framework.
- 🗄️ **Sequelize** como ORM para **MySQL**.
- 📡 **Socket.IO** para notificaciones en tiempo real.
- 🛡️ **Helmet** y **express-rate-limit** para la seguridad de la API.

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/sofia1550/backendIAEcommerce.git
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno (.env) con los detalles de tu base de datos y credenciales de API (Mercado Pago, JWT).

4. Ejecuta el servidor:
```bash
npm run dev
```

## 🌐 Rutas de la API

- **/api/auth**: Autenticación y registro de usuarios.
- **/api/products**: CRUD de productos.
- **/api/orders**: Gestión de órdenes y pagos.
- **/api/services**: Gestión de servicios y asignación de empleados.

## 🔗 Repositorio

- **Backend:** [Repositorio Backend](https://github.com/sofia1550/backendIAEcommerce)


