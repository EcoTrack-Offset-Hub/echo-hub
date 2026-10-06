// Authentication helpers: password hashing and signed Bearer-token checks.
const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
// Read the signing secret only on the server and reject weak configuration.
const secret = () => {
  if (!process.env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set to a value of at least 32 characters.");
  }
  return process.env.AUTH_JWT_SECRET;
};

// Store passwords as scrypt$salt$hash; never store plain-text passwords.
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}
// Compare a login password with its stored scrypt hash.
function verifyPassword(password, stored) {
  const [, salt, digest] = String(stored).split("$");
  if (!salt || !digest) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(digest, "hex"));
}
function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

// Create the signed token returned after successful login.
function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, email: user.email, role: user.role, companyId: user.companyId, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const body = `${base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${base64url(JSON.stringify(payload))}`;
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
// Verify token structure, signature, and expiry before trusting its user claims.
function verifyToken(token) {
  const [head, body, signature] = String(token || "").split(".");
  if (!head || !body || !signature) return null;
  const expected = crypto.createHmac("sha256", secret()).update(`${head}.${body}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
}
// Express middleware used by every protected API route.
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    const user = verifyToken(token);
    if (!user) return res.status(401).json({ success: false, error: "Authentication is required." });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
module.exports = { hashPassword, verifyPassword, signToken, requireAuth };
