import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import api from '../services/api'
// Importaciones para la funcionalidad de PDF
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [nombre, setNombre] = useState('')

  // FUNCIÓN DE PDF INTEGRADA (Manteniendo tu estructura)
  const handleGeneratePDF = (dataForPDF) => {
    try {
      const formData = dataForPDF || {}; 
      const doc = new jsPDF();
      const colorOro = [184, 148, 77]; 
      
      doc.setFillColor(36, 48, 60); 
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('F&S INMOBILIARIA', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text('COTIZACIÓN DE PROYECTO HABITACIONAL', 105, 30, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('INFORMACIÓN DEL PROSPECTO', 14, 55);
      
      autoTable(doc, {
          startY: 60,
          body: [
              ['Nombre Completo:', formData.nombre_completo || 'N/A'],
              ['WhatsApp / Tel:', formData.telefono || 'N/A'],
              ['Correo Electrónico:', formData.correo || 'N/A'],
              ['Proyecto:', formData.proyecto || 'N/A'],
          ],
          theme: 'plain',
          styles: { fontSize: 11, cellPadding: 2 }
      });

      const seguroNum = (val) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);
      const finalY_Prospecto = doc.lastAutoTable.finalY;

      doc.setFontSize(14);
      doc.text('DETALLES FINANCIEROS', 14, finalY_Prospecto + 15);

      autoTable(doc, {
          startY: finalY_Prospecto + 20,
          head: [['Concepto', 'Detalle']],
          body: [
              ['Manzana / Lote', `${formData.manzana || '0'} / ${formData.lote || '0'}`],
              ['Precio Total', `$${seguroNum(formData.precio_total).toLocaleString('es-CO')}`],
              ['Separación', `$${seguroNum(formData.enganche_porcentaje).toLocaleString('es-CO')}`],
              ['Cuota Promesa', `$${seguroNum(formData.tasa_interes).toLocaleString('es-CO')}`],
              ['CUOTA MENSUAL (36 MESES)', `$${seguroNum(formData.cuota_mensual).toLocaleString('es-CO')}`],
          ],
          headStyles: { fillColor: colorOro, textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
      });

      const finalPageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Esta cotización es informativa y está sujeta a cambios sin previo aviso.', 105, finalPageHeight - 20, { align: 'center' });
      doc.text('© 2026 F&S Inmobiliaria - Gestión de Lujo', 105, finalPageHeight - 13, { align: 'center' });

      doc.save(`Cotizacion_${formData.nombre_completo || 'Cliente'}.pdf`);
    } catch (pdfError) {
      console.error("Error al generar PDF:", pdfError);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido')
      setLoading(false)
      return
    }

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const payload = isRegister 
        ? { nombre, email, password }
        : { email, password }

      const response = await api.post(endpoint, payload)

      if (response.data.success) {
        if (!isRegister) {
          localStorage.setItem('token', response.data.token)
          onLoginSuccess({
            id: response.data.user.id,
            name: response.data.user.name,
            email: response.data.user.email,
            token: response.data.token,
          })
        } else {
          setError('')
          setEmail('')
          setPassword('')
          setNombre('')
          setIsRegister(false)
          setError('✓ Usuario registrado. Inicia sesión ahora')
          setTimeout(() => setError(''), 3000)
        }
      } else {
        setError(response.data.message || 'Error en autenticación')
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ESTILOS CONSERVADOS TAL CUAL
  const containerStyle = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#24303c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  const cardStyle = {
    backgroundColor: '#f9f9f9',
    borderRadius: '50px',
    maxWidth: '380px',
    width: '100%',
    padding: '60px 40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    boxSizing: 'border-box',
  }

  const logoContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '40px',
  }

  const logoStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#000',
    border: '3px solid #b8944d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontFamily: 'Georgia, serif',
    color: '#b8944d',
    fontWeight: 'bold',
  }

  const titleStyle = {
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#000',
  }

  const subtitleStyle = {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px',
  }

  const formGroupStyle = {
    marginBottom: '20px',
  }

  const inputContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '25px',
    border: '1px solid #e0e0e0',
    padding: '0 16px',
    boxSizing: 'border-box',
  }

  const inputStyle = {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '14px 12px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
  }

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '25px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    background: 'linear-gradient(90deg, #b8944d 0%, #d4af85 100%)',
    color: '#000',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginTop: '20px',
    transition: 'all 0.3s ease',
  }

  const errorStyle = {
    backgroundColor: error.includes('✓') ? '#dcfce7' : '#fee',
    color: error.includes('✓') ? '#166534' : '#c33',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
  }

  const toggleStyle = {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '13px',
    color: '#666',
  }

  const toggleLinkStyle = {
    color: '#b8944d',
    cursor: 'pointer',
    fontWeight: 'bold',
    textDecoration: 'none',
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoContainerStyle}>
          <div style={logoStyle}>F&S</div>
        </div>

        <div style={titleStyle}>F&S Inmobiliaria</div>
        <div style={subtitleStyle}>Gestión Inmobiliaria de Lujo</div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div style={formGroupStyle}>
              <div style={inputContainerStyle}>
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div style={formGroupStyle}>
            <div style={inputContainerStyle}>
              <Mail size={20} color="#b8944d" style={{ marginRight: '8px' }} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <div style={inputContainerStyle}>
              <Lock size={20} color="#b8944d" style={{ marginRight: '8px' }} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <button
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)' }}
            onMouseLeave={(e) => { e.target.style.transform = 'scale(1)' }}
            disabled={loading}
          >
            {loading ? (isRegister ? 'REGISTRANDO...' : 'AUTENTICANDO...') : (isRegister ? 'REGISTRARSE' : 'ACCEDER')}
          </button>
        </form>

        <div style={toggleStyle}>
          {isRegister ? (
            <>¿Ya tienes cuenta? <span style={toggleLinkStyle} onClick={() => setIsRegister(false)}>Inicia sesión</span></>
          ) : (
            <>¿No tienes cuenta? <span style={toggleLinkStyle} onClick={() => setIsRegister(true)}>Regístrate</span></>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#999' }}>
          © 2026 F&S Inmobiliaria
        </div>
      </div>
    </div>
  )
}

export default Login;