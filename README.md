# TodoApp - Next.js + MongoDB

A modern todo application built with Next.js, TypeScript, Express, and MongoDB.

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** installed and running locally OR a MongoDB Atlas account
- **npm** or **yarn** (comes with Node.js)

## 🚀 Quick Start

### 1. Clone or Download the Project

```bash
# If using git
git clone <repository-url>
cd next-mongo-demo

# Or just extract the zip file and navigate to the folder
```

### 2. Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file (if not exists)
# Copy the contents below into backend/.env
```

**Backend `.env` file:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/todoapp

# If using MongoDB Atlas, use this format instead:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todoapp
```

### 3. Setup Frontend

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install dependencies
npm install

# Create .env.local file (if not exists)
# Copy the contents below into frontend/.env.local
```

**Frontend `.env.local` file:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/todos
```

### 4. Start MongoDB

**Option A: Local MongoDB**
```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or run manually
mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get connection string
- Update `backend/.env` with your connection string

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
You should see:
```
Server running on port 5000
MongoDB Connected: localhost
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
You should see:
```
Ready - started server on 0.0.0.0:3000
```

### 6. Access the Application

- **Landing Page**: http://localhost:3000
- **Todos App**: http://localhost:3000/todos
- **Backend API**: http://localhost:5000

## 📁 Project Structure

```
next-mongo-demo/
├── backend/                 # Express API server
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── models/
│   │   └── Todo.js         # Todo schema
│   ├── routes/
│   │   └── todoRoutes.js   # API routes
│   ├── index.js            # Server entry point
│   ├── .env                # Backend environment variables
│   └── package.json
│
└── frontend/               # Next.js application
    ├── app/
    │   ├── page.tsx       # Landing page
    │   ├── layout.tsx     # Root layout
    │   ├── globals.css    # Global styles
    │   └── todos/
    │       ├── page.tsx   # Todos page
    │       └── todos.module.css
    ├── .env.local         # Frontend environment variables
    └── package.json
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **Database**: MongoDB

## 📝 API Endpoints

- `GET /api/todos` - Get all todos
- `GET /api/todos/:id` - Get single todo
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

## 🐛 Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify `.env` file exists with correct `MONGODB_URI`
- Make sure port 5000 is not in use

### Frontend can't connect to backend
- Make sure backend is running on port 5000
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Restart frontend after changing `.env.local`

### MongoDB connection failed
- **Local**: Make sure MongoDB service is running
- **Atlas**: Check connection string, username, password, and IP whitelist

### Port already in use
```bash
# Windows - Find and kill process using port
netstat -ano | findstr :5000
taskkill /PID <process_id> /F
```

## 📦 Available Scripts

### Backend
- `npm start` - Start the server
- `npm run dev` - Start with nodemon (if installed)

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🎯 Features

- ✅ Create todos with title and description
- ✅ Mark todos as complete/incomplete
- ✅ Delete todos
- ✅ View statistics (Total, Completed, Pending)
- ✅ Responsive design
- ✅ Clean, professional UI

## 📄 License

This project is open source and available for educational purposes.

## 👥 Contributing

Feel free to submit issues and enhancement requests!

---

**Need help?** Create an issue or contact the project maintainer.
