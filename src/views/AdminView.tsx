import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { Order, Seat, TicketConfig } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Check, X, RefreshCw, Ticket, Armchair, CreditCard, Search, Trash2, AlertTriangle, Send, QrCode, UserCheck, Download, Clock, FileSpreadsheet, ExternalLink, Eye, Image as ImageIcon, Settings, Save, Calendar as CalendarIcon, Info, Lock, CheckCircle } from 'lucide-react';
import { STUDENT_CLASSES, STUDENTS_BY_CLASS, SESSIONS, ADMIN_EMAILS, SEATING_LAYOUT, TICKET_TYPES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { formatToWIB, displayWIB, parseWIB } from '../lib/timezone';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore ${operationType} error on ${path}:`, error);
  
  const errInfo: any = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    }
  };
  
  // Log full error for developer
  console.log("Full Firestore Error Info:", JSON.stringify(errInfo, null, 2));
  
  throw new Error(JSON.stringify(errInfo));
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendTicketEmail } from '../lib/email';
import { Html5Qrcode } from 'html5-qrcode';

// Custom Confirm Dialog Component
function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Ya, Hapus", 
  variant = "danger" 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  description: string,
  confirmText?: string,
  variant?: "danger" | "warning"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-200">
        <CardHeader className="bg-stone-50 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-stone-50 border-t border-stone-100 pt-4">
          <Button variant="ghost" onClick={onClose} className="rounded-full">Batal</Button>
          <Button 
            variant={variant === 'danger' ? 'destructive' : 'default'} 
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-full px-6 ${variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
          >
            {confirmText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AdminView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [ticketConfigs, setTicketConfigs] = useState<TicketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'checkin' | 'settings' | 'scholarship'>('orders');
  const [scannedOrderId, setScannedOrderId] = useState<string | null>(null);
  const [manualOrderId, setManualOrderId] = useState('');
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [viewProofUrl, setViewProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      console.log("Admin email logged in:", auth.currentUser.email);
    }
    
    // ... existing onSnapshot listeners ...
  }, []);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: "danger" | "warning";
    confirmText: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "danger",
    confirmText: "Konfirmasi"
  });

  const openConfirm = (title: string, description: string, onConfirm: () => void, variant: "danger" | "warning" = "danger", confirmText: string = "Konfirmasi") => {
    setConfirmModal({ isOpen: true, title, description, onConfirm, variant, confirmText });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.studentName2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.studentClass?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.studentClass2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    try {
      const headers = ['Order ID', 'Parent Name', 'Student 1', 'Class 1', 'Student 2', 'Class 2', 'Email', 'Ticket Type', 'Sessions', 'Seats', 'Total Amount', 'Status', 'Date', 'Checked In', 'Payment Proof URL'];
      const rows = orders.map(order => [
        order.id,
        `"${order.parentName}"`,
        `"${order.studentName || ''}"`,
        `"${order.studentClass || ''}"`,
        `"${order.studentName2 || ''}"`,
        `"${order.studentClass2 || ''}"`,
        order.email,
        `"${order.ticketType}"`,
        `"${order.sessions.join(', ')}"`,
        `"${order.seats.join(', ')}"`,
        order.totalAmount,
        order.status,
        order.createdAt ? new Date(order.createdAt).toLocaleString('id-ID') : '',
        order.checkedIn ? 'Yes' : 'No',
        order.paymentProof || ''
      ]);

      const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Lazuardi_Ticketing_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV berhasil diunduh");
    } catch (error) {
      console.error("CSV Export Error:", error);
      toast.error("Gagal mengunduh CSV");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Lazuardi 2026 Year-end Performance - Ticketing Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);
      
      const tableColumn = ["Order ID", "Parent Name", "Student Name", "Class", "Phone", "Seats", "Total", "Status"];
      const tableRows = orders.map(order => [
        order.id?.slice(-8).toUpperCase(),
        order.parentName,
        order.studentName || '',
        order.studentClass || '',
        order.phone,
        order.seats.join(', '),
        `Rp ${order.totalAmount.toLocaleString('id-ID')}`,
        order.status.toUpperCase()
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [14, 165, 233] }
      });
      
      doc.save(`Lazuardi_Ticketing_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF berhasil diunduh");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Gagal mengunduh PDF");
    }
  };

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const unsubSeats = onSnapshot(collection(db, 'seats'), (snapshot) => {
      setSeats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seat)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'seats'));

    return () => {
      unsubOrders();
      unsubSeats();
    };
  }, []);

  useEffect(() => {
    const unsubConfigs = onSnapshot(collection(db, 'ticketConfigs'), (snapshot) => {
      setTicketConfigs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketConfig)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'ticketConfigs'));
    return () => unsubConfigs();
  }, []);

  // Auto-Cleanup for Expired Pending Orders
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      const now = new Date();
      const expiredOrders = orders.filter(o => 
        o.status === 'pending' && 
        o.expiresAt && 
        new Date(o.expiresAt) < now &&
        !o.paymentProof // Don't cancel if proof exists
      );

      // Clean up orphaned locks (locked but no orderId, and > 15 mins old)
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const orphanedLockedSeats = seats.filter(s => 
        s.status === 'locked' && 
        !s.orderId && 
        s.lockedAt && 
        (s.lockedAt?.toDate ? s.lockedAt.toDate() : new Date(s.lockedAt)) < fifteenMinsAgo
      );

      // Clean up seats that are marked taken but belong to cancelled orders
      const stuckOccupiedSeats = seats.filter(s => 
        s.status !== 'available' && 
        s.orderId && 
        orders.find(o => o.id === s.orderId)?.status === 'cancelled'
      );

      if (expiredOrders.length > 0 || orphanedLockedSeats.length > 0 || stuckOccupiedSeats.length > 0) {
        const batch = writeBatch(db);
        
        // Process expired orders
        for (const order of expiredOrders) {
          batch.update(doc(db, 'orders', order.id!), { status: 'cancelled' });
          order.seats.forEach(seatId => {
            // Handle both full IDs (Sesi 1-D10) and old IDs (D10)
            if (seatId.includes('-')) {
              batch.set(doc(db, 'seats', seatId), {
                status: 'available',
                lockedBy: null,
                lockedAt: null,
                orderId: null
              }, { merge: true });
            } else {
              // Old format: reset in all possible sessions
              SESSIONS.forEach(session => {
                const fullId = `${session.id}-${seatId}`;
                batch.set(doc(db, 'seats', fullId), {
                  status: 'available',
                  lockedBy: null,
                  lockedAt: null,
                  orderId: null
                }, { merge: true });
              });
            }
          });
        }

        // Process stuck seats from cancelled orders
        stuckOccupiedSeats.forEach(seat => {
          batch.set(doc(db, 'seats', seat.id), {
            status: 'available',
            lockedBy: null,
            lockedAt: null,
            orderId: null
          }, { merge: true });
        });

        // Process orphaned locks
        orphanedLockedSeats.forEach(seat => {
          batch.update(doc(db, 'seats', seat.id), {
            status: 'available',
            lockedBy: null,
            lockedAt: null
          });
        });

        try {
          await batch.commit();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [orders, seats]);

  const handleResend = async (order: Order) => {
    const toastId = toast.loading("Mengirim ulang E-Ticket...");
    try {
      await sendTicketEmail({
        email: order.email,
        parentName: order.parentName,
        studentName: order.studentName,
        studentClass: order.studentClass,
        studentName2: order.studentName2,
        studentClass2: order.studentClass2,
        orderId: order.id || '',
        ticketName: order.ticketType,
        seats: order.seats,
        sessions: order.sessions.map(sId => {
          const session = SESSIONS.find(s => s.id === sId);
          return session ? `${session.name} (${session.time})` : sId;
        }),
        totalAmount: order.totalAmount,
        status: order.status
      });
      toast.success("E-Ticket berhasil dikirim ulang", { id: toastId });
    } catch (error: any) {
      toast.error(`Gagal kirim ulang: ${error.message}`, { id: toastId });
    }
  };

  const handleCheckIn = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        checkedIn: true,
        checkedInAt: new Date().toISOString()
      });
      toast.success("Check-in berhasil!");
      setScannedOrderId(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal melakukan check-in");
    }
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (activeTab === 'checkin' && !scannedOrderId && isScannerStarted) {
      // Berikan jeda sedikit agar DOM 'reader' benar-benar siap
      const timer = setTimeout(async () => {
        try {
          const element = document.getElementById("reader");
          if (!element) return;

          html5QrCode = new Html5Qrcode("reader");
          const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              const cleanedId = decodedText.trim();
              console.log("QR Scanned:", cleanedId);
              setScannedOrderId(cleanedId);
              setIsScannerStarted(false);
              setCameraError(null);
              if (html5QrCode) {
                html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
              }
            },
            (errorMessage) => {
              // Abaikan error saat mencari QR
            }
          );
        } catch (err: any) {
          console.error("Gagal memulai scanner:", err);
          let errorMessage = "Gagal mengakses kamera.";
          if (err.name === 'NotAllowedError' || err.toString().includes("Permission denied")) {
            errorMessage = "Izin kamera ditolak oleh browser.";
          }
          setCameraError(errorMessage);
          toast.error(errorMessage);
          setIsScannerStarted(false);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Error cleaning up scanner:", err));
        }
      };
    }
  }, [activeTab, scannedOrderId, isScannerStarted]);

  const handleManualCheckIn = () => {
    if (!manualOrderId.trim()) {
      toast.error("Silakan masukkan Order ID");
      return;
    }
    // Firestore IDs are case-sensitive, so we should NOT use .toLowerCase()
    const cleanedId = manualOrderId.trim();
    setScannedOrderId(cleanedId);
    setManualOrderId('');
  };

  const handleApprove = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    openConfirm(
      "Konfirmasi Pembayaran",
      `Apakah Anda yakin ingin mengonfirmasi pembayaran untuk pesanan ${order.id}? E-Ticket akan otomatis dikirimkan ke email ${order.email}. Pastikan bukti transfer sudah sesuai.`,
      async () => {
        const toastId = toast.loading("Sedang mengonfirmasi...");
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: 'paid' });
          
          // Send Confirmation Email (Client-side)
          try {
            await sendTicketEmail({
              email: order.email,
              parentName: order.parentName,
              studentName: order.studentName,
              studentClass: order.studentClass,
              studentName2: order.studentName2,
              studentClass2: order.studentClass2,
              studentName3: order.studentName3,
              studentClass3: order.studentClass3,
              orderId: order.id || '',
              ticketName: order.ticketType,
              seats: order.seats,
              sessions: order.sessions.map(sId => {
                const session = SESSIONS.find(s => s.id === sId);
                return session ? `${session.name} (${session.time})` : sId;
              }),
              totalAmount: order.totalAmount,
              status: 'paid'
            });
            toast.success("Pesanan berhasil dikonfirmasi dan E-Ticket telah dikirim", { id: toastId });
          } catch (emailError: any) {
            console.error('Failed to send email:', emailError);
            toast.warning(`Pesanan dikonfirmasi, tapi email gagal: ${emailError.message || 'Cek koneksi'}`, { id: toastId });
          }
        } catch (error) {
          toast.error("Gagal mengonfirmasi pesanan", { id: toastId });
        }
      },
      "warning",
      "Ya, Konfirmasi Pembayaran"
    );
  };

  const handleResetSeats = async () => {
    const toastId = toast.loading("Me-reset kursi...");
    try {
      const chunks = [];
      for (let i = 0; i < seats.length; i += 450) {
        chunks.push(seats.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(seat => {
          batch.set(doc(db, 'seats', seat.id), {
            status: 'available',
            orderId: null,
            lockedBy: null,
            lockedAt: null
          }, { merge: true });
        });
        await batch.commit();
      }
      toast.success("Semua kursi telah di-reset", { id: toastId });
    } catch (error) {
      console.error("Reset seats error:", error);
      toast.error("Gagal me-reset kursi", { id: toastId });
    }
  };

  const handleResetOrders = async () => {
    const toastId = toast.loading("Menghapus pesanan...");
    try {
      const chunks = [];
      for (let i = 0; i < orders.length; i += 450) {
        chunks.push(orders.slice(i, i + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(order => {
          batch.delete(doc(db, 'orders', order.id!));
        });
        await batch.commit();
      }
      toast.success("Semua pesanan telah dihapus", { id: toastId });
    } catch (error) {
      console.error("Reset orders error:", error);
      toast.error("Gagal menghapus pesanan", { id: toastId });
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    openConfirm(
      "Hapus Pesanan",
      `Apakah Anda yakin ingin menghapus pesanan atas nama ${order.parentName}? Kursi akan dikosongkan kembali dan data ini akan hilang permanen.`,
      async () => {
        const toastId = toast.loading("Menghapus pesanan...");
        try {
          const batch = writeBatch(db);
          
          // 1. Reset seats in all sessions associated with the order
          order.seats.forEach(seatId => {
            if (seatId.includes('-')) {
              batch.set(doc(db, 'seats', seatId), {
                status: 'available',
                lockedBy: null,
                lockedAt: null,
                orderId: null
              }, { merge: true });
            } else {
              SESSIONS.forEach(session => {
                const fullId = `${session.id}-${seatId}`;
                batch.set(doc(db, 'seats', fullId), {
                  status: 'available',
                  lockedBy: null,
                  lockedAt: null,
                  orderId: null
                }, { merge: true });
              });
            }
          });

          // 2. Delete order
          batch.delete(doc(db, 'orders', order.id!));

          await batch.commit();
          toast.success("Pesanan berhasil dihapus", { id: toastId });
        } catch (error) {
          console.error(error);
          toast.error("Gagal menghapus pesanan", { id: toastId });
        }
      },
      "danger",
      "Ya, Hapus Pesanan"
    );
  };

  const handleCancel = async (order: Order) => {
    openConfirm(
      "Batalkan Pesanan",
      "Apakah Anda yakin ingin membatalkan pesanan ini? Status akan berubah menjadi 'cancelled' dan kursi akan dikosongkan.",
      async () => {
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'orders', order.id!), { status: 'cancelled' });
          
          order.seats.forEach(seatId => {
            if (seatId.includes('-')) {
              batch.set(doc(db, 'seats', seatId), {
                status: 'available',
                lockedBy: null,
                lockedAt: null,
                orderId: null
              }, { merge: true });
            } else {
              SESSIONS.forEach(session => {
                const fullId = `${session.id}-${seatId}`;
                batch.set(doc(db, 'seats', fullId), {
                  status: 'available',
                  lockedBy: null,
                  lockedAt: null,
                  orderId: null
                }, { merge: true });
              });
            }
          });

          await batch.commit();
          toast.success("Pesanan dibatalkan");
        } catch (error) {
          toast.error("Gagal membatalkan pesanan");
        }
      },
      "warning",
      "Ya, Batalkan"
    );
  };

  const clearAllOrders = async () => {
    openConfirm(
      "HAPUS SEMUA DATA",
      "PERINGATAN KRITIKAL: Tindakan ini akan menghapus SELURUH data pesanan dan mereset semua kursi. Tindakan ini tidak dapat dibatalkan!",
      async () => {
        const toastId = toast.loading("Sedang menghapus data...");
        try {
          // 1. Reset all seats that are not available
          const occupiedSeats = seats.filter(s => s.status !== 'available');
          if (occupiedSeats.length > 0) {
            const seatChunks = [];
            for (let i = 0; i < occupiedSeats.length; i += 500) {
              seatChunks.push(occupiedSeats.slice(i, i + 500));
            }

            for (const chunk of seatChunks) {
              const batch = writeBatch(db);
              chunk.forEach(seat => {
                // occupiedSeats is derived from seats state, so it definitely exists
                batch.update(doc(db, 'seats', seat.id), {
                  status: 'available',
                  lockedBy: null,
                  lockedAt: null,
                  orderId: null
                });
              });
              await batch.commit();
            }
          }

          // 2. Delete all orders
          if (orders.length > 0) {
            const orderChunks = [];
            for (let i = 0; i < orders.length; i += 500) {
              orderChunks.push(orders.slice(i, i + 500));
            }

            for (const chunk of orderChunks) {
              const batch = writeBatch(db);
              chunk.forEach(order => {
                batch.delete(doc(db, 'orders', order.id!));
              });
              await batch.commit();
            }
          }

          toast.success("Semua data dummy berhasil dihapus dan kursi telah dikosongkan", { id: toastId });
        } catch (error: any) {
          console.error("Delete Error:", error);
          toast.error(`Gagal menghapus data: ${error.message || 'Terjadi kesalahan'}`, { id: toastId });
        }
      },
      "danger",
      "HAPUS SEMUA SEKARANG"
    );
  };

  const initializeSeats = async () => {
    openConfirm(
      "Inisialisasi Kursi",
      "Apakah Anda yakin ingin menginisialisasi kursi? Ini akan membuat data kursi yang belum ada di database untuk setiap sesi.",
      async () => {
        const toastId = toast.loading("Menginisialisasi kursi...");
        try {
          for (const session of SESSIONS) {
            const batch = writeBatch(db);
            let addedCount = 0;

            SEATING_LAYOUT.forEach(rowInfo => {
              const sections = [
                { range: rowInfo.right, type: 'right' },
                { range: rowInfo.center, type: 'center' },
                { range: rowInfo.left, type: 'left' }
              ];

              sections.forEach(section => {
                const [start, end] = section.range;
                for (let i = start; i <= end; i++) {
                  const seatId = `${session.id}-${rowInfo.row}${i}`;
                  
                  // Only create if it doesn't exist in the current 'seats' state
                  const exists = seats.some(s => s.id === seatId);
                  
                  if (!exists) {
                    const seatRef = doc(db, 'seats', seatId);
                    batch.set(seatRef, {
                      id: seatId,
                      row: rowInfo.row,
                      number: i,
                      status: 'available',
                      isVIP: rowInfo.isVIP || false,
                      session: session.id
                    });
                    addedCount++;
                  }
                }
              });
            });

            if (addedCount > 0) {
              await batch.commit();
              console.log(`Added ${addedCount} seats for ${session.id}`);
            }
          }
          toast.success("Inisialisasi kursi selesai. Kursi yang sudah ada tidak dirubah.", { id: toastId });
        } catch (error) {
          console.error(error);
          toast.error("Gagal inisialisasi kursi", { id: toastId });
        }
      },
      "warning",
      "Ya, Inisialisasi"
    );
  };

  const stats = {
    totalOrders: orders.length,
    paidOrders: orders.filter(o => o.status === 'paid').length,
    totalRevenue: orders.filter(o => o.status === 'paid').reduce((acc, o) => acc + o.totalAmount, 0),
    occupiedSeats: seats.filter(s => s.status === 'sold').length,
    lockedSeats: seats.filter(s => s.status === 'locked').length,
    availableSeats: seats.filter(s => s.status === 'available').length,
    checkedIn: orders.filter(o => o.checkedIn).length,
    remainingCheckIn: orders.filter(o => o.status === 'paid' && !o.checkedIn).length
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-lazuardi mb-2">Admin Dashboard</h1>
          <p className="text-stone-500 font-medium">Kelola pesanan tiket dan pantau ketersediaan kursi secara real-time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            className={`rounded-full font-bold px-6 ${activeTab === 'orders' ? 'bg-lazuardi' : 'border-stone-200 text-stone-600'}`}
            onClick={() => setActiveTab('orders')}
          >
            <Ticket className="w-4 h-4 mr-2" />
            Daftar Pesanan
          </Button>
          <Button 
            variant={activeTab === 'checkin' ? 'default' : 'outline'}
            className={`rounded-full font-bold px-6 ${activeTab === 'checkin' ? 'bg-lazuardi' : 'border-stone-200 text-stone-600'}`}
            onClick={() => setActiveTab('checkin')}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Check-in QR
          </Button>
          <Button 
            variant={activeTab === 'scholarship' ? 'default' : 'outline'}
            className={`rounded-full font-bold px-6 ${activeTab === 'scholarship' ? 'bg-lazuardi' : 'border-stone-200 text-stone-600'}`}
            onClick={() => setActiveTab('scholarship')}
          >
            <Armchair className="w-4 h-4 mr-2" />
            Alokasi Beasiswa
          </Button>
          <Button 
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            className={`rounded-full font-bold px-6 ${activeTab === 'settings' ? 'bg-lazuardi' : 'border-stone-200 text-stone-600'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Jadwal Tiket
          </Button>
          <div className="h-10 w-px bg-stone-200 mx-2 hidden lg:block"></div>
          <Button 
            variant="outline"
            className="rounded-full font-bold px-6 border-green-200 text-green-700 hover:bg-green-50"
            onClick={exportToCSV}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="outline"
            className="rounded-full font-bold px-6 border-lazuardi/20 text-lazuardi hover:bg-lazuardi/5"
            onClick={exportToPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <div className="h-10 w-px bg-stone-200 mx-2 hidden lg:block"></div>
          <Button 
            variant="ghost" 
            className="rounded-full font-bold px-4 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            onClick={clearAllOrders}
          >
            <Trash2 className="w-4 h-4 mr-2 text-stone-400 group-hover:text-red-500" />
            Reset Data
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-full font-bold px-4 text-stone-400 hover:text-lazuardi hover:bg-lazuardi/5 transition-colors"
            onClick={initializeSeats}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Kursi
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-full font-bold px-4 text-stone-400 hover:text-lazuardi hover:bg-lazuardi/5 transition-colors"
            onClick={() => {
              openConfirm(
                "Sinkronisasi Kursi",
                "Apakah Anda yakin ingin menyinkronkan status kursi berdasarkan data pesanan? Ini akan memastikan kursi terisi sesuai dengan sesi yang dipesan dan membersihkan data kursi lama yang tidak valid.",
                async () => {
                  const toastId = toast.loading("Sinkronisasi...");
                  try {
                    // 1. Prepare all operations in a Map for deduplication
                    const opsMap = new Map<string, { type: 'set' | 'delete', ref: any, data?: any }>();
                    
                    seats.forEach(s => {
                      const sRef = doc(db, 'seats', s.id);
                      if (!s.id.includes('-')) {
                        // Global seat template - remove from DB
                        opsMap.set(s.id, { type: 'delete', ref: sRef });
                      } else {
                        const label = s.id.includes('-') ? s.id.split('-').pop() : s.id;
                        opsMap.set(s.id, { 
                          type: 'set', 
                          ref: sRef, 
                          data: {
                            id: s.id,
                            session: s.id.includes('-') ? s.id.split('-')[0] : 'S1',
                            row: label?.charAt(0),
                            number: parseInt(label?.slice(1) || '0'),
                            status: 'available',
                            orderId: null,
                            lockedBy: null,
                            lockedAt: null
                          }
                        });
                      }
                    });

                    const activeOrders = orders.filter(o => o.status === 'paid' || o.status === 'pending');
                    for (const order of activeOrders) {
                      for (const rawSeat of order.seats) {
                        const label = rawSeat.includes('-') ? rawSeat.split('-').pop() : rawSeat;
                        for (const sId of order.sessions) {
                          const seatId = `${sId}-${label}`;
                          const sRef = doc(db, 'seats', seatId);
                          opsMap.set(seatId, {
                            type: 'set',
                            ref: sRef,
                            data: {
                              status: 'sold',
                              orderId: order.id,
                              id: seatId,
                              session: sId,
                              row: label?.charAt(0),
                              number: parseInt(label?.slice(1) || '0')
                            }
                          });
                        }
                      }
                    }

                    const ops = Array.from(opsMap.values());

                    // 2. Execute in chunks of 450 (safe limit)
                    const chunks = [];
                    for (let i = 0; i < ops.length; i += 450) {
                      chunks.push(ops.slice(i, i + 450));
                    }

                    for (const chunk of chunks) {
                      const batch = writeBatch(db);
                      chunk.forEach(op => {
                        if (op.type === 'delete') {
                          batch.delete(op.ref);
                        } else {
                          batch.set(op.ref, op.data, { merge: true });
                        }
                      });
                      try {
                        await batch.commit();
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, 'seats batch');
                      }
                    }
                    
                    toast.success("Sinkronisasi selesai. Data kursi telah diperbarui sesuai tiap fase.", { id: toastId });
                  } catch (error) {
                    console.error("Sync Error:", error);
                    toast.error(`Gagal sinkronisasi: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
                  }
                },
                "warning",
                "Ya, Sinkronkan"
              );
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Kursi
          </Button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Pesanan" value={stats.totalOrders} icon={<Ticket className="w-5 h-5" />} />
            <StatCard title="Pesanan Lunas" value={stats.paidOrders} icon={<Check className="w-5 h-5" />} />
            <StatCard title="Total Pendapatan" value={`Rp ${stats.totalRevenue.toLocaleString('id-ID')}`} icon={<CreditCard className="w-5 h-5" />} />
            <StatCard title="Kursi Terisi" value={`${stats.occupiedSeats} / ${seats.length}`} icon={<Armchair className="w-5 h-5" />} />
            <StatCard title="Kursi Terkunci" value={`${stats.lockedSeats}`} icon={<Lock className="w-5 h-5" />} />
            <StatCard title="Kursi Tersedia" value={`${stats.availableSeats}`} icon={<CheckCircle className="w-5 h-5" />} />
          </div>

          <Card className="border-stone-200 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white mt-10">
            <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-8 pt-10 px-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <CardTitle className="text-2xl font-bold text-lazuardi">Daftar Pesanan</CardTitle>
                  <CardDescription className="text-stone-500 font-medium">Konfirmasi pembayaran dan kelola data pemesan.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  <div className="relative flex-grow lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      placeholder="Cari nama, email, order ID..." 
                      className="pl-11 rounded-full bg-white border-stone-200 focus:ring-lazuardi h-11"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex bg-stone-100 p-1 rounded-full h-11 items-center">
                    {(['all', 'paid', 'pending'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all h-full ${
                          statusFilter === s 
                            ? 'bg-white text-lazuardi shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {s === 'all' ? 'SEMUA' : s === 'paid' ? 'LUNAS' : 'MENUNGGU'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50/30 hover:bg-stone-50/30 border-b border-stone-100">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 pl-10 py-5">Order ID</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 py-5">Pemesan</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 py-5">Kategori</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 py-5">Kursi</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 py-5">Total</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-stone-400 py-5">Status</TableHead>
                      <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-stone-400 pr-10 py-5">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-stone-50/50 transition-colors border-b border-stone-50">
                        <TableCell className="font-mono text-[10px] text-stone-400 pl-10">
                          <span className="bg-stone-100 px-2 py-1 rounded">#{order.id?.slice(-6).toUpperCase()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col py-2">
                            <span className="font-bold text-stone-800">{order.parentName}</span>
                            <span className="text-[10px] text-lazuardi font-bold">Ananda 1: {order.studentName} ({order.studentClass})</span>
                            {order.studentName2 && (
                                <span className="text-[10px] text-lazuardi font-bold">Ananda 2: {order.studentName2} ({order.studentClass2})</span>
                            )}
                            {order.studentName3 && (
                                <span className="text-[10px] text-lazuardi font-bold">Ananda 3: {order.studentName3} ({order.studentClass3})</span>
                            )}
                            <span className="text-[10px] text-stone-500 font-medium">{order.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-stone-700">{order.ticketType}</span>
                            <div className="flex gap-1 mt-1">
                              {order.sessions.map((s, idx) => (
                                <span key={`${order.id}-${s}-${idx}`} className="text-[8px] bg-lazuardi/10 text-lazuardi px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">{s}</span>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {order.seats.map((s, idx) => {
                              const label = s.includes('-') ? s.split('-').pop() : s;
                              const sId = s.includes('-') ? s.split('-')[0] : '';
                              return (
                                <Badge key={`${order.id}-${s}-${idx}`} variant="outline" className="text-[9px] py-0 h-5 border-stone-200 font-bold bg-white" title={sId}>
                                  {label} {sId && `(${sId})`}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-lazuardi">
                          Rp {order.totalAmount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge className={`rounded-full px-3 py-1 text-[9px] font-black tracking-wider border-none ${
                              order.status === 'paid' 
                                ? 'bg-green-100 text-green-700' 
                                : order.status === 'cancelled' 
                                  ? 'bg-stone-100 text-stone-500' 
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status === 'paid' ? 'LUNAS' : order.status === 'cancelled' ? 'BATAL' : 'MENUNGGU'}
                            </Badge>
                            {order.paymentProof && order.status === 'pending' && (
                              <span className="text-[8px] text-blue-600 font-bold mt-1 flex items-center gap-0.5">
                                <ImageIcon className="w-2 h-2" /> ADA BUKTI
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-10">
                          <div className="flex justify-end gap-2">
                            {order.paymentProof && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm transition-all hover:scale-110 active:scale-90" 
                                onClick={() => setViewProofUrl(order.paymentProof!)} 
                                title="Lihat Bukti Transfer"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'paid' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 rounded-full border-lazuardi/20 text-lazuardi hover:bg-lazuardi/5 shadow-sm transition-all hover:scale-110 active:scale-90" 
                                onClick={() => handleResend(order)} 
                                title="Kirim Ulang E-Ticket"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 rounded-full border-green-200 text-green-600 hover:bg-green-50 shadow-sm transition-all hover:scale-110 active:scale-90" 
                                onClick={() => handleApprove(order.id!)} 
                                title="Konfirmasi Pembayaran"
                              >
                                <Check className="w-5 h-5" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-9 w-9 p-0 rounded-full border-red-200 text-red-600 hover:bg-red-50 shadow-sm transition-all hover:scale-110 active:scale-90" 
                              onClick={() => handleDeleteOrder(order)} 
                              title="Hapus Pesanan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center text-stone-400">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold">Tidak ada pesanan ditemukan</p>
                            <p className="text-xs">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : activeTab === 'checkin' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-stone-50 border-b border-stone-100">
                <CardTitle className="text-xl font-bold text-lazuardi flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>Gunakan kamera perangkat untuk memindai tiket pembeli.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative group">
                  <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 min-h-[300px] flex items-center justify-center">
                    {cameraError ? (
                      <div className="text-center p-6 space-y-4">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-stone-800">{cameraError}</p>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Browser memblokir akses kamera di dalam frame. Silakan buka aplikasi di tab baru untuk memberikan izin kamera.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="rounded-full bg-lazuardi hover:bg-lazuardi/90 px-6 h-10 shadow-md"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Buka di Tab Baru
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => { setCameraError(null); setIsScannerStarted(true); }}
                            className="text-xs text-stone-400 hover:text-stone-600"
                          >
                            Coba Lagi
                          </Button>
                        </div>
                      </div>
                    ) : !isScannerStarted && !scannedOrderId ? (
                      <Button 
                        onClick={() => { setCameraError(null); setIsScannerStarted(true); }}
                        className="rounded-full bg-lazuardi hover:bg-lazuardi/90 px-8 h-12 shadow-lg shadow-lazuardi/20"
                      >
                        <QrCode className="w-5 h-5 mr-2" />
                        Aktifkan Kamera
                      </Button>
                    ) : null}
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-stone-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-stone-400 font-bold">Atau Masukkan Manual</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Masukkan Order ID (contoh: abc123de)" 
                      value={manualOrderId}
                      onChange={(e) => setManualOrderId(e.target.value)}
                      className="rounded-full"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                    />
                    <Button onClick={handleManualCheckIn} className="rounded-full bg-lazuardi">Cari</Button>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-amber-800 font-bold">Kamera tidak muncul?</p>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      Karena batasan keamanan browser pada tampilan pratinjau (iframe), kamera mungkin tidak dapat diakses langsung di sini. 
                      <strong> Silakan buka aplikasi di TAB BARU </strong> (klik ikon panah di pojok kanan atas layar ini) untuk menggunakan fitur kamera secara maksimal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-stone-50 border-b border-stone-100">
                <CardTitle className="text-xl font-bold text-lazuardi flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Hasil Pemindaian
                </CardTitle>
                <CardDescription>Informasi tiket yang berhasil dipindai.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {loading ? (
                  <div className="text-center py-20">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-300" />
                    <p className="text-stone-400 text-sm mt-4">Memuat data pesanan...</p>
                  </div>
                ) : scannedOrderId ? (
                  (() => {
                    // Try exact match first, then case-insensitive match
                    const order = orders.find(o => o.id === scannedOrderId) || 
                                  orders.find(o => o.id?.toLowerCase() === scannedOrderId.toLowerCase());
                    
                    if (!order) {
                      return (
                        <div className="text-center py-12 space-y-4">
                          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <X className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-bold text-red-600">Tiket Tidak Valid</h3>
                          <p className="text-stone-500 text-sm">Order ID "{scannedOrderId}" tidak ditemukan dalam sistem.</p>
                          <Button variant="outline" onClick={() => setScannedOrderId(null)} className="rounded-full">Scan Ulang</Button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        <div className={`p-4 rounded-2xl border ${order.status === 'paid' ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Status Pembayaran</p>
                              <Badge className={order.status === 'paid' ? 'bg-green-500' : 'bg-amber-500'}>
                                {order.status === 'paid' ? 'LUNAS' : 'PENDING'}
                              </Badge>
                            </div>
                            {order.checkedIn && (
                              <Badge className="bg-blue-500 text-white">SUDAH CHECK-IN</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Nama Orang Tua</p>
                              <p className="font-bold text-stone-800">{order.parentName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Nama Ananda</p>
                              <p className="font-bold text-stone-800">{order.studentName} ({order.studentClass})</p>
                              {order.studentName2 && <p className="font-bold text-stone-800">{order.studentName2} ({order.studentClass2})</p>}
                              {order.studentName3 && <p className="font-bold text-stone-800">{order.studentName3} ({order.studentClass3})</p>}
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Kategori Tiket</p>
                              <p className="font-bold text-stone-800">{order.ticketType}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Nomor Kursi</p>
                              <p className="font-bold text-stone-800">
                                {order.seats.map(s => s.includes('-') ? `${s.split('-').pop()} (${s.split('-')[0]})` : s).join(', ')}
                              </p>
                            </div>
                          </div>

                          {order.paymentProof && order.status === 'pending' && (
                            <div className="mt-4 pt-4 border-t border-stone-100">
                              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Bukti Transfer Terlampir</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => setViewProofUrl(order.paymentProof!)}
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Lihat Bukti Transfer
                              </Button>
                            </div>
                          )}
                        </div>

                        {order.status !== 'paid' ? (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-700 font-bold">Peringatan: Pembayaran belum dikonfirmasi!</p>
                          </div>
                        ) : order.checkedIn ? (
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            <p className="text-sm text-blue-700 font-bold">Tamu ini sudah melakukan check-in pada {new Date(order.checkedInAt!).toLocaleTimeString()}.</p>
                          </div>
                        ) : (
                          <Button 
                            className="w-full h-14 rounded-2xl bg-lazuardi hover:bg-lazuardi/90 text-lg font-bold shadow-lg shadow-lazuardi/20"
                            onClick={() => handleCheckIn(order.id!)}
                          >
                            <Check className="w-6 h-6 mr-2" />
                            Konfirmasi Check-in
                          </Button>
                        )}
                        
                        <Button variant="ghost" onClick={() => { setScannedOrderId(null); setIsScannerStarted(true); }} className="w-full rounded-full text-stone-500">
                          Batal / Scan Ulang
                        </Button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-stone-100 text-stone-300 rounded-full flex items-center justify-center mx-auto">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <p className="text-stone-400 text-sm">Belum ada tiket yang dipindai.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-lazuardi">Rekapitulasi Kehadiran</h2>
              <Badge variant="outline" className="rounded-full bg-lazuardi/5 text-lazuardi border-lazuardi/20">
                Real-time
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-stone-200 shadow-sm bg-white rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Sudah Hadir</p>
                  <p className="text-2xl font-black text-stone-800">{stats.checkedIn}</p>
                </div>
              </Card>
              
              <Card className="border-stone-200 shadow-sm bg-white rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Belum Hadir</p>
                  <p className="text-2xl font-black text-stone-800">{stats.remainingCheckIn}</p>
                </div>
              </Card>

              <Card className="border-stone-200 shadow-sm bg-white rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Ticket className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Tiket Lunas</p>
                  <p className="text-2xl font-black text-stone-800">{stats.paidOrders}</p>
                </div>
              </Card>
            </div>

            <Card className="border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
              <CardHeader className="bg-stone-50/50 border-b border-stone-100 p-8">
                <CardTitle className="text-xl font-bold text-lazuardi">Daftar Kehadiran</CardTitle>
                <CardDescription>Daftar tamu yang sudah melakukan check-in di lokasi.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-50/50 hover:bg-stone-50/50">
                        <TableHead className="pl-8 font-bold text-stone-600">Nama Orang Tua</TableHead>
                        <TableHead className="font-bold text-stone-600">Nama Ananda</TableHead>
                        <TableHead className="font-bold text-stone-600">Kategori</TableHead>
                        <TableHead className="font-bold text-stone-600">Waktu Check-in</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-stone-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.filter(o => o.checkedIn).length > 0 ? (
                        orders
                          .filter(o => o.checkedIn)
                          .sort((a, b) => new Date(b.checkedInAt!).getTime() - new Date(a.checkedInAt!).getTime())
                          .map((order) => (
                            <TableRow key={order.id} className="hover:bg-stone-50/30 transition-colors">
                              <TableCell className="pl-8 font-medium text-stone-800">{order.parentName}</TableCell>
                              <TableCell className="text-stone-600">{order.studentName} ({order.studentClass})</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full border-stone-200 text-stone-600">
                                  {order.ticketType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-stone-500 text-sm">
                                {new Date(order.checkedInAt!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="pr-8 text-right">
                                <Badge className="bg-green-500 text-white rounded-full px-3">Hadir</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-stone-400 italic">
                            Belum ada tamu yang check-in.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : activeTab === 'scholarship' ? (
        <ScholarshipAllocationTab seats={seats} orders={orders} />
      ) : activeTab === 'settings' ? (
        <TicketSettingsTab configs={ticketConfigs} />
      ) : null}

      {/* Action Buttons (Floating or Bottom) removed to prevent misclicks at the bottom */}

      <ConfirmDialog 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />

      {/* Payment Proof Modal */}
      {viewProofUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-bold text-stone-800">Bukti Transfer</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewProofUrl(null)} className="rounded-full h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-8 bg-stone-50 overflow-auto max-h-[80vh] flex flex-col items-center justify-center text-center">
              {viewProofUrl.includes('drive.google.com') ? (
                <div className="space-y-6 py-10">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <ExternalLink className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-stone-800">Buka di Google Drive</h4>
                    <p className="text-sm text-stone-500 max-w-sm mx-auto">
                      Bukti transfer ini disimpan di Google Drive. Klik tombol di bawah untuk melihat file secara lengkap.
                    </p>
                  </div>
                  <Button 
                    asChild
                    className="rounded-full bg-blue-600 hover:bg-blue-700 px-8 h-12 shadow-lg shadow-blue-600/20"
                  >
                    <a href={viewProofUrl} target="_blank" rel="noopener noreferrer">
                      Buka File <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              ) : (
                <img 
                  src={viewProofUrl} 
                  alt="Payment Proof" 
                  className="max-w-full h-auto rounded-xl shadow-sm"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div className="p-4 border-t border-stone-100 flex justify-end">
              <Button onClick={() => setViewProofUrl(null)} className="rounded-full bg-lazuardi">Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketSettingsTab({ configs }: { configs: TicketConfig[] }) {
  const [localConfigs, setLocalConfigs] = useState<Record<string, { from: string, until: string, isPublic: boolean }>>({});

  useEffect(() => {
    const initial: Record<string, { from: string, until: string, isPublic: boolean }> = {};
    TICKET_TYPES.forEach(t => {
      const saved = configs.find(c => c.id === t.id);
      const fromVal = saved?.availableFrom || t.availableFrom;
      const untilVal = saved?.availableUntil || t.availableUntil || '';
      
      initial[t.id] = {
        // Convert ISO to WIB for input fields
        from: fromVal ? formatToWIB(fromVal) : '',
        until: untilVal ? formatToWIB(untilVal) : '',
        isPublic: saved?.isPublic || false
      };
    });
    setLocalConfigs(initial);
  }, [configs]);

  const handleSave = async (id: string) => {
    const { from, until, isPublic } = localConfigs[id];
    try {
      // Ensure we store in a standard ISO format but correctly parsed from WIB string
      const fromISO = parseWIB(from).toISOString();
      const untilISO = until ? parseWIB(until).toISOString() : '';

      await setDoc(doc(db, 'ticketConfigs', id), {
        availableFrom: fromISO,
        availableUntil: untilISO,
        isPublic: isPublic
      });
      toast.success("Jadwal tiket berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui jadwal");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TICKET_TYPES.map(ticket => (
          <Card key={ticket.id} className="border-stone-200 overflow-hidden rounded-[2.5rem] shadow-lg bg-white group hover:shadow-xl transition-all">
            <CardHeader className="bg-stone-50 border-b border-stone-100 p-8">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-black text-lazuardi">{ticket.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{ticket.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-lazuardi/10 text-lazuardi border-none">
                  {ticket.sessions.join(', ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3 text-lazuardi" />
                    Waktu Buka (WIB / GMT+7)
                  </label>
                  <Input 
                    value={localConfigs[ticket.id]?.from || ''}
                    onChange={(e) => setLocalConfigs(prev => ({
                      ...prev,
                      [ticket.id]: { ...prev[ticket.id], from: e.target.value }
                    }))}
                    className="rounded-xl bg-stone-50 border-stone-200 focus:bg-white transition-all font-mono text-xs"
                    placeholder="2026-04-28 13:30:00"
                  />
                  <p className="text-[9px] text-stone-400 px-1 italic">Format: YYYY-MM-DD HH:mm:ss (WIB)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-red-400" />
                    Waktu Tutup (WIB / GMT+7)
                  </label>
                  <Input 
                    value={localConfigs[ticket.id]?.until || ''}
                    onChange={(e) => setLocalConfigs(prev => ({
                      ...prev,
                      [ticket.id]: { ...prev[ticket.id], until: e.target.value }
                    }))}
                    className="rounded-xl bg-stone-50 border-stone-200 focus:bg-white transition-all font-mono text-xs"
                    placeholder="2026-04-28 15:30:00"
                  />
                  <p className="text-[9px] text-stone-400 px-1 italic">Format: YYYY-MM-DD HH:mm:ss (WIB)</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id={`public-${ticket.id}`}
                    checked={localConfigs[ticket.id]?.isPublic || false}
                    onChange={(e) => setLocalConfigs(prev => ({
                      ...prev,
                      [ticket.id]: { ...prev[ticket.id], isPublic: e.target.checked }
                    }))}
                    className="w-4 h-4 rounded text-lazuardi focus:ring-lazuardi"
                  />
                  <label htmlFor={`public-${ticket.id}`} className="text-xs font-bold text-stone-700 cursor-pointer">
                    Buka untuk Umum (Tanpa Nama Ananda)
                  </label>
                </div>
                <div className="flex-grow"></div>
                {localConfigs[ticket.id]?.isPublic && (
                  <Badge className="bg-orange-500 text-white border-none text-[10px]">Public Mode Active</Badge>
                )}
              </div>

              <div className="p-4 bg-lazuardi/5 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lazuardi shadow-sm flex-shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-stone-800">Preview Waktu (WIB):</p>
                  <div className="text-[11px] text-stone-600 grid grid-cols-1 gap-1">
                    <p>Buka: <span className="font-medium text-lazuardi">{localConfigs[ticket.id]?.from ? displayWIB(parseWIB(localConfigs[ticket.id].from)) : '-'}</span></p>
                    <p>Tutup: <span className="font-medium text-red-500">{localConfigs[ticket.id]?.until ? displayWIB(parseWIB(localConfigs[ticket.id].until)) : '-'}</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-stone-50/50 border-t border-stone-100 px-8 py-4 flex justify-end">
              <Button 
                onClick={() => handleSave(ticket.id)}
                className="rounded-full bg-lazuardi hover:bg-lazuardi-dark text-white font-bold h-10 px-6 shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="max-w-xl p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
        <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
        <div className="space-y-2">
          <h4 className="font-black text-amber-900 tracking-tight">Penting!</h4>
          <p className="text-sm text-amber-800/80 leading-relaxed">
            Format waktu menggunakan ISO string standar UTC. 
            <strong> WIB adalah UTC+7. </strong> 
            Jika ingin mengatur pukul 14.00 WIB, gunakan jam 07.00 UTC (T07:00:00Z).
            Pastikan format tanggal dan waktu sudah benar sebelum menyimpan.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScholarshipAllocationTab({ seats, orders }: { seats: Seat[], orders: Order[] }) {
  const [selectedSession, setSelectedSession] = useState(SESSIONS[0].id);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [studentClass, setStudentClass] = useState('');
  const [studentName, setStudentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSeatClick = (seatLabel: string) => {
    const seatId = `${selectedSession}-${seatLabel}`;
    const seat = seats.find(s => s.id === seatId);
    
    if (seat?.status === 'sold') {
      toast.error("Kursi sudah terisi");
      return;
    }

    if (selectedSeats.includes(seatLabel)) {
      setSelectedSeats(prev => prev.filter(s => s !== seatLabel));
    } else {
      if (selectedSeats.length >= 10) {
        toast.error("Maksimal 10 kursi per alokasi beasiswa");
        return;
      }
      setSelectedSeats(prev => [...prev, seatLabel]);
    }
  };

  const handleAllocate = async () => {
    if (!studentClass || !studentName || selectedSeats.length === 0) {
      toast.error("Mohon lengkapi data siswa dan pilih minimal 1 kursi");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, 'orders'));
      
      const session = SESSIONS.find(s => s.id === selectedSession);

      batch.set(orderRef, {
        userId: 'SYSTEM_SCHOLARSHIP',
        parentName: 'Beasiswa SD Lazuardi',
        studentName,
        studentClass,
        email: 'scholarship@lazuardi.sch.id',
        ticketType: 'Alokasi Beasiswa',
        sessions: [selectedSession],
        seats: selectedSeats.map(label => `${selectedSession}-${label}`),
        totalAmount: 0,
        status: 'paid',
        createdAt: new Date().toISOString(),
        checkedIn: false
      });

      selectedSeats.forEach(seatLabel => {
        const seatId = `${selectedSession}-${seatLabel}`;
        batch.set(doc(db, 'seats', seatId), {
          status: 'sold',
          orderId: orderRef.id,
          lockedBy: null,
          lockedAt: null
        }, { merge: true });
      });

      await batch.commit();
      toast.success("Alokasi beasiswa berhasil disimpan!");
      setSelectedSeats([]);
      setStudentName('');
    } catch (error) {
      toast.error("Gagal menyimpan alokasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-stone-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 p-8">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-bold text-lazuardi">Pilih Kursi Beasiswa</CardTitle>
                <CardDescription>Pilih kursi untuk sesi {SESSIONS.find(s => s.id === selectedSession)?.name}</CardDescription>
              </div>
              <div className="flex gap-2">
                {SESSIONS.map(s => (
                  <Button 
                    key={s.id}
                    size="sm"
                    variant={selectedSession === s.id ? 'default' : 'outline'}
                    onClick={() => { setSelectedSession(s.id); setSelectedSeats([]); }}
                    className="rounded-full"
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-1 overflow-x-auto pb-12 custom-scrollbar">
              {SEATING_LAYOUT.map((rowInfo) => {
                const rowLabel = rowInfo.row;
                const renderSection = (range: number[]) => {
                  const seatsInRow = [];
                  for (let i = range[1]; i >= range[0]; i--) {
                    const seatLabel = `${rowLabel}${i}`;
                    const seatId = `${selectedSession}-${seatLabel}`;
                    const seat = seats.find(s => s.id === seatId);
                    const isSelected = selectedSeats.includes(seatLabel);
                    const isSold = seat?.status === 'sold';
                    
                    seatsInRow.push(
                      <div
                        key={`alloc-${selectedSession}-${rowLabel}-${i}`}
                        onClick={() => !isSold && handleSeatClick(seatLabel)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black cursor-pointer transition-all
                          ${isSelected ? 'bg-green-600 text-white scale-110 shadow-lg' : 
                            isSold ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 
                            'bg-white border border-stone-200 text-stone-600 hover:border-lazuardi'}
                        `}
                      >
                        {i}
                      </div>
                    );
                  }
                  return seatsInRow;
                };

                return (
                  <div key={rowLabel} className="flex items-center justify-center gap-4 mb-1">
                    <div className="w-6 text-[10px] font-bold text-stone-300">{rowLabel}</div>
                    <div className="flex gap-1">{renderSection(rowInfo.left)}</div>
                    <div className="w-4"></div>
                    <div className="flex gap-1">{renderSection(rowInfo.center)}</div>
                    <div className="w-4"></div>
                    <div className="flex gap-1">{renderSection(rowInfo.right)}</div>
                    <div className="w-6 text-[10px] font-bold text-stone-300">{rowLabel}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200 shadow-xl rounded-[2.5rem] bg-stone-50 overflow-hidden h-fit">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-bold text-stone-800">Data Penerima</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Kelas</label>
                <select 
                  className="w-full h-12 rounded-2xl border border-stone-200 px-4 bg-white"
                  value={studentClass}
                  onChange={(e) => { setStudentClass(e.target.value); setStudentName(''); }}
                >
                  <option value="">Pilih Kelas</option>
                  {STUDENT_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Nama Siswa</label>
                <select 
                  className="w-full h-12 rounded-2xl border border-stone-200 px-4 bg-white"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={!studentClass}
                >
                  <option value="">Pilih Nama</option>
                  {studentClass && STUDENTS_BY_CLASS[studentClass]?.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="pt-4 space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Kursi Terpilih ({selectedSeats.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.map((s, idx) => <Badge key={`${s}-${idx}`} className="bg-lazuardi">{s}</Badge>)}
                </div>
              </div>
            </div>
            <Button 
              className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold"
              disabled={isSubmitting || selectedSeats.length === 0 || !studentName}
              onClick={handleAllocate}
            >
              {isSubmitting ? 'Memproses...' : 'Simpan Alokasi'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="border-stone-200 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-16 h-16 bg-lazuardi/5 rounded-bl-full flex items-center justify-center text-lazuardi/20">
        {icon}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-stone-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tighter text-lazuardi">{value}</div>
      </CardContent>
    </Card>
  );
}
