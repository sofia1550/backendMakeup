const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json()); 

const SECRET_KEY = "your_secret_key_here"; 

const admins = [
    {
        username: 'Admin1',
        password: 'Password1'
    },
    {
        username: 'Admin2',
        password: 'password2'
    },
];

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    const admin = admins.find(adm => adm.username === username && adm.password === password);

    if (admin) {
        const token = jwt.sign({ username: admin.username }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token });
    } else {
        return res.status(401).json({ message: 'Authentication failed' });
    }
});

const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization');

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.post('/api/admin/products', authenticateJWT, (req, res) => {
    res.json({ message: "Producto creado", user: req.user });
});

app.listen(3002, () => {
    console.log('Server started on http://localhost:3002');
});