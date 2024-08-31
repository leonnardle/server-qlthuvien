const { sendPasswordResetEmail } = require('./emailService'); 
const crypto = require('crypto');

// Hàm tạo token ngẫu nhiên
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex'); 
};

const token = generateResetToken(); 

// Thông tin email và token
const testEmail = 'trungquocle636@gmail.com'; 

sendPasswordResetEmail(testEmail, token); 
