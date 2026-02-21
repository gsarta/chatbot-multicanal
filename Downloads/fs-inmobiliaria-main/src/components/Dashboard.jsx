import { useState, useEffect } from 'react'
import { LogOut, FileText, MessageCircle, Save, User, Calendar, Menu, X, Trash2, Edit } from 'lucide-react'
import api from '../services/api'
import logoInmobiliaria from '../assets/logo1.png'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- CONFIGURACIÓN DE JEFES ---
const NUMERO_JEFE_1 = "573142610308"; 
const NUMERO_JEFE_2 = "573222901786"; 

// --- LISTA DE PROYECTOS COMPLETA ---
const proyectosFS = [
  "PROYECTO LAS RAMBLAS",
  "PROYECTO EL OASIS PARCELACIÓN EL OLIMPO",
  "PROYECTO URBANIZACIÓN ECOLÓGICA EL OASIS",
  "FINCAS DE SAN ISIDRO",
  "LAGOS DEL OLIMPO",
  "MONTEVERDE CONDOMINIO CAMPESTRE",
  "ACQUAVIVA CAMPESTRE",
  "COELLO SAN MATIAS",
  "PROYECTO CUNDAY",
  "PROMOTORA VILLAS DEL OLIMPO",
  "PROYECTO SOLE",
  "LOCALES COMERCIALES 4ETAPA LAGOS DEL OLIMPO - ",
  "PASEO COMERCIAL PIJAO ",
  "4 ETAPA DE LAGOS DEL OLIMPO ",
  "LA FLORIDA",
  "JARDINES DE BELLAVISTA" ,
  "MIRADOR SANTO DOMINGO",
  "SIERRA CLARA NATURAL LIVING ",
  "SANTO DOMINGO RESIDENCIAL",
  "ATTALEA CAMPESTRE ",
  "CARDON CONDOMINIO CAMPESTRE ",
  "PARQUE DEL AGUA ",
  "VALLE DEL SOL ",
  "SANTORINI RESORT ",
  "SKY 360 APARTAMENTOS - RIVIERA BEACH HOUSE "
];

const Dashboard = ({ user, onLogout }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',       
    correo: '',         
    cita_agendada: '',  
    proyecto: '',
    manzana: '',
    lote: '',
    estado_lote: 'disponible',
    estado_cliente: 'llamar',
    precio_total: '',
    enganche_porcentaje: 1000000,
    tasa_interes: 4000000,
    meses: 36, 
    cuota_mensual: 0,
  })

  const [lotes, setLotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    loadLotes();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadLotes = async () => {
    try {
      const response = await api.get('/lotes')
      if (response.data.success) {
        setLotes(response.data.data)
      }
    } catch (error) {
      console.error('Error cargando lotes:', error)
    }
  }

  const validateForm = () => {
    if (!formData.nombre_completo.trim()) {
      setMessage('El nombre completo es requerido')
      return false
    }
    if (!formData.precio_total || isNaN(formData.precio_total) || formData.precio_total <= 0) {
      setMessage('El precio debe ser un número válido mayor a 0')
      return false
    }
    return true
  }

  const calcularCuota = (currentData) => {
    const data = currentData || formData;
    const precioTotal = parseFloat(data.precio_total) || 0;
    const separacion = parseFloat(data.enganche_porcentaje) || 0;
    const promesa = parseFloat(data.tasa_interes) || 0;
    const n_meses = parseInt(data.meses) || 36; 
    const saldoAFinanciar = precioTotal - separacion - promesa;
    return saldoAFinanciar > 0 ? (saldoAFinanciar / n_meses).toFixed(2) : 0;
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (['precio_total', 'enganche_porcentaje', 'tasa_interes', 'meses'].includes(field)) {
        newData.cuota_mensual = calcularCuota(newData);
      }
      return newData;
    });
  }

  const handleGeneratePDF = () => {
    try {
      if (!validateForm()) return;
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
              ['Teléfono:', formData.telefono || 'N/A'],
              ['Correo:', formData.correo || 'N/A'],
              ['Proyecto:', formData.proyecto || 'N/A'],
              ['Estado Seguimiento:', formData.estado_cliente.toUpperCase()],
          ],
          theme: 'plain',
          styles: { fontSize: 11, cellPadding: 2 }
      });
      doc.setFontSize(14);
      doc.text('DETALLES FINANCIEROS', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 20,
          head: [['Concepto', 'Detalle']],
          body: [
              ['Manzana / Lote', `${formData.manzana || '0'} / ${formData.lote || '0'}`],
              ['Precio Total', `$${parseFloat(formData.precio_total).toLocaleString('es-CO')}`],
              ['Separación', `$${parseFloat(formData.enganche_porcentaje).toLocaleString('es-CO')}`],
              ['Cuota Promesa', `$${parseFloat(formData.tasa_interes).toLocaleString('es-CO')}`],
              [`CUOTA MENSUAL (${formData.meses} MESES)`, `$${parseFloat(formData.cuota_mensual).toLocaleString('es-CO')}`],
          ],
          headStyles: { fillColor: colorOro, textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
      });
      const finalY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Esta cotización es informativa y está sujeta a cambios sin previo aviso.', 105, finalY, { align: 'center' });
      doc.text('© 2026 F&S Inmobiliaria - Gestión de Lujo', 105, finalY + 7, { align: 'center' });
      doc.save(`Cotizacion_${formData.nombre_completo}.pdf`);
      setMessage('✓ PDF generado correctamente');
    } catch (error) {
      console.error("Error al generar PDF:", error);
      setMessage('✗ Error al generar PDF');
    }
  };

  const handleSendWhatsApp = () => {
    if (!formData.nombre_completo || !formData.telefono) {
      setMessage('⚠️ Completa el nombre y teléfono del cliente primero');
      return;
    }
    const mensaje = 
      `*🔔 NUEVA NOTIFICACIÓN DE VENTA - F&S*\n\n` +
      `👤 *Cliente:* ${formData.nombre_completo}\n` +
      `📞 *Teléfono:* ${formData.telefono}\n` +
      `📧 *Correo:* ${formData.correo || 'N/A'}\n` +
      `🏗️ *Proyecto:* ${formData.proyecto || 'No especificado'}\n` +
      `📋 *Estado Cliente:* ${formData.estado_cliente.toUpperCase()}\n` +
      `📍 *Ubicación:* Mza ${formData.manzana || '0'} - Lote ${formData.lote || '0'}\n` +
      `📅 *Cita Agendada:* ${formData.cita_agendada || 'Por confirmar'}\n` +
      `💰 *Precio Total:* $${parseFloat(formData.precio_total || 0).toLocaleString('es-CO')}\n` +
      `💵 *Separación:* $${parseFloat(formData.enganche_porcentaje || 0).toLocaleString('es-CO')}\n` +
      `📝 *Cuota Promesa:* $${parseFloat(formData.tasa_interes || 0).toLocaleString('es-CO')}\n` +
      `💳 *Cuota Mensual (${formData.meses}m):* $${parseFloat(formData.cuota_mensual || 0).toLocaleString('es-CO')}\n\n` +
      `_Enviado desde el Sistema de Gestión F&S_`;

    const url = `https://wa.me/${NUMERO_JEFE_1}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    setMessage('✅ WhatsApp enviado a Jefe 1');
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setMessage('')

    const payload = {
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono || "",
        correo: formData.correo || "",
        cita_agendada: formData.cita_agendada || "",
        proyecto: formData.proyecto,
        manzana: formData.manzana,
        lote: formData.lote,
        estado_lote: formData.estado_lote,
        estado_cliente: formData.estado_cliente,
        precio_total: Number(formData.precio_total),
        enganche_porcentaje: Number(formData.enganche_porcentaje),
        tasa_interes: Number(formData.tasa_interes),
        meses: Number(formData.meses),
        cuota_mensual: Number(formData.cuota_mensual)
    };

    try {
      if (editingId) {
        await api.put(`/lotes/${editingId}`, payload)
        setMessage('✓ Lote actualizado exitosamente')
      } else {
        await api.post('/lotes', payload)
        setMessage('✓ Lote guardado exitosamente en la base de datos')
      }
      setEditingId(null)
      loadLotes()
      setFormData({
        nombre_completo: '', telefono: '', correo: '', cita_agendada: '',
        proyecto: '', manzana: '', lote: '', estado_lote: 'disponible', 
        estado_cliente: 'llamar',
        precio_total: '', enganche_porcentaje: 1000000, tasa_interes: 4000000, 
        cuota_mensual: 0, meses: 36
      })
    } catch (err) {
      console.error("Error al guardar:", err.response?.data);
      setMessage('✗ Error al guardar: ' + (err.response?.data?.message || err.message))
    } finally { 
      setLoading(false) 
    }
  }

  const handleEdit = (lote) => { 
    setEditingId(lote.id); 
    setFormData({ 
      ...lote,
      cita_agendada: lote.cita || lote.cita_agendada || ''
    }); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleDelete = async (id) => {
    if (confirm('¿Deseas eliminar este lote?')) {
      try {
        await api.delete(`/lotes/${id}`)
        setMessage('✓ Lote eliminado')
        loadLotes()
      } catch (err) { setMessage('✗ Error al eliminar') }
    }
  }

  // --- ESTILOS ---
  const containerStyle = { minHeight: '100vh', backgroundColor: '#e5e7eb', padding: isMobile ? '10px' : '20px' }
  const cardStyle = { maxWidth: '1400px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }
  const navStyle = { backgroundColor: '#24303c', color: '#fff', padding: isMobile ? '15px' : '12px 30px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #d4af37', gap: isMobile ? '10px' : '0' }
  const contentStyle = { padding: isMobile ? '15px' : '30px' }
  const gridStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '20px' : '30px', marginBottom: '30px' }
  const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '16px' }
  const sectionTitleStyle = { fontSize: '16px', fontWeight: 'bold', color: '#333', paddingBottom: '12px', borderBottom: '2px solid #24303c' }
  const formGroupStyle = { display: 'flex', flexDirection: 'column', gap: '6px' }
  const labelStyle = { fontSize: '13px', fontWeight: '600', color: '#555' }
  const inputStyle = { padding: '12px 16px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }
  const simulatorStyle = { backgroundColor: '#f3f4f6', padding: isMobile ? '15px' : '24px', borderRadius: '12px', marginBottom: '30px' }
  const simulatorGridStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr 1.2fr', gap: '16px', alignItems: 'end' }
  const buttonsStyle = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '16px', marginTop: '30px', marginBottom: '40px' }
  const buttonBlueStyle = { padding: '14px', backgroundColor: '#24303c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
  const buttonWhiteStyle = { ...buttonBlueStyle, backgroundColor: '#fff', color: '#24303c', border: '2px solid #24303c' }
  const buttonGreenStyle = { ...buttonBlueStyle, backgroundColor: '#22c55e' }
  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={navStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={logoInmobiliaria} alt="Logo" style={{ height: '45px', borderRadius: '50%', border: '2px solid #d4af37' }} />
            <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', letterSpacing: '1px' }}>INMOBILIARIA F&S</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={onLogout}>
            <User size={20} />
            <span style={{ fontWeight: '500' }}>{isMobile ? 'Salir' : `Hola, ${user?.name || 'Asesor'}`}</span>
            <LogOut size={18} />
          </div>
        </div>

        <div style={contentStyle}>
          {message && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '20px', 
              backgroundColor: message.includes('✓') || message.includes('✅') ? '#dcfce7' : '#fee2e2', 
              color: message.includes('✓') || message.includes('✅') ? '#166534' : '#991b1b' 
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={gridStyle}>
              {/* SECCIÓN DATOS CLIENTE */}
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>DATOS DE CONTACTO Y PROSPECTO</h3>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Nombre Completo *</label>
                  <input type="text" style={inputStyle} value={formData.nombre_completo} onChange={(e) => handleInputChange('nombre_completo', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Teléfono *</label>
                    <input type="tel" style={inputStyle} value={formData.telefono} onChange={(e) => handleInputChange('telefono', e.target.value)} />
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Correo</label>
                    <input type="email" style={inputStyle} value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} />
                  </div>
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Cita Agendada</label>
                    <input type="datetime-local" style={inputStyle} value={formData.cita_agendada} onChange={(e) => handleInputChange('cita_agendada', e.target.value)} />
                </div>
              </div>

              {/* SECCIÓN DETALLES LOTE + ESTADO CLIENTE */}
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>DETALLES TÉCNICOS DEL LOTE</h3>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Proyecto/Urbanización</label>
                  <select 
                    style={selectStyle} 
                    value={formData.proyecto} 
                    onChange={(e) => handleInputChange('proyecto', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {proyectosFS.map((proy, index) => (
                      <option key={index} value={proy}>{proy}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Manzana / Lote</label>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <input type="text" style={{...inputStyle, flex: 1}} value={formData.manzana} onChange={(e) => handleInputChange('manzana', e.target.value)} placeholder="Mza" />
                      <input type="text" style={{...inputStyle, flex: 1}} value={formData.lote} onChange={(e) => handleInputChange('lote', e.target.value)} placeholder="Lote" />
                    </div>
                  </div>
                  <div style={formGroupStyle}>
                    <label style={labelStyle}>Estado del Lote</label>
                    <select style={selectStyle} value={formData.estado_lote} onChange={(e) => handleInputChange('estado_lote', e.target.value)}>
                      <option value="disponible">Disponible</option>
                      <option value="vendido">Vendido</option>
                      <option value="reservado">Reservado</option>
                    </select>
                  </div>
                </div>

                <div style={{
                    ...formGroupStyle, 
                    backgroundColor: '#f8fafc', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px dashed #cbd5e1',
                    marginTop: '4px'
                }}>
                  <label style={{...labelStyle, color: '#24303c'}}>Estado del Cliente (Seguimiento)</label>
                  <select 
                    style={{
                        ...selectStyle, 
                        backgroundColor: '#fff', 
                        fontWeight: 'bold',
                        borderColor: '#24303c'
                    }} 
                    value={formData.estado_cliente} 
                    onChange={(e) => handleInputChange('estado_cliente', e.target.value)}
                  >
                    <option value="llamar">📞 LLAMAR</option>
                    <option value="finalizado">✅ FINALIZADO</option>
                    <option value="validado">⭐ VALIDADO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SIMULADOR FINANCIERO */}
            <div style={simulatorStyle}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#24303c' }}>SIMULADOR FINANCIERO</h3>
              <div style={simulatorGridStyle}>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Precio Total *</label>
                    <input type="number" style={inputStyle} value={formData.precio_total} onChange={(e) => handleInputChange('precio_total', e.target.value)} placeholder="$0" />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Separación</label>
                    <input type="number" style={inputStyle} value={formData.enganche_porcentaje} onChange={(e) => handleInputChange('enganche_porcentaje', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Cuota Promesa</label>
                    <input type="number" style={inputStyle} value={formData.tasa_interes} onChange={(e) => handleInputChange('tasa_interes', e.target.value)} />
                </div>
                <div style={formGroupStyle}>
                    <label style={labelStyle}>Plazo (Meses)</label>
                    <select style={selectStyle} value={formData.meses} onChange={(e) => handleInputChange('meses', e.target.value)}>
                      <option value="12">12 meses</option>
                      <option value="24">24 meses</option>
                      <option value="28">28 meses</option> 
                      <option value="30">30 meses</option>
                      <option value="36">36 meses</option>
                      <option value="40">40 meses</option>
                      <option value="48">48 meses</option>
                    </select>
                </div>
                <div style={{ backgroundColor: '#24303c', padding: '12px', borderRadius: '8px', color: '#fff', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderBottom: '4px solid #d4af37' }}>
                  <div style={{ fontSize: '11px', color: '#d4af37', fontWeight: 'bold', marginBottom: '2px' }}>CUOTA MENSUAL</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>${parseFloat(formData.cuota_mensual).toLocaleString('es-CO')}</div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>{formData.meses} cuotas fijas</div>
                </div>
              </div>
            </div>

            <div style={buttonsStyle}>
              <button type="submit" style={buttonBlueStyle} disabled={loading}>
                <Save size={18} /> {editingId ? 'ACTUALIZAR DATOS' : 'GUARDAR EN DB'}
              </button>
              <button type="button" style={buttonWhiteStyle} onClick={handleGeneratePDF}>
                <FileText size={18} /> GENERAR COTIZACIÓN PDF
              </button>
              <button type="button" style={buttonGreenStyle} onClick={handleSendWhatsApp}>
                <MessageCircle size={18} /> NOTIFICAR A JEFES
              </button>
            </div>
          </form>

          {/* --- TABLA DE REGISTROS --- */}
          {lotes.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 style={sectionTitleStyle}>LOTES REGISTRADOS RECIENTEMENTE</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <table style={tableStyle}>
                  <thead style={{ backgroundColor: '#24303c', color: '#fff' }}>
                    <tr>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Cliente / Contacto</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Cita Agendada</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Seguimiento</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Proyecto / Ubicación</th>
                      <th style={{ padding: '15px', textAlign: 'left' }}>Precio Total</th>
                      <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map(lote => (
                      <tr key={lote.id} style={{ borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 'bold', color: '#24303c', fontSize: '14px' }}>{lote.nombre_completo}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>📞 {lote.telefono || lote.TELEFONO || 'Sin tel.'}</span>
                            <span style={{ color: '#3b82f6' }}>✉️ {lote.correo || lote.CORREO || 'Sin correo'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {(lote.cita || lote.cita_agendada) ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontWeight: '500' }}>
                              <Calendar size={14} />
                              {new Date(lote.cita || lote.cita_agendada).toLocaleString('es-CO', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </div>
                          ) : (
                            <span style={{ color: '#999', fontStyle: 'italic' }}>No programada</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                            backgroundColor: lote.estado_cliente === 'finalizado' ? '#dcfce7' : lote.estado_cliente === 'validado' ? '#dbeafe' : '#fef9c3',
                            color: lote.estado_cliente === 'finalizado' ? '#166534' : lote.estado_cliente === 'validado' ? '#1e40af' : '#854d0e',
                            border: '1px solid currentColor'
                          }}>
                            {lote.estado_cliente === 'llamar' ? '📞 Llamar' : lote.estado_cliente === 'validado' ? '⭐ Validado' : '✅ Finalizado'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500' }}>{lote.proyecto || 'N/A'}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Mza: {lote.manzana || '-'} / Lote: {lote.lote || '-'}</div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#24303c' }}>
                          ${parseFloat(lote.precio_total || 0).toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => handleEdit(lote)} style={{ padding: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(lote.id)} style={{ padding: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard;