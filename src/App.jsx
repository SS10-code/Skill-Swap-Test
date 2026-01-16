import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Calendar, User, Award, MessageCircle, Users, Shield, LogOut, Search, Star, Clock, CheckCircle, Home, Zap, Sparkles, Trophy, Target, Plus, Send, X, Trash2, UserX, UserCheck, ChevronDown } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyAhPSxvy-XQMcZp9BZQ1vmjJE-sFsTCHdA",
  authDomain: "bpa-skill-swap.firebaseapp.com",
  projectId: "bpa-skill-swap",
  storageBucket: "bpa-skill-swap.firebasestorage.app",
  messagingSenderId: "378435376890",
  appId: "1:378435376890:web:2e3eccfb40e5174d235b43"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ACHIEVEMENTS = [
  { id: 'first_session', name: 'First Steps', icon: '🎯', color: 'from-orange-500 to-red-500' },
  { id: 'five_sessions', name: 'Rising Star', icon: '🌟', color: 'from-blue-500 to-purple-500' },
  { id: 'ten_sessions', name: 'Expert', icon: '🏆', color: 'from-yellow-500 to-orange-500' }
];

export default function SkillSwap() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [gradYear, setGradYear] = useState('2026');
  const [isRegister, setIsRegister] = useState(false);
  const [bio, setBio] = useState('');
  const [offeredSkills, setOfferedSkills] = useState([]);
  const [soughtSkills, setSoughtSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [sessions, setSessions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sessionSkill, setSessionSkill] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRatings, setUserRatings] = useState([]);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    sessionReminders: true,
    showProfile: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileDoc.exists()) {
          const profile = profileDoc.data();
          setUserProfile(profile);
          
          // Check if user is disabled
          if (profile.disabled) {
            alert('⛔ Your account has been disabled by an administrator.');
            await signOut(auth);
            return;
          }
          
          setBio(profile.bio || '');
          setOfferedSkills(profile.offeredSkills || []);
          setSoughtSkills(profile.soughtSkills || []);
          setPage(profile.role === 'admin' ? 'admin' : 'dashboard');
        }
      } else {
        setPage('login');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && userProfile) loadUserData();
  }, [user, userProfile, page]);

  useEffect(() => {
    if (user && (page === 'dashboard' || page === 'sessions' || page === 'notifications')) {
      loadNotifications();
    }
  }, [user, page, sessions, messages]);

  const loadNotifications = async () => {
    if (!user) return;
    
    const notifs = [];
    
    // Check for new session requests
    const pendingSessions = sessions.filter(s => 
      s.status === 'pending' && s.providerId === user.uid
    );
    pendingSessions.forEach(s => {
      notifs.push({
        id: `session-${s.id}`,
        type: 'session_request',
        title: 'New Session Request',
        message: `${s.requesterName} wants to learn ${s.skill}`,
        time: s.createdAt,
        link: 'sessions',
        sessionId: s.id
      });
    });
    
    // Check for accepted sessions
    const acceptedSessions = sessions.filter(s => 
      s.status === 'accepted' && s.requesterId === user.uid
    );
    acceptedSessions.forEach(s => {
      notifs.push({
        id: `accepted-${s.id}`,
        type: 'session_accepted',
        title: 'Session Accepted!',
        message: `${s.providerName} accepted your ${s.skill} session`,
        time: s.createdAt,
        link: 'sessions',
        sessionId: s.id
      });
    });
    
    // Check for new messages
    const userSessions = sessions.filter(s => s.status === 'accepted');
    for (const session of userSessions) {
      try {
        const messagesSnap = await getDocs(
          query(
            collection(db, 'messages'), 
            where('sessionId', '==', session.id),
            orderBy('createdAt', 'desc')
          )
        );
        
        // Filter out messages from current user
        const filteredMessages = messagesSnap.docs
          .map(d => d.data())
          .filter(msg => msg.fromUserId !== user.uid);
        
        if (filteredMessages.length > 0) {
          const lastMsg = filteredMessages[0];
          notifs.push({
            id: `msg-${session.id}`,
            type: 'new_message',
            title: 'New Message',
            message: `${lastMsg.fromName}: ${lastMsg.body.substring(0, 50)}...`,
            time: lastMsg.createdAt,
            link: 'chat',
            sessionId: session.id,
            session: session
          });
        }
      } catch (error) {
        console.error('Error loading messages for session:', session.id, error);
      }
    }
    
    // Sort by time
    notifs.sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0));
    
    setNotifications(notifs);
    setUnreadCount(notifs.length);
  };

  const loadUserData = async () => {
    if (page === 'dashboard' || page === 'sessions') {
      try {
        const sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('participants', 'array-contains', user.uid)));
        setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Load ratings for current user
        const ratingsSnap = await getDocs(
          query(collection(db, 'ratings'), where('rateeId', '==', user.uid))
        );
        setUserRatings(ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const usersSnap = await getDocs(collection(db, 'users'));
        setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid && u.role === 'student' && !u.disabled));
      } catch (error) {
        // Silently handle error - permissions issue
        setAllUsers([]);
      }
    }
    if (page === 'admin') {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const usersWithStats = await Promise.all(users.map(async (u) => {
          const userSessions = await getDocs(query(collection(db, 'sessions'), where('participants', 'array-contains', u.id)));
          return {
            ...u,
            totalSessions: userSessions.docs.length,
            completedSessions: userSessions.docs.filter(s => s.data().status === 'completed').length
          };
        }));
        
        setAdminUsers(usersWithStats);
      } catch (error) {
        setAdminUsers([]);
      }
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name, email, role, gradYear, createdAt: Timestamp.now(),
          offeredSkills: [], soughtSkills: [], achievements: [], sessionsCompleted: 0,
          allowSessionRequests: true, allowMessages: true, isPrivate: false, disabled: false
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) { alert(err.message); }
  };

  const updateProfile = async () => {
    await updateDoc(doc(db, 'users', user.uid), { bio, offeredSkills, soughtSkills, settings });
    setUserProfile({ ...userProfile, bio, offeredSkills, soughtSkills, settings });
    alert('✅ Profile saved!');
  };

  const requestSession = async () => {
    if (!selectedUser || !sessionSkill || !sessionDate || !sessionTime) {
      return alert('Fill all fields!');
    }
    
    // Check if date is in the past
    const selectedDateTime = new Date(`${sessionDate}T${sessionTime}`);
    const now = new Date();
    
    if (selectedDateTime < now) {
      return alert('⚠️ Session date and time cannot be in the past!');
    }
    
    try {
      await addDoc(collection(db, 'sessions'), {
        requesterId: user.uid, 
        requesterName: userProfile.name,
        providerId: selectedUser.id, 
        providerName: selectedUser.name,
        skill: sessionSkill, 
        startTime: Timestamp.fromDate(selectedDateTime),
        location: sessionLocation, 
        status: 'pending', 
        participants: [user.uid, selectedUser.id],
        createdAt: Timestamp.now()
      });
      
      alert('🚀 Session requested!');
      setSessionSkill('');
      setSessionDate('');
      setSessionTime('');
      setSessionLocation('');
      setPage('dashboard');
      loadUserData();
    } catch (error) {
      console.error('Error requesting session:', error);
      alert('Failed to request session. Please try again.');
    }
  };

  const updateSessionStatus = async (sid, status) => {
    await updateDoc(doc(db, 'sessions', sid), { status });
    if (status === 'completed') {
      const cnt = (userProfile.sessionsCompleted || 0) + 1;
      await updateDoc(doc(db, 'users', user.uid), { sessionsCompleted: cnt });
    }
    loadUserData();
  };

  const submitRating = async (sid) => {
    if (!ratingComment.trim()) {
      alert('Please provide a comment with your rating!');
      return;
    }
    
    try {
      const sess = sessions.find(s => s.id === sid);
      const rateeId = sess.requesterId === user.uid ? sess.providerId : sess.requesterId;
      
      await addDoc(collection(db, 'ratings'), {
        sessionId: sid, 
        raterId: user.uid, 
        raterName: userProfile.name,
        rateeId: rateeId,
        score: ratingScore, 
        comment: ratingComment, 
        skill: sess.skill,
        createdAt: Timestamp.now()
      });
      
      alert('⭐ Rating submitted!');
      setRatingScore(5);
      setRatingComment('');
      setSelectedSession(null);
      setPage('sessions');
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;
    
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      await addDoc(collection(db, 'messages'), {
        sessionId: selectedSession.id, 
        fromUserId: user.uid, 
        fromName: userProfile.name,
        body: messageText, 
        createdAt: Timestamp.now()
      });
      
      // Reload messages to show the new one
      await loadMessages(selectedSession.id);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
      alert('Failed to send message: ' + error.message);
    }
  };

  const loadMessages = async (sid) => {
    if (!sid) return;
    
    try {
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('sessionId', '==', sid)
      );
      
      const snap = await getDocs(messagesQuery);
      const loadedMessages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort by createdAt on client side
      loadedMessages.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      alert('Could not load messages: ' + error.message);
      setMessages([]);
    }
  };

  // Admin functions
  const toggleUserStatus = async (userId, currentStatus) => {
    await updateDoc(doc(db, 'users', userId), { disabled: !currentStatus });
    alert(!currentStatus ? '🚫 User disabled' : '✅ User enabled');
    loadUserData();
  };

  const deleteUser = async (userId) => {
    if (!confirm('⚠️ Are you sure? This will permanently delete this user and all their data.')) return;
    
    // Delete user sessions
    const userSessions = await getDocs(query(collection(db, 'sessions'), where('participants', 'array-contains', userId)));
    for (const sessionDoc of userSessions.docs) {
      await deleteDoc(doc(db, 'sessions', sessionDoc.id));
    }
    
    // Delete user ratings
    const userRatings = await getDocs(query(collection(db, 'ratings'), where('raterId', '==', userId)));
    for (const ratingDoc of userRatings.docs) {
      await deleteDoc(doc(db, 'ratings', ratingDoc.id));
    }
    
    // Delete user messages
    const userMessages = await getDocs(query(collection(db, 'messages'), where('fromUserId', '==', userId)));
    for (const msgDoc of userMessages.docs) {
      await deleteDoc(doc(db, 'messages', msgDoc.id));
    }
    
    // Finally delete user document
    await deleteDoc(doc(db, 'users', userId));
    
    alert('🗑️ User deleted successfully');
    loadUserData();
  };

  const changeUserRole = async (userId, newRole) => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    alert(`✅ User role changed to ${newRole}`);
    loadUserData();
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <Sparkles className="relative w-16 h-16 text-orange-500 animate-spin" />
      </div>
    </div>
  );

  if (page === 'login') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md border border-orange-500/20 shadow-2xl shadow-orange-500/10">
        <div className="flex flex-col items-center justify-center mb-2">
          <div className="flex items-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-500 rounded-full blur-xl opacity-50"></div>
              <Zap className="relative w-12 h-12 text-orange-500 mr-2" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">SkillSwap</h1>
          </div>
          <p className="text-slate-300 text-center font-medium mb-1">Student Talent Exchange Program</p>
          <p className="text-slate-500 text-sm text-center">Wakeland High School BPA</p>
          <p className="text-slate-500 text-xs text-center">Frisco, Texas, USA</p>
        </div>
        <p className="text-slate-400 text-center mb-8 font-medium mt-4">Where Talents Meet & Grow</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-2xl border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder-slate-500"
                required 
              />
              <select 
                value={role} 
                onChange={e => setRole(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-2xl border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <input 
                type="number" 
                placeholder="Graduation Year" 
                value={gradYear} 
                onChange={e => setGradYear(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-2xl border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder-slate-500"
              />
            </>
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-2xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-2xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500"
            required 
          />
          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            {isRegister ? '🚀 Create Account' : '✨ Sign In'}
          </button>
        </form>
        
        <button 
          onClick={() => setIsRegister(!isRegister)} 
          className="w-full mt-4 text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );

  const Nav = () => (
    <nav className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4 sticky top-0 z-50">
      <div className="flex justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-8">
          <button onClick={() => setPage(userProfile?.role === 'admin' ? 'admin' : 'dashboard')} className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-500 rounded-full blur-lg opacity-50"></div>
              <Zap className="relative w-8 h-8 text-orange-500 mr-2" />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">SkillSwap</h1>
              <p className="text-xs text-slate-400">Student Talent Exchange</p>
            </div>
          </button>
          {userProfile?.role === 'student' && (
            <div className="flex space-x-2">
              <button 
                onClick={() => setPage('dashboard')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  page === 'dashboard' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Home size={18} /><span>Dashboard</span>
              </button>
              <button 
                onClick={() => setPage('sessions')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  page === 'sessions' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Calendar size={18} /><span>Sessions</span>
              </button>
              <button 
                onClick={() => setPage('profile')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  page === 'profile' 
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <User size={18} /><span>Profile</span>
              </button>
              <button 
                onClick={() => setPage('notifications')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all relative ${
                  page === 'notifications' 
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <MessageCircle size={18} />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setPage('settings')} 
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                  page === 'settings' 
                    ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Award size={18} /><span>Settings</span>
              </button>
            </div>
          )}
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => setPage('admin')} 
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
            >
              <Shield size={18} /><span>Admin Panel</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-white font-semibold">{userProfile?.name}</p>
            <p className="text-xs text-slate-400">{userProfile?.role}</p>
          </div>
          <button 
            onClick={() => signOut(auth)} 
            className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );

  if (page === 'dashboard') {
    const filtered = allUsers.filter(u => {
      const searchLower = searchTerm.toLowerCase().trim();
      if (!searchLower) return true;
      
      const nameMatch = u.name?.toLowerCase().includes(searchLower);
      const skillMatch = Array.isArray(u.offeredSkills) && u.offeredSkills.some(skill => {
        const skillName = typeof skill === 'string' ? skill : skill?.name;
        return skillName?.toLowerCase().includes(searchLower);
      });
      
      return nameMatch || skillMatch;
    });
    
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-5xl font-black text-white mb-2 flex items-center">
              <Sparkles className="mr-3 text-orange-500" />
              Welcome back,
            </h2>
            <p className="text-4xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-blue-500 bg-clip-text text-transparent">{userProfile?.name}!</p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="group relative bg-gradient-to-br from-orange-500/20 to-red-500/20 p-6 rounded-2xl border border-orange-500/30 hover:border-orange-500/50 transition-all hover:scale-[1.02] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/10 group-hover:to-red-500/10 rounded-2xl transition-all"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-300 text-sm font-semibold">Sessions Completed</p>
                  <CheckCircle className="text-orange-400" size={24} />
                </div>
                <p className="text-5xl font-black text-white">{userProfile?.sessionsCompleted || 0}</p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-blue-500/30 hover:border-blue-500/50 transition-all hover:scale-[1.02] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 rounded-2xl transition-all"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-300 text-sm font-semibold">Skills Offered</p>
                  <Target className="text-blue-400" size={24} />
                </div>
                <p className="text-5xl font-black text-white">{userProfile?.offeredSkills?.length || 0}</p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-6 rounded-2xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all hover:scale-[1.02] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-500/0 group-hover:from-yellow-500/10 group-hover:to-orange-500/10 rounded-2xl transition-all"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-300 text-sm font-semibold">Achievements</p>
                  <Trophy className="text-yellow-400" size={24} />
                </div>
                <p className="text-5xl font-black text-white">{userProfile?.achievements?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          {userProfile?.achievements?.length > 0 && (
            <div className="mb-8 bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-blue-500/30">
              <h3 className="text-3xl font-black text-white mb-6 flex items-center">
                <Trophy className="mr-3 text-yellow-400" />Your Achievements
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {userProfile.achievements.map(aid => {
                  const ach = ACHIEVEMENTS.find(a => a.id === aid);
                  return (
                    <div key={aid} className={`relative group bg-gradient-to-br ${ach?.color} p-8 rounded-2xl overflow-hidden hover:scale-105 transition-all cursor-pointer`}>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all"></div>
                      <div className="relative">
                        <div className="text-6xl mb-3">{ach?.icon}</div>
                        <h4 className="font-black text-white text-xl">{ach?.name}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Find Skills Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-orange-500/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h3 className="text-4xl font-black text-white flex items-center">
                <Target className="mr-3 text-orange-400" />Discover Skills
              </h3>
              <div className="flex items-center bg-slate-900/80 px-5 py-3 rounded-xl border border-slate-700/50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all w-full md:w-auto">
                <Search className="text-slate-400 mr-3" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by name or skill..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent text-white outline-none placeholder-slate-500 w-full md:w-64" 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Search className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400 text-lg">No students found matching "{searchTerm}"</p>
                  <p className="text-slate-500 text-sm mt-2">Try searching by name or skill</p>
                </div>
              ) : (
                filtered.map(student => (
                  <div key={student.id} className="group relative bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-2xl transition-all"></div>
                    
                    <div className="relative">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-white text-xl mb-1">{student.name}</h4>
                          <p className="text-sm text-slate-400 font-medium">Class of {student.gradYear}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <User className="text-white" size={28} />
                        </div>
                      </div>

                      {student.offeredSkills?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Offers</p>
                          <div className="flex flex-wrap gap-2">
                            {student.offeredSkills.map((sk, i) => (
                              <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold rounded-full">
                                {typeof sk === 'string' ? sk : sk.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={() => { setSelectedUser(student); setPage('request'); }}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                      >
                        Request Session
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'request' && selectedUser) return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => setPage('dashboard')} className="mb-6 text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center">
          ← Back to Dashboard
        </button>
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-orange-500/30 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-2">Request Session</h2>
          <p className="text-slate-400 mb-8">with {selectedUser.name}</p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-slate-300 font-semibold mb-2 text-sm">Skill</label>
              <select 
                value={sessionSkill} 
                onChange={e => setSessionSkill(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              >
                <option value="">Choose skill...</option>
                {selectedUser.offeredSkills?.map((sk, i) => <option key={i} value={sk.name}>{sk.name}</option>)}
              </select>
            </div>
            
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-sm">Date</label>
                <input 
                  type="date" 
                  value={sessionDate} 
                  onChange={e => setSessionDate(e.target.value)}
                  min={getTodayDate()}
                  className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-sm">Time</label>
                <input 
                  type="time" 
                  value={sessionTime} 
                  onChange={e => setSessionTime(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-slate-300 font-semibold mb-2 text-sm">Location or Meeting Link</label>
              <input 
                type="text" 
                placeholder="e.g., Library Room 204 or Zoom link" 
                value={sessionLocation} 
                onChange={e => setSessionLocation(e.target.value)}
                className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder-slate-500" 
              />
            </div>
            
            <button 
              onClick={requestSession}
              className="w-full py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 text-lg"
            >
              Send Request 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (page === 'sessions') {
    const pending = sessions.filter(s => s.status === 'pending');
    const upcoming = sessions.filter(s => s.status === 'accepted');
    const completed = sessions.filter(s => s.status === 'completed');
    
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="max-w-7xl mx-auto p-6">
          <h2 className="text-4xl font-black text-white mb-8 flex items-center">
            <Calendar className="mr-3 text-blue-400" />
            My Sessions
          </h2>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pending */}
            <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-orange-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-orange-400 flex items-center">
                  <Clock className="mr-2" size={24} />Pending
                </h3>
                <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-full text-sm font-bold">{pending.length}</span>
              </div>
              
              <div className="space-y-3">
                {pending.map(s => (
                  <div key={s.id} className="bg-slate-800/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 hover:border-orange-500/50 transition-all">
                    <p className="font-bold text-white text-lg mb-1">{s.skill}</p>
                    <p className="text-sm text-slate-400 mb-3">{s.requesterId === user.uid ? `With ${s.providerName}` : `From ${s.requesterName}`}</p>
                    
                    {s.providerId === user.uid && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateSessionStatus(s.id, 'accepted')} 
                          className="flex-1 py-2.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl font-semibold hover:bg-green-500/30 transition-all"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => updateSessionStatus(s.id, 'declined')} 
                          className="flex-1 py-2.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {pending.length === 0 && (
                  <p className="text-slate-500 text-center py-8 text-sm">No pending sessions</p>
                )}
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-blue-400 flex items-center">
                  <Calendar className="mr-2" size={24} />Upcoming
                </h3>
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-bold">{upcoming.length}</span>
              </div>
              
              <div className="space-y-3">
                {upcoming.map(s => (
                  <div key={s.id} className="bg-slate-800/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all">
                    <p className="font-bold text-white text-lg mb-1">{s.skill}</p>
                    <p className="text-sm text-slate-400 mb-3">{s.location}</p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedSession(s); setPage('chat'); loadMessages(s.id); }}
                        className="flex-1 py-2.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl font-semibold hover:bg-blue-500/30 transition-all flex items-center justify-center"
                      >
                        <MessageCircle size={16} className="mr-1" />Chat
                      </button>
                      <button 
                        onClick={() => updateSessionStatus(s.id, 'completed')} 
                        className="flex-1 py-2.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl font-semibold hover:bg-green-500/30 transition-all"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                ))}
                
                {upcoming.length === 0 && (
                  <p className="text-slate-500 text-center py-8 text-sm">No upcoming sessions</p>
                )}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-green-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-green-400 flex items-center">
                  <CheckCircle className="mr-2" size={24} />Completed
                </h3>
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full text-sm font-bold">{completed.length}</span>
              </div>
              
              <div className="space-y-3">
                {completed.map(s => (
                  <div key={s.id} className="bg-slate-800/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-700/50 hover:border-green-500/50 transition-all">
                    <p className="font-bold text-white text-lg mb-3">{s.skill}</p>
                    
                    <button 
                      onClick={() => { setSelectedSession(s); setPage('rate'); }}
                      className="w-full py-2.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-xl font-semibold hover:bg-yellow-500/30 transition-all flex items-center justify-center"
                    >
                      <Star size={16} className="mr-1" />Rate Session
                    </button>
                  </div>
                ))}
                
                {completed.length === 0 && (
                  <p className="text-slate-500 text-center py-8 text-sm">No completed sessions</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'notifications') return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-4xl font-black text-white mb-8 flex items-center">
          <MessageCircle className="mr-3 text-purple-400" />
          Notifications
        </h2>
        
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-slate-900/50 backdrop-blur-xl p-12 rounded-3xl border border-slate-700/50 text-center">
              <MessageCircle className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400 text-lg">No notifications yet</p>
              <p className="text-slate-500 text-sm mt-2">You'll see updates about sessions and messages here</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                onClick={() => {
                  if (notif.link === 'chat' && notif.session) {
                    setSelectedSession(notif.session);
                    loadMessages(notif.sessionId);
                    setPage('chat');
                  } else {
                    setPage(notif.link);
                  }
                  setUnreadCount(Math.max(0, unreadCount - 1));
                }}
                className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    notif.type === 'session_request' ? 'bg-orange-500/20 text-orange-400' :
                    notif.type === 'session_accepted' ? 'bg-green-500/20 text-green-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {notif.type === 'session_request' && <Clock size={24} />}
                    {notif.type === 'session_accepted' && <CheckCircle size={24} />}
                    {notif.type === 'new_message' && <MessageCircle size={24} />}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-1">{notif.title}</h3>
                    <p className="text-slate-400">{notif.message}</p>
                    <p className="text-slate-500 text-sm mt-2">
                      {notif.time?.toDate?.()?.toLocaleString() || 'Just now'}
                    </p>
                  </div>
                  
                  <ChevronDown className="text-slate-600 group-hover:text-purple-400 transition-colors transform -rotate-90" size={20} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (page === 'settings') return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-4xl font-black text-white mb-8 flex items-center">
          <Award className="mr-3 text-slate-400" />
          Settings
        </h2>
        
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-white">Email Notifications</p>
                  <p className="text-sm text-slate-400">Receive emails about new sessions</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.emailNotifications ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-white">Session Reminders</p>
                  <p className="text-sm text-slate-400">Get reminded before sessions start</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, sessionReminders: !settings.sessionReminders})}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.sessionReminders ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.sessionReminders ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-white">Show Profile Publicly</p>
                  <p className="text-sm text-slate-400">Let other students find you</p>
                </div>
                <button
                  onClick={() => setSettings({...settings, showProfile: !settings.showProfile})}
                  className={`w-14 h-8 rounded-full transition-all ${
                    settings.showProfile ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    settings.showProfile ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Name</span>
                <span className="text-white font-semibold">{userProfile?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email</span>
                <span className="text-white font-semibold">{userProfile?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Class of</span>
                <span className="text-white font-semibold">{userProfile?.gradYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role</span>
                <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-sm font-bold">
                  {userProfile?.role}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={updateProfile}
            className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 text-lg"
          >
            Save Settings ✅
          </button>
        </div>
      </div>
    </div>
  );

  if (page === 'chat' && selectedSession) {
    // Auto-scroll to bottom when messages change
    const messagesEndRef = React.useRef(null);
    
    React.useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="max-w-4xl mx-auto p-6">
          <button onClick={() => setPage('sessions')} className="mb-6 text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center">
            ← Back to Sessions
          </button>
          
          <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <MessageCircle className="mr-3 text-blue-400" size={28} />
              Chat: {selectedSession.skill}
            </h2>
            
            <div className="bg-slate-950/50 rounded-2xl p-5 h-96 overflow-y-auto mb-5 space-y-3 border border-slate-800/50">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.fromUserId === user.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs ${m.fromUserId === user.uid ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-slate-800'} p-4 rounded-2xl shadow-lg`}>
                    <p className="text-xs text-slate-300 mb-1 font-semibold">{m.fromName}</p>
                    <p className="text-white">{m.body}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              
              {messages.length === 0 && (
                <p className="text-slate-500 text-center py-16">No messages yet. Start the conversation!</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <input 
                type="text" 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..." 
                className="flex-1 px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500" 
              />
              <button 
                onClick={sendMessage} 
                className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/25"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'rate' && selectedSession) return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => setPage('sessions')} className="mb-6 text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center">
          ← Back to Sessions
        </button>
        
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-yellow-500/30 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-2">Rate Session</h2>
          <p className="text-slate-400 mb-8">How was your experience with {selectedSession.skill}?</p>
          
          <div className="mb-8">
            <label className="block text-slate-300 font-semibold mb-4 text-lg">Your Rating</label>
            <div className="flex gap-3 justify-center">
              {[1,2,3,4,5].map(n => (
                <button 
                  key={n} 
                  onClick={() => setRatingScore(n)} 
                  className={`p-3 rounded-xl transition-all hover:scale-110 ${ratingScore >= n ? 'text-yellow-400' : 'text-slate-600'}`}
                >
                  <Star size={40} fill={ratingScore >= n ? 'currentColor' : 'none'} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-slate-300 font-semibold mb-3 text-lg">Your Feedback</label>
            <textarea 
              value={ratingComment} 
              onChange={e => setRatingComment(e.target.value)} 
              placeholder="Share your thoughts about this session..."
              className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all h-32 resize-none placeholder-slate-500" 
            />
          </div>
          
          <button 
            onClick={() => submitRating(selectedSession.id)}
            className="w-full py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 text-lg"
          >
            Submit Rating ⭐
          </button>
        </div>
      </div>
    </div>
  );

  if (page === 'profile') return (
    <div className="min-h-screen bg-slate-950">
      <Nav />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-purple-500/30 shadow-2xl mb-6">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <User className="mr-3 text-purple-400" size={32} />
            My Profile
          </h2>
          
          <div className="mb-6">
            <label className="block text-slate-300 font-semibold mb-3">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="Tell others about yourself..."
              className="w-full px-5 py-4 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all h-24 resize-none placeholder-slate-500" 
            />
          </div>

          {/* Ratings Section */}
          {userRatings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Star className="mr-2 text-yellow-400" size={24} />
                Reviews ({userRatings.length})
              </h3>
              
              <div className="space-y-3">
                {userRatings.map(rating => (
                  <div key={rating.id} className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{rating.raterName}</p>
                        <span className="text-slate-500">•</span>
                        <p className="text-sm text-slate-400">{rating.skill}</p>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map(n => (
                          <Star 
                            key={n} 
                            size={16} 
                            className={n <= rating.score ? 'text-yellow-400' : 'text-slate-600'}
                            fill={n <= rating.score ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-300">{rating.comment}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {rating.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button 
            onClick={updateProfile}
            className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 text-lg"
          >
            Save Profile ✅
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Skills I Offer */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-orange-500/30 shadow-xl">
            <h3 className="text-2xl font-bold text-orange-400 mb-5 flex items-center">
              <Target className="mr-2" size={24} />
              Skills I Offer
            </h3>
            
            <div className="space-y-2 mb-5">
              {offeredSkills.map((sk, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 group hover:border-orange-500/50 transition-all">
                  <span className="text-white font-semibold">{sk.name}</span>
                  <button 
                    onClick={() => setOfferedSkills(offeredSkills.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
              
              {offeredSkills.length === 0 && (
                <p className="text-slate-500 text-center py-8 text-sm">No skills added yet</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newSkill} 
                onChange={e => setNewSkill(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && newSkill.trim() && (setOfferedSkills([...offeredSkills, { name: newSkill }]), setNewSkill(''))}
                placeholder="Add a skill..." 
                className="flex-1 px-4 py-3 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all placeholder-slate-500" 
              />
              <button 
                onClick={() => { if(newSkill.trim()) { setOfferedSkills([...offeredSkills, { name: newSkill }]); setNewSkill(''); } }}
                className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/25"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Skills I Want */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-blue-500/30 shadow-xl">
            <h3 className="text-2xl font-bold text-blue-400 mb-5 flex items-center">
              <Sparkles className="mr-2" size={24} />
              Skills I Want
            </h3>
            
            <div className="space-y-2 mb-5">
              {soughtSkills.map((sk, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 group hover:border-blue-500/50 transition-all">
                  <span className="text-white font-semibold">{sk.name}</span>
                  <button 
                    onClick={() => setSoughtSkills(soughtSkills.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
              
              {soughtSkills.length === 0 && (
                <p className="text-slate-500 text-center py-8 text-sm">No skills added yet</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newSkill} 
                onChange={e => setNewSkill(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && newSkill.trim() && (setSoughtSkills([...soughtSkills, { name: newSkill }]), setNewSkill(''))}
                placeholder="Add a skill..." 
                className="flex-1 px-4 py-3 bg-slate-950/50 text-white rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-slate-500" 
              />
              <button 
                onClick={() => { if(newSkill.trim()) { setSoughtSkills([...soughtSkills, { name: newSkill }]); setNewSkill(''); } }}
                className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (page === 'admin') {
    const filteredAdminUsers = adminUsers.filter(u => 
      u.name?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(adminSearchTerm.toLowerCase())
    );
    
    return (
      <div className="min-h-screen bg-slate-950">
        <Nav />
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-5xl font-black text-white mb-2 flex items-center">
              <Shield className="mr-4 text-red-500" size={48} />
              Admin Control Panel
            </h2>
            <p className="text-slate-400 text-lg">Manage users and monitor platform activity</p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-2xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-300 text-sm font-semibold">Total Users</p>
                <Users className="text-blue-400" size={24} />
              </div>
              <p className="text-4xl font-black text-white">{adminUsers.length}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-2xl border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-300 text-sm font-semibold">Active Users</p>
                <UserCheck className="text-green-400" size={24} />
              </div>
              <p className="text-4xl font-black text-white">{adminUsers.filter(u => !u.disabled).length}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 p-6 rounded-2xl border border-red-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-300 text-sm font-semibold">Disabled</p>
                <UserX className="text-red-400" size={24} />
              </div>
              <p className="text-4xl font-black text-white">{adminUsers.filter(u => u.disabled).length}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-300 text-sm font-semibold">Admins</p>
                <Shield className="text-purple-400" size={24} />
              </div>
              <p className="text-4xl font-black text-white">{adminUsers.filter(u => u.role === 'admin').length}</p>
            </div>
          </div>

          {/* User Management Table */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <Users className="mr-3 text-red-400" size={28} />
                User Management
              </h3>
              
              <div className="flex items-center bg-slate-950/50 px-5 py-3 rounded-xl border border-slate-700/50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all w-full md:w-auto">
                <Search className="text-slate-400 mr-3" size={20} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={adminSearchTerm} 
                  onChange={e => setAdminSearchTerm(e.target.value)}
                  className="bg-transparent text-white outline-none placeholder-slate-500 w-full md:w-64" 
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">User</th>
                    <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">Email</th>
                    <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">Role</th>
                    <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">Sessions</th>
                    <th className="text-right py-4 px-4 text-slate-400 font-semibold text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminUsers.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <User className="text-white" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-white">{u.name}</p>
                            <p className="text-xs text-slate-400">Class of {u.gradYear}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400">{u.email}</td>
                      <td className="py-4 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-950/50 border border-slate-700/50 text-white outline-none focus:border-purple-500 transition-all"
                        >
                          <option value="student">Student</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          u.disabled 
                            ? 'bg-red-500/20 border border-red-500/30 text-red-300' 
                            : 'bg-green-500/20 border border-green-500/30 text-green-300'
                        }`}>
                          {u.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="text-white font-semibold">{u.completedSessions || 0} completed</p>
                          <p className="text-slate-400 text-xs">{u.totalSessions || 0} total</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleUserStatus(u.id, u.disabled)}
                            className={`p-2 rounded-lg transition-all ${
                              u.disabled
                                ? 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
                                : 'bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30'
                            }`}
                            title={u.disabled ? 'Enable User' : 'Disable User'}
                          >
                            {u.disabled ? <UserCheck size={18} /> : <UserX size={18} />}
                          </button>
                          
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="p-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAdminUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto text-slate-600 mb-3" size={48} />
                  <p className="text-slate-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
