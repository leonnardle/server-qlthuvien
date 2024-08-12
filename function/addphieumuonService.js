const db = require('../db');
const { randomCode } = require('../function/generationCode');

async function addPhieuMuon(madocgia, ngaymuon, masachList) {
    const mapm = randomCode('PM',8);
    const sqlQuery = "INSERT INTO phieumuon (mapm, madocgia, ngaymuon) VALUES (?, ?, ?)";

    await new Promise((resolve, reject) => {
        db.query('START TRANSACTION', (error) => {
            if (error) reject(error);
            else resolve();
        });
    });

    try {
        // Thêm phiếu mượn vào bảng phieumuon
        await new Promise((resolve, reject) => {
            db.query(
                sqlQuery,
                [mapm, madocgia, ngaymuon],
                (error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Cập nhật trạng thái sách
        const updateBookStatusQueries = masachList.map(masach =>
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
        );

        await Promise.all(updateBookStatusQueries);

        // Thêm vào bảng phieumuon_sach
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

        await Promise.all(insertRelations);

        await new Promise((resolve, reject) => {
            db.query('COMMIT', (error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    } catch (error) {
        // Nếu có lỗi xảy ra, rollback
        await new Promise((resolve, reject) => {
            db.query('ROLLBACK', (rollbackError) => {
                if (rollbackError) reject(rollbackError);
                else resolve();
            });
        });
        throw error; // Ném lại lỗi để xử lý bên ngoài
    }
}

module.exports = { addPhieuMuon };
