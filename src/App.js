import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button } from 'antd';
import { 
  ProductOutlined, 
  ShoppingCartOutlined, 
  InboxOutlined, 
  BarChartOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import ProductosComponent from './Productos';
import VentasComponent from './Ventas';
import MaterialesComponent from './Materiales';
import ReportesComponent from './Reportes';

const { Content, Sider, Header, Footer } = Layout;

const App = () => {
  const [seccionActual, setSeccionActual] = useState('productos');
  const [collapsed, setCollapsed] = useState(true);

  const secciones = [
    { 
      key: 'productos', 
      nombre: 'Productos', 
      icono: <ProductOutlined />,
      componente: <ProductosComponent /> 
    },
    { 
      key: 'ventas', 
      nombre: 'Ventas', 
      icono: <ShoppingCartOutlined />,
      componente: <VentasComponent /> 
    },
    { 
      key: 'materiales', 
      nombre: 'Materiales', 
      icono: <InboxOutlined />,
      componente: <MaterialesComponent /> 
    },
    { 
      key: 'reportes', 
      nombre: 'Reportes', 
      icono: <BarChartOutlined />,
      componente: <ReportesComponent /> 
    }
  ];

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  // Manejador para cuando se hace clic en un ítem del menú
  const handleMenuClick = (key) => {
    setSeccionActual(key);
    setCollapsed(true); // Cerrar siempre el menú al seleccionar una opción
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: '0 16px', 
        background: '#1890ff', 
        display: 'flex', 
        alignItems: 'center',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{ fontSize: '16px', color: 'white' }}
        />
        <div style={{ 
          color: 'white', 
          fontSize: '20px', 
          fontWeight: 'bold',
          marginLeft: '20px'
        }}>
          GestorPro
        </div>
      </Header>
      
      <Layout style={{ marginTop: 64 }}>
        <Sider 
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="dark" 
          width={220}
          collapsedWidth={0}
          style={{ 
            overflow: 'auto', 
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: 64,
            background: 'linear-gradient(to bottom, #1890ff, #0050b3)',
            transition: 'all 0.2s',
            zIndex: 999,
            boxShadow: collapsed ? 'none' : '2px 0 8px rgba(0,0,0,0.15)'
          }}
        >
          <Menu 
            theme="dark" 
            mode="inline" 
            selectedKeys={[seccionActual]}
            style={{ background: 'transparent', paddingTop: '10px' }}
          >
            {secciones.map(seccion => (
              <Menu.Item 
                key={seccion.key} 
                icon={seccion.icono}
                onClick={() => handleMenuClick(seccion.key)}
              >
                {seccion.nombre}
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
        
        <Layout style={{ 
          marginLeft: collapsed ? 0 : 220,
          transition: 'margin-left 0.2s',
          background: '#f0f2f5'
        }}>
          <Content 
            style={{ 
              margin: '24px 16px', 
              padding: 24, 
              background: '#fff',
              borderRadius: '8px',
              minHeight: 'calc(100vh - 64px - 70px - 48px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            {secciones.find(seccion => seccion.key === seccionActual)?.componente}
          </Content>
          
          <Footer 
            style={{ 
              textAlign: 'center', 
              background: 'transparent', 
              height: '70px'
            }}
          >
            © {new Date().getFullYear()} Mauro De Pascali - Todos los derechos reservados
          </Footer>
        </Layout>
      </Layout>
      
      {/* Overlay para cerrar menú al hacer clic fuera */}
      {!collapsed && (
        <div 
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 998
          }}
          onClick={() => setCollapsed(true)}
        />
      )}
    </Layout>
  );
};

export default App;