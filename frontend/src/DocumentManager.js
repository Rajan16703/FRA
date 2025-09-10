import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileCheck,
  FilePlus,
  Loader,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Target,
  Zap
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Document Type Icons
const getDocumentIcon = (mimeType, documentType) => {
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('image')) return Image;
  return File;
};

// Status Colors
const getStatusColor = (status) => {
  const colors = {
    uploaded: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ocr_completed: 'bg-green-100 text-green-800 border-green-200',
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Drag and Drop Upload Component
const FileDropZone = ({ onFilesSelected, isUploading, documentType, claimId }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    onFilesSelected(files);
  }, [onFilesSelected]);

  return (
    <div 
      className={`file-drop-zone ${isDragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-zone-content">
        {isUploading ? (
          <div className="upload-progress">
            <Loader className="upload-spinner" size={48} />
            <h3>Uploading documents...</h3>
            <p>Please wait while we process your files</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">
              <Upload size={48} />
              <div className="upload-glow"></div>
            </div>
            <h3>Drag & Drop Documents</h3>
            <p>Drop your PDF, JPG, PNG files here or click to browse</p>
            <div className="upload-actions">
              <input
                type="file"
                id="file-input"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="upload-btn primary">
                <FilePlus size={16} />
                Choose Files
              </label>
            </div>
            <div className="supported-formats">
              <span>Supported: PDF, JPG, PNG, TIFF, BMP (Max 10MB each)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// OCR Results Viewer
const OCRViewer = ({ document, onClose }) => {
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="ocr-viewer">
      <div className="ocr-header">
        <h3>OCR Results - {document.original_filename}</h3>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="ocr-tabs">
        <button 
          className={`tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <FileText size={16} />
          Extracted Text
        </button>
        <button 
          className={`tab ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          <Target size={16} />
          Metadata
        </button>
        <button 
          className={`tab ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          <Star size={16} />
          Extracted Fields
        </button>
      </div>

      <div className="ocr-content">
        {activeTab === 'text' && (
          <div className="text-content">
            <div className="confidence-score">
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{width: `${document.ocr_confidence * 100}%`}}
                ></div>
              </div>
              <span>Confidence: {(document.ocr_confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="extracted-text">
              <pre>{document.ocr_text || 'No text extracted'}</pre>
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="metadata-content">
            <div className="metadata-grid">
              <div className="metadata-item">
                <label>Processing Time</label>
                <value>{document.ocr_metadata?.processing_time?.toFixed(2) || 'N/A'}s</value>
              </div>
              <div className="metadata-item">
                <label>Language</label>
                <value>{document.ocr_metadata?.language || 'Unknown'}</value>
              </div>
              <div className="metadata-item">
                <label>Pages</label>
                <value>{document.ocr_metadata?.pages || 1}</value>
              </div>
              <div className="metadata-item">
                <label>File Size</label>
                <value>{(document.file_size / 1024).toFixed(1)} KB</value>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <div className="fields-content">
            <div className="extracted-fields">
              {document.ocr_metadata?.extracted_fields ? 
                Object.entries(document.ocr_metadata.extracted_fields).map(([key, value]) => (
                  <div key={key} className="field-item">
                    <label>{key.replace('_', ' ').toUpperCase()}</label>
                    <value>{value}</value>
                  </div>
                )) : 
                <p>No structured fields extracted</p>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ 
  document, 
  onView, 
  onDownload, 
  onDelete, 
  onProcessOCR, 
  onCreateVersion,
  versions = [] 
}) => {
  const [showVersions, setShowVersions] = useState(false);
  const IconComponent = getDocumentIcon(document.mime_type, document.document_type);

  return (
    <div className="document-card enhanced">
      <div className="document-preview">
        <div className="document-icon">
          <IconComponent size={32} />
          <div className="document-type-badge">
            {document.document_type.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        
        {document.version > 1 && (
          <div className="version-badge">v{document.version}</div>
        )}
      </div>

      <div className="document-info">
        <h4 className="document-title">{document.original_filename}</h4>
        
        <div className="document-meta">
          <span className="file-size">{(document.file_size / 1024).toFixed(1)} KB</span>
          <span className="upload-date">
            {new Date(document.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className={`status-badge enhanced ${document.status}`}>
          {document.status === 'processing' && <Loader size={12} className="spinner" />}
          {document.status === 'ocr_completed' && <CheckCircle size={12} />}
          {document.status === 'verified' && <FileCheck size={12} />}
          {document.status === 'uploaded' && <Clock size={12} />}
          {document.status === 'rejected' && <AlertCircle size={12} />}
          <span>{document.status.replace('_', ' ').toUpperCase()}</span>
        </div>

        {document.ocr_confidence > 0 && (
          <div className="ocr-confidence">
            <Target size={12} />
            <span>OCR: {(document.ocr_confidence * 100).toFixed(0)}%</span>
            <div className="confidence-mini-bar">
              <div 
                className="confidence-mini-fill" 
                style={{width: `${document.ocr_confidence * 100}%`}}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="document-actions">
        <button 
          className="action-btn view" 
          onClick={() => onView(document)}
          title="View Document"
        >
          <Eye size={16} />
        </button>
        
        <button 
          className="action-btn download" 
          onClick={() => onDownload(document)}
          title="Download"
        >
          <Download size={16} />
        </button>

        {document.status === 'uploaded' && (
          <button 
            className="action-btn process" 
            onClick={() => onProcessOCR(document.id)}
            title="Process OCR"
          >
            <Zap size={16} />
          </button>
        )}

        <button 
          className="action-btn version" 
          onClick={() => onCreateVersion(document)}
          title="Create Version"
        >
          <Plus size={16} />
        </button>

        <button 
          className="action-btn delete" 
          onClick={() => onDelete(document.id)}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {versions.length > 1 && (
        <div className="versions-section">
          <button 
            className="versions-toggle"
            onClick={() => setShowVersions(!showVersions)}
          >
            {showVersions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {versions.length} versions
          </button>
          
          {showVersions && (
            <div className="versions-list">
              {versions.map((version) => (
                <div key={version.id} className="version-item">
                  <span>v{version.version}</span>
                  <span>{new Date(version.created_at).toLocaleDateString()}</span>
                  <div className="version-actions">
                    <button onClick={() => onView(version)}>
                      <Eye size={12} />
                    </button>
                    <button onClick={() => onDownload(version)}>
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Document Manager Component
const DocumentManager = ({ claimId = null }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showOCRViewer, setShowOCRViewer] = useState(false);
  const [documentType, setDocumentType] = useState('identity_proof');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [documentVersions, setDocumentVersions] = useState({});

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (claimId) params.append('claim_id', claimId);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await axios.get(`${API}/documents?${params}`);
      setDocuments(response.data);

      // Fetch versions for each document
      const versionsMap = {};
      for (const doc of response.data) {
        try {
          const versionsResponse = await axios.get(`${API}/documents/${doc.id}/versions`);
          versionsMap[doc.id] = versionsResponse.data;
        } catch (error) {
          console.error(`Error fetching versions for ${doc.id}:`, error);
        }
      }
      setDocumentVersions(versionsMap);

    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [claimId, statusFilter]);

  // Handle file upload
  const handleFilesSelected = async (files) => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('document_type', documentType);
      if (claimId) formData.append('claim_id', claimId);
      formData.append('uploaded_by', 'admin');

      const response = await axios.post(`${API}/documents/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response.data);
      
      // Refresh document list
      await fetchDocuments();
      
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle OCR processing
  const handleProcessOCR = async (documentId) => {
    try {
      await axios.post(`${API}/documents/${documentId}/ocr`);
      
      // Refresh document to get OCR results
      setTimeout(() => {
        fetchDocuments();
      }, 1000);
      
    } catch (error) {
      console.error('Error processing OCR:', error);
    }
  };

  // Handle bulk OCR processing
  const handleBulkOCR = async () => {
    const uploadedDocs = documents.filter(doc => doc.status === 'uploaded');
    if (uploadedDocs.length === 0) return;

    try {
      const documentIds = uploadedDocs.map(doc => doc.id);
      await axios.post(`${API}/documents/bulk-ocr`, documentIds);
      
      // Refresh documents
      setTimeout(() => {
        fetchDocuments();
      }, 2000);
      
    } catch (error) {
      console.error('Error processing bulk OCR:', error);
    }
  };

  // Handle document actions
  const handleView = (document) => {
    setSelectedDocument(document);
    if (document.ocr_text) {
      setShowOCRViewer(true);
    }
  };

  const handleDownload = async (document) => {
    try {
      const response = await axios.get(`${API}/documents/${document.id}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await axios.delete(`${API}/documents/${documentId}`);
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleCreateVersion = async (document) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.tiff,.bmp';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploaded_by', 'admin');

        await axios.post(`${API}/documents/${document.id}/version`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        await fetchDocuments();
      } catch (error) {
        console.error('Error creating document version:', error);
      }
    };
    
    input.click();
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const documentStats = {
    total: documents.length,
    uploaded: documents.filter(doc => doc.status === 'uploaded').length,
    processing: documents.filter(doc => doc.status === 'processing').length,
    completed: documents.filter(doc => doc.status === 'ocr_completed').length,
    verified: documents.filter(doc => doc.status === 'verified').length
  };

  return (
    <div className="document-manager enhanced">
      <div className="document-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Document Management</h2>
            <p>Upload, process, and manage forest rights documents with OCR</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <File size={16} />
              <span>{documentStats.total} Documents</span>
            </div>
            <div className="stat-pill">
              <CheckCircle size={16} />
              <span>{documentStats.completed} OCR Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <div className="upload-controls">
          <div className="document-type-selector">
            <label>Document Type</label>
            <select 
              value={documentType} 
              onChange={(e) => setDocumentType(e.target.value)}
              className="enhanced-select"
            >
              <option value="identity_proof">Identity Proof</option>
              <option value="address_proof">Address Proof</option>
              <option value="land_document">Land Document</option>
              <option value="survey_settlement">Survey Settlement</option>
              <option value="forest_clearance">Forest Clearance</option>
              <option value="photograph">Photograph</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {documentStats.uploaded > 0 && (
            <button 
              className="bulk-ocr-btn"
              onClick={handleBulkOCR}
            >
              <Zap size={16} />
              Process All OCR ({documentStats.uploaded})
            </button>
          )}
        </div>

        <FileDropZone 
          onFilesSelected={handleFilesSelected}
          isUploading={uploading}
          documentType={documentType}
          claimId={claimId}
        />
      </div>

      {/* Filters and Search */}
      <div className="document-filters">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="enhanced-select"
          >
            <option value="">All Status</option>
            <option value="uploaded">Uploaded</option>
            <option value="processing">Processing</option>
            <option value="ocr_completed">OCR Completed</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <button className="refresh-btn" onClick={fetchDocuments}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner advanced"></div>
          <div className="loading-text">
            <p>Loading documents...</p>
          </div>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              versions={documentVersions[doc.id] || []}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onProcessOCR={handleProcessOCR}
              onCreateVersion={handleCreateVersion}
            />
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && !loading && (
        <div className="empty-state enhanced">
          <File size={48} />
          <h3>No documents found</h3>
          <p>Upload documents using the drag & drop area above</p>
        </div>
      )}

      {/* OCR Viewer Modal */}
      {showOCRViewer && selectedDocument && (
        <div className="modal-overlay">
          <div className="modal-container large">
            <OCRViewer 
              document={selectedDocument}
              onClose={() => {
                setShowOCRViewer(false);
                setSelectedDocument(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;