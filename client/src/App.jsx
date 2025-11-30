import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Send, MessageSquare, Users, QrCode, 
  CheckCircle, XCircle, Clock, Search, Menu, Bell, LogOut, Smartphone, Zap, 
  Trash2, Plus, RefreshCw, Check, ArrowRight, Filter, Upload, FileText, X, Edit2, Tag, Bot, Lock, KeyRound, Shield, UserCog, AlertCircle, Loader, Volume2, Activity, SignalHigh, SignalLow, WifiOff, ToggleLeft, ToggleRight, Save, MoreHorizontal, Paperclip, Smile, Mic, HelpCircle, Info, ChevronDown, ChevronUp, CheckCheck, Bold, Italic, Type, List, AlertTriangle, RefreshCcw, Cloud, Phone, LogIn, Power, MoreVertical, Settings, Globe
} from 'lucide-react';

// --- FIREBASE INIT ---
const firebaseConfig = {
  apiKey: "AIzaSyAx7uWAqSYPz0P0dDUYVuABrF42K437mSs",
  authDomain: "unoblasterpro.firebaseapp.com",
  projectId: "unoblasterpro",
  storageBucket: "unoblasterpro.firebasestorage.app",
  messagingSenderId: "872962556740",
  appId: "1:872962556740:web:298b1b21a4de791d078d11"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- UTILS ---
const playNotif = () => {
    try { 
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); 
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        setTimeout(() => osc.stop(), 300);
    } catch(e) {}
};

// --- HELPER COMPONENTS ---

const QRCodeDisplay = ({ value }) => {
  const [timeLeft, setTimeLeft] = useState(47);

  useEffect(() => {
    if (value && value !== 'loading') {
        setTimeLeft(47); 
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [value]);

  if (!value || value === 'loading') return (
      <div className="flex flex-col items-center justify-center h-64 w-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 mx-auto animate-pulse">
          <Loader className="animate-spin text-[#7367F0] mb-4" size={32}/>
          <span className="text-sm text-slate-400 font-medium">Menghubungkan Server...</span>
          <span className="text-[10px] text-slate-400 mt-1">Pastikan Backend Online</span>
      </div>
  );
  
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(value)}&size=300&margin=1&ecLevel=H&dark=000000&light=ffffff`;
  
  return (
      <div className="relative inline-block mx-auto text-center w-full">
        <div className="text-[10px] text-slate-300 font-sans mb-2 uppercase tracking-widest font-bold">(MODE: REALTIME)</div>
        <div className="bg-white p-1 inline-block border border-slate-200 rounded-lg shadow-sm relative">
            <img src={qrUrl} alt="Scan QR Code" className="w-60 h-60 object-contain rounded" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1.5 rounded-full shadow-md">
                <Smartphone size={24} className="text-[#25D366] fill-current" />
            </div>
        </div>
        <div className="text-center mt-4">
             <span className="text-sm text-slate-500 font-normal">Scan dalam <span className="text-[#EA5455] font-bold">{timeLeft}s</span></span>
        </div>
      </div>
  );
};

const MenuButton = ({ icon: Icon, label, id, active, onClick }) => (
    <button onClick={() => onClick(id)} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${active === id ? 'bg-gradient-to-r from-[#7367F0] to-[#9e95f5] text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-[#7367F0]'}`}>
        <Icon size={18}/> <span className="font-medium text-sm">{label}</span>
    </button>
);

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group cursor-default`}>
        <div className={`absolute -top-4 -right-4 p-4 opacity-10 text-${color}-600 bg-${color}-100 rounded-full w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-transform`}><Icon size={40}/></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider z-10 relative mb-1">{label}</p>
        <h3 className={`text-4xl font-black text-slate-800 z-10 relative`}>{value}</h3>
        {sub && <div className={`text-[10px] font-bold text-${color}-600 mt-3 bg-${color}-50 border border-${color}-100 inline-flex items-center px-2 py-1 rounded-full`}><Activity size={10} className="mr-1"/> {sub}</div>}
    </div>
);

// --- MAIN APP ---

export default function WABlasterApp() {
  // CONFIG
  const [apiUrl, setApiUrl] = useState('http://localhost:3001'); // Default local, bisa diganti ke Ngrok
  const SECURITY_CODE = 'MTIwOQ=='; // 1209
  const SESSION_ID = 'primary_device';

  const [view, setView] = useState('landing'); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Local app user

  // DATA (From Firebase)
  const [contacts, setContacts] = useState([]); 
  const [autotexts, setAutotexts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [chats, setChats] = useState([]); // Chats masih dari socket local untuk sementara

  // WHATSAPP SESSION STATE
  const [waStatus, setWaStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [deviceData, setDeviceData] = useState(null);
  const [socket, setSocket] = useState(null);

  // UI
  const [targetTag, setTargetTag] = useState('All');
  const [broadcastStep, setBroadcastStep] = useState(1);
  const [spintaxEnabled, setSpintaxEnabled] = useState(true);
  const [messageContent, setMessageContent] = useState('');
  const [pinInput, setPinInput] = useState('');
  
  // FORMS
  const [newContact, setNewContact] = useState({ name: '', phone: '', tag: 'Umum' });
  const [editingContact, setEditingContact] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  
  // Chat
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatInput, setChatInput] = useState('');

  const [showModal, setShowModal] = useState({
      contactAdd: false, success: false, settings: false
  });
  
  const toggleModal = (key, val) => setShowModal(prev => ({ ...prev, [key]: val }));

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 1. FIREBASE AUTH & SYNC ---
  useEffect(() => {
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setFirebaseUser(u));
    return () => unsubscribe();
  }, []);

  // --- 2. FIREBASE DATA LISTENERS (REALTIME DB) ---
  useEffect(() => {
      if (!firebaseUser) return;
      
      // Listen Contacts
      const qContacts = query(collection(db, 'artifacts', appId, 'public', 'data', 'contacts'), orderBy('createdAt', 'desc'));
      const unsubContacts = onSnapshot(qContacts, (snap) => {
          setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Err Contacts", err));

      // Listen Campaigns
      const qCampaigns = query(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), orderBy('date', 'desc'));
      const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
          setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubContacts(); unsubCampaigns(); };
  }, [firebaseUser]);

  // --- 3. SERVER CONNECTION (SOCKET.IO) ---
  useEffect(() => {
      // Connect to the Backend (Localhost or Ngrok)
      if (currentUser && apiUrl) {
          try {
              const newSocket = io(apiUrl);
              setSocket(newSocket);

              newSocket.on('connect', () => showToast('Terhubung ke Mesin WhatsApp', 'success'));
              newSocket.on('disconnect', () => {
                  setWaStatus('disconnected');
                  showToast('Terputus dari Mesin WhatsApp', 'error');
              });

              newSocket.on('qr', (qr) => {
                  setWaStatus('scanning');
                  setQrCode(qr);
              });

              newSocket.on('status', (status) => {
                  if (status === 'connected') {
                      if (waStatus !== 'connected') {
                          playNotif();
                          toggleModal('success', true);
                      }
                      setWaStatus('connected');
                      setQrCode(null);
                  } else {
                      setWaStatus('disconnected');
                  }
              });

              newSocket.on('new_message', (msg) => {
                if(waStatus !== 'connected') return;
                playNotif(); 
                showToast(`💬 ${msg.name}`, 'success');
                setChats(prev => {
                    const safePrev = Array.isArray(prev) ? prev : [];
                    const newList = safePrev.filter(c => c.phone !== msg.phone);
                    const existing = safePrev.find(c => c.phone === msg.phone) || {};
                    const newChat = { ...existing, ...msg, unread: (existing.unread || 0) + 1, messages: [...(existing.messages || []), msg] };
                    return [newChat, ...newList];
                });
                // Jika sedang buka chat ini, update juga
                if (selectedChat?.phone === msg.phone) {
                    setSelectedChat(curr => ({...curr, messages: [...(curr.messages || []), msg]}));
                }
              });

              return () => newSocket.close();
          } catch (e) {
              console.error("Socket error", e);
          }
      }
  }, [currentUser, apiUrl]); // Reconnect if API URL changes

  // --- ACTIONS ---

  const handleLogin = (e) => { 
      e.preventDefault(); 
      if (btoa(pinInput) === SECURITY_CODE) { 
          setCurrentUser({ name: 'Juragan', role: 'admin' }); 
          setView('dashboard'); 
          playNotif(); 
      } else showToast('PIN Salah!', 'error'); 
  };

  const checkSessionStatus = async () => {
      try {
          // Cek status via API
          await axios.get(`${apiUrl}/status`);
          // Socket akan handle update status
      } catch(e) { 
          showToast('Gagal menghubungi server. Cek URL.', 'error');
      }
  };

  const startSession = async () => {
      // Trigger backend untuk mulai sesi
      // Pada index.js yang lama, 'connectToWhatsApp' jalan otomatis.
      // Kita bisa paksa reconnect via socket restart jika perlu, 
      // tapi biasanya cukup refresh server.
      // Untuk UI:
      setWaStatus('scanning');
      setQrCode('loading');
      // Kirim signal ke socket (jika backend support) atau biarkan backend kirim QR
  };

  const logoutSession = async () => {
      if(confirm('Putus koneksi WhatsApp?')) {
          try {
              await axios.post(`${apiUrl}/logout`);
              setWaStatus('disconnected');
              setQrCode(null);
          } catch(e) { showToast('Gagal logout', 'error'); }
      }
  };

  // --- FIRESTORE CRUD ---
  const saveContact = async () => {
      if (!firebaseUser) return;
      const phone = newContact.phone.replace(/\D/g, '');
      const finalPhone = phone.startsWith('0') ? '62'+phone.slice(1) : phone;
      const payload = { 
          name: newContact.name, 
          phone: finalPhone, 
          tags: [newContact.tag], 
          createdAt: serverTimestamp() 
      };
      
      try {
        if (editingContact) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contacts', editingContact.id), payload);
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'contacts'), payload);
        }
        toggleModal('contactAdd', false); setEditingContact(null);
        setNewContact({ name: '', phone: '', tag: 'Umum' });
        showToast('Kontak Tersimpan di Cloud');
      } catch(e) { showToast('Gagal simpan', 'error'); }
  };

  const deleteContact = async (id) => {
      if(confirm("Hapus kontak ini?")) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'contacts', id));
              showToast("Terhapus");
          } catch(e){ showToast("Gagal hapus", 'error'); }
      }
  };

  const handleStartBroadcast = async () => {
      if(waStatus !== 'connected') return showToast('WhatsApp Offline!', 'error');
      
      const targets = targetTag === 'All' ? contacts : contacts.filter(c => c.tags?.includes(targetTag));
      if (targets.length === 0) return showToast(`Target kosong`, 'error');
      
      setIsBroadcasting(true); setBroadcastProgress(0);
      let success = 0;
      let fail = 0;

      // Catat campaign di Firestore dulu
      let campaignId = null;
      try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'campaigns'), {
              name: `Broadcast ${new Date().toLocaleTimeString()}`,
              status: 'processing',
              total: targets.length,
              success: 0,
              date: new Date().toISOString()
          });
          campaignId = docRef.id;
      } catch(e) {}

      for (let i = 0; i < targets.length; i++) {
          try {
              let finalMsg = messageContent.replace('{name}', targets[i].name);
              // HIT REAL SERVER
              await axios.post(`${apiUrl}/send-message`, { 
                  number: targets[i].phone, 
                  message: finalMsg, 
                  image: imageBase64 
              });
              success++;
          } catch(e){ fail++; }
          
          setBroadcastProgress(Math.round(((i + 1) / targets.length) * 100));
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000)); // Delay random aman
      }

      // Update Campaign Status
      if (campaignId) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'campaigns', campaignId), {
              status: 'completed',
              success: success,
              failed: fail
          });
      }

      setIsBroadcasting(false); showToast(`Selesai! ${success} terkirim.`, 'success'); setBroadcastStep(1);
  };

  const handleSendReply = async () => {
      if(!chatInput || !selectedChat) return;
      try {
          await axios.post(`${apiUrl}/send-message`, { number: selectedChat.phone, message: chatInput });
          // Update UI chat manual (karena kita ga simpan chat full history di firestore demi performa)
          const myReply = { id: 'me-'+Date.now(), name: 'Me', lastMsg: chatInput, time: new Date().toLocaleTimeString(), fromMe: true };
          setChats(prev => prev.map(c => c.phone === selectedChat.phone ? { ...c, lastMsg: `Anda: ${chatInput}`, messages: [...(c.messages||[]), myReply] } : c));
          setSelectedChat(prev => ({ ...prev, messages: [...(prev.messages||[]), myReply] }));
          setChatInput('');
      } catch(e) { showToast('Gagal kirim. Server mati?', 'error'); }
  };

  const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { setSelectedImage(file); const reader = new FileReader(); reader.onloadend = () => setImageBase64(reader.result); reader.readAsDataURL(file); } };
  const getTagColor = (tag) => {
      switch(tag) {
          case 'VIP': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'New Lead': return 'bg-blue-100 text-blue-800 border-blue-200';
          case 'Reseller': return 'bg-purple-100 text-purple-800 border-purple-200';
          default: return 'bg-slate-100 text-slate-800 border-slate-200';
      }
  }

  // --- VIEWS ---

  if (view === 'landing') return (
    <div className="min-h-screen bg-slate-900 flex flex-col relative overflow-hidden font-sans">
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-8 p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl animate-float">
                <Zap size={64} className="text-cyan-400 mx-auto mb-2" />
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400 mb-2">7unoBLAST</h1>
                <p className="text-slate-300 text-xl font-light tracking-widest uppercase">Cloud Edition</p>
            </div>
            <button onClick={() => setView('auth')} className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.5)]">
                <span className="flex items-center gap-3 text-lg">LOGIN AKSES <ArrowRight className="group-hover:translate-x-1 transition-transform"/></span>
            </button>
            <p className="mt-8 text-slate-500 text-xs max-w-md leading-relaxed">
                Versi ini menggunakan Database Cloud. Teman Anda di luar kota bisa mengakses data yang sama. Pastikan Server WhatsApp tetap menyala di komputer utama.
            </p>
        </div>
        <style>{`@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } } .animate-float { animation: float 6s ease-in-out infinite; }`}</style>
    </div>
  );

  if (view === 'auth') return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center border-4 border-cyan-500/20">
              <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600 animate-bounce"><Lock size={40} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Cloud</h2>
              <div className="text-xs text-slate-400 mb-4 font-mono">(PIN Default: 1209)</div>
              <form onSubmit={handleLogin}><input type="password" placeholder="• • • •" className="w-full text-center text-4xl font-bold border-b-4 border-slate-200 focus:border-cyan-500 outline-none py-4 mb-8 bg-transparent tracking-[1rem] text-slate-700 transition-colors" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g,''))} autoFocus maxLength={4} /><button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform">BUKA DASHBOARD</button></form>
          </div>
      </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-72 bg-slate-900 flex flex-col z-20 shadow-2xl hidden md:flex">
             <div className="h-24 flex items-center px-8 gap-3 border-b border-slate-800/50"><Zap className="text-cyan-400" size={32} /><div className="leading-none"><h1 className="text-white font-black text-2xl tracking-tighter">7uno<span className="text-cyan-400">BLAST</span></h1><span className="text-[10px] text-slate-500 tracking-widest">CLOUD v2.0</span></div></div>
             <nav className="flex-1 py-6 space-y-1 px-4 overflow-y-auto custom-scrollbar">
                <MenuButton icon={LayoutDashboard} label="Dashboard" id="dashboard" active={activeTab} onClick={setActiveTab} />
                <MenuButton icon={QrCode} label="WhatsApp Server" id="whatsapp_web" active={activeTab} onClick={setActiveTab} />
                <div className={`mt-6 px-4 text-[10px] font-bold mb-2 uppercase ${waStatus !== 'connected' ? 'text-red-400' : 'text-slate-500'}`}>{waStatus !== 'connected' ? 'Server Offline' : 'Features'}</div>
                <MenuButton icon={Send} label="Broadcast" id="broadcast" active={activeTab} onClick={setActiveTab} />
                <MenuButton icon={MessageSquare} label="Live Inbox" id="inbox" active={activeTab} onClick={setActiveTab} />
                <div className="mt-6 px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase">Database Cloud</div>
                <MenuButton icon={Users} label="Kontak Bersama" id="contacts" active={activeTab} onClick={setActiveTab} />
                <div className="mt-6 px-4 text-[10px] font-bold text-slate-500 mb-2 uppercase">System</div>
                <MenuButton icon={Settings} label="Pengaturan Server" id="settings" active={activeTab} onClick={()=>toggleModal('settings', true)} />
             </nav>
             <div className="p-6 border-t border-slate-800"><button onClick={logoutSession} className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-sm"><LogOut size={18} /> KELUAR</button></div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f0f2f5]">
            <header className="h-20 bg-white shadow-sm px-8 flex items-center justify-between z-10">
               <div>
                   <h2 className="text-2xl font-black text-slate-800 capitalize tracking-tight">{activeTab === 'whatsapp_web' ? 'WhatsApp Server Connection' : activeTab.replace('_', ' ')}</h2>
                   <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${waStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                       <p className="text-xs text-slate-400">{waStatus === 'connected' ? 'Server Connected via Socket' : 'Server Disconnected'}</p>
                   </div>
               </div>
               <div className="flex items-center gap-4">
                   <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-mono text-slate-500 border border-slate-200 flex items-center gap-2"><Globe size={12}/> {apiUrl}</div>
                   <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">J</div>
               </div>
            </header>
            <main className="flex-1 overflow-y-auto p-8">
                
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatCard label="Total Kontak (Cloud)" value={contacts.length} icon={Users} color="violet" />
                            <StatCard label="Active Chat" value={chats.length} sub="Sesi Ini" icon={MessageSquare} color="green" />
                            <StatCard label="Status WA" value={waStatus === 'connected' ? 'Ready' : 'Putus'} sub={waStatus === 'connected' ? 'Siap Kirim' : 'Cek Server'} icon={Smartphone} color={waStatus === 'connected' ? 'blue' : 'red'} />
                            <StatCard label="Riwayat" value={campaigns.length} icon={Send} color="fuchsia" />
                        </div>
                        {waStatus !== 'connected' && (
                             <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
                                 <h3 className="text-red-800 font-bold mb-2 flex items-center justify-center gap-2"><AlertTriangle/> Server WhatsApp Tidak Terhubung!</h3>
                                 <p className="text-red-600 text-sm mb-4">Aplikasi Dashboard ini sudah online, tapi 'Mesin Pengirim' (index.js) di komputer Anda belum terdeteksi.</p>
                                 <button onClick={()=>toggleModal('settings', true)} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-red-700">Setup Server URL</button>
                             </div>
                        )}
                    </div>
                )}

                {/* WHATSAPP WEB */}
                {activeTab === 'whatsapp_web' && (
                    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                         <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 text-center max-w-3xl w-full relative overflow-hidden">
                             {waStatus === 'connected' ? (
                                 <div className="flex flex-col items-center py-8">
                                     <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce shadow-green-100 shadow-xl border-4 border-green-100"><CheckCheck size={64} strokeWidth={3}/></div>
                                     <h2 className="text-4xl font-black text-slate-800 mb-3">WhatsApp Online</h2>
                                     <p className="text-slate-500 mb-6">Server backend terhubung. Teman Anda bisa menggunakan fitur broadcast sekarang.</p>
                                 </div>
                             ) : (
                                 <div className="flex flex-col md:flex-row gap-10 items-center">
                                     <div className="flex-1 text-left">
                                         <h2 className="text-3xl font-black text-slate-800 mb-4">Hubungkan Server</h2>
                                         <p className="text-slate-500 mb-6">Pastikan file <code>index.js</code> berjalan di komputer Anda, lalu masukkan URL-nya di pengaturan.</p>
                                         <button onClick={startSession} className="px-6 py-3 bg-[#7367F0] text-white font-bold rounded-xl hover:bg-[#5e50ee] w-full flex items-center justify-center gap-2">
                                            <RefreshCw size={20}/> Coba Reconnect
                                         </button>
                                     </div>
                                     <div className="flex-1 flex justify-center relative">
                                         {qrCode ? <QRCodeDisplay value={qrCode} /> : <div className="w-64 h-64 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold">Menunggu Server...</div>}
                                     </div>
                                 </div>
                             )}
                         </div>
                    </div>
                )}

                {/* BROADCAST */}
                {activeTab === 'broadcast' && (
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in max-w-5xl mx-auto">
                        <div className="bg-white border-b border-slate-100 p-6 flex justify-between px-10">
                            {['Pilih Target', 'Tulis Pesan', 'Kirim'].map((step, i) => (
                                <div key={i} className={`flex items-center gap-3 ${broadcastStep > i ? 'text-cyan-600' : broadcastStep === i+1 ? 'text-slate-800' : 'text-slate-300'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${broadcastStep > i ? 'bg-cyan-600 text-white' : broadcastStep === i+1 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}>{i+1}</div>
                                    <span className="font-bold text-sm">{step}</span>
                                </div>
                            ))}
                        </div>

                        {broadcastStep === 1 && (
                            <div className="p-10">
                                <h3 className="text-2xl font-bold text-slate-800 mb-6">Pilih Penerima</h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['All', ...new Set(contacts.flatMap(c => c.tags || []))].map(tag => (
                                        <button key={tag} onClick={() => setTargetTag(tag)} className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${targetTag === tag ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-500 border-slate-200'}`}>{tag}</button>
                                    ))}
                                </div>
                                <div className="flex justify-end"><button onClick={() => setBroadcastStep(2)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2">Lanjut <ArrowRight size={18}/></button></div>
                            </div>
                        )}

                        {broadcastStep === 2 && (
                            <div className="flex h-[500px]">
                                <div className="w-64 border-r border-slate-100 p-6 bg-slate-50"><h4 className="font-bold text-cyan-600 mb-4">Variabel</h4><div className="space-y-2"><div className="text-xs p-2 bg-white border rounded cursor-pointer hover:border-cyan-400" onClick={()=>setMessageContent(prev=>prev+' {name}')}>Name</div><div className="text-xs p-2 bg-white border rounded cursor-pointer hover:border-cyan-400" onClick={()=>setMessageContent(prev=>prev+' {phone}')}>Phone Number</div></div></div>
                                <div className="flex-1 p-8"><textarea className="w-full h-full p-4 border border-slate-200 rounded-xl outline-none focus:border-cyan-500 font-sans text-slate-700 resize-none" placeholder="Halo {name}, ini pesan dari cloud..." value={messageContent} onChange={e => setMessageContent(e.target.value)}></textarea></div>
                                <div className="w-64 border-l border-slate-100 p-6 bg-white flex flex-col justify-end"><button onClick={()=>setBroadcastStep(3)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Review</button></div>
                            </div>
                        )}

                        {broadcastStep === 3 && (
                            <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
                                {isBroadcasting ? (
                                    <div className="text-center">
                                        <div className="w-24 h-24 rounded-full border-4 border-cyan-100 border-t-cyan-600 animate-spin mx-auto mb-6"></div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">{broadcastProgress}%</h3>
                                        <p className="text-slate-500">Mengirim via Server {apiUrl}...</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold text-slate-800 mb-4">Siap Kirim?</h3>
                                        <p className="text-slate-500 mb-8">Pesan akan dikirim ke {targetTag === 'All' ? contacts.length : contacts.filter(c => c.tags?.includes(targetTag)).length} kontak.</p>
                                        <div className="flex gap-4 justify-center"><button onClick={()=>setBroadcastStep(2)} className="px-8 py-3 border border-slate-300 rounded-xl font-bold text-slate-600">Edit</button><button onClick={handleStartBroadcast} className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-200">Kirim Sekarang</button></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* CONTACTS (FIREBASE REALTIME) */}
                {activeTab === 'contacts' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div><h3 className="font-bold text-slate-800 text-lg">Kontak Cloud</h3><p className="text-xs text-slate-400">Data tersimpan di Firebase, bisa diakses teman.</p></div>
                            <button onClick={() => toggleModal('contactAdd', true)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-cyan-200 shadow-md">Tambah +</button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs"><tr><th className="p-4">Nama</th><th className="p-4">Nomor</th><th className="p-4">Tag</th><th className="p-4">Aksi</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {contacts.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-bold text-slate-700">{c.name}</td>
                                        <td className="p-4 font-mono text-slate-600">{c.phone}</td>
                                        <td className="p-4">{c.tags?.map(t => <span key={t} className={`px-2 py-1 rounded text-xs font-bold mr-1 border ${getTagColor(t)}`}>{t}</span>)}</td>
                                        <td className="p-4"><button onClick={() => deleteContact(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* SETTINGS MODAL */}
                {showModal.settings && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl w-[500px] shadow-2xl">
                            <h3 className="font-bold text-xl mb-4 text-slate-800">Pengaturan Server Backend</h3>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Agar teman di luar kota bisa mengirim pesan, komputer Anda harus menjalankan <code>index.js</code> dan terekspos ke internet (contoh: pakai Ngrok).
                                    <br/><br/>
                                    1. Jalankan server lokal: <code>node index.js</code><br/>
                                    2. Jalankan Ngrok: <code>ngrok http 3001</code><br/>
                                    3. Copy URL Ngrok (https) ke bawah ini.
                                </p>
                            </div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Server URL (Ngrok / VPS)</label>
                            <input className="border w-full p-3 rounded-lg mb-4 font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="https://xxxx-xx-xx.ngrok-free.app" value={apiUrl} onChange={e=>setApiUrl(e.target.value)}/>
                            <div className="flex justify-end gap-2">
                                <button onClick={()=>toggleModal('settings', false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Tutup</button>
                                <button onClick={()=>{toggleModal('settings', false); checkSessionStatus();}} className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-bold text-sm">Simpan & Tes Koneksi</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* CONTACT ADD MODAL */}
                {showModal.contactAdd && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
                            <h3 className="font-bold mb-4">Tambah Kontak ke Cloud</h3>
                            <input className="border w-full p-2 rounded mb-2" placeholder="Nama" value={newContact.name} onChange={e=>setNewContact({...newContact,name:e.target.value})}/>
                            <input className="border w-full p-2 rounded mb-2" placeholder="Nomor" value={newContact.phone} onChange={e=>setNewContact({...newContact,phone:e.target.value})}/>
                            <div className="mb-4">
                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Label</label>
                                <select className="w-full border p-2 rounded bg-white" value={newContact.tag} onChange={e=>setNewContact({...newContact,tag:e.target.value})}>
                                    <option value="Umum">Umum</option><option value="VIP">VIP</option><option value="Reseller">Reseller</option><option value="New Lead">New Lead</option>
                                </select>
                            </div>
                            <button onClick={saveContact} className="w-full bg-cyan-600 text-white py-2 rounded font-bold">Simpan ke Cloud</button>
                            <button onClick={()=>toggleModal('contactAdd', false)} className="w-full mt-2 text-slate-500 text-sm">Batal</button>
                        </div>
                    </div>
                )}

                {/* SUCCESS MODAL */}
                {showModal.success && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white p-10 rounded-3xl shadow-2xl w-[420px] text-center relative animate-scale-in">
                            <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-soft border-4 border-green-100"><CheckCheck size={56} className="text-green-500 stroke-[3]"/></div>
                            <h2 className="text-2xl font-black text-slate-800 mb-3">Server Terhubung!</h2>
                            <p className="text-sm text-slate-500 mb-8 px-6">WhatsApp Engine berhasil dikoneksikan. Sekarang semua user yang membuka web ini bisa mengirim pesan lewat server Anda.</p>
                            <button onClick={() => toggleModal('success', false)} className="w-full py-4 bg-cyan-500 text-white font-bold rounded-xl shadow-lg">MANTAP</button>
                        </div>
                    </div>
                )}
            </main>
            {toast && <div className={`fixed bottom-5 right-5 px-6 py-4 rounded-xl shadow-2xl text-white font-bold z-50 bg-${toast.type==='error'?'red':'green'}-600 animate-bounce-in flex items-center gap-3`}>{toast.type==='error'?<AlertCircle/>:<CheckCircle/>}{toast.message}</div>}
        </div>
        <style>{`@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } } .animate-scale-in { animation: scale-in 0.2s ease-out; }`}</style>
    </div>
  );
}