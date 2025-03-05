// Función para formatear valores seguros
export const safeFormat = (value, type = 'number') => {
    // Si el valor es null o undefined
    if (value === null || value === undefined) {
      return type === 'number' ? 0 : 'N/A';
    }
  
    // Si es un número
    if (type === 'number') {
      return Number(value);
    }
  
    // Si es una fecha
    if (type === 'date') {
      try {
        // Si ya es un objeto Date
        if (value instanceof Date) {
          return value;
        }
        
        // Si es un objeto Timestamp de Firebase
        if (value.toDate && typeof value.toDate === 'function') {
          return value.toDate();
        }
        
        // Si es un string de fecha
        return new Date(value);
      } catch (error) {
        console.error('Error formateando fecha:', error);
        return new Date();
      }
    }
  
    return value;
  };
  
  // Función para formatear fechas de manera segura
  export const safeFormatDate = (date) => {
    try {
      const formattedDate = safeFormat(date, 'date');
      return formattedDate.toLocaleDateString();
    } catch (error) {
      console.error('Error en formateo de fecha:', error);
      return 'Fecha inválida';
    }
  };