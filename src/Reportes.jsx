import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Col, 
  Row, 
  Typography, 
  Statistic, 
  Button, 
  Divider, 
  Space,
  DatePicker,
  Table,
  message,
  Spin,
  ConfigProvider
} from 'antd';
import {
  LineChartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  ToolOutlined,
  SyncOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { safeFormat } from './firebaseDataHelper';
import { calcularTotalVentas } from './Ventas';
import { utils, writeFile } from 'xlsx'; 
import locale from 'antd/es/date-picker/locale/es_ES';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Función para obtener el nombre del mes en español
const obtenerNombreMes = (fecha) => {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

// Función para agrupar ventas por mes
const agruparVentasPorMes = (ventas) => {
  const ventasPorMes = {};
  
  ventas.forEach(venta => {
    const fecha = venta.fecha;
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!ventasPorMes[mes]) {
      ventasPorMes[mes] = {
        mes: mes,
        nombreMes: obtenerNombreMes(fecha),
        totalVentas: 0,
        cantidad: 0
      };
    }
    
    ventasPorMes[mes].totalVentas += parseFloat(venta.precio);
    ventasPorMes[mes].cantidad += 1;
  });
  
  return Object.values(ventasPorMes).sort((a, b) => a.mes.localeCompare(b.mes));
};

// Función para agrupar materiales por mes
const agruparMaterialesPorMes = (materiales) => {
  const materialesPorMes = {};
  
  materiales.forEach(material => {
    const fecha = material.fecha;
    const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!materialesPorMes[mes]) {
      materialesPorMes[mes] = {
        mes: mes,
        nombreMes: obtenerNombreMes(fecha),
        totalGastos: 0,
        cantidad: 0
      };
    }
    
    materialesPorMes[mes].totalGastos += parseFloat(material.precioTotal);
    materialesPorMes[mes].cantidad += 1;
  });
  
  return Object.values(materialesPorMes).sort((a, b) => a.mes.localeCompare(b.mes));
};

// Calcular ganancias por mes
const calcularGananciasPorMes = (ventasPorMes, materialesPorMes) => {
  const gananciasPorMes = [];
  
  // Crear un conjunto con todos los meses únicos
  const mesesUnicos = new Set();
  ventasPorMes.forEach(item => mesesUnicos.add(item.mes));
  materialesPorMes.forEach(item => mesesUnicos.add(item.mes));
  
  // Para cada mes, calcular las ganancias
  mesesUnicos.forEach(mes => {
    const ventasMes = ventasPorMes.find(item => item.mes === mes) || { totalVentas: 0, nombreMes: '', cantidad: 0 };
    const gastosMes = materialesPorMes.find(item => item.mes === mes) || { totalGastos: 0, cantidad: 0 };
    
    // Si no tenemos el nombreMes de ventas, lo obtenemos de gastos
    const nombreMes = ventasMes.nombreMes || gastosMes.nombreMes;
    
    gananciasPorMes.push({
      mes: mes,
      nombreMes: nombreMes,
      ventas: ventasMes.totalVentas,
      gastos: gastosMes.totalGastos,
      ganancia: ventasMes.totalVentas - gastosMes.totalGastos,
      cantidadVentas: ventasMes.cantidad,
      cantidadCompras: gastosMes.cantidad
    });
  });
  
  return gananciasPorMes.sort((a, b) => a.mes.localeCompare(b.mes));
};

// Función para formatear fecha en español
const formatearFechaEspañol = (fecha) => {
  if (!fecha) return "";
  
  const opciones = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  };
  
  return fecha.toLocaleDateString('es-ES', opciones);
};

const ReportesComponent = () => {
  const [ventas, setVentas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  
  // Cargar datos de ventas y materiales
  const cargarDatos = async (inicio = null, fin = null) => {
    setLoading(true);
    try {
      let ventasRef = collection(db, 'ventas');
      let materialesRef = collection(db, 'materiales');
      
      // Crear queries con filtros de fecha si están definidos
      let ventasQuery = ventasRef;
      let materialesQuery = materialesRef;
      
      if (inicio && fin) {
        const inicioTimestamp = Timestamp.fromDate(inicio.toDate());
        const finTimestamp = Timestamp.fromDate(fin.toDate());
        
        ventasQuery = query(
          ventasRef,
          where('fecha', '>=', inicioTimestamp),
          where('fecha', '<=', finTimestamp),
          orderBy('fecha', 'desc')
        );
        
        materialesQuery = query(
          materialesRef,
          where('fecha', '>=', inicioTimestamp),
          where('fecha', '<=', finTimestamp),
          orderBy('fecha', 'desc')
        );
      } else {
        ventasQuery = query(ventasRef, orderBy('fecha', 'desc'));
        materialesQuery = query(materialesRef, orderBy('fecha', 'desc'));
      }
      
      const ventasSnapshot = await getDocs(ventasQuery);
      const materialesSnapshot = await getDocs(materialesQuery);

      const listaVentas = ventasSnapshot.docs.map(doc => {
        const ventaData = doc.data();
        return {
          id: doc.id,
          nombreProducto: safeFormat(ventaData.nombreProducto, 'string') || 'Producto sin nombre',
          cantidad: parseFloat(safeFormat(ventaData.cantidad)),
          precio: parseFloat(safeFormat(ventaData.precio)),
          fecha: ventaData.fecha?.toDate() || new Date()
        };
      });
      
      const listaMateriales = materialesSnapshot.docs.map(doc => {
        const materialData = doc.data();
        return {
          id: doc.id,
          nombre: safeFormat(materialData.nombre, 'string') || 'Material sin nombre',
          precioTotal: safeFormat(materialData.precioTotal),
          fecha: materialData.fecha?.toDate() || new Date()
        };
      });

      setVentas(listaVentas);
      setMateriales(listaMateriales);
      message.success("Datos cargados correctamente");
    } catch (error) {
      console.error('Error al cargar datos:', error);
      message.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular métricas financieras
  const totalVentas = calcularTotalVentas(ventas);
  
  const totalGastosMateriales = materiales.reduce(
    (total, material) => total + safeFormat(material.precioTotal),
    0
  );
  
  const ganancias = totalVentas - totalGastosMateriales;
  const margenGanancia = totalVentas > 0 ? ((ganancias / totalVentas) * 100) : 0;

  // Agrupar datos por mes
  const ventasPorMes = agruparVentasPorMes(ventas);
  const materialesPorMes = agruparMaterialesPorMes(materiales);
  const gananciasPorMes = calcularGananciasPorMes(ventasPorMes, materialesPorMes);

  // Manejar cambio en el rango de fechas
  const handleFechasChange = (dates) => {
    if (dates && dates.length === 2) {
      setFechaInicio(dates[0]);
      setFechaFin(dates[1]);
      cargarDatos(dates[0], dates[1]);
    } else {
      setFechaInicio(null);
      setFechaFin(null);
      cargarDatos();
    }
  };

  // Exportar datos a Excel con gráficos y estadísticas
  const exportarReporte = () => {
    try {
      // Crear hoja de resumen
      const resumenData = [
        { 'Métrica': 'Total Ventas', 'Valor': totalVentas.toFixed(2) + ' $' },
        { 'Métrica': 'Gastos Materiales', 'Valor': totalGastosMateriales.toFixed(2) + ' $' },
        { 'Métrica': 'Ganancias', 'Valor': ganancias.toFixed(2) + ' $' },
        { 'Métrica': 'Margen de Ganancia', 'Valor': margenGanancia.toFixed(2) + '%' },
        { 'Métrica': 'Número de Ventas', 'Valor': ventas.length },
        { 'Métrica': 'Número de Materiales', 'Valor': materiales.length }
      ];
      
      // Crear hoja de ventas
      const ventasData = ventas.map(venta => ({
        'Producto': venta.nombreProducto,
        'Cantidad': venta.cantidad,
        'Precio ($)': venta.precio.toFixed(2),
        'Fecha': formatearFechaEspañol(venta.fecha)
      }));
      
      // Crear hoja de materiales
      const materialesData = materiales.map(material => ({
        'Material': material.nombre,
        'Precio Total ($)': parseFloat(material.precioTotal).toFixed(2),
        'Fecha': formatearFechaEspañol(material.fecha)
      }));
      
      // Crear hoja de análisis mensual
      const analisisMensualData = gananciasPorMes.map(mes => ({
        'Mes': mes.nombreMes,
        'Ventas ($)': mes.ventas.toFixed(2),
        'Gastos ($)': mes.gastos.toFixed(2),
        'Ganancia ($)': mes.ganancia.toFixed(2),
        'Margen (%)': mes.ventas > 0 ? ((mes.ganancia / mes.ventas) * 100).toFixed(2) : '0.00',
        'Cantidad Ventas': mes.cantidadVentas,
        'Cantidad Compras': mes.cantidadCompras
      }));
      
      // Crear workbook
      const workbook = utils.book_new();
      
      // Añadir hojas al workbook
      utils.book_append_sheet(workbook, utils.json_to_sheet(resumenData), 'Resumen');
      utils.book_append_sheet(workbook, utils.json_to_sheet(analisisMensualData), 'Análisis Mensual');
      utils.book_append_sheet(workbook, utils.json_to_sheet(ventasData), 'Ventas');
      utils.book_append_sheet(workbook, utils.json_to_sheet(materialesData), 'Materiales');
      
      // Ajustar ancho de columnas
      const wscols = [
        {wch: 20}, // Columna A
        {wch: 15}, // Columna B
        {wch: 15}, // Columna C
        {wch: 15}, // Columna D
        {wch: 15}, // Columna E
        {wch: 15}, // Columna F
        {wch: 15}  // Columna G
      ];
      
      // Aplicar ancho de columnas a todas las hojas
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        worksheet['!cols'] = wscols;
      });
      
      // Generar nombre del archivo con la fecha actual
      const fechaHoy = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
      const nombreArchivo = `Reporte_Financiero_${fechaHoy}.xlsx`;
      
      // Guardar archivo
      writeFile(workbook, nombreArchivo);
      message.success(`Reporte exportado como ${nombreArchivo}`);
    } catch (error) {
      console.error('Error al exportar:', error);
      message.error('Error al exportar el reporte');
    }
  };

  // Columnas para la tabla de ventas más recientes
  const ventasColumns = [
    {
      title: 'Producto',
      dataIndex: 'nombreProducto',
      key: 'nombreProducto',
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      align: 'center',
    },
    {
      title: 'Precio ($)',
      dataIndex: 'precio',
      key: 'precio',
      align: 'right',
      render: (precio) => `$${parseFloat(precio).toFixed(2)}`
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => formatearFechaEspañol(fecha)
    }
  ];

  // Columnas para la tabla de análisis mensual
  const analisisMensualColumns = [
    {
      title: 'Mes',
      dataIndex: 'nombreMes',
      key: 'nombreMes',
    },
    {
      title: 'Ventas ($)',
      dataIndex: 'ventas',
      key: 'ventas',
      align: 'right',
      render: (ventas) => `$${ventas.toFixed(2)}`
    },
    {
      title: 'Gastos ($)',
      dataIndex: 'gastos',
      key: 'gastos',
      align: 'right',
      render: (gastos) => `$${gastos.toFixed(2)}`
    },
    {
      title: 'Ganancia ($)',
      dataIndex: 'ganancia',
      key: 'ganancia',
      align: 'right',
      render: (ganancia) => ({
        children: `$${ganancia.toFixed(2)}`,
        props: {
          style: {
            color: ganancia >= 0 ? '#3f8600' : '#cf1322',
            fontWeight: 'bold'
          }
        }
      })
    }
  ];

  return (
    <ConfigProvider locale={locale}>
      <div style={{ padding: '20px' }}>
        <Spin spinning={loading} tip="Cargando datos...">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space align="center">
                  <BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <Title level={4} style={{ margin: 0 }}>
                    Reportes Financieros
                  </Title>
                </Space>
                
                <Space>
                  <RangePicker 
                    onChange={handleFechasChange}
                    format="DD/MM/YYYY"
                    locale={locale}
                    placeholder={['Fecha inicio', 'Fecha fin']}
                  />
                  <Button 
                    icon={<SyncOutlined />} 
                    onClick={() => cargarDatos(fechaInicio, fechaFin)}
                  >
                    Actualizar
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<ExportOutlined />} 
                    onClick={exportarReporte}
                  >
                    Exportar Excel
                  </Button>
                </Space>
              </div>

              <Divider style={{ margin: '0 0 24px 0' }} />

              {/* Tarjetas de métricas */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Total de Ventas"
                      value={totalVentas}
                      precision={2}
                      prefix={<DollarOutlined />}
                      valueStyle={{ color: '#3f8600' }}
                      suffix="$"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Gastos en Materiales"
                      value={totalGastosMateriales}
                      precision={2}
                      prefix={<ToolOutlined />}
                      valueStyle={{ color: '#cf1322' }}
                      suffix="$"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Ganancias Netas"
                      value={ganancias}
                      precision={2}
                      prefix={ganancias >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      valueStyle={{ color: ganancias >= 0 ? '#3f8600' : '#cf1322' }}
                      suffix="$"
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title="Margen de Ganancia"
                      value={margenGanancia}
                      precision={2}
                      valueStyle={{ color: margenGanancia >= 30 ? '#3f8600' : margenGanancia >= 15 ? '#faad14' : '#cf1322' }}
                      suffix="%"
                      prefix={<LineChartOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              <Divider orientation="left" style={{ margin: '24px 0 16px 0' }}>
                <Space>
                  <BarChartOutlined />
                  <span>Análisis Mensual</span>
                </Space>
              </Divider>

              <Table 
                columns={analisisMensualColumns} 
                dataSource={gananciasPorMes} 
                rowKey="mes"
                pagination={false}
              />

              <Divider orientation="left" style={{ margin: '24px 0 16px 0' }}>
                <Space>
                  <ShoppingOutlined />
                  <span>Ventas Recientes</span>
                </Space>
              </Divider>

              <Table 
                columns={ventasColumns} 
                dataSource={ventas.slice(0, 5)} 
                pagination={false}
                rowKey="id"
                size="small"
                footer={() => <Text type="secondary">Mostrando las 5 ventas más recientes</Text>}
              />
            </Card>
          </Space>
        </Spin>
      </div>
    </ConfigProvider>
  );
};

export default ReportesComponent;