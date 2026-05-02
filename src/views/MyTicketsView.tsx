import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Order } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Ticket, Calendar, MapPin, Clock, Download, ExternalLink, QrCode, Upload, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { EVENT_INFO } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

import { displayWIB } from '../lib/timezone';

export default function MyTicketsView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore onSnapshot error in MyTicketsView:", err);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tiket Saya</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-stone-100 animate-pulse rounded-3xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-lazuardi">Tiket Saya</h1>
          <p className="text-stone-500">Daftar pesanan dan e-ticket Anda.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed border-stone-300 bg-stone-50 py-20 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-stone-300" />
          </div>
          <CardTitle className="text-xl mb-2">Belum ada tiket</CardTitle>
          <CardDescription className="mb-6">Anda belum melakukan pembelian tiket.</CardDescription>
          <Button asChild variant="outline" className="rounded-full">
            <a href="/">Cari Tiket</a>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {orders.map((order) => (
            <ETicket key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

const ETicket: React.FC<{ order: Order }> = ({ order }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (order.status === 'paid' && order.id) {
      QRCode.toDataURL(order.id, { margin: 2, width: 200 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error(err));
    }
  }, [order.id, order.status]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Hanya file gambar yang diperbolehkan");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const toastId = toast.loading("Sedang mengunggah bukti transfer...");

    try {
      console.log("Starting upload for order:", order.id);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          setUploadProgress(50); // Set partially as we started the process
          const base64Data = (reader.result as string).split(',')[1];
          const fileExtension = file.name.split('.').pop();
          const payload = {
            action: 'upload',
            contentType: file.type,
            filename: `bukti transfer_${order.id}_${order.studentName}.${fileExtension}`,
            base64Data: base64Data
          };

          const scriptUrl = 'https://script.google.com/macros/s/AKfycbxuXtiE8AX0lZhJZWazF9ezv6xbJUGRztGIaw4LuuAblwQCCzms08hfVEAX0ZQITcjg/exec';
          
          // Using standard fetch. Google Apps Script requires a redirect follow (default).
          const res = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          
          setUploadProgress(90);
          
          const result = await res.json();
          
          if (result.status === 'success') {
            const driveUrl = result.fileUrl;
            console.log("Drive URL obtained:", driveUrl);

            await updateDoc(doc(db, 'orders', order.id), {
              paymentProof: driveUrl,
              updatedAt: new Date().toISOString()
            });
            
            toast.success("Bukti transfer berhasil diunggah ke Google Drive!", { id: toastId });
          } else {
            throw new Error(result.message || 'Gagal menyimpan ke Drive');
          }
          
          setUploading(false);
          setUploadProgress(0);
        } catch (err: any) {
          console.error("Upload error:", err);
          toast.error(`Gagal mengunggah: ${err.message}. Pastikan Apps Script sudah di-deploy sebagai 'Anyone'.`, { id: toastId });
          setUploading(false);
          setUploadProgress(0);
        }
      };

      reader.onerror = () => {
        toast.error("Gagal membaca file", { id: toastId });
        setUploading(false);
      };

    } catch (error: any) {
      console.error("Full upload error details:", error);
      let errorMessage = error.message;
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Error: Izin Storage ditolak. Silakan cek Storage Rules di Firebase Console.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Error: Izin Firestore ditolak (saat update order).";
      }
      toast.error(`Gagal mengunggah: ${errorMessage}`, { id: toastId });
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(249, 115, 22); // Orange theme color
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("E-TICKET RESMI", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text("SD Lazuardi Year-end Performance 2026", 105, 30, { align: 'center' });

    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id?.toUpperCase()}`, 20, 55);
    doc.text(`Nama Orang Tua: ${order.parentName}`, 20, 65);
    doc.text(`Nama Ananda 1: ${order.studentName} (${order.studentClass})`, 20, 75);
    if (order.studentName2) {
      doc.text(`Nama Ananda 2: ${order.studentName2} (${order.studentClass2})`, 20, 85);
      doc.text(`Status: ${order.status.toUpperCase()}`, 20, 95);
    } else {
      doc.text(`Status: ${order.status.toUpperCase()}`, 20, 85);
    }

    autoTable(doc, {
      startY: order.studentName2 ? 105 : 95,
      head: [['Detail Tiket', 'Keterangan']],
      body: [
        ['Kategori', order.ticketType],
        ['Sesi', order.sessions.join(', ')],
        ['Nomor Kursi', order.seats.map(s => s.split('-').pop()).join(', ')],
        ['Total Bayar', `Rp ${order.totalAmount.toLocaleString('id-ID')}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;

    // Add QR Code to PDF
    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, 'PNG', 140, 50, 50, 50);
      doc.setFontSize(8);
      doc.text(order.id?.toUpperCase() || '', 165, 102, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.text("Informasi Acara:", 20, finalY + 20);
    doc.text(`Tanggal: ${EVENT_INFO.date}`, 20, finalY + 30);
    doc.text(`Lokasi: ${EVENT_INFO.location}`, 20, finalY + 40);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Harap tunjukkan e-ticket ini saat registrasi di lokasi acara.", 105, 280, { align: 'center' });

    doc.save(`Ticket_Lazuardi_${order.id?.slice(-8)}.pdf`);
  };

  return (
    <Card className="overflow-hidden border-stone-200 shadow-lg rounded-3xl flex flex-col sm:flex-row">
      {/* Left side - Info */}
      <div className="flex-grow p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge className={order.status === 'paid' ? 'bg-green-100 text-green-700 border-none' : order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-none' : 'bg-amber-100 text-amber-700 border-none'}>
              {order.status === 'paid' ? 'Lunas' : order.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu Pembayaran'}
            </Badge>
            <h3 className="text-xl font-bold tracking-tight">{order.ticketType}</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-lazuardi">Ananda 1: {order.studentName} ({order.studentClass})</p>
              </div>
              {order.studentName2 && (
                <p className="text-xs font-bold text-lazuardi">Ananda 2: {order.studentName2} ({order.studentClass2})</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Order ID</p>
            <p className="text-xs font-mono">{order.id?.slice(-8).toUpperCase()}</p>
            <p className="text-[9px] text-stone-400 mt-0.5">{displayWIB(order.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Sesi</p>
            <p className="font-medium">{order.sessions.join(', ')}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Kursi</p>
            <p className="font-medium">{order.seats.map(s => s.split('-').pop()).join(', ')}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Calendar className="w-3 h-3" />
            <span>{EVENT_INFO.date}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <MapPin className="w-3 h-3" />
            <span>{EVENT_INFO.location}</span>
          </div>
        </div>

        {order.status === 'pending' && (
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-4">
            <div>
              <p className="text-xs text-amber-800 font-medium mb-1">Instruksi Pembayaran:</p>
              <p className="text-[10px] text-amber-700 leading-relaxed mb-2">
                Silakan transfer Rp {order.totalAmount.toLocaleString('id-ID')} ke BCA 2673005551 a.n Yayasan Lazuardi Hayati.
              </p>
              {order.expiresAt && !order.paymentProof && (
                <div className="flex items-center gap-1.5 text-[9px] text-red-600 font-black px-2 py-1 bg-white/50 rounded-lg inline-block">
                  <Clock className="w-2.5 h-2.5" />
                  <span>BATAS BAYAR: {displayWIB(order.expiresAt)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-amber-200">
              <p className="text-xs text-amber-800 font-medium mb-2">Konfirmasi Pembayaran:</p>
              {order.paymentProof ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-xl border border-green-100">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Bukti sudah diunggah. Menunggu verifikasi admin.</span>
                  <a href={order.paymentProof} target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] underline flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Lihat
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-amber-700 mb-2 italic">
                    Unggah bukti transfer di bawah ini untuk mempercepat proses verifikasi.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      id={`upload-${order.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <label
                      htmlFor={`upload-${order.id}`}
                      className={`flex flex-col items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? (
                        <div className="w-full space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span>Mengunggah...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-600 transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span className="text-xs font-bold">Upload Bukti Transfer</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-amber-200">
              <p className="text-[10px] text-amber-800 font-bold">Bantuan & Pertanyaan:</p>
              <p className="text-[9px] text-amber-700">Fase A: T. Titi | Fase B: T. Mira | Fase C: T. Novi</p>
            </div>
          </div>
        )}
      </div>

      {/* Right side - QR / Action */}
      <div className="bg-lazuardi sm:w-32 flex flex-col items-center justify-center p-6 gap-4 border-t sm:border-t-0 sm:border-l border-white/10">
        {order.status === 'paid' ? (
          <>
            <div className="bg-white p-1 rounded-xl shadow-lg shadow-black/10 overflow-hidden">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
              ) : (
                <QrCode className="w-20 h-20 text-lazuardi p-2" />
              )}
            </div>
            <p className="text-[10px] text-orange-100 font-bold uppercase tracking-widest text-center">Scan at Entry</p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-[10px] text-orange-200 font-bold uppercase tracking-widest mb-2">Total</p>
            <p className="text-white font-bold">Rp {order.totalAmount.toLocaleString('id-ID')}</p>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-orange-100 hover:text-white hover:bg-white/10 w-full rounded-full text-[10px] h-8"
          onClick={downloadPDF}
          disabled={order.status === 'cancelled'}
        >
          <Download className="w-3 h-3 mr-1" /> PDF
        </Button>
      </div>
    </Card>
  );
};
