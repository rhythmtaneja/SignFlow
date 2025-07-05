# 📄 PDF Signature App

A full-stack MERN application for digital PDF signing with drag-and-drop signature placement, user authentication, and audit trails.

## ✨ Features

- **🔐 User Authentication** - Secure login/register system with JWT tokens
- **📤 PDF Upload** - Drag and drop PDF files for signing
- **✍️ Digital Signatures** - Create and place signatures on PDFs with drag-and-drop interface
- **👥 Multi-User Signing** - Send documents to multiple signers via email links
- **📊 Dashboard** - Track document status and signing progress
- **🔍 Audit Trail** - Complete logging of all signing activities
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🔒 Security** - Rate limiting, CORS protection, and input validation

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React PDF Viewer** - PDF display and interaction
- **PDF-lib** - PDF manipulation and signing
- **React Draggable** - Drag-and-drop functionality
- **React Toastify** - User notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **Helmet** - Security middleware
- **Morgan** - HTTP request logging

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rhythmtaneja/signature-app.git
   cd signature-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client && npm install
   
   # Install server dependencies
   cd ../server && npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the server directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   PORT=5001
   ```

4. **Start the application**
   ```bash
   # From the root directory
   npm start
   ```
   
   This will start both the backend server (port 5001) and frontend client (port 3000).

### Alternative Manual Start

```bash
# Start backend server
cd server && npm run dev

# Start frontend client (in a new terminal)
cd client && npm start
```

## 📁 Project Structure

```
signature-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service functions
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── routes/            # API route handlers
│   ├── controllers/       # Business logic
│   ├── models/           # MongoDB schemas
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   └── uploads/          # File upload directory
└── package.json          # Root package configuration
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Documents
- `POST /api/docs/upload` - Upload PDF document
- `GET /api/docs/:id` - Get document details
- `GET /api/docs` - List user documents

### Signatures
- `POST /api/signatures` - Create signature
- `PUT /api/signatures/:id` - Update signature
- `GET /api/signatures/:status` - Get signatures by status

### Audit
- `GET /api/audit/:docId` - Get document audit trail

## 🌐 Live Demo

Visit the live application: [Sign Flow](https://sign-flow-y9li.vercel.app)

## 📸 Screenshots

*Add screenshots of your application here*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Rhythm Taneja**
- GitHub: [@rhythmtaneja](https://github.com/rhythmtaneja)

## 🙏 Acknowledgments

- [React PDF Viewer](https://react-pdf-viewer.dev/) for PDF display functionality
- [PDF-lib](https://pdf-lib.js.org/) for PDF manipulation
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the author.

---

⭐ **Star this repository if you find it helpful!**
