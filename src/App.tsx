import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Home } from '@/pages/Home'
import { Capture } from '@/pages/scan/Capture'
import { Review } from '@/pages/scan/Review'
import { Categorize } from '@/pages/scan/Categorize'
import { ProductDetail } from '@/pages/ProductDetail'
import { Routines } from '@/pages/Routines'
import { Profile } from '@/pages/Profile'
import { Settings } from '@/pages/Settings'
import { ScanFlowProvider } from '@/lib/scan/ScanFlowContext'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route
            path="/scan/*"
            element={
              <ScanFlowProvider>
                <Routes>
                  <Route index element={<Capture />} />
                  <Route path="review" element={<Review />} />
                  <Route path="categorize" element={<Categorize />} />
                </Routes>
              </ScanFlowProvider>
            }
          />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/routines" element={<Routines />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </HashRouter>
  )
}
