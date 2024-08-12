const express = require('express');
const util = require('util');
const router = express.Router();
const db = require('../db');

// Chuyển db.query thành hàm trả về Promise
const query = util.promisify(db.query).bind(db);

// Lấy danh sách tất cả các độc giả
router.get('/', async (req, res) => {
    try {
        const sqlQuery = "SELECT * FROM docgia";
        const data = await query(sqlQuery);
        res.json({ message: "success", data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error when connecting to database: ' + error.message });
    }
});

// Thêm một độc giả mới
router.post('/', async (req, res) => {
    try {
        const {  tendocgia, email, sdt } = req.body;
        const checkEmailQuery = "SELECT COUNT(*) AS count FROM docgia WHERE email = ?";
        const [emailCheckResult] = await query(checkEmailQuery, [email]);
        if (emailCheckResult.count > 0) {
            return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống!' });
        }
        const sqlQuery = "INSERT INTO docgia( tendocgia, email, sdt) VALUES ( ?, ?, ?) ";
        const data = await query(sqlQuery, [ tendocgia, email, sdt]);
        res.json({ success: true, message: 'Success', data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Xóa một độc giả theo mã độc giả
router.delete('/:madocgia', async (req, res) => {
    try {
        const { madocgia } = req.params;
        const sqlQuery = "DELETE FROM docgia WHERE madocgia = ?";
        const data = await query(sqlQuery, [madocgia]);
        if (data.affectedRows === 0) {
            res.status(404).json({ success: false, message: 'Không tìm thấy độc giả nào với mã này' });
        } else {
            res.json({ message: "Xóa thành công" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Cập nhật thông tin của một độc giả theo mã độc giả
router.put('/:madocgia', async (req, res) => {
    try {
        const { madocgia } = req.params;
        const { tendocgia, email, sdt } = req.body;
        const sqlQuery = "UPDATE docgia SET tendocgia = ?, email = ?, sdt = ? WHERE madocgia = ?";
        const data = await query(sqlQuery, [tendocgia, email, sdt, madocgia]);
        if (data.affectedRows === 0) {
            res.status(404).json({ success: false, message: 'Không tìm thấy độc giả nào với mã này' });
        } else {
            res.json({ success: true, message: 'Success' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.route('/:madocgia').get((req, res) => {
    // Nhận tham số
    const { madocgia } = req.params; 
    var sqlQuery = "SELECT * FROM docgia WHERE madocgia = ?";
    db.query(sqlQuery, [madocgia], function(error, data) { 
        if (error) {
            res.status(500).send(JSON.stringify({ success: false, message: 'Error when connecting to database: ' + error.message }));
        } else if (data.length === 0) {
            res.status(404).json({ success: false, message: 'Độc giả không tồn tại' });
        } else {
            res.json({ success: true });
        }
    });
});
// Kiểm tra xem độc giả có tồn tại hay không khi thêm sách
router.get('/laydanhsach/:madocgia', async (req, res) => {
    try {
        const readerId = req.params.madocgia;

        // Lấy thông tin độc giả
        const readerQuery = "SELECT * FROM docgia WHERE madocgia = ?";
        const reader = await query(readerQuery, [readerId]);

        // Kiểm tra xem độc giả có tồn tại không
        if (!reader || reader.length === 0) {
            return res.status(404).json({ success: false, message: 'Độc giả không tồn tại' });
        }

        // Lấy danh sách phiếu mượn liên quan đến độc giả
        // sau đó lấy danh sách sách chưa trả trên từng phiếu rồi cập nhật nó cho borrowRecordsQuery
        const borrowRecordsQuery = "SELECT pm.*,pt.ngaytra from phieumuon pm LEFT JOIN phieutra pt on pt.maphieumuon=pm.mapm";
        const borrowRecords = await query(borrowRecordsQuery, [readerId]);

        const detailedRecords = await Promise.all(borrowRecords.map(async (record) => {
            const { mapm, ngaymuon,ngaytra } = record;

            // Kiểm tra sách đã trả chưa
            const returnRecordsQuery = "SELECT * FROM phieutra WHERE maphieumuon = ?";
            const returnRecords = await query(returnRecordsQuery, [mapm]);
            const booksReturned = returnRecords.length > 0;

            // Lấy danh sách sách trả thiếu
            const booksMissingQuery = `
                SELECT masach FROM phieumuon_sach WHERE maphieumuon = ? AND masach NOT IN (
                    SELECT masach FROM phieutra WHERE maphieumuon = ?
                )`;
            const missingBooks = await query(booksMissingQuery, [mapm, mapm]);

            return {
                mapm,
                ngaymuon,
                status: booksReturned ? 'Đã trả' : 'Chưa trả',
                ngaytra,
                missingBooks: missingBooks.length > 0 ? missingBooks.map(book => book.masach) : ['không có']
            };
        }));

        // Trả về phản hồi chi tiết
        res.json({
            success: true,
            reader: reader[0],
            borrowRecords: detailedRecords,
        });
    } catch (error) {
        console.error('Error:', error); // Ghi lại lỗi
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
});
module.exports = router;
