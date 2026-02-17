import axios from 'axios';

export class VtigerService {
  private apiUrl = process.env.VTIGER_URL;
  private username = process.env.VTIGER_USER;
  private accessKey = process.env.VTIGER_ACCESS_KEY;

  async createLead(firstName: string, lastName: string, phone: string) {
    try {
      // Aquí el bot enviará los datos al CRM para la mejora continua
      const response = await axios.post(`${this.apiUrl}/webservice.php`, {
        operation: 'create',
        element: JSON.stringify({
          firstname: firstName,
          lastname: lastName,
          phone: phone,
          leadsource: 'WhatsApp Bot'
        }),
        // Nota: Vtiger requiere un token de sesión previo, esto es simplificado
      });
      return response.data;
    } catch (error) {
      console.error('Error enviando a Vtiger:', error);
    }
  }
}