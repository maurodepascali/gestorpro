import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Card,
  Input, 
  message, 
  Popconfirm,
  Typography,
  Space,
  Tag,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HistoryOutlined,
  ProductOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

import { useMediaQuery } from 'react-responsive';

const { Title,Text } = Typography;

// Función segura para convertir Firestore timestamp a Date
const toDate = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Si no es un timestamp válido, devolver la fecha actual
  return new Date();
};

// Función segura para formatear fechas
const formatearFecha = (fecha) => {
  try {
    if (!fecha) return "N/A";
    
    const fechaObj = fecha instanceof Date ? fecha : toDate(fecha);
    
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Fecha inválida";
  }
};

const ProductosComponent = () => {
  const [productos, setProductos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [form] = Form.useForm();

  const isMobile = useMediaQuery({ maxWidth: 768 });

  useEffect(() => {
    const productosRef = collection(db, 'productos');
    const q = query(productosRef, orderBy('fechaAgregado', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaProductos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre || '',
          cantidad: data.cantidad || 0,
          fechaAgregado: toDate(data.fechaAgregado),
          fechaActualizacion: toDate(data.fechaActualizacion || data.fechaAgregado)
        };
      });
      setProductos(listaProductos);
    });

    return () => unsubscribe();
  }, []);

  const handleAgregar = async (values) => {
    try {
      const ahora = new Date();
      
      if (productoActual) {
        // Actualizar producto
        const productoRef = doc(db, 'productos', productoActual.id);
        await updateDoc(productoRef, {
          ...values,
          fechaActualizacion: ahora
        });
        message.success('Producto actualizado');
      } else {
        // Agregar nuevo producto
        await addDoc(collection(db, 'productos'), {
          ...values,
          fechaAgregado: ahora,
          fechaActualizacion: ahora
        });
        message.success('Producto agregado');
      }
      setModalVisible(false);
      form.resetFields();
      setProductoActual(null);
    } catch (error) {
      console.error("Error:", error);
      message.error('Error en la operación');
    }
  };

  const handleEliminar = async (id) => {
    try {
      await deleteDoc(doc(db, 'productos', id));
      message.success('Producto eliminado');
    } catch (error) {
      console.error("Error:", error);
      message.error('Error al eliminar');
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre)
    },
    {
      title: 'Stock',
      dataIndex: 'cantidad',
      key: 'cantidad',
      render: (cantidad) => (
        <Tag color={cantidad < 10 ? 'red' : 'green'}>
          {cantidad}
        </Tag>
      ),
      sorter: (a, b) => a.cantidad - b.cantidad, // Ordena numéricamente
      defaultSortOrder: 'descend'
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'fechaAgregado',
      key: 'fechaAgregado',
      render: (fechaAgregado) => (
        <span>{fechaAgregado.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
        })}</span>
      ),
      sorter: (a, b) => new Date(b.fechaAgregado) - new Date(a.fechaAgregado),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Última Actualización',
      dataIndex: 'fechaActualizacion',
      key: 'fechaActualizacion',
      render: (fecfechaActualizacionha) => (
        <Tooltip title={toDate(fecfechaActualizacionha).toLocaleString('es-ES')}>
          <Space>
            <HistoryOutlined />
            {formatearFecha(fecfechaActualizacionha)}
          </Space>
        </Tooltip>
      ),
      sorter: (a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion),
      defaultSortOrder: 'descend'
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => {
              setProductoActual(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          />
          <Popconfirm
            title="¿Estás seguro de eliminar?"
            onConfirm={() => handleEliminar(record.id)}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
      <div style={{ display: 'flex', 
    flexDirection: isMobile ? 'column' : 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    textAlign: 'center', 
    marginBottom: 20   }}>
            <Space align="center">
              <ProductOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Gestión de Productos
              </Title>
            </Space>
            
            <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setModalVisible(true);
            setProductoActual(null);
            form.resetFields();
          }}
          style={{ marginTop: isMobile ? 10 : 0, fontSize: isMobile ? 12 : 14 }}
        >
          Nuevo Producto
        </Button>
          </div>
      </Card>  
      </Space>

      <Table 
  columns={columns} 
  dataSource={productos} 
  rowKey="id"
  pagination={{ pageSize: 10 }}
  scroll={{ x: "max-content" }} // Permite desplazamiento horizontal en pantallas pequeñas
/>

<Modal
  title={productoActual ? "Editar Producto" : "Nuevo Producto"}
  open={modalVisible}
  onCancel={() => {
    setModalVisible(false);
    setProductoActual(null);
  }}
  footer={null}
  width={window.innerWidth < 600 ? "90%" : 520} // Ajusta el ancho del modal en móviles
>
  <Form
    form={form}
    layout="vertical"
    onFinish={handleAgregar}
    style={{ width: "100%" }} // Hace que el formulario ocupe todo el ancho
  >
    <Form.Item
      name="nombre"
      label="Nombre"
      rules={[{ required: true, message: 'Nombre obligatorio' }]}
    >
      <Input placeholder="Nombre del producto" size="large" />
    </Form.Item>
    <Form.Item
      name="cantidad"
      label="Cantidad"
      rules={[{ required: true, message: 'Cantidad obligatoria' }]}
    >
      <Input type="number" placeholder="Stock" size="large" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" block size="large">
        {productoActual ? 'Actualizar' : 'Crear'}
      </Button>
    </Form.Item>
  </Form>
</Modal>


    </div>
  );
};

export default ProductosComponent;