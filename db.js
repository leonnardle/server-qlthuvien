const express=require('express');

const mysql=require('mysql');
const connection=mysql.createConnection({

    host            :'localhost',
    user            :'root',
    password        :'',
    database        :"qlthuvien",
    debugger        :false,
    port            :3306
});
connection.connect(function(error){
    if(error){
        throw error;
    }else{
        console.log("db connected");
    }
});

module.exports=connection;
