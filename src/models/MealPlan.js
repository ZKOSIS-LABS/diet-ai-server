import mongoose from 'mongoose';

// In MealPlan.js
const dailyMealSchema = new mongoose.Schema({
    dayOfWeek: String,
    mealsDetails: [String] // Or an array of meal objects like {name: String, description: String}
});

const mealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    meals: [dailyMealSchema] // Now an array of specific sub-documents
});


export default mongoose.model('MealPlan', mealPlanSchema);
