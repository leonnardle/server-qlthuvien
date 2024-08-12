const express = require('express');
const router = express.Router();
const db = require('../db');
const { addPhieuMuon } = require('../function/addphieumuonService'); 
const { randomCode } = require('../function/generationCode'); 



// Đếm số lượng phiếu mượn đang chờ duyệt
router.get('/count', (req, res) => {
    const sqlQuery = "SELECT COUNT(*) AS count FROM phieumuondangchoduyet";
    db.query(sqlQuery, (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Error connecting to database: ' + error.message });
        }
        res.json({ message: "success", count: results[0].count });
    });
});

// Lấy danh sách phiếu mượn đang chờ duyệt
// Lấy danh sách phiếu mượn đang chờ duyệt
router.get('/', async (req, res) => {
    const sqlQuery = `
        SELECT p.*, GROUP_CONCAT(ps.masach) AS masachList 
        FROM phieumuondangchoduyet p
        LEFT JOIN phieumuondangchoduyet_sach ps ON p.mapm = ps.mapm
        GROUP BY p.mapm
    `;
    
    db.query(sqlQuery, (error, data) => {
        if (error) {
            return res.status(500).json({ success: false, message: 'Error connecting to database: ' + error.message });
        }

        // Chuyển đổi masachList từ chuỗi về mảng
        const result = data.map(item => {
            return {
                ...item,
                masachList: item.masachList ? item.masachList.split(',') : [] // Chuyển đổi chuỗi thành mảng
            };
        });

        res.json({ message: "success", data: result });
    });
});


// Thêm phiếu mượn vào danh sách chờ duyệt
router.post('/', async (req, res) => {
    const { madocgia, ngaymuon, masachList } = req.body;
    const mapm=randomCode('PM',8);
    const checkQuery = "SELECT * FROM phieumuondangchoduyet WHERE madocgia = ?";
    try {
        const existingRequests = await new Promise((resolve, reject) => {
            db.query(checkQuery, [madocgia], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        if (existingRequests.length > 0) {
            return res.status(400).json({ message: 'Borrowing request for this reader already exists.' });
        }
        // Kiểm tra trạng thái của các cuốn sách trong masachList
        const checkBooksStatusQuery = 'SELECT masach, trangthai FROM thongtinsach WHERE masach IN (?)';
        const bookStatusData = await new Promise((resolve, reject) => {
            db.query(checkBooksStatusQuery, [masachList], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        // Kiểm tra nếu có cuốn sách nào không cho mượn
        const unavailableBooks = bookStatusData.filter(book => book.trangthai === 1).map(book => book.masach);
        if (unavailableBooks.length > 0) {
            return res.status(400).json({ 
                message: 'Một hoặc nhiều cuốn sách không thể cho mượn.', 
                unavailableBooks 
            });
        }

        // Nếu tất cả sách đều có trạng thái cho phép mượn, tiến hành tạo phiếu mượn
        const sqlQuery = "INSERT INTO phieumuondangchoduyet(mapm, madocgia, ngaymuon) VALUES (?, ?, ?)";
        await new Promise((resolve, reject) => {
            db.query(sqlQuery, [mapm, madocgia, ngaymuon], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        const insertRelations = masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO phieumuondangchoduyet_sach (mapm, masach) VALUES (?, ?)',
                    [mapm, masach],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            })
        );

        await Promise.all(insertRelations);
        res.status(200).json({ message: 'Borrowing request successfully created and awaiting approval' });

    } catch (error) {
        console.error('Error adding borrowing request:', error);
        res.status(500).json({ message: 'Error adding borrowing request', error: error.message });
    }
});


// Duyệt phiếu mượn
router.post('/duyet/:mapm', async (req, res) => {
    const { mapm } = req.params;
    try {
        const getRequestQuery = 'SELECT * FROM phieumuondangchoduyet WHERE mapm = ?';
        const requestData = await new Promise((resolve, reject) => {
            db.query(getRequestQuery, [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (!requestData || requestData.length === 0) {
            return res.status(404).json({ message: 'Borrowing request not found' });
        }

        const { madocgia, ngaymuon } = requestData[0];

        // Lấy danh sách sách từ bảng phieumuondangchoduyet_sach
        const getBooksQuery = 'SELECT masach FROM phieumuondangchoduyet_sach WHERE mapm = ?';
        const booksData = await new Promise((resolve, reject) => {
            db.query(getBooksQuery, [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.map(row => row.masach));
                }
            });
        });

        // Kiểm tra trạng thái của các cuốn sách
        const checkBooksStatusQuery = 'SELECT masach, trangthai FROM thongtinsach WHERE masach IN (?)';
        const bookStatusData = await new Promise((resolve, reject) => {
            db.query(checkBooksStatusQuery, [booksData], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        // Kiểm tra nếu có cuốn sách nào không cho mượn
        const unavailableBooks = bookStatusData.filter(book => book.trangthai === 1).map(book => book.masach);
        if (unavailableBooks.length > 0) {
            return res.status(400).json({ 
                message: 'Những quyển sau không có sẵn.', 
                unavailableBooks 
            });
        }
        // Nếu tất cả sách đều có trạng thái cho phép mượn, tiến hành phê duyệt phiếu mượn
        await addPhieuMuon( madocgia, ngaymuon, booksData);

        // Xóa phiếu mượn cũ
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM phieumuondangchoduyet WHERE mapm = ?', [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        res.status(200).json({ message: 'Borrowing request approved and added to loan slips' });

    } catch (error) {
        console.error('Error approving borrowing request:', error);
        res.status(500).json({ message: 'Error approving borrowing request', error: error.message });
    }
});


// Xóa yêu cầu chờ duyệt
router.delete('/:mapm', async (req, res) => {
    const { mapm } = req.params;

    try {
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM phieumuondangchoduyet WHERE mapm = ?', [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        res.status(200).json({ message: 'Borrowing request deleted successfully' });

    } catch (error) {
        console.error('Error deleting borrowing request:', error);
        res.status(500).json({ message: 'Error deleting borrowing request', error: error.message });
    }
});

module.exports = router;
