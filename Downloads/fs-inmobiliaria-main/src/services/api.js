import axios from 'axios'

const api = axios.create({
baseURL: 'https://fs-inmobiliaria.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})
/*const api = axios.create({
  baseURL: 'https://fs-inmobiliaria.onrender.com/api', <--- Comenta la de Render
  //baseURL: 'http://localhost:10000/api', // <--- Usa esta para pruebas locales
  headers: {
    'Content-Type': 'application/json',
  },
})*/

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})




export default api