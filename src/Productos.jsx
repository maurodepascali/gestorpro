import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
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
  HistoryOutlined
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

const { Text } = Typography;

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
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Stock',
      dataIndex: 'cantidad',
      key: 'cantidad',
      render: (cantidad) => (
        <Tag color={cantidad < 10 ? 'red' : 'green'}>
          {cantidad}
        </Tag>
      )
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'fechaAgregado',
      key: 'fechaAgregado',
      render: (fecha) => formatearFecha(fecha)
    },
    {
      title: 'Última Actualización',
      dataIndex: 'fechaActualizacion',
      key: 'fechaActualizacion',
      render: (fecha) => (
        <Tooltip title={toDate(fecha).toLocaleString('es-ES')}>
          <Space>
            <HistoryOutlined />
            {formatearFecha(fecha)}
          </Space>
        </Tooltip>
      )
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
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setModalVisible(true);
            setProductoActual(null);
            form.resetFields();
          }}
        >
          Nuevo Producto
        </Button>
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