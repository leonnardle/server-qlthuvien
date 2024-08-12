const nodemailer = require('nodemailer');
require('dotenv').config({ path: 'D:/server/sendemail.env' }); // Chỉ định đường dẫn đến tệp .env

// In giá trị các biến môi trường để kiểm tra
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

// Cấu hình transporter cho nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Hàm gửi email
const sendPasswordResetEmail = (to, token) => {
    const mailOptions = {
        to: to,
        from: process.env.EMAIL_USER,
        subject: 'Password Reset',
        text: `Bạn đang nhận email này vì bạn (hoặc người khác) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n
               Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn:\n\n
               http://localhost:3000/user/reset-password/${token}\n
               lưu ý nếu hãy kiểm tra thư rác và ấn có vẻ an toàn để có thể truy cập link reset mật khẩu\n
               Nếu bạn không yêu cầu điều này, hãy bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.\n`
    };

    transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
            console.error('Gửi email thất bại:', err.message);
        } else {
            console.log('Email đặt lại mật khẩu đã được gửi thành công');
        }
    });
};
const sendNewPasswordEmail = (to, newPassword) => {
    const mailOptions = {
        to: to,
        from: process.env.EMAIL_USER,
        subject: 'Mật Khẩu Mới',
        text: `Mật khẩu mới của bạn là: ${newPassword}\n\nVui lòng đăng nhập và thay đổi mật khẩu ngay lập tức.`
    };

    transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
            console.error('Failed to send email:', err.message);
        } else {
            console.log('New password email sent successfully');
        }
    });
};
module.exports = { sendPasswordResetEmail,sendNewPasswordEmail };
