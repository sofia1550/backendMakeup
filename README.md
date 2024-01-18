# Makeup - Back-end

## Descripción
Este repositorio contiene el back-end de Makeup, un proyecto full stack para servicios y productos de belleza. Está construido utilizando Node.js, Express.js y se conecta a una base de datos MySQL, manejando tanto la lógica de negocio como la gestión de datos.

## Características
- API RESTful para manejar servicios, productos y usuarios.
- Autenticación y autorización de usuarios con JWT.
- Sistema de roles para usuarios y ayudantes.
- Integración de correo electrónico para notificaciones.

## Tecnologías Utilizadas
- Node.js
- Express.js
- MySQL
- JWT para autenticación
- Nodemailer y @sendgrid/mail para emails
- Otras dependencias importantes: bcrypt, cors, dotenv, helmet, etc.

## Instalación
Para instalar y ejecutar el back-end de Makeup en tu entorno local, sigue estos pasos:

1. **Clonar el Repositorio**: 
git clone https://github.com/tu-usuario/makeup-back-end.git
cd makeup-back-end

2. **Instalar Dependencias**: 
npm install

3. **Configurar Variables de Entorno**: 
Crea un archivo `.env` en la raíz del proyecto y configura las variables necesarias (p.ej., credenciales de la base de datos, claves secretas para JWT, etc.).

4. **Ejecutar el Proyecto**: 
npm start

Asegúrate de tener la base de datos MySQL corriendo y accesible.

## Uso
El back-end sirve como una API para el front-end de Makeup. Las rutas incluyen:

- `/api/users` para la gestión de usuarios.
- `/api/products` para productos y compras.
- `/api/services` para reservar y administrar servicios.
- `/api/auth` para la autenticación y manejo de sesiones.
etc..
## Contacto
Para soporte o colaboraciones, contáctame en:
[LinkedIn Sofia Luciuk](https://www.linkedin.com/in/sofia-luciuk/)



