import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Profile from './Profile';
import Contacts from './Contacts';
import ChatArea from './ChatArea';

function Dashboard({ user, setUser }) {
  const [socket, setSocket] = useState(null);
  const [activeSection, setActiveSection] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedContactProfile, setSelectedContactProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isFullChatMode, setIsFullChatMode] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('online-users', (users) => {
      setOnlineUsers(users || []);
    });

    newSocket.on('new-message', (message) => {
      loadConversations();
    });

    setSocket(newSocket);
    loadConversations();

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  const loadConversations = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      const data = await response.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length > 1) {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`http://localhost:5000/api/users/search?q=${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleNewChat = (selectedUser) => {
    handleSelectChat(selectedUser);
    setShowNewChatModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setIsFullChatMode(true);
    setSidebarOpen(false);
    setShowContactProfile(false);
  };

  const handleBackToChats = () => {
    setIsFullChatMode(false);
    setSelectedChat(null);
    setShowContactProfile(false);
  };

  const handleViewProfile = (contact) => {
    setSelectedContactProfile(contact);
    setShowContactProfile(true);
  };

  const handleCloseProfile = () => {
    setShowContactProfile(false);
    setSelectedContactProfile(null);
  };

  const handleLogout = () => {
    if (socket) socket.close();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(u => u.userId === userId);
  };

  // Full Chat Mode
  if (isFullChatMode && selectedChat) {
    return (
      <div className="full-chat-mode">
        <div className="full-chat-header">
          <button className="back-to-chats-btn" onClick={handleBackToChats}>
            ← Back
          </button>
          <div className="full-chat-contact" onClick={() => handleViewProfile(selectedChat)}>
            <img src={selectedChat.avatar} alt={selectedChat.username} className="full-chat-avatar" />
            <div className="full-chat-info">
              <h3>{selectedChat.username}</h3>
              <span className={`online-status ${isUserOnline(selectedChat.id) ? 'online' : 'offline'}`}>
                {isUserOnline(selectedChat.id) ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="full-chat-actions">
            <button className="contact-profile-btn" onClick={() => handleViewProfile(selectedChat)}>
              ℹ️
            </button>
          </div>
        </div>
        
        <ChatArea 
          user={user}
          selectedUser={selectedChat}
          socket={socket}
          onClose={handleBackToChats}
          onMessageSent={loadConversations}
          isFullScreen={true}
        />
        
        {/* Contact Profile Modal */}
        {showContactProfile && selectedContactProfile && (
          <div className="profile-modal-overlay" onClick={handleCloseProfile}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-profile-modal" onClick={handleCloseProfile}>×</button>
              <div className="profile-modal-content">
                <img src={selectedContactProfile.avatar} alt={selectedContactProfile.username} className="profile-modal-avatar" />
                <h2>{selectedContactProfile.username}</h2>
                <p className="profile-modal-bio">{selectedContactProfile.bio || 'No bio yet'}</p>
                <div className="profile-modal-info">
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className={`status-dot ${isUserOnline(selectedContactProfile.id) ? 'online' : 'offline'}`}>
                      {isUserOnline(selectedContactProfile.id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular Dashboard View
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={user?.avatar} alt={user?.username} className="sidebar-avatar" />
          <h3>{user?.username}</h3>
        </div>

        <div className="sidebar-menu">
          <button 
            className={`menu-item ${activeSection === 'chats' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('chats');
              setSidebarOpen(false);
            }}
          >
            💬 Chats
          </button>
          <button 
            className={`menu-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('profile');
              setSidebarOpen(false);
            }}
          >
            👤 Profile
          </button>
          <button 
            className={`menu-item ${activeSection === 'contacts' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('contacts');
              setSidebarOpen(false);
            }}
          >
            📞 Contacts
          </button>
        </div>

        <button onClick={handleLogout} className="logout-button">
          🚪 Logout
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content */}
      <div className="main-content">
        <div className="main-header">
  <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
    ☰
  </button>
  {(activeSection === 'profile' || activeSection === 'contacts') && (
    <button className="back-button" onClick={() => setActiveSection('chats')}>
      ←
    </button>
  )}
  <h2>
    {activeSection === 'chats' && 'Chats'}
    {activeSection === 'profile' && 'Profile'}
    {activeSection === 'contacts' && 'Contacts'}
  </h2>
</div>
        <div className="content-area">
          {activeSection === 'profile' && (
            <Profile user={user} setUser={setUser} />
          )}

          {activeSection === 'contacts' && (
            <Contacts user={user} socket={socket} onViewProfile={handleViewProfile} />
          )}

          {activeSection === 'chats' && (
            <div className="chats-section">
              <div className="chats-header">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="🔍 Search users..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <button 
                    className="new-chat-btn"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    + New Chat
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {searchResults.map(u => (
                      <div key={u.id} className="search-result-item" onClick={() => handleNewChat(u)}>
                        <img src={u.avatar} alt={u.username} className="avatar-small" />
                        <div>
                          <div className="username">{u.username}</div>
                          <div className="user-bio">{u.bio}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="conversations-list">
                {conversations.length === 0 ? (
                  <div className="no-conversations">
                    <p>No chats yet</p>
                    <p>Click + New Chat to start messaging!</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className="conversation-item"
                      onClick={() => handleSelectChat(conv)}
                    >
                      <img src={conv.avatar} alt={conv.username} className="avatar" />
                      <div className="conversation-info">
                        <div className="conversation-name">
                          {conv.username}
                          {isUserOnline(conv.id) && <span className="online-dot"></span>}
                        </div>
                        <div className="last-message">{conv.last_message || 'No messages yet'}</div>
                        {conv.unread_count > 0 && (
                          <span className="unread-badge">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>New Chat</h3>
                      <button className="close-btn" onClick={() => setShowNewChatModal(false)}>×</button>
                    </div>
                    <div className="modal-body">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        autoFocus
                      />
                      <div className="search-results-list">
                        {searchResults.map(u => (
                          <div key={u.id} className="search-result" onClick={() => handleNewChat(u)}>
                            <img src={u.avatar} alt={u.username} className="avatar" />
                            <div>
                              <div className="username">{u.username}</div>
                              <div className="bio">{u.bio}</div>
                            </div>
                          </div>
                        ))}
                        {searchResults.length === 0 && searchQuery.length > 1 && (
                          <div className="no-results">No users found</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;