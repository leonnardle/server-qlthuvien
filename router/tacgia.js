const express = require('express');
const router = express.Router();
const db = require('../db');

router.route('/').get((req, res) => {
    const sqlQuery = "SELECT * FROM tacgia";
    db.query(sqlQuery, (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
        } else {
            // Chuyển đổi hình ảnh từ LONGBLOB sang base64
            const results = data.map(row => ({
                matacgia: row.matacgia,
                tentacgia: row.tentacgia,
                quoctich: row.quoctich,
                tieusu: row.tieusu,
                email: row.email,
                // Chuyển đổi hình ảnh sang base64
                image: row.image ? row.image.toString('base64') : null
            }));

            res.json({ message: "success", data: results });
        }
    });
});

router.post('/', (req, res) => {
    const { matacgia, tentacgia, quoctich, tieusu, email, image } = req.body;

    let imageBuffer = null;
    if (image) {
        try {
            // Chuyển đổi base64 thành Buffer
            const base64Data = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");  // Xử lý mọi loại ảnh, không chỉ PNG
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error decoding base64 image:', error);
            return res.status(400).json({ message: 'Invalid image format', error: error.message });
        }
    }

    const sqlQuery = `
        INSERT INTO tacgia (matacgia, tentacgia, quoctich, tieusu, email, image)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sqlQuery,
        [matacgia, tentacgia, quoctich, tieusu, email, imageBuffer],
        (error, data) => {
            if (error) {
                console.error('Error inserting author:', error);
                res.status(500).json({ message: 'Error inserting author', error: error.message });
            } else {
                res.json({ message: 'success', data: data });  // Trả về data thay vì result để tránh cấu trúc vòng lặp
            }
        }
    );
});
router.delete('/:matacgia',(req,res)=>{
    const {matacgia}=req.params;
    var sqlQuery="delete from tacgia where matacgia=?";
    db.query(sqlQuery,matacgia,(error,data)=>{
        if(error){
            res.status(500).json({message:error.message});
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy loại tác giả nào với mã này', data });
        }
        else{
            res.json({message:"xoa thanh cong"})
        }

    });

});
router.put('/:matacgia', (req, res) => {
    const { matacgia } = req.params;
    const { tentacgia, quoctich, tieusu, email, image } = req.body;

    let imageBuffer = null;
    if (image) {
        try {
            // Chuyển đổi base64 thành Buffer
            const base64Data = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");  // Xử lý mọi loại ảnh, không chỉ PNG
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error decoding base64 image:', error);
            return res.status(400).json({ message: 'Invalid image format', error: error.message });
        }
    }

    const sqlQuery = `
        UPDATE tacgia
        SET tentacgia = ?, quoctich = ?, tieusu = ?, email = ?, image = ?
        WHERE matacgia = ?
    `;

    db.query(
        sqlQuery,
        [tentacgia, quoctich, tieusu, email, imageBuffer, matacgia],
        (error, data) => {
            if (error) {
                console.error('Error updating author:', error);
                res.status(500).json({ message: 'Error updating author', error: error.message });
            } else {
                res.json({ message: 'success', data: data });  // Trả về data thay vì result để tránh cấu trúc vòng lặp
            }
        }
    );
});

module.exports = router;
