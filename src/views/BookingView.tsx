import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';
import { TICKET_TYPES, SESSIONS, ADMIN_EMAILS, SEATING_LAYOUT, STUDENT_CLASSES, STUDENTS_BY_CLASS } from '../constants';
import { TicketType, Seat, Order } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, Check, Armchair, Info, CreditCard, QrCode, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

import { sendTicketEmail } from '../lib/email';
import { displayWIB } from '../lib/timezone';

export default function BookingView({ tickets = TICKET_TYPES }: { tickets?: TicketType[] }) {
  const { user } = useAuth();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const ticket = tickets.find(t => t.id === ticketId);
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');
  const now = new Date();
  const startTime = ticket ? new Date(ticket.availableFrom) : new Date(0);
  const endTime = ticket?.availableUntil ? new Date(ticket.availableUntil) : null;
  
  const isStarted = now >= startTime;
  const isEnded = endTime ? now > endTime : false;
  const isAvailable = ticket && ((isStarted && !isEnded) || isAdmin);
  
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]); // Stores seat labels like "A1", "B10"
  const [activeSession, setActiveSession] = useState(ticket?.sessions[0] || SESSIONS[0].id);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  
  const [formData, setFormData] = useState({
    parentName: '',
    studentName: '',
    studentClass: '',
    studentName2: '',
    studentClass2: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        parentName: prev.parentName || user.displayName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!ticket || !isAvailable) {
      navigate('/');
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'seats'), (snapshot) => {
      const seatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seat));
      setSeats(seatsData);
    }, (err) => {
      console.error("Firestore onSnapshot error in BookingView (seats):", err);
    });

    return unsubscribe;
  }, [ticket, isAvailable, navigate]);

  useEffect(() => {
    if (isCheckoutOpen) {
      // Only admins can see all orders to filter students. 
      // Parents can only see their own orders (enforced by rules and this query).
      const q = isAdmin 
        ? query(collection(db, 'orders'), where('status', 'in', ['pending', 'paid']))
        : query(collection(db, 'orders'), where('email', '==', user?.email), where('status', 'in', ['pending', 'paid']));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setExistingOrders(orders);
      }, (err) => {
        console.error("Firestore onSnapshot error in BookingView (orders):", err);
      });
      return unsubscribe;
    }
  }, [isCheckoutOpen]);

  const handleSeatClick = async (seatLabel: string) => {
    if (!ticket) return;

    const rowLabel = seatLabel.charAt(0);
    const seatNumber = parseInt(seatLabel.substring(1));
    const rowInfo = SEATING_LAYOUT.find(r => r.row === rowLabel);
    
    // Strictly block VIP rows from being clicked
    // Exception: Row F numbers 1-7 and 21-27 are now available as per request
    const isBlockedVIP = rowInfo?.isVIP && !(rowLabel === 'F' && ((seatNumber >= 1 && seatNumber <= 7) || (seatNumber >= 21 && seatNumber <= 27)));

    if (isBlockedVIP && !isAdmin) {
      toast.error(`Kursi VIP (Baris ${rowLabel}) telah dipesan khusus dan tidak dapat dipilih`);
      return;
    }

    // Check if this seat label is available in ALL sessions of this ticket
    const relevantSeats = ticket.sessions.map(sessionId => {
      const seatId = `${sessionId}-${seatLabel}`;
      return seats.find(s => s.id === seatId);
    });

    const isAnySold = relevantSeats.some(s => s?.status === 'sold');
    const isAnyVIP = relevantSeats.some(s => s?.isVIP);
    
    if (isAnySold) {
      toast.error("Kursi ini sudah terjual di salah satu sesi");
      return;
    }

    if (isAnyVIP && !isAdmin) {
      toast.error("Kursi VIP tidak dapat dipilih");
      return;
    }

    if (selectedSeats.includes(seatLabel)) {
      // Unlock seat in all sessions
      try {
        const batch = writeBatch(db);
        ticket.sessions.forEach(sessionId => {
          const seatId = `${sessionId}-${seatLabel}`;
          batch.set(doc(db, 'seats', seatId), {
            status: 'available',
            lockedBy: null,
            lockedAt: null
          }, { merge: true });
        });
        await batch.commit();
        setSelectedSeats(prev => prev.filter(label => label !== seatLabel));
      } catch (error) {
        toast.error("Gagal melepas kursi");
      }
    } else {
      if (selectedSeats.length >= 2) {
        toast.error("Maksimal 2 kursi per transaksi");
        return;
      }

      const isAnyLockedByOther = relevantSeats.some(s => s?.status === 'locked' && s.lockedBy !== user?.uid);
      if (isAnyLockedByOther) {
        toast.error("Kursi sedang dipilih orang lain di salah satu sesi");
        return;
      }

      // Lock seat in all sessions
      try {
        const batch = writeBatch(db);
        ticket.sessions.forEach(sessionId => {
          const seatId = `${sessionId}-${seatLabel}`;
          // Get existing seat data to preserve isVIP if it exists
          const existingSeat = seats.find(s => s.id === seatId);
          
          batch.set(doc(db, 'seats', seatId), {
            id: seatId,
            row: seatLabel.charAt(0),
            number: parseInt(seatLabel.slice(1)),
            status: 'locked',
            lockedBy: user?.uid,
            lockedAt: serverTimestamp(),
            session: sessionId,
            isVIP: existingSeat?.isVIP || (seatLabel.startsWith('E')) // Fallback for Row E
          }, { merge: true });
        });
        await batch.commit();
        setSelectedSeats(prev => [...prev, seatLabel]);
      } catch (error) {
        toast.error("Gagal memilih kursi");
      }
    }
  };

  const handleCheckout = async () => {
    const isTerusan = ticket?.name.toLowerCase().includes('terusan');
    
    if (!formData.parentName || !formData.studentName || !formData.studentClass || !formData.email) {
      toast.error("Mohon lengkapi semua data diri (Nama, Kelas, dan Email)");
      return;
    }

    if (isTerusan && (!formData.studentName2 || !formData.studentClass2)) {
      toast.error("Untuk Tiket Terusan, mohon lengkapi data Ananda ke-2");
      return;
    }

    if (!isConfirmed) {
      toast.error("Mohon centang konfirmasi bahwa data sudah benar");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Format email tidak valid");
      return;
    }

    // Check for double booking
    const student1Exists = existingOrders.some(order => 
      (order.studentName === formData.studentName && order.studentClass === formData.studentClass) ||
      (order.studentName2 === formData.studentName && order.studentClass2 === formData.studentClass)
    );

    if (student1Exists) {
      toast.error(`Siswa "${formData.studentName}" sudah memiliki pesanan aktif di sistem.`);
      return;
    }

    if (isTerusan && formData.studentName2) {
      const student2Exists = existingOrders.some(order => 
        (order.studentName === formData.studentName2 && order.studentClass === formData.studentClass2) ||
        (order.studentName2 === formData.studentName2 && order.studentClass2 === formData.studentClass2)
      );
      if (student2Exists) {
        toast.error(`Siswa "${formData.studentName2}" sudah memiliki pesanan aktif di sistem.`);
        return;
      }
    }

    if (!ticket) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, 'orders'));
      
      const orderData: any = {
        userId: user?.uid || '',
        parentName: formData.parentName,
        studentName: formData.studentName,
        studentClass: formData.studentClass,
        email: formData.email,
        ticketType: ticket.name,
        sessions: ticket.sessions,
        seats: selectedSeats,
        totalAmount: ticket.price * selectedSeats.length,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      if (formData.studentName2) orderData.studentName2 = formData.studentName2;
      if (formData.studentClass2) orderData.studentClass2 = formData.studentClass2;

      batch.set(orderRef, orderData);

      // Mark seats as sold in all sessions
      selectedSeats.forEach(seatLabel => {
        ticket.sessions.forEach(sessionId => {
          const seatId = `${sessionId}-${seatLabel}`;
          batch.set(doc(db, 'seats', seatId), {
            status: 'sold',
            orderId: orderRef.id,
            lockedBy: null,
            lockedAt: null
          }, { merge: true });
        });
      });

      await batch.commit();
      
      // Send E-Ticket Email (Client-side via Apps Script)
      try {
        await sendTicketEmail({
          email: formData.email,
          parentName: formData.parentName,
          studentName: formData.studentName,
          studentClass: formData.studentClass,
          studentName2: formData.studentName2,
          studentClass2: formData.studentClass2,
          orderId: orderRef.id,
          ticketName: ticket.name,
          seats: selectedSeats,
          sessions: ticket.sessions.map(sId => {
            const session = SESSIONS.find(s => s.id === sId);
            return session ? `${session.name} (${session.time})` : sId;
          }),
          totalAmount: ticket.price * selectedSeats.length,
          status: 'pending'
        });
      } catch (emailError: any) {
        console.error('Failed to send email:', emailError);
        toast.warning(`Gagal kirim email: ${emailError.message || 'Cek koneksi'}`);
      }

      toast.success("Pesanan berhasil dibuat! Silakan lakukan pembayaran.");
      navigate('/my-tickets');
    } catch (error) {
      console.error(error);
      toast.error("Gagal memproses pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket || !isAvailable) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-stone-400">Tiket tidak ditemukan atau belum tersedia.</h2>
        <Button onClick={() => navigate('/')} variant="outline" className="rounded-full">Kembali ke Beranda</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-lazuardi">{ticket.name}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-stone-500 text-xs mt-1 font-medium">
            <p>Pilih kursi untuk {ticket.sessions.join(', ')}</p>
            <span className="hidden sm:inline opacity-30">|</span>
            <div className="flex items-center gap-1 text-red-500">
              <Clock className="w-3 h-3" />
              <span>Berakhir: {ticket.availableUntil ? displayWIB(ticket.availableUntil) : '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map Card */}
        <Card className="lg:col-span-2 border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-lazuardi">Pilih Kursi Anda</CardTitle>
                <CardDescription>Klik pada kursi yang tersedia untuk memilih (Maks. 2)</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.sessions.length > 1 && ticket.sessions.map(s => (
                  <Button 
                    key={s} 
                    variant={activeSession === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveSession(s)}
                    className={`rounded-full px-4 font-bold transition-all ${activeSession === s ? 'bg-lazuardi shadow-lg shadow-lazuardi/20 scale-105' : 'text-stone-500 hover:text-lazuardi'}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-8">
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 mb-12 bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white border border-stone-300"></div>
                <span className="text-xs font-bold text-stone-600">Tersedia</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-lazuardi shadow-sm"></div>
                <span className="text-xs font-bold text-stone-600">Pilihan Anda</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-stone-200"></div>
                <span className="text-xs font-bold text-stone-600">Terisi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-400 border border-amber-600"></div>
                <span className="text-xs font-bold text-stone-600">VIP (Reserved)</span>
              </div>
            </div>

            {/* Screen Indicator */}
            <div className="relative mb-16">
              <div className="w-full h-2 bg-stone-200 rounded-full shadow-inner"></div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Panggung / Layar</div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-b from-stone-100 to-transparent rounded-t-full opacity-50"></div>
            </div>

            {/* Grid */}
            <div className="space-y-1 overflow-x-auto pb-12 pt-8 custom-scrollbar" style={{ perspective: '1000px' }}>
              {SEATING_LAYOUT.map((rowInfo, rowIndex) => {
                const rowLabel = rowInfo.row;
                const rowSeats = seats.filter(s => s.session === activeSession && s.row === rowLabel);
                
                // Calculate scale for theater effect (tapering towards the stage/top)
                // Row A is index 0, Row O is index 14.
                // We want it to "mengerucut ke bawah" (narrower at the bottom/back) or vice versa?
                // Usually stage is at top, so front rows are index 0.
                // If we want it to look like a theater, we can scale the back rows slightly.
                const scale = 1 - (rowIndex * 0.01); 
                
                // Helper to render a section of seats in reverse order (Right to Left)
                const renderSection = (range: number[]) => {
                  const [start, end] = range;
                  const sectionSeats = [];
                  for (let i = end; i >= start; i--) {
                    const seat = rowSeats.find(s => s.number === i);
                    const seatLabel = `${rowLabel}${i}`;
                    const isSelected = selectedSeats.includes(seatLabel);
                    const isSold = seat?.status === 'sold';
                    const isLocked = seat?.status === 'locked' && seat.lockedBy !== user?.uid;
                    // Use rowInfo.isVIP as the source of truth for the entire row
                    // Exception: Row F numbers 1-7 and 21-27 are unblocked
                    const isVIP = rowInfo.isVIP && !(rowLabel === 'F' && ((i >= 1 && i <= 7) || (i >= 21 && i <= 27)));
                    const effectiveIsVIP = isVIP || seat?.isVIP;

                    sectionSeats.push(
                      <motion.div
                        key={`seat-${activeSession}-${rowLabel}-${i}`}
                        whileTap={(!effectiveIsVIP && !isSold && !isLocked) ? { scale: 0.9 } : {}}
                        onClick={() => !effectiveIsVIP && !isSold && !isLocked && handleSeatClick(seatLabel)}
                        title={effectiveIsVIP ? `Kursi VIP ${seatLabel} (RESERVED - Tidak Dapat Dibeli)` : `Kursi ${seatLabel}`}
                        className={`
                          w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] font-black transition-all flex-shrink-0
                          ${isSelected ? 'bg-lazuardi text-white shadow-xl shadow-lazuardi/30 scale-110 z-10 cursor-pointer ring-2 ring-white' : 
                            isSold || isLocked ? 'bg-stone-200 text-stone-400 cursor-not-allowed grayscale' : 
                            effectiveIsVIP ? 'bg-amber-400 border-2 border-amber-600 text-white cursor-not-allowed shadow-md scale-95 opacity-90' :
                            'bg-white border-2 border-stone-200 text-stone-600 hover:border-lazuardi hover:text-lazuardi hover:scale-105 cursor-pointer shadow-sm'}
                        `}
                      >
                        {i}
                      </motion.div>
                    );
                  }
                  return sectionSeats;
                };

                return (
                  <motion.div 
                    key={rowLabel} 
                    initial={false}
                    animate={{ scale }}
                    className={`flex items-center justify-center gap-2 sm:gap-4 min-w-max px-12 py-1 rounded-xl transition-all ${rowLabel === 'E' ? 'bg-amber-50/50 border-y border-amber-100/50 my-2' : 'hover:bg-stone-50/50'}`}
                    style={{ transformOrigin: 'center top' }}
                  >
                    {/* Row Label Left */}
                    <div className="w-10 text-[10px] font-black text-stone-300 text-right flex items-center justify-end gap-2">
                      {rowLabel === 'E' && <Badge className="text-[7px] bg-amber-500 text-white px-1 py-0 h-3 border-none font-black tracking-tighter">VIP</Badge>}
                      {rowLabel}
                    </div>
                    
                    {/* Left Section */}
                    <div className="flex gap-1 sm:gap-1.5">
                      {renderSection(rowInfo.left)}
                    </div>
                    
                    {/* Aisle Left */}
                    <div className="w-6 sm:w-10 flex justify-center mx-1">
                      <div className={`h-8 w-px rounded-full ${rowLabel === 'E' ? 'bg-amber-200' : 'bg-stone-100'}`}></div>
                    </div>
                    
                    {/* Center Section */}
                    <div className="flex gap-1 sm:gap-1.5">
                      {renderSection(rowInfo.center)}
                    </div>
                    
                    {/* Aisle Right */}
                    <div className="w-6 sm:w-10 flex justify-center mx-1">
                      <div className={`h-8 w-px rounded-full ${rowLabel === 'E' ? 'bg-amber-200' : 'bg-stone-100'}`}></div>
                    </div>
                    
                    {/* Right Section */}
                    <div className="flex gap-1 sm:gap-1.5">
                      {renderSection(rowInfo.right)}
                    </div>
                    
                    {/* Row Label Right */}
                    <div className="w-10 text-[10px] font-black text-stone-300 text-left flex items-center justify-start gap-2">
                      {rowLabel}
                      {rowLabel === 'E' && <Badge className="text-[7px] bg-amber-500 text-white px-1 py-0 h-3 border-none font-black tracking-tighter">VIP</Badge>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden sticky top-24">
            <CardHeader className="bg-lazuardi text-white">
              <CardTitle className="text-xl font-bold">Ringkasan Pesanan</CardTitle>
              <CardDescription className="text-blue-100">Detail pilihan kursi Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Kategori Tiket</span>
                <p className="font-bold text-stone-800">{ticket.name}</p>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Sesi Terpilih</span>
                <div className="flex flex-wrap gap-2">
                  {ticket.sessions.map((s, idx) => (
                    <Badge key={`${s}-${idx}`} variant="secondary" className="bg-stone-100 text-stone-600 border-none font-bold">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Kursi Terpilih</span>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {selectedSeats.length > 0 ? selectedSeats.map((label, idx) => (
                    <Badge key={`${label}-${idx}`} className="bg-lazuardi text-white border-none px-4 py-1.5 text-sm font-bold rounded-xl shadow-md shadow-lazuardi/20">
                      {label}
                    </Badge>
                  )) : (
                    <p className="text-stone-400 text-sm italic">Belum ada kursi dipilih</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase font-black tracking-widest text-stone-400">Total Pembayaran</span>
                  <div className="text-right">
                    <p className="text-3xl font-black tracking-tighter text-lazuardi">Rp {(ticket.price * selectedSeats.length).toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-stone-400 font-bold">Termasuk pajak & biaya layanan</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pb-8 px-6">
              <Button 
                disabled={selectedSeats.length === 0} 
                className="w-full bg-lazuardi hover:bg-lazuardi-dark text-white rounded-2xl py-8 text-lg font-bold shadow-2xl shadow-lazuardi/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setIsCheckoutOpen(true)}
              >
                Lanjut ke Pembayaran
              </Button>
            </CardFooter>
          </Card>

          <div className="bg-amber-50 rounded-3xl p-6 flex gap-4 border border-amber-100 shadow-sm">
            <Info className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Penting</p>
              <p className="text-xs text-amber-700/80 leading-relaxed">
                Kursi yang Anda pilih akan dikunci selama 15 menit. Selesaikan pembayaran segera untuk menghindari pembatalan otomatis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog 
        open={isCheckoutOpen} 
        onOpenChange={(open) => {
          setIsCheckoutOpen(open);
          if (!open) setIsConfirmed(false);
        }}
      >
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Konfirmasi Data Diri</DialogTitle>
            <DialogDescription>
              E-ticket akan dikirimkan ke email yang Anda masukkan di bawah ini.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 py-4">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name">{ticket.isPublic ? 'Nama Pembeli' : 'Nama Orang Tua / Wali'} <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  required
                  value={formData.parentName} 
                  onChange={e => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                  placeholder={ticket.isPublic ? "Masukkan nama lengkap pembeli" : "Masukkan nama lengkap"}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="studentClass">{ticket.isPublic ? 'Keterangan Pembeli' : (ticket?.name.toLowerCase().includes('terusan') ? 'Kelas Ananda 1' : 'Kelas Ananda')} <span className="text-red-500">*</span></Label>
                {ticket.isPublic ? (
                  <Input 
                    id="studentClass"
                    required
                    value={formData.studentClass}
                    onChange={e => setFormData(prev => ({ ...prev, studentClass: e.target.value }))}
                    placeholder="Contoh: Kakek / Nenek / Saudara"
                    className="rounded-xl"
                  />
                ) : (
                  <select
                    id="studentClass"
                    required
                    value={formData.studentClass}
                    onChange={e => setFormData(prev => ({ ...prev, studentClass: e.target.value, studentName: '' }))}
                    className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazuardi focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Pilih Kelas</option>
                    {STUDENT_CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="studentName">{ticket.isPublic ? 'Keterangan Siswa' : (ticket?.name.toLowerCase().includes('terusan') ? 'Nama Ananda 1' : 'Nama Lengkap Ananda')} <span className="text-red-500">*</span></Label>
                {ticket.isPublic ? (
                  <Input 
                    id="studentName"
                    required
                    value={formData.studentName}
                    onChange={e => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                    placeholder="Contoh: Nama Siswa & Kelas"
                    className="rounded-xl"
                  />
                ) : (
                  <select
                    id="studentName"
                    required
                    disabled={!formData.studentClass}
                    value={formData.studentName}
                    onChange={e => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazuardi focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">{formData.studentClass ? 'Pilih Nama Siswa' : 'Pilih Kelas Terlebih Dahulu'}</option>
                    {formData.studentClass && STUDENTS_BY_CLASS[formData.studentClass]
                      ?.filter(name => {
                        // Hide if already in an active order
                        return !existingOrders.some(order => 
                          (order.studentName === name && order.studentClass === formData.studentClass) ||
                          (order.studentName2 === name && order.studentClass2 === formData.studentClass)
                        );
                      })
                      .map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                  </select>
                )}
              </div>

              {ticket?.name.toLowerCase().includes('terusan') && (
                <>
                  <div className="grid gap-2 pt-2 border-t border-stone-100">
                    <Label htmlFor="studentClass2">Kelas Ananda 2 <span className="text-red-500">*</span></Label>
                    {ticket.isPublic ? (
                      <Input 
                        id="studentClass2"
                        required
                        value={formData.studentClass2}
                        onChange={e => setFormData(prev => ({ ...prev, studentClass2: e.target.value }))}
                        placeholder="Contoh: Umum / Alumni"
                        className="rounded-xl"
                      />
                    ) : (
                      <select
                        id="studentClass2"
                        required
                        value={formData.studentClass2}
                        onChange={e => setFormData(prev => ({ ...prev, studentClass2: e.target.value, studentName2: '' }))}
                        className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazuardi focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Pilih Kelas</option>
                        {STUDENT_CLASSES.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="studentName2">Nama Ananda 2 <span className="text-red-500">*</span></Label>
                    {ticket.isPublic ? (
                      <Input 
                        id="studentName2"
                        required
                        value={formData.studentName2}
                        onChange={e => setFormData(prev => ({ ...prev, studentName2: e.target.value }))}
                        placeholder="Contoh: Nama Siswa & Kelas"
                        className="rounded-xl"
                      />
                    ) : (
                      <select
                        id="studentName2"
                        required
                        disabled={!formData.studentClass2}
                        value={formData.studentName2}
                        onChange={e => setFormData(prev => ({ ...prev, studentName2: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazuardi focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">{formData.studentClass2 ? 'Pilih Nama Siswa' : 'Pilih Kelas Terlebih Dahulu'}</option>
                        {formData.studentClass2 && STUDENTS_BY_CLASS[formData.studentClass2]
                          ?.filter(name => {
                            // Hide if already in an active order
                            return !existingOrders.some(order => 
                              (order.studentName === name && order.studentClass === formData.studentClass2) ||
                              (order.studentName2 === name && order.studentClass2 === formData.studentClass2)
                            );
                          })
                          .map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                      </select>
                    )}
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input 
                  id="email" 
                  type="email"
                  required
                  value={formData.email} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="nama@email.com"
                  className="rounded-xl"
                />
              </div>
  
              <div className="bg-lazuardi/5 p-4 rounded-2xl border border-lazuardi/20">
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      id="confirm-data"
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                      className="w-5 h-5 text-lazuardi border-stone-300 rounded focus:ring-lazuardi cursor-pointer"
                    />
                  </div>
                  <Label htmlFor="confirm-data" className="text-xs text-stone-700 leading-relaxed cursor-pointer font-medium">
                    Saya menyatakan bahwa data nama dan kelas ananda:
                    <div className="my-1 font-black text-lazuardi">
                      • {formData.studentName} ({formData.studentClass})
                      {formData.studentName2 && (
                        <>
                          <br />
                          • {formData.studentName2} ({formData.studentClass2})
                        </>
                      )}
                    </div>
                    sudah benar. Sesuai ketentuan, data yang sudah dikonfirmasi <span className="text-red-600 font-bold underline">tidak dapat diubah kembali</span> pada tiket.
                  </Label>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-4">
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Metode Pembayaran
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200">
                    <CreditCard className="w-6 h-6 text-lazuardi" />
                    <div>
                      <p className="text-sm font-bold">Transfer Bank BCA</p>
                      <p className="text-xs text-stone-500">2673005551 a.n Yayasan Lazuardi Hayati</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleCheckout} 
              disabled={isSubmitting || !isConfirmed}
              className="w-full bg-lazuardi hover:bg-lazuardi-dark text-white rounded-full py-6 shadow-lg shadow-lazuardi/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Memproses...' : 'Konfirmasi & Bayar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
