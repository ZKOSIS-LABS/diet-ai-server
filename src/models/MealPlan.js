import mongoose from 'mongoose';

// In MealPlan.js
const dailyMealSchema = new mongoose.Schema({
    dayOfWeek: { type: String, required: true }, // e.g., "Monday"
    mealsDetails: {
        breakfast: { type: String, required: true }, // e.g., "Oatmeal with berries and nuts"
        lunch: { type: String, required: true },     // e.g., "Quinoa salad with chickpeas"
        supper: { type: String, required: true }     // e.g., "Grilled salmon with asparagus"
    }
});

const mealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    meals: dailyMealSchema // Now a single object for one day instead of an array
});

export default mongoose.model('MealPlan', mealPlanSchema);
