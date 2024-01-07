const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.API_KEY);

const sendEmail = async (options) => {
    const msg = {
        to: Array.isArray(options.to) ? options.to : [options.to],
        from: 'luciuknicolas15@gmail.com',
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    try {
        await sgMail.send(msg);
        console.log('Email enviado correctamente');
        return { success: true };
    } catch (error) {
        console.error('Error al enviar el email:', error);
        return { success: false, error };
    }
};

module.exports = {
    sendEmail
};
