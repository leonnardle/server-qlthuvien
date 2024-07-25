const express =require('express');

const router = express.Router(); 
var db=require('../db');
router.route('/').get((req,res)=>{
    //nhan tham so
    var sqlQuery="select * from docgia";
    db.query(sqlQuery,function(error,data){
        if(error){
            res.status(500).send(JSON.stringify({ success: false, message: 'error when connect to database: ' + error.message }));
        }else{
            res.json({message:"success",data})
        }
    });
});
router.post('/', (req, res) => {
    const {madocgia,tendocgia,email,sdt} = req.body;

    var sqlQuery="INSERT INTO docgia(madocgia,tendocgia,email,sdt) values(?,?,?,?)";
    db.query(sqlQuery,[madocgia,tendocgia,email,sdt], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message,data });
        } else {
            res.json({ success: true, message: 'Success', data });
        }
    });
});
router.delete('/:madocgia',(req,res)=>{
    const {madocgia}=req.params;
    var sqlQuery="delete from docgia where madocgia=?";
    db.query(sqlQuery,madocgia,(error,data)=>{
        if(error){
            res.status(500).json({message:error.message});
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy doc gia nao với mã này', data });
        }
        else{
            res.json({message:"xoa thanh cong"})
        }

    });

});
router.put('/:madocgia', (req, res) => {
    const {madocgia}=req.params;
    const {tendocgia,email,sdt} = req.body;

    var sqlQuery="update docgia set tendocgia=?,email=?,sdt=? where madocgia=?";
    db.query(sqlQuery,[tendocgia,email,sdt,madocgia], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message });
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy doc gia nao với mã  này', data });
        }
         else {
            res.json({ success: true, message: 'Success' });
        }
    });
});
// kiem tra doc gia nay co ton tại hay không khi thêm sách
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

module.exports=router;