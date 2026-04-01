import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Profile from './Profile';
import Contacts from './Contacts';
import ChatArea from './ChatArea';

function Dashboard({ user, setUser }) {
  const [socket, setSocket] = useState(null);
  const [activeSection, setActiveSection] = useState('chats'); // 'chats', 'profile', 'contacts'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('new-message', (message) => {
      // Update conversations when new message arrives
      loadConversations();
      if (selectedChat && message.sender_id === selectedChat.id) {
        // Message will be loaded by ChatArea component
      }
    });

    setSocket(newSocket);
    loadConversations();

    return () => newSocket.close();
  }, []);

  const loadConversations = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
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
        setSearchResults(data);
      } catch (error) {
        console.error('Error searching:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleNewChat = (selectedUser) => {
    setSelectedChat(selectedUser);
    setShowNewChatModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(u => u.userId === userId);
  };

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

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="main-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h2>
            {activeSection === 'chats' && 'Chats'}
            {activeSection === 'profile' && 'Profile'}
            {activeSection === 'contacts' && 'Contacts'}
          </h2>
        </div>

        {/* Content */}
        <div className="content-area">
          {activeSection === 'profile' && (
            <Profile user={user} setUser={setUser} />
          )}

          {activeSection === 'contacts' && (
            <Contacts user={user} socket={socket} />
          )}

          {activeSection === 'chats' && (
            <div className="chats-section">
              {/* Search Bar and New Chat Button */}
              <div className="chats-header">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="🔍 Search chats or users..."
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

                {/* Search Results */}
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

              {/* Conversations List */}
              <div className="conversations-list">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${selectedChat?.id === conv.id ? 'active' : ''}`}
                    onClick={() => setSelectedChat(conv)}
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
                ))}
                {conversations.length === 0 && (
                  <div className="no-conversations">
                    <p>No chats yet</p>
                    <p>Click + New Chat to start messaging!</p>
                  </div>
                )}
              </div>

              {/* New Chat Modal */}
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

      {/* Chat Area - Only show when a chat is selected */}
      {selectedChat && activeSection === 'chats' && (
        <ChatArea 
          user={user}
          selectedUser={selectedChat}
          socket={socket}
          onClose={() => setSelectedChat(null)}
          onMessageSent={loadConversations}
        />
      )}
    </div>
  );
}

export default Dashboard;