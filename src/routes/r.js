
// Auth middleware
router.use((req, res, next) => {
const token = req.header('Authorization')?.split(' ')[1];
if (!token) return res.status(401).json({ error: 'No token' });
try {
req.user = jwt.verify(token, process.env.JWT_SECRET);
next();
} catch {
res.status(401).json({ error: 'Invalid token' });
}
});

router.post('/generate', generatePlan);
export default router;

