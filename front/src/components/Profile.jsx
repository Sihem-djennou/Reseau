import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile({ user, setUser }) {
  const [bio, setBio] = useState(user?.bio || '');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const handleUpdateProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:5000/api/user/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bio })
      });
      
      if (response.ok) {
        const updatedUser = { ...user, bio };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:5000/api/user/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Error deleting account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-avatar-section">
          <img src={user?.avatar} alt={user?.username} className="profile-avatar-large" />
          <h2>{user?.username}</h2>
          <p className="user-email">{user?.email}</p>
        </div>

        <div className="profile-info-section">
          <div className="info-row">
            <label>Member Since:</label>
            <p>{new Date(user?.created_at).toLocaleDateString()}</p>
          </div>

          <div className="info-row">
            <label>Bio:</label>
            {editing ? (
              <div className="bio-edit">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="4"
                  placeholder="Tell something about yourself..."
                />
                <div className="edit-actions">
                  <button onClick={handleUpdateProfile} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => {
                    setEditing(false);
                    setBio(user?.bio || '');
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="bio-display">
                <p>{user?.bio || 'No bio yet'}</p>
                <button onClick={() => setEditing(true)} className="edit-bio-btn">
                  ✏️ Edit Bio
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button 
            className="delete-account-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            🗑️ Delete Account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-content confirm-delete" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Account</h3>
              <p>Are you sure you want to delete your account? This action cannot be undone.</p>
              <div className="confirm-buttons">
                <button onClick={handleDeleteAccount} className="confirm-delete-btn">
                  Yes, Delete
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;