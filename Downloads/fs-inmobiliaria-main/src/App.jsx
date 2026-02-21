import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from "./components/login";
import Dashboard from './components/Dashboard'
import ConsultaPublica from './pages/ConsultaPublica' // Importación necesaria

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))
  const [user, setUser] = useState(null)

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('token', userData.token)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem('token')
  }

  return (
    <Router>
      <Routes>
        {/* Mantenemos tu lógica exacta: Si es /consulta, muestra la página pública */}
        <Route path="/consulta" element={<ConsultaPublica />} />

        {/* Mantenemos tu lógica exacta de autenticación en la raíz */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } 
        />

        {/* Redirección de seguridad para rutas no existentes */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App