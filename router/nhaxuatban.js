const express =require('express');

const router = express.Router(); 
var db=require('../db');
router.route('/:manxb/sach').get((req, res) => {
    const manxb = req.params.manxb;
  
    const sqlQuery = `
      SELECT masach, tensach, matg, manxb, maloai, mota, hinhanh, soluong
      FROM thongtinsach
      WHERE manxb = ?
    `;
  
    db.query(sqlQuery, [manxb], (error, data) => {
      if (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi kết nối với cơ sở dữ liệu: ' + error.message });
      } 
  
      if (data.length === 0) {
        return res.status(404).json({ success: false, message: 'Không có sách nào được phát hành từ nhà xuất bản này' });
      }
  
      const results = data.map(row => ({
        masach: row.masach,
        tensach: row.tensach,
        matg: row.matg,
        manxb: row.manxb,
        maloai: row.maloai,
        mota: row.mota,
        // Chuyển đổi hình ảnh sang base64
        hinhanh: row.hinhanh ? row.hinhanh.toString('base64') : null,
        soluong: row.soluong,
      }));
  
      res.json({ success: true, message: 'Thành công', data: results });
    });
  });
  
  

router.route('/').get((req,res)=>{
    //nhan tham so
    var sqlQuery="select * from nhaxuatban";
    db.query(sqlQuery,function(error,data){
        if(error){
            res.status(500).send(JSON.stringify({ success: false, message: 'error when connect to database: ' + error.message }));
        }else{
            res.json({message:"success",data})
        }
    });
});
router.post('/', (req, res) => {
    const { tennxb,diachi,sdt } = req.body;

    var sqlQuery="INSERT INTO nhaxuatban( tennxb,diachi,sdt ) values(?,?,?)";
    db.query(sqlQuery,[ tennxb,diachi,sdt ], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message,data });
        } else {
            res.json({ success: true, message: 'Success', data });
        }
    });
});
router.delete('/:manxb',(req,res)=>{
    const {manxb}=req.params;
    var sqlQuery="delete from nhaxuatban where manxb=?";
    db.query(sqlQuery,manxb,(error,data)=>{
        if(error){
            res.status(500).json({message:error.message});
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy nhà xb nào với mã này', data });
        }
        else{
            res.json({message:"xoa thanh cong"})
        }

    });

});
router.put('/:manxb', (req, res) => {
    const { manxb } = req.params;
    const {tennxb,diachi,sdt} = req.body;

    var sqlQuery="update nhaxuatban set tennxb=?,diachi=?,sdt=? where manxb=?";
    db.query(sqlQuery,[ tennxb,diachi,sdt,manxb], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message });
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy nhà xb nào với mã này', data });
        }
         else {
            res.json({ success: true, message: 'Success' });
        }
    });
});

module.exports=router;