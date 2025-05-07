import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import mealRoutes from './routes/mealRoutes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

await connectDB();
app.use('/api/auth', authRoutes);
app.use('/api/meals', mealRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
