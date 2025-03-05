import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Form, 
  Select, 
  InputNumber, 
  Button, 
  Card, 
  Space, 
  Popconfirm, 
  Typography, 
  Statistic, 
  Divider,
  message,
  Modal
} from 'antd';
import { 
  SyncOutlined, 
  ShoppingCartOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { safeFormat, safeFormatDate } from './firebaseDataHelper';

const { Title, Text } = Typography;
const { Option } = Select;

// Calcular el total de las ventas
export const calcularTotalVentas = (ventas) => {
  return ventas.reduce((total, venta) => {
    const precioVenta = parseFloat(venta.precio) || 0;
    return total + precioVenta;
  }, 0);
};

const VentasComponent = () => {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [ventaEditada, setVentaEditada] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar productos y ventas
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const productosRef = collection(db, 'productos');
      const ventasRef = collection(db, 'ventas');
      
      // Ordenar las ventas por fecha (más reciente primero)
      const q = query(ventasRef, orderBy('fecha', 'desc'));
      
      const productosSnapshot = await getDocs(productosRef);
      const ventasSnapshot = await getDocs(q);

      const listaProductos = productosSnapshot.docs.map(doc => ({
        id: doc.id, 
        nombre: safeFormat(doc.data().nombre, 'string'),
        cantidad: safeFormat(doc.data().cantidad),
        precio: safeFormat(doc.data().precio)
      }));
      
      const listaVentas = ventasSnapshot.docs.map(doc => {
        const ventaData = doc.data();
        return {
          id: doc.id,
          productoId: ventaData.productoId,
          nombreProducto: safeFormat(ventaData.nombreProducto, 'string'),
          cantidad: safeFormat(ventaData.cantidad),
          precio: safeFormat(ventaData.precio),
          fecha: ventaData.fecha?.toDate?.() || new Date()
        };
      });

      setProductos(listaProductos);
      setVentas(listaVentas);
    } catch (error) {
      console.error('Error cargando datos:', error);
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Registrar o actualizar venta
  // La función para actualizar una venta debe corregirse así:
const onFinish = async (values) => {
  try {
    const producto = productos.find(p => p.id === values.productoId);
    
    // Si estamos editando una venta
    if (ventaEditada) {
      // Obtenemos la cantidad anterior de la venta
      const cantidadAnterior = ventaEditada.cantidad;
      const nuevaCantidad = parseInt(values.cantidad);
      
      // Calculamos la diferencia que afectará al inventario
      // Si la nueva cantidad es mayor, hay que restar más unidades
      // Si la nueva cantidad es menor, hay que devolver unidades
      const diferencia = nuevaCantidad - cantidadAnterior;
      
      // Verificamos si hay suficiente stock disponible para el cambio
      if (diferencia > 0 && producto.cantidad < diferencia) {
        message.error(`Stock insuficiente. Solo hay ${producto.cantidad} unidades disponibles.`);
        return;
      }
      
      // Actualizamos la venta existente
      const ventaRef = doc(db, 'ventas', ventaEditada.id);
      await updateDoc(ventaRef, {
        productoId: values.productoId,
        nombreProducto: producto.nombre,
        cantidad: nuevaCantidad,
        precio: parseFloat(values.precio),
        fecha: new Date()
      });

      // Actualizamos el stock sumando la cantidad anterior y luego restando la nueva
      const productoRef = doc(db, 'productos', producto.id);
      await updateDoc(productoRef, { 
        cantidad: producto.cantidad - diferencia
      });

      message.success('Venta actualizada exitosamente');
    } else {
      // Para una venta nueva, la lógica se mantiene igual
      if (parseInt(values.cantidad) > producto.cantidad) {
        message.error(`Stock insuficiente. Solo hay ${producto.cantidad} unidades disponibles.`);
        return;
      }
      
      // Registrar nueva venta
      const ventaRef = collection(db, 'ventas');
      await addDoc(ventaRef, {
        productoId: values.productoId,
        nombreProducto: producto.nombre,
        cantidad: parseInt(values.cantidad),
        precio: parseFloat(values.precio),
        fecha: new Date()
      });

      // Actualizamos el stock
      const productoRef = doc(db, 'productos', producto.id);
      await updateDoc(productoRef, { 
        cantidad: producto.cantidad - parseInt(values.cantidad)
      });

      message.success('Venta registrada exitosamente');
    }

    form.resetFields();
    setVentaEditada(null);
    setModalVisible(false);
    cargarDatos();
  } catch (error) {
    console.error('Error registrando venta:', error);
    message.error('Error al registrar venta');
  }
};

  // Editar venta
  const editarVenta = (venta) => {
    setVentaEditada(venta);
    form.setFieldsValue({
      productoId: venta.productoId,
      cantidad: venta.cantidad,
      precio: venta.precio
    });
    setModalVisible(true);
  };

  // Eliminar venta
  // Eliminar venta - Función corregida
const eliminarVenta = async (ventaId) => {
  try {
    // Obtener la venta que se elimina
    const ventaRef = doc(db, 'ventas', ventaId);
    const ventaDoc = await getDoc(ventaRef);
    
    if (ventaDoc.exists()) {
      const ventaData = ventaDoc.data();
      const productoId = ventaData.productoId;
      const cantidadVendida = ventaData.cantidad;

      // Recuperar el producto correspondiente
      const productoRef = doc(db, 'productos', productoId);
      const productoDoc = await getDoc(productoRef);
      
      if (productoDoc.exists()) {
        const productoData = productoDoc.data();
        const nuevaCantidad = parseInt(productoData.cantidad) + parseInt(cantidadVendida);

        // Actualizar la cantidad del producto
        await updateDoc(productoRef, { cantidad: nuevaCantidad });

        // Eliminar la venta de la colección de ventas
        await deleteDoc(ventaRef);

        message.success('Venta eliminada y stock restaurado');
        cargarDatos(); // Recargar datos
      } else {
        // Si el producto ya no existe, solo eliminamos la venta
        await deleteDoc(ventaRef);
        message.warning('Venta eliminada pero el producto ya no existe');
        cargarDatos(); // Recargar datos
      }
    } else {
      message.error('No se encontró la venta');
    }
  } catch (error) {
    console.error("Error eliminando venta:", error);
    message.error(`Error al eliminar venta: ${error.message}`);
  }
};

  // Filtrar productos con stock disponible
  const productosDisponibles = productos.filter(p => p.cantidad > 0);

  // Columnas para la tabla de ventas
  const columns = [
    {
      title: 'Producto',
      dataIndex: 'nombreProducto',
      key: 'nombreProducto',
      sorter: (a, b) => a.nombreProducto.localeCompare(b.nombreProducto)
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      align: 'center',
      sorter: (a, b) => a.cantidad - b.cantidad
    },
    {
      title: 'Precio ($)',
      dataIndex: 'precio',
      key: 'precio',
      align: 'right',
      render: (precio) => parseFloat(precio).toFixed(2),
      sorter: (a, b) => a.precio - b.precio
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => (
        <span>{fecha.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      ),
      sorter: (a, b) => new Date(b.fecha) - new Date(a.fecha),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => editarVenta(record)} 
          />
          <Popconfirm
            title="¿Estás seguro de eliminar esta venta?"
            description="Esta acción restaurará el stock del producto"
            onConfirm={() => eliminarVenta(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular el total de ventas
  const totalVentas = calcularTotalVentas(ventas);

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Space align="center">
              <ShoppingCartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                Gestión de Ventas
              </Title>
            </Space>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setVentaEditada(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Nueva Venta
            </Button>
          </div>

          <Divider style={{ margin: '0 0 20px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text>
              Total de {ventas.length} ventas registradas
            </Text>
            
            <Space>
              <Button 
                icon={<SyncOutlined />} 
                onClick={cargarDatos}
              >
                Actualizar
              </Button>
              <Statistic 
                title="Total Ventas" 
                value={totalVentas} 
                precision={2} 
                prefix="$" 
                style={{ marginLeft: 20 }}
              />
            </Space>
          </div>
          
          <Table 
            columns={columns} 
            dataSource={ventas} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            loading={loading}
          />
        </Card>
      </Space>

      {/* Modal para agregar/editar venta */}
      <Modal
        title={ventaEditada ? "Editar Venta" : "Registrar Nueva Venta"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setVentaEditada(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="productoId"
            label="Producto"
            rules={[{ required: true, message: 'Por favor seleccione un producto' }]}
          >
            <Select 
              placeholder="Seleccionar Producto"
              showSearch
              optionFilterProp="children"
            >
              {productosDisponibles.map(producto => (
                <Option key={producto.id} value={producto.id}>
                  {producto.nombre} (Stock: {safeFormat(producto.cantidad)})
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="cantidad"
            label="Cantidad"
            rules={[{ required: true, message: 'Por favor ingrese la cantidad' }]}
          >
            <InputNumber 
              min={1} 
              placeholder="Cantidad" 
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="precio"
            label="Precio"
            rules={[{ required: true, message: 'Por favor ingrese el precio' }]}
          >
            <InputNumber 
              min={0.01} 
              precision={2}
              prefix="$"
              placeholder="Precio de venta" 
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setVentaEditada(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SaveOutlined />}
              >
                {ventaEditada ? 'Actualizar' : 'Guardar'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VentasComponent;