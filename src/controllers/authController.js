import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export async function register(req, res) {
const { email, password } = req.body;
try {
const user = new User({ email, password });
await user.save();
res.status(201).json({ message: 'User created' });
} catch (err) {
res.status(400).json({ error: err.message });
}
}

export async function login(req, res) {
const { email, password } = req.body;
try {
const user = await User.findOne({ email });
if (!user) return res.status(401).json({ error: 'Invalid credentials' });
const match = await user.comparePassword(password);
if (!match) return res.status(401).json({ error: 'Invalid credentials' });
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.json({ token });
} catch (err) {
res.status(500).json({ error: err.message });
}
}
