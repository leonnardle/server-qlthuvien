# Testing Guide and Additional Examples

## Table of Contents
1. [Testing with Postman](#testing-with-postman)
2. [Complete Workflow Examples](#complete-workflow-examples)
3. [Frontend Integration Examples](#frontend-integration-examples)
4. [Common Use Cases](#common-use-cases)
5. [Troubleshooting](#troubleshooting)
6. [Performance Considerations](#performance-considerations)
7. [Deployment Guide](#deployment-guide)

## Testing with Postman

### Environment Setup
Create a Postman environment with:
```json
{
  "baseUrl": "http://localhost:3000",
  "userEmail": "test@example.com",
  "userPassword": "testPassword123"
}
```

### Collection Structure
```
Library Management API/
├── Authentication/
│   ├── Register User
│   ├── Login User
│   ├── Forgot Password
│   ├── Change Password
│   └── Reset Password
├── Books/
│   ├── Get All Books
│   ├── Create Book
│   ├── Update Book
│   ├── Delete Book
│   └── Get Book Details
├── Readers/
│   ├── Get All Readers
│   ├── Add Reader
│   ├── Update Reader
│   ├── Delete Reader
│   └── Get Reader History
├── Loans/
│   ├── Create Loan
│   ├── Get All Loans
│   ├── Update Loan
│   ├── Delete Loan
│   └── Check Reader Loans
└── Returns/
    ├── Create Return
    ├── Get All Returns
    ├── Update Return
    └── Delete Return
```

### Sample Postman Tests

#### Test Login Endpoint
```javascript
// Pre-request Script
pm.environment.set("timestamp", Date.now());

// Test Script
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData.success).to.be.true;
});

pm.test("Response contains user data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
    pm.expect(jsonData.data).to.have.property('email');
});
```

#### Test Book Creation
```javascript
// Test Script
pm.test("Book created successfully", function () {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.eql("Book added successfully");
});
```

## Complete Workflow Examples

### 1. Complete User Registration and Book Borrowing Workflow

```javascript
// 1. Register new user
async function registerUser() {
    const response = await fetch('http://localhost:3000/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: "newuser@example.com",
            password: "securePassword123",
            tendocgia: "New User",
            sdt: "0123456789"
        })
    });
    return response.json();
}

// 2. Login user
async function loginUser() {
    const response = await fetch('http://localhost:3000/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: "newuser@example.com",
            password: "securePassword123"
        })
    });
    const data = await response.json();
    return data.data.reader.madocgia; // Get reader ID
}

// 3. Create a book
async function createBook() {
    const response = await fetch('http://localhost:3000/sach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tensach: "Test Book",
            mota: "A test book for borrowing",
            hinhanh: null,
            manxbList: ["1"],
            maloaiList: ["1"],
            matacgiaList: ["1"]
        })
    });
    return response.json();
}

// 4. Get book list to find book ID
async function getBooks() {
    const response = await fetch('http://localhost:3000/sach');
    const data = await response.json();
    return data.data[0].masach; // Get first book ID
}

// 5. Create loan request
async function createLoanRequest(readerId, bookId) {
    const response = await fetch('http://localhost:3000/phieumuondangchoduyet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            madocgia: readerId,
            ngaymuon: new Date().toISOString().split('T')[0],
            masachList: [bookId]
        })
    });
    return response.json();
}

// 6. Approve loan request
async function approveLoan(loanId) {
    const response = await fetch(`http://localhost:3000/phieumuondangchoduyet/duyet/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
}

// Complete workflow
async function completeWorkflow() {
    try {
        console.log("1. Registering user...");
        await registerUser();
        
        console.log("2. Logging in user...");
        const readerId = await loginUser();
        
        console.log("3. Creating book...");
        await createBook();
        
        console.log("4. Getting book list...");
        const bookId = await getBooks();
        
        console.log("5. Creating loan request...");
        await createLoanRequest(readerId, bookId);
        
        console.log("Workflow completed successfully!");
    } catch (error) {
        console.error("Workflow failed:", error);
    }
}
```

### 2. Book Return Workflow

```javascript
async function returnBook(loanId, bookIds) {
    // 1. Get loan details
    const loanResponse = await fetch(`http://localhost:3000/phieumuon/${loanId}`);
    const loanData = await loanResponse.json();
    
    // 2. Create return slip
    const returnResponse = await fetch('http://localhost:3000/phieutra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            maphieumuon: loanId,
            ngaytra: new Date().toISOString().split('T')[0],
            ghichu: "Books returned in good condition",
            masachList: bookIds
        })
    });
    
    return returnResponse.json();
}
```

## Frontend Integration Examples

### React Integration

```jsx
// BookService.js
class BookService {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
    }

    async getAllBooks() {
        try {
            const response = await fetch(`${this.baseUrl}/sach`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching books:', error);
            throw error;
        }
    }

    async createBook(bookData) {
        try {
            const response = await fetch(`${this.baseUrl}/sach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating book:', error);
            throw error;
        }
    }
}

// BookList.jsx
import React, { useState, useEffect } from 'react';

const BookList = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const bookService = new BookService();

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            const bookData = await bookService.getAllBooks();
            setBooks(bookData);
        } catch (error) {
            console.error('Failed to load books:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading books...</div>;

    return (
        <div>
            <h2>Library Books</h2>
            <div className="book-grid">
                {books.map(book => (
                    <div key={book.masach} className="book-card">
                        <h3>{book.tensach}</h3>
                        <p>{book.mota}</p>
                        {book.hinhanh && (
                            <img 
                                src={`data:image/jpeg;base64,${book.hinhanh}`} 
                                alt={book.tensach}
                                style={{ maxWidth: '200px', height: 'auto' }}
                            />
                        )}
                        <p>Status: {book.trangthai === 0 ? 'Available' : 'Borrowed'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### Vue.js Integration

```vue
<template>
  <div class="reader-management">
    <h2>Reader Management</h2>
    
    <!-- Add Reader Form -->
    <form @submit.prevent="addReader" class="add-reader-form">
      <input v-model="newReader.tendocgia" placeholder="Reader Name" required>
      <input v-model="newReader.email" type="email" placeholder="Email" required>
      <input v-model="newReader.sdt" placeholder="Phone Number" required>
      <button type="submit">Add Reader</button>
    </form>

    <!-- Readers List -->
    <div class="readers-list">
      <div v-for="reader in readers" :key="reader.madocgia" class="reader-card">
        <h3>{{ reader.tendocgia }}</h3>
        <p>Email: {{ reader.email }}</p>
        <p>Phone: {{ reader.sdt }}</p>
        <button @click="viewReaderHistory(reader.madocgia)">View History</button>
        <button @click="deleteReader(reader.madocgia)">Delete</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReaderManagement',
  data() {
    return {
      readers: [],
      newReader: {
        tendocgia: '',
        email: '',
        sdt: ''
      }
    }
  },
  
  mounted() {
    this.loadReaders();
  },
  
  methods: {
    async loadReaders() {
      try {
        const response = await fetch('http://localhost:3000/docgia');
        const data = await response.json();
        this.readers = data.data;
      } catch (error) {
        console.error('Error loading readers:', error);
      }
    },
    
    async addReader() {
      try {
        const response = await fetch('http://localhost:3000/docgia', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.newReader)
        });
        
        if (response.ok) {
          this.newReader = { tendocgia: '', email: '', sdt: '' };
          this.loadReaders();
        }
      } catch (error) {
        console.error('Error adding reader:', error);
      }
    },
    
    async viewReaderHistory(readerId) {
      try {
        const response = await fetch(`http://localhost:3000/docgia/laydanhsach/${readerId}`);
        const data = await response.json();
        console.log('Reader history:', data);
        // Handle history display
      } catch (error) {
        console.error('Error fetching reader history:', error);
      }
    },
    
    async deleteReader(readerId) {
      if (confirm('Are you sure you want to delete this reader?')) {
        try {
          const response = await fetch(`http://localhost:3000/docgia/${readerId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            this.loadReaders();
          }
        } catch (error) {
          console.error('Error deleting reader:', error);
        }
      }
    }
  }
}
</script>
```

## Common Use Cases

### 1. Library Admin Dashboard

```javascript
class LibraryDashboard {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async getDashboardData() {
        const [books, readers, loans, pendingRequests] = await Promise.all([
            this.getBooks(),
            this.getReaders(),
            this.getLoans(),
            this.getPendingRequests()
        ]);

        return {
            totalBooks: books.length,
            availableBooks: books.filter(book => book.trangthai === 0).length,
            totalReaders: readers.length,
            activeLoans: loans.filter(loan => loan.trangthai === 0).length,
            pendingRequests: pendingRequests.count || 0
        };
    }

    async getBooks() {
        const response = await fetch(`${this.baseUrl}/sach`);
        const data = await response.json();
        return data.data;
    }

    async getReaders() {
        const response = await fetch(`${this.baseUrl}/docgia`);
        const data = await response.json();
        return data.data;
    }

    async getLoans() {
        const response = await fetch(`${this.baseUrl}/phieumuon`);
        const data = await response.json();
        return data.data;
    }

    async getPendingRequests() {
        const response = await fetch(`${this.baseUrl}/phieumuondangchoduyet/count`);
        return await response.json();
    }
}
```

### 2. Book Search and Filter

```javascript
class BookSearch {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async searchBooks(filters = {}) {
        const books = await this.getAllBooks();
        
        return books.filter(book => {
            if (filters.title && !book.tensach.toLowerCase().includes(filters.title.toLowerCase())) {
                return false;
            }
            
            if (filters.available !== undefined && book.trangthai !== (filters.available ? 0 : 1)) {
                return false;
            }
            
            return true;
        });
    }

    async getAllBooks() {
        const response = await fetch(`${this.baseUrl}/sach`);
        const data = await response.json();
        return data.data;
    }

    async getBooksByAuthor(authorId) {
        const response = await fetch(`${this.baseUrl}/sach`);
        const data = await response.json();
        const books = data.data;
        
        // Filter books by author (would need to check author relationships)
        const booksWithAuthor = [];
        for (const book of books) {
            const authorResponse = await fetch(`${this.baseUrl}/sach/${book.masach}/danhsachtacgia`);
            const authorData = await authorResponse.json();
            
            if (authorData.data && authorData.data.some(author => author.matacgia === authorId)) {
                booksWithAuthor.push(book);
            }
        }
        
        return booksWithAuthor;
    }
}
```

### 3. Overdue Book Tracking

```javascript
class OverdueTracker {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
    }

    async getOverdueLoans() {
        const loans = await this.getActiveLoans();
        const currentDate = new Date();
        const overdueLoans = [];

        for (const loan of loans) {
            const loanDate = new Date(loan.ngaymuon);
            const daysDiff = Math.floor((currentDate - loanDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 14) { // Assuming 14 days loan period
                const readerResponse = await fetch(`${this.baseUrl}/docgia/${loan.madocgia}`);
                const readerData = await readerResponse.json();
                
                overdueLoans.push({
                    ...loan,
                    daysPastDue: daysDiff - 14,
                    reader: readerData
                });
            }
        }

        return overdueLoans;
    }

    async getActiveLoans() {
        const response = await fetch(`${this.baseUrl}/phieumuon`);
        const data = await response.json();
        return data.data.filter(loan => loan.trangthai === 0);
    }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. CORS Issues
**Problem**: Cross-origin requests blocked
**Solution**: Ensure CORS is properly configured in index.js:
```javascript
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
```

#### 2. Database Connection Issues
**Problem**: "db connected" not showing in console
**Solution**: Check database configuration in db.js:
```javascript
// Verify database exists
// Check MySQL service is running
// Verify credentials are correct
```

#### 3. Email Service Not Working
**Problem**: Password reset emails not sending
**Solution**: 
1. Check environment variables in sendemail.env
2. Enable "Less secure app access" for Gmail
3. Use App Passwords for Gmail

#### 4. Image Upload Issues
**Problem**: Large base64 images causing timeouts
**Solution**: Increase request limits in index.js:
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

#### 5. Transaction Rollback Issues
**Problem**: Database in inconsistent state
**Solution**: Always use try-catch with rollback:
```javascript
try {
    await db.query('START TRANSACTION');
    // operations
    await db.query('COMMIT');
} catch (error) {
    await db.query('ROLLBACK');
    throw error;
}
```

### Debug Mode

Enable debug logging:
```javascript
// In db.js
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'qlthuvien',
    debug: true, // Enable debug mode
    port: 3306
});
```

## Performance Considerations

### 1. Database Optimization
- Index frequently queried fields (email, masach, madocgia)
- Use connection pooling for production
- Implement query caching

### 2. Image Handling
- Consider storing images in file system instead of database
- Implement image compression
- Use CDN for image delivery

### 3. API Response Optimization
- Implement pagination for large datasets
- Use selective field returns
- Cache frequently accessed data

### Example Pagination Implementation
```javascript
router.get('/sach/paginated', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const sqlQuery = `SELECT * FROM thongtinsach LIMIT ${limit} OFFSET ${offset}`;
    const countQuery = `SELECT COUNT(*) as total FROM thongtinsach`;

    db.query(countQuery, (error, countResult) => {
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        db.query(sqlQuery, (error, data) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json({
                data: data,
                pagination: {
                    page: page,
                    limit: limit,
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            });
        });
    });
});
```

## Deployment Guide

### 1. Production Environment Setup

#### Environment Variables (.env)
```env
NODE_ENV=production
PORT=3000
DB_HOST=your_production_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=qlthuvien
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### Production Database Configuration
```javascript
// db.js
const mysql = require('mysql');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qlthuvien',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### 2. Docker Deployment

#### Dockerfile
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=password
      - DB_NAME=qlthuvien
    depends_on:
      - db
    volumes:
      - ./sendemail.env:/app/sendemail.env

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=qlthuvien
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### 3. Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. PM2 Process Management
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'library-api',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 5. Health Check Endpoint
```javascript
// Add to index.js
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

This comprehensive testing and deployment guide provides everything needed to test, integrate, and deploy the Library Management System API effectively.