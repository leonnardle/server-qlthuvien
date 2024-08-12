const express =require('express');

const router = express.Router(); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendNewPasswordEmail } = require('./emailService');
const db = require('./db');
function generateRandomPassword(length = 8) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}
function generateMadocgia() {
    const characters = '0123456789';
    let result = 'DG';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(32).toString('hex'); 
    const expires = Date.now() + 3600000; // Token hết hạn sau 1 giờ

    // Lưu token và thời gian hết hạn vào cơ sở dữ liệu
    const sqlQuery = "UPDATE taikhoan SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?";
    db.query(sqlQuery, [token, expires, email], (error, result) => {
        if (error) {
            return res.status(500).send({ success: false, message: 'Database error: ' + error.message });
        }

        if (result.affectedRows > 0) {
            // Gửi email chứa liên kết để đặt lại mật khẩu
            sendPasswordResetEmail(email, token);
            res.status(200).send({ message: 'Password reset email sent' });
        } else {
            res.status(404).send({ success: false, message: 'Email not found' });
        }
    });
});

// kiểm tra token hết hạn hay chưa khi người dùng ấn vào link
// Đoạn mã đã cập nhật
router.post('/change-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    // Kiểm tra thông tin người dùng trong cơ sở dữ liệu
    const sqlQuery = "SELECT * FROM taikhoan WHERE email = ?";
    db.query(sqlQuery, [email], async (error, data) => {
        if (error) {
            return res.status(500).send({ success: false, message: 'Database error: ' + error.message });
        }

        // Kiểm tra xem người dùng có tồn tại không
        if (data.length === 0) {
            return res.status(404).send({ success: false, message: 'User not found' });
        }

        const user = data[0];
        try {
            // Kiểm tra mật khẩu cũ
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(401).send({ success: false, message: 'Old password is incorrect' });
            }

            // Mã hóa mật khẩu mới
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            const sqlUpdate = "UPDATE taikhoan SET password = ? WHERE email = ?";
            db.query(sqlUpdate, [hashedNewPassword, email], (updateError, result) => {
                if (updateError) {
                    return res.status(500).send({ success: false, message: 'Database error: ' + updateError.message });
                }

                res.send({ success: true, message: 'Password changed successfully' });
            });
        } catch (compareError) {
            res.status(500).send({ success: false, message: 'Error processing request', error: compareError.message });
        }
    });
});
router.get('/reset-password/:token', async (req, res) => {
    const token = req.params.token;
    const currentTime = Date.now();

    const sqlQuery = "SELECT * FROM taikhoan WHERE resetPasswordToken = ? AND resetPasswordExpires > ?";
    db.query(sqlQuery, [token, currentTime], async (error, data) => {
        if (error) {
            return res.status(500).send('Database error: ' + error.message);
        }

        if (data.length > 0) {
            // Token hợp lệ và chưa hết hạn
            const user = data[0];
            const newPassword = generateRandomPassword(); // Tạo mật khẩu ngẫu nhiên
            const hashedPassword = await bcrypt.hash(newPassword, 10); // Mã hóa mật khẩu mới

            // Cập nhật mật khẩu mới vào cơ sở dữ liệu
            const sqlUpdate = "UPDATE taikhoan SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE email = ?";
            db.query(sqlUpdate, [hashedPassword, user.email], (updateError) => {
                if (updateError) {
                    return res.status(500).send('Database error: ' + updateError.message);
                }

                // Gửi mật khẩu mới qua email
                sendNewPasswordEmail(user.email, newPassword);
                res.send('Mật khẩu mới đã được gửi đến email của bạn.');
            });
        } else {
            res.status(400).send('Token không hợp lệ hoặc đã hết hạn.');
        }
    });
});

router.route('/login').post(async (req, res) => {
    const { email, password } = req.body;

    const sqlQuery = "SELECT * FROM taikhoan WHERE email=?";
    db.query(sqlQuery, [email], async (error, data) => {
        if (error) {
            return res.status(500).send(JSON.stringify({ success: false, message: 'Database error: ' + error.message }));
        }
        
        if (data.length <= 0) {
            return res.status(401).send(JSON.stringify({ success: false, message: 'Invalid email or password' }));
        }

        const user = data[0];
        try {
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Trả về thông tin tài khoản và reader
                const readerQuery = "SELECT * FROM docgia WHERE email=?";
                db.query(readerQuery, [email], (readerError, readerData) => {
                    if (readerError) {
                        return res.status(500).send(JSON.stringify({ success: false, message: 'Error retrieving reader data' }));
                    }

                    const reader = readerData[0]; // Dữ liệu reader tương ứng

                    res.status(200).send(JSON.stringify({
                        success: true,
                        message: 'Login successful',
                        data: {
                            ...user, // Thông tin tài khoản
                            reader // Thông tin reader
                        }
                    }));
                });
            } else {
                res.status(401).send(JSON.stringify({ success: false, message: 'Invalid email or password' }));
            }
        } catch (compareError) {
            res.status(500).send(JSON.stringify({ success: false, message: 'Error processing request', error: compareError.message }));
        }
    });
});

router.route('/user-profile').get((req, res) => {
    // Lấy token từ Authorization header
    var token = req.body.token;  // Lấy token từ header 'Authorization: Basic <token>'

    if (!token) {
        return res.status(401).send(JSON.stringify({ success: false, message: 'No token provided' }));
    }

    var sqlQuery = "SELECT * FROM taikhoan WHERE token=?";

    db.query(sqlQuery, [token], (error, data) => {
        if (error) {
            res.status(500).send(JSON.stringify({ success: false, message: error.message }));
        } else {
            if (data.length <= 0) {
                res.status(404).send(JSON.stringify({ success: false, message: 'User not found' }));
            } else {
                res.status(200).send(JSON.stringify({ success: true, user: data[0] }));
            }
        }
    });
});
router.route('/register').post(async (req, res) => {
    try {
        const { email, password, tendocgia, sdt } = req.body;
        // Mã hóa mật khẩu 
        const hashedPassword = await bcrypt.hash(password, 10); 

        // Tạo câu lệnh SQL để chèn người dùng mới vào cơ sở dữ liệu
        var sqlQuery = "INSERT INTO taikhoan (email, password) VALUES (?, ?)";
        
        db.query(sqlQuery, [email, hashedPassword], (error, result) => {
            if (error) {
                return res.status(500).send(JSON.stringify({ success: false, message: 'Lỗi khi kết nối đến database: ' + error.message }));
            }

            // Tạo câu lệnh SQL để chèn thông tin độc giả
            var sqlQueryDocGia = "INSERT INTO docgia (tendocgia, email, sdt) VALUES ( ?,?, ?)";
            
            db.query(sqlQueryDocGia, [tendocgia, email, sdt], (errorDocGia, resultDocGia) => {
                if (errorDocGia) {
                    return res.status(500).send(JSON.stringify({ success: false, message: 'Lỗi khi tạo thông tin độc giả: ' + errorDocGia.message }));
                }

                res.status(200).send(JSON.stringify({ success: true, message: 'Đăng ký thành công' }));
            });
        });
    } catch (error) {
        res.status(500).send(JSON.stringify({ success: false, message: 'Có lỗi xảy ra', error: error.message }));
    }
});

module.exports=router;