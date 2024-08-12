const express =require('express');

const router = express.Router(); 
var db=require('../db');
router.route('/').get((req,res)=>{
    //nhan tham so
    var sqlQuery="select * from loaisach";
    db.query(sqlQuery,function(error,data){
        if(error){
            res.status(500).send(JSON.stringify({ success: false, message: 'error when connect to database: ' + error.message }));
        }else{
            res.json({message:"success",data})
        }
    });
});
router.post('/', (req, res) => {
    const {maloai, tenloai } = req.body;

    var sqlQuery="INSERT INTO loaisach(maloai,tenloai) values(?,?)";
    db.query(sqlQuery,[maloai,tenloai], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message,data });
        } else {
            res.json({ success: true, message: 'Success', data });
        }
    });
});
router.delete('/:maloai',(req,res)=>{
    const {maloai}=req.params;
    var CheckLoaisqlQuery="select * from sach_loaisach where maloai=?";
    var sqlQuery="delete from loaisach where maloai=?";

    db.query(CheckLoaisqlQuery,maloai,(error,data)=>{
        if(error){
            res.status(500).json({message:error.message});
        }
        if(data.length>0){
            return res.status(400).send({ success: false, message: 'không thể xóa vì có sách chứa mã loại này' });
        }
        else{
            db.query(sqlQuery,maloai,(error,data)=>{
                if(error){
                    res.status(500).json({message:error.message});
                }else if(data.affectedRows ===0){
                    res.status(404).json({ success: false, message: 'Không tìm thấy loại sách với mã loại này', data });
                }
                else{
                    res.json({message:"xoa thanh cong"})
                }
        
            });
        }

    });
  

});
router.put('/', (req, res) => {
    const {maloai,tenloai} = req.body;

    var sqlQuery="update loaisach set tenloai=? where maloai=?";
    db.query(sqlQuery,[tenloai,maloai], (error, data) => {
        if (error) {
            res.status(500).json({ success: false, message: error.message });
        }else if(data.affectedRows ===0){
            res.status(404).json({ success: false, message: 'Không tìm thấy loại sách với mã loại này', data });
        }
         else {
            res.json({ success: true, message: 'Success' });
        }
    });
});
module.exports=router;