import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Space, 
  Popconfirm, 
  Typography, 
  Statistic, 
  Divider,
  message,
  InputNumber,
  Modal
} from 'antd';
import { 
  SyncOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { useMediaQuery } from 'react-responsive';

const { Title, Text } = Typography;
const { Option } = Select;

const MaterialesComponent = () => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [materialEditando, setMaterialEditando] = useState(null);

  const isMobile = useMediaQuery({ maxWidth: 768 });

  const unidades = ['Kilogramos', 'Gramos', 'Unidades', 'Litros', 'Metros', 'Centímetros', 'Mililitros', 'Paquetes'];

  const cargarMateriales = async () => {
    setLoading(true);
    try {
      const materialesRef = collection(db, 'materiales');
      const q = query(materialesRef, orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      
      const listaMateriales = snapshot.docs.map(doc => ({
        id: doc.id, 
        ...doc.data(),
        fecha: doc.data().fecha?.toDate() || new Date()
      }));
      
      setMateriales(listaMateriales);
    } catch (error) {
      console.error('Error cargando materiales:', error);
      message.error('Error al cargar los materiales');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    try {
      if (materialEditando) {
        // Actualizar material existente
        const materialRef = doc(db, 'materiales', materialEditando.id);
        await updateDoc(materialRef, {
          nombre: values.nombre,
          cantidad: parseFloat(values.cantidad),
          unidad: values.unidad,
          precioTotal: parseFloat(values.precioTotal),
          fechaActualizacion: new Date()
        });
        message.success('Material actualizado exitosamente');
      } else {
        // Agregar nuevo material
        const materialesRef = collection(db, 'materiales');
        await addDoc(materialesRef, {
          nombre: values.nombre,
          cantidad: parseFloat(values.cantidad),
          unidad: values.unidad,
          precioTotal: parseFloat(values.precioTotal),
          fecha: new Date()
        });
        message.success('Material agregado exitosamente');
      }
      
      form.resetFields();
      setMaterialEditando(null);
      setModalVisible(false);
      cargarMateriales();
    } catch (error) {
      console.error('Error:', error);
      message.error('Error en la operación');
    }
  };

  const editarMaterial = (material) => {
    setMaterialEditando(material);
    form.setFieldsValue({
      nombre: material.nombre,
      cantidad: material.cantidad,
      unidad: material.unidad,
      precioTotal: material.precioTotal
    });
    setModalVisible(true);
  };

  const eliminarMaterial = async (id) => {
    try {
      const materialRef = doc(db, 'materiales', id);
      await deleteDoc(materialRef);
      message.success('Material eliminado');
      cargarMateriales();
    } catch (error) {
      console.error('Error:', error);
      message.error('Error al eliminar material');
    }
  };

  useEffect(() => {
    cargarMateriales();
  }, []);

  const totalGastosMateriales = materiales.reduce(
    (total, material) => total + material.precioTotal, 
    0
  );

  // Columnas para la tabla
  const columns = [
    {
      title: 'Material',
      dataIndex: 'nombre',
      key: 'nombre',
      sorter: (a, b) => a.nombre.localeCompare(b.nombre)
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      align: 'right',
      sorter: (a, b) => a.cantidad - b.cantidad
    },
    {
      title: 'Unidad',
      dataIndex: 'unidad',
      key: 'unidad',
      filters: unidades.map(u => ({ text: u, value: u })),
      onFilter: (value, record) => record.unidad === value
    },
    {
      title: 'Precio Total',
      dataIndex: 'precioTotal',
      key: 'precioTotal',
      align: 'right',
      render: (value) => `$${value.toFixed(2)}`,
      sorter: (a, b) => a.precioTotal - b.precioTotal
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      render: (fecha) => (
        <span>{fecha.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
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
            onClick={() => editarMaterial(record)} 
          />
          <Popconfirm
            title="¿Estás seguro de eliminar este material?"
            onConfirm={() => eliminarMaterial(record.id)}
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

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <div style={{ display: 'flex', 
    flexDirection: isMobile ? 'column' : 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    textAlign: 'center', 
    marginBottom: 20 }}>
            <Space align="center">
              <ToolOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Gestión de Materiales
              </Title>
            </Space>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setMaterialEditando(null);
                form.resetFields();
                setModalVisible(true);
              }}
              style={{ marginTop: isMobile ? 10 : 0, fontSize: isMobile ? 12 : 14 }}
            >
              Nuevo Material
            </Button>
          </div>

          <Divider style={{ margin: '0 0 20px 0' }} />
          
          <div style={{ display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    textAlign: 'center', 
    marginBottom: 20}}>
            <Text style={{ fontSize: isMobile ? 12 : 14 }}>
              Total de {materiales.length} materiales registrados
            </Text>
            
            <Space style={{ marginTop: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button 
                icon={<SyncOutlined />} 
                onClick={cargarMateriales}
                style={{ fontSize: isMobile ? 12 : 14 }}
              >
                Actualizar
              </Button>
              <Statistic 
                title="Total Gastos" 
                value={totalGastosMateriales} 
                precision={2} 
                prefix="$" 
                style={{ marginLeft: isMobile ? 0 : 20 }}
              />
            </Space>
          </div>
          
          <Table 
            columns={columns} 
            dataSource={materiales} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            scroll={{ x: "max-content" }} 
          />
        </Card>
      </Space>

      {/* Modal para agregar/editar material */}
      <Modal
        title={materialEditando ? "Editar Material" : "Agregar Nuevo Material"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setMaterialEditando(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="nombre"
            label="Nombre del Material"
            rules={[{ required: true, message: 'Por favor ingrese el nombre del material' }]}
          >
            <Input placeholder="Ejemplo: Madera, Tela, Pintura, etc." />
          </Form.Item>
          
          <Form.Item
            name="cantidad"
            label="Cantidad"
            rules={[{ required: true, message: 'Por favor ingrese la cantidad' }]}
          >
            <InputNumber 
              min={0.01} 
              step={0.01} 
              style={{ width: '100%' }} 
              placeholder="Cantidad" 
            />
          </Form.Item>
          
          <Form.Item
            name="unidad"
            label="Unidad"
            rules={[{ required: true, message: 'Por favor seleccione la unidad' }]}
          >
            <Select placeholder="Seleccione una unidad">
              {unidades.map(unidad => (
                <Option key={unidad} value={unidad}>{unidad}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="precioTotal"
            label="Precio Total"
            rules={[{ required: true, message: 'Por favor ingrese el precio total' }]}
          >
            <InputNumber 
              min={0.01} 
              step={0.01} 
              style={{ width: '100%' }} 
              prefix="$" 
              placeholder="Precio total" 
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setMaterialEditando(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SaveOutlined />}
              >
                {materialEditando ? 'Actualizar' : 'Guardar'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaterialesComponent;