
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu_email@gmail.com',
        pass: 'tu_contraseña'
    }
});

const sendEmail = async (options) => {
    const mailOptions = {
        from: 'tu_email@gmail.com',
        to: options.to,
        subject: options.subject,
        text: options.text
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email enviado correctamente');
    } catch (error) {
        console.error('Error al enviar el email:', error);
    }
};

module.exports = {
    sendEmail
};
