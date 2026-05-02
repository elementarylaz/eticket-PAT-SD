import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/send-ticket', async (req, res) => {
    const { email, parentName, studentName, studentClass, studentName2, studentClass2, orderId, ticketName, seats, sessions, totalAmount, status } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const isPaid = status === 'paid';
    const isTerusan = studentName2 && studentClass2;
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.replace(/\s/g, ''); // Strip all spaces from app password
    const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    if (!smtpUser || !smtpPass) {
      console.error('Email Error: SMTP_USER or SMTP_PASS is not configured.');
      return res.status(400).json({ 
        success: false, 
        error: 'Email service not configured',
        details: 'SMTP_USER and SMTP_PASS must be set in the application settings (Secrets).' 
      });
    }

    const transporterConfig: any = {
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    };

    // Use service: 'gmail' for better compatibility if host is gmail
    if (smtpHost.includes('gmail.com')) {
      transporterConfig.service = 'gmail';
    } else {
      transporterConfig.host = smtpHost;
      transporterConfig.port = smtpPort;
      transporterConfig.secure = smtpSecure;
    }

    console.log(`Attempting to send email via ${transporterConfig.service || smtpHost} to ${email}. Pass length: ${smtpPass.length}`);
    
    // Generate QR Code
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(orderId);
    } catch (qrError) {
      console.error('QR Code Generation Error:', qrError);
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    const mailOptions = {
      from: `"Elementary End-Year Performance" <${smtpUser}>`,
      to: email,
      subject: isPaid ? `E-Ticket: Elementary End-Year Performance 2026 (LUNAS) - ${orderId}` : `Konfirmasi Pesanan: Elementary End-Year Performance 2026 - ${orderId}`,
      html: `
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
            <p>Halo <strong>${parentName}</strong>,</p>
            <p>${isPaid ? 'Pembayaran Anda telah kami terima. Berikut adalah e-ticket resmi Anda:' : 'Terima kasih telah melakukan pemesanan tiket. Berikut adalah rincian pesanan Anda:'}</p>
            
            <div style="background-color: #fffaf5; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fff1e2;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${isPaid ? '#10b981' : '#f97316'};">${isPaid ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nama Ananda</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">
                    ${studentName} (${studentClass})
                    ${isTerusan ? `<br><span style="font-size: 11px; color: #6b7280;">dan</span><br>${studentName2} (${studentClass2})` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Kategori Tiket</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${ticketName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Jumlah Tiket</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${seats.length} Tiket</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Sesi & Jam</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${sessions.join(', ')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nomor Kursi</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${seats.join(', ')}</td>
                </tr>
                <tr>
                  <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Total Pembayaran</td>
                  <td style="padding: 16px 0 8px 0; border-top: 1px solid #e5e7eb; text-align: right; font-weight: bold; font-size: 18px; color: #ea580c;">Rp ${totalAmount.toLocaleString('id-ID')}</td>
                </tr>
              </table>
            </div>

            ${isPaid && qrCodeDataUrl ? `
            <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: white; border: 2px dashed #fed7aa; border-radius: 12px;">
              <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; font-weight: bold; text-transform: uppercase; tracking: 1px;">Scan QR Code saat Registrasi</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px;" />
              <p style="margin: 12px 0 0 0; font-family: monospace; font-size: 14px; color: #ea580c; font-weight: bold;">${orderId.toUpperCase()}</p>
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
            <div style="font-size: 12px; color: #6b7280; border-top: 1px solid #eee; pt: 10px; mt: 10px;">
              <p style="margin: 5px 0;"><strong>Bantuan & Pertanyaan:</strong></p>
              <ul style="padding-left: 20px; margin: 5px 0;">
                <li>Fase A: Teacher Titi (0897 5137 612)</li>
                <li>Fase B: Teacher Mira (0856 9795 0679)</li>
                <li>Fase C: Teacher Novi (0819 0586 7335)</li>
              </ul>
              <p style="margin: 5px 0;">Email: <a href="mailto:elementary@lazuardi.sch.id">elementary@lazuardi.sch.id</a></p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">&copy; 2026 SD Lazuardi. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments: isPaid && qrCodeDataUrl ? [{
        filename: 'qrcode.png',
        content: qrCodeDataUrl.split('base64,')[1],
        encoding: 'base64',
        cid: 'qrcode'
      }] : []
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email successfully sent to ${email} for Order ID: ${orderId}`);
      res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      console.error('Nodemailer Error Details:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        message: error.message
      });
      
      let userFriendlyDetail = error.message;
      if (error.code === 'EAUTH') {
        userFriendlyDetail = 'Gagal login SMTP. Pastikan App Password benar dan tidak ada spasi.';
      } else if (error.code === 'ESOCKET') {
        userFriendlyDetail = 'Gagal terhubung ke server SMTP. Periksa HOST dan PORT.';
      } else if (error.code === 'ETIMEDOUT') {
        userFriendlyDetail = 'Koneksi ke server email timeout. Coba lagi nanti.';
      }

      res.status(500).json({ 
        success: false, 
        error: 'Failed to send email',
        details: userFriendlyDetail
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
