const express =require('express');

const router = express.Router(); 
var db=require('../db');
// ham them phieu muon
const { addPhieuMuon } = require('../function/addphieumuonService'); 


router.route('/').get((req,res)=>{
    //nhan tham so
    var sqlQuery="select * from phieumuon";
    db.query(sqlQuery,function(error,data){
        if(error){
            res.status(500).send(JSON.stringify({ success: false, message: 'error when connect to database: ' + error.message }));
        }else{
            res.json({message:"success",data})
        }
    });
});
router.post('/', async (req, res) => {
    const { madocgia, ngaymuon, masachList } = req.body;

    try {
        await addPhieuMuon( madocgia, ngaymuon, masachList);
        res.status(200).json({ message: 'Borrowing successfully created' });
    } catch (error) {
        // Rollback transaction in case of error
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
        console.error('Error inserting book and relationships:', error);
        res.status(500).json({ message: 'Error inserting book and relationships', error: error.message });
    }
});

router.delete('/:mapm', async (req, res) => {
    const { mapm } = req.params;
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

        // Kiểm tra xem phiếu mượn có tồn tại không
        const checkLoanSlipQuery = 'SELECT COUNT(*) AS count FROM phieumuon WHERE mapm = ?';
        const [checkResults] = await new Promise((resolve, reject) => {
            db.query(checkLoanSlipQuery, [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        if (checkResults[0].count === 0) {
            // Nếu phiếu mượn không tồn tại, không cho phép xóa
            await new Promise((resolve, reject) => {
                db.query('ROLLBACK', (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            return res.status(404).json({ message: 'Loan slip not found' });
        }

        // Lấy danh sách mã sách từ phiếu mượn
        const getBooksQuery = 'SELECT masach FROM phieumuon_sach WHERE maphieumuon = ?';
        const [booksResults] = await new Promise((resolve, reject) => {
            db.query(getBooksQuery, [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        // Cập nhật trạng thái của các sách về 0
        await Promise.all(booksResults.map(({ masach }) => 
            new Promise((resolve, reject) => {
                db.query('UPDATE thongtinsach SET trangthai = 0 WHERE masach = ?', [masach], (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            })
        ));

        // Xóa phiếu mượn
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM phieumuon WHERE mapm = ?',
                [mapm],
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

        res.status(200).json({ message: 'Loan slip deleted successfully' });

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

        console.error('Error deleting loan slip:', error);
        res.status(500).json({ message: 'Error deleting loan slip', error: error.message });
    }
});


router.put('/:mapm', async (req, res) => {
    const { mapm } = req.params;
    const { madocgia, masachList } = req.body;

    const sqlUpdateQuery = "UPDATE phieumuon SET madocgia = ? WHERE mapm = ?";
    const sqlDeleteRelations = "DELETE FROM phieumuon_sach WHERE maphieumuon = ?";
    const sqlInsertRelations = "INSERT INTO phieumuon_sach (maphieumuon, masach) VALUES (?, ?)";
    const sqlUpdateBookStatus = "UPDATE thongtinsach SET trangthai = 1 WHERE masach = ?"; // Cập nhật trạng thái sách
    const sqlResetBookStatus = "UPDATE thongtinsach SET trangthai = 0 WHERE masach = ?"; // Cập nhật trạng thái sách về 0

    try {
        // Kiểm tra xem mapm có tồn tại trong bảng phieumuon không
        const existingLoan = await new Promise((resolve, reject) => {
            db.query(
                'SELECT mapm FROM phieumuon WHERE mapm = ?',
                [mapm],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.length > 0);
                    }
                }
            );
        });

        const existingLoaninPayslip = await new Promise((resolve, reject) => {
            db.query(
                'SELECT maphieumuon FROM phieutra WHERE maphieumuon = ?',
                [mapm],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.length > 0);
                    }
                }
            );
        });

        if (!existingLoan) {
            return res.status(400).json({ message: 'Phiếu mượn không tồn tại' });
        }

        if (existingLoaninPayslip) {
            return res.status(400).json({ message: 'Đã tồn tại phiếu trả cho phiếu mượn này' });
        }

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

        // Cập nhật phiếu mượn
        await new Promise((resolve, reject) => {
            db.query(
                sqlUpdateQuery,
                [madocgia, mapm],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Lấy danh sách sách cũ trong phiếu mượn
        const oldBooks = await new Promise((resolve, reject) => {
            db.query(
                'SELECT masach FROM phieumuon_sach WHERE maphieumuon = ?',
                [mapm],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results.map(row => row.masach));
                    }
                }
            );
        });

        // Cập nhật trạng thái sách cũ về 0
        await Promise.all(oldBooks.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    sqlResetBookStatus,
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

        // Xóa các mối quan hệ sách cũ
        await new Promise((resolve, reject) => {
            db.query(
                sqlDeleteRelations,
                [mapm],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Thêm các mối quan hệ sách mới
        const insertRelations = masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    sqlInsertRelations,
                    [mapm, masach],
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

        // Cập nhật trạng thái của sách mới (đang được cho mượn)
        await Promise.all(masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    sqlUpdateBookStatus,
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

        res.status(200).json({ message: 'Phiếu mượn cập nhật thành công' });

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
        console.error('Error updating loan and relationships:', error);
        res.status(500).json({ message: 'Error updating loan and relationships', error: error.message });
    }
});
// method này dùng để lấy danh sách từ phiếu trả
router.get('/:maphieumuon/danhsachsach',  (req, res) => {
    try {
        const { maphieumuon } = req.params;
        const sqlQuery = `
            SELECT *
            FROM thongtinsach
            JOIN phieumuon_sach ON thongtinsach.masach = phieumuon_sach.masach
            WHERE phieumuon_sach.maphieumuon = ?;
        `;
        db.query(sqlQuery, [maphieumuon], (error, data) => {
            if (error) {
                console.error('Error querying the database:', error.message);  
                res.status(500).json({ success: false, message: 'Error when connect to database: ' + error.message });
            } else if (data.length === 0) {
                res.json({ message: 'khong co sach nao cho phieu muon nay' });
            } else {
                res.json({ message: 'success', data: data });
            }
        });
    } catch (error) {
        console.error('Unexpected error:', error.message);  
        res.status(500).json({ error: 'Không nạp được danh sách loai sach' });
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
router.get('/check/:madocgia', async (req, res) => {
    const { madocgia } = req.params;

    try {
        // Sử dụng await để chờ kết quả từ db.query
        const results = await new Promise((resolve, reject) => {
            db.query('SELECT * FROM phieumuon WHERE madocgia = ? AND trangthai = 0', [madocgia], (error, results) => {
                if (error) {
                    return reject(error);
                }
                resolve(results);
            });
        });

        if (results.length > 0) {
            // Có phiếu mượn chưa trả
            res.json(results); // Trả về danh sách phiếu mượn chưa trả
        } else {
            // Không có phiếu mượn chưa trả
            res.json([]); // Trả về danh sách rỗng
        }
    } catch (error) {
        console.error('Lỗi khi lấy phiếu mượn:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy phiếu mượn.' });
    }
});


module.exports =  router;


