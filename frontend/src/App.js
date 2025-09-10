import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Home, 
  Map, 
  FileText, 
  BarChart3, 
  Settings, 
  User, 
  Bell,
  Search,
  Menu,
  X,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TreePine,
  Globe,
  Filter,
  Eye
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Header Component
const Header = ({ toggleSidebar, sidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={toggleSidebar}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="logo-section">
          <TreePine className="logo-icon" size={32} />
          <div className="logo-text">
            <h1>FRA-Connect</h1>
            <p>Forest Rights Atlas & Decision Support System</p>
          </div>
        </div>
      </div>
      
      <div className="header-center">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Search villages, claims, beneficiaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="header-right">
        <div className="language-switch">
          <select>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="tribal">Tribal Language</option>
          </select>
        </div>
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
        <div className="user-profile">
          <User size={20} />
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
};

// Sidebar Component
const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  
  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Globe, label: "Forest Atlas", path: "/atlas" },
    { icon: FileText, label: "Claims Management", path: "/claims" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Users, label: "User Management", path: "/users" },
    { icon: Settings, label: "Settings", path: "/settings" }
  ];
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link 
            key={item.path}
            to={item.path} 
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="digital-india-badge">
          <span>🇮🇳 Digital India Initiative</span>
        </div>
      </div>
    </aside>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, claimsRes] = await Promise.all([
        axios.get(`${API}/analytics`),
        axios.get(`${API}/claims?limit=5`)
      ]);
      
      setAnalytics(analyticsRes.data);
      setRecentClaims(claimsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Forest Rights Management Dashboard</h2>
        <p>Comprehensive overview of forest rights claims and processing status</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card villages">
          <div className="kpi-icon">
            <MapPin size={24} />
          </div>
          <div className="kpi-content">
            <h3>{analytics?.total_villages || 0}</h3>
            <p>Villages Covered</p>
            <span className="kpi-trend positive">+12% this month</span>
          </div>
        </div>

        <div className="kpi-card claims">
          <div className="kpi-icon">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <h3>{analytics?.total_claims || 0}</h3>
            <p>Total Claims</p>
            <span className="kpi-trend positive">+8% this month</span>
          </div>
        </div>

        <div className="kpi-card pending">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <h3>{analytics?.pending_claims || 0}</h3>
            <p>Pending Review</p>
            <span className="kpi-trend neutral">Action required</span>
          </div>
        </div>

        <div className="kpi-card approved">
          <div className="kpi-icon">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-content">
            <h3>{analytics?.approved_claims || 0}</h3>
            <p>Approved Claims</p>
            <span className="kpi-trend positive">+15% this month</span>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-card">
            <h3>Processing Analytics</h3>
            <div className="analytics-grid">
              <div className="metric">
                <label>Average Processing Time</label>
                <value>{analytics?.average_processing_time || 0} days</value>
              </div>
              <div className="metric">
                <label>OCR Accuracy</label>
                <value>{((analytics?.ocr_accuracy || 0) * 100).toFixed(1)}%</value>
              </div>
              <div className="metric">
                <label>Scheme Integration</label>
                <value>{analytics?.scheme_integration_count || 0} linked</value>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-card recent-claims">
            <div className="card-header">
              <h3>Recent Claims</h3>
              <Link to="/claims" className="view-all-btn">View All</Link>
            </div>
            <div className="claims-list">
              {recentClaims.map((claim) => (
                <div key={claim.id} className="claim-item">
                  <div className="claim-info">
                    <h4>{claim.claim_number}</h4>
                    <p>{claim.beneficiary_name}</p>
                    <span className={`status-badge ${claim.status}`}>
                      {claim.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="claim-details">
                    <span>{claim.area_claimed} hectares</span>
                    <span className="ai-confidence">
                      AI: {(claim.ai_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Forest Atlas Component
const ForestAtlas = () => {
  const [villages, setVillages] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [mapView, setMapView] = useState("villages");

  useEffect(() => {
    fetchMapData();
  }, [selectedState, selectedDistrict]);

  const fetchMapData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedState) params.append('state', selectedState);
      if (selectedDistrict) params.append('district', selectedDistrict);
      
      const [villagesRes, claimsRes] = await Promise.all([
        axios.get(`${API}/map/villages?${params}`),
        axios.get(`${API}/map/claims?${params}`)
      ]);
      
      setVillages(villagesRes.data.features);
      setClaims(claimsRes.data.features);
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  const states = ["Madhya Pradesh", "Chhattisgarh", "Jharkhand", "Odisha"];
  const districts = {
    "Madhya Pradesh": ["Balaghat", "Mandla", "Dindori"],
    "Chhattisgarh": ["Korba", "Raigarh", "Bilaspur"],
    "Jharkhand": ["Ranchi", "Khunti", "Gumla"]
  };

  return (
    <div className="forest-atlas">
      <div className="atlas-header">
        <h2>Forest Rights Atlas</h2>
        <p>Interactive mapping of forest rights claims and village boundaries</p>
      </div>

      {/* Map Controls */}
      <div className="map-controls">
        <div className="filters">
          <select 
            value={selectedState} 
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("");
            }}
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedState}
          >
            <option value="">All Districts</option>
            {selectedState && districts[selectedState]?.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <div className="view-toggle">
            <button 
              className={mapView === "villages" ? "active" : ""}
              onClick={() => setMapView("villages")}
            >
              Villages
            </button>
            <button 
              className={mapView === "claims" ? "active" : ""}
              onClick={() => setMapView("claims")}
            >
              Claims
            </button>
          </div>
        </div>

        <div className="layer-controls">
          <Filter size={16} />
          <span>Layers</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <div className="map-placeholder">
          <div className="mock-map">
            <h3>Interactive Map View</h3>
            <p>Showing {mapView === "villages" ? villages.length : claims.length} {mapView}</p>
            
            {mapView === "villages" && (
              <div className="map-legend">
                <h4>Villages ({villages.length})</h4>
                {villages.slice(0, 5).map((village, index) => (
                  <div key={index} className="legend-item">
                    <MapPin size={16} />
                    <span>{village.properties.name}, {village.properties.district}</span>
                    <span className="area">{village.properties.total_forest_area} ha</span>
                  </div>
                ))}
              </div>
            )}

            {mapView === "claims" && (
              <div className="map-legend">
                <h4>Claims ({claims.length})</h4>
                {claims.slice(0, 5).map((claim, index) => (
                  <div key={index} className="legend-item">
                    <div className={`status-dot ${claim.properties.status}`}></div>
                    <span>{claim.properties.claim_number}</span>
                    <span className="beneficiary">{claim.properties.beneficiary_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Info Panel */}
      <div className="map-info-panel">
        <h4>Selected Feature Information</h4>
        <p>Click on a village or claim on the map to view detailed information</p>
        <div className="info-placeholder">
          <Eye size={48} />
          <span>No feature selected</span>
        </div>
      </div>
    </div>
  );
};

// Claims Management Component
const ClaimsManagement = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchClaims();
  }, [filterStatus]);

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await axios.get(`${API}/claims?${params}`);
      setClaims(response.data);
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateClaimStatus = async (claimId, newStatus) => {
    try {
      await axios.put(`${API}/claims/${claimId}`, { status: newStatus });
      fetchClaims(); // Refresh the list
    } catch (error) {
      console.error("Error updating claim:", error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading claims...</p>
      </div>
    );
  }

  return (
    <div className="claims-management">
      <div className="claims-header">
        <h2>Claims Management</h2>
        <p>Review and process forest rights claims</p>
      </div>

      {/* Filter Controls */}
      <div className="claims-filters">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="under_review">Under Review</option>
          <option value="contested">Contested</option>
        </select>
      </div>

      {/* Claims Table */}
      <div className="claims-table-container">
        <table className="claims-table">
          <thead>
            <tr>
              <th>Claim Number</th>
              <th>Beneficiary</th>
              <th>Village</th>
              <th>Type</th>
              <th>Area (ha)</th>
              <th>Status</th>
              <th>AI Recommendation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td className="claim-number">{claim.claim_number}</td>
                <td>{claim.beneficiary_name}</td>
                <td>Village ID: {claim.village_id.slice(0, 8)}...</td>
                <td>
                  <span className={`type-badge ${claim.claim_type.toLowerCase().replace(' ', '-')}`}>
                    {claim.claim_type}
                  </span>
                </td>
                <td>{claim.area_claimed}</td>
                <td>
                  <span className={`status-badge ${claim.status}`}>
                    {claim.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="ai-recommendation">
                    <span className={`ai-badge ${claim.ai_recommendation}`}>
                      {claim.ai_recommendation.toUpperCase()}
                    </span>
                    <small>{(claim.ai_confidence * 100).toFixed(0)}%</small>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    {claim.status === 'pending' && (
                      <>
                        <button 
                          className="btn-approve"
                          onClick={() => updateClaimStatus(claim.id, 'approved')}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          className="btn-reject"
                          onClick={() => updateClaimStatus(claim.id, 'rejected')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <button className="btn-view">
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {claims.length === 0 && (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No claims found</h3>
          <p>No claims match your current filter criteria</p>
        </div>  
      )}
    </div>
  );
};

// Analytics Component
const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  if (!analytics) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>Analytics & Reports</h2>
        <p>Comprehensive insights into forest rights processing</p>
      </div>

      <div className="analytics-content">
        <div className="analytics-section">
          <h3>Processing Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Approval Rate</h4>
              <div className="stat-value">
                {((analytics.approved_claims / analytics.total_claims) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <h4>Average Processing Time</h4>
              <div className="stat-value">{analytics.average_processing_time} days</div>
            </div>
            <div className="stat-card">
              <h4>OCR Accuracy</h4>
              <div className="stat-value">{(analytics.ocr_accuracy * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="analytics-section">
          <h3>Scheme Integration</h3>
          <div className="scheme-stats">
            <div className="scheme-item">
              <span>PM-KISAN Integration</span>
              <div className="progress-bar">
                <div className="progress" style={{width: '75%'}}></div>
              </div>
              <span>75%</span>
            </div>
            <div className="scheme-item">
              <span>MGNREGA Linkage</span>
              <div className="progress-bar">
                <div className="progress" style={{width: '60%'}}></div>
              </div>
              <span>60%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Generate mock data on app start
  useEffect(() => {
    const generateMockData = async () => {
      try {
        await axios.post(`${API}/mock-data/generate`);
        console.log("Mock data generated successfully");
      } catch (error) {
        console.error("Error generating mock data:", error);
      }
    };
    
    generateMockData();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Sidebar isOpen={sidebarOpen} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/atlas" element={<ForestAtlas />} />
              <Route path="/claims" element={<ClaimsManagement />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/users" element={<div className="page-placeholder"><Users size={48} /><h2>User Management</h2><p>User management interface coming soon</p></div>} />
              <Route path="/settings" element={<div className="page-placeholder"><Settings size={48} /><h2>Settings</h2><p>System settings interface coming soon</p></div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;