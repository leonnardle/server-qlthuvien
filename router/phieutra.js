const express =require('express');

const router = express.Router(); 
var db=require('../db');
router.route('/').get((req,res)=>{
    //nhan tham so
    var sqlQuery="select * from phieutra";
    db.query(sqlQuery,function(error,data){
        if(error){
            res.status(500).send(JSON.stringify({ success: false, message: 'error when connect to database: ' + error.message }));
        }else{
            res.json({message:"success",data})
        }
    });
});
const { randomCode } = require('../function/generationCode');

router.post('/', async (req, res) => {
    const {  maphieumuon, ngaytra, ghichu, masachList } = req.body;
    const mapt=randomCode('PT',8);
    try {
        // Bắt đầu transaction
        await new Promise((resolve, reject) => {
            db.query('START TRANSACTION', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Kiểm tra xem phiếu mượn đã tồn tại trong bảng phieutra chưa
        const existingPaySlip = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM phieutra WHERE maphieumuon = ?',
                [maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.length > 0);
                    }
                }
            );
        });

        // Nếu phiếu trả đã tồn tại thì không thêm mới
        if (existingPaySlip) {
            res.status(400).json({ message: 'Phiếu trả đã tồn tại cho phiếu mượn này.' });
            return;
        }

        // Lấy danh sách sách từ phiếu mượn
        const loanBooks = await new Promise((resolve, reject) => {
            db.query(
                'SELECT masach FROM phieumuon_sach WHERE maphieumuon = ?',
                [maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.map(row => row.masach));
                    }
                }
            );
        });

        // Kiểm tra số lượng sách đã trả so với số lượng sách mượn
        const allBooksReturned = loanBooks.every(book => masachList.includes(book));
        const trangthai = allBooksReturned ? 1 : 0;

        // Thêm phiếu trả vào bảng phieutra
        await new Promise((resolve, reject) => {
            db.query(
                'INSERT INTO phieutra ( mapt,maphieumuon, ngaytra, trangthai, ghichu) VALUES ( ?,?, ?, ?, ?)',
                [ mapt,maphieumuon, ngaytra, trangthai, ghichu],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Thêm mối quan hệ sách-phieutra vào bảng phieutra_sach
        const insertRelations = masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO phieutra_sach (maphieutra, masach) VALUES (?, ?)',
                    [mapt, masach],
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

        await Promise.all(insertRelations);

        // Cập nhật trạng thái sách về 0 khi sách đã được trả
        await Promise.all(masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'UPDATE thongtinsach SET trangthai = 0 WHERE masach = ?',
                    [masach],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        ));

        // Cập nhật trạng thái phiếu mượn
        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE phieumuon SET trangthai = ? WHERE mapm = ?',
                [trangthai, maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Thêm phiếu trả thành công' });

    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        console.error('Lỗi khi thêm phiếu trả:', error);
        res.status(500).json({ message: 'Lỗi khi thêm phiếu trả', error: error.message });
    }
});


router.delete('/:mapt', async (req, res) => {
    const { mapt } = req.params;

    try {
        // Bắt đầu transaction
        await new Promise((resolve, reject) => {
            db.query('START TRANSACTION', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Lấy phiếu mượn tương ứng với phiếu trả
        const maphieumuon = await new Promise((resolve, reject) => {
            db.query(
                'SELECT maphieumuon FROM phieutra WHERE mapt = ?',
                [mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else if (results.length === 0) {
                        resolve(null);
                    } else {
                        resolve(results[0].maphieumuon);
                    }
                }
            );
        });

        if (!maphieumuon) {
            res.status(404).json({ message: 'Phiếu trả không tồn tại' });
            return;
        }

        // Xóa mối quan hệ sách-phieutra trong bảng phieutra_sach
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM phieutra_sach WHERE maphieutra = ?',
                [mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Xóa phiếu trả khỏi bảng phieutra
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM phieutra WHERE mapt = ?',
                [mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Cập nhật trạng thái phiếu mượn thành false (0)
        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE phieumuon SET trangthai = 0 WHERE mapm = ?',
                [maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Xóa phiếu trả thành công và cập nhật trạng thái phiếu mượn thành chưa trả' });

    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        console.error('Lỗi khi xóa phiếu trả:', error);
        res.status(500).json({ message: 'Lỗi khi xóa phiếu trả', error: error.message });
    }
});


router.put('/:mapt', async (req, res) => {
    const { mapt } = req.params;
    const { maphieumuon, ngaytra, ghichu, masachList } = req.body;

    try {
        // Bắt đầu transaction
        await new Promise((resolve, reject) => {
            db.query('START TRANSACTION', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Kiểm tra xem phiếu trả đã tồn tại chưa
        const existingPaySlip = await new Promise((resolve, reject) => {
            db.query(
                'SELECT * FROM phieutra WHERE mapt = ?',
                [mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.length > 0);
                    }
                }
            );
        });

        // Nếu phiếu trả không tồn tại, trả về lỗi
        if (!existingPaySlip) {
            res.status(404).json({ message: 'Phiếu trả không tồn tại.' });
            return;
        }

        // Lấy danh sách sách từ phiếu mượn
        const loanBooks = await new Promise((resolve, reject) => {
            db.query(
                'SELECT masach FROM phieumuon_sach WHERE maphieumuon = ?',
                [maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.map(row => row.masach));
                    }
                }
            );
        });

        // Kiểm tra số lượng sách đã trả so với số lượng sách mượn
        const allBooksReturned = loanBooks.every(book => masachList.includes(book));
        const trangthai = allBooksReturned ? 1 : 0; // 1 nếu đã trả đủ sách, 0 nếu không

        // Cập nhật phiếu trả trong bảng phieutra
        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE phieutra SET maphieumuon = ?, ngaytra = ?, trangthai = ?, ghichu = ? WHERE mapt = ?',
                [maphieumuon, ngaytra, trangthai, ghichu, mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Xóa các mối quan hệ sách-phieutra cũ trong bảng phieutra_sach
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM phieutra_sach WHERE maphieutra = ?',
                [mapt],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Thêm mối quan hệ sách-phieutra mới vào bảng phieutra_sach
        const insertRelations = masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO phieutra_sach (maphieutra, masach) VALUES (?, ?)',
                    [mapt, masach],
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

        await Promise.all(insertRelations);

        // Cập nhật trạng thái sách đã trả
        await Promise.all(masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'UPDATE thongtinsach SET trangthai = 0 WHERE masach = ?',
                    [masach],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        ));

        // Cập nhật trạng thái sách bị thiếu
        const missingBooks = loanBooks.filter(book => !masachList.includes(book));
        await Promise.all(missingBooks.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'UPDATE thongtinsach SET trangthai = 1 WHERE masach = ?',
                    [masach],
                    (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            })
        ));

        // Cập nhật trạng thái phiếu mượn
        await new Promise((resolve, reject) => {
            db.query(
                'UPDATE phieumuon SET trangthai = ? WHERE mapm = ?',
                [trangthai, maphieumuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        res.status(200).json({ message: 'Cập nhật phiếu trả thành công' });

    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        console.error('Lỗi khi cập nhật phiếu trả:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật phiếu trả', error: error.message });
    }
});



// lay danh sach sach tu phieu muon
// router.get('/:maphieumuon/danhsachsachmuon',  (req, res) => {
//     try {
//         const { maphieumuon } = req.params;
//         const sqlQuery = `
//             SELECT *
//             FROM thongtinsach
//             JOIN phieumuon_sach ON thongtinsach.masach = phieumuon_sach.masach
//             WHERE phieumuon_sach.maphieumuon = ?;
//         `;
//         db.query(sqlQuery, [maphieumuon], (error, data) => {
//             if (error) {
//                 console.error('Error querying the database:', error.message);  
//                 res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
//             } else if (data.length === 0) {
//                 res.json({ message: 'khong co sach nao cho phieu muon nay' });
//             } else {
//                 res.json({ message: 'success', data: data });
//             }
//         });
//     } catch (error) {
//         console.error('Unexpected error:', error.message);  
//         res.status(500).json({ error: 'Không nạp được danh sách loai sach' });
//     }
// });
// lay danh sach sach tu phieu tra
router.get('/:maphieutra/danhsachsachtra',  (req, res) => {
    try {
        const { maphieutra } = req.params;
        const sqlQuery = `
            SELECT *
            FROM thongtinsach
            JOIN phieutra_sach ON thongtinsach.masach = phieutra_sach.masach
            WHERE phieutra_sach.maphieutra = ?;
        `;
        db.query(sqlQuery, [maphieutra], (error, data) => {
            if (error) {
                console.error('Error querying the database:', error.message);  
                res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
            } else if (data.length === 0) {
                res.json({ message: 'khong co sach nao cho phieu tra nay' });
            } else {
                res.json({ message: 'success', data: data });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách sach' });
    }
});
router.route('/:mapm').get((req, res) => {
    const { mapm } = req.params; 

    // Nhận tham số
    const sqlQuery = 'SELECT * FROM phieumuon WHERE mapm = ?';
    
    // Chuyển tham số vào mảng và truyền vào hàm query
    db.query(sqlQuery, [mapm], function (error, data) {
        if (error) {
            res.status(500).send(JSON.stringify({ success: false, message: 'Error when connecting to database: ' + error.message }));
        } else if (data.length === 0) {
            res.status(404).json({ success: false, message: 'Phiếu mượn không tồn tại' });
        } else {
            res.json({ success: true, data: data }); // Thêm `data` vào response nếu cần
        }
    });
});

module.exports=router;