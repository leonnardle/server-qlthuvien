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
                matg: row.matg,
                manxb : row.manxb ,
                maloai: row.maloai,
                mota : row.mota ,
                // Chuyển đổi hình ảnh sang base64
                hinhanh: row.hinhanh ? row.hinhanh.toString('base64') : null,
                soluong: row.soluong
            }));

            res.json({ message: "success", data: results });
        }
    });
});

router.post('/', async (req, res) => {
    const { masach, tensach, mota, hinhanh, soluong, manxbList, maloaiList,matacgiaList } = req.body;

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
        INSERT INTO thongtinsach (masach, tensach, mota, hinhanh, soluong)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        // Bắt đầu transaction
        db.query('START TRANSACTION');

        // Thêm sách vào bảng thongtinsach
        await new Promise((resolve, reject) => {
            db.query(
                insertBookQuery,
                [masach, tensach, mota, imageBuffer, soluong],
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
        await Promise.all([...insertRelations, ...insertLoaisachRelations,
            ...insertTacgiaRelations]);

        // Commit transaction
        db.query('COMMIT');
        res.status(200).json({ message: 'Book added successfully' });

    } catch (error) {
        // Rollback transaction in case of error
        db.query('ROLLBACK');
        console.error('Error inserting book and relationships:', error);
        res.status(500).json({ message: 'Error inserting book and relationships', error: error.message });
    }
});

router.delete('/:masach',(req,res)=>{
    const {masach}=req.params;
    var sqlQuery="delete from thongtinsach where masach=?";
    db.query(sqlQuery,masach,(error,data)=>{
        if(error){
            res.status(500).json({message:error.message});
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy sách nào với mã này', data });
        }
        else{
            res.json({message:"xoa thanh cong"})
        }

    });

});
router.put('/:masach', async (req, res) => {
    const { masach } = req.params;
    const { tensach, mota, hinhanh, soluong, manxbList, maloaiList, matacgiaList } = req.body;

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
        SET tensach = ?, mota = ?, hinhanh = ?, soluong = ?
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
                [tensach, mota, imageBuffer, soluong, masach],
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
