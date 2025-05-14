import jwt from 'jsonwebtoken'
const salt = process.env.SALT

export function generateToken(payload:string) {
    return jwt.sign(payload, salt)
}

export function verifyToken(token:string) {
    return jwt.verify(token, salt)
}
