import React, { useState, useEffect } from 'react';

function Contacts({ user, socket }) {
  const [contacts, setContacts] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
    loadBlockedUsers();
  }, []);

  const loadContacts = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/blocked-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBlockedUsers(data);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const handleBlockUser = async (contactId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/block-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: contactId })
      });
      
      if (response.ok) {
        setBlockedUsers([...blockedUsers, contactId]);
        alert('User blocked successfully');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Error blocking user');
    }
  };

  const handleUnblockUser = async (contactId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/unblock-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: contactId })
      });
      
      if (response.ok) {
        setBlockedUsers(blockedUsers.filter(id => id !== contactId));
        alert('User unblocked successfully');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Error unblocking user');
    }
  };

  if (loading) {
    return <div className="loading">Loading contacts...</div>;
  }

  return (
    <div className="contacts-container">
      <h3>Your Contacts</h3>
      <div className="contacts-list">
        {contacts.length === 0 ? (
          <div className="no-contacts">
            <p>No contacts yet</p>
            <p>Start chatting with someone to add them to your contacts!</p>
          </div>
        ) : (
          contacts.map(contact => {
            const isBlocked = blockedUsers.includes(contact.id);
            return (
              <div key={contact.id} className="contact-item">
                <img src={contact.avatar} alt={contact.username} className="avatar" />
                <div className="contact-info">
                  <div className="contact-name">{contact.username}</div>
                  <div className="contact-bio">{contact.bio}</div>
                </div>
                <div className="contact-actions">
                  {isBlocked ? (
                    <button 
                      onClick={() => handleUnblockUser(contact.id)}
                      className="unblock-btn"
                    >
                      🔓 Unblock
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBlockUser(contact.id)}
                      className="block-btn"
                    >
                      🚫 Block
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {blockedUsers.length > 0 && (
        <div className="blocked-section">
          <h4>Blocked Users</h4>
          <div className="blocked-list">
            {contacts
              .filter(contact => blockedUsers.includes(contact.id))
              .map(blocked => (
                <div key={blocked.id} className="blocked-item">
                  <img src={blocked.avatar} alt={blocked.username} className="avatar-small" />
                  <span>{blocked.username}</span>
                  <button onClick={() => handleUnblockUser(blocked.id)} className="unblock-small-btn">
                    Unblock
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;