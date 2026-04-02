import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, 
  faUser, 
  faAddressBook, 
  faSignOutAlt, 
  faPlus, 
  faSearch,
  faTimes,
  faPaperPlane,
  faInfoCircle,
  faArrowLeft,
  faBars
} from '@fortawesome/free-solid-svg-icons';
import Profile from './Profile';
import Contacts from './Contacts';

function Dashboard({ user, setUser }) {
  const [socket, setSocket] = useState(null);
  const [activeSection, setActiveSection] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showContactProfileModal, setShowContactProfileModal] = useState(false);
  const [selectedContactProfile, setSelectedContactProfile] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const navigate = useNavigate();
const AES_SECRET_KEY = "1234567890123456"; 
const encryptMessage = (message) => {
  return CryptoJS.AES.encrypt(message, AES_SECRET_KEY).toString();
};
const decryptMessage = (encryptedMessage) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, AES_SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedMessage;
  } catch (error) {
    return encryptedMessage;
  }
};
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
      if (selectedChat && message.sender_id === selectedChat.id) {
        loadMessages(selectedChat.id);
      }
    });

    newSocket.on('user-typing', (data) => {
      if (selectedChat && data.userId === selectedChat.id) {
        setOtherUserTyping(true);
      }
    });

    newSocket.on('user-stop-typing', (data) => {
      if (selectedChat && data.userId === selectedChat.id) {
        setOtherUserTyping(false);
      }
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

  const loadMessages = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
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
    handleOpenChat(selectedUser);
    setShowNewChatModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleOpenChat = async (chat) => {
    setSelectedChat(chat);
    await loadMessages(chat.id);
    setShowChatModal(true);
    setSidebarOpen(false);
  };

  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setSelectedChat(null);
    setMessages([]);
    setNewMessage('');
    setOtherUserTyping(false);
  };

  const handleViewProfile = (contact) => {
    setSelectedContactProfile(contact);
    setShowContactProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setShowContactProfileModal(false);
    setSelectedContactProfile(null);
  };

  const sendMessage = (messageToSend) => {
  if (!messageToSend.trim() || !socket || !selectedChat) return;

  socket.emit('private-message', {
    receiverId: selectedChat.id,
    message: messageToSend
  });

  const tempMessage = {
    id: Date.now(),
    sender_id: user.id,
    receiver_id: selectedChat.id,
    message: messageToSend,
    created_at: new Date().toISOString(),
    is_read: 0
  };

  setMessages(prev => [...prev, tempMessage]);
  setNewMessage('');
  handleStopTyping();

  setTimeout(() => {
    const messagesContainer = document.querySelector('.chat-modal-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, 100);
};

const handleSendMessage = (e) => {
  e.preventDefault();
  sendMessage(newMessage); // message normal
};
const handleEncryptAndSend = () => {
  if (!newMessage.trim()) return;

  const encrypted = encryptMessage(newMessage);
  sendMessage(encrypted);
};

  const handleTyping = () => {
    if (!typing && selectedChat) {
      setTyping(true);
      socket.emit('typing', { receiverId: selectedChat.id });
    }

    if (window.typingTimeout) clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (typing && selectedChat) {
      setTyping(false);
      socket.emit('stop-typing', { receiverId: selectedChat.id });
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      socket.close();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Force navigation to login
    window.location.href = '/login';
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
            <FontAwesomeIcon icon={faComments} className="menu-icon" />
            Chats
          </button>
          <button 
            className={`menu-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('profile');
              setSidebarOpen(false);
            }}
          >
            <FontAwesomeIcon icon={faUser} className="menu-icon" />
            Profile
          </button>
          <button 
            className={`menu-item ${activeSection === 'contacts' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('contacts');
              setSidebarOpen(false);
            }}
          >
            <FontAwesomeIcon icon={faAddressBook} className="menu-icon" />
            Contacts
          </button>
        </div>

        <button onClick={handleLogout} className="logout-button">
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          Logout
        </button>
      </div>

      {/* Overlay for sidebar */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Main Content */}
      <div className="main-content">
        <div className="main-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
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
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  <button 
                    className="new-chat-btn"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <FontAwesomeIcon icon={faPlus} /> New Chat
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
                      onClick={() => handleOpenChat(conv)}
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

              {/* New Chat Modal */}
              {showNewChatModal && (
                <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>New Chat</h3>
                      <button className="close-btn" onClick={() => setShowNewChatModal(false)}>
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
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

      {/* Chat Modal */}
      {showChatModal && selectedChat && (
        <div className="modal-overlay" onClick={handleCloseChatModal}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <div className="chat-modal-user" onClick={() => handleViewProfile(selectedChat)}>
                <img src={selectedChat.avatar} alt={selectedChat.username} className="chat-modal-avatar" />
                <div className="chat-modal-info">
                  <h3>{selectedChat.username}</h3>
                  <span className={`online-status ${isUserOnline(selectedChat.id) ? 'online' : 'offline'}`}>
                    {isUserOnline(selectedChat.id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <button className="close-modal-btn" onClick={handleCloseChatModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="chat-modal-messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                >
<div className="chat-message-text">{decryptMessage(msg.message)}</div>
                  <div className="chat-message-time">
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              {otherUserTyping && (
                <div className="typing-indicator">
                  {selectedChat.username} is typing...
                </div>
              )}
            </div>

            <form className="chat-modal-input" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
              />
              <button type="submit">
                <FontAwesomeIcon icon={faPaperPlane} /> Send
              </button>
             <button
  type="button"
  onClick={handleEncryptAndSend}
>
  Chiffrer
</button>
            </form>
          </div>
        </div>
      )}

      {/* Contact Profile Modal */}
      {showContactProfileModal && selectedContactProfile && (
        <div className="modal-overlay" onClick={handleCloseProfileModal}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-profile-modal" onClick={handleCloseProfileModal}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
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

export default Dashboard;