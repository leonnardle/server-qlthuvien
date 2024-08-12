const express = require("express");
const morgan = require('morgan');
const cors = require('cors');

// Routers
const userRouter = require('./user');
const booktypeRouter = require('./router/loaisach');
const authorRouter = require('./router/tacgia');
const publisherRouter = require('./router/nhaxuatban');
const bookRouter = require('./router/sach');
const readerRouter = require('./router/docgia');
const loanRouter = require('./router/phieumuon');
const payRouter = require('./router/phieutra');
const fakeloanRouter = require('./router/phieumuondangchoduyet');

const app = express();

app.use(cors()); 
app.use(express.json({ limit: '500mb' }));  // Cấu hình giới hạn kích thước cho JSON requests
app.use(express.urlencoded({ limit: '500mb', extended: true }));  // Cấu hình giới hạn kích thước cho URL-encoded requests
app.use(morgan('dev'));

// Use routers
app.use('/user', userRouter);
app.use('/booktype', booktypeRouter);
app.use('/tacgia', authorRouter);
app.use('/nhaxuatban', publisherRouter);
app.use('/sach', bookRouter);
app.use('/docgia', readerRouter);
app.use('/phieumuon', loanRouter);
app.use('/phieutra', payRouter);
app.use('/phieumuondangchoduyet', fakeloanRouter);

app.listen(3000, () => {
    console.log("Connected to server at port 3000");
});
