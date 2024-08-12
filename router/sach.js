const express = require('express');
const router = express.Router();
const db = require('../db');
router.route('/').get((req, res) => {
    const sqlQuery = "SELECT * FROM thongtinsach";
    db.query(sqlQuery, (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
        } else {
            // Chuyển đổi hình ảnh từ LONGBLOB sang base64
            const results = data.map(row => ({
                masach: row.masach,
                tensach: row.tensach,
                mota : row.mota ,
                trangthai:row.trangthai,
                // Chuyển đổi hình ảnh sang base64
                hinhanh: row.hinhanh ? row.hinhanh.toString('base64') : null,
            }));

            res.json({ message: "success", data: results });
        }
    });
});

const { randomCode } = require('../function/generationCode');

router.post('/', async (req, res) => {
    const { tensach, mota, hinhanh, manxbList, maloaiList, matacgiaList } = req.body;

    // Tạo mã sách ngẫu nhiên
    const masach = randomCode('SACH',6);
    console.log('Generated masach:', masach); // Kiểm tra giá trị masach

    let imageBuffer = null;
    if (hinhanh) {
        try {
            // Chuyển đổi base64 thành Buffer
            const base64Data = hinhanh.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error decoding base64 image:', error);
            return res.status(400).json({ message: 'Invalid image format', error: error.message });
        }
    }

    const insertBookQuery = `
        INSERT INTO thongtinsach (masach, tensach, mota, hinhanh)
        VALUES (?, ?, ?, ?)
    `;

    try {
        // Bắt đầu transaction
        await new Promise((resolve, reject) => {
            db.query('START TRANSACTION', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        // Thêm sách vào bảng thongtinsach
        await new Promise((resolve, reject) => {
            db.query(
                insertBookQuery,
                [masach, tensach, mota, imageBuffer],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Thêm mối quan hệ sách-nxb vào bảng sach_nhaxuatban
        const insertRelations = manxbList.map(manxb =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_nhaxuatban (masach, manxb) VALUES (?, ?)',
                    [masach, manxb],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        // Thêm mối quan hệ sách-loaisach vào bảng sach_loaisach
        const insertLoaisachRelations = maloaiList.map(maloai =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_loaisach (masach, maloai) VALUES (?, ?)',
                    [masach, maloai],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        const insertTacgiaRelations = matacgiaList.map(matg =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_tacgia (masach, matg) VALUES (?, ?)',
                    [masach, matg],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        // Chờ tất cả các Promise hoàn thành
        await Promise.all([...insertRelations, ...insertLoaisachRelations, ...insertTacgiaRelations]);

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        res.status(200).json({ message: 'Book added successfully' });

    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) return reject(error);
                resolve();
            });
        });

        console.error('Error inserting book and relationships:', error);
        res.status(500).json({ message: 'Error inserting book and relationships', error: error.message });
    }
});

router.delete('/:masach', (req, res) => {
    const { masach } = req.params;

    // Câu lệnh kiểm tra sách có trong phiếu mượn hay không
    const checkSachSql = 
        "SELECT * FROM phieumuon_sach pms JOIN phieumuon pm ON pms.maphieumuon = pm.mapm WHERE pms.masach = ? AND pm.trangthai = 0";

    // Câu lệnh xóa sách
    const sqlQuery = "DELETE FROM thongtinsach WHERE masach = ?";

    // Kiểm tra xem sách có trong phiếu mượn không
    db.query(checkSachSql, [masach], (error, data) => {
        if (error) {
            return res.status(500).send({ success: false, message: 'Lỗi khi kết nối DB: ' + error.message });
        }

        // Nếu sách tồn tại trong phiếu mượn
        if (data.length > 0) {
            return res.status(400).send({ success: false, message: 'Không thể xóa vì nó tồn tại trong 1 phiếu mượn.' });
        } else {
            // Nếu không tồn tại trong phiếu mượn, tiến hành xóa
            db.query(sqlQuery, [masach], (error, data) => {
                if (error) {
                    res.status(500).json({ message: error.message });
                } else if (data.affectedRows === 0) {
                    res.status(404).json({ success: false, message: 'Không tìm thấy sách nào với mã này', data });
                } else {
                    res.json({ message: "Xóa thành công" });
                }
            });
        }
    });
});

router.put('/:masach', async (req, res) => {
    const { masach } = req.params;
    const { tensach, mota, hinhanh, manxbList, maloaiList, matacgiaList } = req.body;

    let imageBuffer = null;
    if (hinhanh) {
        try {
            // Chuyển đổi base64 thành Buffer
            const base64Data = hinhanh.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            console.error('Error decoding base64 image:', error);
            return res.status(400).json({ message: 'Invalid image format', error: error.message });
        }
    }

    const updateBookQuery = `
        UPDATE thongtinsach
        SET tensach = ?, mota = ?, hinhanh = ?
        WHERE masach = ?
    `;

    try {
        // Bắt đầu transaction
        await new Promise((resolve, reject) => {
            db.query('START TRANSACTION', (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        // Cập nhật thông tin sách
        await new Promise((resolve, reject) => {
            db.query(
                updateBookQuery,
                [tensach, mota, imageBuffer, masach],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Kiểm tra xem masach có tồn tại trong thongtinsach không
        const checkBookQuery = 'SELECT * FROM thongtinsach WHERE masach = ?';
        const bookExists = await new Promise((resolve, reject) => {
            db.query(checkBookQuery, [masach], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0);
                }
            });
        });

        if (!bookExists) {
            throw new Error('Book does not exist in thongtinsach');
        }

        // Xóa các mối quan hệ sách cũ
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM sach_nhaxuatban WHERE masach = ?',
                [masach],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM sach_loaisach WHERE masach = ?',
                [masach],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM sach_tacgia WHERE masach = ?',
                [masach],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Thêm mối quan hệ sách-nxb mới
        const insertRelations = manxbList.map(manxb =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_nhaxuatban (masach, manxb) VALUES (?, ?)',
                    [masach, manxb],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        // Thêm mối quan hệ sách-loaisach mới
        const insertLoaisachRelations = maloaiList.map(maloai =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_loaisach (masach, maloai) VALUES (?, ?)',
                    [masach, maloai],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        // Thêm mối quan hệ sách-tacgia mới
        const insertTacgiaRelations = matacgiaList.map(matg =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO sach_tacgia (masach, matg) VALUES (?, ?)',
                    [masach, matg],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        );

        // Chờ tất cả các Promise hoàn thành
        await Promise.all([...insertRelations, ...insertLoaisachRelations, ...insertTacgiaRelations]);

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        res.status(200).json({ message: 'Book updated successfully' });

    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        console.error('Error updating book and relationships:', error);
        res.status(500).json({ message: 'Error updating book and relationships', error: error.message });
    }
});

router.get('/:bookId/danhsachnxb',  (req, res) => {
    try {
        const { bookId } = req.params;
        const sqlQuery = `
            SELECT *
            FROM nhaxuatban
            JOIN sach_nhaxuatban ON nhaxuatban.manxb = sach_nhaxuatban.manxb
            WHERE sach_nhaxuatban.masach = ?;
        `;
        db.query(sqlQuery, [bookId], (error, data) => {
            if (error) {
                console.error('lỗi truy vấn:', error.message);  
                res.status(500).json({ success: false, message: 'lỗi khi kết nối db: ' + error.message });
            } else if (data.length === 0) {
                res.json({ message: 'Không có nhà xuất bản nào cho quyển sách này' });
            } else {
                res.json({ message: 'success', data: data });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách nhà xuất bản' });
    }
});
router.get('/:bookId/danhsachloaisach',  (req, res) => {
    try {
        const { bookId } = req.params;
        const sqlQuery = `
            SELECT *
            FROM loaisach
            JOIN sach_loaisach ON loaisach.maloai = sach_loaisach.maloai
            WHERE sach_loaisach.masach = ?;
        `;
        db.query(sqlQuery, [bookId], (error, data) => {
            if (error) {
                console.error('Error querying the database:', error.message);  
                res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
            } else if (data.length === 0) {
                res.json({ message: 'Không có loai nào cho quyển sách này' });
            } else {
                res.json({ message: 'success', data: data });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách loai sach' });
    }
});
router.get('/:bookId/danhsachtacgia',  (req, res) => {
    try {
        const { bookId } = req.params;
        const sqlQuery = `
            SELECT *
            FROM tacgia
            JOIN sach_tacgia ON tacgia.matacgia = sach_tacgia.matg
            WHERE sach_tacgia.masach = ?;
        `;
        db.query(sqlQuery, [bookId], (error, data) => {
            if (error) {
                console.error('Error querying the database:', error.message);  
                res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
            } else if (data.length === 0) {
                res.json({ message: 'Không có tac gia nào cho quyển sách này' });
            } else {
                res.json({ message: 'success', data: data });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách loai sach' });
    }
});
router.get('/:bookId',  (req, res) => {
    try {
        const { bookId } = req.params;
        const sqlQuery = `
            SELECT *
            FROM thongtinsach
            WHERE masach= ?;
        `;
        db.query(sqlQuery, [bookId], function(error, data) { 
            if (error) {
                res.status(500).send(JSON.stringify({ success: false, message: 'Error when connecting to database: ' + error.message }));
            } else if (data.length === 0) {
                res.status(404).json({ success: false, message: 'sách không tồn tại' });
            } else {
                res.json({ success: true });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách loai sach' });
    }
});


module.exports = router;
