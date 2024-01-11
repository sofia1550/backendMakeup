const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cors = require('cors');

module.exports = (app) => {
    app.use(cors({
        origin: ['http://localhost:3005'], // Agrega tu dominio personalizado aquí
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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
                imgSrc: ["'self'", "data:", "http://localhost:3002", "http://localhost:3005", "http://localhost:3005", "https://asdasdasd3.onrender.com"]
            },
        })
    );
};
