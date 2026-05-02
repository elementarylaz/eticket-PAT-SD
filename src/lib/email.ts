import QRCode from 'qrcode';

export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuXtiE8AX0lZhJZWazF9ezv6xbJUGRztGIaw4LuuAblwQCCzms08hfVEAX0ZQITcjg/exec';

interface EmailData {
  email: string;
  parentName: string;
  studentName: string;
  studentClass: string;
  studentName2?: string;
  studentClass2?: string;
  orderId: string;
  ticketName: string;
  seats: string[];
  sessions: string[];
  totalAmount: number;
  status: string;
}

export async function sendTicketEmail(data: EmailData) {
  const isPaid = data.status === 'paid';
  const isTerusan = data.studentName2 && data.studentClass2;
  
  // Generate QR Code as Data URL
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(data.orderId, { margin: 2, width: 200 });
  } catch (err) {
    console.error('QR Gen Error:', err);
  }

  const subject = isPaid 
    ? `E-Ticket: Elementary End-Year Performance 2026 (LUNAS) - ${data.orderId.toUpperCase()}` 
    : `Konfirmasi Pesanan: Elementary End-Year Performance 2026 - ${data.orderId.toUpperCase()}`;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fed7aa; border-radius: 12px; overflow: hidden;">
      <div style="background-color: ${isPaid ? '#ea580c' : '#f97316'}; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${isPaid ? 'E-Ticket Resmi' : 'Konfirmasi Pesanan'}</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Elementary End-Year Performance 2026</p>
      </div>
      <div style="padding: 24px; color: #374151;">
        ${!isPaid ? `
        <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #9a3412; font-weight: bold;">⚠️ BATAS WAKTU PEMBAYARAN: 15 MENIT</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #c2410c;">Mohon segera lakukan pembayaran dan konfirmasi dalam 15 menit agar kursi tidak otomatis terlepas.</p>
        </div>
        ` : ''}
        <p>Halo <strong>${data.parentName}</strong>,</p>
        <p>${isPaid ? 'Pembayaran Anda telah kami terima. Berikut adalah e-ticket resmi Anda:' : 'Terima kasih telah melakukan pemesanan tiket. Berikut adalah rincian pesanan Anda:'}</p>
        
        <div style="background-color: #fffaf5; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fff1e2;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.orderId.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${isPaid ? '#10b981' : '#f97316'};">${isPaid ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nama Ananda</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">
                ${data.studentName} (${data.studentClass})
                ${isTerusan ? `<br><span style="font-size: 11px; color: #6b7280;">dan</span><br>${data.studentName2} (${data.studentClass2})` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Kategori Tiket</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.ticketName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Jumlah Tiket</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.seats.length} Tiket</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Sesi & Jam</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.sessions.join(', ')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nomor Kursi</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${data.seats.join(', ')}</td>
            </tr>
            <tr>
              <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Total Pembayaran</td>
              <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: bold; font-size: 18px; color: #ea580c;">Rp ${data.totalAmount.toLocaleString('id-ID')}</td>
            </tr>
          </table>
        </div>

        ${isPaid && qrCodeDataUrl ? `
        <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: white; border: 2px dashed #fed7aa; border-radius: 12px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase; tracking: 1px;">Scan QR Code saat Registrasi</p>
          <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 180px; height: 180px;" />
          <p style="margin: 12px 0 0 0; font-family: monospace; font-size: 14px; color: #ea580c; font-weight: bold;">${data.orderId.toUpperCase()}</p>
        </div>
        ` : ''}

        ${!isPaid ? `
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #ea580c; font-weight: bold;">Instruksi Pembayaran:</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #9a3412;">
            Silakan transfer ke <strong>BCA: 2673005551</strong> a.n Yayasan Lazuardi Hayati. 
            Kirim bukti transfer ke WhatsApp Ms. Dini (0853 1193 8579) untuk verifikasi.
          </p>
        </div>
        ` : `
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #ea580c; font-weight: bold;">Tiket Anda Siap Digunakan!</p>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #9a3412;">
            Silakan simpan/tunjukkan email ini atau Order ID Anda saat registrasi di lokasi acara.
          </p>
        </div>
        `}

        <p style="font-size: 14px; line-height: 1.5;">
          <strong>Lokasi:</strong> Makara Art Center, Universitas Indonesia, Kota Depok<br>
          <strong>Waktu:</strong> 14 Mei 2026, 07:30 - 12:00 WIB
        </p>
        <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #eee; padding-top: 10px; margin-top: 10px;">
          <p style="margin: 5px 0;"><strong>Bantuan & Pertanyaan:</strong></p>
          <ul style="padding-left: 20px; margin: 5px 0;">
            <li>Fase A: Teacher Titi (0897 5137 612)</li>
            <li>Fase B: Teacher Mira (0856 9795 0679)</li>
            <li>Fase C: Teacher Novi (0819 0586 7335)</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script requires no-cors for simple redirects or handled normally
      headers: {
        'Content-Type': 'text/plain', // Use text/plain to avoid preflight issues in GAS if needed
      },
      body: JSON.stringify({
        action: 'email',
        email: data.email,
        subject: subject,
        htmlBody: htmlBody
      })
    });
    
    // Note: with 'no-cors', we can't see the response body, but status will be opaque.
    // In many GAS setups, people use 'redirects'.
    return true;
  } catch (err) {
    console.error('Email Fetch Error:', err);
    throw err;
  }
}
