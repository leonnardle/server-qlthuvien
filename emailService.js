const nodemailer = require('nodemailer');
require('dotenv').config({ path: 'D:/server/sendemail.env' }); // Chỉ định đường dẫn đến tệp .env
const cron = require('node-cron'); // dùng để tự động lên lịch gửi email thông báo
// In giá trị các biến môi trường để kiểm tra
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);
var db=require('./db');

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
const sendReminderEmail = (to, tenDocGia, ngayMuon, maPhieuMuon, soLanGui) => {
    if (soLanGui >= 3) {
        console.log(`Exceeded maximum email attempts for ${to}. No email sent.`);
        return;
    }

    const mailOptions = {
        to: to,
        from: process.env.EMAIL_USER,
        subject: 'Nhắc Nhở Trả Sách',
        text: `Chào ${tenDocGia},\n\nBạn đã mượn sách từ ngày ${ngayMuon} và hiện chưa trả. Vui lòng trả sách trước khi quá hạn.\n\nXin cảm ơn!`
    };

    transporter.sendMail(mailOptions, (err, response) => {
        if (err) {
            console.error('Failed to send reminder email:', err.message);
        } else {
            console.log('Reminder email sent successfully to', to);
            
            // Tăng số lần gửi trong cơ sở dữ liệu
            db.query(
                `UPDATE phieumuon SET soguilan = soguilan + 1 WHERE mapm = ?`,
                [maPhieuMuon],
                (updateErr, updateResult) => {
                    if (updateErr) {
                        console.error('Failed to update email count:', updateErr.message);
                    } else {
                        console.log(`Updated email count for ${to}`);
                    }
                }
            );
        }
    });
};


// Hàm kiểm tra các phiếu mượn quá hạn và gửi email
const checkOverdueBooks = () => {
    console.log('Checking for overdue books...');
    db.query(`
        SELECT pm.*, dg.email, dg.tendocgia
        FROM phieumuon pm
        JOIN docgia dg ON pm.madocgia = dg.madocgia
        WHERE pm.trangthai = 0
        AND DATEDIFF(CURRENT_DATE, pm.ngaymuon) >= 3
    `, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return;
        }

        // Kiểm tra giá trị của results
        console.log('Query Results:', results);
        
        if (Array.isArray(results) && results.length > 0) {
            results.forEach(record => {
                sendReminderEmail(record.email, record.tendocgia, record.ngaymuon,record.mapm, record.soguilan);
            });
        } else {
            console.log('No overdue loans found or results is not an array.');
        }
    });
};




// Đặt lịch công việc tự động gửi email hàng ngày vào lúc 8:00 sáng
// thứ tự lần lượt là phút giờ ngày tháng năm dấu * tượng trưng cho bất kì time nào

cron.schedule(' * * 1 * *', () => {
    console.log('Checking for overdue books...');
    checkOverdueBooks();
});

module.exports = { sendPasswordResetEmail,sendNewPasswordEmail };
