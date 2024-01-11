const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cors = require('cors');

module.exports = (app) => {
    app.use(cors({
        origin: ['https://sofiaportafolio.online', 'https://www.mercadopago.com'], // Agrega los dominios permitidos aquí
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'], // Asegúrate de permitir todos los métodos necesarios
        credentials: true,
        optionsSuccessStatus: 204
    }));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(helmet());
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://http2.mlstatic.com", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", "data:", "http://localhost:3002", "https://sofiaportafolio.online", "https://sofiaportafolio.online", "https://asdasdasd3.onrender.com"]
            },
        })
    );
};
