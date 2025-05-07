import mongoose from 'mongoose';

// Schema for individual meal details (e.g., breakfast, lunch)
const mealItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    recipe: { type: String },
    nutritionalFacts: { type: String }
}, { _id: false }); // _id: false if you don't need separate IDs for each meal item

const dailyMealSchema = new mongoose.Schema({
    dayOfWeek: String,
    // Changed 'mealsDetails: [String]' to a structured 'meals' object
    meals: {
        breakfast: mealItemSchema,
        lunch: mealItemSchema,
        supper: mealItemSchema,
        // You could add other optional meal types like snacks here
        // snacks: mealItemSchema 
    }
});

const mealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    meals: [dailyMealSchema] // Now an array of specific sub-documents
});
 export default mongoose.model('MealPlan', mealPlanSchema);
