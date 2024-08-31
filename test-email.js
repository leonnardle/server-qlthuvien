const { sendPasswordResetEmail } = require('./emailService'); // Đảm bảo thay thế đúng đường dẫn tới module của 
const crypto = require('crypto');

// Hàm tạo token ngẫu nhiên
const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex'); // Tạo token ngẫu nhiên
};

// Khi người dùng yêu cầu đặt lại mật khẩu
const token = generateResetToken(); // Tạo token mới

// Thông tin email và token
const testEmail = 'trungquocle636@gmail.com'; // Thay đổi địa chỉ email nếu cần

// Gọi hàm để gửi email với token đã được tạo
sendPasswordResetEmail(testEmail, token); // Sử dụng token thực tế
