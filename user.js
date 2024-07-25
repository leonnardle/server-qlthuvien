const express =require('express');

const router = express.Router(); 
const bcrypt = require('bcrypt');

var db=require('./db');
router.route('/login').post(async (req, res) => {
    const { email, password } = req.body;

    // Tạo truy vấn để lấy thông tin người dùng từ cơ sở dữ liệu
    const sqlQuery = "SELECT * FROM taikhoan WHERE email=?";
    db.query(sqlQuery, [email], async (error, data) => {
        if (error) {
            return res.status(500).send(JSON.stringify({ success: false, message: 'Database error: ' + error.message }));
        }
        
        // Kiểm tra nếu không tìm thấy người dùng
        if (data.length <= 0) {
            console.log(`No user found with email: ${email}`);
            return res.status(401).send(JSON.stringify({ success: false, message: 'Invalid email or password' }));
        }

        const user = data[0];
        console.log('User found:', user);

        try {
            // So sánh mật khẩu nhập vào với mật khẩu băm lưu trữ
            const isMatch = await bcrypt.compare(password, user.password);
            console.log(`Password entered: ${password}`);
            console.log(`Password stored: ${user.password}`);
            console.log(`Password match: ${isMatch}`);

            if (isMatch) {
                // Mật khẩu khớp, trả về thông báo thành công
                res.status(200).send(JSON.stringify({ success: true, message: 'Login successful', data: user }));
            } else {
                // Mật khẩu không khớp
                console.log(`Password mismatch for email: ${email}`);
                res.status(401).send(JSON.stringify({ success: false, message: 'Invalid email or password' }));
            }
        } catch (compareError) {
            console.log('Error comparing passwords:', compareError);
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
        const { email, password } = req.body;

        // Mã hóa mật khẩu 
        const hashedPassword = await bcrypt.hash(password, 10); // dùng 10 vòng lặp để tạo hash

        // Tạo câu lệnh SQL để chèn người dùng mới vào cơ sở dữ liệu
        var sqlQuery = "INSERT INTO taikhoan (email, password) VALUES (?, ?)";
        
        db.query(sqlQuery, [email, hashedPassword], (error, result) => {
            if (error) {
                res.status(500).send(JSON.stringify({ success: false, message: 'Database error: ' + error.message }));
            } else {
                res.status(200).send(JSON.stringify({ success: true, message: 'Registration successful' }));
            }
        });
    } catch (error) {
        res.status(500).send(JSON.stringify({ success: false, message: 'An unexpected error occurred', error: error.message }));
    }
});
module.exports=router;