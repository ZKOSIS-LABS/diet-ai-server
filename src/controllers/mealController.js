import MealPlan from '../models/MealPlan.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePlan(req, res) {
  const { preferences, goals } = req.body;
  const userId = req.user?.id; // From JWT auth middleware

  // Basic Input Validation
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }
  if (!preferences || typeof preferences !== 'object' || !preferences.diet || !preferences.foodPreferences) {
    return res.status(400).json({ error: 'Invalid or missing preferences data. "diet" and "foodPreferences" are required.' });
  }
  if (!goals || typeof goals !== 'object' || !goals.objective) {
    return res.status(400).json({ error: 'Invalid or missing goals data. "objective" is required.' });
  }

  const prompt = `Create a 7-day ${preferences.diet} meal plan for ${goals.objective}. The user prefers the following types of food: ${preferences.foodPreferences}. Respond ONLY with a valid JSON array. Each object in the array represents a single day and MUST have exactly two properties: 1. "dayOfWeek" (a string, e.g., "Monday"). 2. "mealsDetails" (an array of strings, where each string is a detailed description of a specific meal for that day, like "Breakfast: Oatmeal with berries and nuts", "Lunch: Quinoa salad with chickpeas and mixed vegetables", "Dinner: Baked salmon with roasted asparagus"). Ensure the "mealsDetails" array is populated with at least 2-3 distinct meal strings for each day and is not empty. Do not include any other text or explanations outside of this JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a helpful nutritionist assistant and dietician that provides meal plans in structured JSON format.' },
        { role: 'user', content: prompt }
      ]
    });

    let mealPlanContent;
    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Failed to get content from OpenAI response.');
    }

    try {
      mealPlanContent = JSON.parse(messageContent);

      // Validate the structure of the parsed JSON
      if (
        !Array.isArray(mealPlanContent) ||
        mealPlanContent.some(day => !day.dayOfWeek || !Array.isArray(day.mealsDetails) || day.mealsDetails.length === 0)
      ) {
        throw new Error('Invalid meal plan structure.');
      }

      // Add fallback for missing or invalid dayOfWeek
      mealPlanContent = mealPlanContent.map((day, index) => ({
        dayOfWeek: day.dayOfWeek || `Day ${index + 1}`,
        mealsDetails: day.mealsDetails || []
      }));
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      mealPlanContent = [
        {
          dayOfWeek: "Error",
          mealsDetails: [
            `Failed to parse structured meal details from AI. Raw response: ${
              messageContent ? messageContent.substring(0, 200) : "N/A"
            }...`
          ]
        }
      ];
    }

    const plan = await MealPlan.create({ user: userId, meals: mealPlanContent });
    res.status(201).json(plan);
  } catch (err) {
    console.error('Error in generatePlan:', err);
    res.status(500).json({ error: 'Failed to generate meal plan.', details: err.message });
  }
}
