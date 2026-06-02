import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'

let testAccount = null

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('\n📧 [EMAIL SERVICE] Using SMTP: MailerSend')
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    if (!testAccount) {
      testAccount = await nodemailer.createTestAccount()
      console.log('\n📧 [EMAIL SERVICE] Ethereal Account Created (DEV mode - no SMTP config):')
      console.log('   User:', testAccount.user)
      console.log('   Pass:', testAccount.pass)
      console.log('   📝 Login ke https://ethereal.email untuk melihat email')
    }
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }
}

async function sendMail(mailOptions) {
  if (process.env.MAILERSEND_TOKEN && process.env.SMTP_USER) {
    console.log('\n📧 [EMAIL SERVICE] Using MailerSend REST API (Bypassing SMTP)')
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERSEND_TOKEN}`
      },
      body: JSON.stringify({
        from: {
          email: process.env.SMTP_USER,
          name: "FinTime"
        },
        to: [
          { email: mailOptions.to }
        ],
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EMAIL SERVICE] MailerSend API Error:', errorText);
      throw new Error('MailerSend API Error: ' + errorText);
    }
    return { success: true };
  }
  
  const transporter = await getTransporter()
  return transporter.sendMail(mailOptions)
}

export function generateResetToken(email) {
  return jwt.sign(
    { email, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
}


export function verifyResetToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.type !== 'password_reset') {
      return null
    }
    return decoded
  } catch {
    return null
  }
}


export async function sendResetPasswordEmail(email, resetToken) {
  // Base URL berdasarkan environment
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`

  const mailOptions = {
    from: `"FinTime" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Reset Password - FinTime',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #020b18; color: #e0f7ff; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #061528, #0a1f35); border-radius: 16px; border: 1px solid rgba(0,245,255,0.2); overflow: hidden; }
          .header { background: linear-gradient(135deg, #00f5ff, #0096c7); padding: 30px; text-align: center; }
          .header h1 { color: #020b18; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .content p { color: #7bafc4; line-height: 1.8; margin-bottom: 20px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #00f5ff, #0096c7); color: #020b18; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0; }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,245,255,0.3); }
          .link-box { background: rgba(0,245,255,0.05); border: 1px solid rgba(0,245,255,0.1); border-radius: 12px; padding: 20px; word-break: break-all; font-family: monospace; color: #00f5ff; font-size: 12px; margin: 20px 0; }
          .warning { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 12px; padding: 20px; color: #f87171; font-size: 14px; }
          .footer { padding: 20px 30px; text-align: center; color: #4a7fa0; font-size: 12px; border-top: 1px solid rgba(0,245,255,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏱ FinTime</h1>
          </div>
          <div class="content">
            <h2 style="color: #00f5ff; margin-top: 0;">Reset Password</h2>
            <p>Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk mereset password:</p>

            <div style="text-align: center;">
              <a href="${resetLink}" class="btn">Reset Password</a>
            </div>

            <p>Atau salin link berikut ke browser Anda:</p>
            <div class="link-box">${resetLink}</div>

            <div class="warning">
              ⚠️ Link ini hanya berlaku selama <strong>1 jam</strong>. Jika Anda tidak meminta reset password, abaikan email ini.
            </div>
          </div>
          <div class="footer">
            <p>Email ini dikirim otomatis oleh sistem FinTime AI</p>
            <p>&copy; 2026 FinTime - AI Powering Future</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
FinTime - Reset Password

Kami menerima permintaan reset password untuk akun Anda.

Klik link berikut untuk mereset password:
${resetLink}

Link ini hanya berlaku selama 1 jam.

Jika Anda tidak meminta reset password, abaikan email ini.

---
FinTime AI - 2026
    `.trim(),
  }

  try {
    await sendMail(mailOptions)

    console.log('\n📧 [EMAIL SERVICE] Reset Email Sent!')
    console.log('   To:', email)
    console.log('   Subject:', mailOptions.subject)
    console.log('   Reset Link:', resetLink)

    return {
      success: true,
      message: 'Email reset password telah dikirim. Silakan cek inbox Anda.',
    }
  } catch (error) {
    console.error('[EMAIL SERVICE] Failed to send email:', error)
    throw new Error('Gagal mengirim email reset password')
  }
}

export async function sendOtpEmail(email, otpCode) {

  const mailOptions = {
    from: `"FinTime" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🔐 Kode OTP Registrasi - FinTime',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #020b18; color: #e0f7ff; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #061528, #0a1f35); border-radius: 16px; border: 1px solid rgba(0,245,255,0.2); overflow: hidden; }
          .header { background: linear-gradient(135deg, #00f5ff, #0096c7); padding: 30px; text-align: center; }
          .header h1 { color: #020b18; margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; text-align: center; }
          .content p { color: #7bafc4; line-height: 1.8; margin-bottom: 20px; font-size: 16px; }
          .otp-box { background: rgba(0,245,255,0.1); border: 2px dashed rgba(0,245,255,0.5); border-radius: 12px; padding: 20px; margin: 20px auto; max-width: 250px; }
          .otp-code { font-family: monospace; font-size: 32px; font-weight: bold; color: #00f5ff; letter-spacing: 8px; }
          .warning { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); border-radius: 12px; padding: 15px; color: #f87171; font-size: 14px; margin-top: 20px; }
          .footer { padding: 20px 30px; text-align: center; color: #4a7fa0; font-size: 12px; border-top: 1px solid rgba(0,245,255,0.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏱ FinTime</h1>
          </div>
          <div class="content">
            <h2 style="color: #00f5ff; margin-top: 0;">Kode Verifikasi (OTP)</h2>
            <p>Terima kasih telah mendaftar di FinTime. Berikut adalah kode OTP Anda untuk menyelesaikan pendaftaran:</p>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>

            <p>Masukkan kode ini di halaman pendaftaran.</p>

            <div class="warning">
              ⚠️ Kode ini hanya berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapapun!
            </div>
          </div>
          <div class="footer">
            <p>Email ini dikirim otomatis oleh sistem FinTime AI</p>
            <p>&copy; 2026 FinTime - AI Powering Future</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
FinTime - Kode OTP

Berikut adalah kode OTP Anda:
${otpCode}

Kode ini hanya berlaku selama 10 menit. Jangan berikan kepada siapapun.

---
FinTime AI - 2026
    `.trim(),
  }

  try {
    await sendMail(mailOptions)

    console.log('\n📧 [EMAIL SERVICE] OTP Email Sent!')
    console.log('   To:', email)
    console.log('   OTP Code:', otpCode)

    return {
      success: true,
      message: 'Email OTP telah dikirim. Silakan cek inbox Anda.',
    }
  } catch (error) {
    console.error('[EMAIL SERVICE] Failed to send OTP email:', error)
    throw new Error('Gagal mengirim email OTP')
  }
}

export default { sendResetPasswordEmail, generateResetToken, verifyResetToken, sendOtpEmail }