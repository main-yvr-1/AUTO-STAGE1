import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Menu,
  Typography,
  Card,
  Button,
  Upload,
  message,
  Tag,
  Space,
  Divider,
  Progress,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  Spin,
  Alert,
  Dropdown,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  InboxOutlined,
  PictureOutlined,
  DatabaseOutlined,
  TagOutlined,
  RobotOutlined,
  EyeOutlined,
  DeploymentUnitOutlined,
  BulbOutlined,
  HistoryOutlined,
  SettingOutlined,
  FolderOutlined,
  CloudUploadOutlined,
  YoutubeOutlined,
  ApiOutlined,
  CloudOutlined,
  PlusOutlined,
  MoreOutlined,
  ExportOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import { projectsAPI, handleAPIError } from '../services/api';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('upload');
  const [uploading, setUploading] = useState(false);

  // Load project details
  const loadProject = async () => {
    setLoading(true);
    try {
      const projectData = await projectsAPI.getProject(projectId);
      setProject(projectData);
    } catch (error) {
      const errorInfo = handleAPIError(error);
      message.error(`Failed to load project: ${errorInfo.message}`);
      console.error('Load project error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Get project type info for styling
  const getProjectTypeInfo = (type) => {
    const typeInfo = {
      'object_detection': { color: 'blue', label: 'Object Detection' },
      'classification': { color: 'green', label: 'Classification' },
      'segmentation': { color: 'purple', label: 'Instance Segmentation' }
    };
    return typeInfo[type] || { color: 'default', label: type };
  };

  const [batchName, setBatchName] = useState('');
  const [tags, setTags] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileInputRef, setFileInputRef] = useState(null);
  const [folderInputRef, setFolderInputRef] = useState(null);
  const [recentImages, setRecentImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [managementData, setManagementData] = useState(null);
  const [loadingManagement, setLoadingManagement] = useState(false);
  
  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingDataset, setRenamingDataset] = useState(null);
  const [newDatasetName, setNewDatasetName] = useState('');

  // Handle file selection
  const handleFileSelect = () => {
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  const handleFolderSelect = () => {
    if (folderInputRef) {
      folderInputRef.click();
    }
  };

  // Load recent images for this project
  const loadRecentImages = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/images?limit=12`);
      if (response.ok) {
        const data = await response.json();
        setRecentImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to load recent images:', error);
    }
  };

  // Load recent images when component mounts
  useEffect(() => {
    if (projectId) {
      loadRecentImages();
    }
  }, [projectId]);

  // Load management data
  const loadManagementData = async () => {
    setLoadingManagement(true);
    try {
      const data = await projectsAPI.getProjectManagementData(projectId);
      setManagementData(data);
    } catch (error) {
      const errorInfo = handleAPIError(error);
      message.error(`Failed to load management data: ${errorInfo.message}`);
      console.error('Load management data error:', error);
    } finally {
      setLoadingManagement(false);
    }
  };

  // Load management data when switching to management tab
  useEffect(() => {
    if (projectId && selectedKey === 'management') {
      loadManagementData();
    }
  }, [projectId, selectedKey]);

  // Dataset management functions
  const handleAssignToAnnotating = async (dataset) => {
    try {
      await projectsAPI.assignDatasetToAnnotating(projectId, dataset.id);
      message.success(`Dataset "${dataset.name}" assigned to annotating`);
      // Reload management data to reflect changes
      loadManagementData();
    } catch (error) {
      const errorInfo = handleAPIError(error);
      message.error(`Failed to assign dataset: ${errorInfo.message}`);
      console.error('Assign dataset error:', error);
    }
  };

  const handleRenameDataset = (dataset) => {
    setRenamingDataset(dataset);
    setNewDatasetName(dataset.name);
    setRenameModalVisible(true);
  };

  const handleRenameConfirm = async () => {
    if (!newDatasetName.trim()) {
      message.error('Dataset name cannot be empty');
      return;
    }

    try {
      await projectsAPI.renameDataset(projectId, renamingDataset.id, newDatasetName.trim());
      message.success(`Dataset renamed to "${newDatasetName}"`);
      setRenameModalVisible(false);
      setRenamingDataset(null);
      setNewDatasetName('');
      // Reload management data to reflect changes
      loadManagementData();
    } catch (error) {
      const errorInfo = handleAPIError(error);
      message.error(`Failed to rename dataset: ${errorInfo.message}`);
      console.error('Rename dataset error:', error);
    }
  };

  const handleDeleteDataset = async (dataset) => {
    Modal.confirm({
      title: 'Delete Dataset',
      content: `Are you sure you want to delete "${dataset.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await projectsAPI.deleteProjectDataset(projectId, dataset.id);
          message.success(`Dataset "${dataset.name}" deleted successfully`);
          // Reload management data to reflect changes
          loadManagementData();
        } catch (error) {
          const errorInfo = handleAPIError(error);
          message.error(`Failed to delete dataset: ${errorInfo.message}`);
          console.error('Delete dataset error:', error);
        }
      }
    });
  };

  // Upload configuration
  const uploadProps = {
    name: 'files',
    multiple: true,
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      try {
        setUploading(true);
        setUploadProgress(0);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('batch_name', batchName || `Uploaded on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`);
        formData.append('tags', JSON.stringify(tags));

        // Simulate progress for better UX
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 100);

        const response = await fetch(`/api/v1/projects/${projectId}/upload`, {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (response.ok) {
          const result = await response.json();
          setUploadedFiles(prev => [...prev, { ...result, file }]);
          onSuccess(result);
          message.success(`${file.name} uploaded successfully!`);
          
          // Reload recent images and project stats
          loadRecentImages();
          loadProject();
        } else {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        onError(error);
        message.error(`Failed to upload ${file.name}: ${error.message}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    accept: '.jpg,.jpeg,.png,.bmp,.webp,.avif',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error(`${file.name} is not an image file`);
        return false;
      }
      
      const isLt20M = file.size / 1024 / 1024 < 20;
      if (!isLt20M) {
        message.error(`${file.name} must be smaller than 20MB!`);
        return false;
      }
      
      return true;
    },
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
  };

  // Sidebar menu items
  const menuItems = [
    {
      key: 'data',
      label: 'DATA',
      type: 'group',
      children: [
        {
          key: 'upload',
          icon: <UploadOutlined />,
          label: 'Upload Data',
        },
        {
          key: 'management',
          icon: <TagOutlined />,
          label: 'Management',
        },
        {
          key: 'dataset',
          icon: <DatabaseOutlined />,
          label: 'Dataset',
        },
        {
          key: 'versions',
          icon: <HistoryOutlined />,
          label: 'Versions',
        },
      ],
    },
    {
      key: 'models',
      label: 'MODELS',
      type: 'group',
      children: [
        {
          key: 'models',
          icon: <RobotOutlined />,
          label: 'Models',
        },
        {
          key: 'visualize',
          icon: <EyeOutlined />,
          label: 'Visualize',
        },
      ],
    },
    {
      key: 'deploy',
      label: 'DEPLOY',
      type: 'group',
      children: [
        {
          key: 'deployments',
          icon: <DeploymentUnitOutlined />,
          label: 'Deployments',
        },
        {
          key: 'active-learning',
          icon: <BulbOutlined />,
          label: 'Active Learning',
        },
      ],
    },
  ];

  // Render content based on selected menu item
  const renderContent = () => {
    switch (selectedKey) {
      case 'upload':
        return renderUploadContent();
      case 'management':
        return renderManagementContent();
      case 'dataset':
        return renderDatasetContent();
      case 'versions':
        return renderVersionsContent();
      case 'models':
        return renderModelsContent();
      case 'visualize':
        return renderVisualizeContent();
      case 'deployments':
        return renderDeploymentsContent();
      case 'active-learning':
        return renderActiveLearningContent();
      default:
        return renderUploadContent();
    }
  };

  const renderUploadContent = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
          <UploadOutlined style={{ marginRight: '8px' }} />
          Upload
        </Title>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Batch Name:</Text>
            </div>
            <Input 
              placeholder={`Uploaded on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`}
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong>Tags:</Text>
              <Text type="secondary" style={{ marginLeft: '8px' }}>
                <SettingOutlined />
              </Text>
            </div>
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Search or add tags for images..."
              value={tags}
              onChange={setTags}
              tokenSeparators={[',']}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Dragger {...uploadProps} style={{ marginBottom: '24px' }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: '18px', fontWeight: 500 }}>
            Drag and drop file(s) to upload, or:
          </p>
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              icon={<FolderOutlined />} 
              style={{ marginRight: '8px' }}
              onClick={handleFileSelect}
            >
              Select File(s)
            </Button>
            <Button 
              icon={<FolderOutlined />}
              onClick={handleFolderSelect}
            >
              Select Folder
            </Button>
            
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={setFileInputRef}
              style={{ display: 'none' }}
              multiple
              accept=".jpg,.jpeg,.png,.bmp,.webp,.avif"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                  uploadProps.customRequest({
                    file,
                    onSuccess: () => {},
                    onError: () => {},
                    onProgress: () => {}
                  });
                });
              }}
            />
            <input
              type="file"
              ref={setFolderInputRef}
              style={{ display: 'none' }}
              webkitdirectory=""
              multiple
              accept=".jpg,.jpeg,.png,.bmp,.webp,.avif"
              onChange={(e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                  uploadProps.customRequest({
                    file,
                    onSuccess: () => {},
                    onError: () => {},
                    onProgress: () => {}
                  });
                });
              }}
            />
          </div>
        </Dragger>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={4} style={{ color: '#666' }}>Supported Formats</Title>
          <Row gutter={[24, 16]} justify="center">
            <Col>
              <div style={{ textAlign: 'center' }}>
                <PictureOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <div style={{ marginTop: '8px' }}>
                  <Text strong>Images</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    .jpg, .png, .bmp, .webp, .avif
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    in 26 formats
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <TagOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                <div style={{ marginTop: '8px' }}>
                  <Text strong>Annotations</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    .mov, .mp4
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <PictureOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                <div style={{ marginTop: '8px' }}>
                  <Text strong>Videos</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    .pdf
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <DatabaseOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />
                <div style={{ marginTop: '8px' }}>
                  <Text strong>PDFs</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    .pdf
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            (Max size of 20MB and 16,000 pixels).
          </Text>
        </div>

        <Divider />

        <div style={{ marginBottom: '24px' }}>
          <Title level={5}>Need images to get started? We've got you covered.</Title>
          
          <Card size="small" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <DatabaseOutlined style={{ fontSize: '20px', color: '#722ed1', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <Text strong>Search on Roboflow Universe: World's Largest Platform for Computer Vision Data</Text>
              </div>
            </div>
            <Input 
              placeholder="Search images and annotations from 600k datasets and 400 million images (e.g. cars, people)"
              suffix={<Button type="primary" size="small">→</Button>}
              style={{ marginTop: '12px' }}
            />
          </Card>

          <Card size="small" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <YoutubeOutlined style={{ fontSize: '20px', color: '#ff4d4f', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <Text strong>Import YouTube Video</Text>
              </div>
            </div>
            <Input 
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              suffix={<Button type="primary" size="small">→</Button>}
              style={{ marginTop: '12px' }}
            />
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ApiOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '12px' }} />
                  <Text strong>Collect Images via the Upload API</Text>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <CloudOutlined style={{ fontSize: '20px', color: '#52c41a', marginRight: '12px' }} />
                  <Text strong>Import From Cloud Providers</Text>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Card>

      {/* Upload Progress and Results */}
      {(uploading || uploadedFiles.length > 0) && (
        <Card title="Upload Status" style={{ marginTop: '24px' }}>
          {uploading && (
            <div style={{ marginBottom: '16px' }}>
              <Text>Uploading files...</Text>
              <Progress percent={uploadProgress} status="active" />
            </div>
          )}
          
          {uploadedFiles.length > 0 && (
            <div>
              <Title level={5}>Recently Uploaded ({uploadedFiles.length} files)</Title>
              <Row gutter={[16, 16]}>
                {uploadedFiles.slice(-6).map((fileInfo, index) => (
                  <Col span={4} key={index}>
                    <Card
                      size="small"
                      cover={
                        <div style={{ 
                          height: '80px', 
                          background: '#f5f5f5', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <PictureOutlined style={{ fontSize: '24px', color: '#999' }} />
                        </div>
                      }
                    >
                      <Card.Meta 
                        title={
                          <Text ellipsis style={{ fontSize: '12px' }}>
                            {fileInfo.file?.name || 'Unknown'}
                          </Text>
                        }
                        description={
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {fileInfo.file?.size ? `${(fileInfo.file.size / 1024).toFixed(1)} KB` : ''}
                          </Text>
                        }
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
              
              {uploadedFiles.length > 6 && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Button type="link">
                    View all {uploadedFiles.length} uploaded files
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );

  // Render dataset card
  const renderDatasetCard = (dataset, status) => {
    const getStatusIcon = () => {
      switch (status) {
        case 'unassigned': return <ClockCircleOutlined style={{ color: '#faad14' }} />;
        case 'annotating': return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
        case 'completed': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        default: return <DatabaseOutlined />;
      }
    };

    const getProgressPercent = () => {
      if (dataset.total_images === 0) return 0;
      return Math.round((dataset.labeled_images / dataset.total_images) * 100);
    };

    // Dropdown menu items for three dots
    const menuItems = [
      {
        key: 'rename',
        label: 'Rename',
        icon: <EditOutlined />,
        onClick: () => handleRenameDataset(dataset)
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDeleteDataset(dataset)
      }
    ];

    return (
      <Card
        key={dataset.id}
        size="small"
        style={{ 
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: '1px solid #f0f0f0',
          position: 'relative'
        }}
        hoverable
        bodyStyle={{ padding: '12px' }}
        onClick={() => {
          if (status === 'annotating') {
            // Navigate to annotation page
            message.info(`Opening annotation for ${dataset.name}`);
          }
        }}
      >
        {/* Three dots button in top right corner */}
        <div style={{ 
          position: 'absolute', 
          top: '8px', 
          right: '8px', 
          zIndex: 10 
        }}>
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />} 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
              }}
              style={{ 
                border: 'none',
                boxShadow: 'none',
                padding: '4px'
              }}
            />
          </Dropdown>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', paddingRight: '24px' }}>
          {getStatusIcon()}
          <Text strong style={{ marginLeft: '8px', fontSize: '14px' }}>
            {dataset.name}
          </Text>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {dataset.total_images} images
          </Text>
          {status === 'annotating' && (
            <div style={{ marginTop: '4px' }}>
              <Progress 
                percent={getProgressPercent()} 
                size="small" 
                status={getProgressPercent() === 100 ? 'success' : 'active'}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {dataset.labeled_images}/{dataset.total_images} labeled
              </Text>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {new Date(dataset.created_at).toLocaleDateString()}
          </Text>
          {status === 'unassigned' && (
            <Button 
              type="primary" 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAssignToAnnotating(dataset);
              }}
            >
              Assign to Annotating
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderManagementContent = () => {
    if (loadingManagement) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading management data...</Text>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              <TagOutlined style={{ marginRight: '8px' }} />
              Management
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Text type="secondary">Sort By:</Text>
              <Select defaultValue="newest" style={{ width: 120 }}>
                <Select.Option value="newest">Newest</Select.Option>
                <Select.Option value="oldest">Oldest</Select.Option>
                <Select.Option value="name">Name</Select.Option>
              </Select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button icon={<SettingOutlined />}>
              Roboflow Labeling
            </Button>
            <Button type="primary" icon={<PlusOutlined />}>
              New Version
            </Button>
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {/* Unassigned Section */}
          <Col span={8}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Unassigned</Text>
                  <Text type="secondary">{managementData?.unassigned?.count || 0} Datasets</Text>
                </div>
              }
              style={{ height: '500px', overflow: 'auto' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button type="link" icon={<UploadOutlined />} onClick={() => setSelectedKey('upload')}>
                  Upload More Images
                </Button>
              </div>
              
              {managementData?.unassigned?.datasets?.length > 0 ? (
                managementData.unassigned.datasets.map(dataset => 
                  renderDatasetCard(dataset, 'unassigned')
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Text type="secondary">No unassigned datasets found.</Text>
                </div>
              )}
            </Card>
          </Col>

          {/* Annotating Section */}
          <Col span={8}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Annotating</Text>
                  <Text type="secondary">{managementData?.annotating?.count || 0} Datasets</Text>
                </div>
              }
              style={{ height: '500px', overflow: 'auto' }}
            >
              {managementData?.annotating?.datasets?.length > 0 ? (
                managementData.annotating.datasets.map(dataset => 
                  renderDatasetCard(dataset, 'annotating')
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Text type="secondary">Upload and assign images to an annotator.</Text>
                </div>
              )}
            </Card>
          </Col>

          {/* Dataset Section */}
          <Col span={8}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>Dataset</Text>
                  <Text type="secondary">{managementData?.dataset?.count || 0} Datasets</Text>
                </div>
              }
              style={{ height: '500px', overflow: 'auto' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button type="link" icon={<EyeOutlined />}>
                  See all {project?.image_count || 0} images
                </Button>
              </div>

              {managementData?.dataset?.datasets?.length > 0 ? (
                managementData.dataset.datasets.map(dataset => 
                  renderDatasetCard(dataset, 'completed')
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Text type="secondary">No completed datasets found.</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  const renderDatasetContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DatabaseOutlined style={{ marginRight: '8px' }} />
        Dataset
      </Title>
      <Alert
        message="Dataset Management"
        description="View and manage your project datasets."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />
      <Button 
        type="primary" 
        size="large"
        onClick={() => navigate(`/datasets?project=${projectId}`)}
      >
        View Datasets
      </Button>
    </div>
  );

  const renderVersionsContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <HistoryOutlined style={{ marginRight: '8px' }} />
        Versions
      </Title>
      <Alert
        message="Dataset Versions"
        description="Track different versions of your dataset."
        type="info"
        showIcon
      />
    </div>
  );

  const renderModelsContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <RobotOutlined style={{ marginRight: '8px' }} />
        Models
      </Title>
      <Alert
        message="Model Training"
        description="Train and manage your computer vision models."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />
      <Button 
        type="primary" 
        size="large"
        onClick={() => navigate('/models')}
      >
        View Models
      </Button>
    </div>
  );

  const renderVisualizeContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <EyeOutlined style={{ marginRight: '8px' }} />
        Visualize
      </Title>
      <Alert
        message="Data Visualization"
        description="Visualize your dataset and model performance."
        type="info"
        showIcon
      />
    </div>
  );

  const renderDeploymentsContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DeploymentUnitOutlined style={{ marginRight: '8px' }} />
        Deployments
      </Title>
      <Alert
        message="Model Deployment"
        description="Deploy your trained models to production."
        type="info"
        showIcon
      />
    </div>
  );

  const renderActiveLearningContent = () => (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BulbOutlined style={{ marginRight: '8px' }} />
        Active Learning
      </Title>
      <Alert
        message="Active Learning"
        description="Improve your model with active learning techniques."
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />
      <Button 
        type="primary" 
        size="large"
        onClick={() => navigate('/active-learning')}
      >
        Start Active Learning
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Loading project workspace...</Text>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Alert
        message="Project Not Found"
        description="The requested project could not be found."
        type="error"
        showIcon
        action={
          <Button onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        }
      />
    );
  }

  const typeInfo = getProjectTypeInfo(project.project_type);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Project Sidebar */}
      <Sider 
        width={280} 
        style={{ 
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100
        }}
      >
        {/* Back Button */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
            style={{ marginBottom: '16px' }}
          >
            Back to Projects
          </Button>
          
          {/* Project Header */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${
                  typeInfo.color === 'blue' ? '#1890ff, #40a9ff' : 
                  typeInfo.color === 'green' ? '#52c41a, #73d13d' : 
                  typeInfo.color === 'purple' ? '#722ed1, #9254de' : '#d9d9d9, #f0f0f0'
                })`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                marginRight: '12px'
              }}>
                {typeInfo.color === 'blue' ? '🎯' : 
                 typeInfo.color === 'green' ? '🏷️' : 
                 typeInfo.color === 'purple' ? '✂️' : '📁'}
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
                  {project.name}
                </Title>
                <Tag color={typeInfo.color} size="small">
                  {typeInfo.label}
                </Tag>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Statistic
                title="Images"
                value={project.total_images}
                prefix={<PictureOutlined />}
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Datasets"
                value={project.total_datasets}
                prefix={<DatabaseOutlined />}
                valueStyle={{ fontSize: '14px' }}
              />
            </Col>
          </Row>
          
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Progress: {project.total_images > 0 
                ? Math.round((project.labeled_images / project.total_images) * 100) 
                : 0}% annotated
            </Text>
            <Progress 
              percent={project.total_images > 0 
                ? Math.round((project.labeled_images / project.total_images) * 100) 
                : 0} 
              size="small" 
              style={{ marginTop: '4px' }}
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ border: 'none', background: 'transparent' }}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
        />
      </Sider>

      {/* Main Content */}
      <Layout style={{ marginLeft: 280 }}>
        <Content style={{ background: '#f5f5f5', minHeight: '100vh' }}>
          {renderContent()}
        </Content>
      </Layout>

      {/* Rename Dataset Modal */}
      <Modal
        title="Rename Dataset"
        open={renameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={() => {
          setRenameModalVisible(false);
          setRenamingDataset(null);
          setNewDatasetName('');
        }}
        okText="Rename"
        cancelText="Cancel"
      >
        <Input
          placeholder="Enter new dataset name"
          value={newDatasetName}
          onChange={(e) => setNewDatasetName(e.target.value)}
          onPressEnter={handleRenameConfirm}
        />
      </Modal>
    </Layout>
  );
};

export default ProjectWorkspace;