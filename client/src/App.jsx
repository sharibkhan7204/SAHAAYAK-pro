import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import WorkerLayout from './layouts/WorkerLayout';
import AdminLayout from './layouts/AdminLayout';

// Common Components
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import Services from './pages/public/Services';
import BecomeWorker from './pages/public/BecomeWorker';
import HowItWorks from './pages/public/HowItWorks';
import About from './pages/public/About';
import FAQ from './pages/public/FAQ';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import CustomerSignup from './pages/public/CustomerSignup';
import WorkerSignup from './pages/public/WorkerSignup';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import BookService from './pages/customer/BookService';
import MyBookings from './pages/customer/MyBookings';
import BookingDetail from './pages/customer/BookingDetail';
import CustomerAddresses from './pages/customer/CustomerAddresses';
import CustomerProfile from './pages/customer/CustomerProfile';

// Worker Pages
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerJobs from './pages/worker/WorkerJobs';
import WorkerActiveJob from './pages/worker/WorkerActiveJob';
import WorkerEarnings from './pages/worker/WorkerEarnings';
import WorkerProfile from './pages/worker/WorkerProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminWorkerVerification from './pages/admin/AdminWorkerVerification';
import AdminWorkers from './pages/admin/AdminWorkers';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminServices from './pages/admin/AdminServices';
import AdminBookings from './pages/admin/AdminBookings';
import AdminAssignmentSettings from './pages/admin/AdminAssignmentSettings';
import AdminCommissionSettings from './pages/admin/AdminCommissionSettings';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminReviews from './pages/admin/AdminReviews';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminReports from './pages/admin/AdminReports';

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/become-worker" element={<BecomeWorker />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/about" element={<About />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<CustomerSignup />} />
                <Route path="/customer-signup" element={<CustomerSignup />} />
                <Route path="/register" element={<CustomerSignup />} />
                <Route path="/worker-signup" element={<WorkerSignup />} />
                <Route path="/book/:serviceId" element={<BookService />} />
              </Route>

              {/* Customer Protected Routes */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/customer/dashboard" replace />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="book" element={<BookService />} />
                <Route path="book/:serviceId" element={<BookService />} />
                <Route path="bookings" element={<MyBookings />} />
                <Route path="bookings/:id" element={<BookingDetail />} />
                <Route path="booking/:id" element={<BookingDetail />} />
                <Route path="addresses" element={<CustomerAddresses />} />
                <Route path="profile" element={<CustomerProfile />} />
              </Route>

              {/* Worker Protected Routes */}
              <Route
                path="/worker"
                element={
                  <ProtectedRoute allowedRoles={['worker']}>
                    <WorkerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/worker/dashboard" replace />} />
                <Route path="dashboard" element={<WorkerDashboard />} />
                <Route path="jobs" element={<WorkerJobs />} />
                <Route path="jobs/:id" element={<WorkerActiveJob />} />
                <Route path="job/:id" element={<WorkerActiveJob />} />
                <Route path="earnings" element={<WorkerEarnings />} />
                <Route path="profile" element={<WorkerProfile />} />
              </Route>

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="verification" element={<AdminWorkerVerification />} />
                <Route path="workers" element={<AdminWorkers />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="assignment" element={<AdminAssignmentSettings />} />
                <Route path="commission" element={<AdminCommissionSettings />} />
                <Route path="complaints" element={<AdminComplaints />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
