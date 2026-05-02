import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { EVENT_INFO, TICKET_TYPES, SESSIONS, ADMIN_EMAILS } from './constants';
import { TicketType, TicketConfig } from './types';
import { Ticket, MapPin, Calendar, Clock, User, LogOut, ChevronRight, Info, Waves, Trees, Armchair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './components/ui/badge';

import { displayWIB } from './lib/timezone';
import { Toaster } from 'sonner';

// Views
import BookingView from './views/BookingView';
import MyTicketsView from './views/MyTicketsView';
import AdminView from './views/AdminView';

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dynamicTickets, setDynamicTickets] = useState<TicketType[]>(TICKET_TYPES);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'ticketConfigs'), (snapshot) => {
      const configs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketConfig));
      
      const updated = TICKET_TYPES.map(t => {
        const config = configs.find(c => c.id === t.id);
        if (config) {
          return {
            ...t,
            availableFrom: config.availableFrom,
            availableUntil: config.availableUntil,
            isPublic: config.isPublic || false
          };
        }
        return t;
      });
      setDynamicTickets(updated);
    }, (err) => {
      console.error("Firestore onSnapshot error in App.tsx (ticketConfigs):", err);
    });

    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-stone-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-stone-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  return (
    <div className="min-h-screen bg-[#fff7ed] font-sans text-stone-900 overflow-x-hidden">
      {/* Background Elements - Nature & Sea Theme */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Sea/Water element */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl animate-pulse duration-[10s]"></div>
        {/* Nature/Green element */}
        <div className="absolute top-1/3 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        {/* Deep Sea element */}
        <div className="absolute -bottom-24 right-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-3xl"></div>
        {/* Subtle wave pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 13 50 13s16.36 2.347 25.96 5.937l1.768.661c.368.138.731.272 1.088.402H100V0H0v20h21.184z' fill='%23f97316' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }}></div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-lazuardi rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-lazuardi/20">L</div>
              <span className="font-bold text-lg hidden sm:block tracking-tight text-lazuardi">PAT SD 2026</span>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to="/my-tickets" className="text-sm font-medium text-stone-600 hover:text-lazuardi transition-colors">Tiket Saya</Link>
                  {isAdmin && (
                    <Link to="/admin" className="text-sm font-medium text-stone-600 hover:text-lazuardi transition-colors">Admin</Link>
                  )}
                  <div className="flex items-center gap-2 pl-4 border-l border-stone-200">
                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-stone-200" referrerPolicy="no-referrer" />
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:text-red-500">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={handleLogin} className="bg-lazuardi hover:bg-lazuardi-dark text-white rounded-full px-6 shadow-md">
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomeView tickets={dynamicTickets} />} />
          <Route path="/book/:ticketId" element={user ? <BookingView tickets={dynamicTickets} /> : <LoginPrompt onLogin={handleLogin} />} />
          <Route path="/my-tickets" element={user ? <MyTicketsView /> : <LoginPrompt onLogin={handleLogin} />} />
          <Route path="/admin" element={isAdmin ? <AdminView /> : <HomeView tickets={dynamicTickets} />} />
        </Routes>
      </main>
      <Toaster position="top-center" richColors />

      <footer className="bg-white border-t border-stone-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-stone-500 text-sm">© 2026 SD Lazuardi. All rights reserved.</p>
          <p className="text-stone-400 text-xs mt-2">Pentas Akhir Tahun 2026 - Makara Art Center UI</p>
        </div>
      </footer>
    </div>
  );
}

function HomeView({ tickets }: { tickets: TicketType[] }) {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-lazuardi text-white p-8 sm:p-16 shadow-2xl shadow-lazuardi/20">
        {/* Theme Background Icons */}
        <div className="absolute top-10 right-10 opacity-10 rotate-12">
          <Trees size={200} />
        </div>
        <div className="absolute bottom-0 left-1/4 opacity-10 -rotate-12">
          <Waves size={150} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <Badge className="mb-6 bg-white/20 text-white border-none backdrop-blur-sm px-4 py-1">Year-end Performance 2026</Badge>
          <h1 className="text-4xl sm:text-7xl font-bold tracking-tighter mb-8 leading-[1.1]">
            Walking with the <br />
            <span className="text-orange-200 italic font-serif">Nature's Rarest Survivors</span>
          </h1>
          
          <div className="mb-10">
            <Countdown targetDate={EVENT_INFO.eventDate} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-orange-50 mb-10">
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-orange-300" />
              <span className="font-medium">{EVENT_INFO.date}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
              <Clock className="w-5 h-5 text-orange-300" />
              <span className="font-medium">{EVENT_INFO.time}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm sm:col-span-2">
              <MapPin className="w-5 h-5 text-orange-300" />
              <span className="font-medium">{EVENT_INFO.location}</span>
            </div>
          </div>
          <Button asChild size="lg" className="bg-white text-lazuardi hover:bg-orange-50 rounded-full px-10 py-7 text-lg font-bold shadow-xl transition-all hover:scale-105">
            <a href="#tickets">Beli Tiket Sekarang</a>
          </Button>
        </div>
      </section>

      {/* Ticket Selection */}
      <section id="tickets" className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-lazuardi">Pilih Kategori Tiket</h2>
            <p className="text-stone-500">Tersedia tiket reguler dan terusan untuk berbagai fase.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-lazuardi bg-lazuardi/5 px-4 py-2 rounded-full font-medium">
            <Info className="w-4 h-4" />
            <span>Penjualan tiket dibuka bertahap sesuai jadwal masing-masing fase</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-16 border-y border-stone-200 bg-white/50 backdrop-blur-sm rounded-3xl px-8">
        <div className="space-y-4">
          <div className="w-12 h-12 bg-lazuardi/10 rounded-2xl flex items-center justify-center text-lazuardi mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-xl text-lazuardi">Jadwal Pertunjukan</h3>
          <ul className="space-y-3">
            {SESSIONS.map(s => (
              <li key={s.id} className="flex flex-col p-3 rounded-xl hover:bg-lazuardi/5 transition-colors">
                <span className="font-bold text-stone-800">{s.name}</span>
                <span className="text-sm text-stone-500">{s.time}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 bg-lazuardi/10 rounded-2xl flex items-center justify-center text-lazuardi mb-4">
            <Armchair className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-xl text-lazuardi">Pemilihan Kursi</h3>
          <p className="text-stone-600 text-sm leading-relaxed">
            Pemilihan kursi dilakukan langsung saat proses pembelian. Sistem berlaku <span className="font-bold italic text-lazuardi">first come, first served</span>. Kursi otomatis terkunci setelah pembayaran berhasil.
          </p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 bg-lazuardi/10 rounded-2xl flex items-center justify-center text-lazuardi mb-4">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-xl text-lazuardi">Bantuan & Pertanyaan</h3>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-lazuardi/5">
              <p className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Fase A - Teacher Titi</p>
              <a href="https://wa.me/628975137612" className="text-lazuardi font-bold text-lg hover:underline">0897 5137 612</a>
            </div>
            <div className="p-3 rounded-xl bg-lazuardi/5">
              <p className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Fase B - Teacher Mira</p>
              <a href="https://wa.me/6285697950679" className="text-lazuardi font-bold text-lg hover:underline">0856 9795 0679</a>
            </div>
            <div className="p-3 rounded-xl bg-lazuardi/5">
              <p className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Fase C - Teacher Novi</p>
              <a href="https://wa.me/6281905867335" className="text-lazuardi font-bold text-lg hover:underline">0819 0586 7335</a>
            </div>
            <div className="p-3 rounded-xl bg-lazuardi/5">
              <p className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Email</p>
              <a href="mailto:elementary@lazuardi.sch.id" className="text-lazuardi font-bold text-lg hover:underline">elementary@lazuardi.sch.id</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const TicketCard: React.FC<{ ticket: TicketType }> = ({ ticket }) => {
  const { user } = useAuth();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');
  const now = new Date();
  const startTime = new Date(ticket.availableFrom);
  const endTime = ticket.availableUntil ? new Date(ticket.availableUntil) : null;
  
  const isStarted = now >= startTime;
  const isEnded = endTime ? now > endTime : false;
  const isAvailable = (isStarted && !isEnded) || isAdmin;

  const getButtonText = () => {
    if (isAdmin) return 'Pilih Kursi (Admin)';
    if (!isStarted) return 'Segera Hadir';
    if (isEnded) return 'Penjualan Ditutup';
    return 'Pilih Kursi';
  };
  
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card className="h-full flex flex-col border-stone-200 shadow-sm hover:shadow-xl transition-all overflow-hidden group rounded-3xl">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className="text-lazuardi border-lazuardi/20 bg-lazuardi/5">
              {ticket.sessions.length > 1 ? `Terusan ${ticket.sessions.length} Sesi` : 'Reguler'}
            </Badge>
            <span className="text-2xl font-bold tracking-tighter text-lazuardi">Rp {ticket.price.toLocaleString('id-ID')}</span>
          </div>
          <CardTitle className="text-xl group-hover:text-lazuardi transition-colors">{ticket.name}</CardTitle>
          <CardDescription className="line-clamp-2">{ticket.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Sesi Terkait</p>
              <div className="flex flex-wrap gap-2">
                {ticket.sessions.map(s => (
                  <Badge key={s} variant="secondary" className="bg-stone-100 text-stone-600 border-none">{s}</Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-1 pt-2 border-t border-stone-100">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Waktu Penjualan</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                    <Calendar className="w-3.5 h-3.5 text-lazuardi" />
                    <span>{displayWIB(ticket.availableFrom)}</span>
                  </div>
                  {ticket.availableUntil && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      <span>Sampai {displayWIB(ticket.availableUntil)}</span>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button asChild disabled={!isAvailable} className={`w-full rounded-2xl py-6 shadow-lg transition-all ${isAvailable ? 'bg-lazuardi hover:bg-lazuardi-dark text-white shadow-lazuardi/10' : 'bg-stone-100 text-stone-400 border-stone-200'}`}>
            <Link to={isAvailable ? `/book/${ticket.id}` : '#'} className="flex items-center justify-center gap-2">
              {getButtonText()}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: 'Hari', value: timeLeft.days },
    { label: 'Jam', value: timeLeft.hours },
    { label: 'Menit', value: timeLeft.minutes },
    { label: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-4">
      {units.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-3 min-w-[70px] border border-white/10">
          <span className="text-2xl sm:text-3xl font-bold tracking-tighter">{unit.value.toString().padStart(2, '0')}</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-orange-200">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center p-8 border-stone-200">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="w-8 h-8 text-stone-400" />
        </div>
        <CardTitle className="text-2xl mb-2">Silakan Login</CardTitle>
        <CardDescription className="mb-8">
          Anda perlu login menggunakan akun Google untuk melanjutkan proses pembelian tiket.
        </CardDescription>
        <Button onClick={onLogin} size="lg" className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-full">
          Login dengan Google
        </Button>
      </Card>
    </div>
  );
}
