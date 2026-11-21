import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Categories from './pages/Categories'
import RecipeDetail from './pages/RecipeDetail'
import RecipeForm from './pages/RecipeForm'
import MyRecipes from './pages/MyRecipes'
import Favorites from './pages/Favorites'
import ShoppingList from './pages/ShoppingList'
import CookingTimer from './pages/CookingTimer'
import KitchenFinder from './pages/KitchenFinder'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import AdminDashboard from './pages/admin/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/recipes/new" element={<RecipeForm />} />
                  <Route path="/recipes/:id/edit" element={<RecipeForm />} />
                  <Route path="/recipes/:id" element={<RecipeDetail />} />
                  <Route path="/my-recipes" element={<MyRecipes />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/shopping-list" element={<ShoppingList />} />
                  <Route path="/timer" element={<CookingTimer />} />
                  <Route path="/kitchen" element={<KitchenFinder />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route element={<ProtectedRoute adminOnly />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
