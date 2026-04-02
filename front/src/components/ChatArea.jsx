import React, { useState, useEffect, useRef } from 'react';

function ChatArea({ user, selectedUser, socket, onClose, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message-sent', (message) => {
      if (message.receiver_id === selectedUser.id || message.sender_id === selectedUser.id) {
        setMessages(prev => [...prev, message]);
        onMessageSent();
      }
    });

    socket.on('user-typing', (data) => {
      if (data.userId === selectedUser.id) {
        setOtherUserTyping(true);
      }
    });

    socket.on('user-stop-typing', (data) => {
      if (data.userId === selectedUser.id) {
        setOtherUserTyping(false);
      }
    });

    return () => {
      socket.off('message-sent');
      socket.off('user-typing');
      socket.off('user-stop-typing');
    };
  }, [socket, selectedUser]);

  const loadMessages = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${selectedUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('private-message', {
      receiverId: selectedUser.id,
      message: newMessage
    });

    setNewMessage('');
    handleStopTyping();
  };

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket.emit('typing', { receiverId: selectedUser.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (typing) {
      setTyping(false);
      socket.emit('stop-typing', { receiverId: selectedUser.id });
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-user-info">
          <img src={selectedUser.avatar} alt={selectedUser.username} className="avatar" />
          <div>
            <h3>{selectedUser.username}</h3>
          </div>
        </div>
        <button onClick={onClose} className="close-chat-btn">×</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
          >
            <div className="message-text">{msg.message}</div>
            <div className="message-time">
              {new Date(msg.created_at).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {otherUserTyping && (
          <div className="typing-indicator">
            {selectedUser.username} is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
        />
        <button type="submit">Send</button>
        <button type="submit">clear</button>
      </form>
    </div>
  );
}

export default ChatArea;