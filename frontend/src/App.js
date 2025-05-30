import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import 'antd/dist/reset.css';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ModelsModern from './pages/ModelsModern';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectWorkspace from './pages/ProjectWorkspace';
// Removed: Datasets, DatasetDetailModern, Annotate, ActiveLearningDashboard
// These will be integrated into Projects

const { Header, Content } = Layout;

function App() {
  return (
    <Router>
      <Routes>
        {/* Project Workspace - Full screen layout without navbar */}
        <Route path="/projects/:projectId/workspace" element={<ProjectWorkspace />} />
        
        {/* Main app layout with navbar */}
        <Route path="/*" element={
          <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ padding: 0 }}>
              <Navbar />
            </Header>
            <Content style={{ padding: '24px' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/models" element={<ModelsModern />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                {/* Removed standalone routes: /datasets, /annotate, /active-learning */}
                {/* These features will be integrated within project workflows */}
              </Routes>
            </Content>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;