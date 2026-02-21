import { useState, useEffect } from 'react'
import api from '../services/api'
import logoInmobiliaria from '../assets/logo1.png'

const ConsultaPublica = () => {
  const [lotes, setLotes] = useState([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const loadLotes = async () => {
      try {
        const response = await api.get('/lotes')
        if (response.data.success) setLotes(response.data.data)
      } catch (error) {
        console.error('Error cargando datos:', error)
      }
    }
    loadLotes()
  }, [])

  const lotesFiltrados = lotes.filter(lote => 
    lote.proyecto.toLowerCase().includes(busqueda.toLowerCase()) ||
    lote.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logoInmobiliaria} alt="Logo" style={{ height: '60px', marginBottom: '10px' }} />
          <h2 style={{ color: '#24303c' }}>Disponibilidad de Lotes - F&S</h2>
          <p style={{ color: '#666' }}>Consulta en tiempo real el estado de los proyectos</p>
        </div>

        <input 
          type="text" 
          placeholder="🔍 Buscar por proyecto o cliente..." 
          style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#24303c', color: '#fff' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Proyecto</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Ubicación</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotesFiltrados.map(lote => (
                <tr key={lote.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{lote.proyecto}</td>
                  <td style={{ padding: '12px' }}>Mza: {lote.manzana} - Lote: {lote.lote}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      backgroundColor: lote.estado_lote === 'disponible' ? '#dcfce7' : '#fee2e2',
                      color: lote.estado_lote === 'disponible' ? '#166534' : '#991b1b'
                    }}>
                      {lote.estado_lote}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ConsultaPublica