import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import prisma from '../lib/prisma.js'

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

    // create user
    const user = await prisma.user.create({
      data: {
        fullName,
        gender,
        birthDate: birthDate ? new Date(birthDate) : null,
        occupation,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        monthlyIncome,
        linkedAccounts,
        retirementAge,
      },
    })

    // token
    const token = signToken(user.id)

    // remove password
    const { password: _, ...safeUser } = user

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

    res.json({
      user: safeUser,
    })

  } catch (e) {
    next(e)
  }
}