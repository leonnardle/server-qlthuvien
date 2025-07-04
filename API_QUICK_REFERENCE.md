# API Quick Reference Guide

## Base URL
```
http://localhost:3000
```

## Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/register` | Register new user |
| POST | `/user/login` | User login |
| POST | `/user/forgot-password` | Request password reset |
| POST | `/user/change-password` | Change password |
| GET | `/user/reset-password/:token` | Reset password via token |
| GET | `/user/user-profile` | Get user profile |

## Book Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sach` | Get all books |
| POST | `/sach` | Create new book |
| PUT | `/sach/:masach` | Update book |
| DELETE | `/sach/:masach` | Delete book |
| GET | `/sach/:bookId` | Check book existence |
| GET | `/sach/:bookId/danhsachnxb` | Get book publishers |
| GET | `/sach/:bookId/danhsachloaisach` | Get book categories |
| GET | `/sach/:bookId/danhsachtacgia` | Get book authors |

## Reader Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docgia` | Get all readers |
| POST | `/docgia` | Add new reader |
| PUT | `/docgia/:madocgia` | Update reader |
| DELETE | `/docgia/:madocgia` | Delete reader |
| GET | `/docgia/:madocgia` | Get reader details |
| GET | `/docgia/laydanhsach/:madocgia` | Get reader loan history |

## Author Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tacgia` | Get all authors |
| POST | `/tacgia` | Add new author |
| PUT | `/tacgia/:matacgia` | Update author |
| DELETE | `/tacgia/:matacgia` | Delete author |

## Publisher Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/nhaxuatban` | Get all publishers |
| POST | `/nhaxuatban` | Add new publisher |
| PUT | `/nhaxuatban/:manxb` | Update publisher |
| DELETE | `/nhaxuatban/:manxb` | Delete publisher |
| GET | `/nhaxuatban/:manxb/sach` | Get publisher's books |

## Book Type Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/booktype` | Get all book types |
| POST | `/booktype` | Add new book type |
| PUT | `/booktype` | Update book type |
| DELETE | `/booktype/:maloai` | Delete book type |

## Loan Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phieumuon` | Get all loans |
| POST | `/phieumuon` | Create new loan |
| PUT | `/phieumuon/:mapm` | Update loan |
| DELETE | `/phieumuon/:mapm` | Delete loan |
| GET | `/phieumuon/:mapm` | Get loan details |
| GET | `/phieumuon/:maphieumuon/danhsachsach` | Get books in loan |
| GET | `/phieumuon/check/:madocgia` | Check reader's active loans |

## Return Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phieutra` | Get all returns |
| POST | `/phieutra` | Create return slip |
| PUT | `/phieutra/:mapt` | Update return slip |
| DELETE | `/phieutra/:mapt` | Delete return slip |
| GET | `/phieutra/:maphieutra/danhsachsachtra` | Get returned books |

## Pending Loan Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phieumuondangchoduyet` | Get pending requests |
| POST | `/phieumuondangchoduyet` | Create pending request |
| POST | `/phieumuondangchoduyet/duyet/:mapm` | Approve loan request |
| DELETE | `/phieumuondangchoduyet/:mapm` | Delete pending request |
| GET | `/phieumuondangchoduyet/count` | Count pending requests |

## Common Request Bodies

### User Registration
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "tendocgia": "John Doe",
  "sdt": "0123456789"
}
```

### User Login
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### Create Book
```json
{
  "tensach": "Book Title",
  "mota": "Book description",
  "hinhanh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "manxbList": ["NXB001"],
  "maloaiList": ["LOAI001"],
  "matacgiaList": ["TG001"]
}
```

### Create Loan
```json
{
  "madocgia": "DG0001",
  "ngaymuon": "2024-01-15",
  "masachList": ["SACH123456", "SACH789012"]
}
```

### Create Return
```json
{
  "maphieumuon": "PM12345678",
  "ngaytra": "2024-01-25",
  "ghichu": "Books returned in good condition",
  "masachList": ["SACH123456", "SACH789012"]
}
```

### Add Reader
```json
{
  "tendocgia": "Jane Smith",
  "email": "jane@example.com",
  "sdt": "0987654321"
}
```

### Add Author
```json
{
  "tentacgia": "Author Name",
  "quoctich": "Vietnam",
  "tieusu": "Author biography",
  "email": "author@example.com",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Add Publisher
```json
{
  "tennxb": "Publisher Name",
  "diachi": "123 Main Street",
  "sdt": "0123456789"
}
```

### Add Book Type
```json
{
  "maloai": "LOAI001",
  "tenloai": "Fiction"
}
```

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### List Response
```json
{
  "message": "success",
  "data": [
    { /* item 1 */ },
    { /* item 2 */ }
  ]
}
```

## HTTP Status Codes
- **200** - Success
- **400** - Bad Request (validation errors, business rule violations)
- **401** - Unauthorized (invalid credentials)
- **404** - Not Found (resource doesn't exist)
- **500** - Internal Server Error (database/server errors)

## Code Generation Patterns
- **Books**: `SACH` + 6 digits (e.g., `SACH123456`)
- **Loans**: `PM` + 8 digits (e.g., `PM12345678`)
- **Returns**: `PT` + 8 digits (e.g., `PT12345678`)
- **Readers**: `DG` + 4 digits (e.g., `DG1234`)

## Business Rules
1. **Email Uniqueness**: Emails must be unique across accounts and readers
2. **Book Availability**: Books must be available (trangthai = 0) before loan
3. **Loan Restrictions**: One pending request per reader
4. **Delete Restrictions**: Cannot delete books/readers with active loans
5. **Email Limits**: Maximum 3 reminder emails per loan
6. **Return Logic**: Books marked as returned when return slip created

## Database Status Values
- **Book Status**: 0 = Available, 1 = Borrowed
- **Loan Status**: 0 = Active, 1 = Returned
- **Return Status**: 0 = Partial Return, 1 = Complete Return

## Image Handling
- **Format**: Base64 encoded strings
- **Storage**: LONGBLOB in database
- **Prefix**: `data:image/[type];base64,`
- **Response**: Base64 string without prefix

## Common cURL Examples

### Login
```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get All Books
```bash
curl -X GET http://localhost:3000/sach
```

### Create Loan
```bash
curl -X POST http://localhost:3000/phieumuon \
  -H "Content-Type: application/json" \
  -d '{"madocgia":"DG0001","ngaymuon":"2024-01-15","masachList":["SACH123456"]}'
```

### Get Reader History
```bash
curl -X GET http://localhost:3000/docgia/laydanhsach/DG0001
```

## Environment Variables
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Database Connection
```javascript
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'qlthuvien',
    port: 3306
});
```

This quick reference provides all essential information for developers to quickly integrate with the Library Management System API.