import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import prisma from '../lib/prisma.js'
import { sendResetPasswordEmail, generateResetToken, verifyResetToken } from '../services/emailService.js'

function mapOccupationToJobType(occupation) {
  if (!occupation) return 'permanent'
  switch (occupation) {
    case 'employee':
      return 'permanent'
    case 'freelancer':
      return 'freelance'
    case 'government':
      return 'civil_servant'
    case 'entrepreneur':
      return 'entrepreneur'
    case 'student':
    case 'retired':
    case 'not_working':
      return 'not_working'
    default:
      if (['permanent', 'freelance', 'gig', 'civil_servant', 'entrepreneur', 'not_working'].includes(occupation)) {
        return occupation
      }
      return 'permanent'
  }
}

function mapJobTypeToOccupation(jobType) {
  if (!jobType) return 'employee'
  switch (jobType) {
    case 'permanent':
      return 'employee'
    case 'freelance':
    case 'gig':
      return 'freelancer'
    case 'civil_servant':
      return 'government'
    case 'entrepreneur':
      return 'entrepreneur'
    case 'not_working':
      return 'retired'
    default:
      return jobType
  }
}

function signToken(userId) {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  )
}

export async function register(req, res, next) {
  try {
    const {
      fullName,
      gender,
      birthDate,
      jobType,
      occupation,
      email,
      phone,
      password,
      monthlyIncome,
      linkedAccounts,
      retirementAge,
    } = req.body

    // validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: 'Missing required fields',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      })
    }

    // cek email existing
    const exists = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })

    if (exists) {
      return res.status(409).json({
        message: 'Email already registered',
      })
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10)

    // parse monthlyIncome dari String ke Float (hapus karakter non-angka)
    const parsedMonthlyIncome = monthlyIncome
      ? parseFloat(String(monthlyIncome).replace(/\D/g, ''))
      : null

    // parse birthDate - format expected: YYYY-MM-DD
    let parsedBirthDate = null
    if (birthDate && typeof birthDate === 'string' && birthDate.length === 10) {
      // Validasi format YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (dateRegex.test(birthDate)) {
        const dateObj = new Date(birthDate + 'T00:00:00.000Z')
        if (!isNaN(dateObj.getTime()) && dateObj.getUTCFullYear() >= 1900 && dateObj.getUTCFullYear() <= 2010) {
          parsedBirthDate = dateObj
        }
      }
    }

    // create user
    const user = await prisma.user.create({
      data: {
        fullName,
        gender,
        birthDate: parsedBirthDate,
        jobType: mapOccupationToJobType(jobType || occupation),
        email: email.toLowerCase(),
        phone,
        password: hashed,
        monthlyIncome: parsedMonthlyIncome,
        retirementAge,
      },
    })

    // create linked accounts jika ada
    if (linkedAccounts && Array.isArray(linkedAccounts) && linkedAccounts.length > 0) {
      const linkedAccountData = linkedAccounts.map(acc => ({
        userId: user.id,
        provider: acc.provider,
        type: acc.type,
        name: acc.name,
        isActive: true,
      }))

      await prisma.linkedAccount.createMany({
        data: linkedAccountData,
      })
    }

    // get user dengan linked accounts
    const userWithLinked = await prisma.user.findUnique({
      where: { id: user.id },
      include: { linkedAccounts: true },
    })

    // token
    const token = signToken(user.id)

    // remove password
    const { password: _, ...safeUser } = userWithLinked
    safeUser.occupation = mapJobTypeToOccupation(safeUser.jobType)

    res.status(201).json({
      message: 'Register success',
      token,
      user: safeUser,
    })

  } catch (e) {
    next(e)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password required',
      })
    }

    // cari user
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
      })
    }

    // compare password
    const ok = await bcrypt.compare(
      password,
      user.password
    )

    if (!ok) {
      return res.status(401).json({
        message: 'Invalid credentials',
      })
    }

    // token
    const token = signToken(user.id)

    // hide password
    const { password: _, ...safeUser } = user
    safeUser.occupation = mapJobTypeToOccupation(safeUser.jobType)

    res.json({
      message: 'Login success',
      token,
      user: safeUser,
    })

  } catch (e) {
    next(e)
  }
}

export async function profile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    })

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    const { password, ...safeUser } = user
    safeUser.occupation = mapJobTypeToOccupation(safeUser.jobType)

    res.json({
      user: safeUser,
    })

  } catch (e) {
    next(e)
  }
}

// FORGOT PASSWORD - Kirim email reset
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        message: 'Email diperlukan',
      })
    }

    // Cek apakah user ada di database
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    })

    // Jika user TIDAK ditemukan, return message umum (untuk keamanan - jangan beri tahu bahwa email tidak ada)
    if (!user) {
      // Tetap return success yang sama agar attacker tidak tahu email mana yang terdaftar
      return res.json({
        message: 'Jika email tersebut terdaftar, link reset password akan dikirim ke inbox Anda.',
      })
    }

    // ✅ User ditemukan - Generate reset token
    const resetToken = generateResetToken(user.email)

    // Kirim email reset via MailerSend
    console.log(`\n📧 [AUTH] Sending reset email to: ${user.email}`)
    await sendResetPasswordEmail(user.email, resetToken)

    res.json({
      message: 'Jika email tersebut terdaftar, link reset password akan dikirim ke inbox Anda.',
    })

  } catch (e) {
    next(e)
  }
}

// RESET PASSWORD - Validasi token dan update password
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Token dan password baru diperlukan',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'Password minimal 8 karakter',
      })
    }

    // Verify token
    const decoded = verifyResetToken(token)

    if (!decoded) {
      return res.status(400).json({
        message: 'Token tidak valid atau sudah kedaluwarsa',
      })
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password user
    const user = await prisma.user.update({
      where: {
        email: decoded.email,
      },
      data: {
        password: hashedPassword,
      },
    })

    // Remove password dari response
    const { password: _, ...safeUser } = user

    res.json({
      message: 'Password berhasil direset. Silakan login dengan password baru Anda.',
      user: safeUser,
    })

  } catch (e) {
    next(e)
  }
}

// CHECK AVAILABILITY - Cek apakah email/telepon sudah terdaftar
export async function checkAvailability(req, res, next) {
  try {
    const { email, phone } = req.body
    const result = { email: { available: true }, phone: { available: true } }

    // Cek email jika disediakan
    if (email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      })
      result.email = {
        available: !emailExists,
        message: emailExists ? 'Email sudah terdaftar' : null,
      }
    }

    // Cek phone jika disediakan
    if (phone) {
      // Normalisasi nomor telepon: hapus spasi, strip kode negara
      const normalizedPhone = phone.replace(/[\s+]/g, '').replace(/^0/, '62')
      const phoneExists = await prisma.user.findFirst({
        where: {
          phone: {
            in: [phone, normalizedPhone, '+' + normalizedPhone],
          },
        },
        select: { id: true },
      })
      result.phone = {
        available: !phoneExists,
        message: phoneExists ? 'Nomor telepon sudah terdaftar' : null,
      }
    }

    res.json(result)
  } catch (e) {
    next(e)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const {
      fullName,
      gender,
      birthDate,
      jobType,
      occupation,
      phone,
      monthlyIncome,
      retirementAge,
    } = req.body

    const userId = req.userId

    // build update data
    const updateData = {}

    if (fullName !== undefined) updateData.fullName = fullName
    if (gender !== undefined) updateData.gender = gender
    
    if (birthDate !== undefined) {
      let parsedBirthDate = null
      if (birthDate && typeof birthDate === 'string' && birthDate.length === 10) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (dateRegex.test(birthDate)) {
          const dateObj = new Date(birthDate + 'T00:00:00.000Z')
          if (!isNaN(dateObj.getTime()) && dateObj.getUTCFullYear() >= 1900 && dateObj.getUTCFullYear() <= 2010) {
            parsedBirthDate = dateObj
          }
        }
      } else if (birthDate) {
        const dateObj = new Date(birthDate)
        if (!isNaN(dateObj.getTime())) {
          parsedBirthDate = dateObj
        }
      }
      updateData.birthDate = parsedBirthDate
    }

    if (jobType !== undefined || occupation !== undefined) {
      updateData.jobType = mapOccupationToJobType(jobType || occupation)
    }

    if (phone !== undefined) updateData.phone = phone

    if (monthlyIncome !== undefined) {
      const parsedMonthlyIncome = monthlyIncome
        ? parseFloat(String(monthlyIncome).replace(/\D/g, ''))
        : null
      updateData.monthlyIncome = parsedMonthlyIncome
    }

    if (retirementAge !== undefined) {
      updateData.retirementAge = retirementAge ? parseInt(retirementAge) : null
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    const { password: _, ...safeUser } = updatedUser
    safeUser.occupation = mapJobTypeToOccupation(safeUser.jobType)

    res.json({
      message: 'Profile updated successfully',
      user: safeUser,
    })
  } catch (e) {
    next(e)
  }
}