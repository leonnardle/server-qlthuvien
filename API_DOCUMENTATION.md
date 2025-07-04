# Library Management System API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Setup and Configuration](#setup-and-configuration)
3. [Authentication APIs](#authentication-apis)
4. [Book Management APIs](#book-management-apis)
5. [Reader Management APIs](#reader-management-apis)
6. [Author Management APIs](#author-management-apis)
7. [Publisher Management APIs](#publisher-management-apis)
8. [Book Type Management APIs](#book-type-management-apis)
9. [Loan Management APIs](#loan-management-apis)
10. [Return Management APIs](#return-management-apis)
11. [Pending Loan Request APIs](#pending-loan-request-apis)
12. [Email Service](#email-service)
13. [Utility Functions](#utility-functions)
14. [Database Schema](#database-schema)
15. [Error Handling](#error-handling)

## Overview

The Library Management System is a REST API built with Node.js and Express.js that provides comprehensive functionality for managing library operations including books, readers, loans, returns, and administrative functions.

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: bcrypt for password hashing
- **Email**: Nodemailer
- **Scheduling**: node-cron
- **Other**: CORS, Morgan, Body-parser

### Base URL
```
http://localhost:3000
```

## Setup and Configuration

### Installation
```bash
npm install
```

### Dependencies
```json
{
  "bcrypt": "^5.1.1",
  "body-parser": "^1.20.2",
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.19.2",
  "morgan": "^1.10.0",
  "mysql": "^2.18.1",
  "node-cron": "^3.0.3",
  "nodemailer": "^6.9.14"
}
```

### Environment Variables
Create a `sendemail.env` file:
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Database Configuration
Update `db.js` with your MySQL credentials:
```javascript
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'qlthuvien',
    port: 3306
});
```

### Starting the Server
```bash
node index.js
```
Server will start on port 3000.

## Authentication APIs

### Base Route: `/user`

#### 1. User Registration
**Endpoint**: `POST /user/register`

**Description**: Register a new user account and create associated reader profile.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "tendocgia": "John Doe",
  "sdt": "0123456789"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Đăng ký thành công"
}
```

**Example Usage**:
```javascript
const response = await fetch('http://localhost:3000/user/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: "john.doe@example.com",
    password: "mySecurePassword",
    tendocgia: "John Doe",
    sdt: "0123456789"
  })
});
```

#### 2. User Login
**Endpoint**: `POST /user/login`

**Description**: Authenticate user and return user data with reader information.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "reader": {
      "madocgia": "DG0001",
      "tendocgia": "John Doe",
      "email": "user@example.com",
      "sdt": "0123456789"
    }
  }
}
```

#### 3. Password Reset Request
**Endpoint**: `POST /user/forgot-password`

**Description**: Request password reset via email.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Password reset email sent"
}
```

#### 4. Change Password
**Endpoint**: `POST /user/change-password`

**Description**: Change user password with old password verification.

**Request Body**:
```json
{
  "email": "user@example.com",
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### 5. Reset Password via Token
**Endpoint**: `GET /user/reset-password/:token`

**Description**: Reset password using token from email (generates new random password).

**Parameters**:
- `token` (string): Reset token from email

**Response**: HTML message or new password sent to email

## Book Management APIs

### Base Route: `/sach`

#### 1. Get All Books
**Endpoint**: `GET /sach`

**Description**: Retrieve all books with base64 encoded images.

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "masach": "SACH123456",
      "tensach": "Example Book",
      "mota": "Book description",
      "trangthai": 0,
      "hinhanh": "base64_encoded_image_string"
    }
  ]
}
```

#### 2. Create New Book
**Endpoint**: `POST /sach`

**Description**: Create a new book with relationships to authors, publishers, and book types.

**Request Body**:
```json
{
  "tensach": "New Book Title",
  "mota": "Book description",
  "hinhanh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "manxbList": ["NXB001", "NXB002"],
  "maloaiList": ["LOAI001"],
  "matacgiaList": ["TG001", "TG002"]
}
```

**Response**:
```json
{
  "message": "Book added successfully"
}
```

**Example Usage**:
```javascript
const bookData = {
  tensach: "JavaScript Programming",
  mota: "Comprehensive guide to JavaScript",
  hinhanh: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  manxbList: ["NXB001"],
  maloaiList: ["LOAI001"],
  matacgiaList: ["TG001"]
};

const response = await fetch('http://localhost:3000/sach', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(bookData)
});
```

#### 3. Update Book
**Endpoint**: `PUT /sach/:masach`

**Description**: Update book information and relationships.

**Parameters**:
- `masach` (string): Book ID

**Request Body**: Same as create book

**Response**:
```json
{
  "message": "Book updated successfully"
}
```

#### 4. Delete Book
**Endpoint**: `DELETE /sach/:masach`

**Description**: Delete a book (only if not in any active loans).

**Parameters**:
- `masach` (string): Book ID

**Response**:
```json
{
  "message": "Xóa thành công"
}
```

#### 5. Get Book Details
**Endpoint**: `GET /sach/:bookId`

**Description**: Check if a book exists.

**Parameters**:
- `bookId` (string): Book ID

**Response**:
```json
{
  "success": true
}
```

#### 6. Get Book Publishers
**Endpoint**: `GET /sach/:bookId/danhsachnxb`

**Description**: Get list of publishers for a specific book.

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "manxb": "NXB001",
      "tennxb": "Publisher Name",
      "diachi": "Address",
      "sdt": "Phone"
    }
  ]
}
```

#### 7. Get Book Categories
**Endpoint**: `GET /sach/:bookId/danhsachloaisach`

**Description**: Get list of categories for a specific book.

#### 8. Get Book Authors
**Endpoint**: `GET /sach/:bookId/danhsachtacgia`

**Description**: Get list of authors for a specific book.

## Reader Management APIs

### Base Route: `/docgia`

#### 1. Get All Readers
**Endpoint**: `GET /docgia`

**Description**: Retrieve all readers in the system.

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "madocgia": "DG0001",
      "tendocgia": "John Doe",
      "email": "john@example.com",
      "sdt": "0123456789"
    }
  ]
}
```

#### 2. Add New Reader
**Endpoint**: `POST /docgia`

**Description**: Add a new reader to the system.

**Request Body**:
```json
{
  "tendocgia": "Jane Smith",
  "email": "jane@example.com",
  "sdt": "0987654321"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Success",
  "data": { "insertId": 123 }
}
```

#### 3. Update Reader
**Endpoint**: `PUT /docgia/:madocgia`

**Description**: Update reader information.

**Parameters**:
- `madocgia` (string): Reader ID

**Request Body**:
```json
{
  "tendocgia": "Updated Name",
  "email": "updated@example.com",
  "sdt": "0111111111"
}
```

#### 4. Delete Reader
**Endpoint**: `DELETE /docgia/:madocgia`

**Description**: Delete a reader from the system.

**Parameters**:
- `madocgia` (string): Reader ID

#### 5. Get Reader Details
**Endpoint**: `GET /docgia/:madocgia`

**Description**: Get specific reader information.

#### 6. Get Reader Loan History
**Endpoint**: `GET /docgia/laydanhsach/:madocgia`

**Description**: Get detailed loan and return history for a reader.

**Response**:
```json
{
  "success": true,
  "reader": {
    "madocgia": "DG0001",
    "tendocgia": "John Doe",
    "email": "john@example.com",
    "sdt": "0123456789"
  },
  "borrowRecords": [
    {
      "mapm": "PM12345678",
      "ngaymuon": "2024-01-15",
      "status": "Chưa trả",
      "ngaytra": null,
      "missingBooks": ["SACH123456"]
    }
  ]
}
```

## Author Management APIs

### Base Route: `/tacgia`

#### 1. Get All Authors
**Endpoint**: `GET /tacgia`

**Description**: Retrieve all authors with base64 encoded images.

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "matacgia": "TG001",
      "tentacgia": "Author Name",
      "quoctich": "Vietnam",
      "tieusu": "Author biography",
      "email": "author@example.com",
      "image": "base64_encoded_image_string"
    }
  ]
}
```

#### 2. Add New Author
**Endpoint**: `POST /tacgia`

**Description**: Add a new author with image.

**Request Body**:
```json
{
  "tentacgia": "New Author",
  "quoctich": "Vietnam",
  "tieusu": "Author biography",
  "email": "newauthor@example.com",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### 3. Update Author
**Endpoint**: `PUT /tacgia/:matacgia`

**Description**: Update author information.

#### 4. Delete Author
**Endpoint**: `DELETE /tacgia/:matacgia`

**Description**: Delete an author.

## Publisher Management APIs

### Base Route: `/nhaxuatban`

#### 1. Get All Publishers
**Endpoint**: `GET /nhaxuatban`

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "manxb": "NXB001",
      "tennxb": "Publisher Name",
      "diachi": "Address",
      "sdt": "Phone Number"
    }
  ]
}
```

#### 2. Add New Publisher
**Endpoint**: `POST /nhaxuatban`

**Request Body**:
```json
{
  "tennxb": "New Publisher",
  "diachi": "123 Main Street",
  "sdt": "0123456789"
}
```

#### 3. Update Publisher
**Endpoint**: `PUT /nhaxuatban/:manxb`

#### 4. Delete Publisher
**Endpoint**: `DELETE /nhaxuatban/:manxb`

#### 5. Get Publisher's Books
**Endpoint**: `GET /nhaxuatban/:manxb/sach`

**Description**: Get all books published by a specific publisher.

## Book Type Management APIs

### Base Route: `/booktype` (mapped to `/loaisach`)

#### 1. Get All Book Types
**Endpoint**: `GET /booktype`

#### 2. Add New Book Type
**Endpoint**: `POST /booktype`

**Request Body**:
```json
{
  "maloai": "LOAI001",
  "tenloai": "Fiction"
}
```

#### 3. Update Book Type
**Endpoint**: `PUT /booktype`

#### 4. Delete Book Type
**Endpoint**: `DELETE /booktype/:maloai`

## Loan Management APIs

### Base Route: `/phieumuon`

#### 1. Get All Loans
**Endpoint**: `GET /phieumuon`

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "mapm": "PM12345678",
      "madocgia": "DG0001",
      "ngaymuon": "2024-01-15",
      "trangthai": 0
    }
  ]
}
```

#### 2. Create New Loan
**Endpoint**: `POST /phieumuon`

**Description**: Create a new loan slip with multiple books.

**Request Body**:
```json
{
  "madocgia": "DG0001",
  "ngaymuon": "2024-01-15",
  "masachList": ["SACH123456", "SACH789012"]
}
```

**Response**:
```json
{
  "message": "Borrowing successfully created"
}
```

**Example Usage**:
```javascript
const loanData = {
  madocgia: "DG0001",
  ngaymuon: "2024-01-15",
  masachList: ["SACH123456", "SACH789012"]
};

const response = await fetch('http://localhost:3000/phieumuon', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(loanData)
});
```

#### 3. Update Loan
**Endpoint**: `PUT /phieumuon/:mapm`

**Description**: Update loan information and book list.

#### 4. Delete Loan
**Endpoint**: `DELETE /phieumuon/:mapm`

**Description**: Delete a loan slip and restore book availability.

#### 5. Get Loan Details
**Endpoint**: `GET /phieumuon/:mapm`

#### 6. Get Books in Loan
**Endpoint**: `GET /phieumuon/:maphieumuon/danhsachsach`

**Description**: Get list of books in a specific loan.

#### 7. Check Reader's Active Loans
**Endpoint**: `GET /phieumuon/check/:madocgia`

**Description**: Check if reader has any unreturned loans.

**Response**:
```json
[
  {
    "mapm": "PM12345678",
    "madocgia": "DG0001",
    "ngaymuon": "2024-01-15",
    "trangthai": 0
  }
]
```

## Return Management APIs

### Base Route: `/phieutra`

#### 1. Get All Returns
**Endpoint**: `GET /phieutra`

#### 2. Create Return Slip
**Endpoint**: `POST /phieutra`

**Description**: Create a return slip for borrowed books.

**Request Body**:
```json
{
  "maphieumuon": "PM12345678",
  "ngaytra": "2024-01-25",
  "ghichu": "All books returned in good condition",
  "masachList": ["SACH123456", "SACH789012"]
}
```

**Response**:
```json
{
  "message": "Thêm phiếu trả thành công"
}
```

#### 3. Update Return Slip
**Endpoint**: `PUT /phieutra/:mapt`

#### 4. Delete Return Slip
**Endpoint**: `DELETE /phieutra/:mapt`

#### 5. Get Returned Books
**Endpoint**: `GET /phieutra/:maphieutra/danhsachsachtra`

**Description**: Get list of books in a specific return slip.

## Pending Loan Request APIs

### Base Route: `/phieumuondangchoduyet`

#### 1. Get All Pending Requests
**Endpoint**: `GET /phieumuondangchoduyet`

**Response**:
```json
{
  "message": "success",
  "data": [
    {
      "mapm": "PM12345678",
      "madocgia": "DG0001",
      "ngaymuon": "2024-01-15",
      "masachList": ["SACH123456", "SACH789012"]
    }
  ]
}
```

#### 2. Create Pending Request
**Endpoint**: `POST /phieumuondangchoduyet`

**Description**: Submit a loan request for approval.

**Request Body**:
```json
{
  "madocgia": "DG0001",
  "ngaymuon": "2024-01-15",
  "masachList": ["SACH123456"]
}
```

#### 3. Approve Loan Request
**Endpoint**: `POST /phieumuondangchoduyet/duyet/:mapm`

**Description**: Approve a pending loan request and convert it to active loan.

**Parameters**:
- `mapm` (string): Pending loan ID

**Response**:
```json
{
  "message": "Borrowing request approved and added to loan slips"
}
```

#### 4. Delete Pending Request
**Endpoint**: `DELETE /phieumuondangchoduyet/:mapm`

#### 5. Count Pending Requests
**Endpoint**: `GET /phieumuondangchoduyet/count`

**Response**:
```json
{
  "message": "success",
  "count": 5
}
```

## Email Service

### Email Functions

The system includes automated email functionality for:

#### 1. Password Reset Emails
**Function**: `sendPasswordResetEmail(to, token)`

**Description**: Sends password reset link to user's email.

**Parameters**:
- `to` (string): Recipient email
- `token` (string): Reset token

#### 2. New Password Emails
**Function**: `sendNewPasswordEmail(to, newPassword)`

**Description**: Sends new password to user's email.

#### 3. Overdue Book Reminders
**Function**: `sendReminderEmail(to, tenDocGia, ngayMuon, maPhieuMuon, soLanGui)`

**Description**: Sends reminder emails for overdue books.

**Scheduling**: Runs automatically via cron job every first day of the month.

### Cron Job Configuration
```javascript
// Sends overdue reminders on the 1st of every month
cron.schedule(' * * 1 * *', () => {
    checkOverdueBooks();
});
```

## Utility Functions

### Code Generation

#### Random Code Generator
**File**: `function/generationCode.js`

**Function**: `randomCode(prefix, length)`

**Description**: Generates random codes with specified prefix and length.

**Parameters**:
- `prefix` (string): Code prefix (e.g., "PM", "SACH", "DG")
- `length` (number): Number of random digits to append

**Example Usage**:
```javascript
const { randomCode } = require('./function/generationCode');

// Generate book ID
const bookId = randomCode('SACH', 6); // Returns: "SACH123456"

// Generate loan ID  
const loanId = randomCode('PM', 8); // Returns: "PM12345678"

// Generate reader ID
const readerId = randomCode('DG', 4); // Returns: "DG1234"
```

### Loan Service Functions

#### Add Loan Function
**File**: `function/addphieumuonService.js`

**Function**: `addPhieuMuon(madocgia, ngaymuon, masachList)`

**Description**: Creates a new loan with database transactions.

**Parameters**:
- `madocgia` (string): Reader ID
- `ngaymuon` (string): Loan date
- `masachList` (array): List of book IDs

**Features**:
- Transaction management
- Book status updates
- Relationship management

## Database Schema

### Core Tables

#### taikhoan (Accounts)
```sql
- id (Primary Key)
- email (Unique)
- password (Hashed)
- resetPasswordToken
- resetPasswordExpires
```

#### docgia (Readers)
```sql
- madocgia (Primary Key, Auto-increment)
- tendocgia (Reader Name)
- email (Unique)
- sdt (Phone Number)
```

#### thongtinsach (Books)
```sql
- masach (Primary Key)
- tensach (Book Title)
- mota (Description)
- hinhanh (LONGBLOB - Image)
- trangthai (Status: 0=Available, 1=Borrowed)
```

#### tacgia (Authors)
```sql
- matacgia (Primary Key, Auto-increment)
- tentacgia (Author Name)
- quoctich (Nationality)
- tieusu (Biography)
- email
- image (LONGBLOB)
```

#### nhaxuatban (Publishers)
```sql
- manxb (Primary Key, Auto-increment)
- tennxb (Publisher Name)
- diachi (Address)
- sdt (Phone)
```

#### loaisach (Book Types)
```sql
- maloai (Primary Key)
- tenloai (Type Name)
```

#### phieumuon (Loan Slips)
```sql
- mapm (Primary Key)
- madocgia (Foreign Key)
- ngaymuon (Loan Date)
- trangthai (Status: 0=Active, 1=Returned)
- soguilan (Email Count)
```

#### phieutra (Return Slips)
```sql
- mapt (Primary Key)
- maphieumuon (Foreign Key)
- ngaytra (Return Date)
- trangthai (Status)
- ghichu (Notes)
```

### Relationship Tables

#### sach_tacgia (Book-Author)
#### sach_nhaxuatban (Book-Publisher) 
#### sach_loaisach (Book-Type)
#### phieumuon_sach (Loan-Book)
#### phieutra_sach (Return-Book)
#### phieumuondangchoduyet (Pending Loans)
#### phieumuondangchoduyet_sach (Pending Loan-Book)

## Error Handling

### Standard Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request parameters"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Database error: [error details]"
}
```

### Transaction Management

All critical operations use database transactions:

```javascript
// Start transaction
await new Promise((resolve, reject) => {
    db.query('START TRANSACTION', (error) => {
        if (error) reject(error);
        else resolve();
    });
});

try {
    // Perform operations
    await operationOne();
    await operationTwo();
    
    // Commit transaction
    await new Promise((resolve, reject) => {
        db.query('COMMIT', (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
} catch (error) {
    // Rollback on error
    await new Promise((resolve, reject) => {
        db.query('ROLLBACK', (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
    throw error;
}
```

## Security Features

1. **Password Hashing**: Uses bcrypt with salt rounds
2. **SQL Injection Prevention**: Parameterized queries
3. **CORS**: Cross-origin resource sharing enabled
4. **Input Validation**: Server-side validation
5. **Transaction Safety**: Database consistency

## Rate Limiting and Business Rules

1. **Email Reminders**: Maximum 3 reminder emails per loan
2. **Book Availability**: Books must be available before loan approval
3. **Unique Constraints**: Email uniqueness across accounts and readers
4. **Loan Restrictions**: One pending request per reader
5. **Delete Restrictions**: Cannot delete books/readers with active loans

This documentation provides comprehensive coverage of all public APIs, functions, and components in the Library Management System with practical examples and usage instructions.