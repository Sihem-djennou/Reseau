const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], // Add both origins
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const onlineUsers = new Map();

// Authentication middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
    const bio = 'Hello! I am using Simple Chat';
    
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, avatar, bio) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, avatar, bio]
    );
    
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { 
        id: result.insertId, 
        username, 
        email, 
        avatar,
        bio 
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        avatar: user.avatar, 
        bio: user.bio,
        created_at: user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
app.get('/api/user/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, avatar, bio, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
app.put('/api/user/:id', auth, async (req, res) => {
  const { bio, avatar } = req.body;
  
  try {
    await db.query(
      'UPDATE users SET bio = ?, avatar = ? WHERE id = ?',
      [bio, avatar, req.params.id]
    );
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
app.get('/api/users/search', auth, async (req, res) => {
  const { q } = req.query;
  
  try {
    const [rows] = await db.query(
      `SELECT id, username, avatar, bio FROM users 
       WHERE username LIKE ? AND id != ? 
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversations
app.get('/api/conversations', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT 
        u.id, u.username, u.avatar, u.bio,
        (
          SELECT message FROM messages 
          WHERE (sender_id = ? AND receiver_id = u.id) 
             OR (sender_id = u.id AND receiver_id = ?)
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM messages 
          WHERE (sender_id = ? AND receiver_id = u.id) 
             OR (sender_id = u.id AND receiver_id = ?)
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) FROM messages 
          WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
        ) as unread_count
      FROM users u
      WHERE u.id IN (
        SELECT sender_id FROM messages WHERE receiver_id = ?
        UNION
        SELECT receiver_id FROM messages WHERE sender_id = ?
      )
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
    
    res.json(rows);
  } catch (error) {
    // If no conversations yet, return empty array
    if (error.message.includes('messages')) {
      res.json([]);
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get messages
app.get('/api/messages/:userId', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [req.user.id, req.params.userId, req.params.userId, req.user.id]
    );
    
    // Mark messages as read
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
      [req.params.userId, req.user.id]
    );
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.username);
  onlineUsers.set(socket.userId, { socketId: socket.id, username: socket.username });
  
  io.emit('online-users', Array.from(onlineUsers.values()));
  
  socket.on('private-message', async (data) => {
    const { receiverId, message } = data;
    
    try {
      const [result] = await db.query(
        'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
        [socket.userId, receiverId, message]
      );
      
      const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      const messageData = rows[0];
      
      const receiver = onlineUsers.get(receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit('new-message', messageData);
      }
      
      socket.emit('message-sent', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  
  socket.on('typing', (data) => {
    const receiver = onlineUsers.get(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });
  
  socket.on('stop-typing', (data) => {
    const receiver = onlineUsers.get(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit('user-stop-typing', {
        userId: socket.userId
      });
    }
  });
  
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online-users', Array.from(onlineUsers.values()));
    console.log('❌ User disconnected:', socket.username);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
});