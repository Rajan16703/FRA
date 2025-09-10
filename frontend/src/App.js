import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import DocumentManager from "./DocumentManager";
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
  Eye,
  Moon,
  Sun,
  TrendingUp,
  Activity,
  Award,
  Shield,
  Zap,
  Star,
  Upload
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = React.createContext();

// Theme Provider Component
const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('fra-connect-theme');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('fra-connect-theme', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Header Component
const Header = ({ toggleSidebar, sidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { darkMode, toggleTheme } = React.useContext(ThemeContext);
  
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={toggleSidebar}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="logo-section">
          <div className="logo-container">
            <TreePine className="logo-icon" size={32} />
            <div className="logo-glow"></div>
          </div>
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
          <div className="search-suggestions">
            <div className="search-glow"></div>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <button className="theme-toggle" onClick={toggleTheme}>
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className="theme-tooltip">
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
        
        <div className="language-switch">
          <select>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="tribal">Tribal Language</option>
          </select>
        </div>
        
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-badge pulse">3</span>
          <div className="notification-ripple"></div>
        </button>
        
        <div className="user-profile">
          <div className="user-avatar">
            <User size={20} />
            <div className="status-indicator online"></div>
          </div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
};

// Enhanced Sidebar Component
const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  
  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/", badge: null },
    { icon: Globe, label: "Forest Atlas", path: "/atlas", badge: "New" },
    { icon: FileText, label: "Claims Management", path: "/claims", badge: "3" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", badge: null },
    { icon: Users, label: "User Management", path: "/users", badge: null },
    { icon: Settings, label: "Settings", path: "/settings", badge: null }
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
            <div className="nav-icon">
              <item.icon size={20} />
              <div className="nav-icon-glow"></div>
            </div>
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className={`nav-badge ${item.badge === 'New' ? 'new' : 'count'}`}>
                {item.badge}
              </span>
            )}
            <div className="nav-item-effect"></div>
          </Link>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="digital-india-badge">
          <div className="badge-icon">
            <Shield size={16} />
          </div>
          <span>🇮🇳 Digital India Initiative</span>
          <div className="badge-glow"></div>
        </div>
      </div>
    </aside>
  );
};

// Enhanced Dashboard Component
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
        <div className="loading-spinner advanced"></div>
        <div className="loading-text">
          <p>Loading dashboard...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Forest Rights Management Dashboard</h2>
            <p>Comprehensive overview of forest rights claims and processing status</p>
          </div>
          <div className="header-actions">
            <button className="action-btn primary">
              <TrendingUp size={16} />
              Generate Report
            </button>
            <button className="action-btn secondary">
              <Activity size={16} />
              View Activities
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card villages enhanced">
          <div className="kpi-background">
            <div className="kpi-pattern"></div>
          </div>
          <div className="kpi-icon">
            <MapPin size={24} />
            <div className="icon-pulse"></div>
          </div>
          <div className="kpi-content">
            <h3>{analytics?.total_villages || 0}</h3>
            <p>Villages Covered</p>
            <div className="kpi-trend positive">
              <TrendingUp size={12} />
              <span>+12% this month</span>
            </div>
          </div>
          <div className="kpi-sparkline">
            <div className="sparkline-bar" style={{height: '20%'}}></div>
            <div className="sparkline-bar" style={{height: '40%'}}></div>
            <div className="sparkline-bar" style={{height: '70%'}}></div>
            <div className="sparkline-bar" style={{height: '100%'}}></div>
            <div className="sparkline-bar" style={{height: '60%'}}></div>
          </div>
        </div>

        <div className="kpi-card claims enhanced">
          <div className="kpi-background">
            <div className="kpi-pattern"></div>
          </div>
          <div className="kpi-icon">
            <FileText size={24} />
            <div className="icon-pulse"></div>
          </div>
          <div className="kpi-content">
            <h3>{analytics?.total_claims || 0}</h3>
            <p>Total Claims</p>
            <div className="kpi-trend positive">
              <TrendingUp size={12} />
              <span>+8% this month</span>
            </div>
          </div>
          <div className="kpi-sparkline">
            <div className="sparkline-bar" style={{height: '30%'}}></div>
            <div className="sparkline-bar" style={{height: '60%'}}></div>
            <div className="sparkline-bar" style={{height: '45%'}}></div>
            <div className="sparkline-bar" style={{height: '80%'}}></div>
            <div className="sparkline-bar" style={{height: '100%'}}></div>
          </div>
        </div>

        <div className="kpi-card pending enhanced">
          <div className="kpi-background">
            <div className="kpi-pattern"></div>
          </div>
          <div className="kpi-icon">
            <Clock size={24} />
            <div className="icon-pulse"></div>
          </div>
          <div className="kpi-content">
            <h3>{analytics?.pending_claims || 0}</h3>
            <p>Pending Review</p>
            <div className="kpi-trend neutral">
              <Zap size={12} />
              <span>Action required</span>
            </div>
          </div>
          <div className="kpi-sparkline">
            <div className="sparkline-bar" style={{height: '50%'}}></div>
            <div className="sparkline-bar" style={{height: '30%'}}></div>
            <div className="sparkline-bar" style={{height: '20%'}}></div>
            <div className="sparkline-bar" style={{height: '10%'}}></div>
            <div className="sparkline-bar" style={{height: '5%'}}></div>
          </div>
        </div>

        <div className="kpi-card approved enhanced">
          <div className="kpi-background">
            <div className="kpi-pattern"></div>
          </div>
          <div className="kpi-icon">
            <CheckCircle size={24} />
            <div className="icon-pulse"></div>
          </div>
          <div className="kpi-content">
            <h3>{analytics?.approved_claims || 0}</h3>
            <p>Approved Claims</p>
            <div className="kpi-trend positive">
              <Award size={12} />
              <span>+15% this month</span>
            </div>
          </div>
          <div className="kpi-sparkline">
            <div className="sparkline-bar" style={{height: '10%'}}></div>
            <div className="sparkline-bar" style={{height: '30%'}}></div>
            <div className="sparkline-bar" style={{height: '50%'}}></div>
            <div className="sparkline-bar" style={{height: '80%'}}></div>
            <div className="sparkline-bar" style={{height: '100%'}}></div>
          </div>
        </div>
      </div>

      {/* Enhanced Dashboard Content */}
      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-card analytics-card">
            <div className="card-header">
              <h3>Processing Analytics</h3>
              <div className="header-actions">
                <button className="icon-btn">
                  <Activity size={16} />
                </button>
              </div>
            </div>
            <div className="analytics-grid">
              <div className="metric enhanced">
                <div className="metric-icon">
                  <Clock size={20} />
                </div>
                <div className="metric-content">
                  <label>Average Processing Time</label>
                  <value>{analytics?.average_processing_time || 0} days</value>
                  <div className="metric-progress">
                    <div className="progress-fill" style={{width: '75%'}}></div>
                  </div>
                </div>
              </div>
              <div className="metric enhanced">
                <div className="metric-icon">
                  <Star size={20} />
                </div>
                <div className="metric-content">
                  <label>OCR Accuracy</label>
                  <value>{((analytics?.ocr_accuracy || 0) * 100).toFixed(1)}%</value>
                  <div className="metric-progress">
                    <div className="progress-fill" style={{width: '92%'}}></div>
                  </div>
                </div>
              </div>
              <div className="metric enhanced">
                <div className="metric-icon">
                  <Award size={20} />
                </div>
                <div className="metric-content">
                  <label>Scheme Integration</label>
                  <value>{analytics?.scheme_integration_count || 0} linked</value>
                  <div className="metric-progress">
                    <div className="progress-fill" style={{width: '65%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-card recent-claims enhanced">
            <div className="card-header">
              <h3>Recent Claims</h3>
              <Link to="/claims" className="view-all-btn">
                View All
                <TrendingUp size={14} />
              </Link>
            </div>
            <div className="claims-list">
              {recentClaims.map((claim) => (
                <div key={claim.id} className="claim-item enhanced">
                  <div className="claim-avatar">
                    <FileText size={16} />
                  </div>
                  <div className="claim-info">
                    <h4>{claim.claim_number}</h4>
                    <p>{claim.beneficiary_name}</p>
                    <span className={`status-badge ${claim.status} enhanced`}>
                      {claim.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="claim-details">
                    <span className="area">{claim.area_claimed} hectares</span>
                    <span className="ai-confidence enhanced">
                      AI: {(claim.ai_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="claim-actions">
                    <button className="icon-btn">
                      <Eye size={14} />
                    </button>
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

// Enhanced Forest Atlas Component (keeping same functionality but improved styling)
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
    <div className="forest-atlas enhanced">
      <div className="atlas-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Forest Rights Atlas</h2>
            <p>Interactive mapping of forest rights claims and village boundaries</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <Globe size={16} />
              <span>{villages.length} Villages</span>
            </div>
            <div className="stat-pill">
              <FileText size={16} />
              <span>{claims.length} Claims</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Map Controls */}
      <div className="map-controls enhanced">
        <div className="filters">
          <div className="filter-group">
            <label>State</label>
            <select 
              value={selectedState} 
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict("");
              }}
              className="enhanced-select"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>District</label>
            <select 
              value={selectedDistrict} 
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="enhanced-select"
            >
              <option value="">All Districts</option>
              {selectedState && districts[selectedState]?.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div className="view-toggle enhanced">
            <button 
              className={mapView === "villages" ? "active" : ""}
              onClick={() => setMapView("villages")}
            >
              <MapPin size={16} />
              Villages
            </button>
            <button 
              className={mapView === "claims" ? "active" : ""}
              onClick={() => setMapView("claims")}
            >
              <FileText size={16} />
              Claims
            </button>
          </div>
        </div>

        <div className="layer-controls enhanced">
          <Filter size={16} />
          <span>Layers</span>
          <div className="control-glow"></div>
        </div>
      </div>

      {/* Enhanced Map Container */}
      <div className="map-container enhanced">
        <div className="map-placeholder">
          <div className="mock-map enhanced">
            <div className="map-header">
              <h3>Interactive Map View</h3>
              <p>Showing {mapView === "villages" ? villages.length : claims.length} {mapView}</p>
            </div>
            
            {mapView === "villages" && (
              <div className="map-legend enhanced">
                <h4>Villages ({villages.length})</h4>
                {villages.slice(0, 5).map((village, index) => (
                  <div key={index} className="legend-item enhanced">
                    <div className="legend-icon villages">
                      <MapPin size={16} />
                    </div>
                    <div className="legend-content">
                      <span className="legend-title">{village.properties.name}</span>
                      <span className="legend-subtitle">{village.properties.district}</span>
                    </div>
                    <span className="legend-value">{village.properties.total_forest_area} ha</span>
                  </div>
                ))}
              </div>
            )}

            {mapView === "claims" && (
              <div className="map-legend enhanced">
                <h4>Claims ({claims.length})</h4>
                {claims.slice(0, 5).map((claim, index) => (
                  <div key={index} className="legend-item enhanced">
                    <div className={`legend-icon ${claim.properties.status}`}>
                      <div className={`status-dot ${claim.properties.status}`}></div>
                    </div>
                    <div className="legend-content">
                      <span className="legend-title">{claim.properties.claim_number}</span>
                      <span className="legend-subtitle">{claim.properties.beneficiary_name}</span>
                    </div>
                    <div className="legend-actions">
                      <button className="icon-btn mini">
                        <Eye size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="map-overlay"></div>
        </div>
      </div>

      {/* Enhanced Map Info Panel */}
      <div className="map-info-panel enhanced">
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

// Enhanced Claims Management (keeping same functionality)
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
        <div className="loading-spinner advanced"></div>
        <div className="loading-text">
          <p>Loading claims...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="claims-management enhanced">
      <div className="claims-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Claims Management</h2>
            <p>Review and process forest rights claims</p>
          </div>
          <div className="header-actions">
            <button className="action-btn primary">
              <FileText size={16} />
              New Claim
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Controls */}
      <div className="claims-filters enhanced">
        <div className="filter-group">
          <label>Filter by Status</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="enhanced-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="under_review">Under Review</option>
            <option value="contested">Contested</option>
          </select>
        </div>
        <div className="filter-stats">
          <span className="stat-chip">
            {claims.length} Total Claims
          </span>
        </div>
      </div>

      {/* Enhanced Claims Table */}
      <div className="claims-table-container enhanced">
        <table className="claims-table enhanced">
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
              <tr key={claim.id} className="enhanced-row">
                <td className="claim-number">{claim.claim_number}</td>
                <td>
                  <div className="beneficiary-info">
                    <span className="name">{claim.beneficiary_name}</span>
                  </div>
                </td>
                <td>
                  <span className="village-id">Village ID: {claim.village_id.slice(0, 8)}...</span>
                </td>
                <td>
                  <span className={`type-badge enhanced ${claim.claim_type.toLowerCase().replace(' ', '-')}`}>
                    {claim.claim_type}
                  </span>
                </td>
                <td className="area-cell">{claim.area_claimed}</td>
                <td>
                  <span className={`status-badge enhanced ${claim.status}`}>
                    {claim.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="ai-recommendation enhanced">
                    <span className={`ai-badge enhanced ${claim.ai_recommendation}`}>
                      {claim.ai_recommendation.toUpperCase()}
                    </span>
                    <small>{(claim.ai_confidence * 100).toFixed(0)}%</small>
                  </div>
                </td>
                <td>
                  <div className="action-buttons enhanced">
                    {claim.status === 'pending' && (
                      <>
                        <button 
                          className="btn-approve enhanced"
                          onClick={() => updateClaimStatus(claim.id, 'approved')}
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          className="btn-reject enhanced"
                          onClick={() => updateClaimStatus(claim.id, 'rejected')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    <button className="btn-view enhanced">
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
        <div className="empty-state enhanced">
          <FileText size={48} />
          <h3>No claims found</h3>
          <p>No claims match your current filter criteria</p>
          <button className="action-btn primary">
            Create New Claim
          </button>
        </div>  
      )}
    </div>
  );
};

// Enhanced Analytics Component (keeping same functionality)
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
        <div className="loading-spinner advanced"></div>
        <div className="loading-text">
          <p>Loading analytics...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics enhanced">
      <div className="analytics-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Analytics & Reports</h2>
            <p>Comprehensive insights into forest rights processing</p>
          </div>
          <div className="header-actions">
            <button className="action-btn primary">
              <BarChart3 size={16} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        <div className="analytics-section enhanced">
          <div className="section-header">
            <h3>Processing Statistics</h3>
            <div className="section-actions">
              <button className="icon-btn">
                <Activity size={16} />
              </button>
            </div>
          </div>
          <div className="stats-grid enhanced">
            <div className="stat-card enhanced">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <h4>Approval Rate</h4>
                <div className="stat-value">
                  {((analytics.approved_claims / analytics.total_claims) * 100).toFixed(1)}%
                </div>
                <div className="stat-progress">
                  <div className="progress-fill" style={{width: `${(analytics.approved_claims / analytics.total_claims) * 100}%`}}></div>
                </div>
              </div>
            </div>
            <div className="stat-card enhanced">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <h4>Average Processing Time</h4>
                <div className="stat-value">{analytics.average_processing_time} days</div>
                <div className="stat-progress">
                  <div className="progress-fill" style={{width: '75%'}}></div>
                </div>
              </div>
            </div>
            <div className="stat-card enhanced">
              <div className="stat-icon">
                <Star size={24} />
              </div>
              <div className="stat-content">
                <h4>OCR Accuracy</h4>
                <div className="stat-value">{(analytics.ocr_accuracy * 100).toFixed(1)}%</div>
                <div className="stat-progress">
                  <div className="progress-fill" style={{width: `${analytics.ocr_accuracy * 100}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-section enhanced">
          <div className="section-header">
            <h3>Scheme Integration</h3>
          </div>
          <div className="scheme-stats enhanced">
            <div className="scheme-item enhanced">
              <div className="scheme-icon">
                <Award size={20} />
              </div>
              <div className="scheme-content">
                <span className="scheme-name">PM-KISAN Integration</span>
                <div className="progress-container">
                  <div className="progress-bar enhanced">
                    <div className="progress enhanced" style={{width: '75%'}}></div>
                  </div>
                  <span className="progress-value">75%</span>
                </div>
              </div>
            </div>
            <div className="scheme-item enhanced">
              <div className="scheme-icon">
                <Shield size={20} />
              </div>
              <div className="scheme-content">
                <span className="scheme-name">MGNREGA Linkage</span>
                <div className="progress-container">
                  <div className="progress-bar enhanced">
                    <div className="progress enhanced" style={{width: '60%'}}></div>
                  </div>
                  <span className="progress-value">60%</span>
                </div>
              </div>
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
    <ThemeProvider>
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
                <Route path="/users" element={
                  <div className="page-placeholder enhanced">
                    <Users size={48} />
                    <h2>User Management</h2>
                    <p>User management interface coming soon</p>
                    <button className="action-btn primary">
                      Manage Users
                    </button>
                  </div>
                } />
                <Route path="/settings" element={
                  <div className="page-placeholder enhanced">
                    <Settings size={48} />
                    <h2>Settings</h2>
                    <p>System settings interface coming soon</p>
                    <button className="action-btn primary">
                      Configure Settings
                    </button>
                  </div>
                } />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;