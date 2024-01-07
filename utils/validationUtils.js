exports.validateNumber = (number, fieldName) => {
    if (isNaN(number) || number <= 0) {
        throw new Error(`${fieldName} debe ser un número positivo.`);
    }
};

exports.isValidDate = (d) => {
    return d instanceof Date && !isNaN(d);
};
