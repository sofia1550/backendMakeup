const express = require('express');
const multer = require('multer');
const router = express.Router(); 

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, '../../../db/comprobantes');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });



module.exports = router; 
