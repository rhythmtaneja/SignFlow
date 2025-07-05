import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// Components
import Landing from './pages/Landing';
import Header from './components/Header';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Preview from './pages/Preview';
import PublicSign from './pages/PublicSign';
import SignaturesByStatus from './pages/SignaturesByStatus';

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
          
          {/* Protected Routes with Header */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <div>
                  <Header />
                  <main className="container mx-auto px-4 py-8">
                    <Dashboard />
                  </main>
                </div>
              </RequireAuth>
            }
          />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <div>
                  <Header />
                  <main className="container mx-auto px-4 py-8">
                    <Upload />
                  </main>
                </div>
              </RequireAuth>
            }
          />
          <Route 
            path="/preview/:id" 
            element={
              <RequireAuth>
                <div>
                  <Header />
                  <main className="container mx-auto px-4 py-8">
                    <Preview />
                  </main>
                </div>
              </RequireAuth>
            } 
          />
          <Route path="/sign/:token" element={<PublicSign />} />
          <Route 
            path="/signatures/:status" 
            element={
              <RequireAuth>
                <div>
                  <Header />
                  <main className="container mx-auto px-4 py-8">
                    <SignaturesByStatus />
                  </main>
                </div>
              </RequireAuth>
            } 
          />
        </Routes>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
}

export default App;
