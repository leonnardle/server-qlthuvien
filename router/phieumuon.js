const express =require('express');

const router = express.Router(); 
var db=require('../db');
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
router.post('/',async (req, res)  => {
    const {mapm,madocgia,ngaymuon,masachList} = req.body;

    var sqlQuery="INSERT INTO phieumuon(mapm,madocgia,ngaymuon) values(?,?,?)";
    try {
        // Bắt đầu transaction
        db.query('START TRANSACTION');

        // Thêm sách vào bảng thongtinsach
        await new Promise((resolve, reject) => {
            db.query(
                sqlQuery,
                [mapm,madocgia,ngaymuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // Thêm mối quan hệ sách-nxb vào bảng phieumuon_sach
        const insertRelations = masachList.map(masach =>
            new Promise((resolve, reject) => {
                db.query(
                    'INSERT INTO phieumuon_sach (maphieumuon, masach) VALUES (?, ?)',
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
   
        await Promise.all([insertRelations]);

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

        // Kiểm tra phiếu trả liên quan
        const checkReturnQuery = 'SELECT trangthai FROM phieutra WHERE maphieumuon = ?';
        const [returnResults] = await new Promise((resolve, reject) => {
            db.query(checkReturnQuery, [mapm], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([results]);
                }
            });
        });

        // Kiểm tra trạng thái của phiếu trả
        const hasIncompleteReturn = returnResults.some(record => record.trangthai === false);

        if (hasIncompleteReturn) {
            // Nếu có phiếu trả với trạng thái false, không cho phép xóa
            await new Promise((resolve, reject) => {
                db.query('ROLLBACK', (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            return res.status(400).json({ message: 'Cannot delete loan slip because there are incomplete return slips' });
        }

        // Xóa mối quan hệ sách
        await new Promise((resolve, reject) => {
            db.query(
                'DELETE FROM phieumuon_sach WHERE maphieumuon = ?',
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
        if(existingLoaninPayslip){
            return res.status(400).json({ message: 'đã tồn tại phiếu trả cho phiếu mượn này' });
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

module.exports=router;