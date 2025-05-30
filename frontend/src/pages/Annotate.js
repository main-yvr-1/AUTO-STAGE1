import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Typography,
  Row,
  Col,
  Select,
  Space,
  Divider,
  Upload,
  message,
  List,
  Tag,
  Input,
  Modal,
  Progress,
  Tooltip,
  Statistic
} from 'antd';
import {
  EditOutlined,
  RobotOutlined,
  SaveOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  UndoOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  EyeOutlined
} from '@ant-design/icons';
import SmartAnnotationInterface from '../components/SmartAnnotationInterface';
import { datasetsAPI, modelsAPI, annotationsAPI } from '../services/api';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const Annotate = () => {
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [classes, setClasses] = useState([
    { name: 'Person', color: '#ff4d4f' },
    { name: 'Car', color: '#52c41a' },
    { name: 'Bicycle', color: '#1890ff' },
    { name: 'Dog', color: '#fa8c16' },
    { name: 'Cat', color: '#722ed1' }
  ]);
  const [selectedClass, setSelectedClass] = useState(0);
  const [isAutoLabeling, setIsAutoLabeling] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [annotationStats, setAnnotationStats] = useState({
    total: 0,
    annotated: 0,
    pending: 0
  });

  // Load datasets and models on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load datasets
        const datasetsResponse = await datasetsAPI.getDatasets();
        setDatasets(datasetsResponse);
        
        // Load models
        const modelsResponse = await modelsAPI.getModels();
        setModels(modelsResponse);
        
        // Auto-select first dataset if available
        if (datasetsResponse.length > 0) {
          setSelectedDataset(datasetsResponse[0].id);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        message.error('Failed to load datasets and models');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Load images when dataset is selected
  useEffect(() => {
    const loadDatasetImages = async () => {
      if (!selectedDataset) {
        setImages([]);
        setCurrentImage(null);
        setAnnotations([]);
        return;
      }
      
      setLoading(true);
      try {
        const response = await datasetsAPI.getDatasetImages(selectedDataset);
        const imageList = response.images.map(img => ({
          id: img.id,
          name: img.original_filename,
          url: `http://localhost:12000${img.url}`,
          annotations: [],
          width: img.width,
          height: img.height,
          is_labeled: img.is_labeled
        }));
        
        setImages(imageList);
        if (imageList.length > 0) {
          console.log('Setting current image:', imageList[0]);
          setCurrentImage(imageList[0]);
          setCurrentImageIndex(0);
          // Load annotations for first image
          loadImageAnnotations(imageList[0].id);
        }
      } catch (error) {
        console.error('Error loading dataset images:', error);
        message.error('Failed to load dataset images');
      } finally {
        setLoading(false);
      }
    };
    
    loadDatasetImages();
  }, [selectedDataset]);

  // Load annotations for a specific image
  const loadImageAnnotations = async (imageId) => {
    try {
      const response = await annotationsAPI.getAnnotations(imageId);
      setAnnotations(response.annotations || []);
    } catch (error) {
      console.error('Error loading annotations:', error);
      setAnnotations([]);
    }
  };

  // Update stats when annotations change
  useEffect(() => {
    const annotated = images.filter(img => img.annotations && img.annotations.length > 0).length;
    setAnnotationStats({
      total: images.length,
      annotated: annotated,
      pending: images.length - annotated
    });
  }, [images, annotations]);

  // Handle image navigation
  const navigateImage = (direction) => {
    const newIndex = direction === 'next' 
      ? Math.min(currentImageIndex + 1, images.length - 1)
      : Math.max(currentImageIndex - 1, 0);
    
    if (newIndex !== currentImageIndex) {
      // Save current annotations
      saveCurrentAnnotations();
      
      // Load new image
      setCurrentImageIndex(newIndex);
      setCurrentImage(images[newIndex]);
      
      // Load annotations for the new image
      loadImageAnnotations(images[newIndex].id);
    }
  };

  // Save annotations for current image
  const saveCurrentAnnotations = async () => {
    if (currentImage && annotations.length > 0) {
      try {
        // Convert annotations to backend format for saving
        const backendAnnotations = annotations.map(ann => {
          const result = {
            class_name: classes[ann.classIndex]?.name || 'unknown',
            class_id: ann.classIndex,
            confidence: ann.confidence || 1.0,
            segmentation: null
          };

          // Convert bbox format from {x, y, width, height} to [x_min, y_min, x_max, y_max]
          if (ann.type === 'bbox' && ann.bbox) {
            const { x, y, width, height } = ann.bbox;
            result.bbox = [x, y, x + width, y + height];
          } else if (ann.type === 'polygon' && ann.points) {
            // For polygon, create a bounding box from points
            const xs = ann.points.map(p => p.x);
            const ys = ann.points.map(p => p.y);
            const x_min = Math.min(...xs);
            const y_min = Math.min(...ys);
            const x_max = Math.max(...xs);
            const y_max = Math.max(...ys);
            result.bbox = [x_min, y_min, x_max, y_max];
            // Store polygon points in segmentation
            result.segmentation = ann.points.flatMap(p => [p.x, p.y]);
          }

          return result;
        });

        await annotationsAPI.saveAnnotations(currentImage.id, backendAnnotations);
        const updatedImages = images.map(img => 
          img.id === currentImage.id 
            ? { ...img, annotations: annotations, is_labeled: true }
            : img
        );
        setImages(updatedImages);
        message.success('Annotations saved!');
      } catch (error) {
        console.error('Error saving annotations:', error);
        message.error('Failed to save annotations');
      }
    }
  };

  // Handle annotations change with auto-save
  const handleAnnotationsChange = async (newAnnotations) => {
    setAnnotations(newAnnotations);
    
    // Auto-save manual annotations immediately
    if (currentImage && newAnnotations.length > 0) {
      try {
        // Convert annotations to backend format for saving
        const backendAnnotations = newAnnotations.map(ann => {
          const result = {
            class_name: classes[ann.classIndex]?.name || 'unknown',
            class_id: ann.classIndex,
            confidence: ann.confidence || 1.0,
            segmentation: null
          };

          // Convert bbox format from {x, y, width, height} to [x_min, y_min, x_max, y_max]
          if (ann.type === 'bbox' && ann.bbox) {
            const { x, y, width, height } = ann.bbox;
            result.bbox = [x, y, x + width, y + height];
          } else if (ann.type === 'polygon' && ann.points) {
            // For polygon, create a bounding box from points
            const xs = ann.points.map(p => p.x);
            const ys = ann.points.map(p => p.y);
            const x_min = Math.min(...xs);
            const y_min = Math.min(...ys);
            const x_max = Math.max(...xs);
            const y_max = Math.max(...ys);
            result.bbox = [x_min, y_min, x_max, y_max];
            // Store polygon points in segmentation
            result.segmentation = ann.points.flatMap(p => [p.x, p.y]);
          }

          return result;
        });

        await annotationsAPI.saveAnnotations(currentImage.id, backendAnnotations);
        // Show subtle success indicator without interrupting workflow
        console.log('Annotations auto-saved successfully');
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Only show warning for critical failures
        if (error.response?.status >= 500) {
          message.warning('Auto-save failed - annotations stored locally');
        }
      }
    }
  };

  // Auto-label current image
  const handleAutoLabel = async () => {
    if (!selectedModel || !currentImage) {
      message.warning('Please select a model and image');
      return;
    }

    setIsAutoLabeling(true);
    try {
      // Simulate API call to auto-labeling service
      message.loading('Running AI auto-labeling...', 0);
      
      // Mock auto-labeling results
      setTimeout(async () => {
        const mockAnnotations = [
          {
            type: 'bbox',
            bbox: { x: 100, y: 100, width: 200, height: 150 },
            classIndex: 0,
            confidence: 0.95,
            source: 'ai'
          },
          {
            type: 'polygon',
            points: [
              { x: 400, y: 200 },
              { x: 500, y: 180 },
              { x: 520, y: 280 },
              { x: 450, y: 300 },
              { x: 380, y: 250 }
            ],
            classIndex: 1,
            confidence: 0.87,
            source: 'ai'
          }
        ];
        
        const newAnnotations = [...annotations, ...mockAnnotations];
        setAnnotations(newAnnotations);
        
        // Convert annotations to backend format for saving
        const backendAnnotations = newAnnotations.map(ann => {
          const result = {
            class_name: classes[ann.classIndex]?.name || 'unknown',
            class_id: ann.classIndex,
            confidence: ann.confidence || 1.0,
            segmentation: null
          };

          // Convert bbox format from {x, y, width, height} to [x_min, y_min, x_max, y_max]
          if (ann.type === 'bbox' && ann.bbox) {
            const { x, y, width, height } = ann.bbox;
            result.bbox = [x, y, x + width, y + height];
          } else if (ann.type === 'polygon' && ann.points) {
            // For polygon, create a bounding box from points
            const xs = ann.points.map(p => p.x);
            const ys = ann.points.map(p => p.y);
            const x_min = Math.min(...xs);
            const y_min = Math.min(...ys);
            const x_max = Math.max(...xs);
            const y_max = Math.max(...ys);
            result.bbox = [x_min, y_min, x_max, y_max];
            // Store polygon points in segmentation
            result.segmentation = ann.points.flatMap(p => [p.x, p.y]);
          }

          return result;
        });
        
        // Auto-save AI annotations immediately
        try {
          await annotationsAPI.saveAnnotations(currentImage.id, backendAnnotations);
          message.destroy();
          message.success(`Added ${mockAnnotations.length} AI annotations! (Auto-saved)`);
        } catch (error) {
          message.destroy();
          message.success(`Added ${mockAnnotations.length} AI annotations!`);
          message.warning('Auto-save failed - please save manually');
        }
        setIsAutoLabeling(false);
      }, 2000);
      
    } catch (error) {
      message.destroy();
      message.error('Auto-labeling failed');
      setIsAutoLabeling(false);
    }
  };

  // Add new class
  const handleAddClass = () => {
    if (newClassName.trim()) {
      const colors = ['#ff4d4f', '#52c41a', '#1890ff', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2'];
      const newClass = {
        name: newClassName.trim(),
        color: colors[classes.length % colors.length]
      };
      setClasses([...classes, newClass]);
      setNewClassName('');
      setShowClassModal(false);
      message.success('Class added successfully!');
    }
  };

  // Delete class
  const handleDeleteClass = (index) => {
    const newClasses = classes.filter((_, i) => i !== index);
    setClasses(newClasses);
    if (selectedClass >= newClasses.length) {
      setSelectedClass(newClasses.length - 1);
    }
    message.success('Class deleted');
  };

  // Export annotations
  const handleExportAnnotations = () => {
    const exportData = {
      images: images.map(img => ({
        name: img.name,
        annotations: img.annotations
      })),
      classes: classes
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
    message.success('Annotations exported!');
  };

  // Upload handler
  const uploadProps = {
    name: 'file',
    multiple: true,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      const newImage = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: url,
        annotations: []
      };
      
      setImages(prev => [...prev, newImage]);
      message.success(`${file.name} uploaded successfully`);
      return false; // Prevent auto upload
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              🎯 Smart Annotation Tool
            </Title>
            <Paragraph style={{ margin: 0, color: '#666' }}>
              AI-powered annotation with manual refinement capabilities
            </Paragraph>
          </Col>
          <Col>
            <Space>
              <Select
                placeholder="Select Dataset"
                style={{ width: 200 }}
                value={selectedDataset}
                onChange={setSelectedDataset}
                loading={loading}
              >
                {datasets.map(dataset => (
                  <Option key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </Option>
                ))}
              </Select>
              <Button icon={<UploadOutlined />} onClick={() => document.querySelector('.ant-upload input').click()}>
                Upload Images
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportAnnotations}>
                Export
              </Button>
              <Button 
                type="primary" 
                icon={<ThunderboltOutlined />}
                onClick={handleAutoLabel}
                loading={isAutoLabeling}
                disabled={!currentImage || !selectedModel}
              >
                AI Auto-Label
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row style={{ flex: 1, height: 0 }}>
        {/* Main Canvas Area */}
        <Col xs={24} lg={18} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!currentImage ? (
              <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dragger {...uploadProps} style={{ padding: 40 }}>
                  <p className="ant-upload-drag-icon">
                    <EditOutlined style={{ fontSize: 64, color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text">Click or drag images to start annotating</p>
                  <p className="ant-upload-hint">
                    Support for single or bulk image upload. JPG, PNG, GIF formats supported.
                  </p>
                </Dragger>
              </Card>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Image Navigation */}
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <span>{currentImage.name}</span>
                        <Tag color="blue">{currentImageIndex + 1} / {images.length}</Tag>
                        {annotations.length > 0 && (
                          <Tag color="green">{annotations.length} annotations</Tag>
                        )}
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button 
                          icon={<StepBackwardOutlined />}
                          onClick={() => navigateImage('prev')}
                          disabled={currentImageIndex === 0}
                        />
                        <Button 
                          icon={<StepForwardOutlined />}
                          onClick={() => navigateImage('next')}
                          disabled={currentImageIndex === images.length - 1}
                        />
                        {/* Auto-save enabled - manual save button hidden */}
                        <Button 
                          type="default"
                          icon={<SaveOutlined />}
                          onClick={saveCurrentAnnotations}
                          style={{ display: 'none' }}
                          title="Auto-save is enabled"
                        >
                          Save
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* Smart Annotation Interface */}
                <div style={{ flex: 1 }}>
                  <SmartAnnotationInterface
                    currentImage={currentImage}
                    annotations={annotations}
                    onAnnotationsChange={handleAnnotationsChange}
                    classes={classes}
                    selectedClass={selectedClass}
                    onClassChange={setSelectedClass}
                    onSave={saveCurrentAnnotations}
                    onAutoLabel={handleAutoLabel}
                  />
                </div>
              </div>
            )}
          </div>
        </Col>

        {/* Right Sidebar */}
        <Col xs={24} lg={6} style={{ height: '100%', borderLeft: '1px solid #f0f0f0' }}>
          <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              
              {/* Progress Stats */}
              <Card title="📊 Progress" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic 
                      title="Total" 
                      value={annotationStats.total}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="Done" 
                      value={annotationStats.annotated}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="Pending" 
                      value={annotationStats.pending}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                </Row>
                <Progress 
                  percent={annotationStats.total > 0 ? Math.round((annotationStats.annotated / annotationStats.total) * 100) : 0}
                  style={{ marginTop: 16 }}
                />
              </Card>

              {/* Model Selection */}
              <Card title="🤖 AI Models" size="small">
                <Select
                  placeholder="Select AI model"
                  style={{ width: '100%', marginBottom: 12 }}
                  value={selectedModel}
                  onChange={setSelectedModel}
                  loading={loading}
                >
                  {models.map(model => (
                    <Option key={model.id} value={model.id}>
                      {model.name} ({model.type})
                    </Option>
                  ))}
                </Select>
                
                <Button 
                  type="primary" 
                  icon={<RobotOutlined />}
                  block
                  onClick={handleAutoLabel}
                  loading={isAutoLabeling}
                  disabled={!selectedModel || !currentImage}
                >
                  Run AI Auto-Label
                </Button>
              </Card>

              {/* Classes Management */}
              <Card 
                title="🏷️ Classes" 
                size="small"
                extra={
                  <Button 
                    type="text" 
                    icon={<PlusOutlined />}
                    onClick={() => setShowClassModal(true)}
                  />
                }
              >
                <List
                  size="small"
                  dataSource={classes}
                  renderItem={(cls, index) => (
                    <List.Item
                      style={{ 
                        padding: '8px 0',
                        backgroundColor: selectedClass === index ? '#f6ffed' : 'transparent',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedClass(index)}
                      actions={[
                        <Button 
                          type="text" 
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(index);
                          }}
                        />
                      ]}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div 
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: cls.color,
                            marginRight: 8,
                            borderRadius: 2
                          }}
                        />
                        <span>{cls.name}</span>
                        {selectedClass === index && (
                          <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                            Active
                          </Tag>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Current Annotations */}
              <Card title="📝 Annotations" size="small">
                {annotations.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: 20 }}>
                    <BulbOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                    <div>No annotations yet</div>
                    <div style={{ fontSize: 12 }}>Use tools to start annotating</div>
                  </div>
                ) : (
                  <List
                    size="small"
                    dataSource={annotations}
                    renderItem={(annotation, index) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                              <div 
                                style={{
                                  width: 8,
                                  height: 8,
                                  backgroundColor: classes[annotation.classIndex]?.color || '#999',
                                  borderRadius: '50%'
                                }}
                              />
                              <span>{classes[annotation.classIndex]?.name || 'Unknown'}</span>
                              <Tag size="small">{annotation.type}</Tag>
                            </Space>
                            {annotation.confidence && (
                              <Tag color="blue" size="small">
                                {Math.round(annotation.confidence * 100)}%
                              </Tag>
                            )}
                          </div>
                          {annotation.source === 'ai' && (
                            <Tag color="purple" size="small" style={{ marginTop: 4 }}>
                              AI Generated
                            </Tag>
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Quick Tips */}
              <Card title="💡 Quick Tips" size="small">
                <div style={{ fontSize: 12, color: '#666' }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Bounding Box:</strong> Click and drag to create
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Polygon:</strong> Click points, double-click to finish
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>AI Segment:</strong> Click on object for instant segmentation
                  </div>
                  <div>
                    <strong>Pan:</strong> Hold and drag to move around
                  </div>
                </div>
              </Card>

            </Space>
          </div>
        </Col>
      </Row>

      {/* Hidden upload input */}
      <div style={{ display: 'none' }}>
        <Upload {...uploadProps}>
          <Button />
        </Upload>
      </div>

      {/* Add Class Modal */}
      <Modal
        title="Add New Class"
        open={showClassModal}
        onOk={handleAddClass}
        onCancel={() => {
          setShowClassModal(false);
          setNewClassName('');
        }}
        okText="Add Class"
      >
        <Input
          placeholder="Enter class name"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onPressEnter={handleAddClass}
        />
      </Modal>
    </div>
  );
};

export default Annotate;