const express = require('express');
const router = express.Router();
const productModel = require('../productModal/productModal');
const multer = require('multer');
const path = require('path');
// Ruta para actualizar todos los precios por un porcentaje
// Ruta para actualizar todos los precios por un porcentaje
router.put('/update-prices', async (req, res) => {
    const { percentage } = req.body;
    try {
        await productModel.updateAllPrices(percentage);
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando los precios se actualizan
        res.status(200).json({ message: 'Precios actualizados exitosamente' });
    } catch (error) {
        console.error("Error al actualizar los precios:", error);
        res.status(500).json({ message: "Error al actualizar los precios" });
    }
});

// Ruta para revertir los precios al último porcentaje aplicado
// Ruta para revertir los precios al último porcentaje aplicado
router.put('/revert-last-percentage', async (req, res) => {
    try {
        await productModel.revertLastPercentage();
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando los precios se revierten
        res.status(200).json({ message: 'Precios revertidos al último porcentaje aplicado' });
    } catch (error) {
        console.error("Error al revertir los precios:", error);
        res.status(500).json({ message: "Error al revertir los precios" });
    }
});


// Ruta para ajustar los precios al porcentaje anterior
router.put('/adjust-prices', async (req, res) => {
    const { previousPercentage } = req.body;
    try {
        await productModel.adjustPricesToPreviousPercentage(previousPercentage);
        res.status(200).json({ message: 'Precios ajustados al porcentaje anterior' });
    } catch (error) {
        console.error("Error al ajustar los precios:", error);
        res.status(500).json({ message: "Error al ajustar los precios" });
    }
});

// Ruta para revertir y aplicar un nuevo porcentaje
router.put('/revert-and-apply-percentage', async (req, res) => {
    const { newPercentage } = req.body;
    try {
        await productModel.revertAndApplyNewPercentage(newPercentage);
        const io = req.app.get('io');
        io.emit('prices-updated'); // Emitir un evento cuando se aplica el nuevo porcentaje
        res.status(200).json({ message: 'Precios revertidos y nuevo porcentaje aplicado' });
    } catch (error) {
        console.error("Error al revertir y aplicar el nuevo porcentaje:", error);
        res.status(500).json({ message: "Error al revertir y aplicar el nuevo porcentaje" });
    }
});


// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../db/image/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Ruta para obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const products = await productModel.getAllProducts();
        res.json(products);
    } catch (error) {
        console.error("Error al obtener los productos:", error);
        res.status(500).json({ message: "Error al obtener los productos" });
    }
});

// Ruta para crear un nuevo producto
router.post('/', upload.single('imagen_url'), async (req, res) => {
    const { nombre, descripcion, precio, stock, marca, color, categoria } = req.body;
    const imagenPath = '/image/' + req.file.filename;
    console.log('Categoria recibida en el servidor:', categoria);
    console.log('Datos recibidos en el servidor:', req.body);

    try {
        const newProductId = await productModel.createProduct(nombre, descripcion, precio, stock, imagenPath, marca, color, null, categoria);
        const io = req.app.get('io');
        io.emit('product-added', newProductId);
        res.status(201).json({ id: newProductId, message: 'Producto creado exitosamente' });
    } catch (error) {
        console.error("Error al crear el producto:", error);
        res.status(500).json({ message: "Error al crear el producto" });
    }
});

// Ruta para editar un producto existente
// Ruta para editar un producto existente
router.put('/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, marca, color, categoria } = req.body;

    // Se construye la ruta de la imagen de manera relativa, similar a la ruta POST.
    const imagenPath = req.file ? '/image/' + req.file.filename : undefined;
    console.log("Datos recibidos para actualizar:", req.body);

    try {
        await productModel.updateProduct(id, nombre, descripcion, precio, stock, imagenPath, marca, color, categoria);
        const updatedProduct = await productModel.getProductById(id);
        const io = req.app.get('io');
        io.emit('product-updated', updatedProduct);
        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error("Error al actualizar el producto:", error);
        res.status(500).json({ message: "Error al actualizar el producto" });
    }
});

router.put('/product-detail-update/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, imagen_url, marca, color, categoria } = req.body;
    console.log("Datos recibidos para la actualización de detalles:", req.body);
    try {
        console.log(`Updating product detail with ID ${id} with categoria: ${categoria}`);

        await productModel.updateProductDetail(id, nombre, descripcion, precio, stock, imagen_url, marca, color, categoria);
        const justUpdatedProduct = await productModel.getProductById(id);
        console.log("Detalles del producto justo después de la actualización:", justUpdatedProduct);

        const updatedProductDetail = await productModel.getProductById(id);
        const io = req.app.get('io');
        console.log(`Emitiendo evento product-detail-updated para el producto con ID ${updatedProductDetail.id}`);

        io.emit('product-detail-updated', updatedProductDetail);  // Emitir evento de detalles del producto actualizado
        res.status(200).json(updatedProductDetail);
    } catch (error) {
        console.error("Error al actualizar los detalles del producto:", error);
        res.status(500).json({ message: "Error al actualizar los detalles del producto" });
    }
});

// Ruta para eliminar un producto existente
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log("ID del producto a eliminar:", id);
    try {
        const deleted = await productModel.deleteProduct(id);
        if (deleted) {
            const io = req.app.get('io');
            io.emit('product-deleted', id);  // Emitir evento de producto eliminado
            res.status(200).json({ message: 'Producto eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Producto no encontrado' });
        }
    } catch (error) {
        console.error("Error al eliminar el producto:", error);
        res.status(500).json({ message: "Error al eliminar el producto" });
    }
});
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await productModel.getProductById(id);
        if (!product) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }
        res.json(product);
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        res.status(500).json({ message: "Error al obtener el producto" });
    }
});



module.exports = router;